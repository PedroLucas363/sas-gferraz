import { Injectable } from "@nestjs/common";
import { Entity, Query, Row, querySchema } from "@gferraz/shared";
import { db, D, sum, Context, Tx } from "./db";
import {
  appointmentTotal,
  allocatedPaid,
  localDate,
  vehicleCost,
} from "./finance";
import { selectRows, summarize } from "./query";
export const appointmentInclude = {
  client: true,
  items: true,
  allocations: { include: { payment: true, refunds: true } },
} as const;
@Injectable()
export class DataService {
  async snapshot(c: Context) {
    return db.$transaction(async (tx) => this.load(tx, c), {
      isolationLevel: "RepeatableRead",
    });
  }
  async load(tx: Tx, c: Context) {
    const w = { organizationId: c.organizationId };
    const [clients, services, appointments, payments, expenses, vehicles] = [
      await tx.client.findMany({ where: { ...w, archivedAt: null } }),
      await tx.service.findMany({ where: { ...w, archivedAt: null } }),
      await tx.appointment.findMany({ where: w, include: appointmentInclude }),
      await tx.payment.findMany({
        where: { ...w, voidedAt: null },
        include: { client: true, refunds: true },
      }),
      await tx.expense.findMany({
        where: { ...w, voidedAt: null },
        include: { appointment: { include: { client: true } } },
      }),
      await tx.vehicle.findMany({ where: { ...w, archivedAt: null } }),
    ];
    const ar: Row[] = appointments.map((a) => ({
      id: a.id,
      version: a.version,
      clientId: a.clientId,
      clientName: a.client.name,
      title: a.title,
      date: localDate(a.startsAt),
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      category: [...new Set(a.items.map((i) => i.category))].join(" / "),
      serviceNames: a.items
        .map((i) => `${i.quantity} × ${i.serviceName}`)
        .join(", "),
      total: appointmentTotal(a).toFixed(2),
      paid: allocatedPaid(a).toFixed(2),
      pending: appointmentTotal(a).minus(allocatedPaid(a)).toFixed(2),
      travelFee: a.travelFee.toFixed(2),
      dueDate: a.dueDate.toISOString().slice(0, 10),
      duration: a.duration,
      address: a.address,
      eventId: a.eventId,
      notes: a.notes,
    }));
    const cr: Row[] = clients.map((c) => {
      const as = ar.filter(
        (a) =>
          a.clientId === c.id &&
          !["quote", "cancelled", "no_show"].includes(String(a.status)),
      );
      const completed = as
        .filter((a) => a.status === "completed")
        .map((a) => String(a.date))
        .sort();
      return {
        id: c.id,
        version: c.version,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        count: completed.length,
        total: sum(as.map((a) => String(a.total))).toFixed(2),
        paid: sum(as.map((a) => String(a.paid))).toFixed(2),
        pending: sum(as.map((a) => String(a.pending))).toFixed(2),
        firstVisit: completed[0] ?? null,
        lastVisit: completed.at(-1) ?? null,
        visitDates: completed.join("|"),
      };
    });
    const pr: Row[] = payments.flatMap((p) => [
      {
        id: p.id,
        version: p.version,
        clientId: p.clientId,
        clientName: p.client.name,
        date: p.receivedAt.toISOString().slice(0, 10),
        amount: p.amount.toFixed(2),
        fee: p.fee.toFixed(2),
        net: p.amount.minus(p.fee).toFixed(2),
        method: p.method,
        notes: p.notes,
      },
      ...p.refunds.map((r) => ({
        id: `refund:${r.id}`,
        version: 1,
        clientId: p.clientId,
        clientName: p.client.name,
        date: r.refundedOn.toISOString().slice(0, 10),
        amount: r.amount.neg().toFixed(2),
        fee: "0.00",
        net: r.amount.neg().toFixed(2),
        method: p.method,
        notes: `Reembolso: ${r.reason}`,
      })),
    ]);
    const er: Row[] = expenses.map((e) => ({
      id: e.id,
      version: e.version,
      clientId: e.appointment?.clientId ?? null,
      clientName: e.appointment?.client.name ?? null,
      description: e.description,
      category: e.category,
      amount: e.amount.toFixed(2),
      date: e.incurredOn.toISOString().slice(0, 10),
      incurredOn: e.incurredOn.toISOString().slice(0, 10),
      paidOn: e.paidOn?.toISOString().slice(0, 10) ?? null,
      dueDate: e.dueDate.toISOString().slice(0, 10),
      status: e.paidOn ? "Pago" : "A pagar",
      kind: e.kind,
      notes: e.notes,
    }));
    return {
      clients: cr,
      services: services.map((s) => ({
        id: s.id,
        version: s.version,
        name: s.name,
        category: s.category,
        price: s.price.toFixed(2),
        duration: s.duration,
        description: s.description,
      })),
      appointments: ar,
      payments: pr,
      expenses: er,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        version: v.version,
        name: v.name,
        year: v.year,
        fuel: v.fuel,
        costPerKm: vehicleCost(v).toFixed(4),
      })),
    } as Record<Entity, Row[]>;
  }
  async table(c: Context, entity: Entity, q: Query) {
    return this.result((await this.snapshot(c))[entity], q, entity);
  }
  result(rows: Row[], q: Query, entity: Entity) {
    const selected = selectRows(rows, q, entity);
    const groups: Record<
      string,
      { count: number; totals: Record<string, string> }
    > = {};
    if (q.groupBy)
      for (const value of new Set(
        selected.map((r) => String(r[q.groupBy!] ?? "Sem informação")),
      )) {
        const rs = selected.filter(
          (r) => String(r[q.groupBy!] ?? "Sem informação") === value,
        );
        groups[value] = { count: rs.length, totals: summarize(rs) };
      }
    return {
      rows: selected.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize),
      total: selected.length,
      totals: summarize(selected),
      groups,
      query: q,
    };
  }
  async dashboard(c: Context, q: Query, mode: "cash" | "accrual" = "accrual") {
    const data = await this.snapshot(c);
    const today = localDate(new Date());
    type Source = {
      label: string;
      entity: Entity;
      query: Query;
      measure: string;
      sign: number;
      rows: Row[];
    };
    const source = (
      label: string,
      entity: Entity,
      base: Query,
      measure: string,
      filters: Query["filters"] = [],
      sign = 1,
      rows = data[entity],
    ): Source => {
      const query = querySchema.parse({
        ...base,
        filters: [...base.filters, ...filters],
        logic: "and",
        page: 0,
        pageSize: 100,
      });
      return {
        label,
        entity,
        query,
        measure,
        sign,
        rows: selectRows(rows, query, entity),
      };
    };
    const active: Query["filters"] = ["quote", "cancelled", "no_show"].map(
      (value) => ({ field: "status", op: "ne", value }),
    );
    const revenue = source(
      "Atendimentos concluídos",
      "appointments",
      q,
      "total",
      [{ field: "status", op: "eq", value: "completed" }],
    );
    const received = source(
      "Recebimentos e reembolsos",
      "payments",
      q,
      "amount",
    );
    const fees = source("Taxas financeiras", "payments", q, "fee", [], -1);
    const pending = source(
      "Contratos com saldo pendente",
      "appointments",
      q,
      "pending",
      [...active, { field: "pending", op: "gt", value: "0" }],
    );
    const overdue = source("Contratos vencidos", "appointments", q, "pending", [
      ...active,
      { field: "pending", op: "gt", value: "0" },
      { field: "dueDate", op: "lt", value: today },
    ]);
    const incurred = source(
      "Despesas por competência",
      "expenses",
      q,
      "amount",
      [],
      -1,
    );
    const cashExpenses = source(
      "Despesas por data de pagamento",
      "expenses",
      querySchema.parse({ ...q, dateField: "paidOn" }),
      "amount",
      [{ field: "paidOn", op: "not_empty" }],
      -1,
    );
    const expense = mode === "cash" ? cashExpenses : incurred;
    const inflow = mode === "cash" ? received : revenue;
    const value = (s: Source) =>
      s.measure === "count"
        ? D(s.rows.length)
        : s.measure === "clients"
          ? D(new Set(s.rows.map((r) => r.clientId)).size)
          : sum(s.rows.map((r) => String(r[s.measure] ?? 0)));
    const metric = (
      key: string,
      label: string,
      sources: Source[],
      format = "money",
      ratio?: Source,
    ) => {
      let amount = sum(sources.map((s) => value(s).mul(s.sign)));
      if (ratio)
        amount = value(ratio).eq(0)
          ? D(0)
          : amount.div(value(ratio)).mul(format === "percent" ? 100 : 1);
      return {
        key,
        label,
        value: amount.toFixed(format === "count" ? 0 : 2),
        format,
        sources: sources.map((s) => ({
          ...s,
          rows: s.rows,
          subtotal: value(s).toFixed(2),
        })),
      };
    };
    const metrics = [
      metric("revenue", "Faturamento", [revenue]),
      metric("received", "Recebimentos", [received]),
      metric("pending", "A receber", [pending]),
      metric("overdue", "Vencidos", [overdue]),
      metric(
        "expenses",
        mode === "cash" ? "Despesas pagas" : "Despesas por competência",
        [{ ...expense, sign: 1 }],
      ),
      metric(
        "result",
        mode === "cash" ? "Resultado de caixa" : "Resultado por competência",
        [inflow, expense, fees],
      ),
      metric(
        "margin",
        "Margem (%)",
        [inflow, expense, fees],
        "percent",
        inflow,
      ),
      metric("ticket", "Ticket médio", [revenue], "money", {
        ...revenue,
        measure: "count",
      }),
      metric(
        "clients",
        "Clientes atendidas",
        [{ ...revenue, measure: "clients" }],
        "count",
      ),
      metric(
        "appointments",
        "Atendimentos concluídos",
        [{ ...revenue, measure: "count" }],
        "count",
      ),
      metric("travel", "Deslocamento cobrado", [
        { ...revenue, measure: "travelFee" },
      ]),
      metric(
        "today",
        "Atendimentos de hoje",
        [
          source("Atendimentos ativos de hoje", "appointments", q, "count", [
            { field: "date", op: "eq", value: today },
            ...active,
          ]),
        ],
        "count",
      ),
      metric(
        "upcoming",
        "Próximos confirmados",
        [
          source("Próximos confirmados", "appointments", q, "count", [
            { field: "date", op: "gt", value: today },
            { field: "status", op: "eq", value: "confirmed" },
          ]),
        ],
        "count",
      ),
    ];
    const months = [
      ...new Set(
        [...data.appointments, ...data.payments, ...data.expenses]
          .map((r) => String(r.date ?? "").slice(0, 7))
          .filter((v) => v.length === 7),
      ),
    ]
      .sort()
      .filter(
        (m) =>
          (!q.from || m >= q.from.slice(0, 7)) &&
          (!q.to || m <= q.to.slice(0, 7)),
      );
    const evolution = months.map((month) => {
      const from = month + "-01",
        to = new Date(
          Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
        )
          .toISOString()
          .slice(0, 10);
      const mq = querySchema.parse({
        ...q,
        from: q.from && q.from > from ? q.from : from,
        to: q.to && q.to < to ? q.to : to,
      });
      return {
        month,
        from: mq.from,
        to: mq.to,
        revenue: value(
          source("", "appointments", mq, "total", [
            { field: "status", op: "eq", value: "completed" },
          ]),
        ).toFixed(2),
        received: value(source("", "payments", mq, "amount")).toFixed(2),
        expenses: value(source("", "expenses", mq, "amount")).toFixed(2),
      };
    });
    return {
      metrics,
      evolution,
      mode,
      query: q,
      asOf: new Date().toISOString(),
      rules:
        "Faturamento: concluídos pela data do atendimento. Caixa: pagamentos menos reembolsos na data efetiva. A receber: contratos ativos no período do atendimento. Resultado: base selecionada menos despesas e taxas. Estimativas de veículos não são despesas.",
    };
  }
}
