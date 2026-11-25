"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addressDataOf, defaultSettings, formatAddress } from "@gferraz/shared";
import { api } from "./api";
import { Button } from "./ui/button";
import { AddressFields } from "./address-fields";
import { History } from "./history";
import { nonNegative } from "./ui/number";
import type { TravelFeeRow } from "@gferraz/shared";
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
      ...defaultSettings,
      ...data.settings,
      originAddressData: addressDataOf(
        data.settings.originAddressData,
        data.settings.originAddress,
      ),
    },
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
              {...nonNegative}
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
        <AddressFields
          legend="Endereço de partida (sua casa ou estúdio)"
          value={form.settings.originAddressData}
          onChange={(next) =>
            setForm({
              ...form,
              settings: {
                ...form.settings,
                originAddressData: next,
                originAddress: formatAddress(next),
              },
            })
          }
        />
        <TravelTable
          rows={form.settings.travelFeeTable}
          onChange={(travelFeeTable) =>
            setForm({ ...form, settings: { ...form.settings, travelFeeTable } })
          }
        />
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
          Tudo o que foi criado, alterado, excluído, exportado ou acessado, com
          o valor de antes e de depois.
        </p>
        <History filter />
      </section>
    </>
  );
}
/** Price list for travel: one row per round-trip distance range, one price per fuel. */
function TravelTable({
  rows,
  onChange,
}: {
  rows: TravelFeeRow[];
  onChange: (rows: TravelFeeRow[]) => void;
}) {
  const set = (i: number, patch: Partial<TravelFeeRow>) =>
    onChange(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  const sorted = [...rows].sort((a, b) => a.upToKm - b.upToKm);
  return (
    <fieldset className="travel-table">
      <legend>Tabela de deslocamento</legend>
      <p className="muted">
        Valor cobrado pela distância de ida e volta. Cada faixa vai do fim da
        anterior até o limite informado. O atendimento sugere o valor da coluna
        do combustível do carro cadastrado (etanol, se não houver carro).
      </p>
      {rows.length > 0 && (
        <div className="travel-table-rows">
          {rows.map((r, i) => {
            const prev = sorted[sorted.indexOf(r) - 1];
            return (
              <div className="item-row" key={i}>
                <label>
                  Até km (ida e volta)
                  <input
                    type="number"
                    step="1"
                    {...nonNegative}
                    value={r.upToKm || ""}
                    onChange={(e) =>
                      set(i, { upToKm: Math.trunc(Number(e.target.value)) })
                    }
                  />
                  <small>
                    {r.upToKm
                      ? prev
                        ? `de ${prev.upToKm + 1} a ${r.upToKm} km`
                        : `até ${r.upToKm} km`
                      : ""}
                  </small>
                </label>
                <label>
                  Etanol
                  <span className="money-input">
                    <span aria-hidden="true">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...nonNegative}
                      value={r.ethanol}
                      onChange={(e) => set(i, { ethanol: e.target.value })}
                    />
                  </span>
                </label>
                <label>
                  Gasolina
                  <span className="money-input">
                    <span aria-hidden="true">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      {...nonNegative}
                      value={r.gasoline}
                      onChange={(e) => set(i, { gasoline: e.target.value })}
                    />
                  </span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(rows.filter((_, j) => j !== i))}
                >
                  Remover
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const last = sorted.at(-1);
          onChange([
            ...rows,
            {
              upToKm: last ? last.upToKm + 10 : 20,
              ethanol: last?.ethanol ?? "0",
              gasoline: last?.gasoline ?? "0",
            },
          ]);
        }}
      >
        Adicionar faixa
      </Button>
    </fieldset>
  );
}
