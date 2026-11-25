import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query as Q,
  Req,
  Res,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ConflictException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { z } from "zod";
import { Response, Request } from "express";
import ExcelJS from "exceljs";
import {
  entities,
  querySchema,
  money,
  date,
  entityFields,
  fieldLabels,
  clientSchema,
  serviceSchema,
  appointmentSchema,
  paymentSchema,
  expenseSchema,
  vehicleSchema,
  addressDataSchema,
  defaultSettings,
} from "@gferraz/shared";
import { db, Context, owned, atomic, expectVersion, audit, plain } from "./db";
import { DataService } from "./data.service";
import { BusinessService } from "./business.service";
import { AuthService } from "./auth";
import { MediaService } from "./storage";
import { ImportService } from "./import.service";
import { selectRows } from "./query";
import { RouteService } from "./route.service";
import { lookupCep } from "./cep";
const eventKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
type AuthReq = Request & { user: Context };
const entity = (s: string) => z.enum(entities).parse(s);
const parseQuery = (v?: string) => querySchema.parse(v ? JSON.parse(v) : {});
const credentials = z.object({
  email: z.email().max(250),
  password: z.string().min(12).max(200),
});
@ApiTags("GFerraz Makeup")
@Controller()
export class AppController {
  constructor(
    @Inject(DataService) private data: DataService,
    @Inject(BusinessService) private business: BusinessService,
    @Inject(AuthService) private auth: AuthService,
    @Inject(MediaService) private media: MediaService,
    @Inject(ImportService) private imports: ImportService,
    @Inject(RouteService) private routes: RouteService,
  ) {}
  @Get("health") async health() {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", database: "postgresql" };
  }
  @Post("auth/register")
  @ApiOperation({
    summary: "Criar empresa e proprietária; senha mínima de 12 caracteres",
  })
  async register(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.auth.limit(req.ip || "unknown");
    const input = credentials
      .extend({
        name: z.string().min(2).max(160),
        company: z.string().min(2).max(160),
      })
      .parse(body);
    return this.auth.session(await this.auth.register(input), res);
  }
  @Post("auth/login") async login(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.auth.limit(req.ip || "unknown");
    const v = credentials.parse(body);
    const user = await this.auth.login(v.email, v.password);
    await audit(
      db,
      { organizationId: user.organizationId, userId: user.id, role: user.role },
      "access",
      user.id,
      "login",
      null,
      { email: user.email },
    );
    return this.auth.session(user, res);
  }
  @Post("auth/logout") async logout(
    @Req() req: AuthReq,
    @Res({ passthrough: true }) res: Response,
  ) {
    await audit(db, req.user, "access", req.user.userId, "logout", null, {
      email: (req.user as any).email,
    });
    return this.auth.logout(req, res);
  }
  @Get("auth/me") async me(@Req() req: AuthReq) {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.user.userId },
      select: { name: true, email: true, role: true },
    });
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: req.user.organizationId },
    });
    return { ...user, organization };
  }
  @Get("data/:entity")
  @ApiOperation({
    summary:
      "Consulta central: filtros E/OU, período, ordenação, agrupamento, totais e paginação",
  })
  table(@Req() req: AuthReq, @Param("entity") e: string, @Q("q") q?: string) {
    return this.data.table(req.user, entity(e), parseQuery(q));
  }
  @Get("records/:entity/:id") record(
    @Req() req: AuthReq,
    @Param("entity") e: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.business.get(req.user, entity(e), id);
  }
  @Post("records/:entity")
  @ApiBody({
    schema: {
      oneOf: [
        clientSchema,
        serviceSchema,
        appointmentSchema,
        paymentSchema,
        expenseSchema,
        vehicleSchema,
      ].map((s) => z.toJSONSchema(s)),
    } as any,
  })
  create(
    @Req() req: AuthReq,
    @Param("entity") e: string,
    @Body() input: unknown,
  ) {
    return this.business.save(req.user, entity(e), input);
  }
  @Patch("records/:entity/:id") update(
    @Req() req: AuthReq,
    @Param("entity") e: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const v = z
      .object({ version: z.number().int().min(1), data: z.unknown() })
      .parse(body);
    return this.business.save(req.user, entity(e), v.data, id, v.version);
  }
  @Delete("records/:entity/:id") remove(
    @Req() req: AuthReq,
    @Param("entity") e: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const v = z
      .object({
        version: z.number().int().min(1),
        reason: z.string().min(4).max(500),
      })
      .parse(body);
    return this.business.remove(req.user, entity(e), id, v.version, v.reason);
  }
  @Post("payments/:id/refunds") refund(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.business.refund(
      req.user,
      id,
      z
        .object({
          allocationId: z.uuid(),
          amount: money.refine((v) => Number(v) > 0),
          refundedOn: date,
          reason: z.string().min(4).max(500),
        })
        .parse(input),
    );
  }
  @Get("dashboard")
  @ApiOperation({
    summary:
      "Indicadores com registros e consultas de origem; mesma fonte das tabelas",
  })
  dashboard(@Req() req: AuthReq, @Q("q") q?: string, @Q("mode") mode?: string) {
    return this.data.dashboard(
      req.user,
      parseQuery(q),
      z.enum(["cash", "accrual"]).parse(mode || "accrual"),
    );
  }
  @Get("views") views(@Req() req: AuthReq, @Q("entity") e?: string) {
    return db.savedView.findMany({
      where: {
        organizationId: req.user.organizationId,
        ...(e ? { entity: entity(e) } : {}),
      },
      orderBy: { name: "asc" },
    });
  }
  @Post("views") async createView(@Req() req: AuthReq, @Body() body: unknown) {
    const v = z
      .object({
        name: z.string().min(1).max(100),
        entity: z.enum(entities),
        query: querySchema,
      })
      .parse(body);
    return atomic(async (tx) => {
      const r = await tx.savedView.create({
        data: {
          ...v,
          query: plain(v.query),
          organizationId: req.user.organizationId,
        },
      });
      await audit(tx, req.user, "views", r.id, "create", null, r);
      return r;
    });
  }
  @Patch("views/:id") async editView(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const v = z
      .object({
        version: z.number().int(),
        name: z.string().min(1).max(100),
        query: querySchema,
      })
      .parse(body);
    return atomic(async (tx) => {
      const r = await owned(tx, "savedView", req.user, id);
      expectVersion(r, v.version);
      const after = await tx.savedView.update({
        where: { id },
        data: {
          name: v.name,
          query: plain(v.query),
          version: { increment: 1 },
        },
      });
      await audit(tx, req.user, "views", id, "update", r, after);
      return after;
    });
  }
  @Delete("views/:id") async removeView(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return atomic(async (tx) => {
      const before = await owned(tx, "savedView", req.user, id);
      const r = await tx.savedView.delete({ where: { id } });
      await audit(tx, req.user, "views", id, "delete", before, null);
      return r;
    });
  }
  @Get("export/:entity") async export(
    @Req() req: AuthReq,
    @Param("entity") e: string,
    @Q("q") q: string,
    @Q("format") format: string,
    @Res() res: Response,
  ) {
    const en = entity(e),
      query = parseQuery(q),
      rows = selectRows((await this.data.snapshot(req.user))[en], query, en);
    const fields = (
      query.columnOrder.length ? query.columnOrder : entityFields[en]
    ).filter((k) => entityFields[en].includes(k) && query.columns[k] !== false);
    await audit(db, req.user, "exports", en, "export", null, {
      entity: en,
      format: format === "xlsx" ? "xlsx" : "csv",
      rows: rows.length,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Registros");
    sheet.addRow(fields.map((k) => fieldLabels[k] || k));
    for (const row of rows)
      sheet.addRow(
        fields.map((k) => {
          const val = String(row[k] ?? "");
          return /^[=+\-@\t\r]/.test(val) ? "'" + val : val;
        }),
      );
    if (format === "xlsx") {
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .attachment(`${en}.xlsx`);
      res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
    } else {
      res.type("text/csv; charset=utf-8").attachment(`${en}.csv`);
      res.send("\uFEFF" + (await workbook.csv.writeBuffer()).toString());
    }
  }
  @Get("events") events(@Req() req: AuthReq) {
    return db.event.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { name: "asc" },
    });
  }
  @Post("events") async event(@Req() req: AuthReq, @Body() body: unknown) {
    const v = z
      .object({
        name: z.string().min(2).max(160),
        notes: z.string().max(2000).default(""),
      })
      .parse(body);
    v.name = v.name.trim().replace(/\s+/g, " ");
    return atomic(async (tx) => {
      // Same name ignoring case, accents and spacing counts as a duplicate.
      const key = eventKey(v.name);
      const existing = await tx.event.findMany({
        where: { organizationId: req.user.organizationId },
        select: { name: true },
      });
      const twin = existing.find((e) => eventKey(e.name) === key);
      if (twin)
        throw new ConflictException(
          `Já existe um evento chamado "${twin.name}". Escolha-o na lista ou use outro nome.`,
        );
      const r = await tx.event.create({
        data: { ...v, organizationId: req.user.organizationId },
      });
      await audit(tx, req.user, "events", r.id, "create", null, r);
      return r;
    });
  }
  @Post("trips") trip(@Req() req: AuthReq, @Body() body: unknown) {
    return this.business.trip(
      req.user,
      z
        .object({
          appointmentId: z.uuid(),
          vehicleId: z.uuid(),
          distanceKm: money,
          minutes: z.number().int().min(0).max(1440),
          parking: money,
          toll: money,
        })
        .parse(body),
    );
  }
  @Get("agenda/day")
  @ApiOperation({
    summary:
      "Rota do dia: paradas em ordem de horário, trechos, alertas e links do Google Maps. Sem data, abre o próximo dia com atendimento.",
  })
  day(@Req() req: AuthReq, @Q("date") day?: string) {
    return this.routes.day(req.user, day ? date.parse(day) : undefined);
  }
  @Post("agenda/quote")
  @ApiOperation({
    summary:
      "Prévia do atendimento: total, deslocamento sugerido e duração sugerida. Não grava nada.",
  })
  quote(@Req() req: AuthReq, @Body() body: unknown) {
    // Lenient on purpose: the form asks while the user is still typing.
    const amount = money.catch("0");
    return this.routes.quote(
      req.user,
      z
        .object({
          address: z.string().max(500).catch(""),
          items: z
            .array(
              z.object({
                serviceId: z.string().max(40).catch(""),
                quantity: z.number().int().min(1).max(100).catch(1),
                unitPrice: amount,
              }),
            )
            .max(30)
            .catch([]),
          discount: amount,
          extra: amount,
          travelFee: amount,
        })
        .parse(body ?? {}),
    );
  }
  @Put("agenda/legs")
  @ApiOperation({
    summary: "Estimativa informada de tempo e distância entre dois endereços",
  })
  leg(@Req() req: AuthReq, @Body() body: unknown) {
    return this.routes.saveLeg(
      req.user,
      z
        .object({
          origin: z.string().trim().min(3).max(500),
          destination: z.string().trim().min(3).max(500),
          minutes: z.number().int().min(0).max(1440),
          distanceKm: z
            .string()
            .regex(/^\d{1,5}(\.\d{1,2})?$/, "Informe a distância em km"),
        })
        .parse(body),
    );
  }
  @Get("cep/:cep")
  @ApiOperation({ summary: "Endereço a partir do CEP (ViaCEP / BrasilAPI)" })
  cep(@Param("cep") cep: string) {
    return lookupCep(cep);
  }
  @Get("settings") async settings(@Req() req: AuthReq) {
    return db.organization.findUniqueOrThrow({
      where: { id: req.user.organizationId },
    });
  }
  @Patch("settings") async saveSettings(
    @Req() req: AuthReq,
    @Body() body: unknown,
  ) {
    const v = z
      .object({
        name: z.string().min(2).max(160),
        settings: z.object({
          beige: z.string().regex(/^#[a-fA-F0-9]{6}$/),
          green: z.string().regex(/^#[a-fA-F0-9]{6}$/),
          originAddress: z.string().max(500),
          originAddressData: addressDataSchema.optional(),
          bufferMinutes: z.number().int().min(0).max(240),
          dashboardIndicators: z.array(z.string()).max(20).optional(),
        }),
      })
      .parse(body);
    return atomic(async (tx) => {
      const before = await tx.organization.findUniqueOrThrow({
        where: { id: req.user.organizationId },
      });
      const after = await tx.organization.update({
        where: { id: req.user.organizationId },
        data: {
          name: v.name,
          settings: { ...(before.settings as any), ...v.settings },
        },
      });
      // Stored settings start empty; the audit shows the values that were in effect.
      await audit(
        tx,
        req.user,
        "settings",
        after.id,
        "update",
        {
          name: before.name,
          settings: { ...defaultSettings, ...(before.settings as object) },
        },
        {
          name: after.name,
          settings: { ...defaultSettings, ...(after.settings as object) },
        },
      );
      return after;
    });
  }
  @Get("audit")
  @ApiOperation({
    summary:
      "Histórico de alterações; filtros opcionais por tipo e por registro",
  })
  async audit(
    @Req() req: AuthReq,
    @Q("entity") e?: string,
    @Q("recordId") recordId?: string,
  ) {
    const w = { organizationId: req.user.organizationId };
    const rows = await db.audit.findMany({
      where: {
        ...w,
        ...(e ? { entity: z.string().max(40).parse(e) } : {}),
        ...(recordId ? { recordId: z.string().max(80).parse(recordId) } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const users = new Map(
      (
        await db.user.findMany({ where: w, select: { id: true, name: true } })
      ).map((u) => [u.id, u.name]),
    );
    return rows.map((r) => ({ ...r, userName: users.get(r.userId) ?? "—" }));
  }
  @Get("export-all") async exportAll(
    @Req() req: AuthReq,
    @Res() res: Response,
  ) {
    const output: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    for (const model of [
      "organization",
      "client",
      "service",
      "event",
      "appointment",
      "appointmentItem",
      "payment",
      "allocation",
      "refund",
      "expense",
      "vehicle",
      "trip",
      "routeLeg",
      "media",
      "savedView",
      "audit",
      "importBatch",
      "importReceipt",
    ])
      output[model] = await (db as any)[model].findMany({
        where:
          model === "organization"
            ? { id: req.user.organizationId }
            : { organizationId: req.user.organizationId },
      });
    await audit(db, req.user, "exports", "all", "export", null, {
      entity: "all",
      format: "json",
    });
    res.attachment("gferraz-dados.json").json(output);
  }
  @Post("media")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async upload(
    @Req() req: AuthReq,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) throw new BadRequestException("Selecione uma imagem");
    const v = z
      .object({ clientId: z.uuid(), appointmentId: z.uuid().optional() })
      .parse(body);
    return this.media.upload(req.user, v.clientId, v.appointmentId, file);
  }
  @Get("media") listMedia(
    @Req() req: AuthReq,
    @Q("clientId", ParseUUIDPipe) clientId: string,
    @Q("appointmentId") appointmentId?: string,
  ) {
    if (appointmentId) z.uuid().parse(appointmentId);
    return this.media.list(req.user, clientId, appointmentId);
  }
  @Get("media/integrity") integrity(@Req() req: AuthReq) {
    return this.media.integrity(req.user);
  }
  @Get("media/:id") async readMedia(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
    @Q("thumbnail") thumbnail: string,
    @Res() res: Response,
  ) {
    const data = await this.media.read(req.user, id, thumbnail === "1");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(data.type).send(data.buffer);
  }
  @Delete("media/:id") removeMedia(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.media.remove(req.user, id);
  }
  @Post("imports/preview")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  preview(@Req() req: AuthReq, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Selecione a planilha");
    return this.imports.preview(req.user, file);
  }
  @Get("imports") batches(@Req() req: AuthReq) {
    return db.importBatch.findMany({
      where: { organizationId: req.user.organizationId },
      select: { id: true, fileName: true, createdAt: true, report: true },
    });
  }
  @Get("imports/:id") importBatch(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.imports.get(req.user, id);
  }
  @Post("imports/:id/commit") commit(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const v = z
      .object({
        rows: z
          .array(
            z.object({
              key: z.string().max(250),
              mapped: z.record(z.string(), z.unknown()),
              reviewed: z.literal(true),
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(body);
    return this.imports.commit(req.user, id, v.rows);
  }
}
