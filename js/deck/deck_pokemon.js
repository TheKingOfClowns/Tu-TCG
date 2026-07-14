// ─── Deck Pokémon ──────────────────────────────────────────────────────────
// PK deck: 60 cartas, 4 copias máx por card_name, sin líder/legend/DON.

function showDeckPicker_PK(mode, legendColor, existingKeys, legendSetId, existingCounts, remainingSlots) {
  var totalExisting = existingCounts || 0;
  var maxSlots = remainingSlots != null ? remainingSlots : (60 - totalExisting);
  return showDeckPicker_OP(mode, legendColor, existingKeys, legendSetId, totalExisting, maxSlots);
}

function _pkBuildDeckHTML(cards, isSale) {
  var html = "";
  var cardCount = (cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0);
  html += '<div class="deck-section"><div class="deck-section-header"><span class="deck-section-title">Main Deck</span><span class="deck-section-count">' + cardCount + ' / 60</span></div><div class="deck-card-grid" id="deckMainGrid">';
  (cards || []).forEach(function(c) {
    var full = c._key ? (cartasMap[c._key] || c) : c;
    var priceHTML = isSale ? '<div class="deck-card-price"><span>$</span><input type="number" class="deck-price-input" step="0.5" min="0" value="' + (c.customPrice != null ? c.customPrice : 0) + '" data-key="' + (c._key || "") + '"></div>' : "";
    html += '<div class="deck-card" data-key="' + (c._key || "") + '"><div class="deck-card-img-wrap"><img src="' + (c.card_image || full.card_image || "TUTCG.webp") + '" onerror="this.src=\'TUTCG.webp\'"></div><div class="deck-card-info"><span class="deck-card-name">' + (c.card_name || full.card_name || "") + '</span><span class="deck-card-qty">x' + (c.quantity || 1) + '</span></div>' + priceHTML + '<button class="deck-card-remove" data-key="' + (c._key || "") + '">&times;</button></div>';
  });
  while (cardCount < 60) {
    html += '<div class="deck-card deck-card-empty" id="deckAddMainBtnPK">+</div>';
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

  title.textContent = col.name || "Deck Pokémon";
  if (toggleContainer) {
    toggleContainer.innerHTML = typeof isAuthenticated === "function" && isAuthenticated() ? '<label class="public-toggle"><span class="public-toggle-label ' + (!col.is_public ? "active" : "") + '">Privado</span><input type="checkbox" id="deckPublicCheck" ' + (col.is_public ? "checked" : "") + '><span class="public-toggle-track"><span class="public-toggle-thumb"></span></span><span class="public-toggle-label ' + (col.is_public ? "active" : "") + '">Público</span></label>' : "";
    var chk = document.getElementById("deckPublicCheck");
    if (chk) chk.onchange = function() { toggleBinderPublic(col.id); };
  }

  col.cards = col.cards || [];
  grid.innerHTML = _pkBuildDeckHTML(col.cards, isSale);

  _pkAttachDeckEvents(grid, col, isSale, function() {
    saveDeck_PK(isSale);
    renderDeckView_PK(type, col, grid, title, toggleContainer);
  });
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
        openCardInModal(carta, navList);
      }
    });
  });

  var addBtn = document.getElementById("deckAddMainBtnPK");
  if (addBtn) {
    addBtn.addEventListener("click", function() {
      showDeckPicker_PK("main", null, (col.cards || []).map(function(c) { return c._key; }), null, (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0), 60 - (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0));
    });
  }
}

function saveDeck_PK(isSale) {
  if (isSale) guardarVenta(); else guardarCollections();
}
