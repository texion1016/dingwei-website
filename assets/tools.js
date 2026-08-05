/* 鼎瑋不動產 — 試算工具（稅率依 2026/民國115年 現行規定，數值僅供參考）
   資料來源：財政部賦稅署 115 年遺贈稅公告、土地稅法、契稅條例、所得稅法 4-4/14-4 條 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  function num(id) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? 0 : v;
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("zh-TW");
  }

  function show(id, html) {
    var el = $(id);
    el.innerHTML = html;
    el.classList.add("has-result");
  }

  /* ---------- 一、房屋貸款試算 ---------- */

  window.calcLoan = function () {
    var P = num("loan_amt") * 10000;      // 貸款金額(萬→元)
    var years = num("loan_years");
    var rate = num("loan_rate") / 100;    // 年利率
    var grace = num("loan_grace");        // 寬限期(年)
    if (P <= 0 || years <= 0 || rate < 0) { show("loan_result", "請填寫貸款金額、年限與利率。"); return; }
    if (grace >= years) { show("loan_result", "寬限期必須小於貸款年限。"); return; }

    var i = rate / 12;
    var nAll = years * 12;
    var nG = grace * 12;
    var n = nAll - nG;                    // 攤還期數
    var interestOnly = P * i;             // 寬限期每月(只繳息)

    // 本息平均攤還
    var pay = i > 0 ? P * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1) : P / n;
    var totalInterest1 = pay * n + interestOnly * nG - P;

    // 本金平均攤還
    var principalPart = P / n;
    var first = principalPart + P * i;
    var last = principalPart + principalPart * i;
    var totalInterest2 = (P * i * (n + 1)) / 2 * 1 + interestOnly * nG; // 等差利息總和

    var html =
      '<div class="rs-row"><span>本息平均攤還（每月固定）</span><b>' + fmt(pay) + " 元/月</b></div>" +
      '<div class="rs-row"><span>　└ 總利息</span><b>' + fmt(totalInterest1) + " 元</b></div>" +
      '<div class="rs-row"><span>本金平均攤還（逐月遞減）</span><b>首月 ' + fmt(first) + " → 末月 " + fmt(last) + " 元</b></div>" +
      '<div class="rs-row"><span>　└ 總利息</span><b>' + fmt(totalInterest2) + " 元</b></div>";
    if (nG > 0) html = '<div class="rs-row"><span>寬限期內（只繳息，共 ' + nG + ' 期）</span><b>' + fmt(interestOnly) + " 元/月</b></div>" + html;
    show("loan_result", html);
  };

  /* ---------- 二、土地增值稅 ---------- */
  /* 速算公式（臺北市稅捐稽徵處公告版）
     a = 漲價總數額；b = 前次移轉現值 × 物價指數
     第1級(倍數<1)：a×20%
     第2級(1≤倍數<2)：<20年 a×30%−b×10%｜≥20年 a×28%−b×8%｜≥30年 a×27%−b×7%｜≥40年 a×26%−b×6%
     第3級(倍數≥2)：<20年 a×40%−b×30%｜≥20年 a×36%−b×24%｜≥30年 a×34%−b×21%｜≥40年 a×32%−b×18%
     自用住宅用地：a×10% */

  window.calcLvit = function () {
    var now = num("lvit_now");            // 申報移轉現值總額(元)
    var prev = num("lvit_prev");          // 前次移轉現值總額(元)
    var cpi = num("lvit_cpi") || 100;     // 物價指數(%)
    var hold = $("lvit_hold").value;      // 持有年數
    var use = $("lvit_use").value;        // general / self
    if (now <= 0 || prev <= 0) { show("lvit_result", "請填寫申報移轉現值與前次移轉現值。"); return; }

    var b = prev * cpi / 100;
    var a = now - b;
    if (a <= 0) { show("lvit_result", "漲價總數額為 0 或負數，免徵土地增值稅。"); return; }
    var multiple = a / b;

    var tax, desc;
    if (use === "self") {
      tax = a * 0.10;
      desc = "自用住宅用地優惠稅率 10%";
    } else if (multiple < 1) {
      tax = a * 0.20;
      desc = "第一級（漲價未達一倍）稅率 20%";
    } else {
      var t2 = { "0": [0.30, 0.10], "20": [0.28, 0.08], "30": [0.27, 0.07], "40": [0.26, 0.06] }[hold];
      var t3 = { "0": [0.40, 0.30], "20": [0.36, 0.24], "30": [0.34, 0.21], "40": [0.32, 0.18] }[hold];
      if (multiple < 2) {
        tax = a * t2[0] - b * t2[1];
        desc = "第二級（漲價一倍以上未達二倍）" + (hold === "0" ? "" : "，長期持有減徵");
      } else {
        tax = a * t3[0] - b * t3[1];
        desc = "第三級（漲價二倍以上）" + (hold === "0" ? "" : "，長期持有減徵");
      }
    }
    show("lvit_result",
      '<div class="rs-row"><span>漲價總數額</span><b>' + fmt(a) + " 元</b></div>" +
      '<div class="rs-row"><span>漲價倍數</span><b>' + multiple.toFixed(2) + " 倍</b></div>" +
      '<div class="rs-row"><span>適用級距</span><b>' + desc + "</b></div>" +
      '<div class="rs-row total"><span>應納土地增值稅</span><b>' + fmt(tax) + " 元</b></div>" +
      '<p class="rs-note">自用住宅稅率需符合「一生一次／一生一屋」等要件；物價指數請以稅單或申報當期公告為準。</p>');
  };

  /* ---------- 三、契稅 ---------- */

  window.calcDeed = function () {
    var v = num("deed_value");            // 房屋評定標準價格(元)
    var kind = $("deed_kind").value;
    if (v <= 0) { show("deed_result", "請填寫房屋評定標準價格（申報契價）。"); return; }
    var rates = { sale: [0.06, "買賣 6%"], gift: [0.06, "贈與 6%"], occupy: [0.06, "占有 6%"], dian: [0.04, "典權 4%"], exchange: [0.02, "交換 2%"], split: [0.02, "分割 2%"] };
    var r = rates[kind];
    show("deed_result",
      '<div class="rs-row"><span>契稅種類／稅率</span><b>' + r[1] + "</b></div>" +
      '<div class="rs-row total"><span>應納契稅</span><b>' + fmt(v * r[0]) + " 元</b></div>");
  };

  /* ---------- 四、遺產稅（115年現行）----------
     免稅額 1,333 萬；喪葬費 138 萬
     級距：淨額 ≤5,621萬 10%；5,621萬~1億1,242萬 15% (累進差額 281.05萬)；>1億1,242萬 20% (累進差額 843.15萬) */

  window.calcEstate = function () {
    var gross = num("es_total") * 10000;
    if (gross <= 0) { show("es_result", "請填寫遺產總額。"); return; }
    var W = 10000;
    var deduct = 138 * W;                                  // 喪葬費
    var items = ["喪葬費 138萬"];
    if ($("es_spouse").checked) { deduct += 553 * W; items.push("配偶 553萬"); }
    var kids = num("es_kids"); if (kids) { deduct += kids * 56 * W; items.push("直系卑親屬 " + kids + "人×56萬"); }
    var minors = num("es_minor_years"); if (minors) { deduct += minors * 56 * W; items.push("未成年加扣 " + minors + "年×56萬"); }
    var parents = num("es_parents"); if (parents) { deduct += parents * 138 * W; items.push("父母 " + parents + "人×138萬"); }
    var disabled = num("es_disabled"); if (disabled) { deduct += disabled * 693 * W; items.push("重度身心障礙 " + disabled + "人×693萬"); }
    var others = num("es_others"); if (others) { deduct += others * 56 * W; items.push("受扶養兄弟姊妹/祖父母 " + others + "人×56萬"); }

    var exempt = 1333 * W;
    var net = gross - exempt - deduct;
    var tax = 0, bracket = "未達課稅門檻";
    if (net > 0) {
      if (net <= 56210000) { tax = net * 0.10; bracket = "10%"; }
      else if (net <= 112420000) { tax = net * 0.15 - 2810500; bracket = "15%（減累進差額 281.05萬）"; }
      else { tax = net * 0.20 - 8431500; bracket = "20%（減累進差額 843.15萬）"; }
    }
    show("es_result",
      '<div class="rs-row"><span>免稅額</span><b>1,333 萬</b></div>' +
      '<div class="rs-row"><span>扣除額合計</span><b>' + fmt(deduct) + " 元<br><small>" + items.join("＋") + "</small></b></div>" +
      '<div class="rs-row"><span>課稅遺產淨額</span><b>' + fmt(Math.max(0, net)) + " 元</b></div>" +
      '<div class="rs-row"><span>適用稅率</span><b>' + bracket + "</b></div>" +
      '<div class="rs-row total"><span>應納遺產稅</span><b>' + fmt(Math.max(0, tax)) + " 元</b></div>" +
      '<p class="rs-note">依 115 年公告數額試算；不含不計入遺產總額項目（如日常生活必需器具 100 萬、職業上工具 56 萬）與其他未成年人、農地等特殊扣除，實際以國稅局核定為準。</p>');
  };

  /* ---------- 五、贈與稅（115年現行）----------
     免稅額每年 244 萬
     級距：淨額 ≤2,811萬 10%；2,811萬~5,621萬 15% (累進差額 140.55萬)；>5,621萬 20% (累進差額 421.6萬) */

  window.calcGift = function () {
    var gross = num("gift_total") * 10000;
    if (gross <= 0) { show("gift_result", "請填寫本年度贈與總額。"); return; }
    var net = gross - 2440000;
    var tax = 0, bracket = "未超過免稅額";
    if (net > 0) {
      if (net <= 28110000) { tax = net * 0.10; bracket = "10%"; }
      else if (net <= 56210000) { tax = net * 0.15 - 1405500; bracket = "15%（減累進差額 140.55萬）"; }
      else { tax = net * 0.20 - 4216000; bracket = "20%（減累進差額 421.6萬）"; }
    }
    show("gift_result",
      '<div class="rs-row"><span>免稅額（每人每年）</span><b>244 萬</b></div>' +
      '<div class="rs-row"><span>課稅贈與淨額</span><b>' + fmt(Math.max(0, net)) + " 元</b></div>" +
      '<div class="rs-row"><span>適用稅率</span><b>' + bracket + "</b></div>" +
      '<div class="rs-row total"><span>應納贈與稅</span><b>' + fmt(Math.max(0, tax)) + " 元</b></div>" +
      '<p class="rs-note">免稅額以「贈與人」每年合計 244 萬計算；夫妻相互贈與、子女婚嫁各 100 萬另有規定，實際以國稅局核定為準。</p>');
  };

  /* ---------- 六、房地合一稅 2.0（境內個人）----------
     持有 ≤2年 45%｜2~5年 35%｜5~10年 20%｜>10年 15%
     自住優惠：課稅所得 400 萬以內免稅，超過部分 10%
     費用未逐項舉證：按成交價 3% 推計，上限 30 萬 */

  window.calcHouse = function () {
    var priceW = num("hl_price");
    var costW = num("hl_cost");
    var feeW = num("hl_fee");
    var landW = num("hl_land");
    var hold = $("hl_hold").value;
    var selfUse = $("hl_self").checked;
    if (priceW <= 0 || costW <= 0) { show("hl_result", "請填寫成交價額與取得成本。"); return; }
    var W = 10000;
    var price = priceW * W, cost = costW * W, land = landW * W;
    var fee = feeW > 0 ? feeW * W : Math.min(price * 0.03, 300000);
    var feeNote = feeW > 0 ? "" : "（未填寫，按成交價 3% 推計，上限 30 萬）";
    var income = price - cost - fee - land;
    if (income <= 0) {
      show("hl_result", '<div class="rs-row total"><span>課稅所得</span><b>0 元（無所得，免納）</b></div>');
      return;
    }
    var html =
      '<div class="rs-row"><span>可減除費用</span><b>' + fmt(fee) + " 元" + feeNote + "</b></div>" +
      '<div class="rs-row"><span>課稅所得</span><b>' + fmt(income) + " 元</b></div>";
    if (selfUse) {
      var taxable = Math.max(0, income - 4000000);
      html += '<div class="rs-row"><span>自住優惠</span><b>免稅 400 萬，超過部分 10%</b></div>' +
        '<div class="rs-row total"><span>應納稅額</span><b>' + fmt(taxable * 0.10) + " 元</b></div>" +
        '<p class="rs-note">自住優惠需本人/配偶/未成年子女設籍且連續居住滿 6 年、無出租營業，且 6 年內以一次為限。</p>';
    } else {
      var rates = { "2": [0.45, "持有 2 年以內 45%"], "5": [0.35, "持有超過 2 年未逾 5 年 35%"], "10": [0.20, "持有超過 5 年未逾 10 年 20%"], "99": [0.15, "持有超過 10 年 15%"], "force": [0.20, "非自願因素出售 20%"] };
      var r = rates[hold];
      html += '<div class="rs-row"><span>適用稅率</span><b>' + r[1] + "</b></div>" +
        '<div class="rs-row total"><span>應納稅額</span><b>' + fmt(income * r[0]) + " 元</b></div>";
    }
    html += '<p class="rs-note">適用 110 年 7 月後取得之房地（房地合一 2.0）；重購退稅、繼承取得等另有規定，申報前請洽國稅局或本公司。</p>';
    show("hl_result", html);
  };
})();
