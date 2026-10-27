"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Entity,
  entityLabels,
  querySchema,
  fieldLabels,
} from "@gferraz/shared";
import { api, brl, display, today } from "./api";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { DataTable } from "./data-table";
export function Detail({
  entity,
  id,
  onClose,
  onEdit,
  onOpen,
}: {
  entity: Entity;
  id: string;
  onClose: () => void;
  onEdit: () => void;
  onOpen: (e: Entity, id: string) => void;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [tab, setTab] = useState("general");
  const [refund, setRefund] = useState({
    allocationId: "",
    amount: "",
    refundedOn: today(),
    reason: "",
  });
  const record = useQuery({
    queryKey: ["record", entity, id],
    queryFn: () => api(`records/${entity}/${id}`),
    enabled: !id.startsWith("refund:"),
  });
  const r = record.data;
  async function action(fn: () => Promise<any>) {
    setError("");
    try {
      await fn();
      await cache.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Dialog title={entityLabels[entity]} onClose={onClose}>
      {id.startsWith("refund:") ? (
        <p>
          Este registro é um reembolso. Consulte o recebimento original no
          histórico da cliente.
        </p>
      ) : record.isLoading ? (
        <p>Carregando…</p>
      ) : record.error ? (
        <p className="error">{record.error.message}</p>
      ) : (
        r && (
          <>
            <div className="detail-header">
              <div>
                <h2>{r.name || r.title || r.description || "Recebimento"}</h2>
                <small className="muted">ID: {r.id}</small>
              </div>
              {entity !== "payments" && (
                <Button onClick={onEdit}>Editar cadastro</Button>
              )}
            </div>
            <div className="tabs">
              {[
                "general",
                ...(["clients", "appointments"].includes(entity)
                  ? ["history", "finance", "gallery"]
                  : []),
              ].map((k) => (
                <button
                  className={tab === k ? "active" : ""}
                  key={k}
                  onClick={() => setTab(k)}
                >
                  {
                    {
                      general: "Dados gerais",
                      history: "Histórico",
                      finance: "Financeiro",
                      gallery: "Fotografias",
                    }[k]
                  }
                </button>
              ))}
            </div>
            {tab === "general" && (
              <>
                <dl className="detail-grid">
                  {Object.entries(r)
                    .filter(
                      ([k, v]) =>
                        ![
                          "organizationId",
                          "id",
                          "passwordHash",
                          "archivedAt",
                          "voidedAt",
                        ].includes(k) && typeof v !== "object",
                    )
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>
                          {fieldLabels[k] ||
                            (
                              {
                                consentPhotos: "Consentimento para fotos",
                                startsAt: "Início (São Paulo)",
                                preferences: "Preferências",
                                birthday: "Nascimento",
                                receivedAt: "Recebimento",
                                version: "Versão",
                              } as any
                            )[k] ||
                            k}
                        </dt>
                        <dd>
                          {typeof v === "boolean"
                            ? v
                              ? "Sim"
                              : "Não"
                            : k === "startsAt"
                              ? new Date(String(v)).toLocaleString("pt-BR", {
                                  timeZone: "America/Sao_Paulo",
                                })
                              : display(k, v)}
                        </dd>
                      </div>
                    ))}
                </dl>
                {r.items && (
                  <ul>
                    {r.items.map((i: any) => (
                      <li key={i.id}>
                        {i.quantity} × {i.serviceName} · {brl(i.unitPrice)}
                      </li>
                    ))}
                  </ul>
                )}
                {r.customFields && Object.keys(r.customFields).length > 0 && (
                  <dl>
                    {Object.entries(r.customFields).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </>
            )}
            {tab === "history" && (
              <EmbeddedTable
                entity="appointments"
                query={querySchema.parse({
                  filters: [
                    {
                      field: entity === "clients" ? "clientId" : "id",
                      op: "eq",
                      value: id,
                    },
                  ],
                })}
                onQuery={() => {}}
                onOpen={(aid: string) => onOpen("appointments", aid)}
                readonly
              />
            )}
            {tab === "finance" && (
              <>
                <p className="muted">
                  Valores calculados no backend; recebimentos incluem eventuais
                  reembolsos.
                </p>
                <EmbeddedTable
                  entity="appointments"
                  query={querySchema.parse({
                    filters: [
                      {
                        field: entity === "clients" ? "clientId" : "id",
                        op: "eq",
                        value: id,
                      },
                    ],
                  })}
                  onQuery={() => {}}
                  readonly
                />
                {entity === "clients" ? (
                  <EmbeddedTable
                    entity="payments"
                    query={querySchema.parse({
                      filters: [{ field: "clientId", op: "eq", value: id }],
                    })}
                    onQuery={() => {}}
                    onOpen={(pid: string) => onOpen("payments", pid)}
                    readonly
                  />
                ) : (
                  <section>
                    <h3>Valores alocados a este atendimento</h3>
                    {r.allocationDetails?.map((a: any) => (
                      <p key={a.paymentId}>
                        <button
                          className="text-link"
                          onClick={() => onOpen("payments", a.paymentId)}
                        >
                          Abrir recebimento
                        </button>{" "}
                        · alocado {brl(a.amount)} · reembolsado{" "}
                        {brl(a.refunded)} · líquido {brl(a.net)}
                        {a.voided ? " · estornado" : ""}
                      </p>
                    ))}
                  </section>
                )}
              </>
            )}
            {tab === "gallery" && (
              <Gallery
                clientId={entity === "clients" ? id : r.clientId}
                appointmentId={entity === "appointments" ? id : undefined}
              />
            )}
            {entity === "payments" && (
              <>
                <h3>Alocações e reembolsos</h3>
                {r.allocations.map((a: any) => (
                  <p key={a.id}>
                    <button
                      className="text-link"
                      onClick={() => onOpen("appointments", a.appointmentId)}
                    >
                      Abrir atendimento
                    </button>{" "}
                    · {brl(a.amount)} · reembolsado {brl(a.refunded)}
                  </p>
                ))}
                <form
                  className="panel inset"
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(() =>
                      api(`payments/${id}/refunds`, {
                        method: "POST",
                        body: JSON.stringify(refund),
                      }),
                    );
                  }}
                >
                  <h3>Registrar reembolso</h3>
                  <label>
                    Alocação
                    <select
                      value={refund.allocationId}
                      onChange={(e) =>
                        setRefund({ ...refund, allocationId: e.target.value })
                      }
                      required
                    >
                      <option value="">Selecione</option>
                      {r.allocations.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.appointmentId} · {brl(a.amount)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="form-grid">
                    <label>
                      Valor (R$)
                      <input
                        type="number"
                        step="0.01"
                        value={refund.amount}
                        onChange={(e) =>
                          setRefund({ ...refund, amount: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label>
                      Data
                      <input
                        type="date"
                        value={refund.refundedOn}
                        onChange={(e) =>
                          setRefund({ ...refund, refundedOn: e.target.value })
                        }
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Motivo
                    <input
                      minLength={4}
                      value={refund.reason}
                      onChange={(e) =>
                        setRefund({ ...refund, reason: e.target.value })
                      }
                      required
                    />
                  </label>
                  <Button>Registrar reembolso</Button>
                </form>
              </>
            )}
            {entity !== "appointments" && (
              <details className="archive">
                <summary>
                  {["payments", "expenses"].includes(entity)
                    ? "Estornar lançamento"
                    : "Arquivar cadastro"}
                </summary>
                <p>O histórico será preservado. Informe o motivo.</p>
                <input
                  aria-label="Motivo do arquivamento"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={4}
                />
                <Button
                  variant="destructive"
                  disabled={reason.length < 4}
                  onClick={() =>
                    action(async () => {
                      await api(`records/${entity}/${id}`, {
                        method: "DELETE",
                        body: JSON.stringify({ version: r.version, reason }),
                      });
                      onClose();
                    })
                  }
                >
                  Confirmar
                </Button>
              </details>
            )}
          </>
        )
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </Dialog>
  );
}
export function Gallery({
  clientId,
  appointmentId,
}: {
  clientId: string;
  appointmentId?: string;
}) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const photos = useQuery({
    queryKey: ["media", clientId, appointmentId],
    queryFn: () =>
      api(
        `media?clientId=${clientId}${appointmentId ? "&appointmentId=" + appointmentId : ""}`,
      ),
  });
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("clientId", clientId);
        if (appointmentId) body.append("appointmentId", appointmentId);
        await api("media", { method: "POST", body });
      }
      await cache.invalidateQueries({ queryKey: ["media"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="upload-zone">
        {busy
          ? "Salvando imagens…"
          : "Adicionar fotografias (JPEG, PNG ou WebP)"}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
        />
      </label>
      <p className="muted">
        Originais privados preservados no servidor. É necessário consentimento
        no cadastro da cliente.
      </p>
      {(error || photos.error) && (
        <p role="alert" className="error">
          {error || photos.error?.message}
        </p>
      )}
      <div className="gallery">
        {photos.data?.map((p: any) => (
          <figure key={p.id}>
            <a href={`/api/media/${p.id}`} target="_blank" rel="noreferrer">
              <img
                src={`/api/media/${p.id}?thumbnail=1`}
                alt={p.originalName}
              />
            </a>
            <figcaption>{p.originalName}</figcaption>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await api(`media/${p.id}`, { method: "DELETE" });
                  await cache.invalidateQueries({ queryKey: ["media"] });
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Excluir foto
            </Button>
          </figure>
        ))}
      </div>
      {!photos.data?.length && (
        <p className="empty">Nenhuma fotografia cadastrada.</p>
      )}
    </>
  );
}

function EmbeddedTable(props: any) {
  const [query, setQuery] = useState(props.query);
  return <DataTable {...props} query={query} onQuery={setQuery} />;
}
