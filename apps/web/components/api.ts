import { querySchema, Entity, Query, statusLabels } from "@gferraz/shared";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const e = await res
      .json()
      .catch(() => ({ message: "Serviço indisponível" }));
    const detail = e.details
      ?.map((d: any) => `${d.path.join(".")}: ${d.message}`)
      .join("; ");
    throw new ApiError(
      detail || e.message || "Não foi possível concluir a operação",
      res.status,
    );
  }
  return res.json();
}
export const queryString = (q: Query) => encodeURIComponent(JSON.stringify(q));
export async function allRows(entity: Entity) {
  let rows: any[] = [];
  for (let page = 0; page < 100; page++) {
    const r = await api(
      `data/${entity}?q=${queryString(querySchema.parse({ page, pageSize: 100 }))}`,
    );
    rows = rows.concat(r.rows);
    if (rows.length >= r.total) return rows;
  }
  return rows;
}
export const brl = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const day = (s: string | null | undefined) =>
  s ? s.slice(0, 10).split("-").reverse().join("/") : "—";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function display(field: string, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "status") return statusLabels[String(v)] || String(v);
  if (field === "kind")
    return v === "fixed" ? "Fixa" : v === "variable" ? "Variável" : String(v);
  if (
    [
      "total",
      "paid",
      "pending",
      "amount",
      "fee",
      "net",
      "price",
      "travelFee",
      "costPerKm",
    ].includes(field)
  )
    return brl(v);
  if (
    [
      "date",
      "dueDate",
      "paidOn",
      "incurredOn",
      "firstVisit",
      "lastVisit",
      "birthday",
    ].includes(field)
  )
    return day(String(v));
  return String(v);
}
