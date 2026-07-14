// â”€â”€â”€ Venta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderVentaList_OP() {
  const container = document.getElementById("ventaList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(ventaCols).filter(id => {
    const tcg = ventaCols[id].tcg || "one-piece";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    const msg = currentTcg ? "No tienes colecciones de venta para este TCG" : "No tienes colecciones de venta";
    container.innerHTML = `<div class="collection-empty"><p>${msg}</p><button class="btn-primary" id="createFirstVentaBtn">Crear primera colección de venta</button></div>`;
    const btn = document.getElementById("createFirstVentaBtn");
    if (btn) btn.addEventListener("click", pedirCrearVenta_OP);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(id => {
    const col = ventaCols[id];
    const coverImg = getFirstCardImage(col.cards, col);
    const isDeck = col.subtype === "deck";
    const totalStr = isDeck
      ? `${col.leader ? "1 líder · " : ""}${(col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0)} cartas${col.dons?.length ? " · " + col.dons.length + " DON" : ""}`
      : `${col.cards.reduce((s, c) => s + (c.quantity || 1), 0)} cartas`;
    const badgeText = isDeck ? "Deck" : (col.display_mode === "playset" ? "Playset" : col.display_mode === "editable" ? "Editable" : "Individual");
    const div = document.createElement("div");
    div.className = "binder-cover-card";
    div.innerHTML = `
      <div class="binder-cover-img" style="background-image:url(${coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'"})">
        <div class="binder-cover-overlay">
          <span class="binder-cover-count">${totalStr}</span>
        </div>
      </div>
      <div class="binder-cover-meta">
        <span class="binder-cover-name-badge">${col.name}</span>
        <span class="binder-cover-badge sale">${badgeText}</span>
        ${(() => {
          const tp = getTotalPrice(col);
          const dp = col.customTotalPrice != null ? Number(col.customTotalPrice) : tp;
          const isCustom = col.customTotalPrice != null;
          return `<div style="display:flex;align-items:center;gap:6px;margin-top:var(--space-1)">
            <span data-totalprice="1" style="font-size:var(--text-sm);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">$${dp.toFixed(2)}</span>
            <button class="btn-ghost btn-xs" data-action="editprice" data-id="${id}" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0" title="Editar precio total">✎</button>
            ${isCustom ? `<button class="btn-ghost btn-xs" data-action="resetprice" data-id="${id}" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0;color:var(--text-muted)" title="Restaurar precio calculado">↺</button>` : ""}
          </div>`;
        })()}
      </div>
      <div class="binder-cover-actions">
        <button class="btn-ghost btn-xs" data-action="open" data-id="${id}">Abrir</button>
        <button class="btn-ghost btn-xs" data-action="rename" data-id="${id}">Renombrar</button>
        <button class="btn-danger btn-xs" data-action="delete" data-id="${id}">Eliminar</button>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll(".binder-cover-card").forEach(card => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("button, input")) return;
      const openBtn = card.querySelector("[data-action='open']");
      if (openBtn) openVenta(openBtn.getAttribute("data-id"));
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => openVenta(b.getAttribute("data-id")));
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección de venta",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: ventaCols[id].name,
        onConfirm: (nombre) => { ventaCols[id].name = nombre.trim(); guardarVenta(); renderVentaList_OP(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const idVenta = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección de venta "' + ventaCols[idVenta].name + '"?', () => {
        delete ventaCols[idVenta]; guardarVenta(); renderVentaList_OP();
      });
    });
  });
  container.querySelectorAll("[data-action='editprice']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const col = ventaCols[id];
      if (!col) return;
      const container = b.closest(".binder-cover-card");
      if (!container) return;
      const priceSpan = container.querySelector("[data-totalprice]");
      if (!priceSpan) return;
      if (priceSpan.querySelector("input")) return;
      const current = col.customTotalPrice != null ? col.customTotalPrice : getTotalPrice(col);
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.5";
      input.min = "0";
      input.value = current.toFixed(2);
      input.style.cssText = "width:80px;padding:2px 6px;border:1px solid var(--accent);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--accent);font-size:var(--text-sm);font-family:var(--font-mono);font-weight:var(--weight-bold);outline:none";
      priceSpan.innerHTML = "";
      priceSpan.appendChild(input);
      input.focus();
      input.select();
      const save = () => {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0) { renderVentaList_OP(); return; }
        const calc = getTotalPrice(col);
        if (val === calc) delete col.customTotalPrice;
        else col.customTotalPrice = val;
        guardarVenta(); renderVentaList_OP();
      };
      input.addEventListener("keydown", e => { if (e.key === "Enter") save(); if (e.key === "Escape") renderVentaList_OP(); });
      input.addEventListener("blur", save);
    });
  });
  container.querySelectorAll("[data-action='resetprice']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const col = ventaCols[id];
      if (!col) return;
      delete col.customTotalPrice;
      guardarVenta(); renderVentaList_OP();
    });
  });
}
function pedirCrearVenta_OP() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección de venta",
    confirmText: "Crear",
    placeholder: "Nombre de la colección de venta",
    extraHTML: `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>
      <select id="createVentaSubtype" onchange="document.getElementById('createVentaModeRow').style.display=this.value==='binder'?'':'none'" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="binder">Binder — cartas libres</option>
        <option value="deck">Deck — líder + 50 cartas + 10 DON!!</option>
      </select>
      <div id="createVentaModeRow">
        <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin:var(--space-2) 0 var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Modo de visualización</label>
        <select id="createVentaMode" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
          <option value="individual">Individual — una copia por slot</option>
          <option value="playset">Playset — máximo 4 copias por carta</option>
          <option value="editable">Editable — cantidad libre por carta</option>
        </select>
      </div>`,
    onConfirm: (nombre) => {
      const subtype = document.getElementById("createVentaSubtype")?.value || "binder";
      const mode = document.getElementById("createVentaMode")?.value || "individual";
      const id = generarId();
      ventaCols[id] = { id, name: nombre.trim(), subtype, cards: [], leader: null, dons: [], is_public: false, display_mode: mode, tcg: currentTcg || "one-piece" };
      guardarVenta();
      renderVentaList_OP();
    }
  });
}
function openVenta(id) { currentVentaId = id; ventaPage = 1; mostrarVista("venta"); }
function renderVentaView() {
  const grid = document.getElementById("ventaGrid");
  const deckContainer = document.getElementById("ventaDeckContainer");
  const pagination = document.getElementById("ventaPagination");
  const title = document.getElementById("ventaTitle");
  const toggleContainer = document.getElementById("ventaPublicToggleContainer");
  const modeContainer = document.getElementById("ventaModeContainer");
  if (!grid || !currentVentaId) return;
  const col = ventaCols[currentVentaId];
  if (!col) { mostrarVista("ventaCols"); return; }
  if (col.subtype === "deck") {
    grid.style.display = "none";
    if (pagination) pagination.style.display = "none";
    deckContainer.style.display = "";
    if (modeContainer) modeContainer.innerHTML = "";
    renderDeckView("sale", col, deckContainer, title, toggleContainer);
    return;
  }
  deckContainer.style.display = "none";
  grid.style.display = "";
  if (pagination) pagination.style.display = "";
  const clearPB = document.getElementById("ventaClearPageBtn");
  const clearAB = document.getElementById("ventaClearAllBtn");
  if (clearPB) clearPB.textContent = "Vaciar página";
  if (clearAB) clearAB.textContent = "Vaciar todo";
  title.textContent = col.name;
  const mode = col.display_mode || "individual";
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
        <input type="checkbox" id="ventaPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span>
      </label>
    ` : "";
    const chk = document.getElementById("ventaPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(currentVentaId);
  }
  if (modeContainer) {
    const labels = { individual: "Individual", playset: "Playset", editable: "Editable" };
    modeContainer.innerHTML = `<span class="venta-mode-badge">${labels[mode] || mode}</span>`;
  }
  grid.innerHTML = "";
  if (mode === "individual") renderVentaIndividual(col, grid);
  else if (mode === "playset") renderVentaGrouped(col, grid, "playset");
  else if (mode === "editable") renderVentaGrouped(col, grid, "editable");
  if (!grid.hasAttribute("data-empty-click")) {
    grid.setAttribute("data-empty-click", "1");
    grid.addEventListener("click", function(e) {
      if (e.target.closest(".binder-empty")) {
        addingToBinderId = currentVentaId;
        addingToBinderName = ventaCols[currentVentaId] ? ventaCols[currentVentaId].name : "";
        addingToBinderType = "venta";
        mostrarVista("catalog");
      }
    });
  }
}
function buildVentaCardHTML_OP(c, globalIdx, mode) {
  const cp = c.customPrice != null ? c.customPrice : 0;
  const fullCard = c._key ? cartasMap[c._key] : null;
  const data = fullCard || c;
  const nombre = formatearNombre(data);
  const rareza = fullCard && (fullCard.category === "DON" || fullCard.set_id === "PRB-01" || fullCard.set_id === "PRB-02") ?
    (() => { const r = obtenerRareza(fullCard); if (fullCard.set_id === "PRB-01" || fullCard.set_id === "PRB-02") return ["Reprint","Jolly Roger","Full Art","AA","Textured Foil","Manga","SP"].includes(r) ? r : ""; return r; })() : "";
  const printType = fullCard?.print_type || c.print_type || "";
  const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
  let qtyHTML = "";
  if (mode === "playset") {
    const q = c.quantity || 1;
    const psTag = q >= 4 ? `<span class="card-ps-badge">PS</span>` : "";
    qtyHTML = `<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="${globalIdx}" data-mode="${mode}">&minus;</button><span class="venta-qty-value">${q}</span><button class="venta-qty-btn" data-action="incr" data-ventaidx="${globalIdx}" data-mode="${mode}">+</button>${psTag}</div>`;
  } else if (mode === "editable") {
    const qe = c.quantity || 1;
        qtyHTML = `<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="${globalIdx}" data-mode="${mode}">&minus;</button><input type="number" class="venta-qty-input venta-qty-value" value="${qe}" min="1" max="50" data-ventaidx="${globalIdx}"><button class="venta-qty-btn" data-action="incr" data-ventaidx="${globalIdx}" data-mode="${mode}">+</button></div>`;
  }
  return `
    <div class="card-img-wrap">
      <img src="${c.card_image || fullCard?.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'" loading="lazy">
    </div>
    <div class="card-body">
      <h3>${nombre}</h3>
      ${printType ? `<span class="card-print-type">${printType}</span>` : (rareza && rareza !== "Normal" ? `<span class="card-print-type">${rareza}</span>` : "")}
      <span class="card-set-id">${setId}</span>
      ${qtyHTML}
      <div class="venta-price-row">
        <span class="venta-price-label">Precio:</span>
        <span class="venta-price-prefix">$</span>
        <input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-ventaidx="${globalIdx}">
      </div>
    </div>
    <button class="binder-remove" data-ventaidx="${globalIdx}" data-mode="${mode}">&times;</button>`;
}
function renderVentaIndividual_OP(col, grid) {
  const totalPages = Math.max(1, Math.ceil(col.cards.length / ventaPerPage));
  const start = (ventaPage - 1) * ventaPerPage;
  const pageCards = col.cards.slice(start, start + ventaPerPage);
  for (let i = 0; i < ventaPerPage; i++) {
    const slot = document.createElement("div");
    const globalIdx = start + i;
    slot.className = "card";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      slot.className = "card venta-slot";
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      slot.innerHTML = buildVentaCardHTML_OP(c, globalIdx, "individual");
    } else {
      slot.innerHTML = '<div class="binder-empty">+</div>';
    }
    grid.appendChild(slot);
  }
  attachVentaEvents_OP(col, "individual", grid, totalPages);
}
function renderVentaGrouped_OP(col, grid, mode) {
  const cards = col.cards || [];
  const totalPages = Math.max(1, Math.ceil(cards.length / ventaPerPage));
  const start = (ventaPage - 1) * ventaPerPage;
  const pageCards = cards.slice(start, start + ventaPerPage);
  for (let i = 0; i < ventaPerPage; i++) {
    const globalIdx = start + i;
    const slot = document.createElement("div");
    if (pageCards[i]) {
      const c = pageCards[i];
      slot.className = "card venta-slot venta-grouped";
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      slot.setAttribute("data-global", globalIdx);
      slot.innerHTML = buildVentaCardHTML_OP(c, globalIdx, mode);
    } else {
      slot.className = "card venta-slot venta-grouped";
      slot.setAttribute("data-global", globalIdx);
      slot.innerHTML = '<div class="binder-empty">+</div>';
    }
    grid.appendChild(slot);
  }
  attachVentaEvents_OP(col, mode, grid, totalPages);
}
function attachVentaEvents_OP(col, mode, grid, totalPages) {
  // Remove buttons
  grid.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const btnMode = btn.getAttribute("data-mode") || "individual";
      if (btnMode === "individual") {
        col.cards.splice(idx, 1);
      } else {
        const entry = col.cards.find((_, i) => i === idx);
        if (!entry) return;
        if (entry.quantity > 1) entry.quantity--;
        else col.cards.splice(idx, 1);
      }
      guardarVenta();
      renderVentaView();
    });
  });
  // Price inputs
  grid.querySelectorAll(".venta-price-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      col.cards[idx].customPrice = isNaN(parseFloat(inp.value)) ? 0 : parseFloat(inp.value);
      guardarVenta();
    });
  });
  // Quantity buttons
  grid.querySelectorAll(".venta-qty-btn[data-action='incr']").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const btnMode = btn.getAttribute("data-mode") || "playset";
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const max = btnMode === "editable" ? 50 : 4;
      if (col.cards[idx].quantity < max) col.cards[idx].quantity++;
      guardarVenta();
      renderVentaView();
    });
  });
  grid.querySelectorAll(".venta-qty-btn[data-action='decr']").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      if (col.cards[idx].quantity > 1) col.cards[idx].quantity--;
      else col.cards.splice(idx, 1);
      guardarVenta();
      renderVentaView();
    });
  });
  // Quantity inputs (editable mode)
  grid.querySelectorAll(".venta-qty-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const idx = parseInt(inp.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const val = parseInt(inp.value);
      if (val < 1) { col.cards.splice(idx, 1); }
      else { col.cards[idx].quantity = Math.min(val, 50); }
      guardarVenta();
      renderVentaView();
    });
  });
  // Click to open card modal
  grid.querySelectorAll(".venta-slot .card-img-wrap img").forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".venta-slot")?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
  document.getElementById("ventaPrevBtn").disabled = ventaPage <= 1;
  document.getElementById("ventaNextBtn").disabled = ventaPage >= totalPages;
  document.getElementById("ventaPageInfo").textContent = "Página " + ventaPage + " de " + totalPages;
}
