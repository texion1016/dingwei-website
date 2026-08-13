(function () {
  "use strict";

  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  function installButton() {
    var nav = document.querySelector(".site-nav");
    if (!nav || document.getElementById("siteInstallButton")) return null;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "siteInstallButton";
    button.className = "install-link";
    button.hidden = true;
    button.textContent = "安裝到桌面";
    button.setAttribute("aria-label", "將大南崁房屋安裝到電腦桌面");
    nav.appendChild(button);
    return button;
  }

  function setupInstallPrompt() {
    var button = installButton();
    if (!button || isMobile()) return;
    var deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      button.hidden = false;
    });
    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      button.hidden = true;
    });
    button.addEventListener("click", async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.hidden = true;
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

  var start = function () {
    setupInstallPrompt();
    registerServiceWorker();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
