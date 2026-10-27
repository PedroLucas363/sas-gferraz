import {
  BadRequestException,
  HttpException,
  Injectable,
  Inject,
} from "@nestjs/common";
import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { z } from "zod";
import { date, money, status } from "@gferraz/shared";
import { db, Context, plain, atomic, owned, D, audit } from "./db";
import { LocalStorage } from "./storage";
import { BusinessService } from "./business.service";
const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
export function parseMoney(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s =
    typeof v === "number"
      ? String(v)
      : String(v)
          .replace(/R\$|\s/g, "")
          .replace(/\.(?=\d{3}(?:\D|$))/g, "")
          .replace(",", ".");
  try {
    return money.parse(D(s).toFixed(2));
  } catch {
    return null;
  }
}
export function parseDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const result = br
    ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`
    : s;
  const p = date.safeParse(result);
  return p.success &&
    Number(result.slice(0, 4)) >= 2000 &&
    Number(result.slice(0, 4)) <= 2100
    ? result
    : null;
}
function value(v: any): any {
  if (v && typeof v === "object") {
    if (v.formula) return v.result ?? null;
    if (v.richText) return v.richText.map((x: any) => x.text).join("");
    if (v.text) return v.text;
  }
  return v;
}
export type ImportRow = {
  key: string;
  sheet: string;
  row: number;
  kind: string;
  raw: Record<string, unknown>;
  mapped: Record<string, any>;
  issues: string[];
  imported?: boolean;
};
const normalizedName = (v: string) => norm(v).replace(/\s+/g, " ");
@Injectable()
export class ImportService {
  constructor(
    @Inject(BusinessService) private readonly business: BusinessService,
  ) {}
  async preview(c: Context, file: Express.Multer.File) {
    if (!/\.(xlsx|csv)$/i.test(file.originalname))
      throw new BadRequestException("Use XLSX ou CSV");
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const existing = await db.importBatch.findUnique({
      where: {
        organizationId_checksum: { organizationId: c.organizationId, checksum },
      },
    });
    if (existing) return this.get(c, existing.id);
    const workbook = new ExcelJS.Workbook();
    try {
      if (/\.csv$/i.test(file.originalname)) {
        const first = file.buffer.toString("utf8").split("\n")[0];
        await workbook.csv.read(Readable.from(file.buffer), {
          parserOptions: { delimiter: first.includes(";") ? ";" : "," },
        });
      } else await workbook.xlsx.load(file.buffer as any);
    } catch {
      throw new BadRequestException("Não foi possível ler o arquivo");
    }
    const rows: ImportRow[] = [];
    const sheets = [];
    for (const sheet of workbook.worksheets) {
      let header = 0;
      let kind = "review";
      const headers: Record<string, number> = {};
      for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
        const cells = sheet.getRow(r);
        const names: string[] = [];
        cells.eachCell((cell) => names.push(norm(value(cell.value))));
        if (
          names.includes("NOME") ||
          names.includes("CLIENTE") ||
          names.includes("COMPRA")
        ) {
          header = r;
          cells.eachCell((cell, col) => {
            const n = norm(value(cell.value));
            if (n && !headers[n]) headers[n] = col;
          });
          kind = names.includes("NOME")
            ? "appointment"
            : names.includes("COMPRA")
              ? "expense"
              : "payment";
          break;
        }
      }
      sheets.push({
        name: sheet.name,
        kind,
        header,
        rows: sheet.actualRowCount,
      });
      sheet.eachRow((row, index) => {
        const raw: Record<string, unknown> = {};
        row.eachCell((cell, col) => {
          if (cell.value !== null)
            raw[sheet.getColumn(col).letter] = plain(cell.value);
        });
        if (!Object.keys(raw).length) return;
        const get = (...labels: string[]) => {
          for (const l of labels)
            if (headers[norm(l)])
              return value(row.getCell(headers[norm(l)]).value);
          return null;
        };
        const issues: string[] = [];
        let mapped: Record<string, any> = {};
        const principal =
          kind === "appointment"
            ? [get("NOME"), get("VALOR TOTAL")]
            : kind === "payment"
              ? [get("CLIENTE"), get("VALOR TRANSFERIDO")]
              : kind === "expense"
                ? [get("COMPRA"), get("VALOR")]
                : [];
        if (index <= header || !principal.some((v) => v !== null && v !== "")) {
          rows.push({
            key: `${sheet.name}:${index}`,
            sheet: sheet.name,
            row: index,
            kind: "review",
            raw,
            mapped: {},
            issues: ["Cabeçalho, resumo ou referência preservado para revisão"],
          });
          return;
        }
        if (kind === "appointment") {
          const name = get("NOME");
          const total = get("VALOR TOTAL");
          if (!name && !total) return;
          const d = parseDate(get("DATA DO ATENDIMENTO"));
          const time = get("HORÁRIO DO ATENDIMENTO");
          mapped = {
            name: String(name ?? ""),
            phone: "",
            date: d || "",
            time:
              time instanceof Date
                ? time.toISOString().slice(11, 16)
                : /^\d{2}:\d{2}/.test(String(time))
                  ? String(time).slice(0, 5)
                  : "",
            total: parseMoney(total) || "",
            service: String(get("SERVIÇO") ?? ""),
            status: "confirmed",
            duration: "60",
          };
          issues.push(
            "Duração prevista de 60 min é uma proposta inicial; revise. Nenhuma duração real é inferida.",
          );
          if (!mapped.name) issues.push("Cliente ausente");
          if (!d) issues.push("Data inválida ou ausente");
          if (!mapped.time)
            issues.push("Horário ausente; informe antes de importar");
          if (!mapped.total)
            issues.push("Valor contratado inválido ou ausente");
          if (!mapped.service) issues.push("Serviço ausente");
          issues.push(
            "Confirmar identidade da cliente e situação do atendimento",
          );
        } else if (kind === "payment") {
          const name = get("CLIENTE"),
            amount = get("VALOR TRANSFERIDO");
          if (!name && !amount) return;
          mapped = {
            name: String(name ?? ""),
            phone: String(get("TELEFONE") ?? ""),
            date:
              parseDate(get("DATA DA TRANFERÊNCIA", "DATA DA TRANSFERÊNCIA")) ||
              "",
            amount: parseMoney(amount) || "",
            method: norm(get("FORMA DE PAGAMENTO")) === "PIX" ? "Pix" : "Outro",
            appointmentId: "",
            service: String(get("ENTRADAS") ?? ""),
            eventDate:
              parseDate(get("DATA DO EVENTO", "DATA DO EVENTO OU VENDA")) || "",
          };
          if (!mapped.date)
            issues.push("Data de recebimento inválida ou ausente");
          if (!mapped.amount)
            issues.push("Valor transferido ausente ou inválido");
          issues.push(
            "Vincule o recebimento a um atendimento; não inferir pagamento por valor contratado",
          );
        } else if (kind === "expense") {
          const description = get("COMPRA"),
            amount = get("VALOR");
          if (!description && !amount) return;
          mapped = {
            description: String(description ?? ""),
            amount: parseMoney(amount) || "",
            category: String(get("CLASSIFICAÇÃO") ?? ""),
            date: parseDate(get("DATA DA COMPRA")) || "",
            dueDate: parseDate(get("VENCIMENTO")) || "",
            paidOn: "",
            sourceStatus: String(get("STATUS") ?? ""),
          };
          if (!mapped.description) issues.push("Descrição ausente");
          if (!mapped.date) issues.push("Data de competência ausente");
          if (!mapped.dueDate) issues.push("Vencimento ausente");
          if (!mapped.amount) issues.push("Valor inválido");
          if (norm(mapped.sourceStatus) === "PAGO")
            issues.push(
              "Pago na origem, mas sem data efetiva: informe a data de pagamento",
            );
        } else {
          mapped = {};
          issues.push(
            "Referência, fórmula ou resumo preservado; não importado automaticamente",
          );
        }
        for (const val of Object.values(raw))
          if (
            val &&
            typeof val === "object" &&
            "formula" in val &&
            !(val as any).result
          )
            issues.push(
              "Fórmula sem resultado disponível: informe um valor validado",
            );
        rows.push({
          key: `${sheet.name}:${index}`,
          sheet: sheet.name,
          row: index,
          kind,
          raw,
          mapped,
          issues,
        });
      });
    }
    if (rows.length > 10000)
      throw new BadRequestException("Limite de 10.000 linhas por arquivo");
    const report = {
      sheets,
      total: rows.length,
      byKind: Object.fromEntries(
        ["appointment", "payment", "expense", "review"].map((k) => [
          k,
          rows.filter((r) => r.kind === k).length,
        ]),
      ),
      sourceTotals: Object.fromEntries(
        ["appointment", "payment", "expense"].map((k) => [
          k,
          rows
            .filter((r) => r.kind === k)
            .reduce(
              (a, r) => a.plus(r.mapped.total || r.mapped.amount || "0"),
              D(0),
            )
            .toFixed(2),
        ]),
      ),
      warnings: [
        "Totais de origem são somas das linhas reconhecidas, sem usar fórmulas de resumo.",
        "A planilha contém estruturas distintas, categorias comerciais diferentes, datas ausentes e resumos laterais. Revise as linhas; não há importação automática.",
      ],
    };
    const storage = new LocalStorage();
    const sourcePath = `${c.organizationId}/Importações/${checksum}.${/\.csv$/i.test(file.originalname) ? "csv" : "xlsx"}`;
    if (!(await storage.exists(sourcePath)))
      await storage.put(sourcePath, file.buffer);
    const batch = await db.importBatch.create({
      data: {
        organizationId: c.organizationId,
        fileName: file.originalname,
        sourcePath,
        checksum,
        rows: plain(rows),
        report: plain(report),
      },
    });
    return this.get(c, batch.id);
  }
  async get(c: Context, id: string) {
    const batch = await owned(db, "importBatch", c, id);
    const receipts = await db.importReceipt.findMany({
      where: { organizationId: c.organizationId, batchId: id },
    });
    return {
      ...batch,
      rows: (batch.rows as ImportRow[]).map((r) => ({
        ...r,
        mapped:
          r.kind === "appointment" ? { duration: "60", ...r.mapped } : r.mapped,
        imported: receipts.some(
          (x) => x.sourceKey === `${batch.checksum}:${r.key}`,
        ),
      })),
      receipts,
    };
  }
  async commit(
    c: Context,
    id: string,
    selections: {
      key: string;
      mapped: Record<string, any>;
      reviewed: boolean;
    }[],
  ) {
    const batch = await owned(db, "importBatch", c, id);
    const original = batch.rows as ImportRow[];
    const results = [];
    for (const s of selections) {
      const row = original.find((r) => r.key === s.key);
      if (!row || !s.reviewed || row.kind === "review") {
        results.push({
          key: s.key,
          status: "pending",
          reason: "Linha deve ser revisada e ter um tipo suportado",
        });
        continue;
      }
      try {
        const result = await atomic(async (tx) => {
          const sourceKey = `${batch.checksum}:${row.key}`;
          const mapped = s.mapped;
          const fingerprint = createHash("sha256")
            .update(
              JSON.stringify({
                kind: row.kind,
                values: Object.keys(mapped)
                  .sort()
                  .map((k) => [
                    k,
                    typeof mapped[k] === "string"
                      ? mapped[k].trim()
                      : mapped[k],
                  ]),
              }),
            )
            .digest("hex");
          if (
            await tx.importReceipt.findFirst({
              where: {
                organizationId: c.organizationId,
                OR: [{ sourceKey }, { fingerprint }],
              },
            })
          )
            return { status: "ignored", reason: "Registro já importado" };
          let client: any = null;
          if (row.kind === "appointment") {
            const name = z.string().trim().min(2).max(160).parse(mapped.name);
            const matches = await tx.client.findMany({
              where: { organizationId: c.organizationId, archivedAt: null },
            });
            const possible = matches.filter(
              (x) => normalizedName(x.name) === normalizedName(name),
            );
            if (mapped.clientId)
              client = await owned(
                tx,
                "client",
                c,
                z.uuid().parse(mapped.clientId),
              );
            else if (
              possible.length === 1 &&
              (!mapped.phone ||
                !possible[0].phone ||
                possible[0].phone.replace(/\D/g, "") ===
                  String(mapped.phone).replace(/\D/g, ""))
            )
              client = possible[0];
            else if (possible.length)
              throw new BadRequestException(
                "Identidade ambígua: informe o ID da cliente",
              );
            if (!client)
              client = await this.business.saveTx(tx, c, "clients", {
                name,
                phone: mapped.phone || "",
                notes: `Origem: ${batch.fileName} / ${row.key}`,
              });
          }
          let entity: any, record: any;
          if (row.kind === "appointment") {
            const v = z
              .object({
                date,
                time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
                total: money,
                duration: z.coerce.number().int().min(5).max(1440),
                service: z.string().min(1).max(160),
                status,
              })
              .parse(mapped);
            let service = await tx.service.findFirst({
              where: {
                organizationId: c.organizationId,
                name: v.service,
                archivedAt: null,
              },
            });
            if (!service)
              service = await this.business.saveTx(tx, c, "services", {
                name: v.service,
                category: "Histórico — revisar catálogo",
                price: "0",
                duration: v.duration,
              });
            entity = "appointments";
            record = await this.business.saveTx(tx, c, entity, {
              clientId: client.id,
              title: v.service,
              startsAt: `${v.date}T${v.time}:00-03:00`,
              duration: v.duration,
              status: v.status,
              dueDate: v.date,
              items: [
                { serviceId: service!.id, quantity: 1, unitPrice: v.total },
              ],
              notes: `Origem: ${batch.fileName} / ${row.key}. Pagamentos não inferidos.`,
            });
          } else if (row.kind === "payment") {
            const v = z
              .object({
                appointmentId: z.uuid(),
                date,
                amount: money,
                method: z.enum([
                  "Pix",
                  "Dinheiro",
                  "Cartão",
                  "Transferência",
                  "Outro",
                ]),
              })
              .parse(mapped);
            const a = await owned(tx, "appointment", c, v.appointmentId);
            entity = "payments";
            record = await this.business.saveTx(tx, c, entity, {
              clientId: a.clientId,
              receivedAt: v.date,
              method: v.method,
              allocations: [{ appointmentId: a.id, amount: v.amount }],
              notes: `Origem: ${batch.fileName} / ${row.key}`,
            });
          } else {
            const v = z
              .object({
                description: z.string().min(2),
                category: z.string().min(1),
                amount: money,
                date,
                dueDate: date,
                paidOn: z.union([date, z.literal("")]),
              })
              .parse(mapped);
            if (norm(mapped.sourceStatus) === "PAGO" && !v.paidOn)
              throw new BadRequestException(
                "Informe a data efetiva de pagamento da despesa paga",
              );
            entity = "expenses";
            record = await this.business.saveTx(tx, c, entity, {
              description: v.description,
              category: v.category,
              amount: v.amount,
              incurredOn: v.date,
              dueDate: v.dueDate,
              paidOn: v.paidOn || null,
              kind: "variable",
              notes: `Origem: ${batch.fileName} / ${row.key}`,
            });
          }
          await tx.importReceipt.create({
            data: {
              organizationId: c.organizationId,
              batchId: id,
              sourceKey,
              fingerprint,
              entity,
              recordId: record.id,
            },
          });
          await audit(tx, c, "imports", id, "import_row", row, {
            mapped,
            entity,
            recordId: record.id,
          });
          return { status: "imported", entity, recordId: record.id };
        });
        results.push({ key: s.key, ...result });
      } catch (e) {
        results.push({
          key: s.key,
          status: "pending",
          reason:
            e instanceof HttpException
              ? e.message
              : e instanceof z.ZodError
                ? e.issues
                    .map((i) => `${i.path.join(".")}: ${i.message}`)
                    .join("; ")
                : "Falha ao gravar a linha. Revise os dados e tente novamente.",
        });
      }
    }
    return { results, batch: await this.get(c, id) };
  }
}
