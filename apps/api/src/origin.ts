// Which browser origins may send mutations. Pure functions, no environment access.

/** Hosts that only exist inside a home or office network: private IPv4, localhost, mDNS and bare machine names. */
export function isLanHost(hostname: string) {
  const host = hostname.toLowerCase();
  const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (ip.slice(1).some((n) => Number(n) > 255)) return false;
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  if (host === "localhost" || host.endsWith(".local")) return true;
  // A name without dots cannot be resolved by public DNS.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(host);
}

/**
 * `allowed` is the explicit list (WEB_ORIGIN). With `lan`, an origin inside the local network is
 * also accepted when it is the very address the page was opened at (`forwardedHost`, set by the
 * web proxy, the only client that reaches the API). A page from any other site is still refused.
 */
export function originAllowed(
  origin: string,
  o: { allowed: string[]; lan: boolean; forwardedHost?: string },
) {
  if (o.allowed.includes(origin)) return true;
  if (!o.lan || !o.forwardedHost) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (
    ["http:", "https:"].includes(url.protocol) &&
    isLanHost(url.hostname) &&
    url.host === o.forwardedHost.trim().toLowerCase()
  );
}
