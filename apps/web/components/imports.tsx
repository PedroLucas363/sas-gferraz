"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, brl, day } from "./api";
import { Button } from "./ui/button";
export function Imports() {
  const cache = useQueryClient();
  const [batch, setBatch] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("appointment");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [page, setPage] = useState(0);
  const batches = useQuery({
    queryKey: ["imports"],
    queryFn: () => api("imports"),
  });
  function editMapping(key: string, field: string, value: string) {
    setBatch((prev: any) => ({
      ...prev,
      rows: prev.rows.map((row: any) =>
        row.key === key
          ? { ...row, mapped: { ...row.mapped, [field]: value } }
          : row,
      ),
    }));
    setSelected((prev) =>
      prev[key] ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev,
    );
  }
  async function preview(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const b = await api("imports/preview", { method: "POST", body });
      setBatch(b);
      setSelected({});
      setPage(0);
      await cache.invalidateQueries({ queryKey: ["imports"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    setError("");
    try {
      const r = await api(`imports/${batch.id}/commit`, {
        method: "POST",
        body: JSON.stringify({
          rows: Object.entries(selected).map(([key, mapped]) => ({
            key,
            mapped,
            reviewed: true,
          })),
        }),
      });
      setBatch(r.batch);
      setResults(r.results);
      setSelected({});
      await cache.invalidateQueries();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    name: "Cliente",
    phone: "Telefone",
    date: "Data",
    time: "Horário",
    duration: "Duração prevista (min)",
    total: "Contratado",
    service: "Serviço original",
    status: "Situação (confirmed / completed…)",
    clientId: "ID da cliente existente (se necessário)",
    amount: "Valor",
    method: "Forma",
    appointmentId: "ID do atendimento para alocação",
    description: "Descrição",
    category: "Categoria",
    dueDate: "Vencimento",
    paidOn: "Pagamento efetivo",
    eventDate: "Data do evento (referência)",
    sourceStatus: "Situação na origem",
  };
  const rows = batch?.rows.filter((r: any) => r.kind === kind) || [];
  return (
    <>
      <section className="panel import-intro">
        <div>
          <p className="eyebrow">MIGRAÇÃO COM RASTREABILIDADE</p>
          <h2>Do histórico para o seu próximo passo</h2>
          <p>
            Envie a planilha, revise as correspondências e confirme as linhas
            que deseja gravar. A prévia não altera os cadastros.
          </p>
        </div>
        <label className="button primary">
          {busy ? "Processando…" : "Analisar XLSX ou CSV"}
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.csv"
            disabled={busy}
            onChange={(e) => preview(e.target.files?.[0])}
          />
        </label>
      </section>
      {!!batches.data?.length && (
        <label>
          Retomar uma análise
          <select
            value={batch?.id || ""}
            onChange={async (e) => {
              if (e.target.value) {
                try {
                  setBatch(await api(`imports/${e.target.value}`));
                  setSelected({});
                } catch (e) {
                  setError((e as Error).message);
                }
              }
            }}
          >
            <option value="">Selecione</option>
            {batches.data.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.fileName} · {day(b.createdAt)}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {batch && (
        <>
          <section className="panel inset">
            <h2>{batch.fileName}</h2>
            <div className="totals">
              {Object.entries(batch.report.byKind).map(([k, v]) => (
                <span key={k}>
                  {
                    {
                      appointment: "Atendimentos",
                      payment: "Recebimentos",
                      expense: "Despesas",
                      review: "Referências",
                    }[k]
                  }
                  : <strong>{String(v)}</strong>
                </span>
              ))}
            </div>
            <p>
              Valores reconhecidos na origem: contratos{" "}
              {brl(batch.report.sourceTotals.appointment)} · recebimentos{" "}
              {brl(batch.report.sourceTotals.payment)} · despesas{" "}
              {brl(batch.report.sourceTotals.expense)}.
            </p>
            <p>
              {batch.receipts.length} linhas já gravadas. As demais permanecem
              preservadas para revisão.
            </p>
            <p className="muted">
              Comparar esses totais com as linhas importadas, ignoradas e
              pendentes é obrigatório antes de encerrar a migração. Nenhum
              pagamento é criado a partir do valor de um serviço.
            </p>
            <details>
              <summary>Abas e estrutura detectada</summary>
              {batch.report.sheets.map((s: any) => (
                <p key={s.name}>
                  {s.name}: {s.kind} · cabeçalho {s.header || "não detectado"} ·{" "}
                  {s.rows} linhas preenchidas
                </p>
              ))}
            </details>
          </section>
          <div className="section-heading">
            <div className="tabs">
              {Object.entries({
                appointment: "Atendimentos",
                payment: "Recebimentos",
                expense: "Despesas",
                review: "Referências",
              }).map(([k, v]) => (
                <button
                  key={k}
                  className={kind === k ? "active" : ""}
                  onClick={() => {
                    setKind(k);
                    setPage(0);
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button
              disabled={busy || !Object.keys(selected).length}
              onClick={commit}
            >
              Gravar {Object.keys(selected).length} linhas revisadas
            </Button>
          </div>
          <p className="muted">
            Consolidar nomes iguais requer conferir a identidade. Atendimentos
            importados começam como confirmados; marque concluído somente após
            validar a prestação. Cole o ID de um atendimento para vincular um
            recebimento.
          </p>
          {rows.slice(page * 10, (page + 1) * 10).map((r: any) => (
            <section className="panel import-row" key={r.key}>
              <div className="section-heading">
                <strong>
                  {r.sheet} · linha {r.row}
                </strong>
                {r.imported ? (
                  <span className="badge success">Importado</span>
                ) : (
                  r.kind !== "review" && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!selected[r.key]}
                        onChange={(e) =>
                          setSelected((prev) => {
                            const next = { ...prev };
                            if (e.target.checked) next[r.key] = { ...r.mapped };
                            else delete next[r.key];
                            return next;
                          })
                        }
                      />
                      Revisei esta linha
                    </label>
                  )
                )}
              </div>
              <p className="warning">{r.issues.join(" · ")}</p>
              {r.kind !== "review" && (
                <div className="form-grid">
                  {Object.entries(r.mapped).map(([k, v]) => (
                    <label key={k}>
                      {labels[k] || k}
                      <input
                        value={String(
                          (selected[r.key] || r.mapped)[k] ?? v ?? "",
                        )}
                        disabled={r.imported}
                        onChange={(e) => editMapping(r.key, k, e.target.value)}
                      />
                    </label>
                  ))}
                  {r.kind === "appointment" && (
                    <label>
                      ID da cliente existente (se necessário)
                      <input
                        disabled={r.imported}
                        value={(selected[r.key] || r.mapped).clientId || ""}
                        onChange={(e) =>
                          editMapping(r.key, "clientId", e.target.value)
                        }
                      />
                    </label>
                  )}
                </div>
              )}
              <details>
                <summary>Dados originais preservados</summary>
                <pre>{JSON.stringify(r.raw, null, 2)}</pre>
              </details>
            </section>
          ))}
          <div className="table-footer">
            <Button
              variant="outline"
              disabled={!page}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span>
              Página {page + 1} · {rows.length} linhas
            </span>
            <Button
              variant="outline"
              disabled={(page + 1) * 10 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
          {!!results.length && (
            <section className="panel inset">
              <h3>Resultado da gravação</h3>
              {results.map((r: any) => (
                <p key={r.key}>
                  {r.key}:{" "}
                  {
                    (
                      {
                        imported: "Importado",
                        ignored: "Ignorado (duplicado)",
                        pending: "Pendente",
                      } as Record<string, string>
                    )[r.status]
                  }{" "}
                  {r.reason} {r.recordId && `· ID ${r.recordId}`}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
