import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressKey,
  buildDayRoute,
  legKey,
  mapsDirUrl,
  mapsRouteLinks,
  upcomingDays,
  LegEstimate,
  RouteAppointment,
} from "../apps/api/src/route";
import { lookupCep, normalizeCep } from "../apps/api/src/cep";
import {
  addressDataOf,
  clientSchema,
  formatAddress,
} from "../packages/shared/src";

const home = "Rua da Casa, 10, Centro, Campinas - SP";
const at = (hhmm: string) => new Date(`2026-11-21T${hhmm}:00-03:00`);
const hhmm = (d: Date | null) =>
  d
    ? d.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
let n = 0;
const appointment = (
  start: string,
  address: string,
  duration = 60,
  extra: Partial<RouteAppointment> = {},
): RouteAppointment => ({
  id: `a${++n}`,
  clientId: "c",
  clientName: `Cliente ${n}`,
  phone: "",
  title: "Atendimento",
  serviceNames: "Make Social",
  startsAt: at(start),
  duration,
  status: "confirmed",
  address,
  total: "180.00",
  paid: "0.00",
  pending: "180.00",
  ...extra,
});
const manual = (minutes: number, km: string): LegEstimate => ({
  minutes,
  distanceKm: km,
  source: "manual",
});

test("endereços equivalentes têm a mesma chave", () => {
  assert.equal(
    addressKey("  Rua São João, 100 - Apto 4 "),
    addressKey("rua sao joao 100 apto 4"),
  );
  assert.equal(addressKey(""), "");
});

test("rota do dia: saída, chegada, término, volta e totais vêm só das estimativas informadas", () => {
  const a = "Av. Brasil, 500, Campinas - SP",
    b = "Rua das Flores, 20, Valinhos - SP";
  const route = buildDayRoute({
    origin: home,
    bufferMinutes: 15,
    appointments: [appointment("11:30", b, 90), appointment("09:00", a, 60)],
    legs: new Map([
      [legKey(home, a), manual(25, "12.5")],
      [legKey(a, b), manual(30, "18")],
      // Only the opposite direction was informed for the way back.
      [legKey(home, b), manual(40, "22.3")],
    ]),
  });
  assert.deepEqual(
    route.stops.map((s) => s.address),
    [a, b],
  );
  assert.equal(hhmm(route.summary.leaveAt), "08:20"); // 09:00 - 25 min - 15 min
  assert.equal(hhmm(route.stops[1].arrival), "10:30"); // 10:00 + 30 min
  assert.equal(route.stops[1].slackMinutes, 60);
  assert.equal(hhmm(route.stops[1].departBy), "10:45");
  assert.equal(route.stops[1].alert, null);
  assert.equal(hhmm(route.summary.lastEnd), "13:00");
  assert.equal(hhmm(route.summary.homeAt), "13:40");
  assert.equal(route.summary.travelMinutes, 95);
  assert.equal(route.summary.distanceKm, "52.8");
  assert.equal(route.summary.legsWithoutEstimate, 0);
  assert.equal(route.mapsLinks.length, 1);
});

test("alertas: atraso, horário apertado e sobreposição sem estimativa", () => {
  const a = "Rua A, 1",
    b = "Rua B, 2",
    c = "Rua C, 3",
    d = "Rua D, 4";
  const route = buildDayRoute({
    origin: home,
    bufferMinutes: 15,
    appointments: [
      appointment("09:00", a, 60),
      appointment("10:20", b, 60), // 40 min de trajeto: chega 10:40
      appointment("11:50", c, 60), // 20 min de trajeto: sobram 10 min
      appointment("12:30", d, 60), // sem estimativa e começa antes do fim do anterior
    ],
    legs: new Map([
      [legKey(a, b), manual(40, "30")],
      [legKey(b, c), manual(20, "10")],
    ]),
  });
  assert.deepEqual(route.stops[1].alert, {
    level: "late",
    minutes: 20,
    estimated: true,
  });
  assert.deepEqual(route.stops[2].alert, {
    level: "tight",
    minutes: 10,
    estimated: true,
  });
  assert.deepEqual(route.stops[3].alert, {
    level: "overlap",
    minutes: 20,
    estimated: false,
  });
  assert.equal(route.summary.alerts, 3);
  // Home → A, C → D and D → home have addresses but no informed time.
  assert.equal(route.summary.legsWithoutEstimate, 3);
  assert.equal(route.summary.leaveAt, null);
  assert.equal(route.summary.homeAt, null);
});

test("pessoas no mesmo endereço formam uma parada; sem endereço fica fora do trajeto", () => {
  const salon = "Espaço Jardim, Rua X, 9";
  const route = buildDayRoute({
    origin: home,
    bufferMinutes: 15,
    appointments: [
      appointment("09:00", salon, 60),
      appointment("09:00", "espaço jardim - rua x 9", 60),
      appointment("10:00", salon, 90),
      appointment("15:00", "", 60),
    ],
    legs: new Map(),
  });
  assert.equal(route.summary.appointments, 4);
  assert.equal(route.summary.stops, 2);
  assert.equal(route.stops[0].appointments.length, 3);
  assert.equal(hhmm(route.stops[0].endsAt), "11:30");
  assert.equal(route.summary.missingAddress, 1);
  assert.equal(route.stops[1].leg.routable, false);
  assert.equal(route.stops[1].navigateUrl, null);
  assert.equal(route.returnLeg?.routable, false);
  // The full-day link skips the stop without an address.
  assert.equal(route.mapsLinks.length, 1);
  assert.equal(route.mapsLinks[0].stops, 2);
});

test("trecho registrado serve de estimativa quando não há tempo informado", () => {
  const a = appointment("09:00", "Rua A, 1");
  const route = buildDayRoute({
    origin: home,
    bufferMinutes: 10,
    appointments: [a],
    legs: new Map(),
    trips: new Map([[a.id, { minutes: 30, distanceKm: "15", source: "trip" }]]),
  });
  assert.equal(route.stops[0].leg.source, "trip");
  assert.equal(hhmm(route.summary.leaveAt), "08:20");
});

test("links do Google Maps: um link até 3 paradas intermediárias, partes acima disso", () => {
  const url = new URL(
    mapsDirUrl({
      origin: home,
      destination: "Rua B, 2",
      waypoints: ["Rua A, 1"],
    }),
  );
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), home);
  assert.equal(url.searchParams.get("waypoints"), "Rua A, 1");
  assert.equal(url.searchParams.get("travelmode"), "driving");
  assert.equal(
    new URL(
      mapsDirUrl({ destination: "Rua A, 1", navigate: true }),
    ).searchParams.get("dir_action"),
    "navigate",
  );
  const stops = ["Rua A, 1", "Rua B, 2", "Rua C, 3"];
  assert.equal(mapsRouteLinks([home, ...stops, home]).length, 1);
  const five = [...stops, "Rua D, 4", "Rua E, 5"];
  const parts = mapsRouteLinks([home, ...five, home]);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].from, home);
  assert.equal(parts[0].to, "Rua D, 4");
  assert.equal(parts[1].from, "Rua D, 4");
  assert.equal(parts[1].to, home);
  for (const p of parts)
    assert(
      (new URL(p.url).searchParams.get("waypoints") || "").split("|").length <=
        3,
    );
  assert.deepEqual(mapsRouteLinks(["", "Rua A, 1"]), []);
});

test("próximo dia de trabalho ignora dias já concluídos", () => {
  const r = upcomingDays([
    { date: "2026-11-16", status: "completed" },
    { date: "2026-11-21", status: "confirmed" },
    { date: "2026-11-21", status: "pending" },
    { date: "2026-11-22", status: "confirmed" },
  ]);
  assert.equal(r.nextDay, "2026-11-21");
  assert.deepEqual(r.days, [
    { date: "2026-11-21", count: 2, open: 2 },
    { date: "2026-11-22", count: 1, open: 1 },
  ]);
  assert.equal(upcomingDays([]).nextDay, null);
});

test("CEP: valida, consulta a primeira fonte e cai para a segunda", async () => {
  assert.equal(normalizeCep("01001-000"), "01001000");
  assert.equal(normalizeCep("1234"), null);
  await assert.rejects(() => lookupCep("123"), /8 dígitos/);
  const calls: string[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  const found = await lookupCep("01001-000", async (url) => {
    calls.push(url);
    return json({
      logradouro: "Praça da Sé",
      bairro: "Sé",
      localidade: "São Paulo",
      uf: "SP",
    });
  });
  assert.deepEqual(found, {
    cep: "01001-000",
    street: "Praça da Sé",
    district: "Sé",
    city: "São Paulo",
    state: "SP",
  });
  assert.equal(calls.length, 1);
  const fallback = await lookupCep("13010000", async (url) => {
    if (url.includes("viacep")) throw new Error("offline");
    return json({
      street: "Rua X",
      neighborhood: "Centro",
      city: "Campinas",
      state: "SP",
    });
  });
  assert.equal(fallback.city, "Campinas");
  await assert.rejects(
    () =>
      lookupCep("99999999", async (url) =>
        url.includes("viacep") ? json({ erro: true }) : json({}, 404),
      ),
    /não encontrado/,
  );
  await assert.rejects(
    () =>
      lookupCep("99999999", async () => {
        throw new Error("offline");
      }),
    /indisponível/,
  );
});

test("endereço estruturado gera a linha única e preserva endereços antigos", () => {
  assert.equal(
    formatAddress({
      cep: "01001-000",
      street: "Praça da Sé",
      number: "100",
      complement: "sala 2",
      district: "Sé",
      city: "São Paulo",
      state: "SP",
    }),
    "Praça da Sé, 100 - sala 2, Sé, São Paulo - SP, 01001-000",
  );
  const legacy = addressDataOf({}, "Rua antiga 55, perto da praça");
  assert.equal(legacy.street, "Rua antiga 55, perto da praça");
  assert.equal(formatAddress(legacy), "Rua antiga 55, perto da praça");
  assert.deepEqual(clientSchema.parse({ name: "Ana" }).addressData, {
    cep: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
});
