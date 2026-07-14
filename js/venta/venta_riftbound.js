// ─── Venta Riftbound ─────────────────────────────────────────────────────
// Overrides venta functions with RB-specific logic.
// Dependencias: venta/venta.js (pedirCrearVenta, renderVentaGrouped, attachVentaEvents,
//                            renderVentaView, renderVentaList, buildVentaCardHTML)

var _pedirCrearVenta_OP = pedirCrearVenta;
var _renderVentaGrouped_OP = renderVentaGrouped;
var _attachVentaEvents_OP = attachVentaEvents;
var _renderVentaList_OP = renderVentaList;
var _buildVentaCardHTML_OP = buildVentaCardHTML;
var _renderVentaIndividual_OP = renderVentaIndividual;

function _getPlaysetMax() {
  return currentTcg === "riftbound" ? 3 : 4;
}

function pedirCrearVenta_RB() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección de venta",
    confirmText: "Crear",
    placeholder: "Nombre de la colección de venta",
    extraHTML: '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>' +
      '<select id="createVentaSubtype" onchange="document.getElementById(\'createVentaModeRow\').style.display=this.value===\'binder\'?\'\':\'none\'" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
        '<option value="binder">Binder — cartas libres</option>' +
        '<option value="deck">Deck</option>' +
      '</select>' +
      '<div id="createVentaModeRow">' +
        '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin:var(--space-2) 0 var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Modo de visualización</label>' +
        '<select id="createVentaMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
          '<option value="individual">Individual — una copia por slot</option>' +
          '<option value="playset">Playset — máximo ' + _getPlaysetMax() + ' copias por carta</option>' +
          '<option value="editable">Editable — cantidad libre por carta</option>' +
        '</select>' +
      '</div>',
    onConfirm: function(nombre) {
      var subtype = document.getElementById("createVentaSubtype") ? document.getElementById("createVentaSubtype").value : "binder";
      var mode = document.getElementById("createVentaMode") ? document.getElementById("createVentaMode").value : "individual";
      var id = generarId();
      ventaCols[id] = { id: id, name: nombre.trim(), subtype: subtype, cards: [], is_public: false, display_mode: mode, tcg: currentTcg || "riftbound" };
      if (subtype === "deck") {
        ventaCols[id].legend = null;
        ventaCols[id].champions = [];
        ventaCols[id].runes = [];
        ventaCols[id].battlefields = [];
        ventaCols[id].sideboard = [];
      }
      guardarVenta();
      renderVentaList();
    }
  });
}

function renderVentaList_RB() {
  var container = document.getElementById("ventaList");
  if (!container) return;
  container.innerHTML = "";
  var ids = Object.keys(ventaCols).filter(function(id) {
    var tcg = ventaCols[id].tcg || "riftbound";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    container.innerHTML = '<div class="collection-empty"><p>No tenés colecciones de venta para este TCG</p><button class="btn-primary" id="createFirstVentaBtnRB">Crear primera colección</button></div>';
    var b = document.getElementById("createFirstVentaBtnRB");
    if (b) b.addEventListener("click", pedirCrearVenta);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(function(id) {
    var col = ventaCols[id];
    var coverImg = getFirstCardImage(col.cards, col);
    var isDeck = col.subtype === "deck";
    var deckCount = isDeck ? (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0) + (col.champions || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0) : col.cards.length;
    var totalCards, badgeClass, badgeText;
    if (isDeck) {
      totalCards = deckCount + " cartas";
      badgeClass = "deck"; badgeText = "Deck";
    } else {
      totalCards = col.cards.length + " cartas";
      badgeClass = "collection"; badgeText = col.display_mode === "playset" ? "Playset" : col.display_mode === "editable" ? "Editable" : "Individual";
    }
    var tp = getTotalPrice(col);
    var dp = col.customTotalPrice != null ? Number(col.customTotalPrice) : tp;
    var isCustom = col.customTotalPrice != null;
    var div = document.createElement("div");
    div.className = "binder-cover-card";
    div.innerHTML = '<div class="binder-cover-img" style="background-image:url(' + (coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'") + ')">' +
      '<div class="binder-cover-overlay"><span class="binder-cover-count">' + totalCards + '</span></div></div>' +
      '<div class="binder-cover-meta">' +
        '<span class="binder-cover-name-badge">' + col.name + '</span>' +
        '<span class="binder-cover-badge ' + badgeClass + '">' + badgeText + '</span>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:var(--space-1)">' +
          '<span data-totalprice="1" style="font-size:var(--text-sm);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">$' + dp.toFixed(2) + '</span>' +
          '<button class="btn-ghost btn-xs" data-action="editprice" data-id="' + id + '" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0" title="Editar precio total">✎</button>' +
          (isCustom ? '<button class="btn-ghost btn-xs" data-action="resetprice" data-id="' + id + '" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0;color:var(--text-muted)" title="Restaurar precio calculado">↺</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="binder-cover-actions">' +
        '<button class="btn-ghost btn-xs" data-action="open" data-id="' + id + '">Abrir</button>' +
        '<button class="btn-ghost btn-xs" data-action="rename" data-id="' + id + '">Renombrar</button>' +
        '<button class="btn-danger btn-xs" data-action="delete" data-id="' + id + '">Eliminar</button>' +
      '</div>';
    container.appendChild(div);
  });
  container.querySelectorAll("[data-action='open']").forEach(function(b) {
    b.addEventListener("click", function() { openVenta(b.getAttribute("data-id")); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección de venta",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: ventaCols[id].name,
        onConfirm: function(nombre) { ventaCols[id].name = nombre.trim(); guardarVenta(); renderVentaList(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(function(b) {
    b.addEventListener("click", function() {
      var idCol = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección de venta "' + ventaCols[idCol].name + '"?', function() {
        delete ventaCols[idCol]; guardarVenta(); renderVentaList();
      });
    });
  });
  container.querySelectorAll("[data-action='editprice']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      var col = ventaCols[id];
      if (!col) return;
      var card = b.closest(".binder-cover-card");
      if (!card) return;
      var priceSpan = card.querySelector("[data-totalprice]");
      if (!priceSpan) return;
      if (priceSpan.querySelector("input")) return;
      var current = col.customTotalPrice != null ? col.customTotalPrice : getTotalPrice(col);
      var input = document.createElement("input");
      input.type = "number";
      input.step = "0.5";
      input.min = "0";
      input.value = current.toFixed(2);
      input.style.cssText = "width:80px;padding:2px 6px;border:1px solid var(--accent);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--accent);font-size:var(--text-sm);font-family:var(--font-mono);font-weight:var(--weight-bold);outline:none";
      priceSpan.innerHTML = "";
      priceSpan.appendChild(input);
      input.focus();
      input.select();
      var save = function() {
        var val = parseFloat(input.value);
        if (isNaN(val) || val < 0) { renderVentaList(); return; }
        var calc = getTotalPrice(col);
        if (val === calc) delete col.customTotalPrice;
        else col.customTotalPrice = val;
        guardarVenta(); renderVentaList();
      };
      input.addEventListener("keydown", function(e) { if (e.key === "Enter") save(); if (e.key === "Escape") renderVentaList(); });
      input.addEventListener("blur", save);
    });
  });
  container.querySelectorAll("[data-action='resetprice']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      var col = ventaCols[id];
      if (!col) return;
      delete col.customTotalPrice;
      guardarVenta(); renderVentaList();
    });
  });
  container.querySelectorAll(".binder-cover-card").forEach(function(card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function(e) {
      if (e.target.closest("button, input")) return;
      var openBtn = card.querySelector("[data-action='open']");
      if (openBtn) openVenta(openBtn.getAttribute("data-id"));
    });
  });
}

function _getRarityBadge_RB(card) {
  var r = obtenerRareza(card) || card.rarity || "";
  if (typeof esCartaAA_RB === "function" && esCartaAA_RB(card)) {
    var suffix = (card.card_set_id || "").match(/[asv]$/i);
    var variantLabel = suffix ? { a: "AA", s: "Sig", v: "OV" }[suffix[0].toLowerCase()] : "AA";
    if (variantLabel !== r) {
      return r ? r + " - " + variantLabel : variantLabel;
    }
  }
  return r;
}

function renderVentaGrouped_RB(col, grid, mode) {
  var totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  var start = (ventaPage - 1) * ventaPerPage;
  var pageCards = col.cards.slice(start, start + ventaPerPage);
  for (var i = 0; i < ventaPerPage; i++) {
    var slot = document.createElement("div");
    var globalIdx = start + i;
    slot.className = "venta-card";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      var c = pageCards[i];
      var psMax = _getPlaysetMax();
      var psTag = (c.quantity || 1) >= psMax ? '<span class="card-ps-badge">PS</span>' : "";
      var cp = c.customPrice != null ? c.customPrice : 0;
      var fullCard = c._key ? cartasMap[c._key] : null;
      var data = fullCard || c;
      var nombre = formatearNombre(data);
      var rarityLabel = _getRarityBadge_RB(data);
      var setId = data.card_set_id || "";
      var qtyHTML = '';
      if (mode === "playset") {
        var q = c.quantity || 1;
        qtyHTML = '<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">&minus;</button><span class="venta-qty-value">' + q + '</span><button class="venta-qty-btn" data-action="incr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">+</button>' + psTag + '</div>';
      } else if (mode === "editable") {
        var qe = c.quantity || 1;
        qtyHTML = '<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">&minus;</button><input type="number" class="venta-qty-input venta-qty-value" value="' + qe + '" min="1" max="50" data-ventaidx="' + globalIdx + '"><button class="venta-qty-btn" data-action="incr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">+</button></div>';
      }
      slot.innerHTML = '<div class="card-img-wrap">' +
        '<img src="' + (c.card_image || (fullCard && fullCard.card_image) || 'TUTCG.webp') + '" onerror="this.src=\'TUTCG.webp\'" loading="lazy"></div>' +
        '<div class="card-body">' +
          '<h3>' + nombre + '</h3>' +
          (rarityLabel ? '<span class="card-print-type">' + rarityLabel + '</span>' : '') +
          '<span class="card-set-id">' + setId + '</span>' +
          '<div class="venta-price-row"><span>$</span><input type="number" class="venta-price-input" value="' + cp.toFixed(2) + '" step="0.01" min="0" data-ventaidx="' + globalIdx + '"></div>' +
          qtyHTML +
        '</div>' +
        '<button class="binder-remove venta-remove" data-idx="' + globalIdx + '">&times;</button>';
    } else {
      slot.innerHTML = '<div class="binder-empty">+</div>';
    }
    grid.appendChild(slot);
  }
  grid.querySelectorAll(".venta-card img").forEach(function(img) {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      var wrapper = this.closest(".venta-card");
      if (!wrapper) return;
      var idx = parseInt(wrapper.getAttribute("data-global"));
      var selected = idx >= 0 && idx < col.cards.length ? col.cards[idx] : null;
      var carta = selected && selected._key ? cartasMap[selected._key] : null;
      if (carta) {
        var navList = (col.cards || []).map(function(entry) { return cartasMap[entry._key]; }).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
  attachVentaEvents_RB(col, mode, grid, totalPages);
}

function attachVentaEvents_RB(col, mode, grid, totalPages) {
  grid.querySelectorAll(".binder-remove").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var idx = parseInt(btn.getAttribute("data-idx"));
      if (idx >= 0 && idx < col.cards.length) { col.cards.splice(idx, 1); guardarVenta(); renderVentaView(); }
    });
  });
  grid.querySelectorAll(".venta-price-input").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var idx = parseInt(inp.getAttribute("data-ventaidx"));
      if (idx >= 0 && idx < col.cards.length) { col.cards[idx].customPrice = parseFloat(inp.value) || 0; guardarVenta(); renderVentaView(); }
    });
  });
  grid.querySelectorAll(".venta-qty-btn").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      var idx = parseInt(btn.getAttribute("data-ventaidx"));
      var btnMode = btn.getAttribute("data-mode") || "playset";
      var action = btn.getAttribute("data-action");
      var max = btnMode === "editable" ? 50 : _getPlaysetMax();
      if (idx >= 0 && idx < col.cards.length) {
        var card = col.cards[idx];
        if (action === "incr") { card.quantity = Math.min((card.quantity || 1) + 1, max); }
        else { card.quantity = Math.max((card.quantity || 1) - 1, 1); }
        guardarVenta(); renderVentaView();
      }
    });
  });
  grid.querySelectorAll(".venta-qty-input").forEach(function(inp) {
    inp.addEventListener("change", function() {
      var idx = parseInt(inp.getAttribute("data-ventaidx"));
      var val = parseInt(inp.value);
      if (idx >= 0 && idx < col.cards.length && !isNaN(val)) { col.cards[idx].quantity = Math.max(1, Math.min(val, 50)); guardarVenta(); renderVentaView(); }
    });
  });
  grid.querySelectorAll(".card img, .venta-card img").forEach(function(img) {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      var key = (this.closest(".card") || this.closest(".venta-card"))?.getAttribute("data-cardkey");
      var carta = key ? cartasMap[key] : null;
      if (carta) {
        var navList = (col.cards || []).map(function(entry) { return cartasMap[entry._key]; }).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
}

function buildVentaCardHTML_RB(c, globalIdx, mode) {
  var cp = c.customPrice != null ? c.customPrice : 0;
  var fullCard = c._key ? cartasMap[c._key] : null;
  var data = fullCard || c;
  var nombre = formatearNombre(data);
  var rareza = _getRarityBadge_RB(data);
  var setId = data.card_set_id || "";
  var qtyHTML = "";
  if (mode === "playset") {
    var q = c.quantity || 1;
    var psTag = q >= _getPlaysetMax() ? '<span class="card-ps-badge">PS</span>' : "";
    qtyHTML = '<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">&minus;</button><span class="venta-qty-value">' + q + '</span><button class="venta-qty-btn" data-action="incr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">+</button>' + psTag + '</div>';
  } else if (mode === "editable") {
    var qe = c.quantity || 1;
    qtyHTML = '<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">&minus;</button><input type="number" class="venta-qty-input venta-qty-value" value="' + qe + '" min="1" max="50" data-ventaidx="' + globalIdx + '"><button class="venta-qty-btn" data-action="incr" data-ventaidx="' + globalIdx + '" data-mode="' + mode + '">+</button></div>';
  }
  return '<div class="card-img-wrap">' +
    '<img src="' + (c.card_image || (fullCard && fullCard.card_image) || 'TUTCG.webp') + '" onerror="this.src=\'TUTCG.webp\'" loading="lazy"></div>' +
    '<div class="card-body">' +
      '<h3>' + nombre + '</h3>' +
      (rareza ? '<span class="card-print-type">' + rareza + '</span>' : '') +
      (data.print_type && data.print_type !== rareza ? '<span class="card-print-type">' + data.print_type + '</span>' : '') +
      '<span class="card-set-id">' + setId + '</span>' +
      '<div class="venta-price-row"><span>$</span><input type="number" class="venta-price-input" value="' + cp.toFixed(2) + '" step="0.01" min="0" data-ventaidx="' + globalIdx + '"></div>' +
      qtyHTML +
    '</div>' +
    '<button class="binder-remove venta-remove" data-idx="' + globalIdx + '">&times;</button>';
}

function renderVentaIndividual_RB(col, grid) {
  var totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  var start = (ventaPage - 1) * ventaPerPage;
  var pageCards = col.cards.slice(start, start + ventaPerPage);
  for (var i = 0; i < ventaPerPage; i++) {
    var slot = document.createElement("div");
    var globalIdx = start + i;
    slot.className = "card";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      var c = pageCards[i];
      slot.className = "card venta-slot";
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      slot.innerHTML = buildVentaCardHTML_RB(c, globalIdx, "individual");
    } else {
      slot.className = "card venta-slot";
      slot.innerHTML = '<div class="binder-empty">+</div>';
    }
    grid.appendChild(slot);
  }
  attachVentaEvents_RB(col, "individual", grid, totalPages);
}

// ─── Dispatch overrides ─────────────────────────────────────────────────

pedirCrearVenta = function() {
  if (currentTcg === "riftbound") return pedirCrearVenta_RB();
  return _pedirCrearVenta_OP();
};

renderVentaList = function() {
  if (currentTcg === "riftbound") return renderVentaList_RB();
  return _renderVentaList_OP();
};

renderVentaGrouped = function(col, grid, mode) {
  if (currentTcg === "riftbound") return renderVentaGrouped_RB(col, grid, mode);
  return _renderVentaGrouped_OP(col, grid, mode);
};

attachVentaEvents = function(col, mode, grid, totalPages) {
  if (currentTcg === "riftbound") return attachVentaEvents_RB(col, mode, grid, totalPages);
  return _attachVentaEvents_OP(col, mode, grid, totalPages);
};

buildVentaCardHTML = function(c, globalIdx, mode) {
  if (currentTcg === "riftbound") return buildVentaCardHTML_RB(c, globalIdx, mode);
  return _buildVentaCardHTML_OP(c, globalIdx, mode);
};

renderVentaIndividual = function(col, grid) {
  if (currentTcg === "riftbound") return renderVentaIndividual_RB(col, grid);
  return _renderVentaIndividual_OP(col, grid);
};
