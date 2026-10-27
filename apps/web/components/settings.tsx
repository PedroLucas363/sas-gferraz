"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { Button } from "./ui/button";
export function Settings() {
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api("settings"),
  });
  return settings.isLoading ? (
    <p>Carregando…</p>
  ) : settings.error ? (
    <p className="error">{settings.error.message}</p>
  ) : (
    <SettingsForm key={JSON.stringify(settings.data)} data={settings.data} />
  );
}
function SettingsForm({ data }: { data: any }) {
  const cache = useQueryClient();
  const [form, setForm] = useState({
    name: data.name,
    settings: {
      beige: "#F9EAD2",
      green: "#546B57",
      originAddress: "",
      bufferMinutes: 15,
      dashboardIndicators: [],
      ...data.settings,
    },
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const audit = useQuery({ queryKey: ["audit"], queryFn: () => api("audit") });
  return (
    <>
      <form
        className="panel inset"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api("settings", {
              method: "PATCH",
              body: JSON.stringify(form),
            });
            setMessage("Configurações salvas");
            await cache.invalidateQueries();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <h2>Seu negócio, do seu jeito</h2>
        <div className="form-grid">
          <label>
            Nome da empresa
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Endereço de partida
            <input
              value={form.settings.originAddress}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, originAddress: e.target.value },
                })
              }
            />
          </label>
          <label>
            Verde
            <input
              type="color"
              value={form.settings.green}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, green: e.target.value },
                })
              }
            />
          </label>
          <label>
            Bege
            <input
              type="color"
              value={form.settings.beige}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, beige: e.target.value },
                })
              }
            />
          </label>
          <label>
            Margem de segurança entre atendimentos (min)
            <input
              type="number"
              min="0"
              max="240"
              value={form.settings.bufferMinutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: {
                    ...form.settings,
                    bufferMinutes: Number(e.target.value),
                  },
                })
              }
            />
          </label>
        </div>
        <h3>Indicadores no dashboard</h3>
        <p className="muted">Sem seleção, todos os indicadores são exibidos.</p>
        <div className="column-picker">
          {Object.entries({
            revenue: "Faturamento",
            received: "Recebimentos",
            pending: "A receber",
            overdue: "Vencidos",
            expenses: "Despesas",
            result: "Resultado",
            margin: "Margem",
            clients: "Clientes",
            appointments: "Atendimentos",
            travel: "Deslocamento",
            ticket: "Ticket médio",
            today: "Atendimentos de hoje",
            upcoming: "Próximos atendimentos",
          }).map(([key, label]) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={form.settings.dashboardIndicators.includes(key)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    settings: {
                      ...form.settings,
                      dashboardIndicators: e.target.checked
                        ? [...form.settings.dashboardIndicators, key]
                        : form.settings.dashboardIndicators.filter(
                            (x: string) => x !== key,
                          ),
                    },
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <Button>Salvar configurações</Button>
        {message && <p className="notice">{message}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
      <section className="panel inset">
        <h2>Dados e integridade</h2>
        <p>
          Exporte os registros da empresa. As fotografias originais devem ser
          incluídas separadamente no backup do armazenamento local.
        </p>
        <div className="tools">
          <a href="/api/export-all" className="button outline">
            Exportar dados JSON
          </a>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const r = await api("media/integrity");
                setMessage(
                  `${r.checked} imagens verificadas. Arquivos ausentes: ${r.missing.length}. ${r.missing.map((m: any) => m.id).join(", ")}`,
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Verificar arquivos
          </Button>
        </div>
      </section>
      <section className="panel inset">
        <h2>Histórico de alterações</h2>
        <p className="muted">
          Últimas 200 operações. O registro completo é incluído na exportação.
        </p>
        {audit.data?.map((a: any) => (
          <details key={a.id}>
            <summary>
              {new Date(a.createdAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · {a.entity} · {a.action}
            </summary>
            <pre>
              {JSON.stringify({ before: a.before, after: a.after }, null, 2)}
            </pre>
          </details>
        ))}
      </section>
    </>
  );
}
