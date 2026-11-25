import { z } from "zod";
export const money = z
  .string()
  .regex(
    /^\d{1,10}(\.\d{1,2})?$/,
    "Informe um valor não negativo com até duas casas decimais",
  );
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
export const instant = z.string().datetime({ offset: true });
export const status = z.enum([
  "quote",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);
export const statusLabels: Record<string, string> = {
  quote: "Orçamento",
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
export const kindLabels: Record<string, string> = {
  fixed: "Fixa",
  variable: "Variável",
};
/** Fields stored as codes but shown as words; filters and search accept either. */
export const fieldValueLabels: Record<string, Record<string, string>> = {
  status: statusLabels,
  kind: kindLabels,
};
export const valueLabel = (field: string, v: unknown) =>
  fieldValueLabels[field]?.[String(v)] ?? String(v ?? "");
export const addressDataSchema = z.object({
  cep: z.string().max(9).default(""),
  street: z.string().max(500).default(""),
  number: z.string().max(20).default(""),
  complement: z.string().max(100).default(""),
  district: z.string().max(100).default(""),
  city: z.string().max(100).default(""),
  state: z.string().max(2).default(""),
});
export type AddressData = z.infer<typeof addressDataSchema>;
export const emptyAddress: AddressData = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};
/** Single-line address used by lists, routes and map links. */
export function formatAddress(a: Partial<AddressData>) {
  const t = (v?: string) => (v || "").trim();
  const line = [t(a.street), t(a.number)].filter(Boolean).join(", ");
  const first = [line, t(a.complement)].filter(Boolean).join(" - ");
  const cityState = [t(a.city), t(a.state)].filter(Boolean).join(" - ");
  return [first, t(a.district), cityState, t(a.cep)].filter(Boolean).join(", ");
}
export const hasAddressData = (a?: Partial<AddressData> | null) =>
  !!a && Object.values(a).some((v) => String(v || "").trim());
/** Structured address for editing; a legacy free-text address becomes the street line. */
export function addressDataOf(
  data: Partial<AddressData> | null | undefined,
  legacy: string | null | undefined,
): AddressData {
  return hasAddressData(data)
    ? { ...emptyAddress, ...data }
    : { ...emptyAddress, street: legacy || "" };
}
export const defaultSettings = {
  beige: "#F9EAD2",
  green: "#546B57",
  originAddress: "",
  originAddressData: emptyAddress,
  bufferMinutes: 15,
  dashboardIndicators: [] as string[],
};
export const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().max(40).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  birthday: date.nullable().default(null),
  address: z.string().max(500).default(""),
  addressData: addressDataSchema.prefault({}),
  notes: z.string().max(5000).default(""),
  preferences: z.string().max(2000).default(""),
  consentPhotos: z.boolean().default(false),
  customFields: z.record(z.string(), z.string()).default({}),
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().min(1).max(100),
  price: money,
  duration: z.number().int().min(5).max(1440),
  description: z.string().max(2000).default(""),
});
export const appointmentSchema = z.object({
  clientId: z.uuid(),
  eventId: z.uuid().nullable().default(null),
  title: z.string().min(2).max(160),
  startsAt: instant,
  duration: z.number().int().min(5).max(1440),
  actualDuration: z.number().int().min(0).max(1440).nullable().default(null),
  address: z.string().max(500).default(""),
  addressData: addressDataSchema.prefault({}),
  status,
  discount: money.default("0"),
  extra: money.default("0"),
  travelFee: money.default("0"),
  dueDate: date,
  notes: z.string().max(5000).default(""),
  items: z
    .array(
      z.object({
        serviceId: z.uuid(),
        quantity: z.number().int().min(1).max(100),
        unitPrice: money,
      }),
    )
    .min(1)
    .max(30),
});
export const paymentSchema = z.object({
  clientId: z.uuid(),
  receivedAt: date,
  method: z.enum(["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"]),
  fee: money.default("0"),
  notes: z.string().max(2000).default(""),
  allocations: z
    .array(
      z.object({
        appointmentId: z.uuid(),
        amount: money.refine((v) => Number(v) > 0, "Valor deve ser positivo"),
      }),
    )
    .min(1)
    .max(50),
});
export const expenseSchema = z.object({
  description: z.string().min(2).max(250),
  category: z.string().min(1).max(100),
  amount: money.refine((v) => Number(v) > 0),
  incurredOn: date,
  dueDate: date,
  paidOn: date.nullable().default(null),
  kind: z.enum(["fixed", "variable"]),
  appointmentId: z.uuid().nullable().default(null),
  notes: z.string().max(3000).default(""),
});
export const vehicleSchema = z.object({
  name: z.string().min(2).max(120),
  year: z.number().int().min(1950).max(2100),
  fuel: z.string().max(60),
  kmPerLiter: z
    .string()
    .regex(/^\d+(\.\d{1,3})?$/)
    .refine((v) => Number(v) > 0),
  fuelPrice: money,
  annualKm: z.number().int().min(1).max(1000000),
  insurance: money,
  maintenance: money,
  tires: money,
  oil: money,
  tax: money,
  depreciation: money,
  other: money,
});
export const filterSchema = z.object({
  field: z.string().max(60),
  op: z.enum([
    "eq",
    "ne",
    "contains",
    "gt",
    "lt",
    "between",
    "empty",
    "not_empty",
  ]),
  value: z
    .union([z.string().max(500), z.array(z.string().max(500)).length(2)])
    .optional(),
});
export const querySchema = z
  .object({
    dateField: z.enum(["date", "incurredOn", "paidOn"]).default("date"),
    from: date.optional(),
    to: date.optional(),
    search: z.string().max(200).default(""),
    logic: z.enum(["and", "or"]).default("and"),
    filters: z.array(filterSchema).max(20).default([]),
    sort: z
      .array(z.object({ id: z.string(), desc: z.boolean() }))
      .max(8)
      .default([]),
    groupBy: z.string().nullable().default(null),
    columns: z.record(z.string(), z.boolean()).default({}),
    columnOrder: z.array(z.string()).max(50).default([]),
    columnSizing: z
      .record(z.string(), z.number().min(50).max(1000))
      .default({}),
    page: z.number().int().min(0).default(0),
    pageSize: z.number().int().min(5).max(100).default(20),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, "Período invertido");
export type Query = z.infer<typeof querySchema>;
export type Row = Record<string, string | number | boolean | null>;
export const entities = [
  "clients",
  "services",
  "appointments",
  "payments",
  "expenses",
  "vehicles",
] as const;
export type Entity = (typeof entities)[number];
export const entityLabels: Record<Entity, string> = {
  clients: "Clientes",
  services: "Serviços",
  appointments: "Atendimentos",
  payments: "Recebimentos",
  expenses: "Despesas",
  vehicles: "Veículos",
};
export const fieldLabels: Record<string, string> = {
  name: "Nome",
  phone: "Telefone",
  email: "E-mail",
  address: "Endereço",
  clientName: "Cliente",
  title: "Atendimento",
  date: "Data",
  status: "Situação",
  category: "Categoria",
  amount: "Valor",
  total: "Contratado",
  paid: "Recebido",
  pending: "A receber",
  dueDate: "Vencimento",
  method: "Forma",
  fee: "Taxa",
  net: "Líquido",
  duration: "Minutos",
  price: "Preço de referência",
  count: "Atendimentos",
  notes: "Observações",
  paidOn: "Pagamento",
  incurredOn: "Competência",
  kind: "Tipo",
  description: "Descrição",
  travelFee: "Deslocamento",
  costPerKm: "Custo/km",
  fuel: "Combustível",
  year: "Ano",
  eventId: "Evento",
  serviceNames: "Serviços",
  firstVisit: "Primeiro atendimento",
  lastVisit: "Último atendimento",
};
export const entityFields: Record<Entity, string[]> = {
  clients: [
    "name",
    "phone",
    "email",
    "address",
    "count",
    "total",
    "paid",
    "pending",
    "firstVisit",
    "lastVisit",
  ],
  services: ["name", "category", "price", "duration", "description"],
  appointments: [
    "date",
    "clientName",
    "title",
    "serviceNames",
    "category",
    "status",
    "total",
    "paid",
    "pending",
    "dueDate",
    "travelFee",
    "duration",
    "address",
    "eventId",
    "notes",
  ],
  payments: ["date", "clientName", "amount", "fee", "net", "method", "notes"],
  expenses: [
    "date",
    "clientName",
    "description",
    "category",
    "amount",
    "kind",
    "status",
    "dueDate",
    "paidOn",
    "incurredOn",
    "notes",
  ],
  vehicles: ["name", "year", "fuel", "costPerKm"],
};
export const numericFields = new Set([
  "count",
  "total",
  "paid",
  "pending",
  "price",
  "amount",
  "fee",
  "net",
  "duration",
  "travelFee",
  "costPerKm",
  "year",
]);
