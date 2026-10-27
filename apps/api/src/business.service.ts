import {
  Injectable,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  clientSchema,
  serviceSchema,
  appointmentSchema,
  paymentSchema,
  expenseSchema,
  vehicleSchema,
  Entity,
} from "@gferraz/shared";
import {
  db,
  Context,
  atomic,
  owned,
  audit,
  expectVersion,
  D,
  sum,
  Tx,
} from "./db";
import {
  assertTotal,
  appointmentTotal,
  allocatedPaid,
  vehicleCost,
} from "./finance";
import { appointmentInclude } from "./data.service";
const models: Record<Entity, string> = {
  clients: "client",
  services: "service",
  appointments: "appointment",
  payments: "payment",
  expenses: "expense",
  vehicles: "vehicle",
};
@Injectable()
export class BusinessService {
  async get(c: Context, e: Entity, id: string) {
    if (e === "appointments") {
      const a = await db.appointment.findFirst({
        where: { id, organizationId: c.organizationId },
        include: { ...appointmentInclude, media: true, trips: true },
      });
      if (!a) throw new BadRequestException("Atendimento não encontrado");
      return {
        ...a,
        allocationDetails: a.allocations.map((x) => ({
          paymentId: x.paymentId,
          receivedAt: x.payment.receivedAt,
          amount: x.amount.toFixed(2),
          refunded: sum(x.refunds.map((r) => r.amount)).toFixed(2),
          net: x.payment.voidedAt
            ? "0.00"
            : D(x.amount)
                .minus(sum(x.refunds.map((r) => r.amount)))
                .toFixed(2),
          voided: !!x.payment.voidedAt,
        })),
      };
    }
    if (e === "payments") {
      const payment = await db.payment.findFirstOrThrow({
        where: { id, organizationId: c.organizationId },
        include: { allocations: { include: { refunds: true } }, refunds: true },
      });
      return {
        ...payment,
        allocations: payment.allocations.map((a) => ({
          ...a,
          refunded: sum(a.refunds.map((r) => r.amount)).toFixed(2),
          available: D(a.amount)
            .minus(sum(a.refunds.map((r) => r.amount)))
            .toFixed(2),
        })),
      };
    }
    return owned(db, models[e], c, id);
  }
  async save(
    c: Context,
    e: Entity,
    input: unknown,
    id?: string,
    version?: number,
  ) {
    return atomic((tx) => this.saveTx(tx, c, e, input, id, version));
  }
  async saveTx(
    tx: Tx,
    c: Context,
    e: Entity,
    input: unknown,
    id?: string,
    version?: number,
  ) {
    const model = models[e];
    let before: any;
    if (id) {
      before = await owned(tx, model, c, id);
      expectVersion(before, version!);
      if (before.archivedAt || before.voidedAt)
        throw new ConflictException("Registro arquivado");
    }
    let data: any;
    if (e === "clients") {
      const v = clientSchema.parse(input);
      data = { ...v, birthday: v.birthday ? new Date(v.birthday) : null };
    } else if (e === "services") data = serviceSchema.parse(input);
    else if (e === "vehicles") data = vehicleSchema.parse(input);
    else if (e === "expenses") {
      const v = expenseSchema.parse(input);
      if (v.appointmentId) await owned(tx, "appointment", c, v.appointmentId);
      data = {
        ...v,
        incurredOn: new Date(v.incurredOn),
        dueDate: new Date(v.dueDate),
        paidOn: v.paidOn ? new Date(v.paidOn) : null,
      };
    } else if (e === "appointments") {
      const v = appointmentSchema.parse(input);
      const current = id
        ? await tx.appointment.findFirstOrThrow({
            where: { id, organizationId: c.organizationId },
            include: appointmentInclude,
          })
        : null;
      const client = await owned(tx, "client", c, v.clientId);
      if (client.archivedAt && current?.clientId !== v.clientId)
        throw new BadRequestException("Cliente arquivada");
      if (v.eventId) await owned(tx, "event", c, v.eventId);
      const items = [];
      for (const i of v.items) {
        const s = await owned(tx, "service", c, i.serviceId);
        const historical = current?.items.find(
          (item) => item.serviceId === i.serviceId,
        );
        if (s.archivedAt && !historical)
          throw new BadRequestException("Serviço arquivado");
        items.push({
          ...i,
          serviceName: historical?.serviceName ?? s.name,
          category: historical?.category ?? s.category,
        });
      }
      assertTotal({ ...v, items });
      if (id && current) {
        if (
          current.clientId !== v.clientId &&
          (current.allocations.length ||
            (await tx.media.count({
              where: { organizationId: c.organizationId, appointmentId: id },
            })))
        )
          throw new BadRequestException(
            "Não é possível trocar a cliente de um atendimento com pagamentos ou fotos",
          );
        if (appointmentTotal({ ...v, items }).lt(allocatedPaid(current)))
          throw new BadRequestException(
            "O total não pode ser menor que os recebimentos líquidos. Registre um reembolso antes.",
          );
        await tx.appointmentItem.deleteMany({
          where: { organizationId: c.organizationId, appointmentId: id },
        });
      }
      data = {
        ...v,
        startsAt: new Date(v.startsAt),
        dueDate: new Date(v.dueDate),
        items: { create: items },
      };
    } else {
      if (id)
        throw new BadRequestException(
          "Para corrigir um recebimento, estorne e registre novamente. O histórico é preservado.",
        );
      const v = paymentSchema.parse(input);
      await owned(tx, "client", c, v.clientId);
      if (
        new Set(v.allocations.map((a) => a.appointmentId)).size !==
        v.allocations.length
      )
        throw new BadRequestException("Alocações duplicadas");
      for (const a of v.allocations) {
        const appointment = await tx.appointment.findFirst({
          where: {
            id: a.appointmentId,
            organizationId: c.organizationId,
            clientId: v.clientId,
          },
          include: appointmentInclude,
        });
        if (
          !appointment ||
          ["quote", "cancelled", "no_show"].includes(appointment.status)
        )
          throw new BadRequestException(
            "Atendimento inválido ou pertence a outra cliente",
          );
        if (
          D(a.amount).gt(
            appointmentTotal(appointment).minus(allocatedPaid(appointment)),
          )
        )
          throw new BadRequestException("Pagamento supera o saldo pendente");
      }
      const amount = sum(v.allocations.map((a) => a.amount));
      if (D(v.fee).gt(amount))
        throw new BadRequestException("Taxa superior ao recebimento");
      data = {
        clientId: v.clientId,
        receivedAt: new Date(v.receivedAt),
        method: v.method,
        fee: v.fee,
        notes: v.notes,
        amount,
        allocations: { create: v.allocations },
      };
    }
    const result = id
      ? await (tx as any)[model].update({
          where: {
            organizationId_id: { organizationId: c.organizationId, id },
          },
          data: { ...data, version: { increment: 1 } },
        })
      : await (tx as any)[model].create({
          data: { ...data, organizationId: c.organizationId },
        });
    await audit(tx, c, e, result.id, id ? "update" : "create", before, result);
    return result;
  }
  async remove(
    c: Context,
    e: Entity,
    id: string,
    version: number,
    reason: string,
  ) {
    return atomic(async (tx) => {
      if (e === "appointments")
        throw new BadRequestException(
          "Altere a situação para cancelado. O histórico deve permanecer.",
        );
      const before = await owned(tx, models[e], c, id);
      expectVersion(before, version);
      if (
        e === "payments" &&
        (await tx.refund.count({
          where: { organizationId: c.organizationId, paymentId: id },
        }))
      )
        throw new BadRequestException(
          "Recebimento com reembolso não pode ser estornado integralmente",
        );
      const data = ["payments", "expenses"].includes(e)
        ? { voidedAt: new Date(), voidReason: reason }
        : { archivedAt: new Date() };
      const after = await (tx as any)[models[e]].update({
        where: { organizationId_id: { organizationId: c.organizationId, id } },
        data: { ...data, version: { increment: 1 } },
      });
      await audit(tx, c, e, id, "archive", before, after);
      return { ok: true };
    });
  }
  async refund(
    c: Context,
    id: string,
    input: {
      allocationId: string;
      amount: string;
      refundedOn: string;
      reason: string;
    },
  ) {
    return atomic(async (tx) => {
      const p = await owned(tx, "payment", c, id);
      if (p.voidedAt) throw new BadRequestException("Recebimento estornado");
      const a = await tx.allocation.findFirst({
        where: {
          id: input.allocationId,
          organizationId: c.organizationId,
          paymentId: id,
        },
        include: { refunds: true },
      });
      if (
        !a ||
        D(input.amount).gt(
          D(a.amount).minus(sum(a.refunds.map((r) => r.amount))),
        )
      )
        throw new BadRequestException("Reembolso supera a alocação disponível");
      const r = await tx.refund.create({
        data: {
          ...input,
          organizationId: c.organizationId,
          paymentId: id,
          refundedOn: new Date(input.refundedOn),
        },
      });
      await tx.payment.update({
        where: { id },
        data: { version: { increment: 1 } },
      });
      await audit(tx, c, "refunds", r.id, "create", null, r);
      return r;
    });
  }
  async trip(c: Context, input: any) {
    return atomic(async (tx) => {
      await owned(tx, "appointment", c, input.appointmentId);
      const v = await owned(tx, "vehicle", c, input.vehicleId);
      const estimatedCost = vehicleCost(v)
        .mul(input.distanceKm)
        .plus(input.parking)
        .plus(input.toll)
        .toDecimalPlaces(2);
      const r = await tx.trip.create({
        data: { ...input, organizationId: c.organizationId, estimatedCost },
      });
      await audit(tx, c, "trips", r.id, "create", null, r);
      return r;
    });
  }
}
