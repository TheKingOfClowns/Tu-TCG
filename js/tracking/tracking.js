// ─── Tracking (One Piece) ──────────────────────────────────────────────────
// OP tracking functions. Overridden by tracking_riftbound.js for RB.
// Dependencias: script.js (cartas, cartasMap, getCardKey, getOrden, obtenerRareza,
//                          formatearNombre, getCardKey, nombresExpansiones, coloresES,
//                          generarId, guardarCollections, renderCollectionList,
//                          showConfirmModal, showToast, showAuthModal, isAuthenticated,
//                          currentTcg, collections, currentCollectionId, binderPage,
//                          binderPerPage, openCardInModal, mostrarVista)

let _appendTo = null;

function pedirCrearTracking(preFillName) {
  if (!isAuthenticated()) { showAuthModal(); return; }
  const overlay = document.getElementById("trackingModalOverlay");
  const nameInput = document.getElementById("trackingNameInput");
  const typeSelect = document.getElementById("trackingTypeSelect");
  const extraPanel = document.getElementById("trackingExtraPanel");
  const title = document.getElementById("trackingModalTitle");
  const confirmBtn = document.getElementById("trackingModalConfirm");
  if (_appendTo) {
    title.textContent = "Agrega a tu coleccion";
    confirmBtn.textContent = "Agregar";
    nameInput.value = preFillName || "";
    nameInput.style.display = "none";
    nameInput.insertAdjacentHTML("afterend", `<span style="display:block;font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">${preFillName || ""}</span>`);
  } else {
    title.textContent = "Crear binder de coleccion";
    confirmBtn.textContent = "Crear";
    nameInput.value = "";
    nameInput.style.display = "";
    const appendSpan = nameInput.nextElementSibling;
    if (appendSpan && appendSpan.tagName === "SPAN") appendSpan.remove();
  }
  typeSelect.value = "expansion";
  extraPanel.innerHTML = "";
  if (_appendTo) {
    const existingCol = collections[_appendTo];
    if (existingCol && existingCol.tracking_type) {
      typeSelect.value = existingCol.tracking_type || "expansion";
    }
  }
  renderTrackingExtra(typeSelect.value, extraPanel);
  if (_appendTo) {
    const existingCol = collections[_appendTo];
    if (existingCol && existingCol.tracking_config && existingCol.tracking_config.mode) {
      const modeSelect = document.getElementById("trackingSetMode");
      if (modeSelect) modeSelect.value = existingCol.tracking_config.mode;
    }
  }
  overlay.style.display = "flex";
  setTimeout(() => nameInput.focus(), 100);
}

function renderTrackingExtra(type, panel) {
  if (type === "expansion") {
    const sets = getAvailableSets();
    const allSets = [...sets.booster, ...sets.starter, ...sets.promo, ...sets.don];
    const groupLabels = { booster: "Booster", starter: "Starter", promo: "Promo", don: "DON!!" };
    const checkboxesHTML = Object.entries(sets).map(([key, items]) => {
      if (!items.length) return "";
      return `<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:2px">${groupLabels[key]}</span>` +
        items.map(s => `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-secondary);cursor:pointer;margin:2px 6px 2px 0"><input type="checkbox" value="${s.id}" checked> ${s.label}</label>`).join("") +
        `</div>`;
    }).join("");
    panel.innerHTML = `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Expansiones (${allSets.length})</label>
      <div id="trackingSetCheckboxes" style="max-height:280px;overflow-y:auto;margin-bottom:var(--space-3)">
        ${checkboxesHTML}
      </div>
      <div style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2)">
        <button class="btn-ghost btn-xs" id="trackingSelectAllSets" style="font-size:10px">Seleccionar todas</button>
        <button class="btn-ghost btn-xs" id="trackingDeselectAllSets" style="font-size:10px">Ninguna</button>
      </div>
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo de set</label>
      <select id="trackingSetMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="master">Master Set — Todas las cartas</option>
        <option value="base">Base Set — Sin SP / AA / Manga</option>
      </select>`;
    document.getElementById("trackingSelectAllSets").addEventListener("click", () => {
      panel.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]").forEach(cb => cb.checked = true);
    });
    document.getElementById("trackingDeselectAllSets").addEventListener("click", () => {
      panel.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]").forEach(cb => cb.checked = false);
    });
  } else if (type === "character") {
    panel.innerHTML = `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Personaje</label>
      <input type="text" id="trackingCharacterInput" placeholder="Escribí el nombre del personaje..." autocomplete="off" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
      <div id="trackingCharSuggestions" style="max-height:150px;overflow-y:auto;margin-top:4px"></div>      ${buildTrackingToggle("trackingIncludeAA", "Arte Alternativo", true)}
      ${buildTrackingToggle("trackingIncludePromo", "Promos", true)}`;
    const charInput = document.getElementById("trackingCharacterInput");
    charInput.addEventListener("input", () => {
      const query = charInput.value.trim().toLowerCase();
      const suggestions = document.getElementById("trackingCharSuggestions");
      if (query.length < 2) { suggestions.innerHTML = ""; return; }
      const names = getUniqueCharacterNames().filter(n => n.toLowerCase().includes(query)).slice(0, 20);
      suggestions.innerHTML = names.map(n => `<div class="tracking-suggestion" style="padding:6px 10px;cursor:pointer;font-size:var(--text-xs);color:var(--text-secondary);border-radius:var(--radius-sm)" onmouseover="this.style.background='var(--bg-input)'" onmouseout="this.style.background='transparent'">${n}</div>`).join("");
      suggestions.querySelectorAll(".tracking-suggestion").forEach(el => {
        el.addEventListener("click", () => { charInput.value = el.textContent; suggestions.innerHTML = ""; });
      });
    });
  } else if (type === "rarity") {
    const rarities = ["L", "C", "UC", "R", "SR", "SEC", "SP", "AA"];
    panel.innerHTML = `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Rarezas</label>
      <div id="trackingRarityCheckboxes" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-3)">
        ${rarities.map(r => `<label style="display:flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-secondary);cursor:pointer"><input type="checkbox" value="${r}" checked> ${r}</label>`).join("")}
      </div>
      <div style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2)">
        <button class="btn-ghost btn-xs" id="trackingSelectAllRarities" style="font-size:10px">Todas</button>
        <button class="btn-ghost btn-xs" id="trackingDeselectAllRarities" style="font-size:10px">Ninguna</button>
      </div>
      ${buildTrackingToggle("trackingIncludeAA", "Arte Alternativo", true)}
      ${buildTrackingToggle("trackingIncludePromo", "Promos", true)}`;
    document.getElementById("trackingSelectAllRarities").addEventListener("click", () => {
      panel.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]").forEach(cb => cb.checked = true);
    });
    document.getElementById("trackingDeselectAllRarities").addEventListener("click", () => {
      panel.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]").forEach(cb => cb.checked = false);
    });
  } else if (type === "don") {
    const donCount = cartas.filter(c => c.category === "DON").length;
    panel.innerHTML = `<p style="font-size:var(--text-sm);color:var(--text-muted)">Se incluirán todas las <strong>${donCount}</strong> cartas DON disponibles.</p>
      ${buildTrackingToggle("trackingIncludeAA", "Gold", true)}`;
  }
}

function buildTrackingToggle(id, label, defaultOn) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-2);padding:var(--space-2) 0">
    <span style="font-size:var(--text-xs);color:var(--text-muted)">${label}</span>
    <div id="${id}" class="tracking-switch${defaultOn ? ' on' : ''}" onclick="this.classList.toggle('on')">
      <span>Sin</span><span>Con</span>
    </div>
  </div>`;
}

function trackingCardPasses(c, config) {
  if (config.include_aa === false) {
    if (c.is_parallel) return false;
    const pt = (c.print_type || "").toLowerCase();
    if (pt.includes("alt") || pt.includes("aa") || pt.includes("parallel") || pt.includes("manga")) return false;
    const r = obtenerRareza(c);
    if (["AA","SP","Manga","Full Art","Jolly Roger","Textured Foil"].includes(r)) return false;
  }
  if (config.include_promo === false) {
    if (c.category === "PROMO" || c.category === "OTHER") return false;
    if (c.category === "DON") {
      const r = obtenerRareza(c);
      if (["Promo"].includes(r)) return false;
    }
  }
  if (config.include_aa === false && c.category === "DON") {
    const r = obtenerRareza(c);
    if (["Gold"].includes(r)) return false;
  }
  return true;
}

function getAvailableSets() {
  const groups = { booster: [], starter: [], promo: [], don: [] };
  const seen = new Set();
  const subsumedBy = new Set(["OP-14","OP14","OP-15","OP15","EB-04","EB04"]);
  cartas.forEach(c => {
    const sid = c.set_id;
    if (!sid || seen.has(sid) || subsumedBy.has(sid)) return;
    const cat = c.category || "";
    if (cat === "BOOSTER" && !groups.booster.some(s => s.id === sid)) {
      groups.booster.push({ id: sid, label: nombresExpansiones[sid] || sid });
      seen.add(sid);
    } else if (cat === "STARTER" && !groups.starter.some(s => s.id === sid)) {
      groups.starter.push({ id: sid, label: nombresExpansiones[sid] || sid });
      seen.add(sid);
    } else if ((cat === "PROMO" || cat === "OTHER") && !groups.promo.some(s => s.id === sid)) {
      groups.promo.push({ id: "PROMO", label: "Promo Cards" });
      seen.add(sid);
    } else if (cat === "DON" && !groups.don.some(s => s.id === sid)) {
      groups.don.push({ id: "DON!!", label: "DON!! Cards" });
      seen.add(sid);
    }
  });
  groups.booster.sort((a, b) => getOrden(a.id) - getOrden(b.id));
  groups.starter.sort((a, b) => getOrden(a.id) - getOrden(b.id));
  return groups;
}

function getUniqueCharacterNames() {
  const names = new Set();
  cartas.forEach(c => {
    if (c.card_name && c.card_name.trim()) names.add(c.card_name.trim());
  });
  return [...names].sort();
}

function buildTrackingCardList(type, config) {
  const cards = [];
  const lang = config.language || "en";
  if (type === "expansion") {
    const sets = config.sets || [];
    const mode = config.mode || "master";
    const rareExclude = ["Manga", "SP", "AA", "Full Art", "Jolly Roger", "Textured Foil", "Reprint"];
    cartas.forEach(c => {
      if (lang !== "all" && c.language !== lang) return;
      const sid = c.set_id;
      if (!sets.includes(sid)) return;
      if (mode === "base") {
        const r = obtenerRareza(c);
        const pt = (c.print_type || "").toLowerCase();
        if (rareExclude.includes(r)) return;
        if (c.is_parallel) return;
        if (pt.includes("alt") || pt.includes("aa") || pt.includes("parallel") || pt.includes("manga")) return;
      }
      if (!trackingCardPasses(c, config)) return;
      cards.push({ _key: getCardKey(c), owned: false });
    });
  } else if (type === "character") {
    const charName = (config.character || "").trim().toLowerCase();
    cartas.forEach(c => {
      if (lang !== "all" && c.language !== lang) return;
      if (c.card_name && c.card_name.trim().toLowerCase() === charName) {
        if (!trackingCardPasses(c, config)) return;
        cards.push({ _key: getCardKey(c), owned: false });
      }
    });
  } else if (type === "rarity") {
    const rarities = config.rarities || [];
    cartas.forEach(c => {
      if (lang !== "all" && c.language !== lang) return;
      const rarezaRaw = c.rarity || c.rareza || "";
      if (rarities.includes(obtenerRareza(c)) || rarities.includes(rarezaRaw)) {
        if (!trackingCardPasses(c, config)) return;
        cards.push({ _key: getCardKey(c), owned: false });
      }
    });
  } else if (type === "don") {
    cartas.forEach(c => {
      if (lang !== "all" && c.language !== lang) return;
      if (c.category === "DON") {
        if (!trackingCardPasses(c, config)) return;
        cards.push({ _key: getCardKey(c), owned: false });
      }
    });
  }
  return cards;
}

function confirmCreateTracking() {
  const name = document.getElementById("trackingNameInput").value.trim();
  const type = document.getElementById("trackingTypeSelect").value;
  let config = {};
  const includeAA = document.getElementById("trackingIncludeAA")?.classList?.contains("on") ?? true;
  const includePromo = document.getElementById("trackingIncludePromo")?.classList?.contains("on") ?? true;
  if (!includeAA) config.include_aa = false;
  if (!includePromo) config.include_promo = false;
  config.language = document.getElementById("trackingLangSelect")?.value || "en";
  if (type === "expansion") {
    const sets = [];
    document.querySelectorAll("#trackingSetCheckboxes input[type=checkbox]:checked").forEach(cb => sets.push(cb.value));
    if (!sets.length) { showToast("Selecciona al menos una expansión", "error"); return; }
    config.sets = sets;
    config.mode = document.getElementById("trackingSetMode").value;
  } else if (type === "character") {
    const charName = document.getElementById("trackingCharacterInput").value.trim();
    if (!charName) { showToast("Escribí el nombre del personaje", "error"); return; }
    config.character = charName;
  } else if (type === "rarity") {
    const rarities = [];
    document.querySelectorAll("#trackingRarityCheckboxes input[type=checkbox]:checked").forEach(cb => rarities.push(cb.value));
    if (!rarities.length) { showToast("Selecciona al menos una rareza", "error"); return; }
    config.rarities = rarities;
  }
  const newCards = buildTrackingCardList(type, config);
  if (_appendTo) {
    const col = collections[_appendTo];
    if (!col || col.subtype !== "tracking") return;
    let added = 0;
    newCards.forEach(c => {
      if (!col.cards.some(existing => existing._key === c._key)) {
        col.cards.push(c);
        added++;
      }
    });
    col.target = col.cards.length;
    document.getElementById("trackingModalOverlay").style.display = "none";
    _appendTo = null;
    guardarCollections();
    showToast(added + " carta(s) agregada(s)", "success");
    if (currentCollectionId === col.id) {
      const grid = document.getElementById("binderGrid");
      const title = document.getElementById("binderTitle");
      if (grid) renderTrackingBinder(col, grid, title);
    }
    return;
  }
  if (!name) return;
  if (!newCards.length) { showToast("No se encontraron cartas con esos filtros", "error"); return; }
  const id = generarId();
  collections[id] = {
    id, name, subtype: "tracking",
    tracking_type: type, tracking_config: config,
    target: newCards.length,
    cards: newCards,
    is_public: false, checklist_mode: false,
    tcg: currentTcg || "one-piece"
  };
  document.getElementById("trackingModalOverlay").style.display = "none";
  guardarCollections();
  renderCollectionList();
  showToast(`Binder creado con ${newCards.length} cartas`, "success");
}

// ─── Tracking Rendering ─────────────────────────────────────────────────

function renderTrackingBinder(col, grid, title) {
  const trackingHeader = document.getElementById("trackingHeader");
  const deckContainer = document.getElementById("binderDeckContainer");
  const pagination = document.getElementById("binderPagination");
  const toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (deckContainer) deckContainer.style.display = "none";
  trackingHeader.style.display = "";
  document.getElementById("binderClearPageBtn").style.display = "none";
  document.getElementById("binderClearAllBtn").style.display = "none";
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle"><span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
      <input type="checkbox" id="binderPublicCheck" ${col.is_public ? "checked" : ""}>
      <span class="public-toggle-track"><span class="public-toggle-thumb"></span></span>
      <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span></label>` : "";
    const chk = document.getElementById("binderPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(currentCollectionId);
  }
  if (col.tracking_type === "expansion" && col.tracking_config && col.tracking_config.mode === "base") {
    title.innerHTML = col.name + ' <span class="tracking-mode-badge">Base Set</span>';
  } else {
    title.textContent = col.name;
  }
  grid.innerHTML = "";

  const currentFilter = col._trackingFilter || "all";
  let displayCards = col.cards;
  if (currentFilter === "owned") displayCards = col.cards.filter(c => c.owned);
  else if (currentFilter === "missing") displayCards = col.cards.filter(c => !c.owned);

  if (col.checklist_mode) {
    grid.parentElement.classList.add("tracking-checklist");
    grid.style.display = "flex";
    document.getElementById("trackingChecklistBtn").innerHTML = "&#9638; Grid";
    if (pagination) pagination.style.display = "none";
  } else {
    grid.parentElement.classList.remove("tracking-checklist");
    grid.style.display = "";
    document.getElementById("trackingChecklistBtn").innerHTML = "&#9776; Lista";
    if (pagination) pagination.style.display = "";
  }

  if (col.checklist_mode) {
    renderTrackingCards(displayCards, grid, col);
  } else {
    const start = (binderPage - 1) * binderPerPage;
    const pageCards = displayCards.slice(start, start + binderPerPage);
    const totalPages = Math.max(1, Math.ceil(displayCards.length / binderPerPage));
    for (let i = 0; i < binderPerPage; i++) {
      renderTrackingSlot(i, pageCards, col, grid);
    }
    document.getElementById("binderPrevBtn").disabled = binderPage <= 1;
    document.getElementById("binderNextBtn").disabled = binderPage >= totalPages;
    document.getElementById("binderPageInfo").textContent = "Página " + binderPage + " de " + totalPages;
  }

  grid.querySelectorAll(".tracking-card-overlay").forEach(ov => {
    ov.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(ov.getAttribute("data-idx"));
      if (isNaN(idx) || idx < 0 || idx >= col.cards.length) return;
      toggleTrackingCard(col, idx, grid);
    });
  });

  updateTrackingProgress(col);
  updateTrackingFilterButtons(currentFilter);
}

function toggleTrackingCard(col, idx, grid) {
  col.cards[idx].owned = !col.cards[idx].owned;
  const owned = col.cards[idx].owned;
  const overlay = grid.querySelector(`.tracking-card-overlay[data-idx="${idx}"]`);
  if (overlay) {
    overlay.innerHTML = owned ? "&#10003;" : "";
    const cardSlot = overlay.closest(".card");
    if (cardSlot) {
      cardSlot.classList.toggle("tracking-owned", owned);
      cardSlot.classList.toggle("tracking-missing", !owned);
    }
  }
  updateTrackingProgress(col);
  guardarCollections();
}

function updateTrackingFilterButtons(currentFilter) {
  document.querySelectorAll(".tracking-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter") === currentFilter);
  });
}

function renderTrackingCards(cards, grid, col) {
  cards.forEach((c, i) => {
    const slot = document.createElement("div");
    slot.className = "card fade-in";
    const full = c._key ? cartasMap[c._key] : null;
    const data = full || c;
    const nombre = formatearNombre(data);
    const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
    if (c.owned) slot.classList.add("tracking-owned");
    else slot.classList.add("tracking-missing");
    slot.innerHTML = `
      <div class="card-body" style="padding:0">
        <h3>${nombre}</h3>
        <span class="tracking-checklist-setid">${setId}</span>
      </div>
      <div class="tracking-card-overlay" data-key="${c._key}" data-idx="${col.cards.indexOf(c)}">${c.owned ? "&#10003;" : ""}</div>
      <button class="binder-remove tracking-remove" data-idx="${col.cards.indexOf(c)}">&times;</button>`;
    grid.appendChild(slot);
  });
}

function renderTrackingSlot(i, pageCards, col, grid) {
  const slot = document.createElement("div");
  slot.className = "card fade-in";
  if (pageCards[i]) {
    const c = pageCards[i];
    const full = c._key ? cartasMap[c._key] : null;
    const data = full || c;
    const nombre = formatearNombre(data);
    const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
    if (c.owned) slot.classList.add("tracking-owned");
    else slot.classList.add("tracking-missing");
    const imgSrc = full?.card_image || "TUTCG.webp";
    slot.innerHTML = `
      <div class="card-img-wrap"><img src="${imgSrc}" onerror="this.src='TUTCG.webp'" loading="lazy"></div>
      <div class="card-body"><h3>${nombre}</h3><span class="card-set-id">${setId}</span></div>
      <div class="tracking-card-overlay" data-key="${c._key}" data-idx="${col.cards.indexOf(c)}">${c.owned ? "&#10003;" : ""}</div>
      <button class="binder-remove tracking-remove" data-idx="${col.cards.indexOf(c)}">&times;</button>`;
  } else {
    slot.innerHTML = `<div class="binder-empty"></div>`;
  }
  grid.appendChild(slot);
}

function updateTrackingProgress(col) {
  const owned = col.cards.filter(c => c.owned).length;
  const total = col.target || col.cards.length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  const fill = document.getElementById("trackingProgressFill");
  const text = document.getElementById("trackingProgressText");
  if (fill) fill.style.width = pct + "%";
  if (text) text.textContent = `${owned} / ${total} — ${pct}%`;
}

// ─── Tracking Events ────────────────────────────────────────────────────

document.getElementById("createTrackingBtn").addEventListener("click", pedirCrearTracking);
document.getElementById("trackingModalCancel").addEventListener("click", () => {
  document.getElementById("trackingModalOverlay").style.display = "none";
  _appendTo = null;
  const nameInput = document.getElementById("trackingNameInput");
  nameInput.style.display = "";
  const span = nameInput.nextElementSibling;
  if (span && span.tagName === "SPAN") span.remove();
});
document.getElementById("trackingModalConfirm").addEventListener("click", confirmCreateTracking);
document.getElementById("trackingTypeSelect").addEventListener("change", function() {
  const extraPanel = document.getElementById("trackingExtraPanel");
  renderTrackingExtra(this.value, extraPanel);
});
document.getElementById("trackingAddBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  _appendTo = currentCollectionId;
  pedirCrearTracking(col.name);
});
document.getElementById("trackingMarkAllBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  const remaining = col.cards.filter(c => !c.owned).length;
  if (remaining === 0) { showToast("Ya tenés todas las cartas marcadas", "info"); return; }
  showConfirmModal("¿Marcar las " + remaining + " cartas faltantes como obtenidas?", () => {
    col.cards.forEach(c => c.owned = true);
    guardarCollections();
    const grid = document.getElementById("binderGrid");
    const title = document.getElementById("binderTitle");
    renderTrackingBinder(col, grid, title);
  });
});
document.getElementById("trackingUnmarkAllBtn").addEventListener("click", () => {
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  const owned = col.cards.filter(c => c.owned).length;
  if (owned === 0) { showToast("No tenés ninguna carta marcada", "info"); return; }
  showConfirmModal("¿Desmarcar las " + owned + " cartas obtenidas?", () => {
    col.cards.forEach(c => c.owned = false);
    guardarCollections();
    const grid = document.getElementById("binderGrid");
    const title = document.getElementById("binderTitle");
    renderTrackingBinder(col, grid, title);
  });
});
document.getElementById("trackingChecklistBtn").addEventListener("click", function() {
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  col.checklist_mode = !col.checklist_mode;
  guardarCollections();
  const grid = document.getElementById("binderGrid");
  const title = document.getElementById("binderTitle");
  renderTrackingBinder(col, grid, title);
});
document.getElementById("trackingFilters").addEventListener("click", e => {
  const btn = e.target.closest(".tracking-filter-btn");
  if (!btn) return;
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  col._trackingFilter = btn.getAttribute("data-filter");
  binderPage = 1;
  const grid = document.getElementById("binderGrid");
  const title = document.getElementById("binderTitle");
  renderTrackingBinder(col, grid, title);
});
document.getElementById("binderGrid").addEventListener("click", e => {
  if (e.target.closest(".binder-empty")) {
    mostrarVista("catalog");
    return;
  }
  const rmBtn = e.target.closest(".tracking-remove");
  if (rmBtn) {
    e.stopPropagation();
    const col = collections[currentCollectionId];
    if (!col || col.subtype !== "tracking") return;
    const idx = parseInt(rmBtn.getAttribute("data-idx"));
    if (isNaN(idx) || idx < 0 || idx >= col.cards.length) return;
    const card = col.cards[idx];
    const full = card._key ? cartasMap[card._key] : null;
    const name = full ? formatearNombre(full) : (card._key || "carta");
    showConfirmModal("¿Eliminar \"" + name + "\" del tracking?", () => {
      col.cards.splice(idx, 1);
      col.target = col.cards.length;
      guardarCollections();
      const grid = document.getElementById("binderGrid");
      const title = document.getElementById("binderTitle");
      renderTrackingBinder(col, grid, title);
    });
    return;
  }
  const slot = e.target.closest(".tracking-owned, .tracking-missing");
  if (!slot) return;
  const col = collections[currentCollectionId];
  if (!col || col.subtype !== "tracking") return;
  const overlay = slot.querySelector(".tracking-card-overlay");
  const idx = parseInt(overlay?.getAttribute("data-idx"));
  if (isNaN(idx) || idx < 0 || idx >= col.cards.length) return;
  if (e.target.closest(".card-img-wrap img, .card-img-wrap")) {
    toggleTrackingCard(col, idx, document.getElementById("binderGrid"));
    return;
  }
  const cardKey = overlay?.getAttribute("data-key");
  if (cardKey) {
    const carta = cartasMap[cardKey];
    if (carta) {
      const navList = col.cards.map(c => cartasMap[c._key]).filter(Boolean);
      openCardInModal(carta, navList);
    }
  }
});
document.getElementById("trackingModalOverlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) {
    document.getElementById("trackingModalOverlay").style.display = "none";
    _appendTo = null;
    const nameInput = document.getElementById("trackingNameInput");
    nameInput.style.display = "";
    const span = nameInput.nextElementSibling;
    if (span && span.tagName === "SPAN") span.remove();
  }
});
