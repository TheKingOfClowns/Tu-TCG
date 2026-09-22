// ═══════════════════════════════════════════════════════════════════════════
//  TuTCG  –  Main Application
// ═══════════════════════════════════════════════════════════════════════════
var _DEBUG = false;
// ─── State ────────────────────────────────────────────────────────────────
const cardsContainer = document.getElementById("cards-container");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const expansionFilter = document.getElementById("expansionFilter");
const colorFilter = document.getElementById("colorFilter");
const rarityFilter = document.getElementById("rarityFilter");
const sortFilter = document.getElementById("sortFilter");
const typeFilter = document.getElementById("typeFilter");
const prevBtnBottom = document.getElementById("prevBtnBottom");
const nextBtnBottom = document.getElementById("nextBtnBottom");
const pageInfoBottom = document.getElementById("pageInfoBottom");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const resultsCounter = document.getElementById("resultsCounter");
function isUnlimited(card) { return card && unlimitedCards.has(card.card_set_id); }
function fuzzySearch(cards, query, fields) {
  if (!fields) fields = ['card_name', 'card_set_id', 'set_name'];
  if (!query || !query.trim()) return cards;
  var terms = query.toLowerCase().split(/\s+/).filter(function(t) { return t.length > 1; });
  if (terms.length === 0) return cards;
  return cards.filter(function(card) {
    var fullCard = cartasMap[card._key] || card;
    var searchable = fields.map(function(f) { return (fullCard[f] || ''); }).join(' ').toLowerCase();
    return terms.every(function(term) { return searchable.includes(term); });
  });
}
let cartasFiltradas = [];
let currentPage = 1;
let cartas = [];
let setCategoryMap = {};
let cartasMap = {};
let pendingCards = {};
let binderPage = 1;
let currentTcg = "one-piece";
let pendingView = null;
let prbBadgeMap = {};
let tcgplayerMap = {};
let collections = {};
let currentCollectionId = null;
let ventaCols = {};
let currentVentaId = null;
let ventaPage = 1;
let addingToBinderId = null;
let addingToBinderName = null;
let addingToBinderType = null;
let rebuildingFilters = false;
let exploreDetailBinder = null;
let prb02CardlistLabels = null;
let _singleTcgMode = null;
async function isSingleTcgMode() {
  if (_singleTcgMode !== null) return _singleTcgMode;
  try {
    const res = await fetch("config/games.json");
    const config = await res.json();
    const enabledCount = Object.values(config).filter(g => g.enabled).length;
    _singleTcgMode = enabledCount === 1;
    return _singleTcgMode;
  } catch (e) {
    return false;
  }
}
async function loadPrb02Cardlist() {
  if (prb02CardlistLabels) return prb02CardlistLabels;
  try {
    const res = await fetch("data/games/onepiece/prb02_cardlist.txt");
    if (!res.ok) { prb02CardlistLabels = {}; return prb02CardlistLabels; }
    const text = await res.text();
    prb02CardlistLabels = {};
    const regex = /([^(#]+?)\s*\(([^)]+)\)\s*#\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)?)/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const id = m[3].trim().replace(/USD$/, "");
      if (!id) continue;
      if (!prb02CardlistLabels[id]) prb02CardlistLabels[id] = [];
      const variant = m[2].trim();
      if (variant !== "Reprint" && !prb02CardlistLabels[id].includes(variant)) {
        prb02CardlistLabels[id].push(variant);
      }
    }
  } catch (e) {
    prb02CardlistLabels = {};
  }
  return prb02CardlistLabels;
}
// ─── TCG Registry ─────────────────────────────────────────────────────────
const tcgList = [
  { id:"one-piece",   name:"One Piece",          color:"#d02d50", short:"OP", logo:"assets/logos/one-piece.webp" },
  { id:"pokemon",     name:"Pokémon",            color:"#ffcb05", short:"PK", logo:"assets/logos/pokemon.webp" },
  { id:"magic",       name:"Magic: The Gathering",color:"#b5a36a", short:"MTG", logo:"assets/logos/magic.webp" },
  { id:"digimon",     name:"Digimon",            color:"#f6a01a", short:"DG", logo:"assets/logos/digimon.webp" },
  { id:"dragon-ball", name:"Dragon Ball",        color:"#e84c22", short:"DB", logo:"assets/logos/dragon-ball.webp" },
  { id:"yugioh",      name:"Yu-Gi-Oh!",          color:"#c9a84c", short:"YG", logo:"assets/logos/yugioh.webp" },
];
// ─── Helpers ──────────────────────────────────────────────────────────────
// ponytail: la barra manda columnas/filas (0%→10×5, 100%→5×10); el px emerge. Móvil pinza columnas.
function gridColsRows(v, w) {
  var k = Math.max(0, Math.min(10, Math.round(((v == null || isNaN(v)) ? 50 : v) / 10)));
  var cols = 10 - Math.floor((k + 1) / 2);
  var rows = 5 + Math.floor(k / 2);
  var maxCols = Math.max(2, Math.floor(((w && w > 0) ? w : 1000) / 110));
  cols = Math.min(cols, maxCols);
  return { cols: cols, rows: rows, size: cols * rows };
}
function syncGridCols(container) {
  var w = (container && container.clientWidth) || 1000;
  var v = 50;
  try { var s = parseInt(localStorage.getItem("tutcg_card_min"), 10); if (!isNaN(s)) v = s; } catch (e) {}
  var g = gridColsRows(v, w);
  try { document.documentElement.style.setProperty("--grid-cols", String(g.cols)); } catch (e) {}
  return g;
}
function pageSizeFor(container) {
  return syncGridCols(container);
}
function getOrden(setId) {
  const stMatch = setId?.match(/^ST-?(\d+)$/i);
  if (stMatch) return 30 + parseInt(stMatch[1], 10);
  return ordenExpansiones[setId] || 999;
}
function sortDonCards(a, b) {
  const getDonSetCode = (c) => {
    const m = (c.set_name || "").match(/\(([A-Z]+[\d-]*)\)\s*$/);
    if (!m) return "";
    const code = m[1];
    const opMatch = code.match(/^OP(\d+)$/);
    if (opMatch) {
      const n = opMatch[1];
      if (n === "14") return "OP14-EB04";
      if (n === "15") return "OP15-EB04";
      return "OP-" + n;
    }
    if (code === "OP-PR") return "PROMO";
    if (code === "OPDD") return "PROMO";
    return code;
  };
  const getDonChar = (c) => {
    const m = (c.set_name || "").match(/DON!! Card \(([^)]+)\)/);
    return m ? m[1] : (c.variant || "");
  };
  const getPrintOrder = (c) => {
    const pt = (c.print_type || c.variant || "").toLowerCase();
    if (pt.includes("gold")) return 2;
    if (pt.includes("foil")) return 1;
    return 0;
  };
  const setA = getDonSetCode(a);
  const setB = getDonSetCode(b);
  if (setA !== setB) return (ordenExpansiones[setA] || 999) - (ordenExpansiones[setB] || 999);
  const charA = getDonChar(a);
  const charB = getDonChar(b);
  if (charA !== charB) return charA.localeCompare(charB);
  return getPrintOrder(a) - getPrintOrder(b);
}
function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function getTcgPrefix() {
  const map = {
    "one-piece":"op", "pokemon":"pk", "magic":"mtg",
    "digimon":"dg", "dragon-ball":"db", "yugioh":"yg",
    "riftbound":"rb"
  };
  return map[currentTcg] || "op";
}
function collectionsKey() { return "tutcg_" + getTcgPrefix() + "_collections"; }
function ventaKey() { return "tutcg_" + getTcgPrefix() + "_venta"; }
async function cargarStatsLanding() {
  if (typeof skeletonStats === 'function') skeletonStats();
  try {
    const configRes = await fetch("config/games.json");
    const gamesConfig = await configRes.json();
    var totalCards = 0;
    var enabledGames = Object.entries(gamesConfig).filter(function(e) { return e[1].enabled; });
    for (var i = 0; i < enabledGames.length; i++) {
      try {
        var res = await fetch(enabledGames[i][1].data_dir + "/cards_master.json");
        if (!res.ok) continue;
        var data = await res.json();
        totalCards += data.total_cards || (data.cards ? data.cards.length : 0);
      } catch (e) { /* skip failed loads */ }
    }
    var statCards = document.getElementById("statCards");
    if (statCards) statCards.textContent = totalCards.toLocaleString();
  } catch (e) { /* skip if games.json fails */ }
}
// ─── Card Data Loading ───────────────────────────────────────────────────
let _cartasPromise = null;
function cargarCartas() {
  if (_cartasPromise) return _cartasPromise;
  _cartasPromise = _cargarCartas().finally(() => { _cartasPromise = null; });
  return _cartasPromise;
}
async function _cargarCartas() {
  if (typeof skeletonCardGrid === 'function') skeletonCardGrid(cardsContainer, 12, true);
  try {
    const configRes = await fetch("config/games.json");
    const gamesConfig = await configRes.json();
    var activeGame = Object.entries(gamesConfig).find(function(e) { return e[0] === currentTcg && e[1].enabled; });
    if (!activeGame && currentTcg) {
      cardsContainer.innerHTML = '<div class="no-data-msg" style="padding:80px 20px;text-align:center"><h2 style="color:var(--text-muted);margin-bottom:12px">' + t("core.coming_soon_title") + '</h2><p style="color:var(--text-secondary)">' + t("core.catalog_unavailable", { name: ((gamesConfig[currentTcg] && gamesConfig[currentTcg].name) || currentTcg) }) + '</p></div>';
      return;
    }
    if (!activeGame) activeGame = Object.entries(gamesConfig).find(function(e) { return e[1].enabled; });
    if (!activeGame) throw new Error("No enabled game in config/games.json");
    const dataUrl = activeGame[1].data_dir + "/cards_master.json";
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error("HTTP " + res.status + " loading " + dataUrl);
    const data = await res.json();
    cartas = data.cards.sort((a, b) => {
      const ordenA = getOrden(a.set_id);
      const ordenB = getOrden(b.set_id);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return (a.card_set_id || "").localeCompare(b.card_set_id || "", undefined, { numeric: true });
    }).filter(c => c.language && (c.language.includes("en") || c.language.includes("ja")));
    cartas.forEach(c => { if (c.card_name) c.card_name = decodeHtml(c.card_name); });
    await loadPrb02Cardlist();
    buildPrbBadgeMap();
    setCategoryMap = {};
    cartas.forEach(c => {
      if (c.set_id && c.category && c.category !== "DON" && !setCategoryMap[c.set_id]) {
        setCategoryMap[c.set_id] = c.category;
      }
    });
    tcgplayerMap = {};
    cartas.forEach(c => {
      if (c.tcgplayer_id) {
        if (!tcgplayerMap[c.card_set_id]) tcgplayerMap[c.card_set_id] = [];
        tcgplayerMap[c.card_set_id].push({ id: c.tcgplayer_id, name: c.card_name || "", isParallel: c.is_parallel || false });
      }
    });
    cartasMap = {};
    cartas.forEach(c => { cartasMap[getCardKey(c)] = c; });
    if (typeof hydrateDecks === "function") hydrateDecks();
    const statCards = document.getElementById("statCards");
    if (statCards && !currentTcg) statCards.textContent = cartas.length.toLocaleString();
    cargarFiltros();
    actualizarFiltrosPorExpansion();
    renderCards();
  } catch (error) {
    _DEBUG && console.error("Error cargando cards_master.json:", error);
    cardsContainer.innerHTML = `<div class="no-data-msg"><h2>${t("core.load_error_title")}</h2><p>${t("core.load_error_body")}</p></div>`;
  }
}

function ensureCartasLoaded() {
  if (currentTcg && Object.keys(cartasMap).length === 0) {
    return cargarCartas();
  }
  return Promise.resolve();
}

function obtenerRareza(carta) {
  const rarezaApi = carta.rareza || carta.rarity || "";
  const nombre = (carta.card_name || "").toLowerCase();
  const variant = (carta.variant || "").toLowerCase();
  const setId = carta.set_id || "";
  if (carta.category === "OTHER") return "";
  if ((carta.category || carta.producto) === "DON" || nombre === "don!!") {
    if (variant.includes("gold") || variant === "gold") return "Gold";
    if (variant.includes("anniversary") || variant.includes("promo") || variant.includes("tournament") ||
        variant.includes("championship") || variant.includes("special") || variant.includes("collection") || variant.includes("tin"))
      return "Promo";
    if (carta.set_name && (carta.set_name.includes("OP-PR") || carta.set_name.includes("OPDD"))) return "Promo";
    return "Normal";
  }
  if (carta.print_type) return carta.print_type;
  if (setId === "PRB-01" || setId === "PRB-02") {
    if (rarezaApi === "SP" || rarezaApi === "SP CARD") return "SP";
    const img = carta.card_image || "";
    const m = img.match(/_([pr]\d+)\.webp$/);
    const suffix = m ? m[1] : "-";
    const badgeMap = prbBadgeMap[carta.card_set_id + "|" + carta.set_id];
    if (badgeMap && badgeMap[suffix] !== undefined) {
      const badge = badgeMap[suffix];
      if (badge) return badge;
    }
    if (carta.is_parallel) return "AA";
    return rarezaApi;
  }
  if (rarezaApi === "SP" || rarezaApi === "SP CARD") return "SP";
  if (carta.is_parallel && carta.category !== "OTHER") return "AA";
  if (nombre.includes("(sp)") || nombre.includes(" sp ")) return "SP";
  if (nombre.includes("foil")) return "Foil";
  if (nombre.includes("full art")) return "Full Art";
  if (nombre.includes("parallel") || nombre.includes("paralelo") || nombre.includes("alternate") || nombre.includes("alt art")) return "AA";
  return rarezaApi;
}
function formatearNombre(carta) {
  if ((carta.category || carta.producto) === "DON") {
    const base = carta.card_name || "DON!!";
    if (carta.variant && carta.variant !== "Common") {
      const setNum = (carta.card_set_id || "").match(/-(\d+)$/);
      const numSuffix = setNum ? ` (${setNum[1]})` : "";
      return `${base} (${carta.variant})${numSuffix}`;
    }
    return base;
  }
  const nombre = carta.card_name || "";
  const setNum = (carta.card_set_id || "").match(/-(\d+)$/);
  if (!setNum) return nombre;
  const num = setNum[1];
  if (nombre.includes(`(${num})`)) return nombre;
  if (nombre.includes(`(P-${num})`)) return nombre;
  if (nombre.includes(`P-${num}`)) return nombre;
  return `${nombre} (${num})`;
}
// ─── TCGPlayer Price Helpers ──────────────────────────────────────────────
function buscarEnMapa(entries, nombreCarta) {
  if (!entries || !entries.length) return null;
  const nombreOrig = (nombreCarta || "").trim();
  const esPar = (nombreOrig.toLowerCase().includes("parallel") || nombreOrig.toLowerCase().includes("(sp)"));
  if (esPar) {
    const m = entries.find(e => e.isParallel || (e.name || "").toLowerCase().includes("(sp)"));
    return (m || entries[0]).id;
  }
  const exacto = entries.find(e => (e.name || "").trim().toLowerCase() === nombreOrig.toLowerCase());
  if (exacto) return exacto.id;
  const numMatch = nombreOrig.match(/^(.+?)\s*\(\d+\)$/);
  const nombreSinNum = numMatch ? numMatch[1].trim() : null;
  if (nombreSinNum) {
    const exactoSinNum = entries.find(e => (e.name || "").trim().toLowerCase() === nombreSinNum.toLowerCase());
    if (exactoSinNum) return exactoSinNum.id;
  }
  const base = entries.filter(e => !(e.name || "").includes("(") && !(e.name || "").includes("["));
  if (base.length) return base[0].id;
  const conNumero = entries.find(e => /^[^(]+\(\d+\)$/.test((e.name || "").trim()));
  if (conNumero) return conNumero.id;
  const noPar = entries.find(e => !e.isParallel);
  if (noPar) return noPar.id;
  return entries[0].id;
}
function getTcgId(carta) {
  return buscarEnMapa(tcgplayerMap[carta.card_set_id], carta.card_name);
}
function escapeAttr(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// ponytail: rebuilds colapsan alto (lazy imgs) y el pane salta arriba; congela scroll del pane
function snapScroll() {
  var pane = null, st = 0, wst = 0, sh = 0;
  try {
    pane = document.querySelector(".view-pane.active");
    st = pane ? pane.scrollTop : 0;
    sh = pane ? pane.scrollHeight : 0;
    wst = window.scrollY || 0;
    if (window._DEBUG) console.info("[snap] cap", pane && pane.id, st, sh);
  } catch (e) {}
  return function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          if (pane) {
            if (window._DEBUG) console.info("[snap] restore", pane.id, st, pane.scrollHeight);
            pane.scrollTop = st;
          }
          if ((window.scrollY || 0) !== wst) window.scrollTo(0, wst);
        } catch (e) {}
      });
    });
  };
}
function showToast(msg, type) {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-notification" + (type ? " " + type : "");
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
// ponytail: alert() bloqueante → toast no bloqueante (25 llamados en deck/modals quedan intactos)
try { window.alert = function(m) { showToast(String(m == null ? "" : m), "error"); }; } catch (e) {}
// ponytail: Deshacer de un solo nivel; una quitada nueva pisa la anterior
var _lastRemoval = null;
var _undoTimer = null;
function removeEntryWithUndo(col, idx, save, render) {
  if (!col || !col.cards || idx < 0 || idx >= col.cards.length) return false;
  var snap = null;
  try { snap = JSON.stringify(col.cards); } catch (e) {}
  col.cards.splice(idx, 1);
  save(); render();
  _lastRemoval = { col: col, snap: snap, save: save, render: render };
  showUndoToast(t("core.card_removed"));
  return true;
}
function undoLastRemoval() {
  var r = _lastRemoval;
  _lastRemoval = null;
  if (!r || !r.snap) return;
  try { r.col.cards = JSON.parse(r.snap); } catch (e) { return; }
  r.save(); r.render();
}
function showUndoToast(msg) {
  var existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();
  if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; }
  var toast = document.createElement("div");
  toast.className = "toast-notification info";
  var span = document.createElement("span");
  span.textContent = msg;
  var btn = document.createElement("button");
  btn.textContent = t("core.undo");
  btn.className = "toast-undo-btn";
  btn.addEventListener("click", function () {
    if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; }
    toast.remove();
    undoLastRemoval();
  });
  toast.appendChild(span);
  toast.appendChild(btn);
  document.body.appendChild(toast);
  _undoTimer = setTimeout(function () { toast.remove(); _lastRemoval = null; }, 8000);
}
function decodeHtml(str) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}
function getCardKey(carta) {
  const tcgId = getTcgId(carta);
  const base = (carta.card_set_id || "") + "|" + (carta.card_name || "") + "|" + (carta.card_image || "");
  if (tcgId) return "tcg_" + tcgId + "|" + base;
  return base;
}
// ponytail: venta única stock 20 por stack (N stacks por carta); decks legacy intactos
window.VENTA_STOCK_MAX = 20;
function normalizeVentaCol(col) {
  if (!col || col.subtype === "deck") return col;
  if (col.display_mode === "stock") return col;
  var cards = col.cards || [];
  if (col.display_mode === "individual") {
    var byKey = {};
    cards.forEach(function(c) {
      var k = c._key || "";
      if (!byKey[k]) byKey[k] = { proto: c, qty: 0 };
      byKey[k].qty += (c.quantity || 1);
    });
    cards = [];
    Object.keys(byKey).forEach(function(k) {
      var e = byKey[k], left = e.qty;
      while (left > 0) {
        var q = Math.min(left, window.VENTA_STOCK_MAX);
        var nc = Object.assign({}, e.proto, { _key: k, quantity: q });
        cards.push(nc); left -= q;
      }
    });
  } else {
    var out = [];
    cards.forEach(function(c) {
      var left = (c.quantity || 1);
      while (left > window.VENTA_STOCK_MAX) { out.push(Object.assign({}, c, { quantity: window.VENTA_STOCK_MAX })); left -= window.VENTA_STOCK_MAX; }
      out.push(Object.assign({}, c, { quantity: left }));
    });
    cards = out;
  }
  col.cards = cards;
  col.display_mode = "stock";
  col._synced = false;
  return col;
}
// ─── Collections / Supabase + LocalStorage ──────────────────────────────
function guardarCollections() {
  if (!currentTcg) return;
  if (_draftArmed && draftBaselineReady()) { stageChange(); return; }
  Object.values(collections).forEach(b => b._synced = false);
  localStorage.setItem(collectionsKey(), JSON.stringify(collections));
  if (isAuthenticated()) syncCollectionsToSupabase().catch(function(e) { _DEBUG && console.error(e); });
}
function guardarVenta() {
  if (!currentTcg) return;
  if (_draftArmed && draftBaselineReady()) { stageChange(); return; }
  Object.values(ventaCols).forEach(b => b._synced = false);
  localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
  if (isAuthenticated()) syncVentaToSupabase().catch(function(e) { _DEBUG && console.error(e); });
}
// ─── Staged draft: nada se persiste sin preguntar ──────────────────────────
// ponytail: compuerta central en guardar*; las mutaciones no se tocan, solo cambia cuándo persisten
var _baseC = null, _baseV = null;
var _draftArmed = false, _dirty = false;
var _pendingExit = null;
var DRAFT_CTX = { catalog: 1, binder: 1, venta: 1 };
function draftBaselineReady() { return _baseC !== null && _baseV !== null; }
function draftDirty() { return _dirty; }
function refreshBaseline(force) {
  if (_dirty && !force) return;
  try {
    _baseC = JSON.stringify(collections);
    _baseV = JSON.stringify(ventaCols);
  } catch (e) {}
  updateDraftBar();
}
function armDraft() { if (draftBaselineReady()) _draftArmed = true; }
function disarmDraft() { _draftArmed = false; }
function stageChange() { _dirty = true; updateDraftBar(); persistDraft(); }
function updateDraftBar() {
  var bar = document.getElementById("draftBar");
  if (bar) bar.style.display = _dirty ? "flex" : "none";
}
function saveDraft() {
  if (!_dirty || !currentTcg) return;
  _draftArmed = false;
  try { guardarCollections(); guardarVenta(); }
  finally { if (draftBaselineReady()) _draftArmed = true; }
  refreshBaseline(true);
  _dirty = false;
  updateDraftBar();
  clearPersistedDraft();
}
function discardDraft() {
  if (_baseC) { try { collections = JSON.parse(_baseC); } catch (e) {} }
  if (_baseV) { try { ventaCols = JSON.parse(_baseV); } catch (e) {} }
  _dirty = false;
  updateDraftBar();
  clearPersistedDraft();
  rerenderVisibleView();
}
function draftKey() { return "tutcg_" + (typeof getTcgPrefix === "function" ? getTcgPrefix() : "op") + "_draft"; }
// ponytail: el borrador persiste en localStorage para sobrevivir reload/crash; el baseline sigue siendo servidor
function persistDraft() {
  try { localStorage.setItem(draftKey(), JSON.stringify({ tcg: currentTcg, c: collections, v: ventaCols })); } catch (e) {}
}
function clearPersistedDraft() { try { localStorage.removeItem(draftKey()); } catch (e) {} }
function restorePersistedDraft() {
  var raw = null;
  try { raw = localStorage.getItem(draftKey()); } catch (e) {}
  if (!raw) return false;
  try {
    var d = JSON.parse(raw);
    if (!d || d.tcg !== currentTcg || !d.c || !d.v) return false;
    collections = d.c; ventaCols = d.v;
    _dirty = true; updateDraftBar();
    if (typeof refreshCatalogTargetSelect === "function") refreshCatalogTargetSelect();
    if (typeof showToast === "function") showToast(t("core.draft_restored"), "info");
    return true;
  } catch (e) { return false; }
}
function rerenderVisibleView() {
  var vis = function(id) { var el = document.getElementById(id); return el && el.style.display !== "none"; };
  if (vis("catalogView") && typeof renderCards === "function") renderCards();
  else if (vis("binderView") && typeof renderBinder === "function") renderBinder();
  else if (vis("ventaView") && typeof renderVentaView === "function") renderVentaView();
  else if (vis("collectionManager") && typeof renderCollectionList === "function") renderCollectionList();
  else if (vis("ventaManager") && typeof renderVentaList === "function") renderVentaList();
  else if (vis("exploreView") && typeof renderExploreView === "function") renderExploreView();
}
function requestStagedExit(kind, proceed) {
  if (!_dirty || DRAFT_CTX[kind]) return true;
  _pendingExit = (typeof proceed === "function") ? proceed : null;
  var m = document.getElementById("draftModal");
  if (m) m.style.display = "flex";
  return false;
}
function closeDraftModal(run) {
  var m = document.getElementById("draftModal");
  if (m) m.style.display = "none";
  var fn = _pendingExit; _pendingExit = null;
  if (run && fn) fn();
}
// ─── Tripulación y límites únicos (mismo techo para todos) ─────────────────
// ponytail: el trigger Postgres manda; esto es UX (pre-chequeo + mensajes). Techo único 30/1000.
var PLAN_LIMITS = {
  0: { spaces: 30, cards: 1000 },
  1: { spaces: 30, cards: 1000 },
  2: { spaces: 30, cards: 1000 }
};
var CREWS = [
  { id: "mugiwara", name: "Mugiwara", color: "#e63946" },
  { id: "heart", name: "Heart Pirates", color: "#4cc9f0" },
  { id: "kid", name: "Kid Pirates", color: "#f4a259" },
  { id: "blackbeard", name: "BlackBeard Pirates", color: "#3a3a3c" },
  { id: "beasts", name: "Beast Pirates", color: "#7b2cbf" },
  { id: "redhair", name: "Red Hair Pirates", color: "#d00000" },
  { id: "whitebeard", name: "Whitebeard Pirates", color: "#ffd166" },
  { id: "roger", name: "Roger Pirates", color: "#06d6a0" },
  { id: "bigmom", name: "Big Mom Pirates", color: "#ff70a6" },
  { id: "crossguild", name: "Cross Guild Pirates", color: "#8ecae6" }
];
var _planCache = null;
async function getMyPlan() {
  if (_planCache && (Date.now() - _planCache.ts) < 60000) return _planCache.plan;
  var plan = { level: 0, crew: null, crew_custom: null, isAdmin: false };
  try {
    if (typeof isAuthenticated === "function" && isAuthenticated() && authUser) {
      const { data } = await supabaseClient.from("profiles").select("plan_level,crew,is_admin,preferences").eq("id", authUser.id).single();
      if (data) plan = { level: data.plan_level || 0, crew: data.crew || null, crew_custom: data.preferences?.crew_custom || null, isAdmin: !!data.is_admin };
    }
  } catch (e) {}
  _planCache = { plan: plan, ts: Date.now() };
  return plan;
}
function invalidatePlanCache() { _planCache = null; }
function crewById(id) { return CREWS.find(function(c) { return c.id === id; }) || null; }
function tierLabel(plan) {
  if (!plan) return t("core.tier_nakama");
  // ponytail: crew custom va donde sale crew (sidebar/perfil); regex al guardar impide HTML
  if (plan.crew === "custom" && plan.crew_custom) return plan.crew_custom;
  if (plan.crew) { var c = crewById(plan.crew); if (c) return c.name; }
  return t("core.tier_nakama");
}
async function getMySpaceUsage() {
  try {
    if (typeof isAuthenticated === "function" && isAuthenticated() && authUser) {
      const { count } = await supabaseClient.from("binders").select("id", { count: "exact", head: true }).eq("user_id", authUser.id);
      return count || 0;
    }
  } catch (e) {}
  return 0;
}
function upsellMsg(kind, plan) {
  if (kind === "spaces") return t("core.upsell_spaces");
  return t("core.upsell_cards");
}
async function guardSpaceForNew() {
  const plan = await getMyPlan();
  if (plan.isAdmin) return true;
  const limit = (PLAN_LIMITS[plan.level] || PLAN_LIMITS[0]).spaces;
  const used = await getMySpaceUsage();
  if (used >= limit) {
    if (typeof showConfirmModal === "function") showConfirmModal(upsellMsg("spaces", plan), null);
    else if (typeof showToast === "function") showToast(upsellMsg("spaces", plan), "error");
    return false;
  }
  return true;
}
async function overCardCap(col, addN) {
  if (!col || col.subtype === "tracking") return false;
  const plan = await getMyPlan();
  if (plan.isAdmin) return false;
  const cap = (PLAN_LIMITS[plan.level] || PLAN_LIMITS[0]).cards;
  if (cap == null) return false;
  const cur = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  return cur + (addN || 1) > cap;
}
async function refreshTierLabel() {
  const plan = await getMyPlan();
  const label = tierLabel(plan);
  ["sidebarUserPlan"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = label;
  });
  return plan;
}
async function refreshSpaceCounters() {
  const plan = await getMyPlan();
  const limit = plan.isAdmin ? "∞" : String((PLAN_LIMITS[plan.level] || PLAN_LIMITS[0]).spaces);
  const used = await getMySpaceUsage();
  [["spaceCounterCol"], ["spaceCounterVenta"]].forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.textContent = t("core.space_count", { used: used, limit: limit });
  });
}
// ponytail: traduce violaciones de triggers de techo a mensaje genérico
function limitToast(msg, fallback) {
  if (msg && /LIMIT_SPACES/i.test(msg)) { showToast(t("core.limit_spaces"), "error"); return; }
  if (msg && /LIMIT_CARDS/i.test(msg)) { showToast(t("core.limit_cards"), "error"); return; }
  showToast(fallback, "error");
}
async function syncObjectToSupabase(obj, type) {
  if (!isAuthenticated()) return;
  // Determine TCG of local binders so we only compare against same-TCG remote binders
  const localEntries = Object.values(obj);
  const localTcg = (localEntries.length > 0 && localEntries[0].tcg) || currentTcg || "one-piece";
  // Delete remote binders that no longer exist locally (same TCG only)
  const localIds = new Set(Object.keys(obj));
  try {
    const { data: remote } = await supabaseClient.from("binders").select("id, config").eq("user_id", authUser.id).eq("type", type);
    if (remote) {
      const toDelete = remote.filter(r => {
        if (localIds.has(r.id)) return false;
        const remoteTcg = (r.config && r.config.tcg) || "one-piece";
        return remoteTcg === localTcg;
      }).map(r => r.id);
      if (toDelete.length) {
        await supabaseClient.from("binder_cards").delete().in("binder_id", toDelete);
        await supabaseClient.from("binders").delete().in("id", toDelete);
      }
    }
  } catch (e) { _DEBUG && console.error("Sync cleanup error:", e); showToast(t("core.sync_cleanup_error"), "error"); }
  const entries = Object.entries(obj);
  for (let [id, binder] of entries) {
    if (!binder._synced) {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(id)) {
        const newId = crypto.randomUUID();
        delete obj[id];
        binder.id = newId;
        obj[newId] = binder;
        id = newId;
      }
      const config = {};
      if (binder.display_mode) config.display_mode = binder.display_mode;
      if (binder.subtype) config.subtype = binder.subtype;
      if (binder.tcg) config.tcg = binder.tcg;
      if (binder.tracking_type) config.tracking_type = binder.tracking_type;
      if (binder.tracking_config) config.tracking_config = binder.tracking_config;
      if (binder.checklist_mode) config.checklist_mode = true;
      if (binder.totalCurrency) config.totalCurrency = binder.totalCurrency;
      if (binder.extras) config.extras = binder.extras;
      if (type === "sale" && binder.subtype !== "deck") {
        // ponytail: baseline para alerta <30% (máximo publicado por carta)
        try {
          const totals = {};
          (binder.cards || []).forEach(function(c) { totals[c._key] = (totals[c._key] || 0) + (c.quantity || 1); });
          const prev = (binder._baseline || {});
          Object.keys(totals).forEach(function(k) { prev[k] = Math.max(prev[k] || 0, totals[k]); });
          binder._baseline = prev;
          config.stock_baseline = prev;
          if (binder._lowNotified) config.low_notified = binder._lowNotified;
        } catch (e) {}
      }
      const { error: upsertErr } = await supabaseClient.from("binders").upsert({
        id,
        user_id: authUser.id,
        name: binder.name,
        type: type,
        is_public: binder.is_public || false,
        config: config,
        target_cards: (binder.subtype === "tracking" && binder.cards) ? binder.cards : null,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (upsertErr) { _DEBUG && console.error("Binder upsert error:", upsertErr); limitToast(upsertErr.message, t("core.save_collection_error")); continue; }
      const allCardRows = [];
      if (binder.subtype === "deck") {
        const deckTcg = config.tcg || "one-piece";
        if (deckTcg === "riftbound") {
          if (binder.legend) {
            allCardRows.push({ binder_id: id, card_id: binder.legend._key || "", quantity: 1, price: binder.legend.customPrice ?? null, price_currency: binder.legend.priceCurrency || "ARS", card_tag: "legend", sort_order: 0 });
          }
          const collapseTagged = (arr, tag, baseSort) => {
            if (binder.display_mode === "individual") {
              (arr || []).forEach((card, idx) => {
                allCardRows.push({
                  binder_id: id,
                  card_id: card._key || "",
                  quantity: card.quantity || 1,
                  price: card.customPrice != null ? card.customPrice : null,
                  price_currency: card.priceCurrency || "ARS",
                  card_tag: tag,
                  sort_order: baseSort + idx
                });
              });
            } else {
              const collapsed = {};
              (arr || []).forEach((card, idx) => {
                const key = card._key || "";
                if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, price_currency: card.priceCurrency || "ARS", card_tag: tag, sort_order: baseSort + idx };
                collapsed[key].quantity += (card.quantity || 1);
              });
              Object.values(collapsed).forEach(c => allCardRows.push({ ...c, binder_id: id }));
            }
          };
          collapseTagged(binder.champions, "champion", 100);
          collapseTagged(binder.cards, "main", 200);
          collapseTagged(binder.runes, "rune", 300);
          collapseTagged(binder.battlefields, "battlefield", 400);
          collapseTagged(binder.sideboard, "sideboard", 500);
        } else {
          if (binder.leader) {
            allCardRows.push({ binder_id: id, card_id: binder.leader._key || "", quantity: 1, price: binder.leader.customPrice ?? null, price_currency: binder.leader.priceCurrency || "ARS", card_tag: "leader", sort_order: 0 });
          }
          if (binder.cards && binder.cards.length) {
            if (binder.display_mode === "individual") {
              binder.cards.forEach((card, idx) => {
                allCardRows.push({
                  binder_id: id,
                  card_id: card._key || "",
                  quantity: card.quantity || 1,
                  price: card.customPrice != null ? card.customPrice : null,
                  price_currency: card.priceCurrency || "ARS",
                  card_tag: "main",
                  sort_order: idx + 1
                });
              });
            } else {
              const collapsed = {};
              binder.cards.forEach((card, idx) => {
                const key = card._key || "";
                const qty = card.quantity || 1;
                if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, price_currency: card.priceCurrency || "ARS", sort_order: idx + 1, card_tag: "main" };
                collapsed[key].quantity += qty;
              });
              allCardRows.push(...Object.values(collapsed).map(c => ({ ...c, binder_id: id })));
            }
          }
          if (binder.dons && binder.dons.length) {
            binder.dons.forEach((card, idx) => {
              allCardRows.push({ binder_id: id, card_id: card._key || "", quantity: 1, price: card.customPrice ?? null, price_currency: card.priceCurrency || "ARS", card_tag: "don", sort_order: idx + 10000 });
            });
          }
        }
      } else if (binder.subtype === "tracking") {
        if (binder.cards && binder.cards.length) {
          binder.cards.forEach((card, idx) => {
            if (card.owned) {
              allCardRows.push({ binder_id: id, card_id: card._key || "", quantity: 1, card_tag: "owned", sort_order: idx });
            }
          });
        }
      } else {
        // Regular binder cards
        if (binder.cards && binder.cards.length) {
          if (binder.display_mode === "individual") {
            binder.cards.forEach((card, idx) => {
              allCardRows.push({
                binder_id: id,
                card_id: card._key || "",
                quantity: card.quantity || 1,
                price: card.customPrice != null ? card.customPrice : null,
                price_currency: card.priceCurrency || "ARS",
                sort_order: idx
              });
            });
          } else {
            const collapsed = {};
            binder.cards.forEach((card, idx) => {
              const key = card._key || "";
              const qty = card.quantity || 1;
              if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, price_currency: card.priceCurrency || "ARS", sort_order: idx };
              collapsed[key].quantity += qty;
            });
            allCardRows.push(...Object.values(collapsed).map(c => ({ ...c, binder_id: id })));
          }
        }
      }
      {
        const session = (await supabaseClient.auth.getSession()).data.session;
        if (!session) {
          _DEBUG && console.error("Sync cards error: no session");
          continue;
        }
        const response = await fetch((typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "https://scykfvomdwpiypmblnvv.supabase.co") + '/functions/v1/sync-binder-cards-v3', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ binder_id: id, cards: allCardRows, user_id: authUser.id })
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          _DEBUG && console.error("Sync cards error:", result.error || response.statusText);
          limitToast(result.error || response.statusText, t("core.save_cards_error"));
          continue;
        }
      }
      binder._synced = true;
    }
  }
  if (typeof invalidateExploreCache === 'function') invalidateExploreCache();
}
async function syncCollectionsToSupabase() { return syncObjectToSupabase(collections, "collection"); }
async function syncVentaToSupabase() { return syncObjectToSupabase(ventaCols, "sale"); }
async function loadBindersFromDb() {
  if (!isAuthenticated()) return null;
  try {
    const { data: binders, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*), target_cards")
      .eq("user_id", authUser.id)
      .order("created_at");
    if (error) throw error;
    return binders || [];
  } catch (e) {
    _DEBUG && console.error("Error loading binders:", e);
    showToast(t("core.cloud_load_error"), "error");
    return null;
  }
}
function expandDbCards(rows) {
  const cards = [];
  const sorted = (rows || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  sorted.forEach(row => {
    for (let i = 0; i < row.quantity; i++) {
      const c = { _key: row.card_id };
      if (row.price != null) c.customPrice = parseFloat(row.price);
      if (row.price_currency) c.priceCurrency = row.price_currency;
      cards.push(c);
    }
  });
  return cards;
}
function expandDbCardsGrouped(rows) {
  const cards = [];
  const sorted = (rows || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  sorted.forEach(row => {
    cards.push({
      _key: row.card_id,
      quantity: row.quantity,
      customPrice: row.price != null ? parseFloat(row.price) : 0,
      priceCurrency: row.price_currency || "ARS"
    });
  });
  return cards;
}
function expandDbDeck(rows) {
  const sorted = (rows || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  let leader = null, legend = null;
  const cards = [], dons = [], champions = [], runes = [], battlefields = [], sideboard = [];
  sorted.forEach((row) => {
    const entry = { _key: row.card_id, customPrice: row.price != null ? parseFloat(row.price) : 0 };
    if (row.price_currency) entry.priceCurrency = row.price_currency;
    if (row.card_tag === "leader") { leader = entry; }
    else if (row.card_tag === "legend") { legend = entry; }
    else if (row.card_tag === "champion") { entry.quantity = row.quantity; champions.push(entry); }
    else if (row.card_tag === "don") { dons.push(entry); }
    else if (row.card_tag === "rune") { entry.quantity = row.quantity; runes.push(entry); }
    else if (row.card_tag === "battlefield") { battlefields.push(entry); }
    else if (row.card_tag === "sideboard") { sideboard.push(entry); }
    else { entry.quantity = row.quantity; cards.push(entry); }
  });
  var out = { leader, legend, cards, dons, champions, runes, battlefields, sideboard };
  if (typeof hydrateDeckObj === "function") hydrateDeckObj(out);
  return out;
}
// ponytail: Supabase solo guarda _key; rehidrata campos de display/validación desde cartasMap (F5/login)
function hydrateDeckEntry(entry) {
  if (!entry || entry.card_set_id || !entry._key) return entry;
  var full = (typeof cartasMap !== "undefined") ? cartasMap[entry._key] : null;
  if (!full) return entry;
  ["card_set_id", "card_name", "card_image", "card_color", "card_type", "set_id"].forEach(function (k) {
    if (entry[k] == null && full[k] != null) entry[k] = full[k];
  });
  return entry;
}
function hydrateDeckObj(deck) {
  if (!deck) return deck;
  ["leader", "legend"].forEach(function (k) { if (deck[k]) hydrateDeckEntry(deck[k]); });
  ["cards", "dons", "champions", "runes", "battlefields", "sideboard"].forEach(function (k) {
    (deck[k] || []).forEach(hydrateDeckEntry);
  });
  return deck;
}
function hydrateDecks() {
  try {
    Object.values(typeof collections !== "undefined" ? collections : {}).forEach(function (col) {
      if (col && col.subtype === "deck") hydrateDeckObj(col);
    });
    Object.values(typeof ventaCols !== "undefined" ? ventaCols : {}).forEach(function (col) {
      if (col && col.subtype === "deck") hydrateDeckObj(col);
    });
  } catch (e) {}
}
function rebuildLocalFallback() {
  const key = collectionsKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    try { collections = JSON.parse(saved); } catch (e) { collections = {}; }
  } else if (getTcgPrefix() === "op") {
    let oldBinder = [];
    try { oldBinder = JSON.parse(localStorage.getItem("tutcg_op_binder") || "[]"); } catch (e) { oldBinder = []; }
    if (oldBinder.length) {
      const id = generarId();
      collections = { [id]: { id, name: "Mi Binder", cards: oldBinder } };
      localStorage.removeItem("tutcg_op_binder");
    } else { collections = {}; }
  } else { collections = {}; }
  localStorage.setItem(key, JSON.stringify(collections));
}
function _markCollectionsReady() {
  var wasReady = !!window._collectionsReady;
  window._collectionsReady = true;
  refreshBaseline();
  if (typeof refreshCatalogTargetSelect === 'function') refreshCatalogTargetSelect();
  if (wasReady) return; // ponytail: nunca re-render al volver; solo pinta tras carga real (skeleton)
  const active = document.querySelector(".view-pane.active");
  if (!active) return;
  if (active.id === "collectionManager" && typeof renderCollectionList === 'function') renderCollectionList();
  else if (active.id === "binderView" && currentCollectionId && Object.keys(cartasMap).length > 0 && typeof renderBinder === 'function') renderBinder();
}
function _markVentaReady() {
  var wasReady = !!window._ventaReady;
  window._ventaReady = true;
  refreshBaseline();
  if (typeof refreshCatalogTargetSelect === 'function') refreshCatalogTargetSelect();
  if (wasReady) return; // ponytail: nunca re-render al volver; solo pinta tras carga real
  const active = document.querySelector(".view-pane.active");
  if (!active || Object.keys(cartasMap).length === 0) return;
  if (active.id === "ventaManager" && typeof renderVentaList === 'function') renderVentaList();
  else if (active.id === "ventaView" && typeof renderVentaView === 'function') renderVentaView();
}
async function initCollections() {
  if (isAuthenticated()) {
    const dbBinders = await loadBindersFromDb();
    if (dbBinders && dbBinders.length) {
      var _prevCols = collections || {};
      collections = {};
      const activeTcg = currentTcg || "one-piece";
      dbBinders.filter(b => (b.type === "collection" || !b.type) && ((b.config && b.config.tcg) || "one-piece") === activeTcg).forEach(b => {
        const cfg = b.config || {};
        const subtype = cfg.subtype || "binder";
        if (subtype === "deck") {
          const deck = expandDbDeck(b.binder_cards);
          const tcgVal = cfg.tcg || "one-piece";
          const deckObj = {
            id: b.id, name: b.name, subtype: "deck",
            cards: deck.cards, is_public: b.is_public || false,
            tcg: tcgVal, _synced: true
          };
          if (tcgVal === "riftbound") {
            deckObj.legend = deck.legend;
            deckObj.champions = deck.champions || [];
            deckObj.runes = deck.runes || [];
            deckObj.battlefields = deck.battlefields || [];
            deckObj.sideboard = deck.sideboard || [];
          } else {
            deckObj.leader = deck.leader;
            deckObj.dons = deck.dons;
          }
          collections[b.id] = deckObj;
        } else if (subtype === "tracking") {
          const trackingType = cfg.tracking_type || "expansion";
          const trackingConfig = cfg.tracking_config || {};
          let cards;
          if (b.target_cards && Array.isArray(b.target_cards)) {
            cards = b.target_cards;
          } else {
            cards = buildTrackingCardList(trackingType, trackingConfig);
          }
          const ownedKeys = new Set((b.binder_cards || []).map(c => c.card_id));
          cards.forEach(c => { if (ownedKeys.has(c._key)) c.owned = true; });
          // ponytail: filtro tracking sobrevive rebuild (memoria > localStorage > all)
          var _savedTf = null;
          try { _savedTf = localStorage.getItem("tutcg_tracking_filter_" + b.id); } catch (e) {}
          var _prevTf = _prevCols && _prevCols[b.id] && _prevCols[b.id]._trackingFilter;
          collections[b.id] = {
            id: b.id, name: b.name, subtype: "tracking",
            tracking_type: trackingType, tracking_config: trackingConfig,
            target: cards.length, cards: cards,
            is_public: b.is_public || false, checklist_mode: cfg.checklist_mode || false,
            tcg: cfg.tcg || "one-piece", _synced: true,
            _trackingFilter: _prevTf || _savedTf || "all"
          };
        } else {
          collections[b.id] = {
            id: b.id, name: b.name, subtype: "binder",
            cards: expandDbCards(b.binder_cards),
            is_public: b.is_public || false, tcg: cfg.tcg || "one-piece", _synced: true
          };
        }
      });
      localStorage.setItem(collectionsKey(), JSON.stringify(collections));
      _markCollectionsReady();
      return;
    }
    if (dbBinders !== null) {
      const localKey = collectionsKey();
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try { collections = JSON.parse(localData); } catch (e) { collections = {}; }
        await syncCollectionsToSupabase();
        _markCollectionsReady();
        return;
      }
    }
  }
  rebuildLocalFallback();
  _markCollectionsReady();
}
function initVenta() {
  const key = ventaKey();
  const saved = localStorage.getItem(key);
  if (saved) { try { ventaCols = JSON.parse(saved); } catch (e) { ventaCols = {}; } } else { ventaCols = {}; }
  localStorage.setItem(key, JSON.stringify(ventaCols));
  window._ventaReady = true;
}
async function reloadVentaFromDb() {
  if (!isAuthenticated()) { window._ventaReady = true; return; }
  window._ventaReady = false;
  const dbBinders = await loadBindersFromDb();
  if (dbBinders && dbBinders.length) {
    ventaCols = {};
    const activeTcg = currentTcg || "one-piece";
    dbBinders.filter(b => b.type === "sale" && ((b.config && b.config.tcg) || "one-piece") === activeTcg).forEach(b => {
      const cfg = b.config || {};
      const subtype = cfg.subtype || "binder";
      const mode = cfg.display_mode || "individual";
      if (subtype === "deck") {
        const deck = expandDbDeck(b.binder_cards);
        const tcgVal = cfg.tcg || "one-piece";
        const deckObj = {
          id: b.id, name: b.name, subtype: "deck",
          cards: deck.cards, is_public: b.is_public || false,
          display_mode: mode, tcg: tcgVal, totalCurrency: cfg.totalCurrency || "ARS", extras: cfg.extras || "", _synced: true
        };
        if (tcgVal === "riftbound") {
          deckObj.legend = deck.legend;
          deckObj.champions = deck.champions || [];
          deckObj.runes = deck.runes || [];
          deckObj.battlefields = deck.battlefields || [];
          deckObj.sideboard = deck.sideboard || [];
        } else {
          deckObj.leader = deck.leader;
          deckObj.dons = deck.dons;
        }
        ventaCols[b.id] = deckObj;
      } else {
        const expandFn = mode === "individual" ? expandDbCards : expandDbCardsGrouped;
        var vc = {
          id: b.id, name: b.name, subtype: "binder",
          cards: expandFn(b.binder_cards),
          is_public: b.is_public || false, display_mode: mode, tcg: cfg.tcg || "one-piece",
          totalCurrency: cfg.totalCurrency || "ARS", _synced: true,
          _baseline: cfg.stock_baseline || {}, _lowNotified: cfg.low_notified || []
        };
        ventaCols[b.id] = normalizeVentaCol(vc);
      }
    });
    localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
    _markVentaReady();
    return;
  }
  if (dbBinders !== null) {
    const localData = localStorage.getItem(ventaKey());
    if (localData) {
      try { ventaCols = JSON.parse(localData); } catch (e) { ventaCols = {}; }
      await syncVentaToSupabase();
    }
  }
  _markVentaReady();
}
async function migrateLocalToSupabase() {
  if (!isAuthenticated()) return;
  if (typeof draftDirty === "function" && draftDirty()) return; // ponytail: no pisar borrador con rebuild
  const now = Date.now();
  const lastMigration = parseInt(localStorage.getItem("tutcg_last_migration") || "0", 10);
  if ((now - lastMigration) < 60000) return;
  localStorage.setItem("tutcg_last_migration", String(now));
  rebuildLocalFallback();
  const key = collectionsKey();
  const ventaK = ventaKey();
  const hasCols = Object.keys(collections).length > 0;
  const hasVenta = Object.keys(ventaCols).length > 0;
  if (!hasCols && !hasVenta) return;
  // ponytail: sync vacío no avisa (SIGNED_IN se re-emite al reenfocar pestaña)
  var dirty = Object.values(collections).concat(Object.values(ventaCols)).some(function(b) { return !b._synced; });
  if (!dirty) return;
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = t("core.migrating");
  document.body.appendChild(toast);
  if (hasCols) await syncCollectionsToSupabase();
  if (hasVenta) await syncVentaToSupabase();
  localStorage.removeItem(key);
  localStorage.removeItem(ventaK);
  toast.textContent = t("core.synced");
  setTimeout(() => toast.remove(), 2500);
  await initCollections();
  await reloadVentaFromDb();
}
// ─── Collection List ──────────────────────────────────────────────────────
function getFirstCardImage(cards, col) {
  if (col?.leader?.card_image) return col.leader.card_image;
  if (col?.leader?._key) {
    const found = cartasMap[col.leader._key];
    if (found?.card_image) return found.card_image;
  }
  if (col?.legend?.card_image) return col.legend.card_image;
  if (col?.legend?._key) {
    const found = cartasMap[col.legend._key];
    if (found?.card_image) return found.card_image;
  }
  if (col?.champions?.length) {
    const firstChamp = col.champions[0];
    if (firstChamp.card_image) return firstChamp.card_image;
    if (firstChamp._key) {
      const found = cartasMap[firstChamp._key];
      if (found?.card_image) return found.card_image;
    }
  }
  if (!cards || !cards.length) return null;
  const first = cards[0];
  if (first.card_image) return first.card_image;
  if (first._key) {
    const found = cartasMap[first._key];
    if (found?.card_image) return found.card_image;
  }
  return null;
}
function getTotalPrice(col) {
  let total = 0;
  const cards = col.cards || [];
  const isDeck = col.subtype === "deck";
  if (isDeck && col.leader && col.leader.customPrice != null) total += Number(col.leader.customPrice);
  if (isDeck && col.legend && col.legend.customPrice != null) total += Number(col.legend.customPrice);
  if (isDeck && col.champions) {
    col.champions.forEach(function(ch) {
      if (ch.customPrice != null) total += Number(ch.customPrice) * (ch.quantity || 1);
    });
  }
  if (isDeck) {
    (col.runes || []).forEach(function(r) { if (r.customPrice != null) total += Number(r.customPrice) * (r.quantity || 1); });
    (col.battlefields || []).forEach(function(b) { if (b.customPrice != null) total += Number(b.customPrice); });
    (col.sideboard || []).forEach(function(s) { if (s.customPrice != null) total += Number(s.customPrice); });
  }
  cards.forEach(c => {
    const qty = c.quantity || 1;
    if (c.customPrice != null) total += Number(c.customPrice) * qty;
  });
  if (isDeck && col.dons) {
    col.dons.forEach(d => { if (d.customPrice != null) total += Number(d.customPrice); });
  }
  return total;
}
function getTotalsByCurrency(col) {
  let ars = 0, usd = 0;
  const cards = col.cards || [];
  const isDeck = col.subtype === "deck";
  function addPrice(price, currency, qty) {
    if (price == null) return;
    if (currency === "USD") usd += Number(price) * (qty || 1);
    else ars += Number(price) * (qty || 1);
  }
  if (isDeck && col.leader) addPrice(col.leader.customPrice, col.leader.priceCurrency, 1);
  if (isDeck && col.legend) addPrice(col.legend.customPrice, col.legend.priceCurrency, 1);
  if (isDeck && col.champions) {
    col.champions.forEach(function(ch) { addPrice(ch.customPrice, ch.priceCurrency, ch.quantity || 1); });
  }
  if (isDeck) {
    (col.runes || []).forEach(function(r) { addPrice(r.customPrice, r.priceCurrency, r.quantity || 1); });
    (col.battlefields || []).forEach(function(b) { addPrice(b.customPrice, b.priceCurrency, 1); });
    (col.sideboard || []).forEach(function(s) { addPrice(s.customPrice, s.priceCurrency, 1); });
  }
  cards.forEach(function(c) { addPrice(c.customPrice, c.priceCurrency, c.quantity || 1); });
  if (isDeck && col.dons) {
    col.dons.forEach(function(d) { addPrice(d.customPrice, d.priceCurrency, 1); });
  }
  return { ARS: ars, USD: usd };
}

// ─── Binder ──────────────────────────────────────────────────────────────
async function toggleBinderPublic(id) {
  const col = collections[id] || ventaCols[id];
  if (!col) return;
  col.is_public = !col.is_public;
  if (isAuthenticated() && !(_draftArmed && draftBaselineReady())) {
    const { error } = await supabaseClient.from("binders")
      .update({ is_public: col.is_public, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { _DEBUG && console.error("Toggle public error:", error); col.is_public = !col.is_public; return; }
    col._synced = true;
  }
  if (collections[id]) guardarCollections();
  if (ventaCols[id]) guardarVenta();
  if (typeof invalidateExploreCache === 'function') invalidateExploreCache();
  const currentView = document.querySelector(".view-pane.active");
  if (currentView?.id === "binderView") renderBinder();
  if (currentView?.id === "ventaView") renderVentaView();
}
// ─── Deck Picker ───────────────────────────────────────────────────────
let _deckPickerResolve = null;
let _deckPickerInterval = null;

// ─── Catalog quick-add target ─────────────────────────────────────────────
let catalogTargetId = null;      // id de la colección destino (binder o venta)
let catalogTargetType = null;    // "collection" | "venta"
function getCatalogTargetCol() {
  if (!catalogTargetId) return null;
  var target = catalogTargetType === "venta" ? ventaCols : collections;
  return (target && target[catalogTargetId]) || null;
}
function limpiarAddingState() {
  addingToBinderId = null; addingToBinderName = null; addingToBinderType = null;
  var banner = document.getElementById("catalogAddBanner");
  if (banner) banner.style.display = "none";
  if (typeof refreshCatalogTargetSelect === "function") refreshCatalogTargetSelect();
}
function actualizarCatalogBanner() {
  var banner = document.getElementById("catalogAddBanner");
  if (!banner) return;
  if (addingToBinderId) {
    document.getElementById("catalogAddBinderName").textContent = addingToBinderName || "";
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}
// Va al catálogo con destino quick-add preseleccionado (mismo que elegirlo en el select)
function goToCatalogWithTarget(type, id) {
  if (typeof limpiarPendientes === "function") limpiarPendientes();
  addingToBinderId = null; addingToBinderName = null; addingToBinderType = null;
  var banner = document.getElementById("catalogAddBanner");
  if (banner) banner.style.display = "none";
  catalogTargetId = id || null;
  catalogTargetType = type || null;
  if (typeof navigateToView === "function") navigateToView("catalog", {}, {});
  else mostrarVista("catalog");
}
// ─── Create / Rename Modal ──────────────────────────────────────────────
let _createCallback = null;


// ─── TCG Selector ─────────────────────────────────────────────────────────
async function renderTcgSelector() {
  const grid = document.getElementById("tcgGrid");
  if (typeof skeletonTcgSelector === 'function') skeletonTcgSelector(grid, 3);
  let enabledTcgs = new Set();
  try {
    const res = await fetch("config/games.json");
    const gamesConfig = await res.json();
    Object.entries(gamesConfig).forEach(([id, cfg]) => {
      if (cfg.enabled) enabledTcgs.add(id);
    });
  } catch (e) {
    // If games.json fails, show all TCGs
    tcgList.forEach(t => enabledTcgs.add(t.id));
  }
  const visibleTcgs = tcgList.filter(t => enabledTcgs.has(t.id));
  grid.innerHTML = visibleTcgs.map(t => `
    <div class="tcg-card" data-tcg="${t.id}">
      ${t.logo ? `<img src="${t.logo}" alt="${t.name}" class="tcg-card-logo" onerror="this.style.display='none'">` : ""}
      ${!t.logo ? `<div class="tcg-card-icon" style="background:${t.color}">${t.short}</div>` : ""}
      ${!t.logo ? `<h3>${t.name}</h3><p>${t("core.tcg_tagline")}</p>` : ""}
    </div>`).join("");
}
function updateTcgHeroForView(view) {
  const el = document.querySelector("#tcgSelectorHero .tcg-hero-title span");
  const subtitle = document.querySelector("#tcgSelectorHero .tcg-hero-subtitle");
  if (!el || !subtitle) return;
  el.textContent = t("core.fav_tcg");
  const subs = { catalog: t("core.hero_catalog"), collections: t("core.hero_collections"), ventaCols: t("core.hero_venta"), explore: t("core.hero_explore") };
  subtitle.textContent = subs[view] || "";
}
async function selectTcg(tcgId) {
  // Save and clear previous TCG data
  if (currentTcg && currentTcg !== tcgId) {
    guardarCollections();
    guardarVenta();
    Object.keys(collections).forEach(k => delete collections[k]);
    Object.keys(ventaCols).forEach(k => delete ventaCols[k]);
  }
  currentTcg = tcgId;
  const tcg = tcgList.find(t => t.id === tcgId);
  if (!tcg) return;
  const langToggle = document.getElementById("catalogLangToggle");
  if (tcgId === "riftbound") {
    if (langToggle) langToggle.style.display = "none";
    state.catalog.catalogLanguage = "en";
  } else {
    if (langToggle) {
      langToggle.style.display = "";
      langToggle.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-lang") === state.catalog.catalogLanguage);
      });
    }
  }
  await cargarCartas();
  document.getElementById("welcomeTcgName").textContent = tcg.name;
  await initCollections();
  initVenta();
  if (isAuthenticated()) await reloadVentaFromDb();
  const targetView = pendingView || "tcgHome";
  if (pendingView) pendingView = null;
  mostrarVista(targetView);
}
// ─── View System ──────────────────────────────────────────────────────────
function mostrarVista(vista, navState) {
  if (!requestStagedExit(vista, function() { mostrarVista(vista, navState); })) return;
  if (typeof tourSectionEnter === "function") { try { tourSectionEnter(vista); } catch (e) {} } // ponytail: hint tour primera visita, nunca bloquea
  if (DRAFT_CTX[vista]) armDraft(); else disarmDraft();
  if (vista !== "catalog") limpiarAddingState();
  if (navState && navState.currentTcg) {
    currentTcg = navState.currentTcg;
    currentCollectionId = navState.currentCollectionId;
    currentVentaId = navState.currentVentaId;
    binderPage = navState.binderPage || 1;
    ventaPage = navState.ventaPage || 1;
    if (navState.filters && typeof applyFiltersFromUrl === 'function') {
      applyFiltersFromUrl(navState.filters, true);
    }
  }
  document.getElementById("tcgSelector").classList.remove("active");
  document.getElementById("welcomeView").classList.remove("active");
  document.getElementById("catalogView").classList.remove("active");
  document.getElementById("collectionManager").classList.remove("active");
  document.getElementById("binderView").classList.remove("active");
  document.getElementById("ventaManager").classList.remove("active");
  document.getElementById("ventaView").classList.remove("active");
  document.getElementById("exploreView").classList.remove("active");
  document.getElementById("exploreDetailView").classList.remove("active");
  const profileView = document.getElementById("profileView");
  if (profileView) profileView.classList.remove("active");
  document.getElementById("tcgSelector").style.display = "none";
  document.getElementById("welcomeView").style.display = "none";
  document.getElementById("catalogView").style.display = "none";
  document.getElementById("resultsCounter").style.display = "none";
  cardsContainer.style.display = "none";
  document.getElementById("catalogPagination").style.display = "none";
  document.getElementById("binderView").style.display = "none";
  document.getElementById("trackingHeader").style.display = "none";
  document.getElementById("collectionManager").style.display = "none";
  document.getElementById("ventaManager").style.display = "none";
  document.getElementById("ventaView").style.display = "none";
  document.getElementById("exploreView").style.display = "none";
  document.getElementById("exploreDetailView").style.display = "none";
  if (profileView) profileView.style.display = "none";
  const tcg = tcgList.find(t => t.id === currentTcg);
  document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
  const topBarTcgName = document.getElementById("topBarTcgName");
  const sidebarTcgName = document.getElementById("sidebarTcgName");
  if (topBarTcgName) topBarTcgName.textContent = tcg ? tcg.name : "";
  if (sidebarTcgName) sidebarTcgName.textContent = tcg ? tcg.name : t("core.select_tcg");
  if (vista === "catalog") {
    if (!currentTcg) {
      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      updateTcgHeroForView("catalog");
      document.getElementById("sidebarCatalog")?.classList.add("active");
      document.getElementById("bottomCatalog")?.classList.add("active");
      return;
    }
    if (!addingToBinderId && typeof limpiarPendientes === "function") limpiarPendientes();
    if (typeof refreshCatalogTargetSelect === "function") refreshCatalogTargetSelect();
    document.getElementById("catalogView").classList.add("active");
    document.getElementById("catalogView").style.display = "";
    resultsCounter.style.display = "";
    cardsContainer.style.display = "";
    document.getElementById("catalogPagination").style.display = "";
    document.getElementById("sidebarCatalog")?.classList.add("active");
    document.getElementById("bottomCatalog")?.classList.add("active");
    actualizarCatalogBanner();
    cargarFiltros();
    if (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) {
      renderCards();
    } else {
      cardsContainer.innerHTML = '<div class="no-data-msg"><h2>' + t("core.tcg_unavailable_title", { name: (tcg ? tcg.name : t("core.fallback_tcg")) }) + '</h2><p>' + t("core.tcg_unavailable_body") + '</p></div>';
      resultsCounter.style.display = "none";
      document.getElementById("catalogPagination").style.display = "none";
    }
  } else if (vista === "binder") {
    document.getElementById("binderView").classList.add("active");
    document.getElementById("binderView").style.display = "";
    document.getElementById("sidebarColecciones")?.classList.add("active");
    document.getElementById("bottomColecciones")?.classList.add("active");
    const bCol = collections[currentCollectionId];
    if (!window._collectionsReady || (bCol && Object.keys(cartasMap).length === 0)) {
      if (bCol && bCol.subtype === "deck" && typeof skeletonDeck === 'function') {
        const bdc = document.getElementById("binderDeckContainer");
        if (bdc) { bdc.style.display = ""; skeletonDeck(bdc); }
        const bg = document.getElementById("binderGrid");
        if (bg) bg.style.display = "none";
      } else if (typeof skeletonCardGrid === 'function') {
        skeletonCardGrid(document.getElementById("binderGrid"));
      }
    }
    ensureCartasLoaded().then(() => {
      if (!window._collectionsReady) return;
      renderBinder();
    });
  } else if (vista === "collections") {
    if (!currentTcg) {

      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      updateTcgHeroForView("collections");
    document.getElementById("sidebarColecciones")?.classList.add("active");
    document.getElementById("bottomColecciones")?.classList.add("active");
      return;
    }
    document.getElementById("collectionManager").classList.add("active");
    document.getElementById("collectionManager").style.display = "";
    if (typeof refreshSpaceCounters === "function") refreshSpaceCounters();
    document.getElementById("sidebarColecciones")?.classList.add("active");
    document.getElementById("bottomColecciones")?.classList.add("active");
    if (!window._collectionsReady) {
      if (typeof skeletonCoverGrid === 'function') skeletonCoverGrid(document.getElementById("collectionList"));
      ensureCartasLoaded().then(() => { if (window._collectionsReady) renderCollectionList(); });
    } else {
      ensureCartasLoaded().then(() => renderCollectionList());
    }
  } else if (vista === "ventaCols") {
    if (!currentTcg) {

      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      updateTcgHeroForView("ventaCols");
      document.getElementById("sidebarVenta")?.classList.add("active");
      document.getElementById("bottomVenta")?.classList.add("active");
      return;
    }
      document.getElementById("ventaManager").classList.add("active");
      if (typeof refreshSpaceCounters === "function") refreshSpaceCounters();
    document.getElementById("ventaManager").style.display = "";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    if (!window._ventaReady) {
      if (typeof skeletonCoverGrid === 'function') skeletonCoverGrid(document.getElementById("ventaList"));
      ensureCartasLoaded().then(() => { if (window._ventaReady) renderVentaList(); });
    } else if (Object.keys(cartasMap).length === 0) {
      ensureCartasLoaded().then(() => renderVentaList());
    } else {
      renderVentaList(); // ponytail: sync si listo, skeleton solo en carga real (evita robar primer click)
    }
  } else if (vista === "venta") {
    document.getElementById("ventaView").classList.add("active");
    document.getElementById("ventaView").style.display = "";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    const vCol = ventaCols[currentVentaId];
    if (!window._ventaReady || (vCol && Object.keys(cartasMap).length === 0)) {
      if (vCol && vCol.subtype === "deck" && typeof skeletonDeck === 'function') {
        const vdc = document.getElementById("ventaDeckContainer");
        if (vdc) { vdc.style.display = ""; skeletonDeck(vdc); }
        const vg = document.getElementById("ventaGrid");
        if (vg) vg.style.display = "none";
      } else if (typeof skeletonCardGrid === 'function') {
        skeletonCardGrid(document.getElementById("ventaGrid"));
      }
      ensureCartasLoaded().then(() => {
        if (!window._ventaReady) return;
        renderVentaView();
      });
    } else {
      renderVentaView(); // ponytail: sync si listo, sin skeleton (evita robar primer click)
    }
  } else if (vista === "tcgHome") {
    if (!currentTcg) {
      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      document.getElementById("tcgSelectorHero").style.display = "none";
      document.getElementById("tcgGrid").style.display = "none";
      document.getElementById("tcgHomePlaceholder").style.display = "block";
      document.getElementById("sidebarHome")?.classList.add("active");
      document.getElementById("bottomHome")?.classList.add("active");
      return;
    }
    document.getElementById("welcomeView").classList.add("active");
    document.getElementById("welcomeView").style.display = "";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  } else if (vista === "explore") {
    if (!currentTcg) {

      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      updateTcgHeroForView("explore");
      document.getElementById("sidebarExplore")?.classList.add("active");
      document.getElementById("bottomExplore")?.classList.add("active");
      return;
    }
    document.getElementById("exploreView").classList.add("active");
    document.getElementById("exploreView").style.display = "";
    document.getElementById("sidebarExplore")?.classList.add("active");
    document.getElementById("bottomExplore")?.classList.add("active");
    exploreDetailBinder = null;
    if (currentTcg && Object.keys(cartasMap).length === 0) {
      cargarCartas()
        .then(() => renderExploreView())
        .catch(err => {
          const isAbort = err.name === 'AbortError' || err.message?.toLowerCase().includes('abort');
          if (!isAbort) console.error('Explore cartas error:', err);
          renderExploreView();
        });
    } else {
      renderExploreView();
    }
  } else if (vista === "exploreDetail") {
    document.getElementById("exploreDetailView").classList.add("active");
    document.getElementById("exploreDetailView").style.display = "";
    document.getElementById("sidebarExplore")?.classList.add("active");
    document.getElementById("bottomExplore")?.classList.add("active");
    if (!exploreDetailBinder && typeof skeletonExploreDetail === 'function') {
      skeletonExploreDetail(document.getElementById("exploreDetailContainer"));
    }
    if (currentTcg && Object.keys(cartasMap).length === 0) {
      cargarCartas()
        .then(() => renderExploreDetail())
        .catch(err => {
          const isAbort = err.name === 'AbortError' || err.message?.toLowerCase().includes('abort');
          if (!isAbort) console.error('ExploreDetail cartas error:', err);
          renderExploreDetail();
        });
    } else {
      renderExploreDetail();
    }
  } else if (vista === "profile") {
    if (profileView) { profileView.classList.add("active"); profileView.style.display = ""; }
    document.getElementById("sidebarProfile")?.classList.add("active");
  } else if (vista === "home") {
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    document.getElementById("tcgSelectorHero").style.display = "none";
    document.getElementById("tcgGrid").style.display = "none";
    document.getElementById("tcgHomePlaceholder").style.display = "block";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  } else {
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    document.getElementById("tcgSelectorHero").style.display = "none";
    document.getElementById("tcgGrid").style.display = "none";
    document.getElementById("tcgHomePlaceholder").style.display = "block";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  }
}
// Modal
closeModal.addEventListener("click", () => { modal.style.display = "none"; });
modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
document.addEventListener("keydown", e => {
  if (modal.style.display !== "flex") return;
  if (e.key === "ArrowLeft") {
    const prev = document.querySelector(".modal-nav-btn.prev-btn:not([disabled])");
    if (prev) prev.click();
  } else if (e.key === "ArrowRight") {
    const next = document.querySelector(".modal-nav-btn.next-btn:not([disabled])");
    if (next) next.click();
  } else if (e.key === "Escape") {
    modal.style.display = "none";
  }
});
// TCG Selector
document.getElementById("tcgGrid").addEventListener("click", e => {
  const card = e.target.closest(".tcg-card");
  if (card) { if (!requestStagedExit("tcg", function() { selectTcg(card.dataset.tcg); })) return; selectTcg(card.dataset.tcg); }
});
// Welcome cards
document.querySelectorAll(".welcome-card").forEach(card => {
  card.addEventListener("click", () => {
    const view = card.getAttribute("data-view");
    navigateToView(view, {}, {});
  });
});
// Header / Sidebar nav
document.getElementById("sidebarLogo")?.addEventListener("click", async () => {
  const singleMode = await isSingleTcgMode();
  if (!singleMode && currentTcg) {
    guardarCollections();
    guardarVenta();
    currentTcg = null;
  }
  pendingView = null;
  navigateToView("home", {}, {});
});
document.getElementById("welcomeBackBtn").addEventListener("click", async () => {
  const singleMode = await isSingleTcgMode();
  if (!singleMode && currentTcg) {
    guardarCollections();
    guardarVenta();
    currentTcg = null;
  }
  pendingView = null;
  navigateToView("home", {}, {});
});
document.querySelectorAll(".sidebar-nav-item").forEach(item => {
  item.addEventListener("click", async () => {
    const view = item.getAttribute("data-view");
    const singleMode = await isSingleTcgMode();
    if (view === "home") {
      if (!singleMode && currentTcg) {
        guardarCollections();
        guardarVenta();
        currentTcg = null;
      }
      pendingView = null;
      navigateToView("home", {}, {});
    }
    else if (view === "catalog") {
      if (!singleMode) {
        if (currentTcg) { guardarCollections(); guardarVenta(); }
        currentTcg = null;
        pendingView = "catalog";
      }
      navigateToView("catalog", {}, {});
    }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; if (!currentTcg) pendingView = "collections"; navigateToView("collections", {}, {}); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; if (!currentTcg) pendingView = "ventaCols"; navigateToView("ventaCols", {}, {}); }
    else if (view === "explore") { if (!currentTcg) pendingView = "explore"; navigateToView("explore", {}, {}); }
    else if (view === "profile") { openProfile(); }
  });
});
// Bottom nav
document.querySelectorAll(".bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", async () => {
    const view = btn.getAttribute("data-view");
    const singleMode = await isSingleTcgMode();
    if (view === "home") {
      if (!singleMode && currentTcg) {
        guardarCollections();
        guardarVenta();
        currentTcg = null;
      }
      pendingView = null;
      navigateToView("home", {}, {});
    }
    else if (view === "catalog") {
      if (!singleMode) {
        if (currentTcg) { guardarCollections(); guardarVenta(); }
        currentTcg = null;
        pendingView = "catalog";
      }
      navigateToView("catalog", {}, {});
    }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; if (!currentTcg) pendingView = "collections"; navigateToView("collections", {}, {}); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; if (!currentTcg) pendingView = "ventaCols"; navigateToView("ventaCols", {}, {}); }
    else if (view === "explore") { if (!currentTcg) pendingView = "explore"; navigateToView("explore", {}, {}); }
    else if (view === "tcgHome") {
      if (!singleMode && currentTcg) {
        guardarCollections();
        guardarVenta();
        currentTcg = null;
      }
      pendingView = null;
      navigateToView("home", {}, {});
    }
  });
});
document.getElementById("binderBackBtn")?.addEventListener("click", () => {
  if (!requestStagedExit("collections", function() { history.back(); })) return;
  history.back();
});
document.getElementById("exploreDetailBackBtn")?.addEventListener("click", () => { history.back(); });
document.getElementById("ventaBackBtn")?.addEventListener("click", () => {
  if (!requestStagedExit("ventaCols", function() { history.back(); })) return;
  history.back();
});
// ─── Landing Page Buttons ────────────────────────────────────────────────
document.getElementById("landingExploreBtn")?.addEventListener("click", () => {
  navigateToView("catalog", {}, {});
});
document.querySelectorAll(".footer-link[data-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-action");
    if (action === "catalog") {
      navigateToView("catalog", {}, {});
    } else {
      document.querySelector(`#${action}Section`)?.scrollIntoView({ behavior: "smooth" });
    }
  });
});
document.querySelectorAll("#footerContact, #footerPrivacy, #footerTerms, #footerPrivacyLegal, #footerTermsLegal").forEach(btn => {
  btn.addEventListener("click", () => {
    if (typeof showToast === "function") showToast(t("core.coming_soon_title"), "info");
  });
});
// ═══ Migration & Init ═════════════════════════════════════════════════════
(function migrateOldKeys() {
  const oldCol = localStorage.getItem("tutcg_collections");
  if (oldCol) {
    if (!localStorage.getItem("tutcg_op_collections")) localStorage.setItem("tutcg_op_collections", oldCol);
    localStorage.removeItem("tutcg_collections");
  }
  const oldVenta = localStorage.getItem("tutcg_venta");
  if (oldVenta) {
    if (!localStorage.getItem("tutcg_op_venta")) localStorage.setItem("tutcg_op_venta", oldVenta);
    localStorage.removeItem("tutcg_venta");
  }
})();
(async () => {
  const parsed = router.initRouter();
  // ponytail: F5 vuelve a última vista (deep-link manda sobre snapshot)
  if ((parsed.route === "home" || !parsed.route) && !(parsed.params && parsed.params.id)) {
    var _rs = (typeof restoreUiState === "function") ? restoreUiState() : null;
    if (_rs) {
      if ((_rs.view === "binder" || _rs.view === "venta" || _rs.view === "exploreDetail") && _rs.id) {
        await navigateToView(_rs.view, { id: _rs.id }, {});
        return;
      }
      if (["collections", "ventaCols", "catalog", "explore", "tcgHome"].indexOf(_rs.view) !== -1) {
        await navigateToView(_rs.view, {}, {});
        return;
      }
    }
  }
  if (parsed.route === 'binder' && parsed.params.id) {
    currentCollectionId = parsed.params.id;
    mostrarVista("binder");
    await cargarCartas();
    const binder = await loadPublicBinderById(parsed.params.id);
    if (binder) {
      collections[binder.id] = binder;
      currentCollectionId = binder.id;
    }
    await navigateToView("binder", parsed.params, parsed.filters);
    return;
  } else if (parsed.route === 'exploreDetail' && parsed.params.id) {
    mostrarVista("exploreDetail");
    await cargarCartas();
    const binder = await loadPublicBinderById(parsed.params.id);
    if (binder) {
      exploreDetailBinder = binder;
      const { data: prof } = await supabaseClient.from("profiles").select("username, avatar_url").eq("id", binder.user_id).single();
      if (typeof setExploreDetailOwner === 'function' && prof) {
        setExploreDetailOwner(prof.username || t("core.fallback_user"), prof.avatar_url || "");
      }
    } else {
      await navigateToView("explore", {}, {});
      return;
    }
    await navigateToView("exploreDetail", parsed.params, parsed.filters);
    return;
  }
  if (parsed.route && typeof navigateToView === 'function') {
    await navigateToView(parsed.route, parsed.params, parsed.filters);
    return;
  }
  const singleMode = await isSingleTcgMode();
  if (singleMode) {
    await cargarCartas();
  } else {
    renderTcgSelector();
  }
  mostrarVista("home");
})();
(async () => {
  await initCollections();
  initVenta();
  if (isAuthenticated()) await reloadVentaFromDb();
  if (typeof restorePersistedDraft === "function") restorePersistedDraft();
})();
(async () => {
  const singleMode = await isSingleTcgMode();
  if (!singleMode) {
    cargarCartas();
    cargarStatsLanding();
  }
})();
// ─── Auth Integration (UI listeners bound in auth.js; state sync below) ──
// ─── Mobile Sidebar Toggle ──────────────────────────────────────────────
function toggleSidebar(open) {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.toggle("open", open);
  overlay.classList.toggle("open", open);
}
document.getElementById("menuBtn")?.addEventListener("click", () => toggleSidebar(true));
document.getElementById("sidebarOverlay")?.addEventListener("click", () => toggleSidebar(false));
document.querySelectorAll(".sidebar-nav-item, .sidebar-footer button").forEach(el => {
  el.addEventListener("click", () => { if (window.innerWidth < 768) toggleSidebar(false); });
});
// Update auth UI after init and sync data
var _lastAuthUid = null;
onAuthChange(async (user) => {
  updateAuthUI();
  var uid = user ? user.id : null;
  // ponytail: nunca reload al volver — SIGNED_IN se re-emite al reenfocar pestaña.
  // Solo init real en primer load o cambio de usuario. Save manual o F5 trae datos.
  if (uid && uid === _lastAuthUid && window._collectionsReady && window._ventaReady) return;
  _lastAuthUid = uid;
  if (user && currentTcg) {
    if (typeof draftDirty === "function" && draftDirty()) return; // ponytail: no pisar borrador con rebuild al reenfocar
    await initCollections();
    await reloadVentaFromDb();
    if (document.querySelector(".view-pane.active")?.id === "collectionManager") renderCollectionList();
    if (document.querySelector(".view-pane.active")?.id === "binderView") renderBinder();
    if (document.querySelector(".view-pane.active")?.id === "ventaView") renderVentaView();
    if (document.querySelector(".view-pane.active")?.id === "ventaManager") renderVentaList();
  }
});
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    document.getElementById("searchInput")?.focus();
  }
});



// ─── Confirm Modal ──────────────────────────────────────────────────────
let _confirmCallback = null;
function showConfirmModal(msg, onConfirm) {
  document.getElementById("confirmModalMsg").textContent = msg;
  document.getElementById("confirmModal").style.display = "flex";
  _confirmCallback = onConfirm;
}
document.getElementById("confirmModalCancel").addEventListener("click", () => {
  document.getElementById("confirmModal").style.display = "none";
  _confirmCallback = null;
});
document.getElementById("confirmModalOk").addEventListener("click", () => {
  document.getElementById("confirmModal").style.display = "none";
  if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
});
document.getElementById("confirmModal").addEventListener("click", e => {
  if (e.target === e.currentTarget) {
    document.getElementById("confirmModal").style.display = "none";
    _confirmCallback = null;
  }
});
// ─── Staged draft bar + exit modal wiring ──────────────────────────────────
document.getElementById("draftSaveBtn")?.addEventListener("click", () => { saveDraft(); });
document.getElementById("draftDiscardBtn")?.addEventListener("click", () => { discardDraft(); });
document.getElementById("draftModalSaveBtn")?.addEventListener("click", () => { saveDraft(); if (!_dirty) closeDraftModal(true); });
document.getElementById("draftModalDiscardBtn")?.addEventListener("click", () => { discardDraft(); closeDraftModal(true); });
document.getElementById("draftStayBtn")?.addEventListener("click", () => closeDraftModal(false));
document.getElementById("draftModal")?.addEventListener("click", e => { if (e.target === e.currentTarget) closeDraftModal(false); });
window.addEventListener("beforeunload", function(e) {
  if (typeof snapshotUiState === "function") snapshotUiState(); // ponytail: última vista/página sobrevive F5
  if (typeof _dirty !== "undefined" && _dirty) { e.preventDefault(); e.returnValue = ""; }
});
// ─── UI snapshot — nunca reload al volver (solo save manual o F5 trae datos) ──
var _lastRoute = "home";
var _lastRouteId = null;
function snapshotUiState() {
  try {
    sessionStorage.setItem("tutcg_ui_state", JSON.stringify({
      view: window._lastRoute || "home",
      id: window._lastRouteId || null,
      currentTcg: (typeof currentTcg !== "undefined" ? currentTcg : null),
      currentCollectionId: (typeof currentCollectionId !== "undefined" ? currentCollectionId : null),
      currentVentaId: (typeof currentVentaId !== "undefined" ? currentVentaId : null),
      binderPage: (typeof binderPage !== "undefined" ? binderPage : 1),
      ventaPage: (typeof ventaPage !== "undefined" ? ventaPage : 1)
    }));
  } catch (e) {}
}
function restoreUiState() {
  try {
    var raw = sessionStorage.getItem("tutcg_ui_state");
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!s || !s.view || s.view === "home") return null;
    if (s.currentTcg) currentTcg = s.currentTcg;
    if (s.currentCollectionId !== undefined) currentCollectionId = s.currentCollectionId;
    if (s.currentVentaId !== undefined) currentVentaId = s.currentVentaId;
    if (s.binderPage) binderPage = s.binderPage;
    if (s.ventaPage) ventaPage = s.ventaPage;
    window._lastRoute = s.view;
    window._lastRouteId = s.id || null;
    return s;
  } catch (e) { return null; }
}
document.addEventListener("visibilitychange", function() { if (document.hidden) snapshotUiState(); });
// ─── Router Integration ────────────────────────────────────────────────────
async function navigateToView(route, params, filters) {
  window._lastRoute = route;
  window._lastRouteId = (params && params.id) || null;
  // ponytail: snapshot real ocurre en visibilitychange/beforeunload (globales ya actualizados)
  var navState = {
    view: route,
    currentTcg: currentTcg,
    currentCollectionId: params.id || null,
    currentVentaId: params.id || null,
    binderPage: binderPage,
    ventaPage: ventaPage,
    filters: filters || {}
  };
  if (route === 'catalog' || route === 'catalogView') {
    if (currentTcg && typeof tcgConfigs !== 'undefined' && tcgConfigs[currentTcg]) {
      if (Object.keys(cartasMap).length === 0) {
        router.navigateToRoute('catalog', {}, navState);
        await cargarCartas();
        mostrarVista("catalog", navState);
        return;
      }
    }
    router.navigateToRoute('catalog', {}, navState);
  } else if (route === 'collections') {
    router.navigateToRoute('collections', {}, navState);
  } else if (route === 'binder') {
    currentCollectionId = params.id;
    navState.currentCollectionId = params.id;
    router.navigateToRoute('binder', { id: params.id }, navState);
  } else if (route === 'ventaCols') {
    router.navigateToRoute('ventaCols', {}, navState);
  } else if (route === 'venta') {
    currentVentaId = params.id;
    navState.currentVentaId = params.id;
    router.navigateToRoute('venta', { id: params.id }, navState);
  } else if (route === 'explore') {
    router.navigateToRoute('explore', {}, navState);
  } else if (route === 'exploreDetail') {
    navState.currentCollectionId = params.id;
    router.navigateToRoute('exploreDetail', { id: params.id }, navState);
  } else if (route === 'profile') {
    router.navigateToRoute('profile', {}, navState);
  } else {
    router.navigateToRoute('home', {}, navState);
  }
}
function applyFiltersFromUrl(filters, quiet) {
  if (!filters) return;
  if (rebuildingFilters) return;
  rebuildingFilters = true;
  if (filters.expansion && expansionFilter) expansionFilter.value = filters.expansion;
  if (filters.color && colorFilter) colorFilter.value = filters.color;
  if (filters.rarity && rarityFilter) rarityFilter.value = filters.rarity;
  if (filters.type && typeFilter) typeFilter.value = filters.type;
  if (filters.page) currentPage = parseInt(filters.page, 10) || 1;
  if (filters.language && state && state.catalog) {
    state.catalog.catalogLanguage = filters.language;
    var langBtns = document.querySelectorAll("#catalogLangToggle .lang-btn");
    langBtns.forEach(function(b) { b.classList.toggle("active", b.getAttribute("data-lang") === filters.language); });
  }
  rebuildingFilters = false;
}
async function loadPublicBinderById(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*), target_cards")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    const cfg = data.config || {};
    const subtype = cfg.subtype || "binder";
    if (subtype === "tracking") {
      const ownedKeys = new Set((data.binder_cards || []).map(c => c.card_id));
      if (data.target_cards && Array.isArray(data.target_cards)) {
        data.target_cards.forEach(function(c) { if (ownedKeys.has(c._key)) c.owned = true; });
      }
    }
    return data;
  } catch (e) { console.error("Error loading public binder:", e); return null; }
}
function onNavigate(path, state) {
  if (state && state.view) {
    mostrarVista(state.view, state);
  }
}
