// ─── Catalog Rendering ────────────────────────────────────────────────────
// Dependencias (globales): state.catalog.*, DOM refs, helpers (getCardKey, etc.)

function renderCards() {
  let resultado = [...cartas];
  const lang = state.catalog.catalogLanguage || "en";
  if (lang !== "all") {
    resultado = resultado.filter(c => c.language === lang);
  }
  const texto = searchInput.value.toLowerCase().trim();
  if (texto) {
    resultado = resultado.filter(carta =>
      (carta.card_name || "").toLowerCase().includes(texto) ||
      (carta.card_set_id || "").toLowerCase().includes(texto) ||
      (carta.variant || "").toLowerCase().includes(texto) ||
      (carta.set_name || "").toLowerCase().includes(texto)
    );
  }
  searchClear.style.display = texto ? "flex" : "none";
  if (expansionFilter.value) {
    resultado = resultado.filter(carta => {
      switch (expansionFilter.value) {
        case "DON!!": return carta.category === "DON";
        case "PROMO": return carta.category === "PROMO" || carta.category === "OTHER";
        case "OTHER": return carta.category === "PROMO" || carta.category === "OTHER";
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
    }
    let promoBadge = "";
    if (carta.category === "PROMO" || carta.category === "OTHER") {
      promoBadge = "PROMO";
    }
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
      </div>
      <div class="card-actions">
        <button class="card-action-btn minus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">&minus;</button>
        <button class="card-action-btn plus-btn" data-cardid="${cardId}" data-name="${escapeAttr(carta.card_name)}" data-image="${imgSrc}">+</button>
      </div>`;
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
      badge.style.display = "none";
      if (minus) minus.style.display = "none";
    }
  });
}

// ─── Catalog Filters ──────────────────────────────────────────────────────

function cargarFiltros() {
  rebuildingFilters = true;
  const prevExpansion = expansionFilter.value;
  expansionFilter.innerHTML = `<option value="">Todas las expansiones</option>`;
  if (currentTcg === "one-piece") {
    const lang = state.catalog.catalogLanguage || "en";
    const boosterSets = [...new Set(cartas.filter(c => c.category === "BOOSTER").map(c => c.set_id).filter(Boolean))];
    const starterSets = [...new Set(cartas.filter(c => c.category === "STARTER").map(c => c.set_id).filter(Boolean))];
    const hasPromo = cartas.some(c => (c.category === "PROMO" || c.category === "OTHER") && (lang === "all" || c.language === lang));
    const hasDon = cartas.some(c => c.category === "DON");
    const filteredBooster = boosterSets.filter(s => {
      if (lang === "all") return true;
      return cartas.some(c => c.set_id === s && c.language === lang && c.category === "BOOSTER");
    });
    const filteredStarter = starterSets.filter(s => {
      if (lang === "all") return true;
      return cartas.some(c => c.set_id === s && c.language === lang && c.category === "STARTER");
    });
    const fragments = [];
    if (filteredBooster.length) {
      filteredBooster.sort((a, b) => getOrden(a) - getOrden(b));
      let html = `<optgroup label="--- Booster ---">`;
      filteredBooster.forEach(s => {
        html += `<option value="${s}">${nombresExpansiones[s] || s}</option>`;
      });
      html += `</optgroup>`;
      fragments.push(html);
    }
    if (filteredStarter.length) {
      filteredStarter.sort((a, b) => getOrden(a) - getOrden(b));
      let html = `<optgroup label="--- Starter ---">`;
      filteredStarter.forEach(s => {
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
    typeFilter.innerHTML = `
      <option value="">Todos los tipos</option>
      <option value="LEADER">LEADER</option><option value="CHARACTER">CHARACTER</option>
      <option value="EVENT">EVENT</option><option value="STAGE">STAGE</option>
      <option value="DON!!">DON!!</option>`;
  } else if (currentTcg === "riftbound") {
    const boosterSets = [...new Set(cartas.filter(c => c.category === "BOOSTER").map(c => c.set_id).filter(Boolean))];
    const starterSets = [...new Set(cartas.filter(c => c.category === "STARTER").map(c => c.set_id).filter(Boolean))];
    const hasPromo = cartas.some(c => c.category === "PROMO");
    const fragments = [];
    if (boosterSets.length) {
      let html = `<optgroup label="--- Booster ---">`;
      boosterSets.sort().forEach(s => {
        const setName = cartas.find(c => c.set_id === s)?.set_name || s;
        html += `<option value="${s}">${setName}</option>`;
      });
      html += `</optgroup>`;
      fragments.push(html);
    }
    if (starterSets.length) {
      let html = `<optgroup label="--- Starter ---">`;
      starterSets.sort().forEach(s => {
        const setName = cartas.find(c => c.set_id === s)?.set_name || s;
        html += `<option value="${s}">${setName}</option>`;
      });
      html += `</optgroup>`;
      fragments.push(html);
    }
    if (hasPromo) {
      fragments.push(`<optgroup label="--- Promo ---"><option value="PROMO">Promo Cards</option></optgroup>`);
    }
    expansionFilter.innerHTML += fragments.join("");
    if (prevExpansion) expansionFilter.value = prevExpansion;
    colorFilter.innerHTML = `<option value="">Todos los colores</option>`;
    ["Mind","Order","Calm","Body","Chaos","Fury","Colorless"].forEach(color => {
      colorFilter.innerHTML += `<option value="${color}">${color}</option>`;
    });
    rarityFilter.innerHTML = `
      <option value="">Todas las rarezas</option>
      <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
      <option value="Rare">Rare</option><option value="Epic">Epic</option>
      <option value="Promo">Promo</option><option value="Showcase">Showcase</option>`;
    typeFilter.innerHTML = `
      <option value="">Todos los tipos</option>
      <option value="Unit">Unit</option><option value="Spell">Spell</option>
      <option value="Legend">Legend</option><option value="Gear">Gear</option>
      <option value="Battlefield">Battlefield</option><option value="Rune">Rune</option>`;
  } else {
    colorFilter.innerHTML = `<option value="">Todos los colores</option>`;
    rarityFilter.innerHTML = `<option value="">Todas las rarezas</option>`;
    typeFilter.innerHTML = `<option value="">Todos los tipos</option>`;
  }
  rebuildingFilters = false;
  if (prevExpansion) actualizarFiltrosPorExpansion();
}

function actualizarFiltrosPorExpansion() {
  if (rebuildingFilters) return;
  const val = expansionFilter.value;
  const prevRarity = rarityFilter.value;
  const esDon = val === "DON!!";
  const esPromo = val === "PROMO";
  colorFilter.disabled = esDon;
  colorFilter.style.display = esDon ? "none" : "";
  rarityFilter.disabled = esPromo;
  rarityFilter.style.display = esPromo ? "none" : "";
  typeFilter.style.display = esDon ? "none" : "";
  if (esDon) {
    rarityFilter.innerHTML = `
      <option value="">Todas las variantes</option>
      <option value="Gold">Gold</option>
      <option value="DP">DP</option>`;
  } else if (esPromo) {
    rarityFilter.innerHTML = `<option value="">Todas las rarezas</option>`;
  } else {
    if (currentTcg === "riftbound") {
      rarityFilter.innerHTML = `
        <option value="">Todas las rarezas</option>
        <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
        <option value="Rare">Rare</option><option value="Epic">Epic</option>
        <option value="Promo">Promo</option><option value="Showcase">Showcase</option>`;
      typeFilter.innerHTML = `
        <option value="">Todos los tipos</option>
        <option value="Unit">Unit</option><option value="Spell">Spell</option>
        <option value="Legend">Legend</option><option value="Gear">Gear</option>
        <option value="Battlefield">Battlefield</option><option value="Rune">Rune</option>`;
    } else {
      rarityFilter.innerHTML = `
        <option value="">Todas las rarezas</option>
        <option value="L">L</option><option value="C">C</option><option value="UC">UC</option>
        <option value="R">R</option><option value="SR">SR</option>
        <option value="SEC">SEC</option><option value="SP">SP</option>
        <option value="AA">AA</option>`;
      typeFilter.innerHTML = `
        <option value="">Todos los tipos</option>
        <option value="LEADER">LEADER</option><option value="CHARACTER">CHARACTER</option>
        <option value="EVENT">EVENT</option><option value="STAGE">STAGE</option>
        <option value="DON!!">DON!!</option>`;
    }
  }
  if (prevRarity) {
    const match = rarityFilter.querySelector(`option[value="${prevRarity}"]`);
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
