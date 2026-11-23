import { test } from "node:test";
import assert from "node:assert/strict";
import { isLanHost, originAllowed } from "../apps/api/src/origin";

test("endereços da rede local são reconhecidos; endereços públicos não", () => {
  for (const host of [
    "192.168.15.14",
    "10.0.0.7",
    "172.16.0.1",
    "172.31.255.254",
    "169.254.10.10",
    "127.0.0.1",
    "localhost",
    "notebook.local",
    "DESKTOP-GABI",
  ])
    assert(isLanHost(host), host);
  for (const host of [
    "8.8.8.8",
    "172.32.0.1",
    "192.169.0.1",
    "999.168.0.1",
    "evil.example",
    "192.168.15.14.evil.example",
  ])
    assert(!isLanHost(host), host);
});

test("origem: lista explícita, rede local só no próprio endereço aberto, demais recusadas", () => {
  const allowed = ["http://localhost:3000"];
  const check = (origin: string, lan: boolean, forwardedHost?: string) =>
    originAllowed(origin, { allowed, lan, forwardedHost });
  assert(check("http://localhost:3000", false));
  const phone = "http://192.168.15.14:3000";
  // Disabled by default: the explicit list is the only rule.
  assert(!check(phone, false, "192.168.15.14:3000"));
  assert(check(phone, true, "192.168.15.14:3000"));
  assert(check("http://notebook.local:3000", true, "notebook.local:3000"));
  assert(check("http://192.168.15.14", true, "192.168.15.14"));
  // Another device or site posting to this address is refused.
  assert(!check("http://192.168.15.99:3000", true, "192.168.15.14:3000"));
  assert(!check("http://evil.example", true, "192.168.15.14:3000"));
  // DNS rebinding: a public name that resolves to the computer is not a local host.
  assert(!check("http://evil.example:3000", true, "evil.example:3000"));
  assert(!check(phone, true));
  assert(!check("not a url", true, "192.168.15.14:3000"));
  assert(!check("file://192.168.15.14", true, "192.168.15.14"));
});
