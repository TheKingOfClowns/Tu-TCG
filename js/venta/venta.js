// ─── Venta ─────────────────────────────────────────────────────────────
function renderVentaList_OP() {
  const container = document.getElementById("ventaList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(ventaCols).filter(id => {
    const tcg = ventaCols[id].tcg || "one-piece";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    const msg = currentTcg ? t("venta.empty_tcg") : t("venta.empty");
    container.innerHTML = `<div class="collection-empty"><p>${msg}</p><button class="btn-primary" id="createFirstVentaBtn">${t("venta.create_first")}</button></div>`;
    const btn = document.getElementById("createFirstVentaBtn");
    if (btn) btn.addEventListener("click", pedirCrearVenta);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(id => {
    const col = ventaCols[id];
    const coverImg = getFirstCardImage(col.cards, col);
    const isDeck = col.subtype === "deck";
    const totalStr = isDeck
      ? `${col.leader ? t("venta.leader_prefix") : ""}${t("venta.count_cards", { n: (col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0) })}${col.dons?.length ? " · " + col.dons.length + " DON" : ""}`
      : `${t("venta.count_cards", { n: col.cards.reduce((s, c) => s + (c.quantity || 1), 0) })}`;
    const badgeText = isDeck ? t("venta.badge_deck") : t("venta.badge_stock");
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
          const dp = col.customTotalPrice != null ? Number(col.customTotalPrice) : 0;
          const tc = col.totalCurrency || "ARS";
          return `<div class="venta-total-price-row">
            <div class="venta-total-currency-toggle">
              <button class="currency-btn ${tc !== "USD" ? "active" : ""}" data-total-currency="ARS" data-id="${id}">ARS</button>
              <button class="currency-btn ${tc === "USD" ? "active" : ""}" data-total-currency="USD" data-id="${id}">USD</button>
            </div>
            <span data-totalprice="1" style="font-size:var(--text-sm);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">$${dp.toFixed(2)}</span>
            <button class="btn-ghost btn-xs" data-action="editprice" data-id="${id}" style="padding:2px 6px;font-size:10px;border-radius:var(--radius-sm);flex-shrink:0" title="${t("venta.edit_price_title")}">✎</button>
          </div>`;
        })()}
      </div>
      <div class="binder-cover-actions">
        <button class="btn-ghost btn-xs" data-action="open" data-id="${id}">${t("venta.open")}</button>
        <button class="btn-ghost btn-xs" data-action="rename" data-id="${id}">${t("venta.rename")}</button>
        <button class="btn-danger btn-xs" data-action="delete" data-id="${id}">${t("venta.delete")}</button>
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
        title: t("venta.rename_title"),
        confirmText: t("venta.save"),
        placeholder: t("venta.new_name_ph"),
        initialValue: ventaCols[id].name,
        onConfirm: (nombre) => { ventaCols[id].name = nombre.trim(); guardarVenta(); renderVentaList_OP(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const idVenta = b.getAttribute("data-id");
      showConfirmModal(t("venta.delete_confirm", { name: ventaCols[idVenta].name }), () => {
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
      const current = col.customTotalPrice != null ? col.customTotalPrice : 0;
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
        col.customTotalPrice = val;
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
  container.querySelectorAll("[data-total-currency]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      const col = ventaCols[id];
      if (!col) return;
      col.totalCurrency = b.getAttribute("data-total-currency");
      guardarVenta(); renderVentaList_OP();
    });
  });
}
async function pedirCrearVenta_OP() {
  if (!isAuthenticated()) { showAuthModal(); return; }

  const profile = await getProfile();
  const hasContact = profile?.contact_phone || profile?.contact_wsp;
  if (!hasContact) {
    showCreateModal({
      title: t("venta.contact_title"),
      confirmText: t("venta.contact_goto"),
      placeholder: "",
      extraHTML: `
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:0">
          ${t("venta.contact_body")}
        </p>
      `,
      onConfirm: () => {
        if (typeof openProfile === "function") openProfile();
      }
    });
    return;
  }

  showCreateModal({
    title: t("venta.create_title"),
    confirmText: t("venta.create"),
    placeholder: t("venta.create_name_ph"),
    onConfirm: (nombre) => {
      const id = generarId();
      ventaCols[id] = { id, name: nombre.trim(), subtype: "binder", cards: [], is_public: false, display_mode: "stock", tcg: currentTcg || "one-piece" };
      guardarVenta();
      renderVentaList_OP();
    }
  });
}
function openVenta(id) { currentVentaId = id; ventaPage = 1; if (typeof navigateToView === 'function') navigateToView("venta", {id: id}, {}); else mostrarVista("venta"); }
function renderVentaView() {
  var _rs = (typeof snapScroll === "function") ? snapScroll() : null;
  try {
  const grid = document.getElementById("ventaGrid");
  const deckContainer = document.getElementById("ventaDeckContainer");
  const pagination = document.getElementById("ventaPagination");
  const title = document.getElementById("ventaTitle");
  const toggleContainer = document.getElementById("ventaPublicToggleContainer");
  const modeContainer = document.getElementById("ventaModeContainer");
  if (!grid || !currentVentaId) return;
  const col = ventaCols[currentVentaId];
  if (!col) { if (typeof navigateToView === 'function') navigateToView("ventaCols", {}, {}); else mostrarVista("ventaCols"); return; }
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
  if (clearPB) clearPB.textContent = t("venta.clear_page_btn");
  if (clearAB) clearAB.textContent = t("venta.clear_all_btn");
  title.textContent = col.name;
  if (typeof normalizeVentaCol === "function" && col.subtype !== "deck" && col.display_mode !== "stock") { normalizeVentaCol(col); guardarVenta(); }
  const mode = col.subtype === "deck" ? "deck" : "stock";
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">${t("venta.private")}</span>
        <input type="checkbox" id="ventaPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">${t("venta.public")}</span>
      </label>
    ` : "";
    const chk = document.getElementById("ventaPublicCheck");
    if (chk) chk.onchange = () => toggleBinderPublic(currentVentaId);
  }
  if (modeContainer) {
    modeContainer.innerHTML = mode === "deck" ? "" : `<span class="venta-mode-badge">${t("venta.badge_stock")}</span>`;
  }
  grid.innerHTML = "";
  if (mode === "deck") return;
  renderVentaStock(col, grid);
  if (!grid.hasAttribute("data-empty-click")) {
    grid.setAttribute("data-empty-click", "1");
    grid.addEventListener("click", function(e) {
      if (e.target.closest(".binder-empty")) {
        var _vcol = ventaCols[currentVentaId];
        if (_vcol && _vcol.subtype === "deck") {
          addingToBinderId = currentVentaId;
          addingToBinderName = _vcol.name || "";
          addingToBinderType = "venta";
          if (typeof navigateToView === 'function') navigateToView("catalog", {}, {}); else mostrarVista("catalog");
        } else if (typeof goToCatalogWithTarget === "function") goToCatalogWithTarget("venta", currentVentaId);
      }
    });
  }
  } finally { if (_rs) _rs(); }
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
  const q = Math.min(c.quantity || 1, window.VENTA_STOCK_MAX || 20);
  const qtyHTML = `<div class="venta-qty-control"><button class="venta-qty-btn" data-action="decr" data-ventaidx="${globalIdx}" data-mode="stock">&minus;</button><input type="number" class="venta-qty-input venta-qty-value" value="${q}" min="1" max="20" data-ventaidx="${globalIdx}"><button class="venta-qty-btn" data-action="incr" data-ventaidx="${globalIdx}" data-mode="stock">+</button></div>`;
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
        <span class="venta-price-label">${t("venta.price_label")}</span>
        <span class="venta-price-prefix">$</span>
        <input type="number" class="venta-price-input" step="0.5" min="0" value="${cp}" data-ventaidx="${globalIdx}">
        <span class="venta-currency-label ${c.priceCurrency === "USD" ? "usd" : ""}">${c.priceCurrency || "ARS"}</span>
      </div>
      <div class="venta-currency-toggle">
        <button class="currency-btn ${c.priceCurrency !== "USD" ? "active" : ""}" data-currency="ARS">ARS</button>
        <button class="currency-btn ${c.priceCurrency === "USD" ? "active" : ""}" data-currency="USD">USD</button>
      </div>
    </div>
    <button class="binder-remove" data-ventaidx="${globalIdx}" data-mode="${mode}">&times;</button>`;
}
function renderVentaStock(col, grid) { return window.renderVentaGrouped(col, grid, "stock"); }
function renderVentaIndividual_OP(col, grid) { return renderVentaGrouped_OP(col, grid, "stock"); }
function renderVentaGrouped_OP(col, grid, mode) {
  if (mode !== "stock") mode = "stock";
  const _pgSize = pageSizeFor(grid, 3).size; // ponytail: 3 filas exactas
  const totalPages = Math.max(1, Math.ceil((col.cards || []).length / _pgSize));
  if (ventaPage > totalPages) ventaPage = totalPages; // ponytail: página vacía = salto arriba
  const start = (ventaPage - 1) * _pgSize;
  const pageCards = (col.cards || []).slice(start, start + _pgSize);
  for (let i = 0; i < _pgSize; i++) {
    const slot = document.createElement("div");
    const globalIdx = start + i;
    slot.className = "card venta-slot venta-grouped";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      slot.setAttribute("data-key", c._key || "");
      slot.setAttribute("data-cardkey", c._key || "");
      slot.innerHTML = buildVentaCardHTML_OP(c, globalIdx, "stock");
    } else {
      slot.innerHTML = '<div class="binder-empty">+</div>';
    }
    grid.appendChild(slot);
  }
  attachVentaEvents_OP(col, "stock", grid, totalPages);
  setupVentaSplit(grid, col);
}
function attachVentaEvents_OP(col, mode, grid, totalPages) {
  // Remove buttons
  grid.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const entry = col.cards.find((_, i) => i === idx);
      if (!entry) return;
      if ((entry.quantity || 1) > 1) { entry.quantity--; guardarVenta(); renderVentaView(); }
      else removeEntryWithUndo(col, idx, guardarVenta, renderVentaView);
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
  // Currency toggles
  grid.querySelectorAll(".currency-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const slot = btn.closest(".venta-slot");
      if (!slot) return;
      const idx = parseInt(slot.getAttribute("data-global"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const newCurrency = btn.getAttribute("data-currency");
      col.cards[idx].priceCurrency = newCurrency;
      guardarVenta();
      btn.parentElement.querySelectorAll(".currency-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  // Quantity buttons
  grid.querySelectorAll(".venta-qty-btn[data-action='incr']").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const max = window.VENTA_STOCK_MAX || 20;
      if ((col.cards[idx].quantity || 1) >= max) return;
      if (typeof overCardCap === "function" && await overCardCap(col, 1)) {
        const plan = (typeof getMyPlan === "function") ? await getMyPlan() : null;
        if (typeof showToast === "function") showToast(upsellMsg("cards", plan), "error");
        return;
      }
      col.cards[idx].quantity++;
      guardarVenta();
      ventaSyncQtyInput(btn, idx);
    });
  });
  grid.querySelectorAll(".venta-qty-btn[data-action='decr']").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      if (col.cards[idx].quantity > 1) { col.cards[idx].quantity--; guardarVenta(); ventaSyncQtyInput(btn, idx); }
      else removeEntryWithUndo(col, idx, guardarVenta, renderVentaView);
    });
  });
  // Quantity inputs (stock 1-20)
  grid.querySelectorAll(".venta-qty-input").forEach(inp => {
    inp.addEventListener("change", async () => {
      const idx = parseInt(inp.getAttribute("data-ventaidx"));
      const col = ventaCols[currentVentaId];
      if (!col || !col.cards[idx]) return;
      const val = parseInt(inp.value);
      if (val < 1) { removeEntryWithUndo(col, idx, guardarVenta, renderVentaView); return; }
      const capped = Math.min(val, window.VENTA_STOCK_MAX || 20);
      const delta = capped - (col.cards[idx].quantity || 1);
      if (delta > 0 && typeof overCardCap === "function" && await overCardCap(col, delta)) {
        const plan = (typeof getMyPlan === "function") ? await getMyPlan() : null;
        if (typeof showToast === "function") showToast(upsellMsg("cards", plan), "error");
        inp.value = col.cards[idx].quantity || 1;
        return;
      }
      col.cards[idx].quantity = capped;
      guardarVenta();
      inp.value = capped;
    });
  });
  // Click to open card modal
  grid.querySelectorAll(".venta-slot .card-img-wrap img").forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const slot = this.closest(".venta-slot");
      const key = slot?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        const startIdx = parseInt(slot?.getAttribute("data-global")) || 0;
        openCardInModal(carta, navList, startIdx);
      }
    });
  });
  document.getElementById("ventaPrevBtn").disabled = ventaPage <= 1;
  document.getElementById("ventaNextBtn").disabled = ventaPage >= totalPages;
  document.getElementById("ventaPageInfo").textContent = t("venta.page", { a: ventaPage, b: totalPages });
}

// ponytail: +/−/input no reconstruyen (el rebuild reseteaba scroll); solo pintan el número
function ventaSyncQtyInput(fromEl, idx) {
  try {
    const col = ventaCols[currentVentaId];
    const slot = fromEl && fromEl.closest ? fromEl.closest(".venta-slot, .venta-card") : null;
    const inp = slot ? slot.querySelector(".venta-qty-input") : grid_safe_query(idx);
    if (inp) inp.value = (col && col.cards[idx] && col.cards[idx].quantity) || 1;
  } catch (e) {}
}
function grid_safe_query(idx) {
  try {
    const grid = document.getElementById("ventaGrid");
    const slot = grid ? grid.querySelector('[data-global="' + idx + '"]') : null;
    return slot ? slot.querySelector(".venta-qty-input") : null;
  } catch (e) { return null; }
}
// ponytail: swipe horizontal crea copia qty1 misma carta (cada stack tope 20, N stacks)
function setupVentaSplit(grid, col) {
  if (!grid || grid._splitBound) return;
  grid._splitBound = true;
  let sx = 0, sy = 0, target = null;
  grid.addEventListener("pointerdown", e => {
    const slot = e.target.closest(".venta-slot");
    if (!slot || e.target.closest("button,input")) return;
    sx = e.clientX; sy = e.clientY; target = slot;
  });
  grid.addEventListener("pointerup", async e => {
    if (!target) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const slot = target; target = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 30) return;
    const idx = parseInt(slot.getAttribute("data-global"));
    const cur = ventaCols[currentVentaId];
    if (!cur || !cur.cards[idx]) return;
    if (typeof overCardCap === "function" && await overCardCap(cur, 1)) {
      if (typeof showToast === "function") showToast(t("venta.split_cap"), "error");
      return;
    }
    const src = cur.cards[idx];
    const copy = Object.assign({}, src, { quantity: 1 });
    cur.cards.splice(idx + 1, 0, copy);
    guardarVenta(); renderVentaView();
    if (typeof showToast === "function") showToast(t("venta.split_ok"), "success");
  });
}

// ─── Venta view events (bound here: renderVentaView is defined in this file) ──
(function bindVentaViewListeners() {
  const el = (id) => document.getElementById(id);
  el("ventaClearPageBtn")?.addEventListener("click", () => {
    const col = ventaCols[currentVentaId];
    if (!col) return;
    if (col.subtype === "deck") {
      if (!col.cards.length) return;
      const total = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
      if (confirm(t("venta.clear_deck_confirm", { n: total }))) {
        col.cards = [];
        guardarVenta(); renderVentaView();
      }
      return;
    }
    const _pgSize = pageSizeFor(document.getElementById("ventaGrid"), 3).size;
    const start = (ventaPage - 1) * _pgSize;
    const end = Math.min(start + _pgSize, col.cards.length);
    if (start >= col.cards.length) return;
    if (confirm(t("venta.clear_page_confirm", { n: end - start }))) {
      col.cards.splice(start, end - start);
      const totalPages = Math.max(1, Math.ceil(col.cards.length / _pgSize));
      if (ventaPage > totalPages) ventaPage = totalPages;
      guardarVenta(); renderVentaView();
    }
  });
  el("ventaClearAllBtn")?.addEventListener("click", () => {
    const col = ventaCols[currentVentaId];
    if (!col) return;
    if (col.subtype === "deck") {
      if (!col.dons?.length) return;
      if (confirm(t("venta.clear_dons_confirm", { n: col.dons.length }))) {
        col.dons = [];
        guardarVenta(); renderVentaView();
      }
      return;
    }
    if (confirm(t("venta.clear_all_confirm", { name: col.name }))) {
      col.cards = []; ventaPage = 1; guardarVenta(); renderVentaView();
    }
  });
  el("ventaPrevBtn")?.addEventListener("click", () => {
    const col = ventaCols[currentVentaId];
    if (col && ventaPage > 1) { ventaPage--; renderVentaView(); }
  });
  el("ventaNextBtn")?.addEventListener("click", () => {
    const col = ventaCols[currentVentaId];
    if (!col) return;
    const totalPages = Math.max(1, Math.ceil(col.cards.length / pageSizeFor(document.getElementById("ventaGrid"), 3).size));
    if (ventaPage < totalPages) { ventaPage++; renderVentaView(); }
  });
  // ponytail: resize recalcula filas completas (debounce, solo venta visible)
  var _ventaRzT = null;
  window.addEventListener("resize", () => {
    clearTimeout(_ventaRzT);
    _ventaRzT = setTimeout(() => {
      var vv = document.getElementById("ventaView");
      if (vv && vv.style.display !== "none" && typeof renderVentaView === "function") renderVentaView();
    }, 250);
  });
})();
