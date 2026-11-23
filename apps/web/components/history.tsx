"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fieldLabels, statusLabels } from "@gferraz/shared";
import { api, brl, day } from "./api";

const entityNames: Record<string, string> = {
  clients: "Cliente",
  services: "Serviço",
  appointments: "Atendimento",
  payments: "Recebimento",
  expenses: "Despesa",
  vehicles: "Veículo",
  refunds: "Reembolso",
  trips: "Trecho de deslocamento",
  routeLegs: "Estimativa de trajeto",
  events: "Evento",
  settings: "Configurações",
  media: "Fotografia",
  imports: "Importação",
  views: "Visualização salva",
  exports: "Exportação",
  access: "Acesso",
};
const actionNames: Record<string, string> = {
  create: "criou",
  update: "alterou",
  archive: "arquivou",
  void: "estornou",
  delete: "excluiu",
  import_row: "importou",
  export: "exportou",
  login: "entrou no sistema",
  logout: "saiu do sistema",
};
const labels: Record<string, string> = {
  ...fieldLabels,
  title: "Nome do atendimento",
  startsAt: "Data e horário",
  actualDuration: "Duração realizada (min)",
  discount: "Desconto",
  extra: "Adicionais",
  items: "Serviços",
  allocations: "Distribuição",
  preferences: "Preferências",
  birthday: "Nascimento",
  consentPhotos: "Consentimento para fotos",
  receivedAt: "Data do recebimento",
  refundedOn: "Data do reembolso",
  reason: "Motivo",
  voidReason: "Motivo do estorno",
  voidedAt: "Estornado em",
  archivedAt: "Arquivado em",
  kmPerLiter: "Consumo (km/L)",
  fuelPrice: "Preço do combustível",
  annualKm: "Quilometragem anual",
  insurance: "Seguro anual",
  maintenance: "Manutenção anual",
  tires: "Pneus",
  oil: "Óleo",
  tax: "IPVA e licenciamento",
  depreciation: "Depreciação",
  other: "Outros custos",
  distanceKm: "Distância (km)",
  minutes: "Tempo (min)",
  parking: "Estacionamento",
  toll: "Pedágio",
  estimatedCost: "Custo estimado",
  origin: "Origem",
  destination: "Destino",
  source: "Fonte",
  originalName: "Arquivo",
  fileName: "Arquivo",
  rows: "Linhas",
  format: "Formato",
  entity: "Conteúdo",
  query: "Filtros e colunas",
  customFields: "Campos personalizados",
  "settings.green": "Cor verde",
  "settings.beige": "Cor bege",
  "settings.originAddress": "Endereço de partida",
  "settings.bufferMinutes": "Margem de segurança (min)",
  "settings.dashboardIndicators": "Indicadores do painel",
  "owner.name": "Proprietária",
  "owner.email": "E-mail da proprietária",
  cep: "CEP",
  street: "Rua",
  number: "Número",
  complement: "Complemento",
  district: "Bairro",
  city: "Cidade",
  state: "UF",
};
const hidden = new Set([
  "id",
  "organizationId",
  "version",
  "passwordHash",
  "createdAt",
  "updatedAt",
  "clientId",
  "eventId",
  "appointmentId",
  "paymentId",
  "allocationId",
  "vehicleId",
  "serviceId",
  "batchId",
  "originKey",
  "destinationKey",
  "checksum",
  "relativePath",
  "thumbnailPath",
  "sourcePath",
  "key",
  // The single-line address already shows what changed in the structured one.
  "addressData",
  "settings.originAddressData",
]);
const money = new Set([
  "amount",
  "fee",
  "price",
  "discount",
  "extra",
  "travelFee",
  "unitPrice",
  "parking",
  "toll",
  "estimatedCost",
  "fuelPrice",
  "insurance",
  "maintenance",
  "tires",
  "oil",
  "tax",
  "depreciation",
  "other",
]);
/** One level of nesting (settings, owner) becomes "group.field"; lists stay as a single value. */
function flatten(value: unknown) {
  const out: Record<string, unknown> = {};
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value))
    if (v && typeof v === "object" && !Array.isArray(v))
      for (const [k2, v2] of Object.entries(v)) out[`${k}.${k2}`] = v2;
    else out[k] = v;
  return out;
}
function show(key: string, v: unknown): string {
  const field = key.split(".").at(-1)!;
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (Array.isArray(v))
    return (
      v
        .map((x) =>
          x && typeof x === "object"
            ? x.serviceName
              ? `${x.quantity} × ${x.serviceName} (${brl(x.unitPrice)})`
              : x.amount
                ? brl(x.amount)
                : JSON.stringify(x)
            : String(x),
        )
        .join(", ") || "—"
    );
  if (typeof v === "object") return JSON.stringify(v);
  if (field === "status") return statusLabels[String(v)] || String(v);
  if (field === "kind")
    return v === "fixed" ? "Fixa" : v === "variable" ? "Variável" : String(v);
  if (money.has(field)) return brl(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v))
    return /T00:00:00\.000Z$/.test(v)
      ? day(v)
      : new Date(v).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          dateStyle: "short",
          timeStyle: "short",
        });
  return String(v);
}
type Entry = {
  id: string;
  entity: string;
  recordId: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
  userName: string;
};
function changes(e: Entry) {
  const before = flatten(e.before),
    after = flatten(e.after);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((k) => !hidden.has(k) && !hidden.has(k.split(".").at(-1)!))
    .map((k) => ({
      key: k,
      label: labels[k] || labels[k.split(".").at(-1)!] || k,
      before: e.before ? show(k, before[k]) : null,
      after: e.after ? show(k, after[k]) : null,
    }))
    .filter((c) =>
      e.before && e.after
        ? c.before !== c.after
        : (c.after ?? c.before) !== "—",
    );
}
const subject = (e: Entry) => {
  const r = (e.after || e.before || {}) as Record<string, any>;
  return (
    r.name || r.title || r.description || r.originalName || r.fileName || ""
  );
};
/** Readable change log: who did what and when, with the value before and after each change. */
export function History({
  entity,
  recordId,
  filter = false,
}: {
  entity?: string;
  recordId?: string;
  filter?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const scope = entity ?? selected;
  const log = useQuery({
    queryKey: ["audit", scope, recordId],
    queryFn: (): Promise<Entry[]> =>
      api(
        "audit?" +
          new URLSearchParams({
            ...(scope ? { entity: scope } : {}),
            ...(recordId ? { recordId } : {}),
          }),
      ),
  });
  return (
    <div className="history">
      {filter && (
        <label className="history-filter">
          Mostrar
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Todas as ações</option>
            {Object.entries(entityNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}
      {log.error && <p className="error">{log.error.message}</p>}
      {log.isLoading && <p className="muted">Carregando histórico…</p>}
      {log.data?.length === 0 && (
        <p className="muted">Nenhuma ação registrada até agora.</p>
      )}
      <ol className="history-list">
        {log.data?.map((e) => {
          const rows = changes(e);
          const both = !!e.before && !!e.after;
          return (
            <li key={e.id}>
              <p className="history-head">
                <strong>{e.userName}</strong>{" "}
                {actionNames[e.action] || e.action}
                {["login", "logout"].includes(e.action) ? "" : " "}
                {!["login", "logout"].includes(e.action) && (
                  <span>
                    {(entityNames[e.entity] || e.entity).toLowerCase()}
                    {subject(e) ? ` “${subject(e)}”` : ""}
                  </span>
                )}
              </p>
              <time dateTime={e.createdAt}>
                {new Date(e.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </time>
              {rows.length > 0 &&
                (both ? (
                  <table className="history-diff">
                    <thead>
                      <tr>
                        <th>Campo</th>
                        <th>Antes</th>
                        <th>Depois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.key}>
                          <td data-label="Campo">{c.label}</td>
                          <td data-label="Antes">{c.before}</td>
                          <td data-label="Depois">{c.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <details>
                    <summary>
                      {e.after
                        ? "Ver dados registrados"
                        : "Ver dados removidos"}
                    </summary>
                    <dl className="history-data">
                      {rows.map((c) => (
                        <div key={c.key}>
                          <dt>{c.label}</dt>
                          <dd>{c.after ?? c.before}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))}
              {both && rows.length === 0 && (
                <p className="muted">Salvo sem mudança de valores.</p>
              )}
            </li>
          );
        })}
      </ol>
      {log.data?.length === 200 && (
        <p className="muted">
          Exibindo as 200 ações mais recentes. O registro completo está na
          exportação de dados.
        </p>
      )}
    </div>
  );
}
