"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { querySchema, Query } from "@gferraz/shared";
import { api, allRows, today, day, brl } from "./api";
import { DataTable } from "./data-table";
import { Button } from "./ui/button";
import { nonNegative } from "./ui/number";
export function Agenda({
  onOpen,
  onRoute,
}: {
  onOpen: (id: string) => void;
  onRoute: (date: string) => void;
}) {
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
    queryKey: ["day-route", date],
    queryFn: () => api(`agenda/day?date=${date}`),
  });
  const appointments: any[] = (route.data?.stops || []).flatMap(
    (s: any) => s.appointments,
  );
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
      <section className="panel inset route-teaser">
        <div>
          <p className="eyebrow">ROTA DO DIA</p>
          <h2>{day(date)}</h2>
          <p className="muted">
            {appointments.length
              ? `${appointments.length} ${appointments.length === 1 ? "atendimento" : "atendimentos"} na rota deste dia.`
              : "Nenhum atendimento na rota deste dia."}
          </p>
        </div>
        <Button onClick={() => onRoute(date)}>Ver rota deste dia</Button>
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
        <h3>Registrar trecho realizado (custo do veículo)</h3>
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
              {appointments.map((a: any) => (
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
                {...nonNegative}
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
