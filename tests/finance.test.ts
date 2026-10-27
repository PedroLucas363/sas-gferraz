import { test } from "node:test";
import assert from "node:assert/strict";
import { D } from "../apps/api/src/db";
import {
  appointmentTotal,
  allocatedPaid,
  vehicleCost,
} from "../apps/api/src/finance";
import { selectRows } from "../apps/api/src/query";
import { querySchema } from "../packages/shared/src";
import { parseDate, parseMoney } from "../apps/api/src/import.service";
import { LocalStorage, safeName } from "../apps/api/src/storage";
test("valores financeiros mantêm centavos sem erro de ponto flutuante", () => {
  assert.equal(D("0.1").plus("0.2").toFixed(2), "0.30");
  const a = {
    items: [
      { unitPrice: "150", quantity: 1 },
      { unitPrice: "180", quantity: 1 },
    ],
    discount: "15",
    extra: "0",
    travelFee: "35",
  };
  assert.equal(appointmentTotal(a).toFixed(2), "350.00");
  assert.equal(
    allocatedPaid({
      allocations: [{ amount: "50", payment: { voidedAt: null }, refunds: [] }],
    }).toFixed(2),
    "50.00",
  );
});
test("reembolsos reabrem saldo; pagamentos estornados deixam de liquidar", () => {
  assert.equal(
    allocatedPaid({
      allocations: [
        {
          amount: "80",
          payment: { voidedAt: null },
          refunds: [{ amount: "30" }],
        },
        { amount: "100", payment: { voidedAt: new Date() }, refunds: [] },
      ],
    }).toString(),
    "50",
  );
});
test("custo por km anualiza despesas sem gerar lançamentos", () => {
  assert.equal(
    vehicleCost({
      fuelPrice: "4.10",
      kmPerLiter: "7.4",
      annualKm: 15000,
      insurance: "3000",
      maintenance: "3000",
      tires: "500",
      oil: "800",
      tax: "0",
      depreciation: "0",
      other: "1000",
    }).toFixed(4),
    "1.1074",
  );
});
test("consultas combinam período e E/OU e não aceitam campos arbitrários", () => {
  const rows = [
    { id: "1", date: "2026-10-01", pending: "300", clientName: "Ágata" },
    { id: "2", date: "2026-11-01", pending: "50", clientName: "Ana" },
  ];
  assert.equal(
    selectRows(
      rows,
      querySchema.parse({
        from: "2026-10-01",
        to: "2026-10-31",
        search: "agata",
        filters: [{ field: "pending", op: "gt", value: "100" }],
      }),
      "appointments",
    ).length,
    1,
  );
  assert.throws(() =>
    selectRows(
      rows,
      querySchema.parse({
        filters: [{ field: "organizationId", op: "eq", value: "x" }],
      }),
      "appointments",
    ),
  );
});
test("datas brasileiras inválidas e valores ausentes não viram registros fictícios", () => {
  assert.equal(parseDate("15/11/0202"), null);
  assert.equal(parseDate("31/02/2026"), null);
  assert.equal(parseDate("24/10/2026"), "2026-10-24");
  assert.equal(parseMoney("R$ 1.234,56"), "1234.56");
  assert.equal(parseMoney("sinal"), null);
});
test("armazenamento rejeita traversal e nomes inválidos no Windows", () => {
  assert.equal(safeName("CON"), "_CON");
  assert(!safeName("../Ana: foto").includes("/"));
  assert.throws(() => new LocalStorage().resolve("../outside.jpg"));
});
