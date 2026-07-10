// Deck Picker & Deck View
// _deckPickerResolve y _deckPickerInterval ya los declara script.js

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
    if (mode === "leader") title.textContent = "Elegir lÃ­der";
    else if (mode === "main") title.textContent = "Agregar cartas al deck (mÃ¡x 50)";
    else if (mode === "don") title.textContent = "Elegir DON!! (mÃ¡x 10)";
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
        info.textContent = `${total} seleccionadas Â· ${avail} disponibles Â· mÃ¡x ${max}`;
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
      if (e.key === "Escape") { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve(isMulti ? [] : null); }
    };
    cancelBtn.onclick = () => { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve(isMulti ? [] : null); };
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
      grid.innerHTML = '<div class="deck-picker-empty">Cargando catÃ¡logo de cartasâ€¦</div>';
      updateInfo();
      let retries = 0;
      const retry = setInterval(() => {
        if (cartas && cartas.length) { clearInterval(retry); _deckPickerInterval = null; renderPicker(""); }
        else if (++retries > 20) { clearInterval(retry); _deckPickerInterval = null; grid.innerHTML = '<div class="deck-picker-empty">Error al cargar catÃ¡logo</div>'; }
      }, 500);
      _deckPickerInterval = retry;
    } else {
      renderPicker("");
    }
    } catch (e) { console.error("Deck picker error:", e); resolve(isMulti ? [] : null); }
  });
}
document.getElementById("deckPickerOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById("deckPickerOverlay").style.display = "none";
    _deckPickerResolve = null;
    if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; }
  }
});
// â”€â”€â”€ Deck View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">PÃºblico</span>
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
  html += `<div class="deck-section deck-leader-section"><h3 class="deck-section-title">LÃ­der</h3><div class="deck-leader-slot">`;
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
      const cp = leader.customPrice != null ? leader.customPrice : 0;
      html += `<div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-leaderprice="1"></div>`;
    }
    html += `</div></div>
      <button class="btn-ghost btn-xs" id="deckChangeLeaderBtn">Cambiar lÃ­der</button>
      <button class="binder-remove" data-leaderremove="1" style="position:static;margin-top:var(--space-2)">&times; Quitar lÃ­der</button>`;
  } else {
    html += `<div class="deck-empty-slot deck-leader-placeholder">Elige un lÃ­der</div>`;
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
      const cp = c.customPrice != null ? c.customPrice : 0;
      priceHTML = `<div class="card-body" style="padding:var(--space-2)">
        <div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-mainprice="${i}"></div>
      </div>`;
    }
    html += `<div class="deck-card-slot" data-key="${c._key || ""}" data-mainidx="${i}">
      <div class="card-img-wrap"><img src="${img}" onerror="this.src='TUTCG.webp'">
        <span class="deck-card-qty">Ã—${qty}</span>
      </div>
      ${priceHTML}
      <button class="binder-remove" data-mainremove="${i}">&times;</button>
    </div>`;
  });
  if (mainTotal < 50) {
    html += `<div class="deck-add-more-btn deck-empty-slot">+ Agregar mÃ¡s (${50 - mainTotal} libres)</div>`;
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
        const cp = c.customPrice != null ? c.customPrice : 0;
        priceHTML = `<div class="card-body" style="padding:var(--space-1)">
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
      if (!col.leader) { alert("Primero debes elegir un lÃ­der."); return; }
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
      if (!col.leader) { alert("Primero debes elegir un lÃ­der."); return; }
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
      if (confirm(`Â¿Vaciar las ${total} cartas del deck?`)) {
        col.cards = [];
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    };
  }
  if (clearAllBtn) {
    clearAllBtn.textContent = "Vaciar dones";
    clearAllBtn.onclick = () => {
      if (!col.dons?.length) return;
      if (confirm(`Â¿Vaciar los ${col.dons.length} DON!! del deck?`)) {
        col.dons = [];
        saveDeck(isSale); renderDeckView(type, col, grid, title, toggleContainer);
      }
    };
  }
}
function saveDeck(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}
