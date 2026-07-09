// ═══════════════════════════════════════════════════════════════════════════
//  TuTCG  –  Main Application
// ═══════════════════════════════════════════════════════════════════════════

// ─── State ────────────────────────────────────────────────────────────────

const cardsContainer = document.getElementById("cards-container");
const searchInput = document.getElementById("searchInput");
const searchClear = document.getElementById("searchClear");
const expansionFilter = document.getElementById("expansionFilter");
const colorFilter = document.getElementById("colorFilter");
const rarityFilter = document.getElementById("rarityFilter");
const sortFilter = document.getElementById("sortFilter");
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
let priceType = "market";
let tcgplayerMap = {};
let preciosCache = {};
let cartasMap = {};
let pendingCards = {};
let binderPage = 1;
const binderPerPage = 20;
let currentTcg = null;
let prbBadgeMap = {};
let collections = {};
let currentCollectionId = null;
let ventaCols = {};
let currentVentaId = null;
let ventaPage = 1;
const ventaPerPage = 20;
let rebuildingFilters = false;
let exploreDetailBinder = null;
let exploreDetailCards = [];

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
  { id:"one-piece",   name:"One Piece",          color:"#d02d50", short:"OP" },
  { id:"pokemon",     name:"Pokémon",            color:"#ffcb05", short:"PK" },
  { id:"magic",       name:"Magic: The Gathering",color:"#b5a36a", short:"MTG" },
  { id:"digimon",     name:"Digimon",            color:"#f6a01a", short:"DG" },
  { id:"dragon-ball", name:"Dragon Ball",        color:"#e84c22", short:"DB" },
  { id:"yugioh",      name:"Yu-Gi-Oh!",          color:"#c9a84c", short:"YG" },
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
  "DON!!":"--- DON!! Cards ---",
  "PROMO":"Promo Cards"
};

for (let i = 1; i <= 30; i++) {
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
  "OP14-EB04":18,
  "EB-03":19,
  "OP15-EB04":20,
  "OP-16":21,
  "DON!!":22,
  "PROMO":23
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
    "digimon":"dg", "dragon-ball":"db", "yugioh":"yg"
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
    const activeGame = Object.entries(gamesConfig).find(([,g]) => g.enabled);
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
    }).filter(c => c.language && c.language.includes("en"));
    cartas.forEach(c => { if (c.card_name) c.card_name = decodeHtml(c.card_name); });
    await loadPrb02Cardlist();
    buildPrbBadgeMap();
    setCategoryMap = {};
    cartas.forEach(c => {
      if (c.set_id && c.category && !setCategoryMap[c.set_id]) {
        setCategoryMap[c.set_id] = c.category;
      }
    });
    tcgplayerMap = {};
    preciosCache = {};
    cartas.forEach(c => {
      if (c.tcgplayer_id) {
        if (!tcgplayerMap[c.card_set_id]) tcgplayerMap[c.card_set_id] = [];
        tcgplayerMap[c.card_set_id].push({ id: c.tcgplayer_id, name: c.card_name || "", isParallel: c.is_parallel || false });
        if (!preciosCache[c.tcgplayer_id]) preciosCache[c.tcgplayer_id] = [];
        preciosCache[c.tcgplayer_id].push({ marketPrice: c.market_price || 0, midPrice: c.inventory_price || 0 });
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
    console.error("Error cargando cards_master.json:", error);
  }
}

// ─── Filters ──────────────────────────────────────────────────────────────

function cargarFiltros() {
  rebuildingFilters = true;
  const prevExpansion = expansionFilter.value;
  expansionFilter.innerHTML = `<option value="">Todas las expansiones</option>`;

  if (currentTcg === "one-piece") {
    const boosterSets = [...new Set(cartas.filter(c => c.category === "BOOSTER").map(c => c.set_id).filter(Boolean))];
    const starterSets = [...new Set(cartas.filter(c => c.category === "STARTER").map(c => c.set_id).filter(Boolean))];
    const hasPromo = cartas.some(c => c.category === "PROMO" || c.category === "OTHER");
    const hasDon = cartas.some(c => c.category === "DON");

    const fragments = [];

    if (boosterSets.length) {
      boosterSets.sort((a, b) => getOrden(a) - getOrden(b));
      let html = `<optgroup label="--- Booster ---">`;
      boosterSets.forEach(s => {
        html += `<option value="${s}">${nombresExpansiones[s] || s}</option>`;
      });
      html += `</optgroup>`;
      fragments.push(html);
    }

    if (starterSets.length) {
      starterSets.sort((a, b) => getOrden(a) - getOrden(b));
      let html = `<optgroup label="--- Starter ---">`;
      starterSets.forEach(s => {
        html += `<option value="${s}">${nombresExpansiones[s] || s}</option>`;
      });
      html += `</optgroup>`;
      fragments.push(html);
    }

    if (hasPromo) {
      fragments.push(`<optgroup label="--- Promo ---"><option value="PROMO">Promo Cards</option></optgroup>`);
    }
    if (hasDon) {
      fragments.push(`<optgroup label="--- DON!! ---"><option value="DON!!">DON!! Cards</option></optgroup>`);
    }

    expansionFilter.innerHTML += fragments.join("");
    if (prevExpansion) expansionFilter.value = prevExpansion;

    colorFilter.innerHTML = `<option value="">Todos los colores</option>`;
    ["Red","Blue","Green","Purple","Black","Yellow"].forEach(color => {
      colorFilter.innerHTML += `<option value="${color}">${coloresES[color]}</option>`;
    });

    rarityFilter.innerHTML = `
      <option value="">Todas las rarezas</option>
      <option value="L">L</option><option value="C">C</option><option value="UC">UC</option>
      <option value="R">R</option><option value="SR">SR</option>
      <option value="SEC">SEC</option><option value="SP">SP</option>
      <option value="AA">AA</option>`;
  } else {
    colorFilter.innerHTML = `<option value="">Todos los colores</option>`;
    rarityFilter.innerHTML = `<option value="">Todas las rarezas</option>`;
  }
  rebuildingFilters = false;
  if (prevExpansion) actualizarFiltrosPorExpansion();
}

function actualizarFiltrosPorExpansion() {
  if (rebuildingFilters) return;
  const val = expansionFilter.value;
  const esDon = val === "DON!!";
  const esPromo = val === "PROMO";
  colorFilter.disabled = esDon;
  colorFilter.style.display = esDon ? "none" : "";
  rarityFilter.disabled = esPromo;
  rarityFilter.style.display = esPromo ? "none" : "";
  if (esDon) {
    rarityFilter.innerHTML = `
      <option value="">Todas las variantes</option>
      <option value="Gold">Gold</option>
      <option value="DP">DP</option>`;
  } else if (esPromo) {
    rarityFilter.innerHTML = `<option value="">Todas las rarezas</option>`;
  } else {
    rarityFilter.innerHTML = `
      <option value="">Todas las rarezas</option>
      <option value="L">L</option><option value="C">C</option><option value="UC">UC</option>
      <option value="R">R</option><option value="SR">SR</option>
      <option value="SEC">SEC</option><option value="SP">SP</option>
      <option value="AA">AA</option>`;
  }
}

function prb02LabelToBadge(label) {
  if (label === "Pirate Foil") return "Jolly Roger";
  if (label === "Alternate Art") return "AA";
  if (label === "Manga") return "Manga";
  if (label === "SP") return "SP";
  return label;
}

function buildPrbBadgeMap() {
  prbBadgeMap = {};
  const prbCards = cartas.filter(c =>
    (c.set_id === "PRB-01" || c.set_id === "PRB-02") && c.card_image
  );

  const byId = {};
  prbCards.forEach(c => {
    const key = c.card_set_id + "|" + c.set_id;
    if (!byId[key]) byId[key] = { pNums: [], rNums: [], hasBase: false, cardType: c.card_type, setId: c.set_id, cardId: c.card_set_id };
    const m = c.card_image.match(/_([pr])(\d+)\.webp$/);
    if (m) {
      const num = parseInt(m[2]);
      if (m[1] === "p") byId[key].pNums.push(num);
      else byId[key].rNums.push(num);
    } else {
      byId[key].hasBase = true;
    }
  });

  for (const [key, info] of Object.entries(byId)) {
    const pSorted = [...new Set(info.pNums)].sort((a, b) => a - b);
    const rSorted = [...new Set(info.rNums)].sort((a, b) => a - b);
    const totalP = pSorted.length;
    const isCharacter = info.cardType === "CHARACTER";
    const isEventStage = info.cardType === "EVENT" || info.cardType === "STAGE";
    const pKey = "p" + pSorted.join(",p");
    const rKey = "r" + rSorted.join(",r");
    const map = {};

    if (info.setId === "PRB-01") {
      rSorted.forEach(n => {
        if (n === 1) map["r1"] = "Reprint";
        else if (n === 2) map["r2"] = rSorted.includes(1) ? "Jolly Roger" : "Reprint";
        else map["r" + n] = "Reprint";
      });

      if (isCharacter) {
        if (pKey === "p2,p3" && rKey === "r1") {
          pSorted.forEach(n => {
            map["p" + n] = pSorted.indexOf(n) === 0 ? "Jolly Roger" : "Full Art";
          });
        } else if (totalP === 1) {
          pSorted.forEach(n => { map["p" + n] = "AA"; });
        } else if (totalP >= 2) {
          pSorted.forEach(n => {
            const pos = pSorted.indexOf(n);
            map["p" + n] = pos === 0 ? "Jolly Roger" : pos === totalP - 1 ? "AA" : "Full Art";
          });
        }
      } else {
        if (pKey === "p2,p3" && rKey === "r1") {
          pSorted.forEach(n => {
            map["p" + n] = pSorted.indexOf(n) === 0 ? "Jolly Roger" : "Textured Foil";
          });
        } else if (totalP === 3) {
          pSorted.forEach(n => {
            const pos = pSorted.indexOf(n);
            map["p" + n] = pos === 0 ? "Jolly Roger" : pos === totalP - 1 ? "AA" : "Textured Foil";
          });
        } else if (totalP === 1) {
          pSorted.forEach(n => { map["p" + n] = "Full Art"; });
        } else {
          pSorted.forEach(n => {
            const pos = pSorted.indexOf(n);
            if (totalP === 2) map["p" + n] = pos === 0 ? "Full Art" : "AA";
            else map["p" + n] = pos === 0 ? "Jolly Roger" : pos === totalP - 1 ? "AA" : "Full Art";
          });
        }
      }

      if (MANGA_PR01.has(info.cardId)) {
        const totalVariants = pSorted.length + rSorted.length;
        if (rSorted.includes(2)) {
          map["r2"] = "Manga";
        } else if (totalVariants === 1) {
          if (rSorted.includes(1)) map["r1"] = "Manga";
          if (pSorted.length === 1) map["p" + pSorted[0]] = "Manga";
        }
      }
    } else if (info.setId === "PRB-02") {
      rSorted.forEach(n => { map["r" + n] = "Reprint"; });

      const cardlistLabels = (prb02CardlistLabels && prb02CardlistLabels[info.cardId]) || [];
      const nonReprintLabels = cardlistLabels.filter(l => l !== "Reprint").sort((a, b) => {
        if (a === "Pirate Foil") return -1;
        if (b === "Pirate Foil") return 1;
        return 0;
      });

      if (info.hasBase) {
        const isPromo = info.cardId.startsWith("P-");
        if (isPromo && nonReprintLabels.includes("Pirate Foil")) {
          map["-"] = "Jolly Roger";
          const idx = nonReprintLabels.indexOf("Pirate Foil");
          nonReprintLabels.splice(idx, 1);
        } else {
          map["-"] = "";
        }
      }

      if (totalP === 1 && nonReprintLabels.length === 1) {
        pSorted.forEach(n => { map["p" + n] = prb02LabelToBadge(nonReprintLabels[0]); });
      } else if (totalP === 2 && nonReprintLabels.length === 2) {
        pSorted.forEach(n => {
          const pos = pSorted.indexOf(n);
          map["p" + n] = prb02LabelToBadge(nonReprintLabels[pos]);
        });
      } else if (totalP === 1) {
        pSorted.forEach(n => { map["p" + n] = "AA"; });
      } else if (totalP >= 2) {
        pSorted.forEach(n => {
          const pos = pSorted.indexOf(n);
          map["p" + n] = pos === 0 ? "Jolly Roger" : pos === totalP - 1 ? "AA" : "Full Art";
        });
      }
    }

    prbBadgeMap[key] = map;
  }
}

function obtenerRareza(carta) {
  const rarezaApi = carta.rareza || carta.rarity || "";
  const nombre = (carta.card_name || "").toLowerCase();
  const variant = (carta.variant || "").toLowerCase();
  const setId = carta.set_id || "";

  if (carta.print_type) return carta.print_type;

  if (carta.category === "OTHER") return "";

  if ((carta.category || carta.producto) === "DON" || nombre === "don!!") {
    if (variant.includes("gold") || variant === "gold") return "Gold";
    if (variant.includes("anniversary") || variant.includes("promo") || variant.includes("tournament") ||
        variant.includes("championship") || variant.includes("special") || variant.includes("collection") || variant.includes("tin"))
      return "Promo";
    if (carta.set_name && (carta.set_name.includes("OP-PR") || carta.set_name.includes("OPDD"))) return "Promo";
    return "Normal";
  }

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

function getPrecio(carta) {
  const tcgId = getTcgId(carta);
  const precioDigi = tcgId && preciosCache[tcgId];
  if (precioDigi && precioDigi[0]) {
    return priceType === "market" ? (precioDigi[0].marketPrice ?? 0) : (precioDigi[0].midPrice ?? 0);
  }
  return priceType === "market" ? Number(carta.market_price || 0) : Number(carta.inventory_price || 0);
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

async function cargarPreciosLote(ids) {
  if (!ids.length) return;
  const nuevos = ids.filter(id => !preciosCache[id]);
  if (!nuevos.length) return;
  for (const catId of [68, 63]) {
    if (!nuevos.length) break;
    const pendientes = nuevos.filter(id => !preciosCache[id]);
    if (!pendientes.length) break;
    try {
      const res = await fetch(
        "https://www.digibinder.xyz/api/prices?categoryId=" + catId + "&productIds=" + pendientes.join(",")
      );
      const data = await res.json();
      for (const key of Object.keys(data)) {
        if (data[key] && data[key].length) { preciosCache[key] = data[key]; }
      }
    } catch (e) {
      console.warn("Error cargando precios catId=" + catId + ":", e);
    }
  }
}

async function actualizarPreciosPagina() {
  const cartasEl = document.querySelectorAll(".card");
  if (!cartasEl.length) return;
  const ids = [];
  cartasEl.forEach(el => {
    let tcgId = el.getAttribute("data-tcgid");
    if (!tcgId) {
      const cardId = el.getAttribute("data-cardid");
      if (cardId && tcgplayerMap[cardId]) {
        const nombreCarta = el.querySelector("h3")?.textContent || "";
        tcgId = buscarEnMapa(tcgplayerMap[cardId], nombreCarta);
      }
    }
    if (tcgId) ids.push(tcgId);
  });
  if (!ids.length) return;
  await cargarPreciosLote(ids);
  cartasEl.forEach(el => {
    let tcgId = el.getAttribute("data-tcgid");
    if (!tcgId) {
      const cardId = el.getAttribute("data-cardid");
      if (cardId && tcgplayerMap[cardId]) {
        const nombreCarta = el.querySelector("h3")?.textContent || "";
        tcgId = buscarEnMapa(tcgplayerMap[cardId], nombreCarta);
      }
    }
    const p = tcgId && preciosCache[tcgId];
    if (p && p[0]) {
      const priceEl = el.querySelector(".card-price");
      if (priceEl) {
        const valor = priceType === "market" ? (p[0].marketPrice ?? 0) : (p[0].midPrice ?? 0);
        priceEl.textContent = (priceType === "market" ? "Market" : "Median") + ": $" + valor.toFixed(2);
      }
    }
  });
}

function togglePrice(e) {
  const target = e.target.closest(".toggle-option");
  if (!target) return;
  const tipo = target.getAttribute("data-price");
  if (!tipo || tipo === priceType) return;
  priceType = tipo;
  document.querySelectorAll(".toggle-option").forEach(el => el.classList.remove("active"));
  target.classList.add("active");
  const catalogVisible = document.getElementById("catalogView").style.display !== "none";
  if (catalogVisible) renderCards();
}

// ─── Collections / Supabase + LocalStorage ──────────────────────────────

function guardarCollections() {
  Object.values(collections).forEach(b => b._synced = false);
  localStorage.setItem(collectionsKey(), JSON.stringify(collections));
  if (isAuthenticated()) syncCollectionsToSupabase().catch(console.error);
}

function guardarVenta() {
  Object.values(ventaCols).forEach(b => b._synced = false);
  localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
  if (isAuthenticated()) syncVentaToSupabase().catch(console.error);
}

async function syncObjectToSupabase(obj, type) {
  if (!isAuthenticated()) return;

  // Delete remote binders that no longer exist locally
  const localIds = new Set(Object.keys(obj));
  try {
    const { data: remote } = await supabaseClient.from("binders").select("id").eq("user_id", authUser.id).eq("type", type);
    if (remote) {
      const toDelete = remote.filter(r => !localIds.has(r.id)).map(r => r.id);
      if (toDelete.length) {
        await supabaseClient.from("binder_cards").delete().in("binder_id", toDelete);
        await supabaseClient.from("binders").delete().in("id", toDelete);
      }
    }
  } catch (e) { console.error("Sync cleanup error:", e); showToast("Error limpiando datos antiguos", "error"); }

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

      const { error: upsertErr } = await supabaseClient.from("binders").upsert({
        id,
        user_id: authUser.id,
        name: binder.name,
        type: type,
        is_public: binder.is_public || false,
        config: config,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (upsertErr) { console.error("Binder upsert error:", upsertErr); showToast("Error guardando colección en el servidor", "error"); continue; }

      await supabaseClient.from("binder_cards").delete().eq("binder_id", id);

      const allCardRows = [];

      if (binder.subtype === "deck") {
        if (binder.leader) {
          allCardRows.push({ binder_id: id, card_id: binder.leader._key || "", quantity: 1, price: binder.leader.customPrice || null, card_tag: "leader", sort_order: 0 });
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
            allCardRows.push({ binder_id: id, card_id: card._key || "", quantity: 1, price: card.customPrice || null, card_tag: "don", sort_order: idx + 10000 });
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
        if (insertErr) { console.error("Cards insert error:", insertErr); showToast("Error guardando cartas en el servidor", "error"); continue; }
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
    console.error("Error loading binders:", e);
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
  let leader = null;
  const cards = [], dons = [];
  sorted.forEach((row) => {
    const entry = { _key: row.card_id, customPrice: row.price != null ? parseFloat(row.price) : 0 };
    if (row.card_tag === "leader") { leader = entry; }
    else if (row.card_tag === "don") { dons.push(entry); }
    else { entry.quantity = row.quantity; cards.push(entry); }
  });
  return { leader, cards, dons };
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
      dbBinders.filter(b => b.type === "collection" || !b.type).forEach(b => {
        const cfg = b.config || {};
        const subtype = cfg.subtype || "binder";
        if (subtype === "deck") {
          const deck = expandDbDeck(b.binder_cards);
          collections[b.id] = {
            id: b.id, name: b.name, subtype: "deck",
            leader: deck.leader, cards: deck.cards, dons: deck.dons,
            is_public: b.is_public || false, _synced: true
          };
        } else {
          collections[b.id] = {
            id: b.id, name: b.name, subtype: "binder",
            cards: expandDbCards(b.binder_cards),
            is_public: b.is_public || false, _synced: true
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
        collections = JSON.parse(localData);
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
    dbBinders.filter(b => b.type === "sale").forEach(b => {
      const cfg = b.config || {};
      const subtype = cfg.subtype || "binder";
      const mode = cfg.display_mode || "individual";
      if (subtype === "deck") {
        const deck = expandDbDeck(b.binder_cards);
        ventaCols[b.id] = {
          id: b.id, name: b.name, subtype: "deck",
          leader: deck.leader, cards: deck.cards, dons: deck.dons,
          is_public: b.is_public || false, display_mode: mode, _synced: true
        };
      } else {
        const expandFn = mode === "individual" ? expandDbCards : expandDbCardsGrouped;
        ventaCols[b.id] = {
          id: b.id, name: b.name, subtype: "binder",
          cards: expandFn(b.binder_cards),
          is_public: b.is_public || false, display_mode: mode, _synced: true
        };
      }
    });
    localStorage.setItem(ventaKey(), JSON.stringify(ventaCols));
    return;
  }
  if (dbBinders !== null) {
    const localData = localStorage.getItem(ventaKey());
    if (localData) {
      ventaCols = JSON.parse(localData);
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
  if (!cards || !cards.length) return null;
  const first = cards[0];
  if (first.card_image) return first.card_image;
  if (first._key) {
    const found = cartasMap[first._key];
    if (found?.card_image) return found.card_image;
  }
  return null;
}

function getTotalPrice(col, mode) {
  let total = 0;
  const cards = col.cards || [];
  const isDeck = col.subtype === "deck";
  const defMode = mode || "market";

  const cardPrice = (c) => {
    const pm = c.priceMode || defMode;
    if (pm === "custom" && c.customPrice != null) return Number(c.customPrice);
    if (pm === "median") {
      if (c.inventory_price != null) return Number(c.inventory_price);
      const f = c._key ? cartasMap[c._key] : null;
      return f ? Number(f.inventory_price || 0) : 0;
    }
    if (c.market_price != null) return Number(c.market_price);
    const f = c._key ? cartasMap[c._key] : null;
    return f ? Number(f.market_price || 0) : 0;
  };

  if (isDeck && col.leader) total += cardPrice(col.leader);

  cards.forEach(c => {
    const qty = c.quantity || 1;
    total += cardPrice(c) * qty;
  });

  if (isDeck && col.dons) {
    col.dons.forEach(d => total += cardPrice(d));
  }

  return total;
}

function renderCollectionList() {
  const container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(collections);
  if (!ids.length) {
    container.innerHTML = `<div class="collection-empty"><p>No tienes colecciones</p><button class="btn-primary" id="createFirstColBtn">Crear primera colección</button></div>`;
    const btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(id => {
    const col = collections[id];
    const coverImg = getFirstCardImage(col.cards, col);
    const isDeck = col.subtype === "deck";
    const deckCount = isDeck ? (col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0) : col.cards.length;
    const totalCards = isDeck ? `${col.leader ? "1 líder · " : ""}${deckCount} cartas${col.dons?.length ? " · " + col.dons.length + " DON" : ""}` : `${col.cards.length} cartas`;
    const div = document.createElement("div");
    div.className = "binder-cover-card";
    div.innerHTML = `
      <div class="binder-cover-img" style="background-image:url(${coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'"})">
        <div class="binder-cover-overlay">
          <span class="binder-cover-count">${totalCards}</span>
        </div>
      </div>
      <div class="binder-cover-meta">
        <span class="binder-cover-name-badge">${col.name}</span>
        <span class="binder-cover-badge ${isDeck ? "deck" : "collection"}">${isDeck ? "Deck" : "Colección"}</span>
      </div>
      <div class="binder-cover-actions">
        <button class="btn-ghost btn-xs" data-action="open" data-id="${id}">Abrir</button>
        <button class="btn-ghost btn-xs" data-action="rename" data-id="${id}">Renombrar</button>
        <button class="btn-danger btn-xs" data-action="delete" data-id="${id}">Eliminar</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: collections[id].name,
        onConfirm: (nombre) => { collections[id].name = nombre.trim(); guardarCollections(); renderCollectionList(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      if (confirm('Eliminar la colección "' + collections[id].name + '"?')) { delete collections[id]; guardarCollections(); renderCollectionList(); }
    });
  });
}

function pedirCrearColeccion() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección",
    confirmText: "Crear",
    placeholder: "Nombre de la colección",
    extraHTML: `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);margin-top:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>
      <select id="createColSubtype" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="binder">Binder — cartas libres</option>
        <option value="deck">Deck — líder + 50 cartas + 10 DON!!</option>
      </select>`,
    onConfirm: (nombre) => {
      const subtype = document.getElementById("createColSubtype")?.value || "binder";
      const id = generarId();
      collections[id] = { id, name: nombre.trim(), subtype, cards: [], leader: null, dons: [], is_public: false };
      guardarCollections();
      renderCollectionList();
    }
  });
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
    if (error) { console.error("Toggle public error:", error); col.is_public = !col.is_public; return; }
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

function showDeckPicker(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots) {
  const isMulti = mode === "main" || mode === "don";
  return new Promise(resolve => {
    try {
    _deckPickerResolve = resolve;
    const overlay = document.getElementById("deckPickerOverlay");
    if (!overlay) { resolve(isMulti ? [] : null); return; }
    const title = document.getElementById("deckPickerTitle");
    const grid = document.getElementById("deckPickerGrid");
    const search = document.getElementById("deckPickerSearch");
    const info = document.getElementById("deckPickerInfo");
    const footer = document.querySelector(".deck-picker-footer");
    if (!footer) return;

    search.value = "";
    const selectedKeys = new Set();
    const selectedCounts = {};
    const selectedPerKey = {};
    let confirmBtn = null;
    if (isMulti) {
      footer.innerHTML = `
        <span id="deckPickerInfo" class="deck-picker-info"></span>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn-ghost" id="deckPickerCancel">Cancelar</button>
          <button class="btn-primary btn-sm" id="deckPickerConfirm">Agregar seleccionadas</button>
        </div>`;
      confirmBtn = document.getElementById("deckPickerConfirm");
    } else {
      footer.innerHTML = `
        <span id="deckPickerInfo" class="deck-picker-info"></span>
        <button class="btn-ghost" id="deckPickerCancel">Cancelar</button>`;
    }
    const cancelBtn = document.getElementById("deckPickerCancel");

    overlay.style.display = "flex";
    setTimeout(() => search.focus(), 100);

    const existing = new Set(existingKeys || []);
    const leaderColors = leaderColor ? leaderColor.split("/").map(s => s.trim()).filter(Boolean) : [];

    function getFiltered() {
      if (mode === "leader") return (cartas || []).filter(c => c.card_type === "LEADER");
      if (mode === "main") {
        let base = (cartas || []).filter(c =>
          c.card_type === "CHARACTER" || c.card_type === "EVENT" || c.card_type === "STAGE"
        );
        if (existingCounts) {
          base = base.filter(c => isUnlimited(c) || (existingCounts[c.card_set_id] || 0) < 4);
        }
        if (leaderColors.length) {
          base = base.filter(c => leaderColors.some(lc => c.card_color?.includes(lc)));
        }
        if (leaderSetId) {
          base.sort((a, b) => {
            const aMatch = a.set_id === leaderSetId ? 0 : 1;
            const bMatch = b.set_id === leaderSetId ? 0 : 1;
            return aMatch - bMatch;
          });
        }
        return base;
      }
      if (mode === "don") return (cartas || []).filter(c => (c.card_type === "DON!!" || c.category === "DON") && !existing.has(getCardKey(c)));
      return [];
    }

    if (mode === "leader") title.textContent = "Elegir líder";
    else if (mode === "main") title.textContent = "Agregar cartas al deck (máx 50)";
    else if (mode === "don") title.textContent = "Elegir DON!! (máx 10)";

    function updateInfo() {
      let total;
      if (mode === "main" || mode === "don") {
        total = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
      } else {
        total = selectedKeys.size;
      }
      const max = mode === "main" ? 50 : mode === "don" ? 10 : 1;
      const avail = getFiltered().length;
      if (isMulti) {
        info.textContent = `${total} seleccionadas · ${avail} disponibles · máx ${max}`;
        if (confirmBtn) confirmBtn.disabled = total === 0;
      } else {
        info.textContent = `${avail} disponibles`;
      }
    }

    function renderPicker(query) {
      const q = (query || "").toLowerCase().trim();
      let results = getFiltered();
      if (results.length === 0 && !q) {
        grid.innerHTML = `<div class="deck-picker-empty">No hay cartas disponibles (${mode})${leaderColor ? " para color " + leaderColor : ""}</div>`;
        updateInfo();
        return;
      }
      if (q) {
        results = results.filter(c =>
          (c.card_name || "").toLowerCase().includes(q) ||
          (c.card_set_id || "").toLowerCase().includes(q)
        );
      }
      grid.innerHTML = "";
      if (!results.length) {
        grid.innerHTML = '<div class="deck-picker-empty">Sin resultados</div>';
        updateInfo();
        return;
      }
      results.forEach(c => {
        const cardKey = getCardKey(c);
        const div = document.createElement("div");
        let isSelected, selectedQty;
        if (mode === "main") {
          selectedQty = selectedCounts[c.card_set_id] || 0;
          isSelected = (selectedPerKey[cardKey] || 0) > 0;
        } else if (mode === "don") {
          selectedQty = selectedCounts[cardKey] || 0;
          isSelected = selectedQty > 0;
        } else {
          isSelected = selectedKeys.has(cardKey);
        }
        div.className = "card deck-pick-card" + (isSelected ? " selected" : "");
        div.setAttribute("data-cardkey", cardKey);
        let checkHTML = "";
        if (isSelected) {
          const badgeQty = mode === "main" ? (selectedPerKey[cardKey] || 0) : (mode === "don" ? selectedQty : null);
          checkHTML = badgeQty ? `<span class="deck-pick-check">${badgeQty}</span>` : '<span class="deck-pick-check">&#10003;</span>';
        }
        const existing = mode === "main" ? (existingCounts[c.card_set_id] || 0) : 0;
        let controlsHTML = "";
        if (isSelected && (mode === "don" || mode === "main")) {
          const k = mode === "main" ? c.card_set_id : cardKey;
          controlsHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px">
            <button class="deck-pick-qty-btn" data-action="decr" data-key="${k}" data-vkey="${cardKey}" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">&minus;</button>
            <span style="font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--accent);font-family:var(--font-mono);min-width:20px;text-align:center">${mode === "main" ? (selectedPerKey[cardKey] || 0) : selectedQty}</span>
            <button class="deck-pick-qty-btn" data-action="incr" data-key="${k}" data-vkey="${cardKey}" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">+</button>
          </div>`;
        }
        div.innerHTML = `
          <div class="card-img-wrap">
            <img src="${c.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
            ${checkHTML}
          </div>
          <div class="card-body">
            <h3>${formatearNombre(c)}</h3>
            <span class="card-set-id">${c.card_set_id || ""}</span>
            ${existing > 0 ? `<div style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">${existing} en deck</div>` : ""}
            ${controlsHTML}
          </div>`;
        div.addEventListener("click", () => {
          if (mode === "leader") {
            overlay.style.display = "none";
            if (_deckPickerResolve) _deckPickerResolve(c);
            _deckPickerResolve = null;
            return;
          }
          if (mode === "main") {
            const cSId = c.card_set_id;
            const existingQty = existingCounts[cSId] || 0;
            const selectedQty = selectedCounts[cSId] || 0;
            const totalSelected = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
            if (!isUnlimited(c) && existingQty + selectedQty >= 4) return;
            if (totalSelected >= remainingSlots) return;
            selectedCounts[cSId] = selectedQty + 1;
            selectedPerKey[cardKey] = (selectedPerKey[cardKey] || 0) + 1;
          } else if (mode === "don") {
            const totalSelected = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
            const selectedQty = selectedCounts[cardKey] || 0;
            const remaining = remainingSlots - (totalSelected - selectedQty);
            if (remaining <= 0) return;
            selectedCounts[cardKey] = selectedQty + 1;
            selectedPerKey[cardKey] = (selectedPerKey[cardKey] || 0) + 1;
          }
          updateInfo();
          const st = grid.scrollTop;
          renderPicker(query);
          grid.scrollTop = st;
        });
        grid.appendChild(div);
      });
      updateInfo();
      grid.querySelectorAll(".deck-pick-qty-btn").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const key = btn.getAttribute("data-key");
          const vkey = btn.getAttribute("data-vkey") || key;
          if (!key) return;
          const totalSelected = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
          const current = selectedCounts[key] || 0;
          if (btn.getAttribute("data-action") === "incr") {
            if (mode === "main") {
              const existingQty = existingCounts[key] || 0;
              if (!isUnlimited({ card_set_id: key }) && existingQty + current >= 4) return;
            }
            if (totalSelected >= remainingSlots) return;
            selectedCounts[key] = current + 1;
            selectedPerKey[vkey] = (selectedPerKey[vkey] || 0) + 1;
          } else {
            if (current <= 1) {
              delete selectedCounts[key];
              if (mode === "main") {
                Object.keys(selectedPerKey).forEach(k => {
                  const card = cartas.find(c2 => getCardKey(c2) === k);
                  if (card && card.card_set_id === key) delete selectedPerKey[k];
                });
              } else {
                delete selectedPerKey[vkey];
              }
            } else {
              selectedCounts[key] = current - 1;
              selectedPerKey[vkey] = (selectedPerKey[vkey] || 0) - 1;
            }
          }
          updateInfo();
          const st = grid.scrollTop;
          renderPicker(query);
          grid.scrollTop = st;
        });
      });
    }

    // Set up event listeners BEFORE cartas check so picker always works
    search.oninput = () => renderPicker(search.value);
    search.onkeydown = (e) => {
      if (e.key === "Escape") { overlay.style.display = "none"; _deckPickerResolve = null; resolve(isMulti ? [] : null); }
    };
    cancelBtn.onclick = () => { overlay.style.display = "none"; _deckPickerResolve = null; resolve(isMulti ? [] : null); };
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const picked = [];
        if (mode === "main" || mode === "don") {
          Object.entries(selectedPerKey).forEach(([key, qty]) => {
            const card = cartasMap[key];
            if (card) {
              for (let i = 0; i < qty; i++) picked.push(card);
  }
});
        } else {
          const all = getFiltered();
          all.forEach(c => { if (selectedKeys.has(getCardKey(c))) picked.push(c); });
        }
        overlay.style.display = "none";
        if (_deckPickerResolve) _deckPickerResolve(picked);
        _deckPickerResolve = null;
      };
    }

    // Now check cartas state
    if (!cartas || !cartas.length) {
      grid.innerHTML = '<div class="deck-picker-empty">Cargando catálogo de cartas…</div>';
      updateInfo();
      let retries = 0;
      const retry = setInterval(() => {
        if (cartas && cartas.length) { clearInterval(retry); renderPicker(""); }
        else if (++retries > 20) { clearInterval(retry); grid.innerHTML = '<div class="deck-picker-empty">Error al cargar catálogo</div>'; }
      }, 500);
    } else {
      renderPicker("");
    }
    } catch (e) { console.error("Deck picker error:", e); resolve(isMulti ? [] : null); }
  });
}

document.getElementById("deckPickerOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) { document.getElementById("deckPickerOverlay").style.display = "none"; _deckPickerResolve = null; }
});
// ─── Deck View ─────────────────────────────────────────────────────────

function renderDeckView(type, col, grid, title, toggleContainer) {
  const isSale = type === "sale";
  title.textContent = col.name;

  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
        <input type="checkbox" id="${isSale ? "venta" : "binder"}PublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span>
      </label>
    ` : "";
    const chk = document.getElementById(isSale ? "ventaPublicCheck" : "binderPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(isSale ? currentVentaId : currentCollectionId);
  }

  const leader = col.leader;
  const mainCards = col.cards || [];
  const dons = col.dons || [];
  const totalCards = (leader ? 1 : 0) + mainCards.reduce((s, c) => s + (c.quantity || 1), 0) + dons.length;

  title.textContent = `${col.name} (${totalCards} cartas)`;

  let html = `<div class="deck-container">`;

  // Leader section
  html += `<div class="deck-section deck-leader-section"><h3 class="deck-section-title">Líder</h3><div class="deck-leader-slot">`;
  if (leader) {
    const full = leader._key ? cartasMap[leader._key] : null;
    const img = leader.card_image || full?.card_image || "TUTCG.webp";
    const name = leader.card_name || full?.card_name || "";
    const color = leader.card_color || full?.card_color || "";
    const cp = leader.customPrice != null ? leader.customPrice : 0;
    html += `<div class="deck-leader-card" data-key="${leader._key || ""}">
      <div class="card-img-wrap"><img src="${img}" onerror="this.src='TUTCG.webp'"></div>
      <div class="card-body">
        <h3>${name}</h3>
        <span class="card-set-id">${color ? color : ""}</span>`;
    if (isSale) {
      const tcgId = getTcgId(leader);
      const pd = tcgId && preciosCache[tcgId];
      const leaderMarketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(leader.market_price || (full?.market_price || 0));
      const leaderMedianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(leader.inventory_price || (full?.inventory_price || 0));
      const cp = leader.customPrice != null ? leader.customPrice : 0;
      const pm = leader.priceMode || "market";
      const badge = (key, label, value, active) =>
        `<span data-leaderpm="${key}" style="cursor:pointer;padding:1px 5px;border-radius:var(--radius-sm);font-size:9px;font-family:var(--font-mono);font-weight:var(--weight-bold);background:${active ? "var(--accent)" : "rgba(255,255,255,0.06)"};color:${active ? "#050511" : "var(--text-muted)"};border:1px solid ${active ? "var(--accent)" : "var(--border-default)"}">${label}: $${value.toFixed(2)}</span>`;
      html += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0">
        ${badge("market", "Market", leaderMarketP, pm === "market")}
        ${badge("median", "Median", leaderMedianP, pm === "median")}
        ${badge("custom", "Editable", cp, pm === "custom")}
      </div>
      <div class="venta-price-row"><span class="venta-price-label">Tu precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-leaderprice="1"></div>`;
    }
    html += `</div></div>
      <button class="btn-ghost btn-xs" id="deckChangeLeaderBtn">Cambiar líder</button>
      <button class="binder-remove" data-leaderremove="1" style="position:static;margin-top:var(--space-2)">&times; Quitar líder</button>`;
  } else {
    html += `<div class="deck-empty-slot deck-leader-placeholder">Elige un líder</div>`;
  }
  html += `</div></div>`;

  // Main deck section
  const mainLimit = 50;
  const mainTotal = mainCards.reduce((s, c) => s + (c.quantity || 1), 0);
  html += `<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Cartas</h3><span class="deck-count">${mainTotal}/${mainLimit}</span></div><div class="deck-main-grid">`;
  mainCards.forEach((c, i) => {
    const qty = c.quantity || 1;
    const full = c._key ? cartasMap[c._key] : null;
    const img = c.card_image || full?.card_image || "TUTCG.webp";
    let priceHTML = "";
    if (isSale) {
      const tcgId = getTcgId(c);
      const pd = tcgId && preciosCache[tcgId];
      const marketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(c.market_price || full?.market_price || 0);
      const medianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(c.inventory_price || full?.inventory_price || 0);
      const cp = c.customPrice != null ? c.customPrice : 0;
      const pm = c.priceMode || "market";
      const badge = (key, label, value, active) =>
        `<span data-mainpm="${key}" data-midx="${i}" style="cursor:pointer;padding:1px 5px;border-radius:var(--radius-sm);font-size:9px;font-family:var(--font-mono);font-weight:var(--weight-bold);background:${active ? "var(--accent)" : "rgba(255,255,255,0.06)"};color:${active ? "#050511" : "var(--text-muted)"};border:1px solid ${active ? "var(--accent)" : "var(--border-default)"}">${label}: $${value.toFixed(2)}</span>`;
      priceHTML = `<div class="card-body" style="padding:var(--space-2)">
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">
          ${badge("market", "Market", marketP, pm === "market")}
          ${badge("median", "Median", medianP, pm === "median")}
          ${badge("custom", "Editable", cp, pm === "custom")}
        </div>
        <div class="venta-price-row"><span class="venta-price-label">Tu precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-mainprice="${i}"></div>
      </div>`;
    }
    html += `<div class="deck-card-slot" data-key="${c._key || ""}" data-mainidx="${i}">
      <div class="card-img-wrap"><img src="${img}" onerror="this.src='TUTCG.webp'">
        <span class="deck-card-qty">×${qty}</span>
      </div>
      ${priceHTML}
      <button class="binder-remove" data-mainremove="${i}">&times;</button>
    </div>`;
  });
  if (mainTotal < 50) {
    html += `<div class="deck-add-more-btn deck-empty-slot">+ Agregar más (${50 - mainTotal} libres)</div>`;
  }
  html += `</div></div>`;

  // DON!! section
  const donLimit = 10;
  html += `<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">DON!!</h3><span class="deck-count">${dons.length}/${donLimit} <span class="deck-optional">opcional</span></span></div><div class="deck-don-row">`;
  for (let i = 0; i < donLimit; i++) {
    const c = dons[i];
    if (c) {
      const full = c._key ? cartasMap[c._key] : null;
      const img = c.card_image || full?.card_image || "TUTCG.webp";
      let priceHTML = "";
      if (isSale) {
        const tcgId = getTcgId(c);
        const pd = tcgId && preciosCache[tcgId];
        const marketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(c.market_price || full?.market_price || 0);
        const medianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(c.inventory_price || full?.inventory_price || 0);
        const cp = c.customPrice != null ? c.customPrice : 0;
        const pm = c.priceMode || "market";
        const badge = (key, label, value, active) =>
          `<span data-donpm="${key}" data-didx="${i}" style="cursor:pointer;padding:1px 4px;border-radius:var(--radius-sm);font-size:8px;font-family:var(--font-mono);font-weight:var(--weight-bold);background:${active ? "var(--accent)" : "rgba(255,255,255,0.06)"};color:${active ? "#050511" : "var(--text-muted)"};border:1px solid ${active ? "var(--accent)" : "var(--border-default)"}">${label}: $${value.toFixed(2)}</span>`;
        priceHTML = `<div class="card-body" style="padding:var(--space-1)">
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:2px">
            ${badge("market", "M", marketP, pm === "market")}
            ${badge("median", "Med", medianP, pm === "median")}
            ${badge("custom", "Edit", cp, pm === "custom")}
          </div>
          <div class="venta-price-row" style="margin-top:2px"><span class="venta-price-label">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-donprice="${i}" style="width:60px"></div>
        </div>`;
      }
      html += `<div class="deck-don-slot" data-key="${c._key || ""}" data-donidx="${i}">
        <div class="card-img-wrap"><img src="${img}" onerror="this.src='TUTCG.webp'"></div>
        ${priceHTML}
        <button class="binder-remove" data-donremove="${i}">&times;</button>
      </div>`;
    } else if (i === dons.length) {
      html += `<div class="deck-don-slot deck-don-empty deck-don-add" title="Agregar DON!!">+</div>`;
    } else {
      html += `<div class="deck-don-slot deck-don-empty"></div>`;
    }
  }
  html += `</div></div>`;

  html += `</div>`; // .deck-container
  grid.innerHTML = html;

  // Event handlers
  grid.querySelectorAll("[data-leaderremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); col.leader = null; saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer); });
  });
  grid.querySelectorAll("[data-mainremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-mainremove")); const entry = col.cards[i]; if (!entry) return; if (entry.quantity > 1) entry.quantity--; else col.cards.splice(i, 1); saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer); });
  });
  grid.querySelectorAll("[data-donremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-donremove")); col.dons.splice(i, 1); saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer); });
  });
  grid.querySelectorAll(".deck-card-slot .card-img-wrap img, .deck-leader-card .card-img-wrap img, .deck-don-slot .card-img-wrap img").forEach(img => {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const slot = this.closest("[data-key]");
      if (!slot) return;
      const key = slot.getAttribute("data-key");
      const carta = key ? cartasMap[key] : null;
      if (!carta) return;
      let navList = null, startIdx;
      if (slot.hasAttribute("data-mainidx")) {
        const slotIdx = parseInt(slot.getAttribute("data-mainidx"));
        navList = []; startIdx = 0;
        col.cards.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      } else if (slot.hasAttribute("data-donidx")) {
        const slotIdx = parseInt(slot.getAttribute("data-donidx"));
        navList = []; startIdx = 0;
        col.dons.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      } else if (carta.card_type === "LEADER") {
        navList = cartas.filter(c => c.card_set_id === carta.card_set_id && c.card_type === "LEADER");
      }
      openCardInModal(carta, navList, startIdx);
    });
  });
  grid.querySelectorAll("[data-leaderprice]").forEach(inp => {
    inp.addEventListener("change", () => { if (col.leader) col.leader.customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck(isSale); });
  });
  grid.querySelectorAll("[data-mainprice]").forEach(inp => {
    inp.addEventListener("change", () => { const i = parseInt(inp.getAttribute("data-mainprice")); if (col.cards[i]) col.cards[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck(isSale); });
  });
  grid.querySelectorAll("[data-donprice]").forEach(inp => {
    inp.addEventListener("change", () => { const i = parseInt(inp.getAttribute("data-donprice")); if (col.dons[i]) col.dons[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck(isSale); });
  });
  grid.querySelectorAll("[data-leaderpm]").forEach(el => {
    el.addEventListener("click", () => {
      if (!col.leader) return;
      col.leader.priceMode = el.getAttribute("data-leaderpm");
      saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
    });
  });
  grid.querySelectorAll("[data-mainpm]").forEach(el => {
    el.addEventListener("click", () => {
      const i = parseInt(el.getAttribute("data-midx"));
      if (!col.cards[i]) return;
      col.cards[i].priceMode = el.getAttribute("data-mainpm");
      saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
    });
  });
  grid.querySelectorAll("[data-donpm]").forEach(el => {
    el.addEventListener("click", () => {
      const i = parseInt(el.getAttribute("data-didx"));
      if (!col.dons[i]) return;
      col.dons[i].priceMode = el.getAttribute("data-donpm");
      saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
    });
  });

  // Picker triggers
  function pickLeader() {
    showDeckPicker("leader").then(picked => {
      if (!picked) return;
      col.leader = { _key: getCardKey(picked), card_set_id: picked.card_set_id, card_name: picked.card_name, card_image: picked.card_image, card_color: picked.card_color, card_type: picked.card_type, set_id: picked.set_id, customPrice: 0 };
      saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
    });
  }

  const leaderPlaceholder = grid.querySelector(".deck-leader-placeholder");
  if (leaderPlaceholder) {
    leaderPlaceholder.addEventListener("click", pickLeader);
    leaderPlaceholder.style.cursor = "pointer";
  }

  const leaderCard = grid.querySelector(".deck-leader-card");
  if (leaderCard) leaderCard.style.cursor = "pointer";
  const leaderImg = grid.querySelector(".deck-leader-card .card-img-wrap");
  if (leaderImg) leaderImg.addEventListener("click", e => { e.stopPropagation(); pickLeader(); });
  const changeLeaderBtn = document.getElementById("deckChangeLeaderBtn");
  if (changeLeaderBtn) changeLeaderBtn.addEventListener("click", pickLeader);

  const mainEmpty = grid.querySelectorAll(".deck-add-more-btn, .deck-empty-slot:not(.deck-leader-placeholder)");
  mainEmpty.forEach(el => {
    el.addEventListener("click", async () => {
      if (!col.leader) { alert("Primero debes elegir un líder."); return; }
      const lColor = col.leader?.card_color || "";
      const existingKeys = (col.cards || []).map(c => c._key).filter(Boolean);
      const mainTotal = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
      const remaining = 50 - mainTotal;
      if (remaining <= 0) { alert("El deck ya tiene 50 cartas."); return; }
      const lSetId = col.leader?.set_id || "";
      const existingCounts = {};
      (col.cards || []).forEach(c => {
        if (c.card_set_id) existingCounts[c.card_set_id] = (existingCounts[c.card_set_id] || 0) + (c.quantity || 1);
      });
      const pickedArr = await showDeckPicker("main", lColor, existingKeys, lSetId, existingCounts, remaining);
      if (pickedArr && pickedArr.length) {
        pickedArr.forEach(c => {
          const mainTotal = col.cards.reduce((s, card) => s + (card.quantity || 1), 0);
          if (mainTotal >= 50) return;
          const key = getCardKey(c);
          const setId = c.card_set_id;
          const deckTotal = col.cards
            .filter(card => card.card_set_id === setId)
            .reduce((sum, card) => sum + (card.quantity || 1), 0);
          if (!isUnlimited(c) && deckTotal >= 4) return;
          const existing = col.cards.find(card => card._key === key);
          if (existing) {
            existing.quantity++;
          } else {
            col.cards.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
  }
});
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  grid.querySelectorAll(".deck-don-add").forEach(el => {
    el.addEventListener("click", async () => {
      if (!col.leader) { alert("Primero debes elegir un líder."); return; }
      const totalDons = col.dons?.length || 0;
      const remaining = 10 - totalDons;
      if (remaining <= 0) { alert("Ya tienes 10 DON!!"); return; }
      const existingKeys = (col.dons || []).map(c => c._key).filter(Boolean);
      const pickedArr = await showDeckPicker("don", "", existingKeys, "", null, remaining);
      if (pickedArr && pickedArr.length) {
        const toAdd = pickedArr;
        if (!col.dons) col.dons = [];
        toAdd.forEach(c => {
          if (col.dons.length >= 10) return;
          col.dons.push({ _key: getCardKey(c), card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, customPrice: 0 });
        });
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  // Deck clear buttons
  const clearPageBtn = document.getElementById(isSale ? "ventaClearPageBtn" : "binderClearPageBtn");
  const clearAllBtn = document.getElementById(isSale ? "ventaClearAllBtn" : "binderClearAllBtn");
  if (clearPageBtn) {
    clearPageBtn.textContent = "Vaciar deck";
    clearPageBtn.onclick = () => {
      if (!col.cards.length) return;
      const total = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
      if (confirm(`¿Vaciar las ${total} cartas del deck?`)) {
        col.cards = [];
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    };
  }
  if (clearAllBtn) {
    clearAllBtn.textContent = "Vaciar dones";
    clearAllBtn.onclick = () => {
      if (!col.dons?.length) return;
      if (confirm(`¿Vaciar los ${col.dons.length} DON!! del deck?`)) {
        col.dons = [];
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    };
  }
}

function saveDeck(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}

// ─── Binder ─────────────────────────────────────────────────────────────

function renderBinder() {
  const grid = document.getElementById("binderGrid");
  const deckContainer = document.getElementById("binderDeckContainer");
  const pagination = document.getElementById("binderPagination");
  const title = document.getElementById("binderTitle");
  const toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (!grid || !currentCollectionId) return;
  const col = collections[currentCollectionId];
  if (!col) { mostrarVista("collections"); return; }
  if (col.subtype === "deck") {
    grid.style.display = "none";
    if (pagination) pagination.style.display = "none";
    deckContainer.style.display = "";
    renderDeckView("collection", col, deckContainer, title, toggleContainer);
    return;
  }
  deckContainer.style.display = "none";
  grid.style.display = "";
  if (pagination) pagination.style.display = "";
  const clearPB = document.getElementById("binderClearPageBtn");
  const clearAB = document.getElementById("binderClearAllBtn");
  if (clearPB) clearPB.textContent = "Vaciar página";
  if (clearAB) clearAB.textContent = "Vaciar todo";
  title.textContent = col.name;
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
        <input type="checkbox" id="binderPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span>
      </label>
    ` : "";
    const chk = document.getElementById("binderPublicCheck");
    if (chk) {
      chk.onchange = () => toggleBinderPublic(currentCollectionId);
    }
  }
  grid.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
  const start = (binderPage - 1) * binderPerPage;
  const pageCards = col.cards.slice(start, start + binderPerPage);
  for (let i = 0; i < binderPerPage; i++) {
    const slot = document.createElement("div");
    const globalIdx = start + i;
    slot.className = "card fade-in";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      const fullBinderCard = c._key ? cartasMap[c._key] : null;
      const data = fullBinderCard || c;
      const nombre = formatearNombre(data);
      const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
      const precio = fullBinderCard ? getPrecio(fullBinderCard) : 0;
      const precioLabel = priceType === "market" ? "Market" : "Median";
      let badge = "";
      if (fullBinderCard) {
        const r = obtenerRareza(fullBinderCard);
        if (fullBinderCard.category === "DON" || fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") {
          if (fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") {
            if (["Reprint","Jolly Roger","Full Art","AA","Textured Foil","Manga","SP"].includes(r)) badge = r;
          } else if (r !== "Normal") {
            badge = r;
          }
        }
      }
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key);
      slot.setAttribute("data-cardkey", c._key);
      slot.innerHTML = `
        <div class="card-img-wrap">
          <img src="${c.card_image || fullBinderCard?.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'" loading="lazy">
        </div>
        <div class="card-body">
          <h3>${nombre}</h3>
          ${badge ? `<span class="card-print-type">${badge}</span>` : ""}
          <span class="card-set-id">${setId}</span>
          <div class="card-price">${precioLabel}: $${precio.toFixed(2)}</div>
        </div>
        <button class="binder-remove" data-global="${globalIdx}">&times;</button>`;
    } else {
      slot.innerHTML = `<div class="binder-empty">+</div>`;
      slot.removeAttribute("draggable");
    }
    grid.appendChild(slot);
  }
  grid.querySelectorAll(".card img").forEach(img => {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".card")?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
  document.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); removeFromCurrentCollection(parseInt(btn.getAttribute("data-global"))); });
  });
  document.getElementById("binderPrevBtn").disabled = binderPage <= 1;
  document.getElementById("binderNextBtn").disabled = binderPage >= totalPages;
  document.getElementById("binderPageInfo").textContent = "Página " + binderPage + " de " + totalPages;
  setupBinderDragDrop();
}

function removeFromCurrentCollection(realIdx) {
  const col = collections[currentCollectionId];
  if (!col) return;
  col.cards.splice(realIdx, 1);
  guardarCollections();
  renderBinder();
  actualizarBotonesBinder();
}

function actualizarBotonesBinder() {
  document.querySelectorAll(".add-binder-btn").forEach(btn => btn.classList.remove("added"));
}

function setupBinderDragDrop() {
  const slots = document.querySelectorAll("#binderGrid .card");
  slots.forEach(slot => {
    slot.addEventListener("dragstart", e => {
      const key = slot.getAttribute("data-key");
      if (!key) { e.preventDefault(); return; }
      e.dataTransfer.setData("text/plain", key);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging");
    });
    slot.addEventListener("dragend", e => slot.classList.remove("dragging"));
    slot.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
    slot.addEventListener("drop", e => {
      e.preventDefault();
      const fromKey = e.dataTransfer.getData("text/plain");
      const toGlobal = parseInt(slot.getAttribute("data-global"));
      const col = collections[currentCollectionId];
      if (!col) return;
      const fromIdx = col.cards.findIndex(s => s && s._key === fromKey);
      if (fromIdx === -1 || toGlobal >= col.cards.length) return;
      const card = col.cards.splice(fromIdx, 1)[0];
      const adjustedTo = toGlobal > fromIdx ? toGlobal - 1 : toGlobal;
      col.cards.splice(adjustedTo, 0, card);
      guardarCollections();
      renderBinder();
    });
  });
}

// ─── Venta ────────────────────────────────────────────────────────────────

function renderVentaList() {
  const container = document.getElementById("ventaList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(ventaCols);
  if (!ids.length) {
    container.innerHTML = `<div class="collection-empty"><p>No tienes colecciones de venta</p><button class="btn-primary" id="createFirstVentaBtn">Crear primera colección de venta</button></div>`;
    const btn = document.getElementById("createFirstVentaBtn");
    if (btn) btn.addEventListener("click", pedirCrearVenta);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(id => {
    const col = ventaCols[id];
    const coverImg = getFirstCardImage(col.cards, col);
    const isDeck = col.subtype === "deck";
    const totalStr = isDeck
      ? `${col.leader ? "1 líder · " : ""}${(col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0)} cartas${col.dons?.length ? " · " + col.dons.length + " DON" : ""}`
      : `${col.cards.reduce((s, c) => s + (c.quantity || 1), 0)} cartas`;
    const badgeText = isDeck ? "Deck" : (col.display_mode === "playset" ? "Playset" : col.display_mode === "editable" ? "Editable" : "Individual");
    const div = document.createElement("div");
    div.className = "binder-cover-card";
    div.innerHTML = `
      <div class="binder-cover-img" style="background-image:url(${coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'"})">
        <div class="binder-cover-overlay">
          <span class="binder-cover-count">${totalStr}</span>
        </div>
      </div>
      <div class="binder-cover-meta">
        <span class="binder-cover-name-badge">${col.name}</span>
        <span class="binder-cover-badge sale">${badgeText}</span>
        ${(() => {
          const mode = col.priceMode || "market";
          const tp = getTotalPrice(col, mode);
          const dp = col.customTotalPrice != null ? Number(col.customTotalPrice) : tp;
          const isCustom = col.customTotalPrice != null;
          return `<div style="display:flex;align-items:center;gap:6px;margin-top:var(--space-1)">
            <span data-totalprice="1" style="font-size:var(--text-sm);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">$${dp.toFixed(2)}</span>
            <button class="btn-ghost btn-xs" data-action="editprice" data-id="${id}" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0" title="Editar precio total">✎</button>
            ${isCustom ? `<button class="btn-ghost btn-xs" data-action="resetprice" data-id="${id}" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0;color:var(--text-muted)" title="Restaurar precio calculado">↺</button>` : ""}
          </div>`;
        })()}
      </div>
      <div class="binder-cover-actions">
        <button class="btn-ghost btn-xs" data-action="open" data-id="${id}">Abrir</button>
        <button class="btn-ghost btn-xs" data-action="rename" data-id="${id}">Renombrar</button>
        <button class="btn-danger btn-xs" data-action="delete" data-id="${id}">Eliminar</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => openVenta(b.getAttribute("data-id")));
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección de venta",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: ventaCols[id].name,
        onConfirm: (nombre) => { ventaCols[id].name = nombre.trim(); guardarVenta(); renderVentaList(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      if (confirm('Eliminar la colección de venta "' + ventaCols[id].name + '"?')) { delete ventaCols[id]; guardarVenta(); renderVentaList(); }
    });
  });
  container.querySelectorAll("[data-action='editprice']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const col = ventaCols[id];
      if (!col) return;
      const container = b.closest(".binder-cover-card");
      if (!container) return;
      const priceSpan = container.querySelector("[data-totalprice]");
      if (!priceSpan) return;
      if (priceSpan.querySelector("input")) return;
      const current = col.customTotalPrice != null ? col.customTotalPrice : getTotalPrice(col, col.priceMode || "market");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.5";
      input.min = "0";
      input.value = current.toFixed(2);
      input.style.cssText = "width:80px;padding:2px 6px;border:1px solid var(--accent);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--accent);font-size:var(--text-sm);font-family:var(--font-mono);font-weight:var(--weight-bold);outline:none";
      priceSpan.innerHTML = "";
      priceSpan.appendChild(input);
      input.focus();
      input.select();
      const save = () => {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) { renderVentaList(); return; }
        const calc = getTotalPrice(col, col.priceMode || "market");
        if (val === calc) delete col.customTotalPrice;
        else col.customTotalPrice = val;
        guardarVenta(); renderVentaList();
      };
      input.addEventListener("keydown", e => { if (e.key === "Enter") save(); if (e.key === "Escape") renderVentaList(); });
      input.addEventListener("blur", save);
    });
  });
  container.querySelectorAll("[data-action='resetprice']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const col = ventaCols[id];
      if (!col) return;
      delete col.customTotalPrice;
      guardarVenta(); renderVentaList();
    });
  });
}

function pedirCrearVenta() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección de venta",
    confirmText: "Crear",
    placeholder: "Nombre de la colección de venta",
    extraHTML: `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>
      <select id="createVentaSubtype" onchange="document.getElementById('createVentaModeRow').style.display=this.value==='binder'?'':'none'" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="binder">Binder — cartas libres</option>
        <option value="deck">Deck — líder + 50 cartas + 10 DON!!</option>
      </select>
      <div id="createVentaModeRow">
        <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin:var(--space-2) 0 var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Modo de visualización</label>
        <select id="createVentaMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
          <option value="individual">Individual — una copia por slot</option>
          <option value="playset">Playset — máximo 4 copias por carta</option>
          <option value="editable">Editable — cantidad libre por carta</option>
        </select>
      </div>`,
    onConfirm: (nombre) => {
      const subtype = document.getElementById("createVentaSubtype")?.value || "binder";
      const mode = document.getElementById("createVentaMode")?.value || "individual";
      const id = generarId();
      ventaCols[id] = { id, name: nombre.trim(), subtype, cards: [], leader: null, dons: [], is_public: false, display_mode: mode };
      guardarVenta();
      renderVentaList();
    }
  });
}

function openVenta(id) { currentVentaId = id; ventaPage = 1; mostrarVista("venta"); }

function renderVentaView() {
  const grid = document.getElementById("ventaGrid");
  const deckContainer = document.getElementById("ventaDeckContainer");
  const pagination = document.getElementById("ventaPagination");
  const title = document.getElementById("ventaTitle");
  const toggleContainer = document.getElementById("ventaPublicToggleContainer");
  const modeContainer = document.getElementById("ventaModeContainer");
  if (!grid || !currentVentaId) return;
  const col = ventaCols[currentVentaId];
  if (!col) { mostrarVista("ventaCols"); return; }
  if (col.subtype === "deck") {
    grid.style.display = "none";
    if (pagination) pagination.style.display = "none";
    deckContainer.style.display = "";
    if (modeContainer) modeContainer.innerHTML = "";
    renderDeckView("sale", col, deckContainer, title, toggleContainer);
    return;
  }
  deckContainer.style.display = "none";
  grid.style.display = "";
  if (pagination) pagination.style.display = "";
  const clearPB = document.getElementById("ventaClearPageBtn");
  const clearAB = document.getElementById("ventaClearAllBtn");
  if (clearPB) clearPB.textContent = "Vaciar página";
  if (clearAB) clearAB.textContent = "Vaciar todo";
  title.textContent = col.name;
  const mode = col.display_mode || "individual";

  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
        <input type="checkbox" id="ventaPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span>
      </label>
    ` : "";
    const chk = document.getElementById("ventaPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(currentVentaId);
  }

  if (modeContainer) {
    const labels = { individual: "Individual", playset: "Playset", editable: "Editable" };
    modeContainer.innerHTML = `<span class="venta-mode-badge">${labels[mode] || mode}</span>`;
  }

  grid.innerHTML = "";
  if (mode === "individual") renderVentaIndividual(col, grid);
  else if (mode === "playset") renderVentaGrouped(col, grid, "playset");
  else if (mode === "editable") renderVentaGrouped(col, grid, "editable");
}

function buildVentaCardHTML(c, marketP, medianP, globalIdx, mode) {
  const cp = c.customPrice != null ? c.customPrice : 0;
  const fullCard = c._key ? cartasMap[c._key] : null;
  const data = fullCard || c;
  const nombre = formatearNombre(data);
  const rareza = fullCard && (fullCard.category === "DON" || fullCard.set_id === "PRB-01" || fullCard.set_id === "PRB-02") ?
    (() => { const r = obtenerRareza(fullCard); if (fullCard.set_id === "PRB-01" || fullCard.set_id === "PRB-02") return ["Reprint","Jolly Roger","Full Art","AA","Textured Foil","Manga","SP"].includes(r) ? r : ""; return r; })() : "";
  const printType = fullCard?.print_type || c.print_type || "";
  const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");

  let qtyHTML = "";
  if (mode === "playset") {
    const q = c.quantity || 1;
    const psTag = q >= 4 ? `<span class="card-ps-badge">PS</span>` : "";
    qtyHTML = `<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="${globalIdx}">&minus;</button><span class="venta-qty-value">${q}</span><button class="venta-qty-btn" data-action="incr" data-ventaidx="${globalIdx}">+</button>${psTag}</div>`;
  } else if (mode === "editable") {
        qtyHTML = `<div class="venta-qty-control"><label class="venta-qty-label">Qty:</label><input type="number" class="venta-qty-input" value="${c.quantity || 1}" min="1" max="50" data-ventaidx="${globalIdx}"></div>`;
  }

  return `
    <div class="card-img-wrap">
      <img src="${c.card_image || fullCard?.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'" loading="lazy">
    </div>
    <div class="card-body">
      <h3>${nombre}</h3>
      ${printType ? `<span class="card-print-type">${printType}</span>` : (rareza && rareza !== "Normal" ? `<span class="card-print-type">${rareza}</span>` : "")}
      <span class="card-set-id">${setId}</span>
      ${qtyHTML}
      <div class="card-price">Market: $${marketP.toFixed(2)}</div>
      <div class="card-price" style="font-size:var(--text-sm);color:var(--text-tertiary);font-weight:var(--weight-medium)">Median: $${medianP.toFixed(2)}</div>
      <div class="venta-price-row">
        <span class="venta-price-label">Tu precio:</span>
        <span class="venta-price-prefix">$</span>
        <input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-ventaidx="${globalIdx}">
      </div>
    </div>
    <button class="binder-remove" data-ventaidx="${globalIdx}" data-mode="${mode}">&times;</button>`;
}

function renderVentaIndividual(col, grid) {
  const totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  const start = (ventaPage - 1) * ventaPerPage;
  const pageCards = col.cards.slice(start, start + ventaPerPage);

  for (let i = 0; i < ventaPerPage; i++) {
    const slot = document.createElement("div");
    const globalIdx = start + i;
    slot.className = "card";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      const tcgId = getTcgId(c);
      const pd = tcgId && preciosCache[tcgId];
      const marketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(c.market_price || 0);
      const medianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(c.inventory_price || 0);
      slot.className = "card venta-slot";
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      slot.innerHTML = buildVentaCardHTML(c, marketP, medianP, globalIdx, "individual");
    } else {
      slot.className = "card venta-slot";
    }
    grid.appendChild(slot);
  }

  attachVentaEvents(col, "individual", grid, totalPages);
}

function renderVentaGrouped(col, grid, mode) {
  const cards = col.cards || [];
  const totalPages = Math.max(1, Math.ceil(cards.length / ventaPerPage));
  const start = (ventaPage - 1) * ventaPerPage;
  const pageCards = cards.slice(start, start + ventaPerPage);

  pageCards.forEach((c, i) => {
    const globalIdx = start + i;
    const tcgId = getTcgId(c);
    const pd = tcgId && preciosCache[tcgId];
    const marketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(c.market_price || 0);
    const medianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(c.inventory_price || 0);
    const slot = document.createElement("div");
    slot.className = "card venta-slot venta-grouped";
    slot.setAttribute("data-key", c._key || "");
    slot.setAttribute("data-cardkey", c._key || "");
    slot.setAttribute("data-global", globalIdx);
    slot.innerHTML = buildVentaCardHTML(c, marketP, medianP, globalIdx, mode);
    grid.appendChild(slot);
  });

  attachVentaEvents(col, mode, grid, totalPages);
}

function attachVentaEvents(col, mode, grid, totalPages) {
  // Remove buttons
  grid.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const btnMode = btn.getAttribute("data-mode") || "individual";
      if (btnMode === "individual") {
        col.cards.splice(idx, 1);
      } else {
        const entry = col.cards.find((_, i) => i === idx);
        if (!entry) return;
        if (entry.quantity > 1) entry.quantity--;
        else col.cards.splice(idx, 1);
      }
      guardarVenta();
      renderVentaView();
    });
  });

  // Price inputs
  grid.querySelectorAll(".venta-price-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      col.cards[idx].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value);
      guardarVenta();
    });
  });

  // Quantity buttons (playset mode)
  grid.querySelectorAll(".venta-qty-btn[data-action='incr']").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      if (col.cards[idx].quantity < 4) col.cards[idx].quantity++;
      guardarVenta();
      renderVentaView();
    });
  });
  grid.querySelectorAll(".venta-qty-btn[data-action='decr']").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      if (col.cards[idx].quantity > 1) col.cards[idx].quantity--;
      else col.cards.splice(idx, 1);
      guardarVenta();
      renderVentaView();
    });
  });

  // Quantity inputs (editable mode)
  grid.querySelectorAll(".venta-qty-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const val = parseInt(inp.value);
      if (val < 1) { col.cards.splice(idx, 1); }
      else { col.cards[idx].quantity = Math.min(val, 50); }
      guardarVenta();
      renderVentaView();
    });
  });

  // Click to open card modal
  grid.querySelectorAll(".venta-slot .card-img-wrap img").forEach(img => {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".venta-slot")?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });

  document.getElementById("ventaPrevBtn").disabled = ventaPage <= 1;
  document.getElementById("ventaNextBtn").disabled = ventaPage >= totalPages;
  document.getElementById("ventaPageInfo").textContent = "Página " + ventaPage + " de " + totalPages;

  if (mode === "individual") setupVentaDragDrop();
}

// ─── Explore / Public Binders ─────────────────────────────────────────────

async function renderExploreView() {
  const container = document.getElementById("exploreContainer");
  if (!container) return;
  container.className = "explore-grid";
  container.innerHTML = '<div class="loader" style="text-align:center;padding:40px;color:var(--text-tertiary)">Cargando binders públicos…</div>';

  if (!isAuthenticated()) {
    container.innerHTML = '<div class="collection-empty"><p>Inicia sesión para explorar binders públicos</p></div>';
    return;
  }

  try {
    const { data: publicBinders, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*)")
      .eq("is_public", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    if (!publicBinders || !publicBinders.length) {
      container.innerHTML = '<div class="collection-empty"><p>No hay binders públicos aún</p><p style="font-size:var(--text-sm);color:var(--text-tertiary)">Los usuarios pueden publicar sus colecciones y ventas desde la vista de Binder o Venta</p></div>';
      return;
    }

    container.innerHTML = "";
    for (const b of publicBinders) {
      let username = "Usuario";
      let avatarUrl = "";
      try {
        const { data: prof } = await supabaseClient
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", b.user_id)
          .single();
        if (prof?.username) username = prof.username;
        if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      } catch (e) {}

      const cardCount = b.binder_cards?.reduce((s, c) => s + c.quantity, 0) || 0;
      const typeLabel = b.type === "sale" ? "Venta" : "Colección";
      const isOwner = authUser && b.user_id === authUser.id;

      // Get cover image from first card
      let coverImg = null;
      if (b.binder_cards?.length) {
        const first = b.binder_cards[0];
        if (first.card_id) {
          const found = cartasMap[first.card_id];
          if (found?.card_image) coverImg = found.card_image;
        }
      }

      const div = document.createElement("div");
      div.className = "explore-card";
      div.innerHTML = `
        <div style="aspect-ratio:63/88;background:${coverImg ? `url(${coverImg}) center/cover` : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-secondary))'};border-bottom:1px solid var(--border-subtle)"></div>
        <div style="padding:var(--space-2) var(--space-3) var(--space-3)">
          <div style="display:flex;align-items:center;gap:var(--space-1);margin-bottom:var(--space-1)">
            <h3 style="font-size:11px;font-weight:var(--weight-semibold);color:#fff;margin:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</h3>
            <span class="explore-badge ${b.type}" style="font-size:8px;padding:1px 5px">${typeLabel}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-1)">
            ${avatarUrl ? `<img src="${avatarUrl}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent);flex-shrink:0">` : `<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#1e3a5f);flex-shrink:0"></div>`}
            <span style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${username}${isOwner ? "" : ""}</span>
            <span style="font-size:9px;color:var(--text-muted);margin-left:auto;white-space:nowrap">${cardCount} c</span>
          </div>
        </div>
      `;
      div.addEventListener("click", () => openExploreDetail(b));
      container.appendChild(div);
    }
  } catch (e) {
    console.error("Explore error:", e);
    container.innerHTML = '<div class="collection-empty"><p>Error al cargar binders públicos</p></div>';
  }
}

function openExploreDetail(binder) {
  exploreDetailBinder = binder;
  mostrarVista("exploreDetail");
}

function renderExploreDetail() {
  const container = document.getElementById("exploreDetailContainer");
  const title = document.getElementById("exploreDetailTitle");
  if (!container || !exploreDetailBinder) return;
  const b = exploreDetailBinder;
  title.textContent = b.name;
  const cards = b.binder_cards || [];
  const typeLabel = b.type === "sale" ? "Venta" : "Colección";
  container.innerHTML = `
    <div class="explore-detail-header">
      <span class="explore-badge ${b.type}">${typeLabel}</span>
      <span>${cards.reduce((s, c) => s + c.quantity, 0)} cartas</span>
    </div>
    <div class="explore-detail-grid"></div>
  `;
  const grid = container.querySelector(".explore-detail-grid");
  cards.forEach(row => {
    const carta = cartasMap[row.card_id];
    if (!carta) return;
    for (let i = 0; i < row.quantity; i++) {
      const precio = getPrecio(carta);
      const precioLabel = "Market: $" + precio.toFixed(2);
      const div = document.createElement("div");
      div.className = "card fade-in";
      div.innerHTML = `
        <div class="card-img-wrap">
          <img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
        </div>
        <div class="card-body">
          <h3>${formatearNombre(carta)}</h3>
          <span class="card-set-id">${carta.card_set_id || ""}</span>
          <div class="card-price">${precioLabel}</div>
          ${b.type === "sale" && row.price != null ? `<div class="card-price" style="color:var(--accent);font-weight:var(--weight-semibold)">Precio vendedor: $${parseFloat(row.price).toFixed(2)}</div>` : ""}
        </div>`;
      grid.appendChild(div);
    }
  });
}

// ─── Selection Mode ───────────────────────────────────────────────────────
let selectionMode = false;
let selectedCards = {};

function toggleSelectionMode() {
  selectionMode = !selectionMode;
  const btn = document.getElementById("seleccionarBtn");
  if (selectionMode) {
    btn.textContent = "Cancelar";
    btn.classList.add("active");
  } else {
    btn.textContent = "Seleccionar";
    btn.classList.remove("active");
    document.querySelectorAll(".card.selected").forEach(el => el.classList.remove("selected"));
    selectedCards = {};
  }
  actualizarBadge();
  actualizarBadgesEnPagina();
}

function toggleCardSelection(imgEl) {
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  if (!cardEl) return;
  const cardKey = cardEl.getAttribute("data-cardkey");
  if (!cardKey) return;
  const carta = cartasMap[cardKey];
  if (!carta) return;

  const next = selectedCards[cardKey] ? (
    selectedCards[cardKey].count === 1 ? 4 :
    selectedCards[cardKey].count === 4 ? 10 : 0
  ) : 1;

  if (next === 0) {
    delete selectedCards[cardKey];
    cardEl.classList.remove("selected");
  } else {
    selectedCards[cardKey] = {
      card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image,
      card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza,
      set_id: carta.set_id, producto: carta.producto, category: carta.category,
      market_price: carta.market_price, inventory_price: carta.inventory_price,
      print_type: carta.print_type, cardset: carta.cardset, count: next
    };
    cardEl.classList.add("selected");
  }
  actualizarBadge();
  actualizarBadgesEnPagina();
}

function reapplySelectionClasses() {
  if (!selectionMode) return;
  cardsContainer.querySelectorAll(".card").forEach(el => {
    const key = el.getAttribute("data-cardkey");
    if (key && selectedCards[key]) el.classList.add("selected");
  });
}

// ─── Pending Cards ────────────────────────────────────────────────────────

function actualizarBadge() {
  const source = selectionMode ? selectedCards : pendingCards;
  const keys = Object.keys(source);
  const unique = keys.length;
  const total = keys.reduce((s, k) => s + source[k].count, 0);
  const btn = document.getElementById("agregarBtn");
  if (unique) { btn.innerHTML = 'Agregar a <span class="pending-badge">' + unique + '</span> <span class="pending-total">(' + total + ')</span>'; }
  else { btn.textContent = "Agregar a"; }
}

function limpiarPendientes() { pendingCards = {}; actualizarBadge(); actualizarBadgesEnPagina(); }

// ─── Create / Rename Modal ──────────────────────────────────────────────

let _createCallback = null;

function showCreateModal(opts) {
  const overlay = document.getElementById("createModalOverlay");
  const input = document.getElementById("createModalInput");
  const title = document.getElementById("createModalTitle");
  const confirmBtn = document.getElementById("createModalConfirm");
  const extra = document.getElementById("createModalExtra");
  title.textContent = opts.title || "Crear";
  confirmBtn.textContent = opts.confirmText || "Crear";
  input.placeholder = opts.placeholder || "Nombre";
  input.value = opts.initialValue || "";
  extra.innerHTML = opts.extraHTML || "";
  _createCallback = opts.onConfirm || null;
  overlay.style.display = "flex";
  setTimeout(() => input.focus(), 100);
  input.select();
}

function confirmCreateModal() {
  const input = document.getElementById("createModalInput");
  const nombre = input.value.trim();
  if (!nombre) { input.focus(); input.style.borderColor = "var(--danger)"; setTimeout(() => input.style.borderColor = "", 1500); return; }
  if (_createCallback) _createCallback(nombre);
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}

function hideCreateModal() {
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}

// ─── Add Modal ───────────────────────────────────────────────────────────

function mostrarAddModal() {
  const overlay = document.getElementById("addModalOverlay");
  const list = document.getElementById("addModalList");
  const pendSection = document.getElementById("addModalPendSection");
  const qtyRow = document.getElementById("addModalQtyRow");
  qtyRow.style.display = "none";
  list.innerHTML = "";
  pendSection.innerHTML = "";
  const pendKeys = Object.keys(pendingCards);
  if (!pendKeys.length) {
    list.innerHTML = "<p style='color:var(--text-tertiary);padding:10px;font-size:var(--text-sm)'>No hay cartas pendientes</p>";
    document.getElementById("addModalConfirm").style.display = "none";
    overlay.style.display = "flex";
    return;
  }
  document.getElementById("addModalConfirm").style.display = "";
  const totalCount = pendKeys.reduce((s, k) => s + pendingCards[k].count, 0);
  const maxShow = 5;
  const showAll = pendKeys.length <= maxShow;
  const visibleKeys = showAll ? pendKeys : pendKeys.slice(0, maxShow);

  const makeItem = (key, pc) => `
    <button class="pend-btn pend-minus" data-key="${key}" style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:12px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:1px solid var(--border-default)">&minus;</button>
    <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold);min-width:18px;text-align:center">${pc.count}x</span>
    <button class="pend-btn pend-plus" data-key="${key}" style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:12px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:1px solid var(--border-default)">+</button>
    <span style="font-size:var(--text-xs);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${formatearNombre(pc)}</span>
    <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-left:auto;flex-shrink:0">${(pc.category || pc.producto) === "DON" ? (pc.variant || "") : (pc.card_set_id || "")}</span>`;

  const pendHeader = document.createElement("div");
  pendHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)";
  pendHeader.innerHTML = `<span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Pendientes · ${pendKeys.length} cartas · ${totalCount} copias</span>`;
  pendSection.appendChild(pendHeader);

  const pendGrid = document.createElement("div");
  pendGrid.style.cssText = "display:flex;flex-direction:column;gap:2px";
  const renderKeys = (keys) => {
    pendGrid.innerHTML = "";
    keys.forEach(key => {
      const pc = pendingCards[key];
      if (!pc) return;
      const item = document.createElement("div");
      item.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:4px 6px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle)";
      item.innerHTML = makeItem(key, pc);
      pendGrid.appendChild(item);
    });
  };
  renderKeys(visibleKeys);

  if (!showAll) {
    const toggleBtn = document.createElement("button");
    toggleBtn.style.cssText = "margin-top:var(--space-1);padding:4px 8px;font-size:10px;color:var(--accent);cursor:pointer;background:none;border:none;font-family:var(--font-mono)";
    let expanded = false;
    const updateLabel = () => { toggleBtn.textContent = expanded ? "▲ Mostrar menos" : `▼ +${pendKeys.length - maxShow} más`; };
    updateLabel();
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      renderKeys(expanded ? pendKeys : visibleKeys);
      updateLabel();
      if (expanded) pendGrid.appendChild(toggleBtn); else pendGrid.appendChild(toggleBtn);
    });
    pendGrid.appendChild(toggleBtn);
  }
  pendSection.appendChild(pendGrid);

  // Pend buttons events
  pendSection.querySelectorAll(".pend-minus").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!pendingCards[key]) return;
      pendingCards[key].count--;
      if (pendingCards[key].count <= 0) delete pendingCards[key];
      actualizarBadge();
      mostrarAddModal();
    });
  });
  pendSection.querySelectorAll(".pend-plus").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!pendingCards[key]) return;
      pendingCards[key].count++;
      actualizarBadge();
      mostrarAddModal();
    });
  });

  // Collections list
  const colIds = Object.keys(collections);
  const ventaIds = Object.keys(ventaCols);
  if (colIds.length || ventaIds.length) {
    document.getElementById("addModalConfirm").style.display = "";
    if (colIds.length) {
      const sep = document.createElement("div");
      sep.style.cssText = "font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:var(--space-2) 0 var(--space-1)";
      sep.textContent = "Binder";
      list.appendChild(sep);
      colIds.forEach(id => {
        const col = collections[id];
        if (col.subtype === "deck") return;
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary);transition:background var(--transition-fast)";
        label.innerHTML = `<input type="checkbox" value="${id}" style="accent-color:var(--accent);width:14px;height:14px"> <span style="flex:1">${col.name}</span> <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted)">${col.cards.length}</span>`;
        list.appendChild(label);
      });
    }
    if (ventaIds.length) {
      const sep = document.createElement("div");
      sep.style.cssText = "font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:var(--space-3) 0 var(--space-1)";
      sep.textContent = "Venta";
      list.appendChild(sep);
      ventaIds.forEach(id => {
        const col = ventaCols[id];
        if (col.subtype === "deck") return;
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary);transition:background var(--transition-fast)";
        label.innerHTML = `<input type="checkbox" value="${id}" data-venta="true" style="accent-color:var(--accent);width:14px;height:14px"> <span style="flex:1">${col.name}</span> <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted)">${col.cards.length}</span> <span style="font-size:10px;color:var(--accent);font-family:var(--font-mono);background:rgba(0,240,255,0.08);padding:1px 5px;border-radius:var(--radius-sm)">Venta</span>`;
        list.appendChild(label);
      });
    }
  } else {
    list.innerHTML += "<p style='color:var(--text-tertiary);padding:20px 10px;font-size:var(--text-sm);text-align:center'>Crea una colección primero</p>";
    document.getElementById("addModalConfirm").style.display = "none";
  }
  overlay.style.display = "flex";
}

function confirmarAdd() {
  const overlay = document.getElementById("addModalOverlay");
  const checks = overlay.querySelectorAll("#addModalList input:checked");
  if (!checks.length) { alert("Selecciona al menos una colección"); return; }
  checks.forEach(cb => {
    const colId = cb.value;
    const isVenta = cb.hasAttribute("data-venta");
    const target = isVenta ? ventaCols : collections;
    const col = target[colId];
    if (!col) return;
    if (col.subtype === "deck") {
      Object.values(pendingCards).forEach(pc => {
        const key = getCardKey(pc);
        const cardType = pc.card_type || "";
        if (cardType === "LEADER") {
          if (col.leader && !confirm("Ya hay un líder. ¿Reemplazarlo?")) return;
          col.leader = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, customPrice: 0 };
        } else if (cardType === "DON!!" || cardType === "DON") {
          const donCount = col.dons?.length || 0;
          if (donCount + pc.count > 10) { alert("Máximo 10 DON!! en el deck"); return; }
          if (!col.dons) col.dons = [];
          for (let i = 0; i < pc.count; i++) {
            col.dons.push({ _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, customPrice: 0 });
          }
        } else {
          if (col.leader && pc.card_color && col.leader.card_color) {
            const lc = col.leader.card_color?.split("/").map(s => s.trim()) || [];
            if (!lc.some(c => pc.card_color?.includes(c))) {
              if (!confirm("Esta carta no coincide con el color del líder. ¿Agregar de todas formas?")) return;
            }
          }
          const mainTotal = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
          const newTotal = mainTotal + pc.count;
          if (newTotal > 50) { alert("Máximo 50 cartas en el deck. Solo caben " + (50 - mainTotal) + " más."); return; }
          const existing = col.cards.find(c => c._key === key);
          if (existing) {
            if (isUnlimited(pc)) {
              existing.quantity = (existing.quantity || 1) + pc.count;
            } else {
              existing.quantity = Math.min((existing.quantity || 1) + pc.count, 4);
            }
          } else {
            const defQty = isUnlimited(pc) ? pc.count : Math.min(pc.count, 4);
            col.cards.push({ _key: key, quantity: defQty, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset, customPrice: 0 });
          }
        }
      });
      if (isVenta) guardarVenta(); else guardarCollections();
      overlay.style.display = "none";
      actualizarBotonesBinder();
      limpiarPendientes();
      return;
    }
    const isGrouped = isVenta && (col.display_mode === "playset" || col.display_mode === "editable");
    Object.values(pendingCards).forEach(pc => {
      const key = getCardKey(pc);
      if (isGrouped) {
        const existing = col.cards.find(c => c._key === key);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + pc.count;
          if (col.display_mode === "playset" && existing.quantity > 4) existing.quantity = 4;
          if (existing.quantity > 999) existing.quantity = 999;
        } else {
          col.cards.push({ _key: key, quantity: col.display_mode === "playset" ? Math.min(pc.count, 4) : Math.min(pc.count, 50), customPrice: 0, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset });
        }
      } else {
        for (let i = 0; i < pc.count; i++) {
          const entry = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset };
          if (isVenta) entry.customPrice = 0;
          col.cards.push(entry);
        }
      }
    });
  });
  guardarCollections();
  guardarVenta();
  overlay.style.display = "none";
  actualizarBotonesBinder();
  limpiarPendientes();
}

// ─── Catalog Rendering ────────────────────────────────────────────────────

function renderCards() {
  let resultado = [...cartas];
  const texto = searchInput.value.toLowerCase().trim();

  if (texto) {
    resultado = resultado.filter(carta =>
      (carta.card_name || "").toLowerCase().includes(texto) ||
      (carta.card_set_id || "").toLowerCase().includes(texto) ||
      (carta.variant || "").toLowerCase().includes(texto)
    );
  }

  searchClear.style.display = texto ? "flex" : "none";

  if (expansionFilter.value) {
    resultado = resultado.filter(carta => {
      switch (expansionFilter.value) {
        case "DON!!": return carta.category === "DON";
        case "PROMO": return carta.category === "PROMO" || carta.category === "OTHER";
        case "OTHER": return carta.category === "PROMO" || carta.category === "OTHER";
        case "OP14-EB04": return (carta.card_set_id?.startsWith("OP14-") || carta.card_set_id?.startsWith("EB04-")) && carta.category === "BOOSTER";
        case "OP15-EB04": return (carta.card_set_id?.startsWith("OP15-") || carta.card_set_id?.startsWith("EB04-")) && carta.category === "BOOSTER";
        default: return carta.set_id === expansionFilter.value && carta.category === setCategoryMap[expansionFilter.value];
      }
    });
  }

  if (colorFilter.value) resultado = resultado.filter(carta => (carta.card_color || "").includes(colorFilter.value));

  if (rarityFilter.value) {
    if (rarityFilter.value === "L") {
      resultado = resultado.filter(carta => carta.card_type === "LEADER");
    } else {
      resultado = resultado.filter(carta => obtenerRareza(carta) === rarityFilter.value);
    }
  }

  switch (sortFilter.value) {
    case "name": resultado.sort((a, b) => a.card_name.localeCompare(b.card_name)); break;
    case "name_desc": resultado.sort((a, b) => b.card_name.localeCompare(a.card_name)); break;
    case "price_desc": resultado.sort((a, b) => getPrecio(b) - getPrecio(a)); break;
    case "price_asc": resultado.sort((a, b) => getPrecio(a) - getPrecio(b)); break;
    default:
      resultado.sort((a, b) => {
        const ordenA = getOrden(a.set_id);
        const ordenB = getOrden(b.set_id);
        if (ordenA !== ordenB) return ordenA - ordenB;
        const donA = a.category === "DON" ? 1 : 0;
        const donB = b.category === "DON" ? 1 : 0;
        if (donA !== donB) return donA - donB;
        if (a.category === "DON") return sortDonCards(a, b);
        const cmp = (a.card_set_id || "").localeCompare((b.card_set_id || ""), undefined, { numeric: true });
        if (cmp !== 0) return cmp;
        if ((a.set_id === "PRB-01" || a.set_id === "PRB-02") && (b.set_id === "PRB-01" || b.set_id === "PRB-02")) {
          const aSuffix = (a.card_image || "").match(/_([pr])(\d+)\.\w+$/);
          const bSuffix = (b.card_image || "").match(/_([pr])(\d+)\.\w+$/);
          const aType = aSuffix ? aSuffix[1] : "z";
          const bType = bSuffix ? bSuffix[1] : "z";
          if (aType !== bType) return aType === "r" ? -1 : bType === "r" ? 1 : aType.localeCompare(bType);
          const aNum = aSuffix ? parseInt(aSuffix[2]) : 999;
          const bNum = bSuffix ? parseInt(bSuffix[2]) : 999;
          return aNum - bNum;
        }
        return 0;
      });
  }

  cartasFiltradas = resultado;
  const totalPages = Math.max(1, Math.ceil(resultado.length / cardsPerPage));
  resultsCounter.textContent = resultado.length.toLocaleString() + " cartas encontradas";
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  const cartasPagina = resultado.slice(start, end);

  cardsContainer.innerHTML = "";

  cartasPagina.forEach(carta => {
    const cardKey = getCardKey(carta);
    const tcgId = getTcgId(carta) || "";
    const cardId = carta.card_set_id || "";
    const nombre = formatearNombre(carta);
    const setId = carta.category === "DON" ? (carta.variant || "") : (carta.card_set_id || "");
    const precio = getPrecio(carta);
    const precioLabel = priceType === "market" ? "Market" : "Median";
    const rareza = obtenerRareza(carta);
    const imgSrc = carta.card_image || "TUTCG.webp";

    // Rarity + type badge
    let rarityBadge = "";
    if (carta.category === "DON") {
      rarityBadge = rareza && rareza !== "Normal" ? rareza : "DON!!";
    } else {
      rarityBadge = rareza || "";
      if (carta.print_type && carta.print_type !== rareza) {
        rarityBadge += rarityBadge ? " - " + carta.print_type : carta.print_type;
      }
    }

    // Promo badge
    let promoBadge = "";
    if (carta.category === "PROMO" || carta.category === "OTHER") {
      promoBadge = "PROMO";
    }

    // Build card-meta badges
    let metaBadges = "";
    if (rarityBadge) metaBadges += `<span class="card-print-type">${rarityBadge}</span>`;
    if (promoBadge) metaBadges += `<span class="card-print-type card-print-type-promo">${promoBadge}</span>`;

    const div = document.createElement("div");
    div.className = "card fade-in";
    div.setAttribute("data-cardid", cardId);
    div.setAttribute("data-tcgid", tcgId);
    div.setAttribute("data-cardkey", cardKey);
    div.style.animationDelay = (Math.random() * 0.1) + "s";
    div.innerHTML = `
      <div class="pending-card-badge" id="badge-${cardKey.replace(/[^a-zA-Z0-9]/g, '_')}">0</div>
      <div class="card-img-wrap">
        <img src="${imgSrc}" onerror="this.src='TUTCG.webp'" onclick="abrirModal(this)" loading="lazy">
      </div>
      <div class="card-body">
        <h3>${nombre}</h3>
        <span class="card-set-id">${setId}</span>
        ${metaBadges ? `<div class="card-meta">${metaBadges}</div>` : ""}
        <div class="card-price">${precioLabel}: $${precio.toFixed(2)}</div>
      </div>
      <div class="card-actions">
        <button class="card-action-btn minus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">&minus;</button>
        <button class="card-action-btn plus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">+</button>
      </div>`;
    cardsContainer.appendChild(div);
  });

  pageInfoBottom.textContent = "Página " + currentPage + " de " + totalPages;

  const idsPagina = cartasPagina.map(c => getTcgId(c)).filter(Boolean);
  if (idsPagina.length) cargarPreciosLote(idsPagina).then(actualizarPreciosPagina);

  cardsContainer.querySelectorAll(".plus-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-cardid");
      const name = btn.getAttribute("data-name");
      const img = btn.getAttribute("data-image");
      const carta = cartas.find(c => c.card_set_id === cardId && c.card_name === name && (c.card_image || "") === img);
      if (!carta) return;
      const key = getCardKey(carta);
      const cardEl = btn.closest(".card");
      if (selectionMode) {
        if (selectedCards[key]) selectedCards[key].count++;
        else {
          selectedCards[key] = { card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image, card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza, set_id: carta.set_id, producto: carta.producto, category: carta.category, market_price: carta.market_price, inventory_price: carta.inventory_price, print_type: carta.print_type, cardset: carta.cardset, count: 1 };
          if (cardEl) cardEl.classList.add("selected");
        }
        actualizarBadge();
        actualizarBadgesEnPagina();
        return;
      }
      if (pendingCards[key]) { pendingCards[key].count++; }
      else {
        pendingCards[key] = { card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image, card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza, set_id: carta.set_id, producto: carta.producto, category: carta.category, market_price: carta.market_price, inventory_price: carta.inventory_price, print_type: carta.print_type, cardset: carta.cardset, count: 1 };
      }
      actualizarBadge();
      actualizarBadgesEnPagina();
    });
  });
  cardsContainer.querySelectorAll(".minus-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-cardid");
      const name = btn.getAttribute("data-name");
      const img = btn.getAttribute("data-image");
      const carta = cartas.find(c => c.card_set_id === cardId && c.card_name === name && (c.card_image || "") === img);
      if (!carta) return;
      const key = getCardKey(carta);
      const cardEl = btn.closest(".card");
      if (selectionMode) {
        if (!selectedCards[key]) return;
        selectedCards[key].count--;
        if (selectedCards[key].count <= 0) {
          delete selectedCards[key];
          if (cardEl) cardEl.classList.remove("selected");
        }
        actualizarBadge();
        actualizarBadgesEnPagina();
        return;
      }
      if (!pendingCards[key]) return;
      pendingCards[key].count--;
      if (pendingCards[key].count <= 0) delete pendingCards[key];
      actualizarBadge();
      actualizarBadgesEnPagina();
    });
  });
  actualizarBadgesEnPagina();
  reapplySelectionClasses();
}

function actualizarBadgesEnPagina() {
  cardsContainer.querySelectorAll(".card").forEach(el => {
    const key = el.getAttribute("data-cardkey");
    const badge = el.querySelector(".pending-card-badge");
    const minus = el.querySelector(".minus-btn");
    if (!badge) return;
    const source = selectionMode ? selectedCards : pendingCards;
    if (key && source[key]) {
      badge.textContent = source[key].count;
      badge.style.display = "flex";
      if (minus) minus.style.display = "flex";
    } else {
      badge.textContent = "0";
      badge.style.display = "none";
      if (minus) minus.style.display = "none";
    }
  });
}

function renderModalInfo(carta) {
  const tcgId = getTcgId(carta);
  const precioEntrada = preciosCache[tcgId];
  const marketP = precioEntrada && precioEntrada[0] ? precioEntrada[0].marketPrice ?? 0 : Number(carta.market_price || 0);
  const medianP = precioEntrada && precioEntrada[0] ? precioEntrada[0].midPrice ?? 0 : Number(carta.inventory_price || 0);
  const efecto = (carta.effect || "").replace(/\n/g, "<br>");
  const rareza = obtenerRareza(carta);
  const color = carta.card_color ? (coloresES[carta.card_color] || carta.card_color) : "";

  document.getElementById("modalMainImg").src = carta.card_image || 'TUTCG.webp';
  document.getElementById("modalInfoCol").innerHTML = `
    <h2 class="modal-name">${formatearNombre(carta)}</h2>
    <span class="modal-set-id">${carta.card_set_id || ""}</span>
    <div class="modal-info-grid">
      ${rareza ? `<div class="modal-info-item"><span class="modal-info-label">Rareza</span><span>${rareza}</span></div>` : ""}
      ${carta.print_type ? `<div class="modal-info-item"><span class="modal-info-label">Tipo</span><span>${carta.print_type}</span></div>` : ""}
      ${color ? `<div class="modal-info-item"><span class="modal-info-label">Color</span><span>${color}</span></div>` : ""}
      ${carta.cost ? `<div class="modal-info-item"><span class="modal-info-label">${carta.card_type === "LEADER" ? "Life" : "Cost"}</span><span>${carta.cost}</span></div>` : ""}
      ${carta.power ? `<div class="modal-info-item"><span class="modal-info-label">Power</span><span>${carta.power}</span></div>` : ""}
      ${carta.counter && carta.counter !== "-" ? `<div class="modal-info-item"><span class="modal-info-label">Counter</span><span>${carta.counter}</span></div>` : ""}
      ${carta.attribute ? `<div class="modal-info-item"><span class="modal-info-label">Attribute</span><span>${carta.attribute}</span></div>` : ""}
      ${carta.set_id ? `<div class="modal-info-item"><span class="modal-info-label">Set</span><span>${nombresExpansiones[carta.set_id] || carta.set_id}${rareza === "Reprint" ? " (Reprint)" : ""}</span></div>` : ""}
      ${carta.cardset && (carta.category === 'PROMO' || carta.category === 'OTHER') ? `<div class="modal-info-item"><span class="modal-info-label">Card Set(s)</span><span>${carta.cardset}</span></div>` : ""}
    </div>
    ${efecto ? `<div class="modal-effect"><span class="modal-info-label">Effect</span><p>${efecto}</p></div>` : ""}
    <div class="modal-prices">
      <span class="modal-price">Market: $${marketP.toFixed(2)}</span>
      <span class="modal-price median">Median: $${medianP.toFixed(2)}</span>
    </div>
  `;
}

function openCardInModal(carta, navList, startIdx) {
  if (!carta) return;

  const isLeader = carta.card_type === "LEADER";
  const leaderVariants = isLeader
    ? cartas.filter(c => c.card_set_id === carta.card_set_id && c.card_type === "LEADER")
    : [];
  const useVariantNav = isLeader && leaderVariants.length > 1;

  const list = navList || (useVariantNav ? leaderVariants : cartasFiltradas);
  if (navList && startIdx != null) {
    currentCardIndex = startIdx;
  } else {
    currentCardIndex = list.findIndex(c => getCardKey(c) === getCardKey(carta));
  }
  if (currentCardIndex === -1) currentCardIndex = 0;

  const variants = cartas.filter(c =>
    c.card_set_id === carta.card_set_id &&
    getCardKey(c) !== getCardKey(carta)
  );

  let infoHTML = `
    <div class="modal-nav-wrap">
      <button class="modal-nav-btn prev-btn" data-dir="prev">&#8249;</button>
      <div class="modal-nav-content">
        <div class="modal-layout">
          <div class="modal-image-col">
            <img src="${carta.card_image || 'TUTCG.webp'}" class="modal-main-img" id="modalMainImg">
          </div>
          <div class="modal-info-col" id="modalInfoCol">
          </div>
        </div>`;

  if (variants.length) {
    infoHTML += `<div class="modal-variants"><span class="modal-variants-label">Variants</span><div class="modal-variants-list">`;
    infoHTML += `<div class="modal-variant-item selected" data-cardkey="${getCardKey(carta)}">
      <img src="${carta.card_image || 'TUTCG.webp'}" title="Current">
    </div>`;
    variants.forEach(v => {
      infoHTML += `<div class="modal-variant-item" data-cardkey="${getCardKey(v)}">
        <img src="${v.card_image || 'TUTCG.webp'}" title="${formatearNombre(v)}">
      </div>`;
    });
    infoHTML += `</div></div>`;
  }

  infoHTML += `</div>
    <button class="modal-nav-btn next-btn" data-dir="next">&#8250;</button>
  </div>`;

  const body = document.getElementById("modalBody");
  body.innerHTML = infoHTML;
  modal.style.display = "flex";

  renderModalInfo(carta);

  body.querySelectorAll(".modal-variant-item").forEach(item => {
    item.addEventListener("click", () => {
      const key = item.getAttribute("data-cardkey");
      const v = key ? cartasMap[key] : null;
      if (v) {
        renderModalInfo(v);
        body.querySelectorAll(".modal-variant-item").forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
      }
    });
  });

  body.querySelectorAll(".modal-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      const len = list.length;
      const newIdx = ((dir === 'prev' ? currentCardIndex - 1 : currentCardIndex + 1) + len) % len;
      const nextCarta = list[newIdx];
      if (!nextCarta) return;
      openCardInModal(nextCarta, navList, navList ? newIdx : undefined);
    });
  });
}

function abrirModal(imgEl) {
  if (selectionMode) { toggleCardSelection(imgEl); return; }
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  const cardKey = cardEl?.getAttribute("data-cardkey");
  const carta = cardKey ? cartasMap[cardKey] : null;
  if (carta) openCardInModal(carta);
}

// ─── TCG Selector ─────────────────────────────────────────────────────────

function renderTcgSelector() {
  const grid = document.getElementById("tcgGrid");
  grid.innerHTML = tcgList.map(t => `
    <div class="tcg-card" data-tcg="${t.id}">
      <div class="tcg-card-icon" style="background:${t.color}">${t.short}</div>
      <h3>${t.name}</h3>
      <p>Explora, colecciona y gestiona tus cartas</p>
    </div>`).join("");
}

async function selectTcg(tcgId) {
  currentTcg = tcgId;
  const tcg = tcgList.find(t => t.id === tcgId);
  if (!tcg) return;
  document.getElementById("welcomeTcgName").textContent = tcg.name;
  await initCollections();
  initVenta();
  if (isAuthenticated()) await reloadVentaFromDb();
  mostrarVista("catalog");
}

// ─── View System ──────────────────────────────────────────────────────────

function mostrarVista(vista) {
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
  document.getElementById("collectionManager").style.display = "none";
  document.getElementById("ventaManager").style.display = "none";
  document.getElementById("ventaView").style.display = "none";
  document.getElementById("exploreView").style.display = "none";
  document.getElementById("exploreDetailView").style.display = "none";
  if (profileView) profileView.style.display = "none";

  const priceToggle = document.getElementById("priceToggle");
  const topBarSearch = document.getElementById("topBarSearch");
  const tcg = tcgList.find(t => t.id === currentTcg);

  document.querySelectorAll(".sidebar-nav-item").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));

  const topBarTcgName = document.getElementById("topBarTcgName");
  const sidebarTcgName = document.getElementById("sidebarTcgName");
  if (topBarTcgName) topBarTcgName.textContent = tcg ? tcg.name : "";
  if (sidebarTcgName) sidebarTcgName.textContent = tcg ? tcg.name : "Selecciona un TCG";

  if (vista === "catalog") {
    if (!currentTcg) {
      if (topBarSearch) topBarSearch.style.display = "none";
      document.getElementById("tcgSelector").classList.add("active");
      document.getElementById("tcgSelector").style.display = "";
      renderTcgSelector();
      document.getElementById("tcgSelectorHero").style.display = "";
      document.getElementById("tcgGrid").style.display = "";
      document.getElementById("tcgHomePlaceholder").style.display = "none";
      if (priceToggle) priceToggle.style.display = "none";
      document.getElementById("sidebarCatalog")?.classList.add("active");
      document.getElementById("bottomCatalog")?.classList.add("active");
      return;
    }
    if (topBarSearch) topBarSearch.style.display = "";
    limpiarPendientes();
    document.getElementById("catalogView").classList.add("active");
    document.getElementById("catalogView").style.display = "";
    resultsCounter.style.display = "";
    cardsContainer.style.display = "";
    document.getElementById("catalogPagination").style.display = "";
    if (priceToggle) priceToggle.style.display = "flex";
    document.getElementById("sidebarCatalog")?.classList.add("active");
    document.getElementById("bottomCatalog")?.classList.add("active");
    cargarFiltros();
    if (currentTcg === "one-piece") {
      renderCards();
    } else {
      cardsContainer.innerHTML = `<div class="no-data-msg"><h2>${tcg ? tcg.name : "Este TCG"} aún no está disponible</h2><p>Estamos trabajando para agregar las cartas. ¡Vuelve pronto!</p></div>`;
      resultsCounter.style.display = "none";
      document.getElementById("catalogPagination").style.display = "none";
      if (priceToggle) priceToggle.style.display = "none";
    }
  } else if (vista === "binder") {
    document.getElementById("binderView").classList.add("active");
    document.getElementById("binderView").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarBinder")?.classList.add("active");
    document.getElementById("bottomCollections")?.classList.add("active");
    renderBinder();
  } else if (vista === "collections") {
    document.getElementById("collectionManager").classList.add("active");
    document.getElementById("collectionManager").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarBinder")?.classList.add("active");
    document.getElementById("bottomCollections")?.classList.add("active");
    renderCollectionList();
  } else if (vista === "ventaCols") {
    document.getElementById("ventaManager").classList.add("active");
    document.getElementById("ventaManager").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaList();
  } else if (vista === "venta") {
    document.getElementById("ventaView").classList.add("active");
    document.getElementById("ventaView").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarVenta")?.classList.add("active");
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaView();
  } else if (vista === "tcgHome") {
    document.getElementById("welcomeView").classList.add("active");
    document.getElementById("welcomeView").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("bottomTcg")?.classList.add("active");
  } else if (vista === "explore") {
    document.getElementById("exploreView").classList.add("active");
    document.getElementById("exploreView").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarExplore")?.classList.add("active");
    document.getElementById("bottomExplore")?.classList.add("active");
    currentExploreBinder = null;
    renderExploreView();
  } else if (vista === "exploreDetail") {
    document.getElementById("exploreDetailView").classList.add("active");
    document.getElementById("exploreDetailView").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarExplore")?.classList.add("active");
    document.getElementById("bottomExplore")?.classList.add("active");
    renderExploreDetail();
  } else if (vista === "profile") {
    if (profileView) { profileView.classList.add("active"); profileView.style.display = ""; }
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarProfile")?.classList.add("active");
  } else if (vista === "home") {
    if (topBarSearch) topBarSearch.style.display = "none";
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    document.getElementById("tcgSelectorHero").style.display = "none";
    document.getElementById("tcgGrid").style.display = "none";
    document.getElementById("tcgHomePlaceholder").style.display = "";
    if (priceToggle) priceToggle.style.display = "none";
    document.getElementById("sidebarHome")?.classList.add("active");
    document.getElementById("bottomHome")?.classList.add("active");
  } else {
    if (topBarSearch) topBarSearch.style.display = "none";
    document.getElementById("tcgSelector").classList.add("active");
    document.getElementById("tcgSelector").style.display = "";
    renderTcgSelector();
    document.getElementById("tcgSelectorHero").style.display = "";
    document.getElementById("tcgGrid").style.display = "";
    document.getElementById("tcgHomePlaceholder").style.display = "none";
    if (priceToggle) priceToggle.style.display = "none";
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
searchInput.addEventListener("input", () => { currentPage = 1; renderCards(); });

// Filters
expansionFilter.addEventListener("change", () => { actualizarFiltrosPorExpansion(); currentPage = 1; renderCards(); });
colorFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
rarityFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });
sortFilter.addEventListener("change", () => { currentPage = 1; renderCards(); });

// Price toggle
document.getElementById("priceToggle").addEventListener("click", togglePrice);

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
document.getElementById("sidebarLogo")?.addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });
document.getElementById("welcomeBackBtn").addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });

document.querySelectorAll(".sidebar-nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const view = item.getAttribute("data-view");
    if (view === "home") { currentTcg = null; mostrarVista("home"); }
    else if (view === "catalog") { currentTcg = null; mostrarVista("catalog"); }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; mostrarVista("ventaCols"); }
    else if (view === "explore") { mostrarVista("explore"); }
    else if (view === "profile") { openProfile(); }
  });
});

// Bottom nav
document.querySelectorAll(".bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    if (view === "home") { currentTcg = null; mostrarVista("home"); }
    else if (view === "catalog") { currentTcg = null; mostrarVista("catalog"); }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; mostrarVista("ventaCols"); }
    else if (view === "explore") { mostrarVista("explore"); }
    else if (view === "tcgHome") { currentTcg = null; mostrarVista("home"); }
  });
});

// Binder events
document.getElementById("binderClearPageBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
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
    const globalInput = document.getElementById("globalSearchInput");
    const catalogInput = document.getElementById("searchInput");
    (globalInput?.offsetParent ? globalInput : catalogInput)?.focus();
  }
});
