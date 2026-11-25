// Daily route planning. Pure functions: no database, no clock, no network.
// Travel estimates are only what was informed (manual) or registered as a trip; nothing is invented.

/** Statuses that appear in the daily route. Quotes, cancellations and no-shows never do. */
export const ROUTE_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
] as const;
/** Statuses that still need her presence; used to choose the next working day. */
export const OPEN_STATUSES = ["pending", "confirmed", "in_progress"] as const;

/** Google Maps URLs accept at most 3 waypoints on mobile browsers (9 elsewhere). */
export const MAX_WAYPOINTS = 3;

export function addressKey(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export const legKey = (origin: string, destination: string) =>
  `${addressKey(origin)}>${addressKey(destination)}`;

export function mapsDirUrl(o: {
  origin?: string;
  destination: string;
  waypoints?: string[];
  navigate?: boolean;
}) {
  const p = new URLSearchParams({ api: "1" });
  if (o.origin) p.set("origin", o.origin);
  p.set("destination", o.destination);
  if (o.waypoints?.length) p.set("waypoints", o.waypoints.join("|"));
  p.set("travelmode", "driving");
  if (o.navigate) p.set("dir_action", "navigate");
  return "https://www.google.com/maps/dir/?" + p.toString();
}

/** Full-day links: one URL when it fits the waypoint limit, otherwise consecutive parts. */
export function mapsRouteLinks(points: string[], maxWaypoints = MAX_WAYPOINTS) {
  const path = points.filter(
    (p, i) => addressKey(p) && addressKey(p) !== addressKey(points[i - 1]),
  );
  const links: { from: string; to: string; stops: number; url: string }[] = [];
  let i = 0;
  while (i < path.length - 1) {
    const j = Math.min(i + maxWaypoints + 1, path.length - 1);
    links.push({
      from: path[i],
      to: path[j],
      stops: j - i,
      url: mapsDirUrl({
        origin: path[i],
        destination: path[j],
        waypoints: path.slice(i + 1, j),
      }),
    });
    i = j;
  }
  return links;
}

export type LegEstimate = {
  minutes: number;
  distanceKm: string;
  source: "manual" | "trip";
};
export type RouteAppointment = {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  title: string;
  serviceNames: string;
  startsAt: Date;
  duration: number;
  status: string;
  address: string;
  total: string;
  paid: string;
  pending: string;
};
export type RouteAlert = {
  /** late: estimated arrival after the start; overlap: previous one ends after this starts; tight: less slack than the safety margin. */
  level: "late" | "overlap" | "tight";
  minutes: number;
  /** false when travel time is unknown and only the gap between appointments was compared. */
  estimated: boolean;
};
export type RouteLegView = {
  from: string;
  to: string;
  minutes: number | null;
  distanceKm: string | null;
  source: "manual" | "trip" | "unavailable";
  /** Both ends have an address, so an estimate can be informed and a map link exists. */
  routable: boolean;
  mapsUrl: string | null;
};
export type RouteStop = {
  key: string;
  address: string;
  startsAt: Date;
  endsAt: Date;
  appointments: RouteAppointment[];
  leg: RouteLegView;
  /** Latest departure from the previous point to arrive with the safety margin. */
  departBy: Date | null;
  /** Estimated arrival when leaving right after the previous stop ends. */
  arrival: Date | null;
  /** Minutes left after travel; negative means late. Null when travel time is unknown. */
  slackMinutes: number | null;
  alert: RouteAlert | null;
  navigateUrl: string | null;
};

const minutes = (ms: number) => Math.round(ms / 60000);
const plus = (d: Date, min: number) => new Date(d.getTime() + min * 60000);

export function buildDayRoute(input: {
  origin: string;
  bufferMinutes: number;
  appointments: RouteAppointment[];
  /** Informed estimates by legKey(origin, destination). */
  legs: Map<string, LegEstimate>;
  /** Estimate registered as a trip for an appointment; used only when no leg estimate exists. */
  trips?: Map<string, LegEstimate>;
}) {
  const { origin, bufferMinutes: buffer, legs } = input;
  const ordered = [...input.appointments].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.clientName.localeCompare(b.clientName, "pt-BR"),
  );
  // Consecutive appointments at the same address are one stop (bride and bridesmaids).
  const groups: RouteAppointment[][] = [];
  for (const a of ordered) {
    const last = groups.at(-1);
    const key = addressKey(a.address);
    if (last && key && addressKey(last[0].address) === key) last.push(a);
    else groups.push([a]);
  }
  const estimate = (from: string, to: string, appointmentId?: string) => {
    if (!addressKey(from) || !addressKey(to)) return null;
    return (
      legs.get(legKey(from, to)) ??
      // The same road the other way is the best informed guess available.
      legs.get(legKey(to, from)) ??
      (appointmentId ? input.trips?.get(appointmentId) : undefined) ??
      null
    );
  };
  const legView = (
    from: string,
    to: string,
    appointmentId?: string,
  ): RouteLegView => {
    const routable = !!addressKey(from) && !!addressKey(to);
    const e = estimate(from, to, appointmentId);
    return {
      from,
      to,
      minutes: e?.minutes ?? null,
      distanceKm: e?.distanceKm ?? null,
      source: e?.source ?? "unavailable",
      routable,
      mapsUrl: routable ? mapsDirUrl({ origin: from, destination: to }) : null,
    };
  };
  const stops: RouteStop[] = [];
  for (const [i, group] of groups.entries()) {
    const address = group[0].address;
    const startsAt = group[0].startsAt;
    const endsAt = new Date(
      Math.max(...group.map((a) => a.startsAt.getTime() + a.duration * 60000)),
    );
    const previous = stops[i - 1];
    const leg = legView(
      previous ? previous.address : origin,
      address,
      group[0].id,
    );
    let departBy: Date | null = null,
      arrival: Date | null = null,
      slackMinutes: number | null = null,
      alert: RouteAlert | null = null;
    if (leg.minutes !== null)
      departBy = plus(startsAt, -(leg.minutes + buffer));
    if (previous) {
      const gap = minutes(startsAt.getTime() - previous.endsAt.getTime());
      if (leg.minutes !== null) {
        arrival = plus(previous.endsAt, leg.minutes);
        slackMinutes = gap - leg.minutes;
        if (departBy && departBy < previous.endsAt) departBy = previous.endsAt;
        if (slackMinutes < 0)
          alert = { level: "late", minutes: -slackMinutes, estimated: true };
        else if (slackMinutes < buffer)
          alert = { level: "tight", minutes: slackMinutes, estimated: true };
      } else if (gap < 0)
        alert = { level: "overlap", minutes: -gap, estimated: false };
      else if (gap < buffer)
        alert = { level: "tight", minutes: gap, estimated: false };
    } else if (leg.minutes !== null) arrival = plus(departBy!, leg.minutes);
    stops.push({
      key: group.map((a) => a.id).join("+"),
      address,
      startsAt,
      endsAt,
      appointments: group,
      leg,
      departBy,
      arrival,
      slackMinutes,
      alert,
      navigateUrl: addressKey(address)
        ? mapsDirUrl({ destination: address, navigate: true })
        : null,
    });
  }
  const last = stops.at(-1);
  const returnLeg =
    last && addressKey(origin) ? legView(last.address, origin) : null;
  const homeAt =
    last && returnLeg?.minutes != null
      ? plus(last.endsAt, returnLeg.minutes)
      : null;
  const allLegs = [
    ...stops.map((s) => s.leg),
    ...(returnLeg ? [returnLeg] : []),
  ];
  const known = allLegs.filter((l) => l.minutes !== null);
  const addresses = stops.map((s) => s.address);
  return {
    stops,
    returnLeg,
    mapsLinks: mapsRouteLinks(
      addressKey(origin) ? [origin, ...addresses, origin] : addresses,
    ),
    summary: {
      appointments: ordered.length,
      stops: stops.length,
      leaveAt: stops[0]?.departBy ?? null,
      firstStart: stops[0]?.startsAt ?? null,
      lastEnd: last?.endsAt ?? null,
      homeAt,
      travelMinutes: known.reduce((n, l) => n + l.minutes!, 0),
      distanceKm: (
        known.reduce((n, l) => n + Math.round(Number(l.distanceKm) * 100), 0) /
        100
      ).toFixed(1),
      /** Legs with both addresses but no informed estimate. */
      legsWithoutEstimate: allLegs.filter(
        (l) => l.routable && l.minutes === null,
      ).length,
      missingAddress: stops.filter((s) => !addressKey(s.address)).length,
      alerts: stops.filter((s) => s.alert).length,
    },
  };
}

/** Days from `today` on that have appointments, and the first with something still to attend. */
export function upcomingDays(
  rows: { date: string; status: string }[],
  limit = 7,
) {
  const days = new Map<string, { date: string; count: number; open: number }>();
  for (const r of rows) {
    const d = days.get(r.date) ?? { date: r.date, count: 0, open: 0 };
    d.count++;
    if ((OPEN_STATUSES as readonly string[]).includes(r.status)) d.open++;
    days.set(r.date, d);
  }
  const list = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const open = list.filter((d) => d.open > 0);
  return { nextDay: open[0]?.date ?? null, days: open.slice(0, limit) };
}
