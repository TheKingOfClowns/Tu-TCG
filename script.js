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
const unlimitedCards = new Set(["OP16-042"]);
function isUnlimited(card) { return card && unlimitedCards.has(card.card_set_id); }
let cartasFiltradas = [];
let currentCardIndex = -1;
const cardsPerPage = 42;
let currentPage = 1;
let cartas = [];
let setCategoryMap = {};
let cartasMap = {};
let pendingCards = {};
let binderPage = 1;
const binderPerPage = 20;
let currentTcg = null;
let pendingView = null;
let prbBadgeMap = {};
let tcgplayerMap;
let collections = {};
let currentCollectionId = null;
let ventaCols = {};
let currentVentaId = null;
let ventaPage = 1;
const ventaPerPage = 20;
let addingToBinderId = null;
let addingToBinderName = null;
let addingToBinderType = null;
let rebuildingFilters = false;
let exploreDetailBinder = null;
const MANGA_PR01 = new Set([
  "EB01-006", "OP01-016", "OP01-120", "OP02-013", "OP03-122",
  "OP04-083", "OP05-069", "OP05-074", "OP05-119", "OP06-118"
]);
let prb02CardlistLabels = null;
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
// ─── Expansion Configuration ──────────────────────────────────────────────
const nombresExpansiones = {
  "OP-01":"OP01 - Romance Dawn",
  "OP01":"OP01 - Romance Dawn",
  "OP-02":"OP02 - Paramount War",
  "OP02":"OP02 - Paramount War",
  "OP-03":"OP03 - Pillars of Strength",
  "OP03":"OP03 - Pillars of Strength",
  "OP-04":"OP04 - Kingdoms of Intrigue",
  "OP04":"OP04 - Kingdoms of Intrigue",
  "OP-05":"OP05 - Awakening of the New Era",
  "OP05":"OP05 - Awakening of the New Era",
  "OP-06":"OP06 - Wings of the Captain",
  "OP06":"OP06 - Wings of the Captain",
  "EB-01":"EB01 - Memorial Collection",
  "EB01":"EB01 - Memorial Collection",
  "OP-07":"OP07 - 500 Years in the Future",
  "OP07":"OP07 - 500 Years in the Future",
  "PRB-01":"PRB01 - The Best",
  "PRB01":"PRB01 - The Best",
  "OP-08":"OP08 - Two Legends",
  "OP08":"OP08 - Two Legends",
  "OP-09":"OP09 - Emperors in the New World",
  "OP09":"OP09 - Emperors in the New World",
  "OP-10":"OP10 - Royal Blood",
  "OP10":"OP10 - Royal Blood",
  "EB-02":"EB02 - Anime 25th Collection",
  "EB02":"EB02 - Anime 25th Collection",
  "OP-11":"OP11 - A Fist of Divine Speed",
  "OP11":"OP11 - A Fist of Divine Speed",
  "OP-12":"OP12 - Legacy of the Master",
  "OP12":"OP12 - Legacy of the Master",
  "OP-13":"OP13 - Crossed Paths",
  "OP13":"OP13 - Crossed Paths",
  "EB-03":"EB03 - One Piece Heroines",
  "EB03":"EB03 - One Piece Heroines",
  "OP14-EB04":"OP14 - Azure Sea's Seven + EB04",
  "OP15-EB04":"OP15 - Sky Island + EB04",
  "PRB-02":"PRB02 - The Best Vol.2",
  "PRB02":"PRB02 - The Best Vol.2",
  "OP-16":"OP16 - The Time of Battle",
  "OP16":"OP16 - The Time of Battle",
  "OP-14":"OP14 - The Azure Sea's Seven",
  "OP-15":"OP15 - Adventure on KAMI's Island",
  "EB-04":"EB04 - EGGHEAD CRISIS",
  "DON!!":"--- DON!! Cards ---",
  "PROMO":"Promo Cards"
};
for (let i = 1; i <= 36; i++) {
  const key = "ST-" + String(i).padStart(2,"0");
  nombresExpansiones[key] = key + " - Starter Deck";
}
const ordenExpansiones = {
  "OP-01":1, "OP-02":2, "OP-03":3, "OP-04":4, "OP-05":5, "OP-06":6,
  "EB-01":7,
  "OP-07":8, "OP-08":9,
  "PRB-01":10,
  "OP-09":11, "OP-10":12,
  "EB-02":13,
  "OP-11":14, "OP-12":15,
  "PRB-02":16,
  "OP-13":17,
  "OP-14":18, "OP14-EB04":18,
  "EB-04":19,
  "EB-03":20,
  "OP-15":21, "OP15-EB04":21,
  "OP-16":22,
  "DON!!":23,
  "PROMO":24
};
const coloresES = {
  "Red":"Rojo", "Blue":"Azul", "Green":"Verde",
  "Purple":"Morado", "Black":"Negro", "Yellow":"Amarillo"
};
// ─── Helpers ──────────────────────────────────────────────────────────────
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
// ─── Card Data Loading ───────────────────────────────────────────────────
async function cargarCartas() {
  cardsContainer.innerHTML = `<div class="catalog-skeleton">${Array(12).fill(`
    <div class="sk-card">
      <div class="sk-img"></div>
      <div class="sk-body">
        <div class="sk-line"></div>
        <div class="sk-line short"></div>
      </div>
    </div>`).join("")}</div>`;
  try {
    const configRes = await fetch("config/games.json");
    const gamesConfig = await configRes.json();
    const activeGame = Object.entries(gamesConfig).find(([id,g]) => id === currentTcg && g.enabled) || Object.entries(gamesConfig).find(([,g]) => g.enabled);
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
    const statCards = document.getElementById("statCards");
    if (statCards) statCards.textContent = cartas.length.toLocaleString();
    const expansions = new Set(cartas.map(c => c.set_id).filter(Boolean));
    const statExp = document.getElementById("statExpansions");
    if (statExp) statExp.textContent = expansions.size;
    cargarFiltros();
    actualizarFiltrosPorExpansion();
    renderCards();
  } catch (error) {
    _DEBUG && console.error("Error cargando cards_master.json:", error);
    cardsContainer.innerHTML = `<div class="no-data-msg"><h2>Error al cargar las cartas</h2><p>No se pudieron cargar los datos. Verificá tu conexión e intentá de nuevo.</p></div>`;
  }
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
function showToast(msg, type) {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-notification" + (type ? " " + type : "");
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
// ─── Collections / Supabase + LocalStorage ──────────────────────────────
function guardarCollections() {
  if (!currentTcg) return;
  Object.values(collections).forEach(b => b._synced = false);
  localStorage.setItem(collectionsKey(), JSON.stringify(collections));
  if (isAuthenticated()) syncCollectionsToSupabase().catch(function(e) { _DEBUG && console.error(e); });
}
function guardarVenta() {
  if (!currentTcg) return;
  Object.values(ventaCols).forEach(b => b._synced = false);
  localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
  if (isAuthenticated()) syncVentaToSupabase().catch(function(e) { _DEBUG && console.error(e); });
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
  } catch (e) { _DEBUG && console.error("Sync cleanup error:", e); showToast("Error limpiando datos antiguos", "error"); }
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
      const { error: upsertErr } = await supabaseClient.from("binders").upsert({
        id,
        user_id: authUser.id,
        name: binder.name,
        type: type,
        is_public: binder.is_public || false,
        config: config,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (upsertErr) { _DEBUG && console.error("Binder upsert error:", upsertErr); showToast("Error guardando colección en el servidor", "error"); continue; }
      await supabaseClient.from("binder_cards").delete().eq("binder_id", id);
      const allCardRows = [];
      if (binder.subtype === "deck") {
        const deckTcg = config.tcg || "one-piece";
        if (deckTcg === "riftbound") {
          if (binder.legend) {
            allCardRows.push({ binder_id: id, card_id: binder.legend._key || "", quantity: 1, price: binder.legend.customPrice ?? null, card_tag: "legend", sort_order: 0 });
          }
          const collapseTagged = (arr, tag, baseSort) => {
            const collapsed = {};
            (arr || []).forEach((card, idx) => {
              const key = card._key || "";
              if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, card_tag: tag, sort_order: baseSort + idx };
              collapsed[key].quantity += (card.quantity || 1);
            });
            Object.values(collapsed).forEach(c => allCardRows.push({ ...c, binder_id: id }));
          };
          collapseTagged(binder.champions, "champion", 100);
          collapseTagged(binder.cards, "main", 200);
          collapseTagged(binder.runes, "rune", 300);
          collapseTagged(binder.battlefields, "battlefield", 400);
          collapseTagged(binder.sideboard, "sideboard", 500);
        } else {
          if (binder.leader) {
            allCardRows.push({ binder_id: id, card_id: binder.leader._key || "", quantity: 1, price: binder.leader.customPrice ?? null, card_tag: "leader", sort_order: 0 });
          }
          if (binder.cards && binder.cards.length) {
            const collapsed = {};
            binder.cards.forEach((card, idx) => {
              const key = card._key || "";
              const qty = card.quantity || 1;
              if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, sort_order: idx + 1, card_tag: "main" };
              collapsed[key].quantity += qty;
            });
            allCardRows.push(...Object.values(collapsed).map(c => ({ ...c, binder_id: id })));
          }
          if (binder.dons && binder.dons.length) {
            binder.dons.forEach((card, idx) => {
              allCardRows.push({ binder_id: id, card_id: card._key || "", quantity: 1, price: card.customPrice ?? null, card_tag: "don", sort_order: idx + 10000 });
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
          const collapsed = {};
          binder.cards.forEach((card, idx) => {
            const key = card._key || "";
            const qty = card.quantity || 1;
            if (!collapsed[key]) collapsed[key] = { card_id: key, quantity: 0, price: card.customPrice != null ? card.customPrice : null, sort_order: idx };
            collapsed[key].quantity += qty;
          });
          allCardRows.push(...Object.values(collapsed).map(c => ({ ...c, binder_id: id })));
        }
      }
      if (allCardRows.length) {
        const { error: insertErr } = await supabaseClient.from("binder_cards").insert(allCardRows);
        if (insertErr) { _DEBUG && console.error("Cards insert error:", insertErr); showToast("Error guardando cartas en el servidor", "error"); continue; }
      }
      binder._synced = true;
    }
  }
}
async function syncCollectionsToSupabase() { return syncObjectToSupabase(collections, "collection"); }
async function syncVentaToSupabase() { return syncObjectToSupabase(ventaCols, "sale"); }
async function loadBindersFromDb() {
  if (!isAuthenticated()) return null;
  try {
    const { data: binders, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*)")
      .eq("user_id", authUser.id)
      .order("created_at");
    if (error) throw error;
    return binders || [];
  } catch (e) {
    _DEBUG && console.error("Error loading binders:", e);
    showToast("No se pudieron cargar tus datos de la nube. Usando datos locales.", "error");
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
      customPrice: row.price != null ? parseFloat(row.price) : 0
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
    if (row.card_tag === "leader") { leader = entry; }
    else if (row.card_tag === "legend") { legend = entry; }
    else if (row.card_tag === "champion") { entry.quantity = row.quantity; champions.push(entry); }
    else if (row.card_tag === "don") { dons.push(entry); }
    else if (row.card_tag === "rune") { entry.quantity = row.quantity; runes.push(entry); }
    else if (row.card_tag === "battlefield") { battlefields.push(entry); }
    else if (row.card_tag === "sideboard") { sideboard.push(entry); }
    else { entry.quantity = row.quantity; cards.push(entry); }
  });
  return { leader, legend, cards, dons, champions, runes, battlefields, sideboard };
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
async function initCollections() {
  if (isAuthenticated()) {
    const dbBinders = await loadBindersFromDb();
    if (dbBinders && dbBinders.length) {
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
          const cards = buildTrackingCardList(trackingType, trackingConfig);
          const ownedKeys = new Set((b.binder_cards || []).map(c => c.card_id));
          cards.forEach(c => { if (ownedKeys.has(c._key)) c.owned = true; });
          collections[b.id] = {
            id: b.id, name: b.name, subtype: "tracking",
            tracking_type: trackingType, tracking_config: trackingConfig,
            target: cards.length, cards: cards,
            is_public: b.is_public || false, checklist_mode: cfg.checklist_mode || false,
            tcg: cfg.tcg || "one-piece", _synced: true
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
      return;
    }
    if (dbBinders !== null) {
      const localKey = collectionsKey();
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try { collections = JSON.parse(localData); } catch (e) { collections = {}; }
        await syncCollectionsToSupabase();
        return;
      }
    }
  }
  rebuildLocalFallback();
}
function initVenta() {
  const key = ventaKey();
  const saved = localStorage.getItem(key);
  if (saved) { try { ventaCols = JSON.parse(saved); } catch (e) { ventaCols = {}; } } else { ventaCols = {}; }
  localStorage.setItem(key, JSON.stringify(ventaCols));
}
async function reloadVentaFromDb() {
  if (!isAuthenticated()) return;
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
          display_mode: mode, tcg: tcgVal, _synced: true
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
        ventaCols[b.id] = {
          id: b.id, name: b.name, subtype: "binder",
          cards: expandFn(b.binder_cards),
          is_public: b.is_public || false, display_mode: mode, tcg: cfg.tcg || "one-piece", _synced: true
        };
      }
    });
    localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
    return;
  }
  if (dbBinders !== null) {
    const localData = localStorage.getItem(ventaKey());
    if (localData) {
      try { ventaCols = JSON.parse(localData); } catch (e) { ventaCols = {}; }
      await syncVentaToSupabase();
    }
  }
}
async function migrateLocalToSupabase() {
  if (!isAuthenticated()) return;
  rebuildLocalFallback();
  const key = collectionsKey();
  const ventaK = ventaKey();
  const hasCols = Object.keys(collections).length > 0;
  const hasVenta = Object.keys(ventaCols).length > 0;
  if (!hasCols && !hasVenta) return;
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = "Migrando datos locales a la nube…";
  document.body.appendChild(toast);
  if (hasCols) await syncCollectionsToSupabase();
  if (hasVenta) await syncVentaToSupabase();
  localStorage.removeItem(key);
  localStorage.removeItem(ventaK);
  toast.textContent = "Datos sincronizados correctamente";
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

// ─── Binder ──────────────────────────────────────────────────────────────
async function toggleBinderPublic(id) {
  const col = collections[id] || ventaCols[id];
  if (!col) return;
  col.is_public = !col.is_public;
  if (isAuthenticated()) {
    const { error } = await supabaseClient.from("binders")
      .update({ is_public: col.is_public, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { _DEBUG && console.error("Toggle public error:", error); col.is_public = !col.is_public; return; }
    col._synced = true;
  }
  if (collections[id]) guardarCollections();
  if (ventaCols[id]) guardarVenta();
  const currentView = document.querySelector(".view-pane.active");
  if (currentView?.id === "binderView") renderBinder();
  if (currentView?.id === "ventaView") renderVentaView();
}
// ─── Deck Picker ───────────────────────────────────────────────────────
let _deckPickerResolve = null;
let _deckPickerInterval = null;



let selectionMode = false;
let selectedCards = {};
function limpiarAddingState() {
  addingToBinderId = null; addingToBinderName = null; addingToBinderType = null;
  var banner = document.getElementById("catalogAddBanner");
  if (banner) banner.style.display = "none";
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
// ─── Create / Rename Modal ──────────────────────────────────────────────
let _createCallback = null;


// ─── TCG Selector ─────────────────────────────────────────────────────────
function renderTcgSelector() {
  const grid = document.getElementById("tcgGrid");
  grid.innerHTML = tcgList.map(t => `
    <div class="tcg-card" data-tcg="${t.id}">
      ${t.logo ? `<img src="${t.logo}" alt="${t.name}" class="tcg-card-logo" onerror="this.style.display='none'">` : ""}
      ${!t.logo ? `<div class="tcg-card-icon" style="background:${t.color}">${t.short}</div>` : ""}
      ${!t.logo ? `<h3>${t.name}</h3><p>Explora, colecciona y gestiona tus cartas</p>` : ""}
    </div>`).join("");
}
function updateTcgHeroForView(view) {
  const el = document.querySelector("#tcgSelectorHero .tcg-hero-title span");
  const subtitle = document.querySelector("#tcgSelectorHero .tcg-hero-subtitle");
  if (!el || !subtitle) return;
  el.textContent = "TCG favorito";
  const subs = { catalog: "Explora, colecciona y gestiona tus cartas favoritas", collections: "Organiza tus cartas en binders virtuales", ventaCols: "Gestiona tus cartas a la venta con precios personalizados", explore: "Descubre binders y decks de otros coleccionistas" };
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
  const targetView = pendingView || "catalog";
  if (pendingView) pendingView = null;
  mostrarVista(targetView);
}
// ─── View System ──────────────────────────────────────────────────────────
function mostrarVista(vista) {
  if (vista !== "catalog") limpiarAddingState();
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
  if (sidebarTcgName) sidebarTcgName.textContent = tcg ? tcg.name : "Selecciona un TCG";
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
    limpiarPendientes();
    document.getElementById("catalogView").classList.add("active");
    document.getElementById("catalogView").style.display = "";
    resultsCounter.style.display = "";
    cardsContainer.style.display = "";
    document.getElementById("catalogPagination").style.display = "";
    document.getElementById("sidebarCatalog")?.classList.add("active");
    document.getElementById("bottomCatalog")?.classList.add("active");
    actualizarCatalogBanner();
    cargarFiltros();
    if (currentTcg === "one-piece" || currentTcg === "riftbound") {
      renderCards();
    } else {
      cardsContainer.innerHTML = `<div class="no-data-msg"><h2>${tcg ? tcg.name : "Este TCG"} aún no está disponible</h2><p>Estamos trabajando para agregar las cartas. ¡Vuelve pronto!</p></div>`;
      resultsCounter.style.display = "none";
      document.getElementById("catalogPagination").style.display = "none";
    }
  } else if (vista === "binder") {
    document.getElementById("binderView").classList.add("active");
    document.getElementById("binderView").style.display = "";
    document.getElementById("sidebarBinder")?.classList.add("active");
    document.getElementById("bottomCollections")?.classList.add("active");
    renderBinder();
  } else if (vista === "collections") {
    if (!currentTcg) {

      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      updateTcgHeroForView("collections");
      document.getElementById("sidebarBinder")?.classList.add("active");
      document.getElementById("bottomCollections")?.classList.add("active");
      return;
    }
    document.getElementById("collectionManager").classList.add("active");
    document.getElementById("collectionManager").style.display = "";
    document.getElementById("sidebarBinder")?.classList.add("active");
    document.getElementById("bottomCollections")?.classList.add("active");
    renderCollectionList();
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
    document.getElementById("ventaManager").style.display = "";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaList();
  } else if (vista === "venta") {
    document.getElementById("ventaView").classList.add("active");
    document.getElementById("ventaView").style.display = "";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaView();
  } else if (vista === "tcgHome") {
    document.getElementById("welcomeView").classList.add("active");
    document.getElementById("welcomeView").style.display = "";
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
    renderExploreView();
  } else if (vista === "exploreDetail") {
    document.getElementById("exploreDetailView").classList.add("active");
    document.getElementById("exploreDetailView").style.display = "";
    document.getElementById("sidebarExplore")?.classList.add("active");
    document.getElementById("bottomExplore")?.classList.add("active");
    renderExploreDetail();
  } else if (vista === "profile") {
    if (profileView) { profileView.classList.add("active"); profileView.style.display = ""; }
    document.getElementById("sidebarProfile")?.classList.add("active");
   } else if (vista === "home") {
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    document.getElementById("tcgSelectorHero").style.display = "none";
    document.getElementById("tcgGrid").style.display = "none";
    document.getElementById("tcgHomePlaceholder").style.display = "";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  } else {
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    renderTcgSelector();
    document.getElementById("tcgSelectorHero").style.display = "";
    document.getElementById("tcgGrid").style.display = "";
    document.getElementById("tcgHomePlaceholder").style.display = "none";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  }
}
// ─── Search Clear ─────────────────────────────────────────────────────────
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  searchClear.style.display = "none";
  currentPage = 1;
  renderCards();
});
// ─── Event Listeners ──────────────────────────────────────────────────────
// Search
let _searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(_searchTimeout);
  _searchTimeout = setTimeout(() => { currentPage = 1; renderCards(); }, 250);
});
// Filters
expansionFilter.addEventListener("change", () => { actualizarFiltrosPorExpansion(); currentPage = 1; renderCards(); });
colorFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
rarityFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
sortFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
typeFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
// Language toggle
document.querySelectorAll("#catalogLangToggle .lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#catalogLangToggle .lang-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const prevLang = state.catalog.catalogLanguage;
    state.catalog.catalogLanguage = btn.getAttribute("data-lang");
    currentPage = 1;
    if (state.catalog.catalogLanguage !== prevLang) {
      cargarFiltros();
      actualizarFiltrosPorExpansion();
    }
    renderCards();
  });
});
// Pagination
nextBtnBottom.onclick = () => { currentPage++; renderCards(); };
prevBtnBottom.onclick = () => { if (currentPage > 1) { currentPage--; renderCards(); } };
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
  if (card) selectTcg(card.dataset.tcg);
});
// Welcome cards
document.querySelectorAll(".welcome-card").forEach(card => {
  card.addEventListener("click", () => {
    const view = card.getAttribute("data-view");
    if (view === "catalog" && currentTcg !== "one-piece") { mostrarVista("catalog"); return; }
    mostrarVista(view);
  });
});
// Header / Sidebar nav
document.getElementById("sidebarLogo")?.addEventListener("click", () => { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = null; mostrarVista("home"); });
document.getElementById("welcomeBackBtn").addEventListener("click", () => { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = null; mostrarVista("home"); });
document.querySelectorAll(".sidebar-nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const view = item.getAttribute("data-view");
    if (view === "home") { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = null; mostrarVista("home"); }
    else if (view === "catalog") { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = "catalog"; mostrarVista("catalog"); }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; if (!currentTcg) pendingView = "collections"; mostrarVista("collections"); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; if (!currentTcg) pendingView = "ventaCols"; mostrarVista("ventaCols"); }
    else if (view === "explore") { if (!currentTcg) pendingView = "explore"; mostrarVista("explore"); }
    else if (view === "profile") { openProfile(); }
  });
});
// Bottom nav
document.querySelectorAll(".bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    if (view === "home") { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = null; mostrarVista("home"); }
    else if (view === "catalog") { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = "catalog"; mostrarVista("catalog"); }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; if (!currentTcg) pendingView = "collections"; mostrarVista("collections"); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; if (!currentTcg) pendingView = "ventaCols"; mostrarVista("ventaCols"); }
    else if (view === "explore") { if (!currentTcg) pendingView = "explore"; mostrarVista("explore"); }
    else if (view === "tcgHome") { if (currentTcg) { guardarCollections(); guardarVenta(); } currentTcg = null; pendingView = null; mostrarVista("home"); }
  });
});
// Binder events
document.getElementById("binderClearPageBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  if (col.subtype === "tracking") return;
  if (col.subtype === "deck") {
    if (!col.cards.length) return;
    const total = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
    if (confirm(`¿Vaciar las ${total} cartas del deck?`)) {
      col.cards = [];
      guardarCollections(); renderBinder();
    }
    return;
  }
  const start = (binderPage - 1) * binderPerPage;
  const end = Math.min(start + binderPerPage, col.cards.length);
  if (start >= col.cards.length) return;
  if (confirm("Vaciar las " + (end - start) + " cartas de esta página?")) {
    col.cards.splice(start, end - start);
    const totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
    if (binderPage > totalPages) binderPage = totalPages;
    guardarCollections(); renderBinder(); actualizarBotonesBinder();
  }
});
document.getElementById("binderClearAllBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  if (col.subtype === "tracking") return;
  if (col.subtype === "deck") {
    if (!col.dons?.length) return;
    if (confirm(`¿Vaciar los ${col.dons.length} DON!! del deck?`)) {
      col.dons = [];
      guardarCollections(); renderBinder();
    }
    return;
  }
  if (confirm('Vaciar la colección "' + col.name + '" por completo?')) {
    col.cards = []; binderPage = 1; guardarCollections(); renderBinder(); actualizarBotonesBinder();
  }
});
document.getElementById("binderBackBtn").addEventListener("click", () => { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); });
document.getElementById("exploreDetailBackBtn").addEventListener("click", () => { mostrarVista("explore"); });
document.getElementById("binderPrevBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (col && binderPage > 1) { binderPage--; renderBinder(); }
});
document.getElementById("binderNextBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
  const totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
  if (binderPage < totalPages) { binderPage++; renderBinder(); }
});
// Venta events
document.getElementById("ventaBackBtn").addEventListener("click", () => { currentVentaId = null; ventaPage = 1; mostrarVista("ventaCols"); });
document.getElementById("createVentaBtn").addEventListener("click", pedirCrearVenta);
document.getElementById("ventaClearPageBtn").addEventListener("click", () => {
  const col = ventaCols[currentVentaId];
  if (!col) return;
  if (col.subtype === "deck") {
    if (!col.cards.length) return;
    const total = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
    if (confirm(`¿Vaciar las ${total} cartas del deck?`)) {
      col.cards = [];
      guardarVenta(); renderVentaView();
    }
    return;
  }
  const start = (ventaPage - 1) * ventaPerPage;
  const end = Math.min(start + ventaPerPage, col.cards.length);
  if (start >= col.cards.length) return;
  if (confirm("Vaciar las " + (end - start) + " cartas de esta página?")) {
    col.cards.splice(start, end - start);
    const totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
    if (ventaPage > totalPages) ventaPage = totalPages;
    guardarVenta(); renderVentaView();
  }
});
document.getElementById("ventaClearAllBtn").addEventListener("click", () => {
  const col = ventaCols[currentVentaId];
  if (!col) return;
  if (col.subtype === "deck") {
    if (!col.dons?.length) return;
    if (confirm(`¿Vaciar los ${col.dons.length} DON!! del deck?`)) {
      col.dons = [];
      guardarVenta(); renderVentaView();
    }
    return;
  }
  if (confirm('Vaciar la colección "' + col.name + '" por completo?')) {
    col.cards = []; ventaPage = 1; guardarVenta(); renderVentaView();
  }
});
document.getElementById("ventaPrevBtn").addEventListener("click", () => {
  const col = ventaCols[currentVentaId];
  if (col && ventaPage > 1) { ventaPage--; renderVentaView(); }
});
document.getElementById("ventaNextBtn").addEventListener("click", () => {
  const col = ventaCols[currentVentaId];
  if (!col) return;
  const totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  if (ventaPage < totalPages) { ventaPage++; renderVentaView(); }
});
// Add modal events
document.getElementById("addModalCancel").addEventListener("click", () => { document.getElementById("addModalOverlay").style.display = "none"; });
document.getElementById("addModalCloseBtn")?.addEventListener("click", () => { document.getElementById("addModalOverlay").style.display = "none"; });
document.getElementById("addModalConfirm").addEventListener("click", confirmarAdd);
document.getElementById("createModalConfirm").addEventListener("click", confirmCreateModal);
document.getElementById("createModalCancel").addEventListener("click", hideCreateModal);
document.getElementById("createModalOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) hideCreateModal(); });
document.getElementById("createModalInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmCreateModal(); } });
document.getElementById("agregarBtn").addEventListener("click", () => {
  if (selectionMode) {
    if (!Object.keys(selectedCards).length) return;
    Object.values(selectedCards).forEach(c => {
      const key = getCardKey(c);
      if (pendingCards[key]) pendingCards[key].count += c.count;
      else pendingCards[key] = { ...c };
    });
    document.querySelectorAll(".card.selected").forEach(el => el.classList.remove("selected"));
    selectedCards = {};
    actualizarBadge();
    actualizarBadgesEnPagina();
    if (Object.keys(pendingCards).length) mostrarAddModal();
  } else {
    if (Object.keys(pendingCards).length) mostrarAddModal();
  }
});
document.getElementById("seleccionarBtn").addEventListener("click", toggleSelectionMode);
document.getElementById("cancelarPendBtn").addEventListener("click", limpiarPendientes);
document.getElementById("catalogAddBack").addEventListener("click", function() {
  var id = addingToBinderId; var type = addingToBinderType;
  limpiarAddingState();
  if (type === "venta") { currentVentaId = id; ventaPage = 1; mostrarVista("venta"); }
  else { currentCollectionId = id; binderPage = 1; mostrarVista("binder"); }
});
document.getElementById("catalogAddCancel").addEventListener("click", limpiarAddingState);
document.getElementById("createCollectionBtn").addEventListener("click", pedirCrearColeccion);
// ─── Landing Page Buttons ────────────────────────────────────────────────
document.querySelectorAll("[id^='landingLoginBtn']").forEach(btn => {
  btn.addEventListener("click", () => showAuthModal("login"));
});
document.querySelectorAll("[id^='landingRegisterBtn'], #landingCtaBtn").forEach(btn => {
  btn.addEventListener("click", () => showAuthModal("register"));
});
document.getElementById("landingExploreBtn")?.addEventListener("click", () => {
  mostrarVista("catalog");
});
document.querySelectorAll(".footer-link[data-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-action");
    if (action === "catalog") {
      mostrarVista("catalog");
    } else {
      document.querySelector(`#${action}Section`)?.scrollIntoView({ behavior: "smooth" });
    }
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
renderTcgSelector();
mostrarVista("home");
(async () => {
  await initCollections();
  initVenta();
  if (isAuthenticated()) await reloadVentaFromDb();
})();
cargarCartas();
// ─── Auth Integration ────────────────────────────────────────────────────
document.getElementById("authBtn").addEventListener("click", () => {
  showAuthModal("login");
});
document.getElementById("userBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const dd = document.getElementById("userDropdown");
  dd.style.display = dd.style.display === "none" ? "block" : "none";
});
document.getElementById("dropdownLogout").addEventListener("click", async () => {
  document.getElementById("userDropdown").style.display = "none";
  await signOut();
});
document.getElementById("dropdownProfile").addEventListener("click", () => {
  document.getElementById("userDropdown").style.display = "none";
  if (typeof openProfile === "function") { openProfile(); }
});
document.addEventListener("click", () => {
  document.getElementById("userDropdown").style.display = "none";
});
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
document.getElementById("authModalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideAuthModal();
});
document.querySelector("#authToggleLink").addEventListener("click", (e) => {
  if (e.target.id === "authToggle") {
    e.preventDefault();
    const overlay = document.getElementById("authModalOverlay");
    const mode = overlay._mode === "login" ? "register" : overlay._mode === "register" ? "forgot" : "login";
    showAuthModal(mode);
  }
});
// Update auth UI after init and sync data
onAuthChange(async (user) => {
  updateAuthUI();
  if (user && currentTcg) {
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
