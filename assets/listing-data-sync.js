/* 同一案件的「物件管理」与「售租屋资料」共用栏位同步规则。 */
(function () {
  "use strict";

  const SPEC_TO_DOC = {
    "\u7269\u6cc1": "condition_status",
    "\u7ba1\u7406": "management_fee",
    "\u5efa\u6750": "main_material",
    "\u5916\u7246": "exterior_material",
    "\u5730\u677f": "floor_material",
    "\u7528\u9014": "building_use",
    "\u8b66\u885b": "security",
    "\u4e2d\u5ead": "courtyard",
    "\u516c\u6bd4": "public_ratio",
    "\u4e3b\u5efa": "main_area",
    "\u9644\u5c6c": "attached_area",
    "\u516c\u8a2d": "common_area",
    "\u5b78\u53401": "school_zone",
    "\u5e02\u5834": "market",
    "\u516c\u5712": "park",
    "\u6377\u904b": "transportation",
    "\u671d\u5411": "direction"
  };

  const aliases = [
    ["doorplate", "building_doorplate"],
    ["deal", "trade_type"],
    ["registered_area", "house_area", "total_area"],
    ["land_area", "land_base_area"],
    ["summary_features", "feature_notes"]
  ];

  const text = (value) => value === undefined || value === null ? "" : String(value);
  const first = (...values) => values.map(text).find((value) => value.trim() !== "") || "";
  const numeric = (value) => {
    const parsed = Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const asDeal = (value, fallback = "sell") => {
    const raw = text(value);
    if (raw === "rent" || raw.indexOf("\u79df") >= 0) return "rent";
    if (raw === "sell" || raw.indexOf("\u8cb7") >= 0 || raw.indexOf("\u552e") >= 0) return "sell";
    return fallback === "rent" ? "rent" : "sell";
  };
  const asYesNo = (value) => /^(true|1|yes|\u6709)$/i.test(text(value).trim());
  const asChineseDeal = (deal) => deal === "rent" ? "\u79df\u8cc3" : "\u8cb7\u8ce3";

  function syncAliases(doc, sourceKey) {
    aliases.forEach((group) => {
      if (sourceKey && group.includes(sourceKey)) {
        const current = text(doc[sourceKey]);
        group.forEach((key) => { doc[key] = current; });
        return;
      }
      const current = first(...group.map((key) => doc[key]));
      group.forEach((key) => { doc[key] = current; });
    });
    return doc;
  }

  function applyListingToDocument(documentData, listing) {
    const doc = documentData || {};
    const spec = listing?.spec || {};
    const deal = asDeal(listing?.deal);
    const price = listing?.price ?? "";
    const size = listing?.size ?? "";
    const address = text(listing?.address);
    const features = Array.isArray(listing?.pitch) ? listing.pitch.filter(Boolean).join("\n") : "";

    Object.assign(doc, {
      doc_no: text(listing?.sno) + (listing?.name ? "/" + listing.name : ""),
      case_name: text(listing?.name),
      deal: asChineseDeal(deal),
      trade_type: asChineseDeal(deal),
      commission_total: text(price),
      monthly_rent: deal === "rent" ? text(price) : "",
      doorplate: address,
      building_doorplate: address,
      property_type: text(listing?.kind),
      registered_area: text(size),
      house_area: text(size),
      total_area: text(size),
      layout_detail: text(listing?.layout),
      sales_floor: text(listing?.floor),
      parking_info: listing?.parking ? "\u6709" : "\u7121",
      latitude: text(listing?.lat),
      longitude: text(listing?.lng),
      summary_features: features,
      feature_notes: features
    });

    Object.entries(SPEC_TO_DOC).forEach(([specKey, docKey]) => {
      doc[docKey] = text(spec[specKey]);
    });
    syncAliases(doc);
    return doc;
  }

  function patchListingFromDocument(doc, listing) {
    const deal = asDeal(first(doc.deal, doc.trade_type), listing?.deal);
    const price = deal === "rent" ? numeric(first(doc.monthly_rent, doc.commission_total)) : numeric(doc.commission_total);
    const size = numeric(first(doc.registered_area, doc.house_area, doc.total_area));
    const spec = { ...(listing?.spec || {}) };
    Object.entries(SPEC_TO_DOC).forEach(([specKey, docKey]) => {
      const value = text(doc[docKey]).trim();
      if (value) spec[specKey] = value;
      else delete spec[specKey];
    });
    const pitch = text(first(doc.summary_features, doc.feature_notes))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const lat = text(doc.latitude).trim();
    const lng = text(doc.longitude).trim();
    const parkingText = text(doc.parking_info).trim();
    const patch = {
      name: text(doc.case_name).trim(),
      deal,
      price,
      size,
      address: text(first(doc.doorplate, doc.building_doorplate)).trim(),
      kind: text(doc.property_type).trim(),
      layout: text(doc.layout_detail).trim(),
      floor: text(doc.sales_floor).trim(),
      parking: asYesNo(parkingText),
      pitch,
      spec,
      lat,
      lng,
      updated_at: new Date().toISOString()
    };
    patch.unit = deal === "sell" && size > 0 ? (price / size).toFixed(1) : "";
    return patch;
  }

  window.DW_LISTING_SYNC = {
    applyListingToDocument,
    patchListingFromDocument,
    syncAliases
  };
})();
