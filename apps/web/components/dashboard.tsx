"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Query, querySchema, Entity } from "@gferraz/shared";
import { api, queryString, brl } from "./api";
import { DataTable } from "./data-table";
import { Button } from "./ui/button";
import { ArrowUpRight } from "lucide-react";
export function Dashboard({
  query,
  onQuery,
  onOpen,
  settings,
}: {
  query: Query;
  onQuery: (q: Query) => void;
  onOpen: (e: Entity, id: string) => void;
  settings?: any;
}) {
  const [mode, setMode] = useState("accrual");
  const [metric, setMetric] = useState<string | null>(null);
  const data = useQuery({
    queryKey: ["dashboard", query, mode],
    queryFn: () => api(`dashboard?q=${queryString(query)}&mode=${mode}`),
  });
  const current = data.data?.metrics.find((m: any) => m.key === metric);
  const update = (v: Partial<Query>) =>
    onQuery(querySchema.parse({ ...query, ...v, page: 0 }));
  return (
    <>
      <div className="period-bar panel">
        <label>
          De
          <input
            aria-label="Período inicial"
            type="date"
            value={query.from || ""}
            onChange={(e) => update({ from: e.target.value || undefined })}
          />
        </label>
        <label>
          Até
          <input
            aria-label="Período final"
            type="date"
            value={query.to || ""}
            onChange={(e) => update({ to: e.target.value || undefined })}
          />
        </label>
        <label>
          Pesquisar
          <input
            placeholder="Cliente ou informação…"
            value={query.search}
            onChange={(e) => update({ search: e.target.value })}
          />
        </label>
        <label>
          Regime do resultado
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="accrual">Competência</option>
            <option value="cash">Caixa</option>
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => onQuery(querySchema.parse({}))}
        >
          Todo o histórico
        </Button>
      </div>
      {data.error && (
        <p role="alert" className="error">
          {data.error.message}
        </p>
      )}
      {data.isLoading ? (
        <p className="empty">Calculando indicadores…</p>
      ) : (
        <>
          <div className="metric-grid">
            {data.data?.metrics
              .filter(
                (m: any) =>
                  !settings?.dashboardIndicators?.length ||
                  settings.dashboardIndicators.includes(m.key),
              )
              .map((m: any) => (
                <button
                  className={`metric ${metric === m.key ? "selected" : ""}`}
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                >
                  <span>
                    {m.label}
                    <ArrowUpRight size={17} />
                  </span>
                  <strong>
                    {m.format === "money"
                      ? brl(m.value)
                      : m.value + (m.format === "percent" ? "%" : "")}
                  </strong>
                  <small>Ver registros que compõem o valor</small>
                </button>
              ))}
          </div>
          <section className="panel chart">
            <div className="section-heading">
              <div>
                <h2>Seu negócio ao longo do tempo</h2>
                <p>
                  Valores cadastrados, por mês. Clique nas barras para consultar
                  a origem.
                </p>
              </div>
            </div>
            {data.data?.evolution.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.data.evolution.map((r: any) => ({
                    ...r,
                    revenue: Number(r.revenue),
                    received: Number(r.received),
                    expenses: Number(r.expenses),
                  }))}
                >
                  <CartesianGrid vertical={false} stroke="#eee8de" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${v / 1000} mil`} width={52} />
                  <Tooltip formatter={(v) => brl(v)} />
                  <Legend />
                  {[
                    ["revenue", "Faturamento", "#546B57"],
                    ["received", "Recebimentos", "#B5C1A7"],
                    ["expenses", "Despesas (competência)", "#C99F83"],
                  ].map(([key, label, color]) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={label}
                      fill={color}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(d: any) => {
                        update({ from: d.from, to: d.to });
                        if (key === "expenses") setMode("accrual");
                        setMetric(key);
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                <h3>O próximo capítulo começa aqui</h3>
                <p>
                  Seus gráficos serão preenchidos conforme os atendimentos e
                  lançamentos forem cadastrados.
                </p>
              </div>
            )}
          </section>
          <p className="rules">{data.data?.rules}</p>
          {current && (
            <section className="drill">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ORIGEM DO INDICADOR</p>
                  <h2>
                    {current.label} ·{" "}
                    {current.format === "money"
                      ? brl(current.value)
                      : current.value +
                        (current.format === "percent" ? "%" : "")}
                  </h2>
                </div>
                <Button variant="outline" onClick={() => setMetric(null)}>
                  Fechar detalhes
                </Button>
              </div>
              {current.key === "ticket" && (
                <p>
                  Faturamento dividido pela quantidade de atendimentos
                  concluídos no período.
                </p>
              )}
              {current.key === "margin" && (
                <p>
                  Resultado ÷ receita do regime selecionado × 100. Com receita
                  zero, a margem é exibida como zero.
                </p>
              )}
              {current.sources.map((s: any, i: number) => (
                <section key={`${s.label}-${i}`}>
                  <h3>
                    {s.sign < 0 ? "−" : "+"} {s.label} ·{" "}
                    {s.measure === "clients"
                      ? "Clientes distintas"
                      : s.measure === "count"
                        ? "Quantidade"
                        : "Subtotal"}
                    :{" "}
                    {s.measure === "clients" || s.measure === "count"
                      ? Number(s.subtotal)
                      : brl(s.subtotal)}
                  </h3>
                  <DrillTable
                    key={JSON.stringify(s.query)}
                    source={s}
                    onOpen={onOpen}
                  />
                </section>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

function DrillTable({
  source,
  onOpen,
}: {
  source: any;
  onOpen: (e: Entity, id: string) => void;
}) {
  const [query, setQuery] = useState(querySchema.parse(source.query));
  return (
    <DataTable
      entity={source.entity}
      query={query}
      onQuery={setQuery}
      onOpen={(id) => onOpen(source.entity, id)}
      readonly
    />
  );
}
