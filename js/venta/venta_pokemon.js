// ─── Venta Pokémon ─────────────────────────────────────────────────────────
// PK venta: colección plana, 4 copias máx, modos individual/playset/editable.

function pedirCrearVenta_PK() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección de venta",
    confirmText: "Crear",
    placeholder: "Nombre de la colección de venta",
    extraHTML: '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label><select id="createVentaSubtype" onchange="document.getElementById(\'createVentaModeRow\').style.display=this.value===\'binder\'?\'\':\'none\'" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none"><option value="binder">Binder — cartas libres</option><option value="deck">Deck — 60 cartas</option></select><div id="createVentaModeRow"><label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin:var(--space-2) 0 var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Modo de visualización</label><select id="createVentaMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none"><option value="individual">Individual</option><option value="playset">Playset — máx 4 copias</option><option value="editable">Editable — cantidad libre</option></select></div>',
    onConfirm: function(nombre) {
      var subtype = (document.getElementById("createVentaSubtype") && document.getElementById("createVentaSubtype").value) || "binder";
      var mode = (document.getElementById("createVentaMode") && document.getElementById("createVentaMode").value) || "individual";
      var id = generarId();
      ventaCols[id] = { id: id, name: nombre.trim(), subtype: subtype, cards: [], is_public: false, display_mode: mode, tcg: currentTcg || "pokemon" };
      guardarVenta();
      renderVentaList();
    }
  });
}

function renderVentaList_PK() {
  var container = document.getElementById("ventaList");
  if (!container) return;
  container.innerHTML = "";
  var ids = Object.keys(ventaCols).filter(function(id) {
    var tcg = ventaCols[id].tcg || "pokemon";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    var msg = currentTcg ? "No tienes colecciones de venta para este TCG" : "No tienes colecciones de venta";
    container.innerHTML = '<div class="collection-empty"><p>' + msg + '</p><button class="btn-primary" id="createFirstVentaBtn">Crear primera colección de venta</button></div>';
    var btn = document.getElementById("createFirstVentaBtn");
    if (btn) btn.addEventListener("click", pedirCrearVenta);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(function(id) {
    var col = ventaCols[id];
    var coverImg = getFirstCardImage(col.cards, col);
    var isDeck = col.subtype === "deck";
    var totalStr = isDeck ? (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0) + " cartas" : col.cards.reduce(function(s, c) { return s + (c.quantity || 1); }, 0) + " cartas";
    var badgeText = isDeck ? "Deck" : (col.display_mode === "playset" ? "Playset" : col.display_mode === "editable" ? "Editable" : "Individual");
    var div = document.createElement("div");
    div.className = "binder-cover-card";
    var tp = getTotalPrice(col);
    var dp = col.customTotalPrice != null ? Number(col.customTotalPrice) : tp;
    var isCustom = col.customTotalPrice != null;
    div.innerHTML = '<div class="binder-cover-img" style="background-image:url(' + (coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'") + ')"><div class="binder-cover-overlay"><span class="binder-cover-count">' + totalStr + '</span></div></div><div class="binder-cover-meta"><span class="binder-cover-name-badge">' + col.name + '</span><span class="binder-cover-badge sale">' + badgeText + '</span><div style="display:flex;align-items:center;gap:6px;margin-top:var(--space-1)"><span data-totalprice="1" style="font-size:var(--text-sm);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">$' + dp.toFixed(2) + '</span><button class="btn-ghost btn-xs" data-action="editprice" data-id="' + id + '" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0" title="Editar precio total">✎</button>' + (isCustom ? '<button class="btn-ghost btn-xs" data-action="resetprice" data-id="' + id + '" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0;color:var(--text-muted)" title="Restaurar precio calculado">↺</button>' : "") + '</div></div><div class="binder-cover-actions"><button class="btn-ghost btn-xs" data-action="open" data-id="' + id + '">Abrir</button><button class="btn-ghost btn-xs" data-action="rename" data-id="' + id + '">Renombrar</button><button class="btn-danger btn-xs" data-action="delete" data-id="' + id + '">Eliminar</button></div>';
    container.appendChild(div);
  });
  container.querySelectorAll(".binder-cover-card").forEach(function(card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function(e) {
      if (e.target.closest("button, input")) return;
      var openBtn = card.querySelector("[data-action='open']");
      if (openBtn) openVenta(openBtn.getAttribute("data-id"));
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(function(b) { b.addEventListener("click", function() { openVenta(b.getAttribute("data-id")); }); });
  container.querySelectorAll("[data-action='rename']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      showCreateModal({ title: "Renombrar colección de venta", confirmText: "Guardar", placeholder: "Nuevo nombre", initialValue: ventaCols[id].name, onConfirm: function(nombre) { ventaCols[id].name = nombre.trim(); guardarVenta(); renderVentaList(); } });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(function(b) {
    b.addEventListener("click", function() {
      var idVenta = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección de venta "' + ventaCols[idVenta].name + '"?', function() { delete ventaCols[idVenta]; guardarVenta(); renderVentaList(); });
    });
  });
  // Price edit/reset — delegate to OP implementation since the edit mechanism is TCG-agnostic
  container.querySelectorAll("[data-action='editprice']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      var col = ventaCols[id];
      if (!col) return;
      var container = b.closest(".binder-cover-card");
      if (!container) return;
      var priceSpan = container.querySelector("[data-totalprice]");
      if (!priceSpan || priceSpan.querySelector("input")) return;
      var current = col.customTotalPrice != null ? col.customTotalPrice : getTotalPrice(col);
      var input = document.createElement("input");
      input.type = "number"; input.step = "0.5"; input.min = "0"; input.value = current.toFixed(2);
      input.style.cssText = "width:80px;padding:2px 6px;border:1px solid var(--accent);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--accent);font-size:var(--text-sm);font-family:var(--font-mono);font-weight:var(--weight-bold);outline:none";
      priceSpan.innerHTML = ""; priceSpan.appendChild(input);
      input.focus(); input.select();
      var save = function() { var val = parseFloat(input.value); if (isNaN(val) || val < 0) { renderVentaList(); return; } var calc = getTotalPrice(col); if (val === calc) delete col.customTotalPrice; else col.customTotalPrice = val; guardarVenta(); renderVentaList(); };
      input.addEventListener("keydown", function(e) { if (e.key === "Enter") save(); if (e.key === "Escape") renderVentaList(); });
      input.addEventListener("blur", save);
    });
  });
  container.querySelectorAll("[data-action='resetprice']").forEach(function(b) {
    b.addEventListener("click", function() { var id = b.getAttribute("data-id"); var col = ventaCols[id]; if (!col) return; delete col.customTotalPrice; guardarVenta(); renderVentaList(); });
  });
}

function buildVentaCardHTML_PK(c, globalIdx, mode) {
  // Delegate to OP implementation (same HTML structure)
  return buildVentaCardHTML_OP(c, globalIdx, mode);
}

function renderVentaIndividual_PK(col, grid) {
  renderVentaIndividual_OP(col, grid);
}

function renderVentaGrouped_PK(col, grid, mode) {
  renderVentaGrouped_OP(col, grid, mode);
}

function attachVentaEvents_PK(col, mode, grid, totalPages) {
  attachVentaEvents_OP(col, mode, grid, totalPages);
}
