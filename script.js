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
const modalImage = document.getElementById("modalImage");
const closeModal = document.getElementById("closeModal");
const resultsCounter = document.getElementById("resultsCounter");

let cartasFiltradas = [];
let currentCardIndex = -1;

const cardsPerPage = 42;
let currentPage = 1;
let cartas = [];
let setCategoryMap = {};
let priceType = "market";
let tcgplayerMap = {};
let preciosCache = {};
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
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
      <option value="C">C</option><option value="UC">UC</option>
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
      <option value="C">C</option><option value="UC">UC</option>
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
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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

// ─── Collections / LocalStorage ──────────────────────────────────────────

function initCollections() {
  const key = collectionsKey();
  const saved = localStorage.getItem(key);
  if (saved) {
    collections = JSON.parse(saved);
  } else if (getTcgPrefix() === "op") {
    const oldBinder = JSON.parse(localStorage.getItem("tutcg_op_binder") || "[]");
    if (oldBinder.length) {
      const id = generarId();
      collections = { [id]: { id, name: "Mi Binder", cards: oldBinder } };
      localStorage.removeItem("tutcg_op_binder");
    } else { collections = {}; }
  } else { collections = {}; }
  localStorage.setItem(key, JSON.stringify(collections));
}

function initVenta() {
  const key = ventaKey();
  const saved = localStorage.getItem(key);
  ventaCols = saved ? JSON.parse(saved) : {};
  localStorage.setItem(key, JSON.stringify(ventaCols));
}

function guardarCollections() { localStorage.setItem(collectionsKey(), JSON.stringify(collections)); }
function guardarVenta() { localStorage.setItem(ventaKey(), JSON.stringify(ventaCols)); }

// ─── Collection List ──────────────────────────────────────────────────────

function renderCollectionList() {
  const container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(collections);
  if (!ids.length) {
    container.innerHTML = `<div class="collection-empty"><p>No tienes colecciones</p><button class="nav-btn primary" id="createFirstColBtn">Crear primera colección</button></div>`;
    const btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion);
    return;
  }
  ids.forEach(id => {
    const col = collections[id];
    const div = document.createElement("div");
    div.className = "collection-card";
    div.innerHTML = `
      <div class="collection-card-info">
        <h3>${col.name}</h3>
        <span class="collection-count">${col.cards.length} cartas</span>
      </div>
      <div class="collection-card-actions">
        <button class="nav-btn nav-btn-sm" data-action="open" data-id="${id}">Abrir</button>
        <button class="nav-btn nav-btn-sm" data-action="rename" data-id="${id}">Renombrar</button>
        <button class="nav-btn nav-btn-sm danger" data-action="delete" data-id="${id}">Eliminar</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const nuevo = prompt("Nuevo nombre:", collections[id].name);
      if (nuevo && nuevo.trim()) { collections[id].name = nuevo.trim(); guardarCollections(); renderCollectionList(); }
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
  const nombre = prompt("Nombre de la nueva colección:");
  if (nombre && nombre.trim()) {
    const id = generarId();
    collections[id] = { id, name: nombre.trim(), cards: [] };
    guardarCollections();
    renderCollectionList();
  }
}

// ─── Binder ──────────────────────────────────────────────────────────────

function renderBinder() {
  const grid = document.getElementById("binderGrid");
  const title = document.getElementById("binderTitle");
  if (!grid || !currentCollectionId) return;
  const col = collections[currentCollectionId];
  if (!col) { mostrarVista("collections"); return; }
  title.textContent = col.name;
  grid.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
  const start = (binderPage - 1) * binderPerPage;
  const pageCards = col.cards.slice(start, start + binderPerPage);
  for (let i = 0; i < binderPerPage; i++) {
    const slot = document.createElement("div");
    slot.className = "binder-slot";
    const globalIdx = start + i;
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      const fullBinderCard = c._key ? cartas.find(card => getCardKey(card) === c._key) : null;
      const binderRareza = fullBinderCard && (fullBinderCard.category === "DON" || fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") ? (() => { const r = obtenerRareza(fullBinderCard); if (fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") { return (r === "Reprint" || r === "Jolly Roger" || r === "Full Art" || r === "AA" || r === "Textured Foil" || r === "Manga" || r === "SP") ? r : ""; } return r; })() : "";
      const shouldShowBadge = binderRareza && binderRareza !== "Normal";
      slot.innerHTML = `<div class="binder-img-wrap" style="position:relative"><img src="${c.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'">${shouldShowBadge ? `<span class="card-print-type" style="position:absolute;top:4px;left:4px;z-index:2;pointer-events:none">${binderRareza}</span>` : ""}</div><button class="binder-remove" data-global="${globalIdx}">&times;</button>`;
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key);
      slot.setAttribute("data-cardkey", c._key);
    } else {
      slot.innerHTML = `<span class="binder-empty">+</span>`;
      slot.removeAttribute("draggable");
    }
    grid.appendChild(slot);
  }
  grid.querySelectorAll(".binder-slot img").forEach(img => {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".binder-slot")?.getAttribute("data-cardkey");
      const carta = key ? cartas.find(c => getCardKey(c) === key) : null;
      if (carta) openCardInModal(carta);
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
  const slots = document.querySelectorAll(".binder-slot");
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
    container.innerHTML = `<div class="collection-empty"><p>No tienes colecciones de venta</p><button class="nav-btn primary" id="createFirstVentaBtn">Crear primera colección de venta</button></div>`;
    const btn = document.getElementById("createFirstVentaBtn");
    if (btn) btn.addEventListener("click", pedirCrearVenta);
    return;
  }
  ids.forEach(id => {
    const col = ventaCols[id];
    const div = document.createElement("div");
    div.className = "collection-card";
    div.innerHTML = `
      <div class="collection-card-info">
        <h3>${col.name}</h3>
        <span class="collection-count">${col.cards.length} cartas</span>
      </div>
      <div class="collection-card-actions">
        <button class="nav-btn nav-btn-sm" data-action="open" data-id="${id}">Abrir</button>
        <button class="nav-btn nav-btn-sm" data-action="rename" data-id="${id}">Renombrar</button>
        <button class="nav-btn nav-btn-sm danger" data-action="delete" data-id="${id}">Eliminar</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => openVenta(b.getAttribute("data-id")));
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const nuevo = prompt("Nuevo nombre:", ventaCols[id].name);
      if (nuevo && nuevo.trim()) { ventaCols[id].name = nuevo.trim(); guardarVenta(); renderVentaList(); }
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      if (confirm('Eliminar la colección de venta "' + ventaCols[id].name + '"?')) { delete ventaCols[id]; guardarVenta(); renderVentaList(); }
    });
  });
}

function pedirCrearVenta() {
  const nombre = prompt("Nombre de la nueva colección de venta:");
  if (nombre && nombre.trim()) {
    const id = generarId();
    ventaCols[id] = { id, name: nombre.trim(), cards: [] };
    guardarVenta();
    renderVentaList();
  }
}

function openVenta(id) { currentVentaId = id; ventaPage = 1; mostrarVista("venta"); }

function renderVentaView() {
  const grid = document.getElementById("ventaGrid");
  const title = document.getElementById("ventaTitle");
  if (!grid || !currentVentaId) return;
  const col = ventaCols[currentVentaId];
  if (!col) { mostrarVista("ventaCols"); return; }
  title.textContent = col.name;
  grid.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  const start = (ventaPage - 1) * ventaPerPage;
  const pageCards = col.cards.slice(start, start + ventaPerPage);
  for (let i = 0; i < ventaPerPage; i++) {
    const slot = document.createElement("div");
    slot.className = "card";
    const globalIdx = start + i;
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      const tcgId = getTcgId(c);
      const pd = tcgId && preciosCache[tcgId];
      const marketP = (pd && pd[0] && pd[0].marketPrice != null) ? pd[0].marketPrice : Number(c.market_price || 0);
      const medianP = (pd && pd[0] && pd[0].midPrice != null) ? pd[0].midPrice : Number(c.inventory_price || 0);
      const cp = c.customPrice != null ? c.customPrice : 0;
      slot.className = "card venta-slot";
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      const fullVentaCard = c._key ? cartas.find(card => getCardKey(card) === c._key) : null;
      const ventaRareza = fullVentaCard && (fullVentaCard.category === "DON" || fullVentaCard.set_id === "PRB-01" || fullVentaCard.set_id === "PRB-02") ? (() => { const r = obtenerRareza(fullVentaCard); if (fullVentaCard.set_id === "PRB-01" || fullVentaCard.set_id === "PRB-02") { return (r === "Reprint" || r === "Jolly Roger" || r === "Full Art" || r === "AA" || r === "Textured Foil" || r === "Manga" || r === "SP") ? r : ""; } return r; })() : "";
      const ventaPrintType = fullVentaCard?.print_type || c.print_type || "";
      slot.innerHTML = `
        <div class="card-img-wrap">
          <img src="${c.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'">
        </div>
        <div class="card-body">
          <h3>${formatearNombre(c)}</h3>
          ${ventaPrintType ? `<span class="card-print-type">${ventaPrintType}</span>` : (ventaRareza && ventaRareza !== "Normal" ? `<span class="card-print-type">${ventaRareza}</span>` : "")}
          <span class="card-set-id">${(c.category || c.producto) === "DON" ? (c.variant || "") : (c.card_set_id || "")}</span>
          <div class="card-price">Market: $${marketP.toFixed(2)}</div>
          <div class="card-price" style="font-size:var(--text-sm);color:var(--text-tertiary);font-weight:var(--weight-medium)">Median: $${medianP.toFixed(2)}</div>
          <div class="venta-price-row">
            <span class="venta-price-label">Tu precio:</span>
            <span class="venta-price-prefix">$</span>
            <input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-global="${globalIdx}">
          </div>
        </div>
        <button class="binder-remove" data-global="${globalIdx}">&times;</button>`;
    } else {
      slot.className = "card venta-slot";
    }
    grid.appendChild(slot);
  }
  document.querySelectorAll("#ventaGrid .binder-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const col = ventaCols[currentVentaId];
      if (!col) return;
      col.cards.splice(parseInt(btn.getAttribute("data-global")), 1);
      guardarVenta();
      renderVentaView();
    });
  });
  document.querySelectorAll("#ventaGrid .venta-price-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const col = ventaCols[currentVentaId];
      if (!col) return;
      col.cards[parseInt(inp.getAttribute("data-global"))].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value);
      guardarVenta();
    });
  });
  grid.querySelectorAll(".venta-slot .card-img-wrap img").forEach(img => {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".venta-slot")?.getAttribute("data-cardkey");
      const carta = key ? cartas.find(c => getCardKey(c) === key) : null;
      if (carta) openCardInModal(carta);
    });
  });
  document.getElementById("ventaPrevBtn").disabled = ventaPage <= 1;
  document.getElementById("ventaNextBtn").disabled = ventaPage >= totalPages;
  document.getElementById("ventaPageInfo").textContent = "Página " + ventaPage + " de " + totalPages;
  setupVentaDragDrop();
}

function setupVentaDragDrop() {
  const slots = document.querySelectorAll("#ventaGrid .venta-slot");
  slots.forEach(slot => {
    slot.addEventListener("dragstart", e => {
      const key = slot.getAttribute("data-key");
      if (!key) { e.preventDefault(); return; }
      e.dataTransfer.setData("text/plain", key);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging");
    });
    slot.addEventListener("dragend", e => slot.classList.remove("dragging"));
    slot.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slot.classList.add("drag-over");
    });
    slot.addEventListener("dragleave", e => slot.classList.remove("drag-over"));
    slot.addEventListener("drop", e => {
      e.preventDefault();
      slot.classList.remove("drag-over");
      const fromKey = e.dataTransfer.getData("text/plain");
      const toGlobal = parseInt(slot.getAttribute("data-global"));
      const col = ventaCols[currentVentaId];
      if (!col) return;
      const fromIdx = col.cards.findIndex(s => s && s._key === fromKey);
      if (fromIdx === -1 || toGlobal >= col.cards.length) return;
      const card = col.cards.splice(fromIdx, 1)[0];
      const adjustedTo = toGlobal > fromIdx ? toGlobal - 1 : toGlobal;
      col.cards.splice(adjustedTo, 0, card);
      guardarVenta();
      renderVentaView();
    });
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
  if (selectedCards[cardKey]) {
    delete selectedCards[cardKey];
    cardEl.classList.remove("selected");
  } else {
    const carta = cartas.find(c => getCardKey(c) === cardKey);
    if (!carta) return;
    selectedCards[cardKey] = {
      card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image,
      card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza,
      set_id: carta.set_id, producto: carta.producto, category: carta.category,
      market_price: carta.market_price, inventory_price: carta.inventory_price,
      print_type: carta.print_type, cardset: carta.cardset, count: 1
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

function mostrarAddModal() {
  const overlay = document.getElementById("addModalOverlay");
  const list = document.getElementById("addModalList");
  const qtyRow = document.getElementById("addModalQtyRow");
  qtyRow.style.display = "none";
  list.innerHTML = "";
  const pendKeys = Object.keys(pendingCards);
  if (!pendKeys.length) {
    list.innerHTML = "<p style='color:var(--text-tertiary);padding:10px;'>No hay cartas pendientes</p>";
    document.getElementById("addModalConfirm").style.display = "none";
    overlay.style.display = "flex";
    return;
  }
  const totalCount = pendKeys.reduce((s, k) => s + pendingCards[k].count, 0);
  const pendHeader = document.createElement("div");
  pendHeader.className = "add-modal-separator";
  pendHeader.textContent = "━ Pendientes ━";
  list.appendChild(pendHeader);
  const totalRow = document.createElement("div");
  totalRow.style.cssText = "text-align:center;color:var(--text-tertiary);font-size:var(--text-sm);padding:4px 0 8px";
  totalRow.textContent = pendKeys.length + " cartas únicas · " + totalCount + " copias en total";
  list.appendChild(totalRow);
  [...pendKeys].forEach(key => {
    const pc = pendingCards[key];
    if (!pc) return;
    const item = document.createElement("div");
    item.className = "add-modal-pend-item";
    item.innerHTML = `
      <button class="pend-btn pend-minus" data-key="${key}">&minus;</button>
      <span class="pend-qty">${pc.count}x</span>
      <button class="pend-btn pend-plus" data-key="${key}">+</button>
      ${formatearNombre(pc)}
      <span class="pend-id">${(pc.category || pc.producto) === "DON" ? (pc.variant || "") : (pc.card_set_id || "")}</span>`;
    list.appendChild(item);
  });
  list.querySelectorAll(".pend-minus").forEach(btn => {
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
  list.querySelectorAll(".pend-plus").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!pendingCards[key]) return;
      pendingCards[key].count++;
      actualizarBadge();
      mostrarAddModal();
    });
  });
  const colIds = Object.keys(collections);
  const ventaIds = Object.keys(ventaCols);
  if (colIds.length || ventaIds.length) {
    document.getElementById("addModalConfirm").style.display = "";
    if (colIds.length) {
      const sep = document.createElement("div");
      sep.className = "add-modal-separator";
      sep.textContent = "━ Binder ━";
      list.appendChild(sep);
      colIds.forEach(id => {
        const col = collections[id];
        const label = document.createElement("label");
        label.className = "add-modal-item";
        label.innerHTML = `<input type="checkbox" value="${id}"> ${col.name} (${col.cards.length})`;
        list.appendChild(label);
      });
    }
    if (ventaIds.length) {
      const sep = document.createElement("div");
      sep.className = "add-modal-separator";
      sep.textContent = "━ Venta ━";
      list.appendChild(sep);
      ventaIds.forEach(id => {
        const col = ventaCols[id];
        const label = document.createElement("label");
        label.className = "add-modal-item";
        label.innerHTML = `<input type="checkbox" value="${id}" data-venta="true"> (Venta) ${col.name} (${col.cards.length})`;
        list.appendChild(label);
      });
    }
  } else {
    list.innerHTML += "<p style='color:var(--text-tertiary);padding:10px;'>Crea una colección primero</p>";
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
    Object.values(pendingCards).forEach(pc => {
      const key = getCardKey(pc);
      for (let i = 0; i < pc.count; i++) {
        const entry = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset };
        if (isVenta) entry.customPrice = 0;
        target[colId].cards.push(entry);
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

  if (rarityFilter.value) resultado = resultado.filter(carta => obtenerRareza(carta) === rarityFilter.value);

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
    const expNombre = nombresExpansiones[carta.set_id] || "";
    const rareza = obtenerRareza(carta);
    const color = carta.card_color || "";
    const imgSrc = carta.card_image || "TUTCG.webp";

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
        ${carta.print_type ? `<span class="card-print-type">${carta.print_type}</span>` : ""}
        ${(carta.category === 'PROMO' || carta.category === 'OTHER') ? `<span class="card-print-type">PROMO</span>` : ""}
        ${carta.cardset && (carta.category === 'PROMO' || carta.category === 'OTHER') ? `<span class="card-cardset" title="${carta.cardset}">${carta.cardset}</span>` : ""}
        <div class="card-price">${precioLabel}: $${precio.toFixed(2)}</div>
      </div>
      <div class="card-meta">
        ${carta.category === "DON" ? (rareza && rareza !== "Normal" ? `<span class="card-print-type">${rareza}</span>` : "") : (carta.set_id === "PRB-01" || carta.set_id === "PRB-02") && (rareza === "Reprint" || rareza === "Jolly Roger" || rareza === "Full Art" || rareza === "AA" || rareza === "Textured Foil" || rareza === "Manga" || rareza === "SP") ? `<span class="card-print-type">${rareza}</span>` : rareza === "SP" ? `<span class="card-print-type">SP</span>` : (rareza ? `<span>${rareza}</span>` : "")}
        ${carta.category === "DON" ? "" : (expNombre ? `<span>· ${expNombre}</span>` : "")}
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

function openCardInModal(carta) {
  if (!carta) return;

  currentCardIndex = cartasFiltradas.findIndex(c => getCardKey(c) === getCardKey(carta));

  const variants = cartas.filter(c =>
    c.card_set_id === carta.card_set_id &&
    getCardKey(c) !== getCardKey(carta)
  );

  const prevDisabled = currentCardIndex <= 0;
  const nextDisabled = currentCardIndex >= cartasFiltradas.length - 1 || currentCardIndex === -1;

  let infoHTML = `
    <div class="modal-nav-wrap">
      <button class="modal-nav-btn prev-btn" ${prevDisabled ? 'disabled' : ''} data-dir="prev">&#8249;</button>
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
    <button class="modal-nav-btn next-btn" ${nextDisabled ? 'disabled' : ''} data-dir="next">&#8250;</button>
  </div>`;

  const body = document.getElementById("modalBody");
  body.innerHTML = infoHTML;
  modal.style.display = "flex";

  renderModalInfo(carta);

  body.querySelectorAll(".modal-variant-item").forEach(item => {
    item.addEventListener("click", () => {
      const key = item.getAttribute("data-cardkey");
      const v = key ? cartas.find(c => getCardKey(c) === key) : null;
      if (v) {
        renderModalInfo(v);
        body.querySelectorAll(".modal-variant-item").forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
      }
    });
  });

  body.querySelectorAll(".modal-nav-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      const newIdx = dir === 'prev' ? currentCardIndex - 1 : currentCardIndex + 1;
      if (newIdx < 0 || newIdx >= cartasFiltradas.length) return;
      openCardInModal(cartasFiltradas[newIdx]);
    });
  });
}

function abrirModal(imgEl) {
  if (selectionMode) { toggleCardSelection(imgEl); return; }
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  const cardKey = cardEl?.getAttribute("data-cardkey");
  const carta = cardKey ? cartas.find(c => getCardKey(c) === cardKey) : null;
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

function selectTcg(tcgId) {
  currentTcg = tcgId;
  const tcg = tcgList.find(t => t.id === tcgId);
  if (!tcg) return;
  document.getElementById("welcomeTcgName").textContent = tcg.name;
  initCollections();
  initVenta();
  mostrarVista("tcgHome");
}

// ─── View System ──────────────────────────────────────────────────────────

function mostrarVista(vista) {
  if ((vista === "catalog" || vista === "binder" || vista === "venta" || vista === "ventaCols" || vista === "binderCols") && !isAuthenticated()) {
    protectRoute(vista);
    return;
  }

  limpiarPendientes();

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

  const priceToggle = document.getElementById("priceToggle");
  const homeBtn = document.getElementById("homeBtn");
  const navBackTcgBtn = document.getElementById("navBackTcgBtn");
  const navBinderBtn = document.getElementById("navBinderBtn");
  const navCatalogBtn = document.getElementById("navCatalogBtn");
  const navVentaBtn = document.getElementById("navVentaBtn");
  const navTcgName = document.getElementById("navTcgName");
  const tcg = tcgList.find(t => t.id === currentTcg);

  // Update bottom nav active state
  document.querySelectorAll(".bottom-nav-btn").forEach(b => b.classList.remove("active"));

  navTcgName.textContent = tcg ? tcg.name : "";
  navTcgName.style.display = currentTcg ? "inline" : "none";

  if (vista === "catalog") {
    document.getElementById("catalogView").style.display = "";
    resultsCounter.style.display = "";
    cardsContainer.style.display = "";
    document.getElementById("catalogPagination").style.display = "";
    priceToggle.style.display = "flex";
    homeBtn.style.display = "inline-flex";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "inline-flex";
    navVentaBtn.style.display = "inline-flex";
    navCatalogBtn.style.display = "none";
    document.getElementById("bottomCatalog")?.classList.add("active");
    cargarFiltros();
    if (currentTcg === "one-piece") {
      renderCards();
    } else {
      cardsContainer.innerHTML = `<div class="no-data-msg"><h2>${tcg ? tcg.name : "Este TCG"} aún no está disponible</h2><p>Estamos trabajando para agregar las cartas. ¡Vuelve pronto!</p></div>`;
      resultsCounter.style.display = "none";
      document.getElementById("catalogPagination").style.display = "none";
      priceToggle.style.display = "none";
    }
  } else if (vista === "binder") {
    document.getElementById("binderView").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "inline-flex";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "none";
    navVentaBtn.style.display = "inline-flex";
    navCatalogBtn.style.display = "inline-flex";
    document.getElementById("bottomCollections")?.classList.add("active");
    renderBinder();
  } else if (vista === "collections") {
    document.getElementById("collectionManager").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "inline-flex";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "none";
    navVentaBtn.style.display = "inline-flex";
    navCatalogBtn.style.display = "inline-flex";
    document.getElementById("bottomCollections")?.classList.add("active");
    renderCollectionList();
  } else if (vista === "ventaCols") {
    document.getElementById("ventaManager").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "inline-flex";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "inline-flex";
    navVentaBtn.style.display = "none";
    navCatalogBtn.style.display = "inline-flex";
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaList();
  } else if (vista === "venta") {
    document.getElementById("ventaView").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "inline-flex";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "inline-flex";
    navVentaBtn.style.display = "none";
    navCatalogBtn.style.display = "inline-flex";
    document.getElementById("bottomVenta")?.classList.add("active");
    renderVentaView();
  } else if (vista === "tcgHome") {
    document.getElementById("welcomeView").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "none";
    navBackTcgBtn.style.display = "inline-flex";
    navBinderBtn.style.display = "none";
    navVentaBtn.style.display = "none";
    navCatalogBtn.style.display = "none";
    document.getElementById("bottomTcg")?.classList.add("active");
  } else {
    document.getElementById("tcgSelector").style.display = "";
    priceToggle.style.display = "none";
    homeBtn.style.display = "none";
    navBackTcgBtn.style.display = "none";
    navBinderBtn.style.display = "none";
    navVentaBtn.style.display = "none";
    navCatalogBtn.style.display = "none";
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

// Header nav
document.getElementById("logoHome").addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });
document.getElementById("homeBtn").addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });
document.getElementById("welcomeBackBtn").addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });
document.getElementById("navBackTcgBtn").addEventListener("click", () => { currentTcg = null; mostrarVista("home"); });
document.getElementById("navBinderBtn").addEventListener("click", () => { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); });
document.getElementById("navCatalogBtn").addEventListener("click", () => { mostrarVista("catalog"); });
document.getElementById("navVentaBtn").addEventListener("click", () => { currentVentaId = null; ventaPage = 1; mostrarVista("ventaCols"); });

// Bottom nav
document.querySelectorAll(".bottom-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    if (view === "home") { currentTcg = null; mostrarVista("home"); }
    else if (view === "catalog") { mostrarVista("catalog"); }
    else if (view === "collections") { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); }
    else if (view === "ventaCols") { currentVentaId = null; ventaPage = 1; mostrarVista("ventaCols"); }
    else if (view === "tcgHome") { mostrarVista("tcgHome"); }
  });
});

// Binder events
document.getElementById("binderClearPageBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col) return;
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
  if (confirm('Vaciar la colección "' + col.name + '" por completo?')) {
    col.cards = []; binderPage = 1; guardarCollections(); renderBinder(); actualizarBotonesBinder();
  }
});
document.getElementById("binderBackBtn").addEventListener("click", () => { currentCollectionId = null; binderPage = 1; mostrarVista("collections"); });
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
document.getElementById("addModalConfirm").addEventListener("click", confirmarAdd);
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
    selectionMode = false;
    const btn = document.getElementById("seleccionarBtn");
    btn.textContent = "Seleccionar";
    btn.classList.remove("active");
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
initCollections();
initVenta();
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
  showAuthModal("login");
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

// Update auth UI after init
onAuthChange(() => {
  updateAuthUI();
});
