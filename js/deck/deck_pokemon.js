// ─── Deck Pokémon ──────────────────────────────────────────────────────────
// PK deck: 60 cartas, 4 copias máx por card_name, sin líder/legend/DON.

function showDeckPicker_PK(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots) {
  var maxSlots = remainingSlots != null ? remainingSlots : 60;
  return new Promise(function(resolve) {
    try {
      _deckPickerResolve = resolve;
      const overlay = document.getElementById("deckPickerOverlay");
      if (!overlay) { resolve([]); return; }
      const title = document.getElementById("deckPickerTitle");
      const grid = document.getElementById("deckPickerGrid");
      const search = document.getElementById("deckPickerSearch");
      const footer = document.querySelector(".deck-picker-footer");
      if (!footer) { resolve([]); return; }
      search.value = "";
      const selectedCounts = {};
      const selectedPerKey = {};
      footer.innerHTML = `
        <span id="deckPickerInfo" class="deck-picker-info"></span>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn-ghost" id="deckPickerCancel">${t("deck.picker_cancel")}</button>
          <button class="btn-primary btn-sm" id="deckPickerConfirm">${t("deck.picker_add")}</button>
        </div>`;
      const confirmBtn = document.getElementById("deckPickerConfirm");
      const cancelBtn = document.getElementById("deckPickerCancel");
      const info = document.getElementById("deckPickerInfo");
      overlay.style.display = "flex";
      setTimeout(() => search.focus(), 100);
      const existing = new Set(existingKeys || []);
      function getFiltered() {
        const deckCards = (cartas || []).filter(c => c.language === "en");
        return deckCards.filter(c => c.card_type === "Pokémon" || c.card_type === "Trainer" || c.card_type === "Energy");
      }
      title.textContent = t("deck.pk_picker_title");
      function updateInfo() {
        const total = Object.values(selectedCounts).reduce((s, c) => s + c, 0);
        info.textContent = t("deck.pk_picker_info", { total: total, max: maxSlots });
        if (confirmBtn) confirmBtn.disabled = total === 0;
      }
      function renderPicker(query) {
        const q = (query || "").toLowerCase().trim();
        let results = getFiltered();
        if (results.length === 0 && !q) {
          grid.innerHTML = '<div class="deck-picker-empty">' + t("deck.picker_empty_plain") + '</div>';
          updateInfo();
          return;
        }
        if (q) {
          results = fuzzySearch(results, q, ['card_name', 'card_set_id', 'set_name']);
        }
        grid.innerHTML = "";
        if (!results.length) {
          grid.innerHTML = '<div class="deck-picker-empty">' + t("deck.picker_no_results") + '</div>';
          updateInfo();
          return;
        }
        results.forEach(c => {
          const cardKey = getCardKey(c);
          const selectedQty = selectedCounts[c.card_name] || 0;
          const existingQty = (existingCounts && existingCounts[c.card_name]) || 0;
          const isSelected = selectedQty > 0;
          const div = document.createElement("div");
          div.className = "card deck-pick-card" + (isSelected ? " selected" : "");
          div.setAttribute("data-cardkey", cardKey);
          let checkHTML = isSelected ? '<span class="deck-pick-check">' + selectedQty + '</span>' : "";
          let controlsHTML = "";
          if (isSelected) {
            controlsHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px">
              <button class="deck-pick-qty-btn" data-action="decr" data-name="${escapeAttr(c.card_name)}" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">&minus;</button>
              <span style="font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--accent);font-family:var(--font-mono);min-width:20px;text-align:center">${selectedQty}</span>
              <button class="deck-pick-qty-btn" data-action="incr" data-name="${escapeAttr(c.card_name)}" style="width:28px;height:28px;border-radius:50%;background:rgba(0,240,255,0.1);color:var(--accent);font-size:16px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,240,255,0.3);cursor:pointer">+</button>
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
              ${existingQty > 0 ? `<div style="font-size:var(--text-xs);color:var(--text-muted);font-family:var(--font-mono)">${t("deck.picker_in_deck", { n: existingQty })}</div>` : ""}
              ${controlsHTML}
            </div>`;
          div.addEventListener("click", () => {
            const selectedQtyCur = selectedCounts[c.card_name] || 0;
            const totalSelected = Object.values(selectedCounts).reduce((s, x) => s + x, 0);
            if (existingQty + selectedQtyCur >= 4) return;
            if (totalSelected >= maxSlots) return;
            selectedCounts[c.card_name] = selectedQtyCur + 1;
            selectedPerKey[cardKey] = (selectedPerKey[cardKey] || 0) + 1;
            updateInfo();
            const st = grid.scrollTop;
            renderPicker(search.value);
            grid.scrollTop = st;
          });
          grid.appendChild(div);
        });
        updateInfo();
        grid.querySelectorAll(".deck-pick-qty-btn").forEach(btn => {
          btn.addEventListener("click", e => {
            e.stopPropagation();
            const name = btn.getAttribute("data-name");
            if (!name) return;
            const totalSelected = Object.values(selectedCounts).reduce((s, x) => s + x, 0);
            const current = selectedCounts[name] || 0;
            if (btn.getAttribute("data-action") === "incr") {
              if (existingQty + current >= 4) return;
              if (totalSelected >= maxSlots) return;
              selectedCounts[name] = current + 1;
            } else {
              if (current <= 1) delete selectedCounts[name];
              else selectedCounts[name] = current - 1;
            }
            updateInfo();
            const st = grid.scrollTop;
            renderPicker(search.value);
            grid.scrollTop = st;
          });
        });
      }
      search.oninput = () => renderPicker(search.value);
      search.onkeydown = (e) => {
        if (e.key === "Escape") { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve([]); }
      };
      cancelBtn.onclick = () => { overlay.style.display = "none"; _deckPickerResolve = null; if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; } resolve([]); };
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
      if (!cartas || !cartas.length) {
        if (typeof skeletonCardGrid === 'function') skeletonCardGrid(grid, 10); else grid.innerHTML = '<div class="deck-picker-empty">' + t("deck.picker_loading") + '</div>';
        updateInfo();
        let retries = 0;
        const retry = setInterval(() => {
          if (cartas && cartas.length) { clearInterval(retry); _deckPickerInterval = null; renderPicker(""); }
          else if (++retries > 20) { clearInterval(retry); _deckPickerInterval = null; grid.innerHTML = '<div class="deck-picker-empty">' + t("deck.picker_error") + '</div>'; }
        }, 500);
        _deckPickerInterval = retry;
      } else {
        renderPicker("");
      }
    } catch (e) { console.error("PK Deck picker error:", e); resolve([]); }
  });
}

function _pkBuildDeckHTML(cards, isSale) {
  var html = "";
  var cardCount = (cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  html += '<div class="deck-section"><div class="deck-section-header"><span class="deck-section-title">' + t("deck.pk_main_title") + '</span><span class="deck-section-count">' + t("deck.count", { a: cardCount, b: 60 }) + '</span></div><div class="deck-card-grid" id="deckMainGrid">';
  (cards || []).forEach(function(c) {
    var full = c._key ? (cartasMap[c._key] || c) : c;
    var priceHTML = isSale ? '<div class="deck-card-price"><span>$</span><input type="number" class="deck-price-input" step="0.5" min="0" value="' + (c.customPrice != null ? c.customPrice : 0) + '" data-key="' + (c._key || "") + '"></div>' : "";
    html += '<div class="deck-card" data-key="' + (c._key || "") + '"><div class="deck-card-img-wrap"><img src="' + (c.card_image || full.card_image || "TUTCG.webp") + '" onerror="this.src=\'TUTCG.webp\'"></div><div class="deck-card-info"><span class="deck-card-name">' + (c.card_name || full.card_name || "") + '</span><span class="deck-card-qty">x' + (c.quantity || 1) + '</span></div>' + priceHTML + '<button class="deck-card-remove" data-key="' + (c._key || "") + '">&times;</button></div>';
  });
  while (cardCount < 60) {
    html += '<div class="deck-card deck-card-empty deck-add-slot">+</div>';
    cardCount++;
  }
  html += '</div></div>';
  return html;
}

function renderDeckView_PK(type, col, grid, title, toggleContainer) {
  if (!grid || !col) return;
  grid.innerHTML = "";
  var isSale = type === "sale";
  var isCollection = type === "collection";

  title.textContent = col.name || t("deck.pk_default_title");
  if (toggleContainer) {
    toggleContainer.innerHTML = '<button class="deck-io-btn deck-io-export">' + t("deck.export") + '</button><button class="deck-io-btn deck-io-import">' + t("deck.import") + '</button>' + (typeof isAuthenticated === "function" && isAuthenticated() ? '<label class="public-toggle"><span class="public-toggle-label ' + (!col.is_public ? "active" : "") + '">' + t("deck.private") + '</span><input type="checkbox" id="deckPublicCheck" ' + (col.is_public ? "checked" : "") + '><span class="public-toggle-track"><span class="public-toggle-thumb"></span></span><span class="public-toggle-label ' + (col.is_public ? "active" : "") + '">' + t("deck.public") + '</span></label>' : "");
    var deckExBtn = toggleContainer.querySelector(".deck-io-export");
    if (deckExBtn) deckExBtn.onclick = function() { if (typeof exportDeckToClipboard === "function") exportDeckToClipboard(col); };
    var chk = document.getElementById("deckPublicCheck");
    if (chk) chk.onchange = function() { toggleBinderPublic(col.id); };
  }

  col.cards = col.cards || [];
  grid.innerHTML = _pkBuildDeckHTML(col.cards, isSale);

  var reRender = function() {
    saveDeck_PK(isSale);
    renderDeckView_PK(type, col, grid, title, toggleContainer);
  };
  _pkAttachDeckEvents(grid, col, isSale, reRender);
  if (toggleContainer) {
    var deckImBtn = toggleContainer.querySelector(".deck-io-import");
    if (deckImBtn) deckImBtn.onclick = function() { if (typeof openPasteListModal === "function") openPasteListModal(col, isSale, reRender); };
  }
}

function _pkAttachDeckEvents(grid, col, isSale, reRender) {
  grid.querySelectorAll(".deck-card-remove").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var key = btn.getAttribute("data-key");
      col.cards = (col.cards || []).filter(function(c) { return c._key !== key; });
      if (isSale) guardarVenta(); else guardarCollections();
      reRender();
    });
  });

  grid.querySelectorAll(".deck-price-input").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var key = inp.getAttribute("data-key");
      var card = (col.cards || []).find(function(c) { return c._key === key; });
      if (card) card.customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value);
      if (isSale) guardarVenta(); else guardarCollections();
    });
  });

  grid.querySelectorAll(".deck-card-img-wrap img").forEach(function(img) {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      var key = img.closest(".deck-card").getAttribute("data-key");
      var carta = key ? cartasMap[key] : null;
      if (carta) {
        var navList = (col.cards || []).map(function(entry) { return cartasMap[entry._key]; }).filter(Boolean);
        var startIdx = 0;
        navList.forEach(function(c, i) { if (c && getCardKey(c) === getCardKey(carta)) { startIdx = i; } });
        openCardInModal(carta, navList, startIdx);
      }
    });
  });

  grid.querySelectorAll(".deck-add-slot").forEach(function(addBtn) {
    addBtn.addEventListener("click", function() {
      var mainTotal = (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
      var remaining = 60 - mainTotal;
      if (remaining <= 0) { alert(t("deck.pk_deck_full")); return; }
      var existingCounts = {};
      (col.cards || []).forEach(function(c) {
        if (c.card_name) existingCounts[c.card_name] = (existingCounts[c.card_name] || 0) + (c.quantity || 1);
      });
      showDeckPicker_PK("main", null, null, null, existingCounts, remaining).then(function(picked) {
        if (!picked || !picked.length) return;
        picked.forEach(function(c) {
          var mTotal = col.cards.reduce(function(s, card) { return s + (card.quantity || 1); }, 0);
          if (mTotal >= 60) return;
          var nameCount = col.cards.filter(function(card) { return card.card_name === c.card_name; }).reduce(function(s, card) { return s + (card.quantity || 1); }, 0);
          if (nameCount >= 4) return;
          var key = getCardKey(c);
          var existing = col.cards.find(function(card) { return card._key === key; });
          if (existing) existing.quantity = Math.min((existing.quantity || 1) + 1, 4);
          else col.cards.push({ _key: key, quantity: 1, card_set_id: c.card_set_id, card_name: c.card_name, card_image: c.card_image, card_color: c.card_color, card_type: c.card_type, set_id: c.set_id, customPrice: 0 });
        });
        reRender();
      });
    });
  });
}

function saveDeck_PK(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}
