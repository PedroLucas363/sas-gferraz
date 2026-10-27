import { BadRequestException } from "@nestjs/common";
import {
  Entity,
  entityFields,
  numericFields,
  Query,
  Row,
} from "@gferraz/shared";
import { D } from "./db";
const text = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function selectRows(rows: Row[], q: Query, entity: Entity) {
  const allowed = new Set([
    ...entityFields[entity],
    "id",
    "clientId",
    "appointmentId",
  ]);
  for (const f of [...q.filters, ...q.sort.map((s) => ({ field: s.id }))])
    if (!allowed.has(f.field))
      throw new BadRequestException(`Campo inválido: ${f.field}`);
  if (q.groupBy && !allowed.has(q.groupBy))
    throw new BadRequestException("Agrupamento inválido");
  if (q.dateField !== "date" && entity !== "expenses")
    throw new BadRequestException("Base de data inválida");
  let selected = rows.filter((r) => {
    if (entity === "clients" && (q.from || q.to)) {
      const dates = String(r.visitDates || "")
        .split("|")
        .filter(Boolean);
      if (!dates.some((d) => (!q.from || d >= q.from) && (!q.to || d <= q.to)))
        return false;
    }
    const periodDate = r[q.dateField];
    if ((q.from || q.to) && q.dateField !== "date" && !periodDate) return false;
    if (q.from && periodDate && String(periodDate) < q.from) return false;
    if (q.to && periodDate && String(periodDate) > q.to) return false;
    if (
      q.search &&
      !Object.values(r).some((v) => text(v).includes(text(q.search)))
    )
      return false;
    const matches = q.filters.map((f) => {
      const v = r[f.field],
        s = String(v ?? ""),
        target = f.value;
      if (f.op === "empty") return v === null || s === "";
      if (f.op === "not_empty") return v !== null && s !== "";
      if (f.op === "contains") return text(s).includes(text(target));
      if (f.op === "between") {
        if (!Array.isArray(target))
          throw new BadRequestException("Informe dois limites");
        if (numericFields.has(f.field)) {
          try {
            return D(s || 0).gte(target[0]) && D(s || 0).lte(target[1]);
          } catch {
            throw new BadRequestException("Informe limites numéricos válidos");
          }
        }
        return s >= target[0] && s <= target[1];
      }
      if (Array.isArray(target))
        throw new BadRequestException("Valor inválido");
      let cmp: number;
      try {
        cmp =
          numericFields.has(f.field) && s !== "" && target !== undefined
            ? D(s).comparedTo(D(target))
            : text(s).localeCompare(text(target));
      } catch {
        throw new BadRequestException("Informe um filtro numérico válido");
      }
      return f.op === "eq"
        ? cmp === 0
        : f.op === "ne"
          ? cmp !== 0
          : f.op === "gt"
            ? cmp > 0
            : cmp < 0;
    });
    return (
      matches.length === 0 ||
      (q.logic === "and" ? matches.every(Boolean) : matches.some(Boolean))
    );
  });
  selected = selected.sort((a, b) => {
    for (const s of q.sort) {
      const av = a[s.id],
        bv = b[s.id];
      const cmp = numericFields.has(s.id)
        ? D(String(av ?? 0)).comparedTo(D(String(bv ?? 0)))
        : String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
      if (cmp) return s.desc ? -cmp : cmp;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  return selected;
}
export function summarize(rows: Row[]) {
  const out: Record<string, string> = {};
  for (const k of [
    "total",
    "paid",
    "pending",
    "amount",
    "fee",
    "net",
    "travelFee",
  ])
    if (rows.some((r) => k in r))
      out[k] = rows
        .reduce((a, r) => a.plus(String(r[k] ?? 0)), D(0))
        .toFixed(2);
  return out;
}
