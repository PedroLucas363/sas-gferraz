"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { querySchema, Query } from "@gferraz/shared";
import { api, allRows, today, day, brl } from "./api";
import { DataTable } from "./data-table";
import { Button } from "./ui/button";
export function Agenda({ onOpen }: { onOpen: (id: string) => void }) {
  const cache = useQueryClient();
  const [date, setDate] = useState(today());
  const [view, setView] = useState("day");
  const [customQuery, setCustomQuery] = useState<Query | null>(null);
  const [error, setError] = useState("");
  const [trip, setTrip] = useState({
    appointmentId: "",
    vehicleId: "",
    distanceKm: "0",
    minutes: 0,
    parking: "0",
    toll: "0",
  });
  const [notice, setNotice] = useState("");
  const from = view === "month" ? date.slice(0, 7) + "-01" : date;
  const end = new Date(date + "T12:00:00Z");
  if (view === "week") end.setUTCDate(end.getUTCDate() + 6);
  if (view === "month") {
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
  }
  const to = view === "day" ? date : end.toISOString().slice(0, 10);
  const route = useQuery({
    queryKey: ["route", date],
    queryFn: () => api(`agenda/route?day=${date}`),
  });
  const vehicles = useQuery({
    queryKey: ["vehicles-lookup"],
    queryFn: () => allRows("vehicles"),
  });
  return (
    <>
      <div className="panel period-bar">
        <label>
          Data
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setCustomQuery(null);
            }}
          />
        </label>
        <label>
          Visualização
          <select
            value={view}
            onChange={(e) => {
              setView(e.target.value);
              setCustomQuery(null);
            }}
          >
            <option value="day">Dia</option>
            <option value="week">7 dias a partir da data</option>
            <option value="month">Mês</option>
          </select>
        </label>
      </div>
      <DataTable
        entity="appointments"
        query={
          customQuery ||
          querySchema.parse({ from, to, sort: [{ id: "date", desc: false }] })
        }
        onQuery={setCustomQuery}
        onOpen={onOpen}
      />
      <section className="panel inset">
        <p className="eyebrow">ROTEIRO DO DIA</p>
        <h2>{day(date)}</h2>
        <p>
          Origem:{" "}
          {route.data?.origin ||
            "Configure seu endereço de partida em Configurações."}
        </p>
        <p className="muted">
          {route.data?.notice} Margem de segurança:{" "}
          {route.data?.bufferMinutes || 15} min.
        </p>
        {route.error && <p className="error">{route.error.message}</p>}
        {!route.data?.rows.length && (
          <p className="empty">Nenhum atendimento confirmado neste dia.</p>
        )}
        {route.data?.rows.map((a: any, i: number) => (
          <article className="route-stop" key={a.id}>
            <div className="stop-number">{i + 1}</div>
            <div>
              <button className="text-link" onClick={() => onOpen(a.id)}>
                <h3>
                  {a.clientName} ·{" "}
                  {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </h3>
              </button>
              <p>
                {a.title} · {a.address || "Endereço ausente"}
              </p>
              <p>
                {a.minutes === null
                  ? "Deslocamento indisponível — informe uma estimativa manual."
                  : `${a.minutes} min · ${a.distanceKm} km · saída recomendada ${new Date(a.departure).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`}
              </p>
              {a.conflict && (
                <p className="error">
                  Conflito de horários ou risco de atraso em relação ao
                  atendimento anterior.
                </p>
              )}
              {a.address && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(i ? route.data.rows[i - 1].address : route.data.origin)}&destination=${encodeURIComponent(a.address)}`}
                >
                  Abrir trajeto no aplicativo de mapas ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </section>
      <form
        className="panel inset"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            const r = await api("trips", {
              method: "POST",
              body: JSON.stringify(trip),
            });
            setNotice(
              `Trecho registrado. Custo estimado ${brl(r.estimatedCost)}. Nenhuma despesa foi criada.`,
            );
            await cache.invalidateQueries();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <h3>Registrar trecho e estimativa manual</h3>
        <p className="muted">
          Distância total do trecho informado, sem duplicar ida e volta. O tempo
          corresponde ao deslocamento até o atendimento selecionado.
        </p>
        <div className="form-grid">
          <label>
            Atendimento
            <select
              required
              value={trip.appointmentId}
              onChange={(e) =>
                setTrip({ ...trip, appointmentId: e.target.value })
              }
            >
              <option value="">Selecione</option>
              {route.data?.rows.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.clientName} · {a.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Veículo
            <select
              required
              value={trip.vehicleId}
              onChange={(e) => setTrip({ ...trip, vehicleId: e.target.value })}
            >
              <option value="">Selecione</option>
              {vehicles.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {[
            ["distanceKm", "Distância (km)"],
            ["minutes", "Tempo (min)"],
            ["parking", "Estacionamento (R$)"],
            ["toll", "Pedágio (R$)"],
          ].map(([k, l]) => (
            <label key={k}>
              {l}
              <input
                required
                type="number"
                step={k === "minutes" ? "1" : "0.01"}
                min="0"
                value={(trip as any)[k]}
                onChange={(e) =>
                  setTrip({
                    ...trip,
                    [k]:
                      k === "minutes" ? Number(e.target.value) : e.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
        <Button>Salvar trecho</Button>
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
      </form>
    </>
  );
}
