import { test, after } from "node:test";
import assert from "node:assert/strict";
import { D } from "../apps/api/src/db";
import sharp from "../apps/api/node_modules/sharp";
import { cleanupTenant } from "./helpers/cleanup";
import { db } from "../apps/api/src/db";
import { querySchema } from "../packages/shared/src";
const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
const base = process.env.TEST_API_URL || "http://127.0.0.1:3001/api";
const orgs: string[] = [];
async function req(path: string, method = "GET", body?: unknown, cookie = "") {
  const res = await fetch(base + "/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  return {
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie")?.split(";")[0] || cookie,
  };
}
async function tenant() {
  const r = await req("auth/register", "POST", {
    name: "Teste Automatizado",
    company: "Empresa teste " + Date.now(),
    email: `api-${crypto.randomUUID()}@example.test`,
    password: "Senha-de-teste-123456",
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const me = await req("auth/me", "GET", undefined, r.cookie);
  orgs.push(me.data.organization.id);
  return r.cookie;
}
const q = (v: unknown) =>
  encodeURIComponent(JSON.stringify(querySchema.parse(v)));
async function create(path: string, body: unknown, cookie: string) {
  const r = await req(path, "POST", body, cookie);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
after(async () => {
  for (const org of orgs) await cleanupTenant(org);
  await db.$disconnect();
});
test("fluxos financeiros integrados, rastreabilidade, isolamento e concorrência", async () => {
  const cookie = await tenant(),
    other = await tenant();
  assert.equal((await req("data/clients")).status, 401);
  const client = await create(
    "records/clients",
    {
      name: "Cliente integração",
      phone: "11999999999",
      address: "Rua de teste, 123",
      consentPhotos: true,
    },
    cookie,
  );
  const image = new FormData();
  image.append("clientId", client.id);
  image.append(
    "file",
    new Blob([
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#546B57" },
      })
        .png()
        .toBuffer(),
    ]),
    "private.png",
  );
  const uploaded = await fetch(base + "/media", {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
    body: image,
  });
  assert.equal(uploaded.status, 201);
  const photo = await uploaded.json();
  assert.equal((await fetch(base + "/media/" + photo.id)).status, 401);
  assert.equal(
    (await fetch(base + "/media/" + photo.id, { headers: { Cookie: other } }))
      .status,
    404,
  );
  assert.equal(
    (await fetch(base + "/media/" + photo.id, { headers: { Cookie: cookie } }))
      .status,
    200,
  );
  const service = await create(
    "records/services",
    {
      name: "Maquiagem teste",
      category: "Maquiagem",
      price: "350",
      duration: 60,
    },
    cookie,
  );
  const appointment = await create(
    "records/appointments",
    {
      clientId: client.id,
      title: "Atendimento teste",
      startsAt: "2026-10-24T10:00:00-03:00",
      duration: 90,
      status: "completed",
      dueDate: "2026-10-24",
      items: [{ serviceId: service.id, quantity: 1, unitPrice: "350" }],
    },
    cookie,
  );
  const catalogChange = await req(
    `records/services/${service.id}`,
    "PATCH",
    {
      version: service.version,
      data: {
        name: "Nome novo do catálogo",
        category: "Categoria nova",
        price: "999",
        duration: 60,
      },
    },
    cookie,
  );
  assert.equal(catalogChange.status, 200);
  const historicalEdit = {
    clientId: client.id,
    title: "Atendimento teste",
    startsAt: "2026-10-24T10:00:00-03:00",
    duration: 90,
    status: "completed",
    dueDate: "2026-10-24",
    items: [{ serviceId: service.id, quantity: 1, unitPrice: "350" }],
    notes: "Observação posterior à alteração do catálogo",
  };
  assert.equal(
    (
      await req(
        `records/appointments/${appointment.id}`,
        "PATCH",
        { version: 1, data: historicalEdit },
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await req(
        `records/services/${service.id}`,
        "DELETE",
        { version: 2, reason: "Arquivamento de teste" },
        cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await req(
        `records/appointments/${appointment.id}`,
        "PATCH",
        { version: 2, data: historicalEdit },
        cookie,
      )
    ).status,
    200,
  );
  const historical = (await req("data/appointments", "GET", undefined, cookie))
    .data.rows[0];
  assert.equal(historical.serviceNames, "1 × Maquiagem teste");
  assert.equal(historical.category, "Maquiagem");
  assert.equal(historical.total, "350.00");
  const payment = await create(
    "records/payments",
    {
      clientId: client.id,
      receivedAt: "2026-11-01",
      method: "Pix",
      allocations: [{ appointmentId: appointment.id, amount: "50" }],
    },
    cookie,
  );
  const table = await req(
    "data/appointments?q=" + q({ from: "2026-10-01", to: "2026-10-31" }),
    "GET",
    undefined,
    cookie,
  );
  assert.equal(table.data.rows[0].pending, "300.00");
  const october = await req(
    "dashboard?q=" + q({ from: "2026-10-01", to: "2026-10-31" }),
    "GET",
    undefined,
    cookie,
  );
  const metrics = Object.fromEntries(
    october.data.metrics.map((m: any) => [m.key, m]),
  );
  assert.equal(metrics.revenue.value, "350.00");
  assert.equal(metrics.received.value, "0.00");
  assert.equal(metrics.pending.value, "300.00");
  for (const metric of october.data.metrics)
    for (const source of metric.sources) {
      const detail = await req(
        `data/${source.entity}?q=${q(source.query)}`,
        "GET",
        undefined,
        cookie,
      );
      assert.deepEqual(
        detail.data.rows.map((r: any) => r.id),
        source.rows.map((r: any) => r.id),
      );
      const subtotal =
        source.measure === "count"
          ? D(detail.data.total)
          : source.measure === "clients"
            ? D(new Set(detail.data.rows.map((r: any) => r.clientId)).size)
            : detail.data.rows.reduce(
                (a: any, r: any) => a.plus(r[source.measure] || 0),
                D(0),
              );
      assert.equal(subtotal.toFixed(2), source.subtotal);
    }
  const _expense = await create(
    "records/expenses",
    {
      description: "Material teste",
      category: "Produtos",
      amount: "25",
      incurredOn: "2026-10-24",
      dueDate: "2026-11-01",
      paidOn: "2026-11-01",
      kind: "variable",
    },
    cookie,
  );
  const november = await req(
    "dashboard?mode=cash&q=" + q({ from: "2026-11-01", to: "2026-11-30" }),
    "GET",
    undefined,
    cookie,
  );
  const nm = Object.fromEntries(
    november.data.metrics.map((m: any) => [m.key, m]),
  );
  assert.equal(nm.received.value, "50.00");
  assert.equal(nm.result.value, "25.00");
  const es = nm.expenses.sources[0];
  const et = await req(
    `data/expenses?q=${q(es.query)}`,
    "GET",
    undefined,
    cookie,
  );
  assert.equal(et.data.totals.amount, nm.expenses.value);
  const bad = await req(
    "records/payments",
    "POST",
    {
      clientId: client.id,
      receivedAt: "2026-11-02",
      method: "Pix",
      allocations: [{ appointmentId: appointment.id, amount: "301" }],
    },
    cookie,
  );
  assert.equal(bad.status, 400);
  const _second = await create(
    "records/payments",
    {
      clientId: client.id,
      receivedAt: "2026-11-02",
      method: "Pix",
      allocations: [{ appointmentId: appointment.id, amount: "300" }],
    },
    cookie,
  );
  assert.equal(
    (await req("data/appointments", "GET", undefined, cookie)).data.rows[0]
      .pending,
    "0.00",
  );
  const p = await req(
    "records/payments/" + payment.id,
    "GET",
    undefined,
    cookie,
  );
  await create(
    `payments/${payment.id}/refunds`,
    {
      allocationId: p.data.allocations[0].id,
      amount: "20",
      refundedOn: "2026-11-03",
      reason: "Teste reembolso parcial",
    },
    cookie,
  );
  assert.equal(
    (await req("data/appointments", "GET", undefined, cookie)).data.rows[0]
      .pending,
    "20.00",
  );
  assert.equal(
    (await req("records/clients/" + client.id, "GET", undefined, other)).status,
    404,
  );
  assert.equal(
    (await req("data/appointments", "GET", undefined, other)).data.total,
    0,
  );
  assert.equal(
    (
      await req(
        "records/appointments",
        "POST",
        {
          clientId: client.id,
          title: "Inválido",
          startsAt: "2026-10-24T10:00:00-03:00",
          duration: 60,
          status: "confirmed",
          dueDate: "2026-10-24",
          items: [{ serviceId: service.id, quantity: 1, unitPrice: "10" }],
        },
        other,
      )
    ).status,
    404,
  );
  const view = await create(
    "views",
    {
      name: "Pendentes outubro",
      entity: "appointments",
      query: querySchema.parse({
        from: "2026-10-01",
        to: "2026-10-31",
        filters: [{ field: "pending", op: "gt", value: "0" }],
        columns: { notes: false },
        columnOrder: ["title", "pending"],
        columnSizing: { pending: 180 },
        groupBy: "status",
        sort: [{ id: "pending", desc: true }],
      }),
    },
    cookie,
  );
  const views = await req(
    "views?entity=appointments",
    "GET",
    undefined,
    cookie,
  );
  assert.deepEqual(views.data[0].query, view.query);
  const update = await req(
    "records/clients/" + client.id,
    "PATCH",
    { version: client.version, data: { name: "Cliente atualizada" } },
    cookie,
  );
  assert.equal(update.status, 200);
  assert.equal(
    (
      await req(
        "records/clients/" + client.id,
        "PATCH",
        { version: client.version, data: { name: "Versão antiga" } },
        cookie,
      )
    ).status,
    409,
  );
  const race = await Promise.all(
    [1, 2].map(() =>
      req(
        "records/payments",
        "POST",
        {
          clientId: client.id,
          receivedAt: "2026-11-04",
          method: "Pix",
          allocations: [{ appointmentId: appointment.id, amount: "20" }],
        },
        cookie,
      ),
    ),
  );
  assert.equal(race.filter((r) => r.status === 201).length, 1);
  assert.equal(
    (await req("data/appointments", "GET", undefined, cookie)).data.rows[0]
      .pending,
    "0.00",
  );
  const audit = await req("audit", "GET", undefined, cookie);
  assert(audit.data.length >= 8);
});
test("importação XLSX com prévia, confirmação e idempotência", async () => {
  const cookie = await tenant();
  const ExcelJS = await import("../apps/api/node_modules/exceljs");
  const workbook = new ExcelJS.default.Workbook();
  const sheet = workbook.addWorksheet("Clientes_2026");
  sheet.addRow([
    "DATA DO ATENDIMENTO",
    "HORÁRIO DO ATENDIMENTO",
    "NOME",
    "SERVIÇO",
    "VALOR TOTAL",
  ]);
  sheet.addRow(["2026-10-24", "10:00", "Cliente da migração", "Make", "350"]);
  const buf = await workbook.xlsx.writeBuffer();
  const body = new FormData();
  body.append("file", new Blob([buf as any]), "historico.xlsx");
  const response = await fetch(base + "/imports/preview", {
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
    body,
  });
  const batch = await response.json();
  assert.equal(response.status, 201, JSON.stringify(batch));
  assert.equal(
    (await req("data/appointments", "GET", undefined, cookie)).data.total,
    0,
  );
  const row = batch.rows.find((r: any) => r.kind === "appointment");
  const payload = {
    rows: [
      {
        key: row.key,
        mapped: { ...row.mapped, status: "completed", duration: "90" },
        reviewed: true,
      },
    ],
  };
  const commit = await create(`imports/${batch.id}/commit`, payload, cookie);
  assert.equal(commit.results[0].status, "imported", JSON.stringify(commit));
  const repeat = await create(`imports/${batch.id}/commit`, payload, cookie);
  assert.equal(repeat.results[0].status, "ignored");
  assert.equal(
    (await req("data/payments", "GET", undefined, cookie)).data.total,
    0,
  );
  assert.equal(
    (await req("data/appointments", "GET", undefined, cookie)).data.total,
    1,
  );
});
test("rota do dia, estimativas de trajeto, endereço estruturado e histórico de todas as ações", async () => {
  const cookie = await tenant(),
    other = await tenant();
  const put = (path: string, body: unknown, c = cookie) =>
    req(path, "PUT", body, c);
  const home = {
    cep: "13010-000",
    street: "Rua da Casa",
    number: "10",
    complement: "",
    district: "Centro",
    city: "Campinas",
    state: "SP",
  };
  const settings = {
    beige: "#F9EAD2",
    green: "#546B57",
    originAddress: "",
    originAddressData: home,
    bufferMinutes: 15,
    dashboardIndicators: [],
  };
  const saved = await req(
    "settings",
    "PATCH",
    {
      name: "Empresa teste",
      settings: {
        ...settings,
        originAddress: "Rua da Casa, 10, Centro, Campinas - SP, 13010-000",
      },
    },
    cookie,
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const origin = saved.data.settings.originAddress;
  const service = await create(
    "records/services",
    { name: "Make", category: "Maquiagem", price: "180", duration: 60 },
    cookie,
  );
  const addressA = { ...home, street: "Av. Brasil", number: "500" };
  const client = await create(
    "records/clients",
    { name: "Cliente rota", addressData: addressA },
    cookie,
  );
  // The single-line address is derived on the server from the structured one.
  assert.equal(
    client.address,
    "Av. Brasil, 500, Centro, Campinas - SP, 13010-000",
  );
  const day = "2031-03-15";
  const appointment = (
    hhmm: string,
    addressData: unknown,
    status = "confirmed",
  ) =>
    create(
      "records/appointments",
      {
        clientId: client.id,
        title: "Atendimento rota",
        startsAt: `${day}T${hhmm}:00-03:00`,
        duration: 60,
        addressData,
        status,
        dueDate: day,
        items: [{ serviceId: service.id, quantity: 1, unitPrice: "180" }],
      },
      cookie,
    );
  const first = await appointment("09:00", addressA);
  await appointment("09:00", addressA, "pending");
  const second = await appointment("10:30", {
    ...home,
    street: "Rua B",
    number: "2",
  });
  await appointment("14:00", addressA, "cancelled");
  assert.equal(
    (await put("agenda/legs", { origin, destination: "x" })).status,
    400,
  );
  assert.equal(
    (
      await put("agenda/legs", {
        origin,
        destination: first.address,
        minutes: 20,
        distanceKm: "9.5",
      })
    ).status,
    200,
  );
  const leg = {
    origin: first.address,
    destination: second.address,
    minutes: 45,
    distanceKm: "30",
  };
  await put("agenda/legs", { ...leg, minutes: 50 });
  await put("agenda/legs", leg);
  const route = (await req(`agenda/day?date=${day}`, "GET", undefined, cookie))
    .data;
  assert.equal(route.date, day);
  assert.equal(route.summary.appointments, 3); // cancelled stays out
  assert.equal(route.summary.stops, 2);
  assert.equal(route.stops[0].appointments.length, 2);
  assert.equal(route.summary.leaveAt, `${day}T11:25:00.000Z`); // 09:00 - 20 - 15
  assert.deepEqual(route.stops[1].alert, {
    level: "late",
    minutes: 15,
    estimated: true,
  });
  assert.equal(route.summary.pending, "540.00");
  assert.equal(route.summary.distanceKm, "39.5");
  assert.equal(route.mapsLinks.length, 1);
  assert.match(route.stops[0].navigateUrl, /dir_action=navigate/);
  // Without a date the route opens on the next day that still has something to attend.
  const next = (await req("agenda/day", "GET", undefined, cookie)).data;
  assert.equal(next.date, day);
  assert.equal(next.nextDay, day);
  assert.deepEqual(next.days, [{ date: day, count: 3, open: 3 }]);
  // Another company sees neither the appointments nor the informed estimates.
  const foreign = (await req(`agenda/day?date=${day}`, "GET", undefined, other))
    .data;
  assert.equal(foreign.summary.appointments, 0);
  assert.equal(
    await db.routeLeg.count({ where: { origin: first.address } }),
    1,
  );
  assert.equal(
    (await req("agenda/day?date=15/03/2031", "GET", undefined, cookie)).status,
    400,
  );
  assert.equal((await req("cep/123", "GET", undefined, cookie)).status, 400);
  // Audit: every action, with the values before and after.
  const view = await create(
    "views",
    { name: "Minha visão", entity: "clients", query: {} },
    cookie,
  );
  await req(`views/${view.id}`, "DELETE", undefined, cookie);
  await fetch(`${base}/export/clients?q=${q({})}&format=csv`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  await req(
    "settings",
    "PATCH",
    {
      name: "Empresa teste",
      settings: { ...settings, originAddress: origin, bufferMinutes: 30 },
    },
    cookie,
  );
  const audit = (await req("audit", "GET", undefined, cookie)).data;
  const kinds = new Set(audit.map((a: any) => `${a.entity}:${a.action}`));
  for (const kind of [
    "settings:create",
    "settings:update",
    "clients:create",
    "appointments:create",
    "routeLegs:create",
    "routeLegs:update",
    "views:create",
    "views:delete",
    "exports:export",
  ])
    assert(kinds.has(kind), `missing audit ${kind}`);
  assert(audit.every((a: any) => a.userName === "Teste Automatizado"));
  assert(!JSON.stringify(audit).includes("passwordHash"));
  const changes = audit.filter(
    (a: any) => a.entity === "settings" && a.action === "update",
  );
  // The first change of the settings already carries the values that were in effect.
  assert.equal(changes.at(-1).before.settings.bufferMinutes, 15);
  assert.equal(changes.at(-1).before.settings.originAddress, "");
  assert.equal(changes[0].before.settings.bufferMinutes, 15);
  assert.equal(changes[0].after.settings.bufferMinutes, 30);
  const created = audit.find(
    (a: any) => a.entity === "appointments" && a.recordId === first.id,
  );
  assert.equal(created.after.items.length, 1);
  const filtered = (
    await req(
      `audit?entity=clients&recordId=${client.id}`,
      "GET",
      undefined,
      cookie,
    )
  ).data;
  assert.equal(filtered.length, 1);
  assert.equal((await req("audit", "GET", undefined, other)).data.length, 1);
});
