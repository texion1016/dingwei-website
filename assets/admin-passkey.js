(function () {
  "use strict";

  var button = document.getElementById("enableMobilePasskey");
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  if (!button || !mobile) return;

  function setLabel(label, busy) {
    button.textContent = label;
    button.disabled = Boolean(busy);
  }

  button.addEventListener("click", async function () {
    if (!window.PublicKeyCredential || !window.supabase || !window.DW_SB) {
      alert("此手機瀏覽器不支援 Face ID／Passkey，請繼續使用帳號密碼登入。");
      return;
    }

    setLabel("正在啟用…", true);
    var client = window.supabase.createClient(window.DW_SB.url, window.DW_SB.key, {
      auth: { experimental: { passkey: true }, persistSession: false, autoRefreshToken: false }
    });
    try {
      var response = await fetch("/api/admin/passkey/bootstrap", { method: "POST", credentials: "same-origin" });
      var session = await response.json().catch(function () { return {}; });
      if (!response.ok || !session.access_token || !session.refresh_token) throw new Error("無法建立安全驗證工作階段");
      var restored = await client.auth.setSession(session);
      if (restored.error) throw restored.error;
      var registered = await client.auth.registerPasskey();
      if (registered.error) throw registered.error;
      await client.auth.signOut();
      setLabel("Face ID 已啟用", false);
      alert("此手機已啟用 Face ID／指紋 Passkey。之後從網站右上角按「登入」即可使用裝置辨識登入。");
    } catch (error) {
      setLabel("啟用手機 Face ID", false);
      alert("Passkey 設定未完成：" + (error && error.message ? error.message : "請稍後再試"));
    }
  });
})();
