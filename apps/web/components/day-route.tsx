"use client";
import { useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  MessageCircle,
  Navigation,
  Route as RouteIcon,
  TriangleAlert,
} from "lucide-react";
import { statusLabels } from "@gferraz/shared";
import { api, brl } from "./api";
import { Button } from "./ui/button";
import { nonNegative } from "./ui/number";

const zone = "America/Sao_Paulo";
const noon = (d: string) => new Date(d + "T12:00:00-03:00");
const time = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("pt-BR", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const longDate = (d: string) =>
  noon(d).toLocaleDateString("pt-BR", {
    timeZone: zone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
const shortDate = (d: string) =>
  noon(d)
    .toLocaleDateString("pt-BR", {
      timeZone: zone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    })
    .replace(".", "");
const shift = (d: string, days: number) =>
  new Date(noon(d).getTime() + days * 86400000).toLocaleDateString("en-CA", {
    timeZone: zone,
  });
const span = (min: number) =>
  min < 60
    ? `${min} min`
    : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
const km = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
function whatsapp(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11)
    return "https://wa.me/55" + digits;
  return digits.length >= 12 ? "https://wa.me/" + digits : null;
}
function alertText(stop: any, buffer: number) {
  const a = stop.alert;
  if (!a) return "";
  if (a.level === "late")
    return `Atraso previsto de ${span(a.minutes)}: chegada estimada às ${time(stop.arrival)}.`;
  if (a.level === "overlap")
    return `O atendimento anterior termina ${span(a.minutes)} depois do início deste.`;
  return a.estimated
    ? `Horário apertado: sobram ${span(a.minutes)} depois do trajeto (sua margem é de ${buffer} min).`
    : `Só ${span(a.minutes)} entre o fim do anterior e este, sem contar o trajeto.`;
}

export function DayRoute({
  date,
  onDate,
  onOpen,
  onSettings,
}: {
  date: string | null;
  onDate: (date: string | null) => void;
  onOpen: (appointmentId: string) => void;
  onSettings: () => void;
}) {
  const route = useQuery({
    queryKey: ["day-route", date],
    queryFn: () => api(`agenda/day${date ? "?date=" + date : ""}`),
    placeholderData: keepPreviousData,
  });
  const r = route.data;
  if (route.isLoading) return <p className="empty">Montando a rota do dia…</p>;
  if (route.error || !r)
    return (
      <p role="alert" className="error">
        {route.error?.message || "Não foi possível carregar a rota."}
      </p>
    );
  const s = r.summary;
  const relative =
    r.date === r.today
      ? "Hoje"
      : r.date === shift(r.today, 1)
        ? "Amanhã"
        : r.date < r.today
          ? "Dia anterior"
          : "Próximo dia de trabalho";
  return (
    <div className="day-route">
      <div className="dr-nav panel">
        <Button
          variant="outline"
          aria-label="Dia anterior"
          onClick={() => onDate(shift(r.date, -1))}
        >
          <ChevronLeft size={20} />
        </Button>
        <label>
          <span className="sr-only">Escolher outro dia</span>
          <input
            type="date"
            aria-label="Escolher outro dia"
            value={r.date}
            onChange={(e) => e.target.value && onDate(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          aria-label="Dia seguinte"
          onClick={() => onDate(shift(r.date, 1))}
        >
          <ChevronRight size={20} />
        </Button>
      </div>
      {r.days.length > 0 && (
        <nav className="dr-days" aria-label="Próximos dias com atendimento">
          {r.days.map((d: any) => (
            <button
              key={d.date}
              className={d.date === r.date ? "active" : ""}
              aria-current={d.date === r.date ? "date" : undefined}
              onClick={() => onDate(d.date)}
            >
              <strong>{d.date === r.today ? "hoje" : shortDate(d.date)}</strong>
              <span>
                {d.count} {d.count === 1 ? "atendimento" : "atendimentos"}
              </span>
            </button>
          ))}
        </nav>
      )}
      <section className="panel dr-summary">
        <p className="eyebrow">{relative.toUpperCase()}</p>
        <h2>{longDate(r.date)}</h2>
        {s.appointments === 0 ? (
          <div className="dr-empty">
            <p>Nenhum atendimento neste dia.</p>
            {r.nextDay && r.nextDay !== r.date && (
              <Button onClick={() => onDate(r.nextDay)}>
                Ir para {longDate(r.nextDay)}
              </Button>
            )}
          </div>
        ) : (
          <>
            <dl className="dr-stats">
              <div className="dr-stat-main">
                <dt>Sair de casa</dt>
                <dd>{s.leaveAt ? time(s.leaveAt) : "—"}</dd>
              </div>
              <div>
                <dt>Atendimentos</dt>
                <dd>
                  {s.appointments}
                  {s.stops !== s.appointments && (
                    <small>
                      {" "}
                      em {s.stops} {s.stops === 1 ? "parada" : "paradas"}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>Primeiro horário</dt>
                <dd>{time(s.firstStart)}</dd>
              </div>
              <div>
                <dt>Término</dt>
                <dd>{time(s.lastEnd)}</dd>
              </div>
              <div>
                <dt>De volta em casa</dt>
                <dd>{s.homeAt ? time(s.homeAt) : "—"}</dd>
              </div>
              <div>
                <dt>Trajeto do dia</dt>
                <dd>
                  {s.travelMinutes ? (
                    <>
                      {km(s.distanceKm)}
                      <small> · {span(s.travelMinutes)}</small>
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>A receber no dia</dt>
                <dd>{brl(s.pending)}</dd>
              </div>
            </dl>
            {!r.origin && (
              <p className="dr-warning">
                <TriangleAlert size={18} />
                <span>
                  Informe o seu endereço de partida para calcular a saída e a
                  volta para casa.{" "}
                  <button className="text-link" onClick={onSettings}>
                    Abrir configurações
                  </button>
                </span>
              </p>
            )}
            {s.alerts > 0 && (
              <p className="dr-warning">
                <TriangleAlert size={18} />
                <span>
                  {s.alerts === 1
                    ? "Um horário merece atenção"
                    : `${s.alerts} horários merecem atenção`}
                  : veja os avisos na linha do tempo.
                </span>
              </p>
            )}
            {s.missingAddress > 0 && (
              <p className="dr-warning">
                <TriangleAlert size={18} />
                <span>
                  {s.missingAddress === 1
                    ? "Um atendimento está sem endereço"
                    : `${s.missingAddress} atendimentos estão sem endereço`}{" "}
                  e fica fora do trajeto. Toque nele para completar.
                </span>
              </p>
            )}
            {s.legsWithoutEstimate > 0 && (
              <p className="dr-hint">
                {s.legsWithoutEstimate === 1
                  ? "Falta o tempo de um trecho."
                  : `Falta o tempo de ${s.legsWithoutEstimate} trechos.`}{" "}
                Abra o trecho no Google Maps, veja o tempo e informe aqui: ele
                fica guardado para as próximas vezes.
              </p>
            )}
            <div className="dr-actions">
              {r.mapsLinks.map((l: any, i: number) => (
                <a
                  key={l.url}
                  className={`button ${i ? "outline" : "primary"}`}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <RouteIcon size={18} />
                  {r.mapsLinks.length === 1
                    ? "Abrir rota completa no Google Maps"
                    : `Rota no Google Maps · parte ${i + 1} de ${r.mapsLinks.length}`}
                </a>
              ))}
            </div>
            {r.mapsLinks.length > 1 && (
              <p className="dr-hint">
                O Google Maps aceita poucas paradas por link no celular, por
                isso a rota foi dividida em partes na ordem do dia.
              </p>
            )}
          </>
        )}
      </section>
      {s.appointments > 0 && (
        <ol className="dr-timeline">
          {r.origin && (
            <li className="dr-point">
              <span className="dr-dot">
                <Home size={16} />
              </span>
              <div>
                <strong>
                  {s.leaveAt ? `Sair de casa às ${time(s.leaveAt)}` : "Casa"}
                </strong>
                <p>{r.origin}</p>
              </div>
            </li>
          )}
          {r.stops.map((stop: any, i: number) => (
            <Stop
              key={stop.key}
              stop={stop}
              index={i}
              buffer={r.bufferMinutes}
              onOpen={onOpen}
            />
          ))}
          {r.returnLeg && (
            <>
              <Leg leg={r.returnLeg} />
              <li className="dr-point">
                <span className="dr-dot">
                  <Home size={16} />
                </span>
                <div>
                  <strong>
                    {s.homeAt
                      ? `Em casa às ${time(s.homeAt)}`
                      : "Volta para casa"}
                  </strong>
                </div>
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  );
}

function Stop({
  stop,
  index,
  buffer,
  onOpen,
}: {
  stop: any;
  index: number;
  buffer: number;
  onOpen: (id: string) => void;
}) {
  const people = stop.appointments.length;
  return (
    <>
      <Leg leg={stop.leg} departBy={index > 0 ? stop.departBy : null} />
      <li
        className={`dr-stop ${stop.alert ? "has-alert " + stop.alert.level : ""}`}
      >
        <span className="dr-dot">{index + 1}</span>
        <article className="panel">
          <header>
            <p className="dr-time">
              {time(stop.startsAt)} <span>até {time(stop.endsAt)}</span>
            </p>
            {people > 1 && <span className="badge">{people} pessoas</span>}
          </header>
          <p className="dr-address">
            <MapPin size={16} />
            {stop.address || "Endereço não informado"}
          </p>
          {stop.alert && (
            <p className={`dr-alert ${stop.alert.level}`} role="alert">
              <TriangleAlert size={18} />
              {alertText(stop, buffer)}
            </p>
          )}
          <ul className="dr-people">
            {stop.appointments.map((a: any) => {
              const wa = whatsapp(a.phone);
              return (
                <li key={a.id}>
                  <button
                    className="dr-person"
                    onClick={() => onOpen(a.id)}
                    aria-label={`Abrir atendimento de ${a.clientName}`}
                  >
                    <strong>{a.clientName}</strong>
                    <span>
                      {people > 1 && time(a.startsAt) + " · "}
                      {a.serviceNames || a.title}
                    </span>
                    <span className="dr-tags">
                      {a.status !== "confirmed" && (
                        <span
                          className={`badge ${a.status === "completed" ? "success" : ""}`}
                        >
                          {statusLabels[a.status] || a.status}
                        </span>
                      )}
                      <span
                        className={`badge ${Number(a.pending) > 0 ? "" : "success"}`}
                      >
                        {Number(a.pending) > 0
                          ? `A receber ${brl(a.pending)}`
                          : "Pago"}
                      </span>
                    </span>
                  </button>
                  {wa && (
                    <a
                      className="button outline icon"
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Conversar com ${a.clientName} no WhatsApp`}
                    >
                      <MessageCircle size={20} />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          {stop.navigateUrl && (
            <a
              className="button primary dr-go"
              href={stop.navigateUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={18} /> Navegar até aqui
            </a>
          )}
        </article>
      </li>
    </>
  );
}

function Leg({ leg, departBy }: { leg: any; departBy?: string | null }) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [minutes, setMinutes] = useState(String(leg.minutes ?? ""));
  const [distance, setDistance] = useState(
    leg.distanceKm ? String(Number(leg.distanceKm)) : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!leg.routable)
    return (
      <li className="dr-leg">
        <span className="dr-dot small">
          <Car size={14} />
        </span>
        <p className="muted">Trecho sem endereço: não é possível traçar.</p>
      </li>
    );
  return (
    <li className="dr-leg">
      <span className="dr-dot small">
        <Car size={14} />
      </span>
      <div>
        <p>
          {leg.minutes === null ? (
            <span className="muted">Tempo do trecho não informado</span>
          ) : (
            <strong>
              {span(leg.minutes)} · {km(leg.distanceKm)}
            </strong>
          )}
          {departBy && <span> · sair até {time(departBy)}</span>}
          {leg.source === "trip" && (
            <span className="muted"> · do trecho registrado</span>
          )}
        </p>
        <div className="dr-leg-actions">
          <a href={leg.mapsUrl} target="_blank" rel="noreferrer">
            Ver trecho no Google Maps ↗
          </a>
          <button className="text-link" onClick={() => setEditing(!editing)}>
            {leg.minutes === null ? "Informar tempo" : "Corrigir tempo"}
          </button>
        </div>
        {editing && (
          <form
            className="dr-leg-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("agenda/legs", {
                  method: "PUT",
                  body: JSON.stringify({
                    origin: leg.from,
                    destination: leg.to,
                    minutes: Number(minutes),
                    distanceKm: String(
                      Number(distance.replace(",", ".")).toFixed(2),
                    ),
                  }),
                });
                await cache.invalidateQueries({ queryKey: ["day-route"] });
                setEditing(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Tempo (min)
              <input
                required
                type="number"
                inputMode="numeric"
                {...nonNegative}
                max="1440"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
            <label>
              Distância (km)
              <input
                required
                inputMode="decimal"
                pattern="\d{1,4}([.,]\d{1,2})?"
                title="Use números, por exemplo 12,5"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </label>
            <Button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </li>
  );
}
