/* 鼎瑋不動產 — 共用渲染腳本
   物件來源：優先讀 Supabase dw_listings（上架中），失敗時退回 data.js 內建資料 */
(function () {
  "use strict";

  var C = window.COMPANY;
  var L = [];
  var PHOTO_DIR = "assets/photos/";

  var SB = window.DW_SB || { url: "", key: "" };

  function mapRow(r) {
    return {
      sno: r.sno,
      deal: r.deal,
      name: r.name,
      district: r.district || "",
      kind: r.kind || "",
      price: Number(r.price) || 0,
      size: Number(r.size) || 0,
      unit: r.unit || "",
      parking: !!r.parking,
      address: r.address || "",
      layout: r.layout || "",
      floor: r.floor || "",
      age: r.age || "",
      pitch: r.pitch || [],
      spec: r.spec || {},
      lat: r.lat || "",
      lng: r.lng || "",
      photos: r.photos || [],
      videos: r.videos || []
    };
  }

  function loadListings() {
    if (!SB.url || !SB.key) {
      return Promise.resolve(window.LISTINGS || []);
    }
    return fetch(SB.url + "/rest/v1/dw_listings?status=eq.active&select=*", {
      headers: { apikey: SB.key, Authorization: "Bearer " + SB.key }
    })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (rows) {
        if (!rows.length) throw new Error("empty");
        return rows.map(mapRow);
      })
      .catch(function () { return window.LISTINGS || []; });
  }

  /* ---------- 小工具 ---------- */

  function fmtPrice(l) {
    if (l.deal === "rent") return l.price + '<span class="u">萬/月</span>';
    return l.price.toLocaleString("zh-TW") + '<span class="u">萬</span>';
  }

  function priceClass(l) { return l.deal === "rent" ? "price-rent" : "price-sell"; }
  function sealClass(l) { return l.deal === "rent" ? "seal-rent" : "seal-sell"; }
  function sealChar(l) { return l.deal === "rent" ? "租" : "售"; }

  function photoUrl(p) {
    return /^https?:\/\//.test(p) ? p : PHOTO_DIR + p;
  }

  function coverUrl(l) { return l.photos.length ? photoUrl(l.photos[0]) : ""; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function byNewest(a, b) { return Number(b.sno) - Number(a.sno); }

  /* ---------- 物件卡片 ---------- */

  function cardHTML(l) {
    var photo = l.photos.length
      ? '<img loading="lazy" src="' + coverUrl(l) + '" alt="' + esc(l.name) + ' 物件照片">'
      : '<div class="no-photo">照片整理中</div>';
    var unit = l.deal === "sell" && l.unit
      ? '<span class="lc-unit">' + esc(l.unit) + '萬/坪</span>' : "";
    var pitch = l.pitch.length ? '<div class="lc-pitch">' + esc(l.pitch[0]) + "</div>" : "";
    return (
      '<a class="listing-card" href="listing.html?sno=' + encodeURIComponent(l.sno) + '">' +
      '<div class="lc-photo"><span class="seal ' + sealClass(l) + '">' + sealChar(l) + "</span>" + photo + "</div>" +
      '<div class="lc-body">' +
      '<h3 class="lc-title">' + esc(l.name) + "</h3>" +
      '<div class="lc-meta"><span>' + esc(l.district) + "</span><span>" + esc(l.kind) + "</span>" +
      (l.layout ? "<span>" + esc(l.layout) + "</span>" : "") +
      "<span>" + l.size + "坪</span></div>" +
      pitch +
      '<div class="lc-price-row"><span class="lc-price ' + priceClass(l) + '">' + fmtPrice(l) + "</span>" + unit + "</div>" +
      "</div></a>"
    );
  }

  function renderCards(el, items) {
    el.innerHTML = items.map(cardHTML).join("");
  }

  /* ---------- 首頁 ---------- */

  function initHome() {
    var featured = L.filter(function (l) { return l.deal === "sell" && l.photos.length; })
      .sort(byNewest);
    var heroL = featured[0];
    var heroEl = document.getElementById("hero-feature");
    if (heroEl && heroL) {
      heroEl.href = "listing.html?sno=" + encodeURIComponent(heroL.sno);
      heroEl.innerHTML =
        '<img src="' + coverUrl(heroL) + '" alt="' + esc(heroL.name) + ' 精選物件">' +
        '<div class="hf-caption"><span class="hf-name">' + esc(heroL.name) + "</span>" +
        '<span class="hf-price">' + fmtPrice(heroL) + "</span></div>";
    }
    renderCards(document.getElementById("featured-grid"), featured.slice(1, 7));
    var rent = L.filter(function (l) { return l.deal === "rent" && l.photos.length; })
      .sort(byNewest).slice(0, 3);
    renderCards(document.getElementById("rent-grid"), rent);
  }

  /* ---------- 物件列表頁 ---------- */

  function initList() {
    var state = { deal: "all", kind: "", district: "", sort: "new" };
    var params = new URLSearchParams(location.search);
    if (params.get("deal") === "sell" || params.get("deal") === "rent") state.deal = params.get("deal");

    var kinds = [], districts = [];
    L.forEach(function (l) {
      if (l.kind && kinds.indexOf(l.kind) < 0) kinds.push(l.kind);
      if (l.district && districts.indexOf(l.district) < 0) districts.push(l.district);
    });

    var kindSel = document.getElementById("f-kind");
    var distSel = document.getElementById("f-district");
    var sortSel = document.getElementById("f-sort");
    kinds.forEach(function (k) { kindSel.add(new Option(k, k)); });
    districts.forEach(function (d) { distSel.add(new Option(d, d)); });

    var grid = document.getElementById("list-grid");
    var count = document.getElementById("f-count");
    var toggles = document.querySelectorAll(".deal-toggle button");

    function apply() {
      var items = L.filter(function (l) {
        return (state.deal === "all" || l.deal === state.deal) &&
          (!state.kind || l.kind === state.kind) &&
          (!state.district || l.district === state.district);
      });
      if (state.sort === "new") items.sort(byNewest);
      if (state.sort === "priceAsc") items.sort(function (a, b) { return a.price - b.price; });
      if (state.sort === "priceDesc") items.sort(function (a, b) { return b.price - a.price; });
      if (state.sort === "sizeDesc") items.sort(function (a, b) { return b.size - a.size; });
      renderCards(grid, items);
      count.textContent = "共 " + items.length + " 筆物件";
      toggles.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.deal === state.deal));
      });
    }

    toggles.forEach(function (b) {
      b.addEventListener("click", function () { state.deal = b.dataset.deal; apply(); });
    });
    kindSel.addEventListener("change", function () { state.kind = kindSel.value; apply(); });
    distSel.addEventListener("change", function () { state.district = distSel.value; apply(); });
    sortSel.addEventListener("change", function () { state.sort = sortSel.value; apply(); });
    apply();
  }

  /* ---------- 物件詳情頁 ---------- */

  var SPEC_GROUPS = [
    ["基本資料", [
      ["案址", "案址"], ["種類", "種類"], ["格局", "格局"], ["樓別", "樓別"],
      ["屋齡", "屋齡"], ["物況", "現況"], ["車位", "車位"], ["邊間", "邊間"],
      ["租金", "租金"], ["押金", "押金"], ["單價", "單價"]
    ]],
    ["坪數與建物", [
      ["建坪", "建物登記"], ["地坪", "地坪"], ["主建", "主建物"], ["附屬", "附屬建物"],
      ["公設", "公設"], ["公比", "公設比"], ["建材", "建築結構"], ["外牆", "外牆建材"],
      ["地板", "室內地板"], ["用途", "登記用途"], ["地下", "地下樓層"]
    ]],
    ["管理與環境", [
      ["警衛", "管理員"], ["中庭", "中庭花園"], ["管理", "管理費"],
      ["學區1", "學區"], ["學區2", "學區(二)"], ["公園", "公園"], ["市場", "市場"],
      ["捷運", "捷運"], ["站名", "站名"]
    ]]
  ];

  function initDetail() {
    var sno = new URLSearchParams(location.search).get("sno");
    var l = null;
    L.forEach(function (x) { if (x.sno === sno) l = x; });
    var root = document.getElementById("detail-root");
    if (!l) {
      root.innerHTML =
        '<div class="wrap section"><h1>找不到這筆物件</h1>' +
        '<p>物件可能已成交或下架。<a href="listings.html">回物件列表</a> 看看其他好房子。</p></div>';
      return;
    }

    document.title = l.name + "｜" + C.name;

    var extras = [];
    if (l.address) extras.push(["案址", l.address]);
    if (l.floor) extras.push(["樓別", l.floor]);
    if (l.age) extras.push(["屋齡", l.age]);
    extras.forEach(function (pair) {
      var key = { "案址": "案址", "樓別": "樓別", "屋齡": "屋齡" }[pair[0]];
      if (key && !l.spec[key]) l.spec[key] = pair[1];
    });

    var mainPhoto = l.photos.length
      ? '<img id="g-main" src="' + photoUrl(l.photos[0]) + '" alt="' + esc(l.name) + ' 照片">'
      : '<div class="no-photo">照片整理中</div>';
    var thumbs = l.photos.map(function (p, i) {
      return '<button type="button" class="' + (i === 0 ? "active" : "") + '" data-src="' + photoUrl(p) +
        '" aria-label="第' + (i + 1) + '張照片"><img loading="lazy" src="' + photoUrl(p) + '" alt=""></button>';
    }).join("");

    var pitch = l.pitch.length
      ? '<div class="pitch-card"><div class="eyebrow">本 案 特 色</div><ul>' +
        l.pitch.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>"
      : "";

    var specHTML = SPEC_GROUPS.map(function (g) {
      var rows = g[1].map(function (pair) {
        var v = l.spec[pair[0]];
        if (!v) return "";
        return '<tr><td class="k">' + pair[1] + "</td><td>" + esc(v) + "</td></tr>";
      }).join("");
      if (!rows) return "";
      return '<div class="spec-card"><h2>' + g[0] + "</h2><table><tbody>" + rows + "</tbody></table></div>";
    }).join("");

    var mapLink = l.lat
      ? '<a class="map-link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' +
        l.lat + "," + l.lng + '">📍 在 Google 地圖上查看位置</a>'
      : "";

    var related = L.filter(function (x) {
      return x.sno !== l.sno && x.district === l.district && x.deal === l.deal && x.photos.length;
    }).sort(byNewest).slice(0, 3);

    root.innerHTML =
      '<div class="wrap detail-top">' +
      '<nav class="crumbs"><a href="index.html">首頁</a> ／ ' +
      '<a href="listings.html?deal=' + l.deal + '">' + (l.deal === "rent" ? "出租物件" : "出售物件") + "</a> ／ " +
      esc(l.name) + "</nav>" +
      '<div class="detail-head">' +
      '<span class="seal-inline ' + sealClass(l) + '">' + sealChar(l) + "</span>" +
      "<h1>" + esc(l.name) + "</h1>" +
      '<span class="detail-price ' + priceClass(l) + '">' + fmtPrice(l) + "</span>" +
      "</div>" +
      '<div class="detail-sub">' + esc(l.district) + "・" + esc(l.kind) +
      (l.layout ? "・" + esc(l.layout) : "") + "・" + l.size + "坪　" + mapLink + "</div>" +
      '<div class="detail-grid">' +
      "<div>" +
      '<div class="gallery-main">' + mainPhoto + "</div>" +
      (l.photos.length > 1 ? '<div class="gallery-thumbs">' + thumbs + "</div>" : "") +
      (l.videos && l.videos.length ? '<section class="listing-videos"><h2>物件影片</h2>' +
        l.videos.map(function (src) { return '<video controls preload="metadata" src="' + esc(src) + '">您的瀏覽器不支援影片播放。</video>'; }).join("") +
        '</section>' : "") +
      "</div>" +
      "<div>" + pitch + specHTML +
      '<div class="contact-card">' +
      '<div class="cc-name">' + esc(C.storeName) + "</div>" +
      '<a class="cc-tel" href="tel:' + C.tel.replace(/-/g, "") + '">' + C.tel + "</a>" +
      '<a class="btn btn-primary" href="tel:' + C.tel.replace(/-/g, "") + '">來電洽詢這個物件</a>' +
      '<div class="cc-links">' +
      '<a class="btn btn-ghost btn-line" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=' +
      encodeURIComponent(location.origin + location.pathname + "?sno=" + encodeURIComponent(l.sno)) + '">LINE 傳給好友</a>' +
      '<a class="btn btn-ghost" target="_blank" href="print.html?sno=' + encodeURIComponent(l.sno) + '">列印 DM</a>' +
      "</div>" +
      '<div class="cc-note">經紀人：' + esc(C.broker) + "｜" + esc(C.brokerLicense) + "</div>" +
      "</div>" +
      "</div></div>" +
      (related.length
        ? '<div class="section"><div class="section-head"><h2>同區推薦</h2><span class="en">Nearby</span>' +
          '<a class="more" href="listings.html?deal=' + l.deal + '">看更多 →</a></div>' +
          '<div class="card-grid">' + related.map(cardHTML).join("") + "</div></div>"
        : "") +
      "</div>";

    var main = document.getElementById("g-main");
    root.querySelectorAll(".gallery-thumbs button").forEach(function (b) {
      b.addEventListener("click", function () {
        if (main) main.src = b.dataset.src;
        root.querySelectorAll(".gallery-thumbs button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
      });
    });
  }

  /* ---------- 頁尾社群連結（LINE / Facebook 之後補上） ---------- */

  function initSns() {
    var line = document.getElementById("sns-line");
    var fb = document.getElementById("sns-fb");
    if (line) {
      if (C.line) { line.href = C.line; line.classList.remove("pending"); }
      else { line.removeAttribute("href"); line.title = "LINE 連結即將上線"; }
    }
    if (fb) {
      if (C.facebook) { fb.href = C.facebook; fb.classList.remove("pending"); }
      else { fb.removeAttribute("href"); fb.title = "Facebook 連結即將上線"; }
    }
  }

  /* ---------- 試配色切換器（選定後可移除） ---------- */

  var THEMES = [
    { id: "sign", label: "正紅", color: "#BE2418" },
    { id: "crimson", label: "深紅", color: "#971A1A" },
    { id: "brick", label: "磚紅", color: "#B0402A" },
    { id: "rose", label: "胭脂紅", color: "#8F1F3E" }
  ];

  function initThemePicker() {
    var saved = null;
    try { saved = localStorage.getItem("dw-theme"); } catch (e) {}
    var valid = THEMES.some(function (t) { return t.id === saved; });
    if (valid && saved !== "sign") document.documentElement.setAttribute("data-theme", saved);

    var box = document.createElement("div");
    box.className = "theme-picker";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "試配色");
    box.innerHTML = '<span class="tp-label">試配色</span>' + THEMES.map(function (t) {
      return '<button type="button" data-theme-id="' + t.id + '" title="' + t.label +
        '" aria-label="' + t.label + '" style="background:' + t.color + '"></button>';
    }).join("");
    document.body.appendChild(box);

    function mark() {
      var cur = document.documentElement.getAttribute("data-theme") || "sign";
      box.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.themeId === cur);
      });
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var id = b.dataset.themeId;
      if (id === "sign") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", id);
      try { localStorage.setItem("dw-theme", id); } catch (err) {}
      mark();
    });
    mark();
  }

  /* ---------- 啟動 ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    initSns();
    initThemePicker();
    loadListings().then(function (items) {
      L = items;
      var page = document.body.dataset.page;
      if (page === "home") initHome();
      if (page === "list") initList();
      if (page === "detail") initDetail();
    });
  });
})();
