(function () {
  "use strict";

  if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")) return;

  function loadSupabase() {
    if (window.supabase) return Promise.resolve(window.supabase);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-dw-supabase]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.supabase); }, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.dataset.dwSupabase = "true";
      script.onload = function () { resolve(window.supabase); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function passkeyLogin(link) {
    if (location.protocol === "file:") {
      location.href = link.href;
      return;
    }
    if (!window.PublicKeyCredential || !window.DW_SB || !window.DW_SB.url || !window.DW_SB.key) {
      location.href = link.href;
      return;
    }
    var original = link.textContent;
    link.textContent = "辨識登入中…";
    link.setAttribute("aria-busy", "true");
    try {
      var supabase = await loadSupabase();
      var client = supabase.createClient(window.DW_SB.url, window.DW_SB.key, {
        auth: { experimental: { passkey: true }, persistSession: false, autoRefreshToken: false }
      });
      var result = await client.auth.signInWithPasskey();
      if (result.error || !result.data || !result.data.session) throw result.error || new Error("沒有可用的 Passkey");
      var response = await fetch("/api/admin/passkey/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { Authorization: "Bearer " + result.data.session.access_token }
      });
      await client.auth.signOut();
      if (!response.ok) throw new Error("安全登入驗證失敗");
      location.href = link.href;
    } catch (_) {
      link.textContent = original;
      link.removeAttribute("aria-busy");
      location.href = link.href;
    }
  }

  function init() {
    document.querySelectorAll("a.login-link").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        passkeyLogin(link);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
