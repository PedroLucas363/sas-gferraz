import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query as Q,
  Req,
  Res,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
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
} from "@gferraz/shared";
import { db, Context, owned, atomic, expectVersion, audit, plain } from "./db";
import { DataService } from "./data.service";
import { BusinessService } from "./business.service";
import { AuthService } from "./auth";
import { MediaService } from "./storage";
import { ImportService } from "./import.service";
import { localDate } from "./finance";
import { selectRows } from "./query";
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
    return this.auth.session(await this.auth.login(v.email, v.password), res);
  }
  @Post("auth/logout") logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
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
    return db.savedView.create({
      data: {
        ...v,
        query: plain(v.query),
        organizationId: req.user.organizationId,
      },
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
      return tx.savedView.update({
        where: { id },
        data: {
          name: v.name,
          query: plain(v.query),
          version: { increment: 1 },
        },
      });
    });
  }
  @Delete("views/:id") async removeView(
    @Req() req: AuthReq,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await owned(db, "savedView", req.user, id);
    return db.savedView.delete({ where: { id } });
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
    });
  }
  @Post("events") async event(@Req() req: AuthReq, @Body() body: unknown) {
    const v = z
      .object({
        name: z.string().min(2).max(160),
        notes: z.string().max(2000).default(""),
      })
      .parse(body);
    return atomic(async (tx) => {
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
  @Get("agenda/route") async route(@Req() req: AuthReq, @Q("day") day: string) {
    date.parse(day);
    const org = await db.organization.findUniqueOrThrow({
      where: { id: req.user.organizationId },
    });
    const settings = org.settings as any;
    const buffer = Number(settings.bufferMinutes ?? 15);
    const appointments = await db.appointment.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: { in: ["confirmed", "in_progress"] },
      },
      include: { client: true, trips: true },
      orderBy: { startsAt: "asc" },
    });
    let previousEnd: Date | null = null;
    const rows = appointments
      .filter((a) => localDate(a.startsAt) === day)
      .map((a) => {
        const trip = a.trips.at(-1);
        const departure = trip
          ? new Date(a.startsAt.getTime() - (trip.minutes + buffer) * 60000)
          : null;
        const conflict = previousEnd
          ? previousEnd > a.startsAt || (!!departure && previousEnd > departure)
          : false;
        previousEnd = new Date(a.startsAt.getTime() + a.duration * 60000);
        return {
          id: a.id,
          clientName: a.client.name,
          title: a.title,
          startsAt: a.startsAt,
          end: previousEnd,
          address: a.address,
          departure,
          minutes: trip?.minutes ?? null,
          distanceKm: trip?.distanceKm?.toString() ?? null,
          source: trip ? "manual" : "unavailable",
          conflict,
        };
      });
    return {
      origin: settings.originAddress || "",
      bufferMinutes: buffer,
      rows,
      notice:
        "Tempos manuais por trecho de entrada no atendimento. Rotas automáticas ainda não configuradas; não há estimativas fictícias.",
    };
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
      await audit(tx, req.user, "settings", after.id, "update", before, after);
      return after;
    });
  }
  @Get("audit") audit(@Req() req: AuthReq) {
    return db.audit.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
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
