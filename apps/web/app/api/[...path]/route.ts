import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const url = new URL(
    `${process.env.API_INTERNAL_URL || "http://127.0.0.1:3001"}/api/${path.map(encodeURIComponent).join("/")}`,
  );
  url.search = req.nextUrl.search;
  const headers = new Headers();
  for (const k of ["content-type", "cookie", "origin"]) {
    const value = req.headers.get(k);
    if (value) headers.set(k, value);
  }
  try {
    const init: RequestInit & { duplex?: string } = {
      method: req.method,
      headers,
      cache: "no-store",
      redirect: "manual",
    };
    if (!["GET", "HEAD"].includes(req.method)) {
      init.body = req.body;
      init.duplex = "half";
    }
    const upstream = await fetch(url, init);
    const out = new Headers(upstream.headers);
    for (const key of [
      "connection",
      "transfer-encoding",
      "content-encoding",
      "content-length",
    ])
      out.delete(key);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return Response.json(
      { message: "API indisponível. Verifique a inicialização do backend." },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as DELETE,
  proxy as PUT,
};
