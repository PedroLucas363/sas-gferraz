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
