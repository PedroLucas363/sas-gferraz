import { BadRequestException } from "@nestjs/common";
import { D, sum } from "./db";
export function appointmentTotal(a: any) {
  return sum(a.items.map((i: any) => D(i.unitPrice).mul(i.quantity)))
    .minus(a.discount)
    .plus(a.extra)
    .plus(a.travelFee);
}
export function allocatedPaid(a: any) {
  return sum(
    a.allocations
      .filter((x: any) => !x.payment.voidedAt)
      .map((x: any) =>
        D(x.amount).minus(sum(x.refunds.map((r: any) => r.amount))),
      ),
  );
}
export function balance(a: any) {
  return appointmentTotal(a).minus(allocatedPaid(a));
}
export function assertTotal(a: any) {
  if (appointmentTotal(a).lt(0))
    throw new BadRequestException(
      "O desconto não pode superar o valor contratado.",
    );
}
export function vehicleCost(v: any) {
  return D(v.fuelPrice)
    .div(v.kmPerLiter)
    .plus(
      sum(
        [
          "insurance",
          "maintenance",
          "tires",
          "oil",
          "tax",
          "depreciation",
          "other",
        ].map((k) => v[k]),
      ).div(v.annualKm),
    );
}
export function localDate(v: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(v);
}
