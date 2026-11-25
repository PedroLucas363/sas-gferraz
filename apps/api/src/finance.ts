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
/**
 * Travel fee suggested for a visit: the round trip (twice the one-way distance) at the
 * vehicle's full cost per km (fuel plus yearly fixed costs spread over the yearly mileage).
 */
export function travelFeeFor(oneWayKm: string, vehicle: any) {
  return D(oneWayKm).mul(2).mul(vehicleCost(vehicle)).toDecimalPlaces(2);
}
/**
 * Price charged for a round trip of `roundTripKm`, from the user's price list: the first range
 * (smallest "up to") that covers the distance, in the column of the vehicle's fuel. Null when the
 * list is empty or the distance is beyond its last range.
 */
export function travelFeeFromTable(
  roundTripKm: string,
  table: { upToKm: number; ethanol: string; gasoline: string }[],
  fuel: string,
) {
  const row = [...table]
    .sort((a, b) => a.upToKm - b.upToKm)
    .find((r) => D(roundTripKm).lte(r.upToKm));
  if (!row) return null;
  return {
    upToKm: row.upToKm,
    fuel: isGasoline(fuel) ? "gasoline" : "ethanol",
    amount: D(isGasoline(fuel) ? row.gasoline : row.ethanol).toDecimalPlaces(2),
  };
}
const isGasoline = (fuel: string) =>
  fuel.normalize("NFD").toLowerCase().includes("gasolina");
export function localDate(v: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(v);
}
