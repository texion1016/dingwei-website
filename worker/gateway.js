const ADMIN_PAGES = new Set([
  "/dw-console-k7f3q9.html",
  "/dw-disclosure-k7f3q9.html",
  "/disclosure-print.html",
  "/dw-settlement-print-k7f3q9.html",
]);
const COOKIE = "dw_admin_session";
const TTL = 8 * 60 * 60;
const ADMIN_API_PREFIX = "/api/admin/supabase";
const GEOCODE_PATH = "/api/admin/geocode";
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
    "/rest/v1/dw_management_projects",
    "/rest/v1/dw_management_owners",
    "/rest/v1/dw_management_statements",
    "/rest/v1/dw_management_statement_units",
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" },
  });
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function coordinatesFromText(input) {
  const raw = String(input || "").replace(/\+/g, " ");
  let text = raw;
  try { text = decodeURIComponent(raw); } catch { /* 使用原始文字繼續判讀。 */ }
  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{2,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,2}(?:\.\d+)?).*?!4d(-?\d{2,3}(?:\.\d+)?)/,
    /(?:[?&](?:q|query|ll|center)=|\b)(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2,3}\.\d{3,})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]), lng = Number(match[2]);
    if (validCoordinates(lat, lng)) return { lat, lng };
  }
  return null;
}

function allowedMapUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "maps.app.goo.gl" || host === "goo.gl" || host.endsWith(".google.com") || host === "google.com");
  } catch { return false; }
}

async function geocode(request) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  const query = new URL(request.url).searchParams.get("query")?.trim() || "";
  if (!query || query.length > 600) return json({ error: "請提供有效的 Google 地圖網址或完整地址。" }, 400);

  let found = coordinatesFromText(query);
  if (!found && allowedMapUrl(query)) {
    try {
      const response = await fetch(query, { redirect: "follow", headers: { "accept": "text/html,application/xhtml+xml" } });
      found = coordinatesFromText(response.url) || coordinatesFromText(await response.text());
    } catch { /* 改以下方地址查詢作為備援。 */ }
  }
  if (found) return json({ ...found, source: "google-link" });

  if (allowedMapUrl(query)) return json({ error: "無法從此 Google 地圖連結讀取座標，請改用完整分享連結或直接輸入地址。" }, 404);

  // 台灣地址的樓層／門牌常未收錄在開放地圖，保留到路名即可取得
  // 可用的街道中心點；若要精確到門牌，使用 Google 地圖分享連結即可。
  const address = query.replace(/[0-9０-９]+號.*$/, "").trim() || query;
  const search = new URL("https://nominatim.openstreetmap.org/search");
  search.search = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "tw", "accept-language": "zh-TW", q: address }).toString();
  try {
    const response = await fetch(search, { headers: { "accept": "application/json", "user-agent": "Dingwei-Realty-Admin/1.0 (https://dingwei-realty.com)" } });
    const rows = await response.json();
    const first = Array.isArray(rows) ? rows[0] : null;
    const lat = Number(first?.lat), lng = Number(first?.lon);
    if (!validCoordinates(lat, lng)) return json({ error: "找不到這個地址的位置，請改貼 Google 地圖分享連結。" }, 404);
    return json({ lat, lng, display_name: first.display_name || "", source: "address" });
  } catch {
    return json({ error: "地圖服務暫時無法查詢，請改貼 Google 地圖分享連結。" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === GEOCODE_PATH) {
      if (!(await loggedIn(request, env))) return new Response("Unauthorized", { status: 401 });
      return geocode(request);
    }
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
