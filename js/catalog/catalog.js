// ─── Catalog Rendering ────────────────────────────────────────────────────
// Dependencias (globales): state.catalog.*, DOM refs, helpers (getCardKey, etc.)

function catalogCardClick(imgEl, e) {
  abrirModal(imgEl);
}

function renderCards() {
  var resultado = [...cartas];
  var lang = state.catalog.catalogLanguage || "en";
  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) || null;
  if (lang !== "all") {
    resultado = resultado.filter(c => c.language === lang);
  }
  const texto = searchInput.value.trim();
  if (texto) {
    resultado = fuzzySearch(resultado, texto, ['card_name', 'card_set_id', 'variant', 'set_name']);
  }
  searchClear.style.display = texto ? "flex" : "none";
  if (expansionFilter.value) {
    resultado = resultado.filter(carta => {
      switch (expansionFilter.value) {
        case "DON!!": return carta.category === "DON";
        case "PROMO": return carta.category === "PROMO" || carta.category === "OTHER";
        default: return carta.set_id === expansionFilter.value && carta.category === setCategoryMap[expansionFilter.value];
      }
    });
  }
  if (colorFilter.value) resultado = resultado.filter(carta => (carta.card_color || "").includes(colorFilter.value));
  if (rarityFilter.value) {
    if (rarityFilter.value === "L") {
      resultado = resultado.filter(function(carta) { return carta.card_type === "LEADER"; });
    } else if (rarityFilter.value === "AA") {
      var detectAAFn = cfg && cfg.detectAA;
      if (detectAAFn) {
        resultado = resultado.filter(function(carta) { return detectAAFn(carta); });
      } else {
        resultado = resultado.filter(function(carta) { return obtenerRareza(carta) === "AA"; });
      }
    } else {
      resultado = resultado.filter(function(carta) { return obtenerRareza(carta) === rarityFilter.value; });
    }
  }
  if (typeFilter.value) {
    resultado = resultado.filter(carta => (carta.card_type || "") === typeFilter.value);
  }
  switch (sortFilter.value) {
    case "name": resultado.sort((a, b) => (a.card_name || "").localeCompare(b.card_name || "")); break;
    case "name_desc": resultado.sort((a, b) => (b.card_name || "").localeCompare(a.card_name || "")); break;
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
  var addedKeys = null;
  var targetCol = null;
  if (addingToBinderId) {
    targetCol = addingToBinderType === "venta" ? ventaCols[addingToBinderId] : collections[addingToBinderId];
  } else if (catalogTargetId) {
    targetCol = getCatalogTargetCol();
  }
  if (targetCol) {
    addedKeys = new Set();
    (targetCol.cards || []).forEach(function(c) { if (c._key) addedKeys.add(c._key); });
    if (targetCol.leader && targetCol.leader._key) addedKeys.add(targetCol.leader._key);
    if (targetCol.legend && targetCol.legend._key) addedKeys.add(targetCol.legend._key);
    if (targetCol.champions) targetCol.champions.forEach(function(ch) { if (ch._key) addedKeys.add(ch._key); });
    if (targetCol.runes) targetCol.runes.forEach(function(r) { if (r._key) addedKeys.add(r._key); });
    if (targetCol.battlefields) targetCol.battlefields.forEach(function(b) { if (b._key) addedKeys.add(b._key); });
    if (targetCol.sideboard) targetCol.sideboard.forEach(function(s) { if (s._key) addedKeys.add(s._key); });
  }
  var showActions = !!(addingToBinderId || catalogTargetId);
  var _pageSize = pageSizeFor(cardsContainer, 3).size; // ponytail: 3 filas exactas
  const totalPages = Math.max(1, Math.ceil(resultado.length / _pageSize));
  resultsCounter.textContent = resultado.length.toLocaleString() + " cartas encontradas";
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * _pageSize;
  const end = start + _pageSize;
  const cartasPagina = resultado.slice(start, end);
  window.currentPageCards = cartasPagina;
  cardsContainer.innerHTML = "";
  cartasPagina.forEach(carta => {
    const cardKey = getCardKey(carta);

    const cardId = carta.card_set_id || "";
    const nombre = formatearNombre(carta);
    const setId = carta.category === "DON" ? (carta.variant || "") : (carta.card_set_id || "");
    const rareza = obtenerRareza(carta);
    const imgSrc = carta.card_image || "TUTCG.webp";
    let rarityBadge = "";
    if (carta.category === "DON") {
      rarityBadge = rareza && rareza !== "Normal" ? rareza : "DON!!";
    } else {
      rarityBadge = rareza || "";
      if (carta.print_type && carta.print_type !== rareza) {
        rarityBadge += rarityBadge ? " - " + carta.print_type : carta.print_type;
      }
      var _detectAA = cfg && cfg.detectAA;
      if (_detectAA && _detectAA(carta)) {
        var _suffix = cfg.getAASuffix ? cfg.getAASuffix(carta.card_set_id) : "AA";
        if (_suffix !== rareza) {
          rarityBadge = rarityBadge ? rarityBadge + " - " + _suffix : _suffix;
        }
      }
    }
    let promoBadge = "";
    if ((carta.category === "PROMO" || carta.category === "OTHER") && rareza !== "Promo") {
      promoBadge = "PROMO";
    }
    let metaBadges = "";
    if (rarityBadge) metaBadges += `<span class="card-print-type">${rarityBadge}</span>`;
    if (promoBadge) metaBadges += `<span class="card-print-type card-print-type-promo">${promoBadge}</span>`;
    var addedBadge = "";
    if (addedKeys && addedKeys.has(cardKey)) {
      addedBadge = '<span class="catalog-added-badge" style="position:absolute;top:4px;left:4px;background:rgba(0,240,255,0.15);color:var(--accent);font-size:10px;font-family:var(--font-mono);font-weight:var(--weight-bold);padding:1px 5px;border-radius:var(--radius-sm);z-index:2;pointer-events:none">✓</span>';
    }
    const div = document.createElement("div");
    div.className = "card fade-in";
    div.setAttribute("data-cardid", cardId);
    div.setAttribute("data-cardkey", cardKey);
    div.style.animationDelay = (Math.random() * 0.1) + "s";
    div.innerHTML = `
      ${addedBadge}
      <div class="card-img-wrap">
        <img src="${imgSrc}" onerror="this.src='TUTCG.webp'" onclick="catalogCardClick(this, event)" loading="lazy">
      </div>
      <div class="card-body">
        <h3>${nombre}</h3>
        <span class="card-set-id">${setId}</span>
        ${metaBadges ? `<div class="card-meta">${metaBadges}</div>` : ""}
      </div>
      ${showActions ? `<div class="card-actions">
        <button class="card-action-btn minus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">&minus;</button>
        <div class="pending-card-badge" id="badge-${cardKey.replace(/[^a-zA-Z0-9]/g, '_')}">0</div>
        <button class="card-action-btn plus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">+</button>
      </div>` : ""}`;
    cardsContainer.appendChild(div);
  });
  pageInfoBottom.textContent = "Página " + currentPage + " de " + totalPages;
  cardsContainer.querySelectorAll(".plus-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-cardid");
      const name = btn.getAttribute("data-name");
      const img = btn.getAttribute("data-image");
      const carta = cartas.find(c => c.card_set_id === cardId && c.card_name === name && (c.card_image || "") === img);
      if (!carta) return;
      const key = getCardKey(carta);
      if (addingToBinderId) {
        if (pendingCards[key]) { if (pendingCards[key].count < 10) pendingCards[key].count++; }
        else pendingCards[key] = makePendingCard(carta, 1);
        actualizarBadgesEnPagina();
        return;
      }
      const targetCol = getCatalogTargetCol();
      if (!targetCol) return;
      const max = getTargetMax(targetCol);
      const current = countInTarget(targetCol, key);
      if (max != null && current >= max) {
        if (typeof showToast === "function") showToast('Límite de ' + max + ' alcanzado en "' + targetCol.name + '"', "info");
        return;
      }
      pendingCards[key] = makePendingCard(carta, 1);
      addPendingCardsToCol(targetCol, catalogTargetType === "venta");
      limpiarPendientes();
      if (typeof showToast === "function") showToast('Añadida a "' + targetCol.name + '"', "success");
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
      if (addingToBinderId) {
        if (!pendingCards[key]) return;
        pendingCards[key].count--;
        if (pendingCards[key].count <= 0) delete pendingCards[key];
        actualizarBadgesEnPagina();
        return;
      }
      const targetCol = getCatalogTargetCol();
      if (!targetCol) return;
      if (removeOneFromTarget(targetCol, key, catalogTargetType === "venta")) {
        actualizarBadgesEnPagina();
      }
    });
  });
  actualizarBadgesEnPagina();
}

// ─── Quick-add helpers (target mode) ──────────────────────────────────────
function countInTarget(col, key) {
  if (!col || !key) return 0;
  const isGrouped = col.display_mode === "playset" || col.display_mode === "editable";
  if (isGrouped) {
    return (col.cards || []).filter(c => c._key === key).reduce((s, c) => s + (c.quantity || 1), 0);
  }
  return (col.cards || []).filter(c => c._key === key).length;
}
function getTargetMax(col) {
  if (!col) return null;
  if (catalogTargetType === "venta") {
    if (col.display_mode === "playset") return null;
    return 10;
  }
  return _getPlaysetMax(col.tcg || currentTcg);
}
function removeOneFromTarget(col, key, isVenta) {
  var cards = col.cards || [];
  var idx = -1;
  for (var i = cards.length - 1; i >= 0; i--) {
    if (cards[i]._key === key) { idx = i; break; }
  }
  if (idx === -1) return false;
  var row = cards[idx];
  var isGrouped = col.display_mode === "playset" || col.display_mode === "editable";
  if (isGrouped && (row.quantity || 1) > 1) {
    row.quantity = (row.quantity || 1) - 1;
    if (isVenta) guardarVenta(); else guardarCollections();
    return true;
  }
  return removeEntryWithUndo(col, idx, isVenta ? guardarVenta : guardarCollections, actualizarBadgesEnPagina);
}

function actualizarBadgesEnPagina() {
  const targetCol = getCatalogTargetCol();
  cardsContainer.querySelectorAll(".card").forEach(el => {
    const key = el.getAttribute("data-cardkey");
    const badge = el.querySelector(".pending-card-badge");
    const minus = el.querySelector(".minus-btn");
    const plus = el.querySelector(".plus-btn");
    if (!badge) return;
    if (addingToBinderId) {
      if (key && pendingCards[key]) {
        badge.textContent = pendingCards[key].count;
        badge.style.display = "flex";
        if (minus) minus.style.display = "flex";
      } else {
        badge.style.display = "none";
        if (minus) minus.style.display = "none";
      }
      return;
    }
    if (targetCol) {
      const n = key ? countInTarget(targetCol, key) : 0;
      const max = getTargetMax(targetCol);
      badge.textContent = max != null ? (n + " / " + max) : String(n);
      badge.style.display = "flex";
      if (minus) minus.style.display = n > 0 ? "flex" : "none";
      if (plus) plus.disabled = (max != null && n >= max);
      return;
    }
    badge.style.display = "none";
    if (minus) minus.style.display = "none";
  });
}

// ─── Catalog Filters ──────────────────────────────────────────────────────

function cargarFiltros() {
  rebuildingFilters = true;
  var prevExpansion = expansionFilter.value;
  expansionFilter.innerHTML = '<option value="">Todas las expansiones</option>';

  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) || null;
  var lang = state.catalog.catalogLanguage || "en";

  // ── Expansion filter ──────────────────────────
  var boosterSets = [...new Set(cartas.filter(function(c) { return c.category === "BOOSTER"; }).map(function(c) { return c.set_id; }).filter(Boolean))];
  var starterSets = [...new Set(cartas.filter(function(c) { return c.category === "STARTER"; }).map(function(c) { return c.set_id; }).filter(Boolean))];

  var filterByLang = cfg && cfg.hasLanguageFilter && lang !== "all";
  var hasPromo = filterByLang
    ? cartas.some(function(c) { return (c.category === "PROMO" || c.category === "OTHER") && c.language === lang; })
    : cartas.some(function(c) { return c.category === "PROMO" || c.category === "OTHER"; });

  var hasDon = cfg && cfg.cardTypes && cfg.cardTypes.indexOf("DON!!") !== -1 && cartas.some(function(c) { return c.category === "DON"; });

  var filteredBooster = boosterSets;
  var filteredStarter = starterSets;
  if (filterByLang) {
    filteredBooster = boosterSets.filter(function(s) {
      return cartas.some(function(c) { return c.set_id === s && c.language === lang && c.category === "BOOSTER"; });
    });
    filteredStarter = starterSets.filter(function(s) {
      return cartas.some(function(c) { return c.set_id === s && c.language === lang && c.category === "STARTER"; });
    });
  }

  var getSetName, sortSets;
  if (cfg && cfg.expansionNames && cfg.expansionOrder) {
    getSetName = function(s) { return cfg.expansionNames[s] || s; };
    sortSets = function(arr) { arr.sort(function(a, b) { return (cfg.expansionOrder[a] || 999) - (cfg.expansionOrder[b] || 999); }); };
  } else {
    getSetName = function(s) {
      var found = cartas.find(function(c) { return c.set_id === s; });
      return found ? (found.set_name || s) : s;
    };
    sortSets = function(arr) { arr.sort(); };
  }

  var fragments = [];
  if (filteredBooster.length) {
    sortSets(filteredBooster);
    var html = '<optgroup label="--- Booster ---">';
    filteredBooster.forEach(function(s) {
      html += '<option value="' + s + '">' + getSetName(s) + '</option>';
    });
    html += '</optgroup>';
    fragments.push(html);
  }
  if (filteredStarter.length) {
    sortSets(filteredStarter);
    var html = '<optgroup label="--- Starter ---">';
    filteredStarter.forEach(function(s) {
      html += '<option value="' + s + '">' + getSetName(s) + '</option>';
    });
    html += '</optgroup>';
    fragments.push(html);
  }
  if (hasPromo) {
    fragments.push('<optgroup label="--- Promo ---"><option value="PROMO">Promo Cards</option></optgroup>');
  }
  if (hasDon) {
    fragments.push('<optgroup label="--- DON!! ---"><option value="DON!!">DON!! Cards</option></optgroup>');
  }
  expansionFilter.innerHTML += fragments.join("");
  if (prevExpansion) expansionFilter.value = prevExpansion;

  // ── Color / Rarity / Type filters (data-driven) ──
  colorFilter.innerHTML = '<option value="">Todos los colores</option>';
  rarityFilter.innerHTML = '<option value="">Todas las rarezas</option>';
  typeFilter.innerHTML = '<option value="">Todos los tipos</option>';

  if (cfg) {
    (cfg.colors || []).forEach(function(color) {
      var label = (cfg.colorNames && cfg.colorNames[color]) || color;
      colorFilter.innerHTML += '<option value="' + color + '">' + label + '</option>';
    });
    (cfg.rarities || []).forEach(function(r) {
      rarityFilter.innerHTML += '<option value="' + r + '">' + r + '</option>';
    });
    (cfg.cardTypes || []).forEach(function(t) {
      if (t === "DON!!" && hasDon) return;
      typeFilter.innerHTML += '<option value="' + t + '">' + t + '</option>';
    });
  }

  // ── Stats ──────────────────────────────────────
  var statCards = document.getElementById("statCards");
  if (statCards && currentTcg) statCards.textContent = cartas.length.toLocaleString();
  rebuildingFilters = false;
  if (prevExpansion) actualizarFiltrosPorExpansion();
}

function actualizarFiltrosPorExpansion() {
  if (rebuildingFilters) return;
  var val = expansionFilter.value;
  var prevRarity = rarityFilter.value;
  var esDon = val === "DON!!";
  var esPromo = val === "PROMO";
  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) || null;

  colorFilter.disabled = esDon || esPromo;
  colorFilter.style.display = (esDon || esPromo) ? "none" : "";
  rarityFilter.disabled = esPromo;
  rarityFilter.style.display = esPromo ? "none" : "";
  typeFilter.style.display = esDon ? "none" : "";

  if (esDon) {
    var donVars = (cfg && cfg.donVariants) || ["Gold", "DP"];
    var html = '<option value="">Todas las variantes</option>';
    donVars.forEach(function(v) { html += '<option value="' + v + '">' + v + '</option>'; });
    rarityFilter.innerHTML = html;
  } else if (esPromo) {
    rarityFilter.innerHTML = '<option value="">Todas las rarezas</option>';
  } else {
    colorFilter.innerHTML = '<option value="">Todos los colores</option>';
    rarityFilter.innerHTML = '<option value="">Todas las rarezas</option>';
    typeFilter.innerHTML = '<option value="">Todos los tipos</option>';
    if (cfg) {
      (cfg.colors || []).forEach(function(color) {
        var label = (cfg.colorNames && cfg.colorNames[color]) || color;
        colorFilter.innerHTML += '<option value="' + color + '">' + label + '</option>';
      });
      (cfg.rarities || []).forEach(function(r) {
        rarityFilter.innerHTML += '<option value="' + r + '">' + r + '</option>';
      });
      (cfg.cardTypes || []).forEach(function(t) {
        typeFilter.innerHTML += '<option value="' + t + '">' + t + '</option>';
      });
    }
  }
  if (prevRarity) {
    var match = rarityFilter.querySelector('option[value="' + prevRarity + '"]');
    if (match) rarityFilter.value = prevRarity;
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
          if (idx !== -1) nonReprintLabels.splice(idx, 1);
        }
        pSorted.forEach(n => {
          const pos = pSorted.indexOf(n);
          map["p" + n] = prb02LabelToBadge(nonReprintLabels[pos] || "AA");
        });
      } else {
        pSorted.forEach(n => {
          const pos = pSorted.indexOf(n);
          map["p" + n] = prb02LabelToBadge(nonReprintLabels[pos]);
        });
      }
      if (prb02CardlistLabels && prb02CardlistLabels[info.cardId]) {
        const labels = prb02CardlistLabels[info.cardId];
        if (labels && labels.includes("Manga")) {
          if (pSorted.includes(1) && !map["p1"]) map["p1"] = "Manga";
          else if (pSorted.includes(2)) map["p2"] = "Manga";
          else if (rSorted.includes(1)) map["r1"] = "Manga";
        }
      }
    }
    prbBadgeMap[key] = map;
  }
}

// ─── Catalog Event Listeners (bound here: renderCards/cargarFiltros live in this file) ──
(function bindCatalogListeners() {
  const searchClearEl = document.getElementById("searchClear");
  const searchInputEl = document.getElementById("searchInput");
  if (searchClearEl) searchClearEl.addEventListener("click", () => {
    if (searchInputEl) searchInputEl.value = "";
    if (searchClearEl) searchClearEl.style.display = "none";
    currentPage = 1;
    renderCards();
  });
  if (searchInputEl) searchInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentPage = 1;
      renderCards();
      router.updateUrl();
    }
  });
  const el = (id) => document.getElementById(id);
  ["expansionFilter", "colorFilter", "rarityFilter", "sortFilter", "typeFilter"].forEach(id => {
    const f = el(id);
    if (f) f.addEventListener("change", () => {
      if (id === "expansionFilter") actualizarFiltrosPorExpansion();
      currentPage = 1;
      renderCards();
      router.updateUrl();
    });
  });
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
      router.updateUrl();
    });
  });
  const nextBtn = el("nextBtnBottom");
  const prevBtn = el("prevBtnBottom");
  if (nextBtn) nextBtn.onclick = () => { currentPage++; renderCards(); router.updateUrl(); };
  if (prevBtn) prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderCards(); router.updateUrl(); } };
  // ponytail: resize recalcula filas completas (debounce, solo catálogo visible)
  var _rzT = null;
  window.addEventListener("resize", () => {
    clearTimeout(_rzT);
    _rzT = setTimeout(() => {
      var cv = document.getElementById("catalogView");
      if (cv && cv.style.display !== "none" && typeof renderCards === "function") renderCards();
    }, 250);
  });
})();

// ─── Quick-add target selector ─────────────────────────────────────────────
function getCatalogTargets() {
  var targets = [];
  Object.keys(collections).forEach(function(id) {
    var col = collections[id];
    if (col.subtype === "deck" || col.subtype === "tracking") return;
    if ((col.tcg || "one-piece") !== currentTcg) return;
    targets.push({ id: id, type: "collection", name: col.name });
  });
  Object.keys(ventaCols).forEach(function(id) {
    var col = ventaCols[id];
    if (col.subtype === "deck" || col.subtype === "tracking") return;
    if ((col.tcg || "one-piece") !== currentTcg) return;
    targets.push({ id: id, type: "venta", name: col.name });
  });
  return targets;
}
function refreshCatalogTargetSelect() {
  var select = document.getElementById("catalogTargetSelect");
  var label = document.getElementById("catalogTargetLabel");
  if (!select || !label) return;
  var targets = getCatalogTargets();
  if (catalogTargetId && !targets.some(function(t) { return t.id === catalogTargetId && t.type === catalogTargetType; })) {
    catalogTargetId = null;
    catalogTargetType = null;
  }
  select.innerHTML = '<option value="">Sin destino</option>';
  targets.forEach(function(t) {
    var opt = document.createElement("option");
    opt.value = t.type + "|" + t.id;
    opt.textContent = (t.type === "venta" ? "Venta: " : "Binder: ") + t.name;
    if (t.id === catalogTargetId && t.type === catalogTargetType) opt.selected = true;
    select.appendChild(opt);
  });
  if (addingToBinderId) {
    label.style.display = "none";
  } else if (targets.length) {
    label.style.display = "";
  } else {
    label.style.display = "none";
  }
}
window.refreshCatalogTargetSelect = refreshCatalogTargetSelect;
document.getElementById("catalogTargetSelect")?.addEventListener("change", function(e) {
  var val = e.target.value || "";
  if (!val) { catalogTargetId = null; catalogTargetType = null; }
  else {
    var parts = val.split("|");
    catalogTargetType = parts[0];
    catalogTargetId = parts[1];
  }
  var catalogPane = document.getElementById("catalogView");
  if (catalogPane && catalogPane.classList.contains("active") && currentTcg) renderCards();
});
