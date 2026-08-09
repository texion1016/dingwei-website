const ADMIN_PAGES = new Set([
  "/dw-console-k7f3q9.html",
  "/dw-disclosure-k7f3q9.html",
  "/disclosure-print.html",
]);
const COOKIE = "dw_admin_session";
const TTL = 8 * 60 * 60;
const ADMIN_API_PREFIX = "/api/admin/supabase";
const enc = new TextEncoder();

function b64url(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value))));
}

function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function cookie(request) {
  const prefix = `${COOKIE}=`;
  return (request.headers.get("Cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(prefix))?.slice(prefix.length) || "";
}

function nextPath(value) {
  return value && value.startsWith("/") && !value.startsWith("//") && value !== "/admin/login" ? value : "/dw-console-k7f3q9.html";
}

async function loggedIn(request, env) {
  const token = cookie(request);
  const i = token.lastIndexOf(".");
  if (i < 1 || !same(token.slice(i + 1), await sign(token.slice(0, i), env.SESSION_SECRET))) return false;
  try { return JSON.parse(atob(token.slice(0, i).replace(/-/g, "+").replace(/_/g, "/"))).exp > Math.floor(Date.now() / 1000); }
  catch { return false; }
}

async function session(env) {
  const body = b64url(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL })));
  return `${body}.${await sign(body, env.SESSION_SECRET)}`;
}

function loginHtml(next, failed = false) {
  return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>鼎瑋后台登入</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4eee8;color:#241f1e;font-family:"Microsoft JhengHei",sans-serif}.box{width:min(360px,calc(100vw - 40px));background:#fff;box-sizing:border-box;padding:36px 32px;border-top:5px solid #94283a;box-shadow:0 16px 45px #2d17191f}.brand{color:#94283a;font-weight:800;letter-spacing:.11em;font-size:.84rem}h1{margin:10px 0 25px;font-size:1.55rem}label{display:grid;gap:7px;margin:15px 0}input{padding:12px;border:1px solid #d5c8c2;font:inherit}button{width:100%;border:0;background:#94283a;color:#fff;padding:13px;font:700 1rem inherit;cursor:pointer}.err{margin:0 0 13px;color:#a11f33;font-size:.9rem}a{display:block;text-align:center;margin-top:18px;color:#6f5b55;font-size:.9rem;text-decoration:none}</style><main class="box"><div class="brand">DING WEI REAL ESTATE</div><h1>物件管理后台</h1>${failed ? '<p class="err">账号或密码不正确，请再试一次。</p>' : ""}<form method="post" action="/admin/login"><input type="hidden" name="next" value="${next}"><label>账号<input name="username" autocomplete="username" required></label><label>密码<input type="password" name="password" autocomplete="current-password" required></label><button>登入后台</button></form><a href="/">回到网站首页</a></main></html>`;
}

function proxy(request, env) {
  // A Service binding is Cloudflare's internal Worker-to-Worker connection.
  // It avoids a forbidden workers.dev network fetch and keeps requests within
  // the account.
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = "dingwei-realty-site.davidlin10161016.workers.dev";
  target.port = "";
  return env.ORIGIN.fetch(new Request(target, request));
}

function permittedAdminApi(pathname) {
  return [
    "/rest/v1/dw_listings",
    "/rest/v1/dw_messages",
    "/rest/v1/dw_property_files",
    "/storage/v1/object/dw-photos",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function supabaseProxy(request, env) {
  const incoming = new URL(request.url);
  const path = incoming.pathname.slice(ADMIN_API_PREFIX.length) || "/";
  if (!permittedAdminApi(path)) return new Response("Not Found", { status: 404 });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return new Response("Admin data service is not configured", { status: 503 });

  const target = new URL(env.SUPABASE_URL);
  target.pathname = path;
  target.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.delete("Authorization");
  headers.delete("apikey");
  headers.delete("Cookie");
  headers.set("Authorization", `Bearer ${env.SUPABASE_SERVICE_KEY}`);
  headers.set("apikey", env.SUPABASE_SERVICE_KEY);
  return fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: request.redirect,
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === ADMIN_API_PREFIX || url.pathname.startsWith(`${ADMIN_API_PREFIX}/`)) {
      if (!(await loggedIn(request, env))) return new Response("Unauthorized", { status: 401 });
      return supabaseProxy(request, env);
    }
    if (url.pathname === "/admin/login") {
      if (request.method === "GET") return new Response(loginHtml(nextPath(url.searchParams.get("next"))), { headers: { "content-type": "text/html; charset=UTF-8" } });
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const form = await request.formData();
      const valid = same(String(form.get("username") || ""), env.ADMIN_USERNAME) && same(String(form.get("password") || ""), env.ADMIN_PASSWORD);
      const next = nextPath(String(form.get("next") || ""));
      if (!valid) return new Response(loginHtml(next, true), { status: 401, headers: { "content-type": "text/html; charset=UTF-8" } });
      return new Response(null, { status: 302, headers: { Location: next, "Set-Cookie": `${COOKIE}=${await session(env)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}` } });
    }
    if (url.pathname === "/admin/logout") return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });
    if (ADMIN_PAGES.has(url.pathname) && !(await loggedIn(request, env))) return Response.redirect(`${url.origin}/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`, 302);
    return proxy(request, env);
  },
};
