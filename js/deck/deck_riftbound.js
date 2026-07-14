// ─── Riftbound Deck Builder ──────────────────────────────────────────────────
// Legend (1) + Main Deck (40, max 3 copias/nombre) + Rune Deck (12)
// Battlefields (3, nombres unicos) + Sideboard (0-8 opcional)
// + Chosen Champion (Unit Champion con mismo feature de la Legend)

function getLegendColors_RB(legend) {
  if (!legend || !legend.card_color) return [];
  return legend.card_color.split("/").map(s => s.trim()).filter(Boolean);
}

function matchesLegendColors_RB(card, legendColors) {
  if (!card || !card.card_color) return false;
  const cardColors = card.card_color.split("/").map(s => s.trim());
  return legendColors.some(lc => cardColors.includes(lc));
}

function isChampionMatch_RB(legend, card) {
  if (!legend || !card) return false;
  if (card.card_type !== "Unit") return false;
  if (card.attribute !== "Champion") return false;
  var legendFeature = legend.feature || "";
  var cardFeature = card.feature || "";
  if (cardFeature === legendFeature) return true;
  if (cardFeature.includes("/" + legendFeature + "/")) return true;
  if (cardFeature.endsWith("/" + legendFeature)) return true;
  if (cardFeature.startsWith(legendFeature + "/")) return true;
  return false;
}

function countByName_RB(cardsArr) {
  const counts = {};
  (cardsArr || []).forEach(c => {
    const name = c.card_name;
    counts[name] = (counts[name] || 0) + (c.quantity || 1);
  });
  return counts;
}

// ─── Deck Picker ───────────────────────────────────────────────────────────

function showDeckPicker_RB(mode, legendColor, existingKeys, legendSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys) {
  const isMulti = mode !== "legend";
  return new Promise(resolve => {
    try {
    _deckPickerResolve = resolve;
    const overlay = document.getElementById("deckPickerOverlay");
    if (!overlay) { resolve(isMulti ? [] : null); return; }
    const title = document.getElementById("deckPickerTitle");
    const grid = document.getElementById("deckPickerGrid");
    const search = document.getElementById("deckPickerSearch");
    let info = document.getElementById("deckPickerInfo");
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
    info = document.getElementById("deckPickerInfo");
    const cancelBtn = document.getElementById("deckPickerCancel");
    overlay.style.display = "flex";
    setTimeout(() => search.focus(), 100);
    const legendColors = legendColor ? legendColor.split("/").map(s => s.trim()).filter(Boolean) : [];

    function getFiltered() {
      if (mode === "legend") return (cartas || []).filter(c => c.card_type === "Legend");
      if (mode === "main") {
        let base = (cartas || []).filter(c =>
          (c.card_type === "Unit" || c.card_type === "Spell" || c.card_type === "Gear") &&
          c.attribute !== "Champion"
        );
        if (existingCounts) {
          base = base.filter(c => {
            const existCount = existingCounts[c.card_name] || 0;
            return existCount < 3;
          });
        }
        if (legendColors.length) {
          base = base.filter(c => {
            if (!c.card_color) return false;
            const cardColors = c.card_color.split("/").map(s => s.trim());
            return legendColors.some(lc => cardColors.includes(lc));
          });
        }
        if (legendSetId) {
          base.sort((a, b) => {
            const aMatch = a.set_id === legendSetId ? 0 : 1;
            const bMatch = b.set_id === legendSetId ? 0 : 1;
            return aMatch - bMatch;
          });
        }
        return base;
      }
      if (mode === "runes") {
        let base = (cartas || []).filter(c => c.card_type === "Rune");
        if (legendColors.length) {
          base = base.filter(c => {
            if (!c.card_color) return false;
            return legendColors.some(lc => c.card_color.includes(lc));
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
        if (legendColors.length) {
          base = base.filter(function(c) {
            return matchesLegendColors_RB(c, legendColors);
          });
        }
        if (legendFeature) {
          base = base.filter(function(c) {
            var feat = c.feature || "";
            if (feat === legendFeature) return true;
            if (feat.includes("/" + legendFeature + "/")) return true;
            if (feat.endsWith("/" + legendFeature)) return true;
            if (feat.startsWith(legendFeature + "/")) return true;
            return false;
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
        grid.innerHTML = '<div class="deck-picker-empty">No hay cartas disponibles (' + mode + ')' + (legendColor ? " para color " + legendColor : "") + '</div>';
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
            if (mode === "main" || mode === "champion") {
              var _nameSel = 0;
              Object.keys(selectedCounts).forEach(function(k) {
                var sc = mode === "main" ? cartas.find(function(cc) { return cc.card_set_id === k; }) : cartas.find(function(cc) { return getCardKey(cc) === k; });
                if (sc && sc.card_name === c.card_name) _nameSel += selectedCounts[k];
              });
              var _existQty = (existingCounts && existingCounts[c.card_name] || 0);
              if (_existQty + _nameSel >= 3) return;
            }
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
            if (mode === "main" || mode === "champion") {
              var _cardInc = mode === "main" ? cartas.find(function(c2) { return c2.card_set_id === key; }) : cartas.find(function(c2) { return getCardKey(c2) === key; });
              var _cardName = _cardInc ? _cardInc.card_name : "";
              var _existQty = existingCounts ? (existingCounts[_cardName] || 0) : 0;
              var _ns = 0;
              Object.keys(selectedCounts).forEach(function(k) {
                var sc = mode === "main" ? cartas.find(function(cc) { return cc.card_set_id === k; }) : cartas.find(function(cc) { return getCardKey(cc) === k; });
                if (sc && sc.card_name === _cardName) _ns += selectedCounts[k];
              });
              if (_existQty + _ns >= 3) return;
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

// ─── Deck View Helpers ─────────────────────────────────────────────────────

function _rbBuildLegendHTML(legend, isSale) {
  var html = '<div class="deck-section deck-leader-section"><h3 class="deck-section-title">Legend</h3><div class="deck-leader-slot">';
  if (legend) {
    const full = legend._key ? cartasMap[legend._key] : null;
    const img = legend.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    const name = legend.card_name || (full ? full.card_name : "") || "";
    const color = legend.card_color || (full ? full.card_color : "") || "";
    const feature = legend.feature || (full ? full.feature : "") || "";
    const cp = legend.customPrice != null ? legend.customPrice : 0;
    html += '<div class="deck-leader-card" data-key="' + (legend._key || "") + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      '<div class="card-body"><h3>' + name + '</h3>' +
      '<span class="card-set-id">' + (color || "") + (feature ? " \u00b7 " + feature : "") + '</span>';
    if (isSale) {
      html += '<div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + cp + '" data-legendprice="1"></div>';
    }
    html += '</div></div><button class="btn-ghost btn-xs" id="deckChangeLegendBtn">Cambiar Legend</button>';
  } else {
    html += '<div class="deck-empty-slot deck-leader-placeholder deck-legend-placeholder">Elegi una Legend</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbBuildChampionHTML(champions, isSale) {
  var html = '<div class="deck-section"><h3 class="deck-section-title">Chosen Champion' + (champions.length ? ' (' + champions.length + (champions.length >= 3 ? '/3' : '') + ')' : '') + '</h3><div class="deck-champion-slot">';
  champions.forEach(function(champ, ci) {
    const full = champ._key ? cartasMap[champ._key] : null;
    const img = champ.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    const name = champ.card_name || (full ? full.card_name : "") || "";
    const qty = champ.quantity || 1;
    const ccp = champ.customPrice != null ? champ.customPrice : 0;
    html += '<div class="deck-champion-card" data-key="' + (champ._key || "") + '" data-championidx="' + ci + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'">' +
        (qty > 1 ? '<span class="deck-card-qty">&times;' + qty + '</span>' : '') +
      '</div>' +
      '<div class="card-body"><h3>' + name + '</h3><span class="card-set-id">' + (champ.card_set_id || "") + '</span>' +
        (isSale ? '<div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + ccp + '" data-championprice="' + ci + '"></div>' : '') +
      '</div>' +
      '<button class="binder-remove" data-championremove="' + ci + '">&times;</button>' +
    '</div>';
  });
  if (champions.length) {
    html += '<button class="btn-ghost btn-xs" id="deckChangeChampionBtn" style="display:block;margin-top:var(--space-2)">Cambiar Champions</button>';
  } else {
    html += '<div class="deck-empty-slot deck-champion-placeholder">Elegi Champions</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbBuildMainDeckHTML(mainCards, championsTotal, mainLimit, isSale) {
  var combinedTotal = championsTotal + mainCards.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  var html = '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Main Deck</h3><span class="deck-count">' + combinedTotal + '/' + mainLimit + '</span></div><div class="deck-main-grid">';
  mainCards.forEach(function(c, i) {
    var qty = c.quantity || 1;
    var full = c._key ? cartasMap[c._key] : null;
    var img = c.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    var priceHTML = "";
    if (isSale) {
      var cp = c.customPrice != null ? c.customPrice : 0;
      priceHTML = '<div class="card-body" style="padding:var(--space-2)"><div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + cp + '" data-mainprice="' + i + '"></div></div>';
    }
    html += '<div class="deck-card-slot" data-key="' + (c._key || "") + '" data-mainidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"><span class="deck-card-qty">&times;' + qty + '</span></div>' +
      priceHTML +
      '<div style="display:flex;gap:4px;justify-content:center;margin-top:4px"><button class="binder-remove" data-mainremove="' + i + '">&times;</button></div></div>';
  });
  if (combinedTotal < mainLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="main">+ Agregar (' + (mainLimit - combinedTotal) + ' libres)</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbBuildRuneHTML(runes, runesTotal, runeLimit, isSale) {
  var html = '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Rune Deck</h3><span class="deck-count">' + runesTotal + '/' + runeLimit + '</span></div><div class="deck-main-grid">';
  runes.forEach(function(c, i) {
    var qty = c.quantity || 1;
    var full = c._key ? cartasMap[c._key] : null;
    var img = c.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    var rcp = c.customPrice != null ? c.customPrice : 0;
    html += '<div class="deck-card-slot" data-key="' + (c._key || "") + '" data-runeidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"><span class="deck-card-qty">&times;' + qty + '</span></div>' +
      (isSale ? '<div class="card-body" style="padding:var(--space-2)"><div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + rcp + '" data-runeprice="' + i + '"></div></div>' : '') +
      '<button class="binder-remove" data-runeremove="' + i + '">&times;</button></div>';
  });
  if (runesTotal < runeLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="runes">+ Agregar (' + (runeLimit - runesTotal) + ' libres)</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbBuildBattlefieldHTML(battlefields, bfLimit, isSale) {
  var html = '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Battlefields</h3><span class="deck-count">' + battlefields.length + '/' + bfLimit + '</span></div><div class="deck-main-grid">';
  battlefields.forEach(function(bf, i) {
    var full = bf._key ? cartasMap[bf._key] : null;
    var img = bf.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    var bcp = bf.customPrice != null ? bf.customPrice : 0;
    html += '<div class="deck-card-slot" data-key="' + (bf._key || "") + '" data-bfidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      (isSale ? '<div class="card-body" style="padding:var(--space-2)"><div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + bcp + '" data-bfprice="' + i + '"></div></div>' : '') +
      '<button class="binder-remove" data-bfremove="' + i + '">&times;</button></div>';
  });
  if (battlefields.length < bfLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="battlefield">+ Agregar (' + (bfLimit - battlefields.length) + ' libres)</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbBuildSideboardHTML(sideboard, champions, sbLimit, isSale) {
  var html = '<div class="deck-section"><div class="deck-section-title-row"><h3 class="deck-section-title">Sideboard</h3><span class="deck-count">' + sideboard.length + '/' + sbLimit + ' <span class="deck-optional">opcional</span></span></div><div class="deck-main-grid">';
  sideboard.forEach(function(sb, i) {
    var full = sb._key ? cartasMap[sb._key] : null;
    var img = sb.card_image || (full ? full.card_image : null) || "TUTCG.webp";
    var scp = sb.customPrice != null ? sb.customPrice : 0;
    html += '<div class="deck-card-slot" data-key="' + (sb._key || "") + '" data-sbidx="' + i + '">' +
      '<div class="card-img-wrap"><img src="' + img + '" onerror="this.src=\'TUTCG.webp\'"></div>' +
      (isSale ? '<div class="card-body" style="padding:var(--space-2)"><div class="venta-price-row"><span class="venta-price-label">Precio:</span><span class="venta-price-prefix">$</span><input type="number" class="venta-price-input" step="0.5" min="0" value="' + scp + '" data-sbprice="' + i + '"></div></div>' : '') +
      '<button class="binder-remove" data-sbremove="' + i + '">&times;</button></div>';
  });
  if (champions.length > 0 && sideboard.length < sbLimit) {
    html += '<div class="deck-add-more-btn deck-empty-slot" data-add="sideboard">+ Agregar (' + (sbLimit - sideboard.length) + ' libres)</div>';
  } else if (champions.length === 0) {
    html += '<div class="deck-empty-slot" style="grid-column:1/-1;text-align:center;padding:var(--space-6);color:var(--text-muted);font-size:var(--text-sm)">Elegi un Champion para habilitar el Sideboard</div>';
  }
  html += '</div></div>';
  return html;
}

function _rbAttachDeckEvents(grid, col, isSale, reRender, champions, mainCards, runes, battlefields, sideboard) {
  var g = grid;

  g.querySelectorAll("[data-mainremove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); var i = parseInt(btn.getAttribute("data-mainremove")); var entry = col.cards[i]; if (!entry) return; if (entry.quantity > 1) entry.quantity--; else col.cards.splice(i, 1); reRender(); });
  });
  g.querySelectorAll("[data-championremove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); var i = parseInt(btn.getAttribute("data-championremove")); var entry = (col.champions || [])[i]; if (!entry) return; if (entry.quantity > 1) entry.quantity--; else col.champions.splice(i, 1); reRender(); });
  });
  g.querySelectorAll("[data-runeremove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); var i = parseInt(btn.getAttribute("data-runeremove")); var entry = col.runes[i]; if (!entry) return; if (entry.quantity > 1) entry.quantity--; else col.runes.splice(i, 1); reRender(); });
  });
  g.querySelectorAll("[data-bfremove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); var i = parseInt(btn.getAttribute("data-bfremove")); col.battlefields.splice(i, 1); reRender(); });
  });
  g.querySelectorAll("[data-sbremove]").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); var i = parseInt(btn.getAttribute("data-sbremove")); col.sideboard.splice(i, 1); reRender(); });
  });

  var imgSelector = ".deck-card-slot .card-img-wrap img, .deck-leader-card .card-img-wrap img, .deck-champion-card .card-img-wrap img";
  g.querySelectorAll(imgSelector).forEach(function(img) {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      var slot = this.closest("[data-key]");
      if (!slot) return;
      var key = slot.getAttribute("data-key");
      var carta = key ? cartasMap[key] : null;
      if (!carta) return;
      var navList = null, startIdx;
      if (slot.hasAttribute("data-mainidx")) {
        var si = parseInt(slot.getAttribute("data-mainidx"));
        navList = []; startIdx = 0;
        mainCards.forEach(function(entry, i) { var f = cartasMap[entry._key]; if (f) { navList.push(f); if (i < si) startIdx++; } });
      } else if (slot.hasAttribute("data-runeidx")) {
        var si = parseInt(slot.getAttribute("data-runeidx"));
        navList = []; startIdx = 0;
        runes.forEach(function(entry, i) { var f = cartasMap[entry._key]; if (f) { navList.push(f); if (i < si) startIdx++; } });
      } else if (slot.hasAttribute("data-bfidx")) {
        var si = parseInt(slot.getAttribute("data-bfidx"));
        navList = []; startIdx = 0;
        battlefields.forEach(function(entry, i) { var f = cartasMap[entry._key]; if (f) { navList.push(f); if (i < si) startIdx++; } });
      } else if (slot.hasAttribute("data-sbidx")) {
        var si = parseInt(slot.getAttribute("data-sbidx"));
        navList = []; startIdx = 0;
        sideboard.forEach(function(entry, i) { var f = cartasMap[entry._key]; if (f) { navList.push(f); if (i < si) startIdx++; } });
      } else if (slot.hasAttribute("data-championidx")) {
        var si = parseInt(slot.getAttribute("data-championidx"));
        navList = []; startIdx = 0;
        champions.forEach(function(entry, i) { var f = cartasMap[entry._key]; if (f) { navList.push(f); if (i < si) startIdx++; } });
      }
      openCardInModal(carta, navList, startIdx);
    });
  });

  g.querySelectorAll("[data-legendprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { if (col.legend) col.legend.customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });
  g.querySelectorAll("[data-mainprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { var i = parseInt(inp.getAttribute("data-mainprice")); if (col.cards[i]) col.cards[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });
  g.querySelectorAll("[data-championprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { var i = parseInt(inp.getAttribute("data-championprice")); if (col.champions && col.champions[i]) col.champions[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });
  g.querySelectorAll("[data-runeprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { var i = parseInt(inp.getAttribute("data-runeprice")); if (col.runes && col.runes[i]) col.runes[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });
  g.querySelectorAll("[data-bfprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { var i = parseInt(inp.getAttribute("data-bfprice")); if (col.battlefields && col.battlefields[i]) col.battlefields[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });
  g.querySelectorAll("[data-sbprice]").forEach(function(inp) {
    inp.addEventListener("change", function() { var i = parseInt(inp.getAttribute("data-sbprice")); if (col.sideboard && col.sideboard[i]) col.sideboard[i].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value); saveDeck_RB(isSale); });
  });

  (function attachPickerTriggers() {
    function pickLegend() {
      showDeckPicker_RB("legend").then(function(picked) {
        if (!picked) return;
        col.legend = { _key: getCardKey(picked), card_set_id: picked.card_set_id, card_name: picked.card_name, card_image: picked.card_image, card_color: picked.card_color, card_type: picked.card_type, set_id: picked.set_id, feature: picked.feature, customPrice: 0 };
        col.champions = (col.champions || []).filter(function(ch) {
          var full = cartasMap[ch._key];
          if (!full) return false;
          return isChampionMatch_RB(col.legend, full) && matchesLegendColors_RB(full, getLegendColors_RB(col.legend));
        });
        col.cards = (col.cards || []).filter(function(c) {
          var full = cartasMap[c._key];
          if (!full) return false;
          return matchesLegendColors_RB(full, getLegendColors_RB(col.legend));
        });
        col.runes = (col.runes || []).filter(function(c) {
          var full = cartasMap[c._key];
          if (!full) return false;
          return matchesLegendColors_RB(full, getLegendColors_RB(col.legend));
        });
        reRender();
      });
    }
    var legendPlaceholder = g.querySelector(".deck-legend-placeholder");
    if (legendPlaceholder) { legendPlaceholder.addEventListener("click", pickLegend); legendPlaceholder.style.cursor = "pointer"; }
    var changeLegendBtn = document.getElementById("deckChangeLegendBtn");
    if (changeLegendBtn) changeLegendBtn.addEventListener("click", pickLegend);

    function pickChampion() {
      if (!col.legend) { alert("Primero elegi una Legend."); return; }
      var lColor = col.legend.card_color || "";
      var lFeature = col.legend.feature || "";
      showDeckPicker_RB("champion", lColor, [], "", null, 3, lFeature).then(function(picked) {
        if (!picked || !picked.length) return;
        col.champions = [];
        picked.forEach(function(c) {
          var key = getCardKey(c);
          var existing = col.champions.find(function(ch) { return ch._key === key; });
          if (existing) { existing.quantity = Math.min((existing.quantity || 1) + 1, 3); }
          else { if (col.champions.length >= 3) return; col.champions.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, attribute: "Champion", customPrice: 0 }); }
        });
        reRender();
      });
    }
    var championPlaceholder = g.querySelector(".deck-champion-placeholder");
    if (championPlaceholder) { championPlaceholder.addEventListener("click", pickChampion); championPlaceholder.style.cursor = "pointer"; }
    g.querySelectorAll(".deck-champion-card .card-img-wrap").forEach(function(imgWrap) {
      imgWrap.addEventListener("click", function(e) { e.stopPropagation(); pickChampion(); });
    });
    g.querySelectorAll(".deck-champion-card").forEach(function(champCard) {
      champCard.style.cursor = "pointer";
      champCard.addEventListener("click", function(e) {
        if (e.target.closest(".binder-remove") || e.target.closest(".card-img-wrap")) return;
        var key = champCard.getAttribute("data-key");
        var carta = key ? cartasMap[key] : null;
        if (carta) openCardInModal(carta);
      });
    });
    var changeChampionBtn = document.getElementById("deckChangeChampionBtn");
    if (changeChampionBtn) changeChampionBtn.addEventListener("click", function() { pickChampion(); });

    g.querySelectorAll("[data-add=\"main\"]").forEach(function(el) {
      el.addEventListener("click", async function() {
        if (!col.legend) { alert("Primero elegi una Legend."); return; }
        var lColor = col.legend.card_color || "";
        var champsTotal = (col.champions || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
        var mTotal = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
        var remaining = 40 - champsTotal - mTotal;
        if (remaining <= 0) { alert("El Main Deck ya tiene 40 cartas."); return; }
        var lSetId = col.legend.set_id || "";
        var existingCounts = countByName_RB(col.cards);
        var pickedArr = await showDeckPicker_RB("main", lColor, [], lSetId, existingCounts, remaining);
        if (pickedArr && pickedArr.length) {
          pickedArr.forEach(function(c) {
            var ct = (col.champions || []).reduce(function(s, cc) { return s + (cc.quantity || 1); }, 0);
            var mt = (col.cards || []).reduce(function(s, card) { return s + (card.quantity || 1); }, 0);
            if (ct + mt >= 40) return;
            var key = getCardKey(c);
            var name = c.card_name;
            var nameCount = (col.cards || []).filter(function(card) { return card.card_name === name; }).reduce(function(sum, card) { return sum + (card.quantity || 1); }, 0);
            if (nameCount >= 3) return;
            var existing = (col.cards || []).find(function(card) { return card._key === key; });
            if (existing) { existing.quantity++; }
            else { col.cards = col.cards || []; col.cards.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, attribute: c.attribute, customPrice: 0 }); }
          });
          reRender();
        }
      });
      el.style.cursor = "pointer";
    });

    g.querySelectorAll("[data-add=\"runes\"]").forEach(function(el) {
      el.addEventListener("click", async function() {
        if (!col.legend) { alert("Primero elegi una Legend."); return; }
        var lColor = col.legend.card_color || "";
        var runesTotal = (col.runes || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
        var remaining = 12 - runesTotal;
        if (remaining <= 0) { alert("El Rune Deck ya tiene 12 cartas."); return; }
        var pickedArr = await showDeckPicker_RB("runes", lColor, [], "", null, remaining);
        if (pickedArr && pickedArr.length) {
          pickedArr.forEach(function(c) {
            var rt = (col.runes || []).reduce(function(s, card) { return s + (card.quantity || 1); }, 0);
            if (rt >= 12) return;
            var key = getCardKey(c);
            var existing = (col.runes || []).find(function(r) { return r._key === key; });
            if (existing) { existing.quantity++; }
            else { col.runes = col.runes || []; col.runes.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 }); }
          });
          reRender();
        }
      });
      el.style.cursor = "pointer";
    });

    g.querySelectorAll("[data-add=\"battlefield\"]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var bfNames = new Set((col.battlefields || []).map(function(b) { return b.card_name; }));
        var remaining = 3 - (col.battlefields || []).length;
        if (remaining <= 0) { alert("Ya tenes 3 Battlefields."); return; }
        var existingKeys = (col.battlefields || []).map(function(b) { return b._key; }).filter(Boolean);
        var pickedArr = await showDeckPicker_RB("battlefield", "", existingKeys, "", null, remaining);
        if (pickedArr && pickedArr.length) {
          pickedArr.forEach(function(c) {
            if ((col.battlefields || []).length >= 3) return;
            if (bfNames.has(c.card_name)) return;
            col.battlefields = col.battlefields || [];
            col.battlefields.push({ _key: getCardKey(c), card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
            bfNames.add(c.card_name);
          });
          reRender();
        }
      });
      el.style.cursor = "pointer";
    });

    g.querySelectorAll("[data-add=\"sideboard\"]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var remaining = 8 - (col.sideboard || []).length;
        if (remaining <= 0) { alert("El Sideboard ya tiene 8 cartas."); return; }
        var existingKeys = (col.sideboard || []).map(function(s) { return s._key; }).filter(Boolean);
        var pickedArr = await showDeckPicker_RB("sideboard", "", existingKeys, "", null, remaining);
        if (pickedArr && pickedArr.length) {
          pickedArr.forEach(function(c) {
            if ((col.sideboard || []).length >= 8) return;
            col.sideboard = col.sideboard || [];
            col.sideboard.push({ _key: getCardKey(c), card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
          });
          reRender();
        }
      });
      el.style.cursor = "pointer";
    });

    var legendImg = g.querySelector(".deck-leader-card .card-img-wrap");
    if (legendImg) legendImg.addEventListener("click", function(e) { e.stopPropagation(); pickLegend(); });
  })();

  var clearPageBtn = document.getElementById(isSale ? "ventaClearPageBtn" : "binderClearPageBtn");
  var clearAllBtn = document.getElementById(isSale ? "ventaClearAllBtn" : "binderClearAllBtn");
  if (clearPageBtn) {
    clearPageBtn.textContent = "Vaciar Main Deck";
    clearPageBtn.onclick = function() {
      var chTotal = (col.champions || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
      var mainTot = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
      if (!chTotal && !mainTot) return;
      if (confirm("Vacia las " + (chTotal + mainTot) + " cartas del Main Deck (incluyendo Champions)?")) { col.cards = []; col.champions = []; reRender(); }
    };
  }
  if (clearAllBtn) {
    clearAllBtn.textContent = "Vaciar Runes";
    clearAllBtn.onclick = function() {
      if (!(col.runes || []).length) return;
      var total = (col.runes || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
      if (confirm("Vacia las " + total + " Runes?")) { col.runes = []; reRender(); }
    };
  }
}

// ─── Deck View ─────────────────────────────────────────────────────────────

function renderDeckView_RB(type, col, grid, title, toggleContainer) {
  var isSale = type === "sale";
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? '<label class="public-toggle"><span class="public-toggle-label ' + (!col.is_public ? "active" : "") + '">Privado</span><input type="checkbox" id="' + (isSale ? "venta" : "binder") + 'PublicCheck" ' + (col.is_public ? "checked" : "") + '><span class="public-toggle-track"><span class="public-toggle-thumb"></span></span><span class="public-toggle-label ' + (col.is_public ? "active" : "") + '">Publico</span></label>' : "";
    var chk = document.getElementById(isSale ? "ventaPublicCheck" : "binderPublicCheck");
    if (chk) chk.onchange = function() { toggleBinderPublic(isSale ? currentVentaId : currentCollectionId); };
  }

  var legend = col.legend;
  var champions = col.champions || [];
  var mainCards = (col.cards || []).filter(function(c) {
    var full = c._key ? cartasMap[c._key] : null;
    return !(full && full.card_type === "Unit" && full.attribute === "Champion");
  });
  var runes = col.runes || [];
  var battlefields = col.battlefields || [];
  var sideboard = col.sideboard || [];

  var championsTotal = champions.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  var mainTotal = mainCards.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  var runesTotal = runes.reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  var totalCards = (legend ? 1 : 0) + championsTotal + mainTotal + runesTotal + battlefields.length + sideboard.length;

  title.textContent = col.name + " (" + totalCards + " cartas)";

  var mainLimit = 40, runeLimit = 12, bfLimit = 3, sbLimit = 8;

  grid.innerHTML = '<div class="deck-container">' +
    _rbBuildLegendHTML(legend, isSale) +
    _rbBuildChampionHTML(champions, isSale) +
    _rbBuildMainDeckHTML(mainCards, championsTotal, mainLimit, isSale) +
    _rbBuildRuneHTML(runes, runesTotal, runeLimit, isSale) +
    _rbBuildBattlefieldHTML(battlefields, bfLimit, isSale) +
    _rbBuildSideboardHTML(sideboard, champions, sbLimit, isSale) +
    '</div>';

  var reRender = function() { saveDeck_RB(isSale); renderDeckView_RB(type, col, grid, title, toggleContainer); };
  _rbAttachDeckEvents(grid, col, isSale, reRender, champions, mainCards, runes, battlefields, sideboard);
}

function saveDeck_RB(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}
