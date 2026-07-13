// ─── Riftbound Deck Builder ──────────────────────────────────────────────────
// Legend (1) + Main Deck (40, max 3 copias/nombre) + Rune Deck (12)
// Battlefields (3, nombres unicos) + Sideboard (0-8 opcional)
// + Chosen Champion (Unit Champion con mismo feature de la Legend)

function getLegendColors_legend(legend) {
  if (!legend || !legend.card_color) return [];
  return legend.card_color.split("/").map(s => s.trim()).filter(Boolean);
}

function matchesLegendColors_legend(card, legendColors) {
  if (!card || !card.card_color) return false;
  const cardColors = card.card_color.split("/").map(s => s.trim());
  return legendColors.some(lc => cardColors.includes(lc));
}

function isChampionMatch_legend(legend, card) {
  if (!legend || !card) return false;
  if (card.card_type !== "Unit") return false;
  if (card.attribute !== "Champion") return false;
  var legendFeature = legend.feature || "";
  var cardFeature = card.feature || "";
  return cardFeature === legendFeature || cardFeature.startsWith(legendFeature + "/");
}

function countByName_legend(cardsArr) {
  const counts = {};
  (cardsArr || []).forEach(c => {
    const name = c.card_name;
    counts[name] = (counts[name] || 0) + (c.quantity || 1);
  });
  return counts;
}

// ─── Deck Picker ───────────────────────────────────────────────────────────

function showDeckPicker_RB(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys) {
  const isMulti = mode !== "legend";
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
    const leaderColors = leaderColor ? leaderColor.split("/").map(s => s.trim()).filter(Boolean) : [];

    function getFiltered() {
      if (mode === "legend") return (cartas || []).filter(c => c.card_type === "Legend");
      if (mode === "main") {
        let base = (cartas || []).filter(c =>
          c.card_type === "Unit" || c.card_type === "Spell" || c.card_type === "Gear"
        );
        if (existingCounts) {
          base = base.filter(c => {
            const existCount = existingCounts[c.card_name] || 0;
            return existCount < 3;
          });
        }
        if (leaderColors.length) {
          base = base.filter(c => {
            if (!c.card_color) return false;
            const cardColors = c.card_color.split("/").map(s => s.trim());
            return leaderColors.some(lc => cardColors.includes(lc));
          });
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
      if (mode === "runes") {
        let base = (cartas || []).filter(c => c.card_type === "Rune");
        if (leaderColors.length) {
          base = base.filter(c => {
            if (!c.card_color) return false;
            return leaderColors.some(lc => c.card_color.includes(lc));
          });
        }
        return base;
      }
      if (mode === "battlefield") {
        return (cartas || []).filter(c => c.card_type === "Battlefield");
      }
      if (mode === "champion") {
        var base = (cartas || []).filter(function(c) {
          return c.card_type === "Unit" && c.attribute === "Champion";
        });
        if (leaderColors.length) {
          base = base.filter(function(c) {
            return matchesLegendColors_legend(c, leaderColors);
          });
        }
        if (legendFeature) {
          base = base.filter(function(c) {
            var feat = c.feature || "";
            return feat === legendFeature || feat.startsWith(legendFeature + "/");
          });
        }
        return base;
      }
      if (mode === "sideboard") {
        return (cartas || []).filter(c =>
          c.card_type === "Unit" || c.card_type === "Spell" || c.card_type === "Gear"
        );
      }
      return [];
    }

    const modeTitles = {
      legend: "Elegir Legend",
      champion: "Elegir Champions (max 3)",
      main: "Agregar cartas (max 40, 3 por nombre)",
      runes: "Agregar Runes (max 12)",
      battlefield: "Agregar Battlefields (max 3)",
      sideboard: "Sideboard (max 8)"
    };
    title.textContent = modeTitles[mode] || "Seleccionar cartas";

    function updateInfo() {
      let total;
      if (isMulti) {
        total = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
      } else {
        total = selectedKeys.size;
      }
      const max = mode === "main" ? 40 : mode === "runes" ? 12 : mode === "battlefield" ? 3 : mode === "champion" ? 3 : mode === "sideboard" ? 8 : 1;
      const avail = getFiltered().length;
      if (isMulti) {
        info.textContent = total + " seleccionadas \u00b7 " + avail + " disponibles \u00b7 max " + max;
        if (confirmBtn) confirmBtn.disabled = total === 0;
      } else {
        info.textContent = avail + " disponibles";
      }
    }

    function renderPicker(query) {
      const q = (query || "").toLowerCase().trim();
      let results = getFiltered();
      if (results.length === 0 && !q) {
        grid.innerHTML = '<div class="deck-picker-empty">No hay cartas disponibles (' + mode + ')' + (leaderColor ? " para color " + leaderColor : "") + '</div>';
        updateInfo();
        return;
      }
      if (q) {
        results = results.filter(c =>
          (c.card_name || "").toLowerCase().includes(q) ||
          (c.card_set_id || "").toLowerCase().includes(q) ||
          (c.set_name || "").toLowerCase().includes(q)
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
        if (isMulti) {
          const key = mode === "main" || mode === "runes" ? c.card_set_id : cardKey;
          selectedQty = selectedCounts[key] || 0;
          isSelected = (selectedPerKey[cardKey] || 0) > 0;
        } else {
          isSelected = selectedKeys.has(cardKey);
        }
        div.className = "card deck-pick-card" + (isSelected ? " selected" : "");
        div.setAttribute("data-cardkey", cardKey);
        let checkHTML = "";
        if (isSelected) {
          const badgeQty = isMulti ? (selectedPerKey[cardKey] || 0) : null;
          checkHTML = badgeQty ? '<span class="deck-pick-check">' + badgeQty + '</span>' : '<span class="deck-pick-check">&#10003;</span>';
        }
        const existingQty = mode === "main" ? (existingCounts && existingCounts[c.card_name] || 0) : 0;
        let controlsHTML = "";
        if (isSelected && isMulti) {
          const k = mode === "main" || mode === "runes" ? c.card_set_id : cardKey;
          controlsHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px">' +
            '<button class="deck-pick-qty-btn" data-action="decr" data-key="' + k + '" data-vkey="' + cardKey + '" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">&minus;</button>' +
            '<span style="font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--accent);font-family:var(--font-mono);min-width:20px;text-align:center">' + (selectedPerKey[cardKey] || 0) + '</span>' +
            '<button class="deck-pick-qty-btn" data-action="incr" data-key="' + k + '" data-vkey="' + cardKey + '" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">+</button>' +
            '</div>';
        }
        div.innerHTML =
          '<div class="card-img-wrap">' +
            '<img src="' + (c.card_image || "TUTCG.webp") + '" onerror="this.src=\'TUTCG.webp\'" loading="lazy">' +
            checkHTML +
          '</div>' +
          '<div class="card-body">' +
            '<h3>' + formatearNombre(c) + '</h3>' +
            '<span class="card-set-id">' + (c.card_set_id || "") + '</span>' +
            (existingQty > 0 ? '<div style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">' + existingQty + ' en deck</div>' : "") +
            controlsHTML +
          '</div>';
        div.addEventListener("click", () => {
          if (mode === "legend") {
            overlay.style.display = "none";
            if (_deckPickerResolve) _deckPickerResolve(c);
            _deckPickerResolve = null;
            return;
          }
          if (isMulti) {
            const key = mode === "main" || mode === "runes" ? c.card_set_id : cardKey;
            const existingQty = mode === "main" ? (existingCounts && existingCounts[c.card_name] || 0) : 0;
            const selectedQty = selectedCounts[key] || 0;
            const totalSelected = Object.values(selectedCounts).reduce((s, n) => s + n, 0);
            if (mode === "main" && existingQty + selectedQty >= 3) return;
            if (totalSelected >= remainingSlots) return;
            selectedCounts[key] = selectedQty + 1;
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
          const totalSelected = Object.values(selectedCounts).reduce((s, n) => s + n, 0);
          const current = selectedCounts[key] || 0;
          if (btn.getAttribute("data-action") === "incr") {
            if (mode === "main") {
              const existQty = existingCounts ? (existingCounts[cartas.find(c2 => c2.card_set_id === key)?.card_name] || 0) : 0;
              if (existQty + current >= 3) return;
            }
            if (totalSelected >= remainingSlots) return;
            selectedCounts[key] = current + 1;
            selectedPerKey[vkey] = (selectedPerKey[vkey] || 0) + 1;
          } else {
            if (current <= 1) {
              delete selectedCounts[key];
              delete selectedPerKey[vkey];
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

    search.oninput = () => renderPicker(search.value);
    search.onkeydown = (e) => {
      if (e.key === "Escape") { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve(isMulti ? [] : null); }
    };
    cancelBtn.onclick = () => { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve(isMulti ? [] : null); };
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const picked = [];
        Object.entries(selectedPerKey).forEach(([key, qty]) => {
          const card = cartasMap[key];
          if (card) {
            for (let i = 0; i < qty; i++) picked.push(card);
          }
        });
        overlay.style.display = "none";
        if (_deckPickerResolve) _deckPickerResolve(picked);
        _deckPickerResolve = null;
      };
    }
    if (!cartas || !cartas.length) {
      grid.innerHTML = '<div class="deck-picker-empty">Cargando catalogo de cartas...</div>';
      updateInfo();
      let retries = 0;
      const retry = setInterval(() => {
        if (cartas && cartas.length) { clearInterval(retry); _deckPickerInterval = null; renderPicker(""); }
        else if (++retries > 20) { clearInterval(retry); _deckPickerInterval = null; grid.innerHTML = '<div class="deck-picker-empty">Error al cargar catalogo</div>'; }
      }, 500);
      _deckPickerInterval = retry;
    } else {
      renderPicker("");
    }
    } catch (e) { console.error("RB Deck picker error:", e); resolve(isMulti ? [] : null); }
  });
}

// ─── Deck View ─────────────────────────────────────────────────────────────

function renderDeckView_RB(type, col, grid, title, toggleContainer) {
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
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Publico</span>
      </label>
    ` : "";
    const chk = document.getElementById(isSale ? "ventaPublicCheck" : "binderPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(isSale ? currentVentaId : currentCollectionId);
  }

  const legend = col.legend;
  const mainCards = col.cards || [];
  const runes = col.runes || [];
  const battlefields = col.battlefields || [];
  const sideboard = col.sideboard || [];
  const championKey = col.championKey;

  const legendColors = getLegendColors_legend(legend);
  const mainTotal = mainCards.reduce((s, c) => s + (c.quantity || 1), 0);
  const runesTotal = runes.reduce((s, c) => s + (c.quantity || 1), 0);
  const totalCards = (legend ? 1 : 0) + mainTotal + runesTotal + battlefields.length + sideboard.length;

  title.textContent = col.name + " (" + totalCards + " cartas)";

  let html = '<div class="deck-container">';

  // ── Legend section ──
  html += '<div class="deck-section deck-leader-section"><h3 class="deck-section-title">Legend</h3><div class="deck-leader-slot">';
  if (legend) {
    const full = legend._key ? cartasMap[legend._key] : null;
    const img = legend.card_image || full?.card_image || "TUTCG.webp";
    const name = legend.card_name || full?.card_name || "";
    const color = legend.card_color || full?.card_color || "";
    const feature = legend.feature || full?.feature || "";
    const cp = legend.customPrice != null ? legend.customPrice : 0;
    html += '<div class="deck-leader-card" data-key="' + (legend._key || "") + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      '<div class="card-body">' +
        '<h3>' + name + '</h3>' +
        '<span class="card-set-id">' + (color ? color : "") + (feature ? " \u00b7 " + feature : "") + '</span>';
    if (isSale) {
      html += '<div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + cp + '" data-legendprice="1"></div>';
    }
    html += '</div></div>' +
      '<button class="btn-ghost btn-xs" id="deckChangeLegendBtn">Cambiar Legend</button>' +
      '<button class="binder-remove" data-legendremove="1" style="position:static;margin-top:var(--space-2)">&times; Quitar Legend</button>';
  } else {
    html += '<div class="deck-empty-slot deck-leader-placeholder deck-legend-placeholder">Elegi una Legend</div>';
  }
  html += '</div></div>';

  // ── Chosen Champion ──
  html += '<div class="deck-section"><h3 class="deck-section-title">Chosen Champion</h3><div class="deck-champion-slot">';
  if (championKey) {
    const champ = mainCards.find(c => c._key === championKey);
    if (champ) {
      const full = cartasMap[champ._key];
      const img = champ.card_image || full?.card_image || "TUTCG.webp";
      const name = champ.card_name || full?.card_name || "";
      html += '<div class="deck-champion-card" data-key="' + (champ._key || "") + '">' +
        '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
        '<div class="card-body"><h3>' + name + '</h3><span class="card-set-id">' + (champ.card_set_id || "") + '</span></div>' +
        '<button class="binder-remove" data-championclear="1">&times;</button>' +
      '</div>';
    } else {
      col.championKey = null;
      html += '<div class="deck-empty-slot deck-champion-placeholder">Elegi un Champion (parte del Main Deck)</div>';
    }
  } else {
    html += '<div class="deck-empty-slot deck-champion-placeholder">Elegi un Champion (parte del Main Deck)</div>';
  }
  html += '</div></div>';

  // ── Main Deck section ──
  const mainLimit = 40;
  html += '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Main Deck</h3><span class="deck-count">' + mainTotal + '/' + mainLimit + '</span></div><div class="deck-main-grid">';
  mainCards.forEach((c, i) => {
    const qty = c.quantity || 1;
    const full = c._key ? cartasMap[c._key] : null;
    const img = c.card_image || full?.card_image || "TUTCG.webp";
    const isChamp = c._key === championKey;
    const isValidChampion = full && isChampionMatch_legend(legend, full);
    let championBadgeHTML = "";
    if (isChamp) {
      championBadgeHTML = '<span class="deck-champion-badge" title="Chosen Champion">CHAMPION</span>';
    }
    let priceHTML = "";
    if (isSale) {
      const cp = c.customPrice != null ? c.customPrice : 0;
      priceHTML = '<div class="card-body" style="padding:var(--space-2)">' +
        '<div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + cp + '" data-mainprice="' + i + '"></div>' +
      '</div>';
    }
    html += '<div class="deck-card-slot" data-key="' + (c._key || "") + '" data-mainidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'">' +
        championBadgeHTML +
        '<span class="deck-card-qty">&times;' + qty + '</span>' +
      '</div>' +
      priceHTML +
      '<div style="display:flex;gap:4px;justify-content:center;margin-top:4px">' +
        (isChamp ? '' : (isValidChampion ? '<button class="btn-ghost btn-xs deck-champion-set-btn" data-championset="' + i + '" title="Elegir como Chosen Champion">Elegir Champion</button>' : '')) +
        '<button class="binder-remove" data-mainremove="' + i + '">&times;</button>' +
      '</div>' +
    '</div>';
  });
  if (mainTotal < mainLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="main">+ Agregar (' + (mainLimit - mainTotal) + ' libres)</div>';
  }
  html += '</div></div>';

  // ── Rune Deck section ──
  const runeLimit = 12;
  html += '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Rune Deck</h3><span class="deck-count">' + runesTotal + '/' + runeLimit + '</span></div><div class="deck-main-grid">';
  runes.forEach((c, i) => {
    const qty = c.quantity || 1;
    const full = c._key ? cartasMap[c._key] : null;
    const img = c.card_image || full?.card_image || "TUTCG.webp";
    html += '<div class="deck-card-slot" data-key="' + (c._key || "") + '" data-runeidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'">' +
        '<span class="deck-card-qty">&times;' + qty + '</span>' +
      '</div>' +
      '<button class="binder-remove" data-runeremove="' + i + '">&times;</button>' +
    '</div>';
  });
  if (runesTotal < runeLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="runes">+ Agregar (' + (runeLimit - runesTotal) + ' libres)</div>';
  }
  html += '</div></div>';

  // ── Battlefields section ──
  const bfLimit = 3;
  html += '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Battlefields</h3><span class="deck-count">' + battlefields.length + '/' + bfLimit + '</span></div><div class="deck-main-grid">';
  battlefields.forEach((bf, i) => {
    const full = bf._key ? cartasMap[bf._key] : null;
    const img = bf.card_image || full?.card_image || "TUTCG.webp";
    html += '<div class="deck-card-slot" data-key="' + (bf._key || "") + '" data-bfidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      '<button class="binder-remove" data-bfremove="' + i + '">&times;</button>' +
    '</div>';
  });
  if (battlefields.length < bfLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="battlefield">+ Agregar (' + (bfLimit - battlefields.length) + ' libres)</div>';
  }
  html += '</div></div>';

  // ── Sideboard section ──
  const sbLimit = 8;
  html += '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Sideboard</h3><span class="deck-count">' + sideboard.length + '/' + sbLimit + ' <span class="deck-optional">opcional</span></span></div><div class="deck-main-grid">';
  sideboard.forEach((sb, i) => {
    const full = sb._key ? cartasMap[sb._key] : null;
    const img = sb.card_image || full?.card_image || "TUTCG.webp";
    html += '<div class="deck-card-slot" data-key="' + (sb._key || "") + '" data-sbidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      '<button class="binder-remove" data-sbremove="' + i + '">&times;</button>' +
    '</div>';
  });
  if (sideboard.length < sbLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="sideboard">+ Agregar (' + (sbLimit - sideboard.length) + ' libres)</div>';
  }
  html += '</div></div>';

  html += '</div>'; // .deck-container
  grid.innerHTML = html;

  // ── Event handlers ──

  // Legend remove
  grid.querySelectorAll("[data-legendremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); col.legend = null; col.championKey = null; col.cards = []; col.runes = []; col.battlefields = []; saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Main deck remove
  grid.querySelectorAll("[data-mainremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-mainremove")); const entry = col.cards[i]; if (!entry) return; if (col.championKey === entry._key) col.championKey = null; if (entry.quantity > 1) entry.quantity--; else col.cards.splice(i, 1); saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Rune remove
  grid.querySelectorAll("[data-runeremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-runeremove")); const entry = col.runes[i]; if (!entry) return; if (entry.quantity > 1) entry.quantity--; else col.runes.splice(i, 1); saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Battlefield remove
  grid.querySelectorAll("[data-bfremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-bfremove")); col.battlefields.splice(i, 1); saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Sideboard remove
  grid.querySelectorAll("[data-sbremove]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); const i = parseInt(btn.getAttribute("data-sbremove")); col.sideboard.splice(i, 1); saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Chosen Champion clear
  grid.querySelectorAll("[data-championclear]").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); col.championKey = null; saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); });
  });

  // Chosen Champion set button
  grid.querySelectorAll("[data-championset]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const i = parseInt(btn.getAttribute("data-championset"));
      const entry = col.cards[i];
      if (!entry) return;
      const full = cartasMap[entry._key];
      if (!full) return;
      if (!isChampionMatch_legend(legend, full)) {
        alert("Este Champion no coincide con la Legend. Debe ser un Unit Champion con feature \"" + (legend?.feature || "") + "\".");
        return;
      }
      col.championKey = entry._key;
      saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
    });
  });

  // Image click → open modal
  grid.querySelectorAll(".deck-card-slot .card-img-wrap img, .deck-leader-card .card-img-wrap img, .deck-champion-card .card-img-wrap img").forEach(img => {
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
        mainCards.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      } else if (slot.hasAttribute("data-runeidx")) {
        const slotIdx = parseInt(slot.getAttribute("data-runeidx"));
        navList = []; startIdx = 0;
        runes.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      } else if (slot.hasAttribute("data-bfidx")) {
        const slotIdx = parseInt(slot.getAttribute("data-bfidx"));
        navList = []; startIdx = 0;
        battlefields.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      } else if (slot.hasAttribute("data-sbidx")) {
        const slotIdx = parseInt(slot.getAttribute("data-sbidx"));
        navList = []; startIdx = 0;
        sideboard.forEach((entry, i) => {
          const f = cartasMap[entry._key];
          if (f) { navList.push(f); if (i < slotIdx) startIdx++; }
        });
      }
      openCardInModal(carta, navList, startIdx);
    });
  });

  // Legend price
  grid.querySelectorAll("[data-legendprice]").forEach(inp => {
    inp.addEventListener("change", () => { if (col.legend) col.legend.customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });

  // Main prices
  grid.querySelectorAll("[data-mainprice]").forEach(inp => {
    inp.addEventListener("change", () => { const i = parseInt(inp.getAttribute("data-mainprice")); if (col.cards[i]) col.cards[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });

  // ── Picker triggers ──

  function pickLegend() {
    showDeckPicker_RB("legend").then(picked => {
      if (!picked) return;
      col.legend = { _key: getCardKey(picked), card_set_id: picked.card_set_id, card_name: picked.card_name, card_image: picked.card_image, card_color: picked.card_color, card_type: picked.card_type, set_id: picked.set_id, feature: picked.feature, customPrice: 0 };
      if (col.championKey) {
        const champCard = cartasMap[col.championKey];
        if (champCard && !isChampionMatch_legend(picked, champCard)) {
          col.championKey = null;
        }
      }
      col.cards = (col.cards || []).filter(c => {
        const full = cartasMap[c._key];
        if (!full) return false;
        return matchesLegendColors_legend(full, getLegendColors_legend(col.legend));
      });
      col.runes = (col.runes || []).filter(c => {
        const full = cartasMap[c._key];
        if (!full) return false;
        return matchesLegendColors_legend(full, getLegendColors_legend(col.legend));
      });
      saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
    });
  }

  const legendPlaceholder = grid.querySelector(".deck-legend-placeholder");
  if (legendPlaceholder) {
    legendPlaceholder.addEventListener("click", pickLegend);
    legendPlaceholder.style.cursor = "pointer";
  }

  const changeLegendBtn = document.getElementById("deckChangeLegendBtn");
  if (changeLegendBtn) changeLegendBtn.addEventListener("click", pickLegend);

  // Champion picker
  function pickChampion() {
    if (!col.legend) { alert("Primero elegi una Legend."); return; }
    var lColor = col.legend?.card_color || "";
    var lFeature = col.legend?.feature || "";
    showDeckPicker_RB("champion", lColor, [], "", null, 3, lFeature).then(function(picked) {
      if (!picked || !picked.length) return;
      if (!col.cards) col.cards = [];
      picked.forEach(function(c) {
        var key = getCardKey(c);
        var inDeck = col.cards.find(function(d) { return d._key === key; });
        if (inDeck) {
          var q = inDeck.quantity || 1;
          if (q < 3) inDeck.quantity++;
        } else {
          var mainTotal = col.cards.reduce(function(s, d) { return s + (d.quantity || 1); }, 0);
          if (mainTotal >= 40) return;
          var nameCount = col.cards.filter(function(d) { return d.card_name === c.card_name; }).reduce(function(s, d) { return s + (d.quantity || 1); }, 0);
          if (nameCount >= 3) return;
          col.cards.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
        }
      });
      col.championKey = getCardKey(picked[0]);
      saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
    });
  }

  const championPlaceholder = grid.querySelector(".deck-champion-placeholder");
  if (championPlaceholder) {
    championPlaceholder.addEventListener("click", pickChampion);
    championPlaceholder.style.cursor = "pointer";
  }

  const championCard = grid.querySelector(".deck-champion-card");
  if (championCard) championCard.style.cursor = "pointer";
  const championImg = grid.querySelector(".deck-champion-card .card-img-wrap");
  if (championImg) championImg.addEventListener("click", e => { e.stopPropagation(); pickChampion(); });

  // Main deck add
  grid.querySelectorAll("[data-add=\"main\"]").forEach(el => {
    el.addEventListener("click", async () => {
      if (!col.legend) { alert("Primero elegi una Legend."); return; }
      const lColor = col.legend?.card_color || "";
      const mainTotal = (col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0);
      const remaining = 40 - mainTotal;
      if (remaining <= 0) { alert("El Main Deck ya tiene 40 cartas."); return; }
      const lSetId = col.legend?.set_id || "";
      const existingCounts = countByName_legend(col.cards);
      const pickedArr = await showDeckPicker_RB("main", lColor, [], lSetId, existingCounts, remaining);
      if (pickedArr && pickedArr.length) {
        pickedArr.forEach(c => {
          const mainTotal = (col.cards || []).reduce((s, card) => s + (card.quantity || 1), 0);
          if (mainTotal >= 40) return;
          const key = getCardKey(c);
          const name = c.card_name;
          const nameCount = (col.cards || []).filter(card => card.card_name === name).reduce((sum, card) => sum + (card.quantity || 1), 0);
          if (nameCount >= 3) return;
          const existing = (col.cards || []).find(card => card._key === key);
          if (existing) {
            existing.quantity++;
          } else {
            col.cards = col.cards || [];
            col.cards.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
          }
        });
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  // Rune deck add
  grid.querySelectorAll("[data-add=\"runes\"]").forEach(el => {
    el.addEventListener("click", async () => {
      if (!col.legend) { alert("Primero elegi una Legend."); return; }
      const lColor = col.legend?.card_color || "";
      const runesTotal = (col.runes || []).reduce((s, c) => s + (c.quantity || 1), 0);
      const remaining = 12 - runesTotal;
      if (remaining <= 0) { alert("El Rune Deck ya tiene 12 cartas."); return; }
      const pickedArr = await showDeckPicker_RB("runes", lColor, [], "", null, remaining);
      if (pickedArr && pickedArr.length) {
        pickedArr.forEach(c => {
          const runesTotal = (col.runes || []).reduce((s, card) => s + (card.quantity || 1), 0);
          if (runesTotal >= 12) return;
          const key = getCardKey(c);
          const existing = (col.runes || []).find(r => r._key === key);
          if (existing) {
            existing.quantity++;
          } else {
            col.runes = col.runes || [];
            col.runes.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
          }
        });
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  // Battlefield add
  grid.querySelectorAll("[data-add=\"battlefield\"]").forEach(el => {
    el.addEventListener("click", async () => {
      const bfNames = new Set((col.battlefields || []).map(b => b.card_name));
      const remaining = 3 - (col.battlefields || []).length;
      if (remaining <= 0) { alert("Ya tenes 3 Battlefields."); return; }
      const existingKeys = (col.battlefields || []).map(b => b._key).filter(Boolean);
      const pickedArr = await showDeckPicker_RB("battlefield", "", existingKeys, "", null, remaining);
      if (pickedArr && pickedArr.length) {
        pickedArr.forEach(c => {
          if ((col.battlefields || []).length >= 3) return;
          if (bfNames.has(c.card_name)) return;
          col.battlefields = col.battlefields || [];
          col.battlefields.push({ _key: getCardKey(c), card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
          bfNames.add(c.card_name);
        });
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  // Sideboard add
  grid.querySelectorAll("[data-add=\"sideboard\"]").forEach(el => {
    el.addEventListener("click", async () => {
      const remaining = 8 - (col.sideboard || []).length;
      if (remaining <= 0) { alert("El Sideboard ya tiene 8 cartas."); return; }
      const existingKeys = (col.sideboard || []).map(s => s._key).filter(Boolean);
      const pickedArr = await showDeckPicker_RB("sideboard", "", existingKeys, "", null, remaining);
      if (pickedArr && pickedArr.length) {
        pickedArr.forEach(c => {
          if ((col.sideboard || []).length >= 8) return;
          col.sideboard = col.sideboard || [];
          col.sideboard.push({ _key: getCardKey(c), card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
        });
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    });
    el.style.cursor = "pointer";
  });

  // Legend img click for pick
  const legendImg = grid.querySelector(".deck-leader-card .card-img-wrap");
  if (legendImg) legendImg.addEventListener("click", e => { e.stopPropagation(); pickLegend(); });

  // Deck clear buttons
  const clearPageBtn = document.getElementById(isSale ? "ventaClearPageBtn" : "binderClearPageBtn");
  const clearAllBtn = document.getElementById(isSale ? "ventaClearAllBtn" : "binderClearAllBtn");
  if (clearPageBtn) {
    clearPageBtn.textContent = "Vaciar Main Deck";
    clearPageBtn.onclick = () => {
      if (!(col.cards || []).length) return;
      const total = (col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0);
      if (confirm("Vacia las " + total + " cartas del Main Deck?")) {
        col.cards = [];
        col.championKey = null;
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    };
  }
  if (clearAllBtn) {
    clearAllBtn.textContent = "Vaciar Runes";
    clearAllBtn.onclick = () => {
      if (!(col.runes || []).length) return;
      const total = (col.runes || []).reduce((s, c) => s + (c.quantity || 1), 0);
      if (confirm("Vacia las " + total + " Runes?")) {
        col.runes = [];
        saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer);
      }
    };
  }
}

function saveDeck_RB(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}
