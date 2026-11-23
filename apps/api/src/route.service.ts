import { Injectable } from "@nestjs/common";
import { defaultSettings } from "@gferraz/shared";
import { db, Context, atomic, audit, sum } from "./db";
import { appointmentTotal, allocatedPaid, localDate } from "./finance";
import { appointmentInclude } from "./data.service";
import {
  ROUTE_STATUSES,
  addressKey,
  buildDayRoute,
  legKey,
  upcomingDays,
  LegEstimate,
  RouteAppointment,
} from "./route";
// São Paulo has had a fixed UTC-3 offset since 2019; the same assumption is used by the forms.
const dayStart = (day: string) => new Date(`${day}T00:00:00-03:00`);
@Injectable()
export class RouteService {
  /** Route of `day`; without a day, the next one that still has something to attend. */
  async day(c: Context, day?: string) {
    const w = { organizationId: c.organizationId };
    const today = localDate(new Date());
    const org = await db.organization.findUniqueOrThrow({
      where: { id: c.organizationId },
    });
    const settings = { ...defaultSettings, ...(org.settings as object) };
    const upcoming = upcomingDays(
      (
        await db.appointment.findMany({
          where: {
            ...w,
            status: { in: [...ROUTE_STATUSES] },
            startsAt: { gte: dayStart(today) },
          },
          select: { startsAt: true, status: true },
          orderBy: { startsAt: "asc" },
          take: 1000,
        })
      ).map((a) => ({ date: localDate(a.startsAt), status: a.status })),
    );
    const date = day ?? upcoming.nextDay ?? today;
    const from = dayStart(date);
    const found = await db.appointment.findMany({
      where: {
        ...w,
        status: { in: [...ROUTE_STATUSES] },
        startsAt: { gte: from, lt: new Date(from.getTime() + 86400000) },
      },
      include: { ...appointmentInclude, trips: true },
      orderBy: { startsAt: "asc" },
    });
    const trips = new Map<string, LegEstimate>();
    const appointments: RouteAppointment[] = found.map((a) => {
      const trip = a.trips.at(-1);
      if (trip)
        trips.set(a.id, {
          minutes: trip.minutes,
          distanceKm: trip.distanceKm.toFixed(2),
          source: "trip",
        });
      const total = appointmentTotal(a),
        paid = allocatedPaid(a);
      return {
        id: a.id,
        clientId: a.clientId,
        clientName: a.client.name,
        phone: a.client.phone,
        title: a.title,
        serviceNames: a.items
          .map(
            (i) => (i.quantity > 1 ? `${i.quantity} × ` : "") + i.serviceName,
          )
          .join(", "),
        startsAt: a.startsAt,
        duration: a.duration,
        status: a.status,
        address: a.address,
        total: total.toFixed(2),
        paid: paid.toFixed(2),
        pending: total.minus(paid).toFixed(2),
      };
    });
    const legs = new Map<string, LegEstimate>(
      (await db.routeLeg.findMany({ where: w })).map((l) => [
        `${l.originKey}>${l.destinationKey}`,
        {
          minutes: l.minutes,
          distanceKm: l.distanceKm.toFixed(2),
          source: "manual",
        },
      ]),
    );
    const route = buildDayRoute({
      origin: settings.originAddress,
      bufferMinutes: Number(settings.bufferMinutes),
      appointments,
      legs,
      trips,
    });
    return {
      date,
      today,
      nextDay: upcoming.nextDay,
      days: upcoming.days,
      origin: settings.originAddress,
      bufferMinutes: Number(settings.bufferMinutes),
      ...route,
      summary: {
        ...route.summary,
        total: sum(appointments.map((a) => a.total)).toFixed(2),
        pending: sum(appointments.map((a) => a.pending)).toFixed(2),
      },
    };
  }
  /** Travel estimate informed by the user for a pair of addresses; reused whenever the pair repeats. */
  async saveLeg(
    c: Context,
    input: {
      origin: string;
      destination: string;
      minutes: number;
      distanceKm: string;
    },
  ) {
    const originKey = addressKey(input.origin),
      destinationKey = addressKey(input.destination);
    return atomic(async (tx) => {
      const where = {
        organizationId_originKey_destinationKey: {
          organizationId: c.organizationId,
          originKey,
          destinationKey,
        },
      };
      const before = await tx.routeLeg.findUnique({ where });
      const data = {
        origin: input.origin.trim(),
        destination: input.destination.trim(),
        minutes: input.minutes,
        distanceKm: input.distanceKm,
        source: "manual",
        updatedAt: new Date(),
      };
      const after = before
        ? await tx.routeLeg.update({ where, data })
        : await tx.routeLeg.create({
            data: {
              ...data,
              organizationId: c.organizationId,
              originKey,
              destinationKey,
            },
          });
      await audit(
        tx,
        c,
        "routeLegs",
        after.id,
        before ? "update" : "create",
        before,
        after,
      );
      return { ...after, key: legKey(input.origin, input.destination) };
    });
  }
}
