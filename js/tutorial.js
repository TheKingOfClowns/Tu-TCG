// ─── Guía por sección (spotlight: anillo + viñeta, sin overlay) ───────────
// ponytail: sin libs, sin botón (solo toggle perfil). Auto directo 1 vez por
// sección (flags sec_* en preferences + espejo localStorage). Tap = tu click
// real avanza; Siguiente siempre libre; gates validan con rojo + toast.
var TOUR_FLOWS = {
  home: [
    { sel: null, mode: "info", t: "tut.hh1t", d: "tut.hh1d", view: null },
    { sels: ["#sidebarHome", "#bottomHome"], mode: "info", t: "tut.hn1t", d: "tut.hn1d", view: null },
    { sels: ["#sidebarCatalog", "#bottomCatalog"], mode: "info", t: "tut.hn2t", d: "tut.hn2d", view: null },
    { sels: ["#sidebarColecciones", "#bottomColecciones"], mode: "info", t: "tut.hn3t", d: "tut.hn3d", view: null },
    { sels: ["#sidebarVenta", "#bottomVenta"], mode: "info", t: "tut.hn4t", d: "tut.hn4d", view: null },
    { sels: ["#sidebarExplore", "#bottomExplore"], mode: "info", t: "tut.hn5t", d: "tut.hn5d", view: null },
    { sels: ["#sidebarProfile", "#userBtn"], mode: "info", t: "tut.hn6t", d: "tut.hn6d", view: null },
    { sel: "#notifBell", mode: "info", t: "tut.hn7t", d: "tut.hn7d", view: null, when: "authed", soft: true },
    { sel: null, mode: "info", t: "tut.hh3t", d: "tut.hh3d", view: null }
  ],
  catalog: [
    { sel: null, mode: "info", t: "tut.hc1t", d: "tut.hc1d", view: "catalog" },
    { sel: "#catalogLangToggle", mode: "info", t: "tut.hc2t", d: "tut.hc2d", view: null },
    { sel: "#expansionFilter", mode: "info", t: "tut.hc3t", d: "tut.hc3d", view: null },
    { sel: "#colorFilter", mode: "info", t: "tut.hc4t", d: "tut.hc4d", view: null },
    { sel: "#rarityFilter", mode: "info", t: "tut.hc5t", d: "tut.hc5d", view: null },
    { sel: "#typeFilter", mode: "info", t: "tut.hc6t", d: "tut.hc6d", view: null },
    { sel: "#searchInput", mode: "info", t: "tut.hc7t", d: "tut.hc7d", view: null },
    { sel: ".viewopts-gear", mode: "info", t: "tut.hc8t", d: "tut.hc8d", view: null },
    { sel: "#catalogTargetSelect", mode: "tap", t: "tut.hc9t", d: "tut.hc9d", view: null },
    { sel: ".card-actions .plus-btn", mode: "tap", t: "tut.hc10t", d: "tut.hc10d", view: null, when: "plus" },
    { sel: "#catalogPagination", mode: "info", t: "tut.hc11t", d: "tut.hc11d", view: null }
  ],
  collections: [
    { sel: null, mode: "info", t: "tut.hs1t", d: "tut.hs1d", view: "collections" },
    { sel: "#createCollectionBtn", mode: "tap", t: "tut.hs2t", d: "tut.hs2d", view: null },
    { sel: "#createTrackingBtn", mode: "tap", t: "tut.hs3t", d: "tut.hs3d", view: null }
  ],
  create_binder: [
    { sel: "#createModalInput", mode: "info", t: "tut.hm1t", d: "tut.hm1d", view: null, needsModal: "createModalOverlay" },
    { sel: "#createColSubtype", mode: "tap", t: "tut.hm2t", d: "tut.hm2d", view: null, needsModal: "createModalOverlay" }
  ],
  create_venta: [
    { sel: "#createModalInput", mode: "info", t: "tut.hv1t", d: "tut.hv1d", view: null, needsModal: "createModalOverlay" }
  ],
  create_tracking: [
    { sel: "#trackingNameInput", mode: "info", t: "tut.ht1t", d: "tut.ht1d", view: null, needsModal: "trackingModalOverlay" },
    { sel: "#trackingTypeSelect", mode: "tap", t: "tut.ht2t", d: "tut.ht2d", view: null, needsModal: "trackingModalOverlay" },
    { sel: "#trackingExtraPanel", mode: "info", t: "tut.ht3t", d: "tut.ht3d", view: null, needsModal: "trackingModalOverlay", gate: "tracking" }
  ],
  binder: [
    { sel: "#binderTitle", mode: "info", t: "tut.hb1t", d: "tut.hb1d", view: null },
    { sel: "#binderPublicToggleContainer", mode: "info", t: "tut.hb2t", d: "tut.hb2d", view: null, soft: true },
    { sel: "#binderGrid .binder-empty", mode: "info", t: "tut.hb3t", d: "tut.hb3d", view: null },
    { sel: "#binderClearAllBtn", mode: "info", t: "tut.hb4t", d: "tut.hb4d", view: null },
    { sel: "#binderPagination", mode: "info", t: "tut.hb5t", d: "tut.hb5d", view: null }
  ],
  deck: [
    { sel: ".deck-leader-slot", mode: "tap", t: "tut.hd1t", d: "tut.hd1d", view: null, gate: "leader" },
    { sel: ".deck-main-grid", mode: "info", t: "tut.hd2t", d: "tut.hd2d", view: null, gate: "deck" },
    { sel: ".deck-don-row", mode: "info", t: "tut.hd3t", d: "tut.hd3d", view: null, gate: "leader" },
    { sel: ".deck-io-export", selAll: ".deck-io-btn", mode: "info", t: "tut.hd4t", d: "tut.hd4d", view: null, gate: "deck" },
    { sel: ".public-toggle", mode: "info", t: "tut.hd5t", d: "tut.hd5d", view: null, gate: "deck" },
    { sel: ".viewopts-gear", mode: "info", t: "tut.hd6t", d: "tut.hd6d", view: null, gate: "deck" },
    { sel: "#binderClearPageBtn", mode: "info", t: "tut.hd7t", d: "tut.hd7d", view: null, gate: "deck" },
    { sel: "#deckChangeLeaderBtn", mode: "info", t: "tut.hd8t", d: "tut.hd8d", view: null, gate: "deck" }
  ],
  tracking: [
    { sel: "#trackingFilters", mode: "info", t: "tut.hr1t", d: "tut.hr1d", view: null },
    { sel: "#trackingFilters [data-filter='missing']", mode: "tap", t: "tut.hr2t", d: "tut.hr2d", view: null },
    { sel: ".tracking-progress", mode: "info", t: "tut.hr3t", d: "tut.hr3d", view: null },
    { sel: "#trackingChecklistBtn", mode: "info", t: "tut.hr4t", d: "tut.hr4d", view: null },
    { sel: "#trackingMarkAllBtn", mode: "info", t: "tut.hr5t", d: "tut.hr5d", view: null }
  ],
  venta_list: [
    { sel: null, mode: "info", t: "tut.hl1t", d: "tut.hl1d", view: "ventaCols" },
    { sel: "#createVentaBtn", mode: "tap", t: "tut.hl2t", d: "tut.hl2d", view: null },
    { sel: ".binder-cover-actions", mode: "info", t: "tut.hl3t", d: "tut.hl3d", view: null }
  ],
  venta: [
    { sel: ".venta-price-input", mode: "info", t: "tut.hw1t", d: "tut.hw1d", view: null, soft: true },
    { sel: ".venta-currency-toggle", mode: "info", t: "tut.hw2t", d: "tut.hw2d", view: null, soft: true },
    { sel: ".venta-qty-btn", mode: "info", t: "tut.hw3t", d: "tut.hw3d", view: null, when: "ventaQty", soft: true },
    { sel: ".venta-slot", mode: "info", t: "tut.hw6t", d: "tut.hw6d", view: null, when: "ventaQty", soft: true },
    { sel: "#ventaClearAllBtn", mode: "info", t: "tut.hw4t", d: "tut.hw4d", view: null },
    { sel: "#ventaModeContainer", mode: "info", t: "tut.hw5t", d: "tut.hw5d", view: null }
  ],
  explore: [
    { sel: ".explore-tab", mode: "info", t: "tut.he1t", d: "tut.he1d", view: "explore" },
    { sel: "#exploreSearchInput", mode: "info", t: "tut.he2t", d: "tut.he2d", view: null },
    { sel: ".binder-cover-card", mode: "info", t: "tut.he3t", d: "tut.he3d", view: null }
  ],
  explore_detail: [
    { sels: [".explore-owner-name", ".explore-profile-btn"], mode: "info", t: "tut.he5t", d: "tut.he5d", view: null },
    { sel: ".explore-filter-btn[data-filter='missing']", mode: "info", t: "tut.he4t", d: "tut.he4d", view: null, when: "exploreTracking", wait: 20000 },
    { sel: ".explore-progress", mode: "info", t: "tut.he7t", d: "tut.he7d", view: null, when: "exploreTracking", wait: 20000 },
    { sel: ".explore-sale-totals", mode: "info", t: "tut.he8t", d: "tut.he8d", view: null, when: "exploreSale" },
    { sel: ".cart-row", mode: "info", t: "tut.he10t", d: "tut.he10d", view: null, when: "exploreSale" },
    { sel: ".viewopts-gear", mode: "info", t: "tut.he9t", d: "tut.he9d", view: null, when: "exploreSale" }
  ],
  profile: [
    { sel: "#profileContactPhone", mode: "info", t: "tut.hp1t", d: "tut.hp1d", view: "profile" },
    { sel: "#profileLanguage", mode: "info", t: "tut.hp2t", d: "tut.hp2d", view: null },
    { sel: "#crewGrid", mode: "info", t: "tut.hp4t", d: "tut.hp4d", view: null },
    { sel: "#profileShowTutorial", mode: "info", t: "tut.hp3t", d: "tut.hp3d", view: null }
  ]
};
var _tourFlow = null, _tourIdx = 0, _tourTapOff = null, _tourSteps = null, _tourSelfNav = false, _tourModalObs = null;
var _tourBusy = false, _tourSeq = 0; // ponytail: un solo paso vivo (doble-click/Siguiente+tap no cruzan textos)
var _tourWaitCancel = 0; // ponytail: Siguiente/Atrás en espera = skip manual (+1/-1), fin del tildado
var _tourWaitDir = 0;
var _tourWaiting = false; // ponytail: tramo con await cancelable (nav o ancla)

function tourUid() {
  try { return (typeof authUser !== "undefined" && authUser?.id) || "guest"; } catch (e) { return "guest"; }
}
function tourLsGet(k) { try { return localStorage.getItem("tutcg_tour_" + tourUid() + "_" + k); } catch (e) { return null; } }
function tourLsSet(k, v) { try { localStorage.setItem("tutcg_tour_" + tourUid() + "_" + k, v); } catch (e) {} }
function tourPrefs() {
  try { return (typeof currentProfile !== "undefined" && currentProfile?.preferences) || {}; } catch (e) { return {}; }
}
function tourMode() {
  // ponytail: once (default) / always / off; legacy show_tutorial booleano migra solo
  try {
    var p = tourPrefs();
    if (p.tutorial_mode === "always" || p.tutorial_mode === "off" || p.tutorial_mode === "once") return p.tutorial_mode;
    if (p.show_tutorial === false) return "off";
    return "once";
  } catch (e) { return "once"; }
}
function tourEnabled() { return tourMode() !== "off"; }
function tourFlowSeen(f) {
  if (tourMode() === "always") return false; // ponytail: Siempre = siempre muestra
  if (tourLsGet("sec_" + f) === "1") return true;
  var p = tourPrefs();
  return !!(p.tutorial_seen_sections && p.tutorial_seen_sections[f]);
}
function tourMarkSeen(f) {
  tourLsSet("sec_" + f, "1");
  // ponytail: cross-device en preferences JSONB, sin migración
  try {
    if (typeof isAuthenticated === "function" && isAuthenticated() &&
        typeof supabaseClient !== "undefined" && typeof currentProfile !== "undefined") {
      var prefs = Object.assign({}, tourPrefs());
      prefs.tutorial_seen_sections = Object.assign({}, prefs.tutorial_seen_sections);
      prefs.tutorial_seen_sections[f] = true;
      supabaseClient.from("profiles").update({ preferences: prefs }).eq("id", authUser.id).then(function() {
        if (typeof loadProfile === "function") loadProfile();
      });
    }
  } catch (e) {}
}
function tourTargets(sel) {
  // ponytail: todos los matches VISIBLES (para anillar grupos como Exportar+Importar)
  var out = [];
  try {
    if (!sel) return out;
    var list = document.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push(list[i]);
    }
  } catch (e) {}
  return out;
}
function tourTarget(sel) {
  // ponytail: primer match VISIBLE (hay gears/botones duplicados en panes ocultos)
  var all = tourTargets(sel);
  return all.length ? all[0] : null;
}
// espera la 1ª de varias (para sels); resuelve INSTANTÁNEO al encontrar.
// ponytail: fluido como antes; el anti-stale va post-anillado en tourStep.
function tourWaitAny(sels, timeout) {
  return new Promise(function(resolve) {
    var done = false;
    var timer = null, obs = null;
    var finish = function(list) {
      if (done) return; done = true;
      try { clearInterval(timer); } catch (e) {}
      try { obs.disconnect(); } catch (e) {}
      resolve(list);
    };
    var check = function() {
      if (done) return;
      if (_tourWaitCancel) { _tourWaitDir = _tourWaitCancel; _tourWaitCancel = 0; finish([]); return; } // ponytail: skip manual
      var found = [];
      (sels || []).forEach(function(s) { tourTargets(s).forEach(function(el) { found.push(el); }); });
      if (found.length) finish(found);
      else if (Date.now() >= deadline) finish(found);
    };
    var deadline = Date.now() + (timeout || 8000);
    try { obs = new MutationObserver(check); obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    timer = setInterval(check, 500); // ponytail: heartbeat lento, solo red de seguridad
    check();
  });
}
function tourRingList(list) {
  (list || []).forEach(function(a) { try { a.classList.add("tour-ring-on"); } catch (e) {} });
}
function tourUnringList(list) {
  (list || []).forEach(function(a) { try { a.classList.remove("tour-ring-on"); } catch (e) {} });
}
function tourVisible(list) {
  // ponytail: en documento Y con tamaño (el tourTargets ya filtra, esto es post-verify)
  try {
    return (list || []).filter(function(a) {
      try {
        if (!document.contains(a)) return false;
        var r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      } catch (e) { return false; }
    });
  } catch (e) { return []; }
}
function tourClearHi() {
  document.querySelectorAll(".tour-ring-on").forEach(function(el) { el.classList.remove("tour-ring-on"); });
  tourUnwatchModal();
  if (_tourTapOff) { try { _tourTapOff(); } catch (e) {} _tourTapOff = null; }
  window.removeEventListener("resize", tourPlace);
  window.removeEventListener("scroll", tourPlaceRaf, true);
  if (_tourRaf) { try { cancelAnimationFrame(_tourRaf); } catch (e) {} _tourRaf = 0; }
}
var TOUR_RIGHT_FLOWS = ["create_binder", "create_venta", "create_tracking", "venta_list", "venta"];
function tourPlace() {
  var card = document.getElementById("tourCard");
  if (!card || card.style.display === "none") return;
  // ponytail: 2 slots fijos. Modal+ventas→derecha (portadas y modales viven
  // centro-izq); resto→izquierda (solo tapa sidebar). Mobile: bottom-sheet.
  card.style.top = "50%";
  card.style.transform = "translateY(-50%)";
  card.style.bottom = "auto";
  card.style.width = Math.min(300, window.innerWidth - 24) + "px";
  if (window.innerWidth < 768) {
    card.style.top = "auto"; card.style.bottom = "8px";
    card.style.left = "8px"; card.style.right = "8px"; card.style.width = "auto";
    card.style.transform = "";
    return;
  }
  if (TOUR_RIGHT_FLOWS.indexOf(_tourFlow) !== -1) {
    card.style.left = "auto"; card.style.right = "12px";
  } else {
    card.style.left = "12px"; card.style.right = "auto";
  }
}
var _tourRaf = 0;
function tourPlaceRaf() {
  // ponytail: scroll re-posiciona por rAF, no por cada evento
  if (_tourRaf) return;
  try {
    _tourRaf = requestAnimationFrame(function() { _tourRaf = 0; tourPlace(); });
  } catch (e) { tourPlace(); }
}
function tourRender() {
  var steps = _tourSteps || (_tourFlow && TOUR_FLOWS[_tourFlow]) || null;
  var step = steps ? steps[_tourIdx] : null;
  if (!step) return;
  document.getElementById("tourTitle").textContent = t(step.t);
  document.getElementById("tourBody").textContent = t(step.d);
  document.getElementById("tourCount").textContent = t("tut.step_of", { a: _tourIdx + 1, b: steps.length });
  var next = document.getElementById("tourNext");
  if (next) next.textContent = (_tourIdx >= steps.length - 1) ? t("tut.finish") : t("tut.next");
}
function tourOnView(view) {
  // ponytail: evita navigateToView + skeleton si ya estás ahí
  try {
    var map = { catalog: "catalogView", collections: "collectionManager", binder: "binderView",
      ventaCols: "ventaManager", venta: "ventaView", explore: "exploreView",
      exploreDetail: "exploreDetailView", tcgHome: "welcomeView", profile: "profileView" };
    var el = view && map[view] ? document.getElementById(map[view]) : null;
    return !!(el && el.classList.contains("active"));
  } catch (e) { return false; }
}
function tourOpenDeck() {
  try {
    var id = (typeof currentCollectionId !== "undefined") ? currentCollectionId : null;
    var cols = (typeof collections !== "undefined") ? collections : {};
    var col = id ? cols[id] : null;
    return (col && col.subtype === "deck") ? col : null;
  } catch (e) { return null; }
}
function tourOpenTracking() {
  try {
    var id = (typeof currentCollectionId !== "undefined") ? currentCollectionId : null;
    var cols = (typeof collections !== "undefined") ? collections : {};
    var col = id ? cols[id] : null;
    return (col && col.subtype === "tracking") ? col : null;
  } catch (e) { return null; }
}
function tourModalOpen(id) {
  try { return document.getElementById(id)?.style.display === "flex"; } catch (e) { return false; }
}
function tourVentaMode() {
  try {
    var id = (typeof currentVentaId !== "undefined") ? currentVentaId : null;
    var cols = (typeof ventaCols !== "undefined") ? ventaCols : {};
    var col = id ? cols[id] : null;
    if (!col) return "stock";
    if (col.subtype === "deck") return "deck";
    return "stock";
  } catch (e) { return "stock"; }
}
// when: filtro al arrancar (numeración exacta, sin fantasmas); acepta fn
function tourWhenOk(step) {
  try {
    if (!step.when) return true;
    if (typeof step.when === "function") return !!step.when();
    if (step.when === "plus") return !!tourTarget(".card-actions .plus-btn");
    if (step.when === "authed") return (typeof isAuthenticated === "function") && isAuthenticated();
    if (step.when === "ventaQty") return tourVentaMode() === "stock";
    if (step.when === "exploreTracking") {
      var b = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
      var cfg = b ? (b.config || {}) : {};
      return cfg.subtype === "tracking";
    }
    if (step.when === "exploreSale") {
      var sb2 = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
      return !!sb2 && sb2.type === "sale";
    }
    return true;
  } catch (e) { return true; }
}
function tourFlagRed(sel, msgKey) {
  // ponytail: marca lo que falta en rojo, espejo de modals.js:43 (sin clase nueva)
  try {
    var el = sel ? tourTarget(sel) : null;
    if (el) {
      el.style.outline = "2px solid var(--danger)";
      setTimeout(function() { try { el.style.outline = ""; } catch (e) {} }, 1500);
      try { el.scrollIntoView({ block: "nearest" }); } catch (e) {}
    }
    if (msgKey && typeof showToast === "function") showToast(t(msgKey), "error");
  } catch (e) {}
}
// gate de SALIDA: Siguiente/tap no avanzan si falta dato (lo faltante va en rojo)
function tourGateOk(step) {
  if (!step.gate) return true;
  if (step.gate === "deck") {
    if (tourOpenDeck()) return true;
    if (tourModalOpen("createModalOverlay")) {
      var name = "";
      try { name = document.getElementById("createModalInput")?.value.trim() || ""; } catch (e) {}
      if (!name) { tourFlagRed("#createModalInput", "tut.need_name"); return false; }
      tourFlagRed("#createModalConfirm", "tut.need_confirm");
      return false;
    }
    tourFlagRed(null, "tut.need_open_deck");
    return false;
  }
  if (step.gate === "leader") {
    var col = tourOpenDeck();
    if (!col) { tourFlagRed(null, "tut.need_open_deck"); return false; }
    if (!col.leader) { tourFlagRed(".deck-leader-slot", "tut.need_leader"); return false; }
    return true;
  }
  if (step.gate === "tracking") {
    if (tourOpenTracking()) return true;
    if (tourModalOpen("trackingModalOverlay")) {
      var tname = "";
      try { tname = document.getElementById("trackingNameInput")?.value.trim() || ""; } catch (e) {}
      if (!tname) { tourFlagRed("#trackingNameInput", "tut.need_name"); return false; }
      tourFlagRed("#trackingModalConfirm", "tut.need_confirm");
      return false;
    }
    tourFlagRed(null, "tut.need_open_tracking");
    return false;
  }
  return true;
}
// gate de ENTRADA: sin contexto el flujo termina sin marcar; modal abierto vale
function tourEntryOk(step) {
  if (!step.gate) return true;
  if (step.gate === "deck" || step.gate === "leader") {
    return !!tourOpenDeck() || tourModalOpen("createModalOverlay");
  }
  if (step.gate === "tracking") return !!tourOpenTracking() || tourModalOpen("trackingModalOverlay");
  return true;
}
function tourAdvance() {
  if (!_tourFlow) return;
  var steps = _tourSteps || TOUR_FLOWS[_tourFlow];
  if (!steps) return;
  // ponytail: Terminar (último) cierra siempre; es guía, no examen
  if (_tourIdx >= steps.length - 1) { tourEnd(); return; }
  var step = steps[_tourIdx];
  if (step && !tourGateOk(step)) return;
  if (_tourBusy) { _tourWaitCancel = 1; return; } // ponytail: en vuelo, Siguiente = skip al resolver
  _tourIdx++;
  tourStep();
}
function tourGoBack() {
  if (!_tourFlow) return;
  if (_tourBusy) { _tourWaitCancel = -1; return; } // ponytail: en vuelo, Atrás = vuelve al resolver
  if (_tourIdx > 0) { _tourIdx--; tourStep(); }
}
// si cerrás el modal a mitad del flujo, el tour termina al instante sin marcar
function tourWatchModal(id) {
  tourUnwatchModal();
  if (!id) return;
  try {
    var ov = document.getElementById(id);
    if (!ov) return;
    _tourModalObs = new MutationObserver(function() {
      var open = false;
      try { open = ov.style.display === "flex"; } catch (e) {}
      if (!open && _tourFlow) { tourEnd(false); }
    });
    _tourModalObs.observe(ov, { attributes: true, attributeFilter: ["style"] });
  } catch (e) {}
}
function tourUnwatchModal() {
  if (_tourModalObs) { try { _tourModalObs.disconnect(); } catch (e) {} _tourModalObs = null; }
}
async function tourStep() {
  if (_tourBusy) return;
  _tourBusy = true; _tourWaitCancel = 0; _tourWaitDir = 0;
  var seq = ++_tourSeq;
  tourClearHi();
  tourUnwatchModal();
  // ponytail: card centrada no deja transform colgado del paso anterior
  var card0 = document.getElementById("tourCard");
  if (card0) card0.style.transform = "";
  var steps = _tourSteps || TOUR_FLOWS[_tourFlow];
  if (!steps || _tourIdx >= steps.length) { tourEnd(); return; }
  var step = steps[_tourIdx];
  _tourWaiting = true; // ponytail: desde acá todo await es cancelable (nav + ancla)
  if (step.view && !tourOnView(step.view) && typeof navigateToView === "function") {
    try { _tourSelfNav = true; await navigateToView(step.view, {}, {}); } catch (e) {}
    _tourSelfNav = false;
  }
  if (seq !== _tourSeq) return; // ponytail: instancia vieja, no pisa
  if (_tourWaitCancel) { // ponytail: skip pedido durante la navegación
    var dn = _tourWaitCancel; _tourWaitCancel = 0; _tourWaitDir = 0;
    _tourBusy = false; _tourWaiting = false; _tourIdx = Math.max(0, _tourIdx + dn); tourStep(); return;
  }
  if (!tourEntryOk(step)) { tourEnd(false); return; }
  // ponytail: exploreTracking se re-evalúa al llegar (dato ya asentado); skip instantáneo y logueado
  if ((step.when === "exploreTracking" || step.when === "exploreSale" || typeof step.when === "function") && !tourWhenOk(step)) {
    try { console.info("[tour] skip", _tourFlow, _tourIdx, step.t); } catch (e) {}
    _tourBusy = false; _tourIdx++; tourStep(); return;
  }
  var sels = step.sels || (step.selAll ? [step.selAll] : (step.sel ? [step.sel] : []));
  var anchor = sels.length ? sels[0] : null;
  var waitMs = step.wait || (step.soft ? 1500 : 8000);
  // ponytail: tarjeta con SU texto al instante (nunca la del paso anterior); el anillo llega después
  var card = document.getElementById("tourCard");
  card.setAttribute("data-sel", anchor || "");
  card.style.display = "block";
  tourRender();
  tourPlace(); // ponytail: posiciona SIEMPRE (con ancla o sin ella)
  tourWatchModal(step.needsModal);
  _tourWaiting = sels.length > 0;
  var found = sels.length ? await tourWaitAny(sels, waitMs) : [];
  _tourWaiting = false;
  if (seq !== _tourSeq) return; // ponytail: mientras esperaba, otro paso tomó el mando
  if (_tourWaitCancel) { // ponytail: skip pedido durante la espera del ancla
    var dw = _tourWaitCancel; _tourWaitCancel = 0; _tourWaitDir = 0;
    _tourBusy = false; _tourIdx = Math.max(0, _tourIdx + dw); tourStep(); return;
  }
  if (sels.length && !found.length && !step.soft) {
    var d = _tourWaitDir || 1; _tourWaitDir = 0; // ponytail: skip manual respeta dirección
    try { console.info("[tour] skip", _tourFlow, _tourIdx, step.t); } catch (e) {}
    _tourBusy = false; _tourIdx = Math.max(0, _tourIdx + d); tourStep(); return;
  } // ponytail: sin ancla = skip, nunca rompe
  var el = found.length ? found[0] : null;
  if (found.length) {
    var myFlowR = _tourFlow, myIdxR = _tourIdx, dlR = Date.now() + waitMs;
    tourRingList(found);
    try { found[0].scrollIntoView({ block: "nearest" }); } catch (e) {}
    tourPlace();
    window.addEventListener("resize", tourPlace);
    window.addEventListener("scroll", tourPlaceRaf, true);
    // ponytail: post-verify — si el render desprendió u ocultó el anillo, re-espera con lo que quede
    (function(ringed) {
      setTimeout(function() {
        if (_tourFlow !== myFlowR || _tourIdx !== myIdxR || seq !== _tourSeq) return;
        if (tourVisible(ringed).length === ringed.length) return;
        tourUnringList(ringed);
        var left = dlR - Date.now();
        if (left <= 0) return;
        tourWaitAny(sels, left).then(function(f2) {
          if (_tourFlow !== myFlowR || _tourIdx !== myIdxR || seq !== _tourSeq || !f2.length) return;
          tourRingList(f2);
          try { f2[0].scrollIntoView({ block: "nearest" }); } catch (e) {}
          tourPlace();
        });
      }, 300);
    })(found.slice());
  }
  if (step.mode === "tap" && el) {
    var myFlow = _tourFlow, myIdx = _tourIdx, mySeq = seq, tries = 0;
    var matchTap = function(t) {
      if (!t || !t.closest) return false;
      if (t.closest(anchor)) return true;
      for (var i = 0; i < sels.length; i++) { if (t.closest(sels[i])) return true; }
      return false;
    };
    var handler = function(e) {
      if (matchTap(e.target)) {
        document.removeEventListener("click", handler, true);
        _tourTapOff = null;
        var fire = function() {
          // ponytail: si el tap cambió de flujo o hay paso en vuelo, reintenta 3 veces y suelta
          if (_tourFlow !== myFlow || _tourIdx !== myIdx || seq !== _tourSeq) return;
          if (_tourBusy) { if (++tries < 3) setTimeout(fire, 400); return; }
          tourAdvance();
        };
        setTimeout(fire, 300); // ponytail: deja correr acción real primero
      }
    };
    document.addEventListener("click", handler, true);
    _tourTapOff = function() { document.removeEventListener("click", handler, true); };
  }
  _tourBusy = false;
}
function startTour(flow) {
  if (!TOUR_FLOWS[flow]) return;
  _tourSeq++; _tourBusy = false; _tourWaitCancel = 0; _tourWaitDir = 0; _tourWaiting = false; // ponytail: tour nuevo invalida renders viejos
  _tourFlow = flow; _tourIdx = 0;
  try { console.info("[tour] v18", flow); } catch (e) {} // ponytail: detector anti-caché
  // ponytail: when filtra al arrancar (numeración exacta); marca solo el fin
  try { _tourSteps = TOUR_FLOWS[flow].filter(tourWhenOk); } catch (e) { _tourSteps = TOUR_FLOWS[flow]; }
  tourStep();
}
function tourEnd(mark) {
  _tourSeq++; _tourBusy = false; _tourWaitCancel = 0; _tourWaitDir = 0; _tourWaiting = false; // ponytail: mata renders en vuelo
  if (_tourFlow && mark !== false) tourMarkSeen(_tourFlow);
  _tourFlow = null; _tourSteps = null;
  tourClearHi();
  var card = document.getElementById("tourCard");
  if (card) card.style.display = "none";
}
// ─── Disparo: primera visita por sección + modales crear ────────────────────
function tourSectionEnter(vista) {
  try {
    if (_tourSelfNav) return; // ponytail: navegación del propio tour no lo mata
    if (!window._tourProfileReady) { window._tourPendingView = vista; return; } // ponytail: sin perfil, tourMode miente (off parece once)
    if (_tourFlow) {
      // ponytail: cambiaste de sección a mitad del tour → cierra sin marcar y arranca la que toca
      var cur = _tourFlow;
      _tourFlow = null; _tourSteps = null; _tourSeq++; _tourBusy = false;
      tourClearHi();
      var card = document.getElementById("tourCard");
      if (card) card.style.display = "none";
      if (cur) tourSectionEnter(vista);
      return;
    }
    if (!tourEnabled()) return;
    var flow = null;
    if (vista === "home" || vista === "tcgHome") flow = "home";
    else if (vista === "catalog") flow = "catalog";
    else if (vista === "collections") flow = "collections";
    else if (vista === "binder") {
      var col = null;
      try {
        var id = (typeof currentCollectionId !== "undefined") ? currentCollectionId : null;
        col = (id && typeof collections !== "undefined") ? collections[id] : null;
      } catch (e) {}
      flow = !col ? null : col.subtype === "deck" ? "deck" : col.subtype === "tracking" ? "tracking" : "binder";
    }
    else if (vista === "ventaCols") flow = "venta_list";
    else if (vista === "venta") flow = "venta";
    else if (vista === "explore") flow = "explore";
    else if (vista === "exploreDetail") flow = "explore_detail";
    else if (vista === "profile") flow = "profile";
    if (!flow || tourFlowSeen(flow)) return;
    // ponytail: catálogo sin destinos = nada que tocar en tap, igual enseña (deriva)
    startTour(flow);
  } catch (e) {}
}
function tourModalEnter(kind) {
  try {
    if (!tourEnabled()) return;
    // ponytail: si abrís crear a mitad del repaso, el modal manda (toma el tour)
    if (_tourFlow && _tourFlow !== "collections" && _tourFlow !== "venta_list") return;
    if (_tourFlow) { var prev = _tourFlow; _tourFlow = null; _tourSeq++; _tourBusy = false; tourClearHi(); tourMarkSeen(prev); }
    var flow = null;
    if (kind === "tracking") flow = "create_tracking";
    else if (kind === "create") {
      var isVenta = false;
      try { var av = document.querySelector(".view-pane.active"); isVenta = !!(av && av.id === "ventaManager"); } catch (e) {}
      flow = isVenta ? "create_venta" : "create_binder";
    }
    if (!flow || tourFlowSeen(flow)) return;
    startTour(flow);
  } catch (e) {}
}

// ─── Wiring ─────────────────────────────────────────────────────────────────
document.getElementById("tourNext")?.addEventListener("click", function() { tourAdvance(); });
document.getElementById("tourBack")?.addEventListener("click", function() { tourGoBack(); });
document.getElementById("tourClose")?.addEventListener("click", function() { tourEnd(); });
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape" && _tourFlow) tourEnd();
});
document.getElementById("profileLanguage")?.addEventListener("change", function() {
  try { if (_tourFlow) tourRender(); } catch (e) {}
});
if (typeof onAuthChange === "function") onAuthChange(async function(user) {
  // ponytail: perfil primero para respetar toggle; home hace bienvenida
  try {
    if (user && !_tourFlow && typeof loadProfile === "function") { try { await loadProfile(); } catch (e) {} }
    window._tourProfileReady = true;
    tourReplayPending();
    if (!user || _tourFlow) return;
    if (!tourEnabled() || tourFlowSeen("home")) return;
    setTimeout(function() { if (!_tourFlow && tourEnabled() && !tourFlowSeen("home")) startTour("home"); }, 1500);
  } catch (e) { window._tourProfileReady = true; tourReplayPending(); }
});
function tourReplayPending() {
  try {
    var v = window._tourPendingView || null;
    window._tourPendingView = null;
    if (v && !_tourFlow && typeof tourSectionEnter === "function") tourSectionEnter(v);
  } catch (e) {}
}
// ponytail: si auth nunca resuelve (invitado sin evento), no colgar el tour
setTimeout(function() { if (!window._tourProfileReady) { window._tourProfileReady = true; tourReplayPending(); } }, 4000);
