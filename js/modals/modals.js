// ─── Selection Mode ───────────────────────────────────────────────────────
function toggleSelectionMode() {
  selectionMode = !selectionMode;
  const btn = document.getElementById("seleccionarBtn");
  if (selectionMode) {
    btn.textContent = "Cancelar";
    btn.classList.add("active");
  } else {
    btn.textContent = "Seleccionar";
    btn.classList.remove("active");
    document.querySelectorAll(".card.selected").forEach(el => el.classList.remove("selected"));
    selectedCards = {};
  }
  actualizarBadge();
  actualizarBadgesEnPagina();
}
function toggleCardSelection(imgEl) {
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  if (!cardEl) return;
  const cardKey = cardEl.getAttribute("data-cardkey");
  if (!cardKey) return;
  const carta = cartasMap[cardKey];
  if (!carta) return;
  const next = selectedCards[cardKey] ? (
    selectedCards[cardKey].count === 1 ? 4 :
    selectedCards[cardKey].count === 4 ? 10 : 0
  ) : 1;
  if (next === 0) {
    delete selectedCards[cardKey];
    cardEl.classList.remove("selected");
  } else {
    selectedCards[cardKey] = {
      card_set_id: carta.card_set_id, card_name: carta.card_name, card_image: carta.card_image,
      card_color: carta.card_color, card_type: carta.card_type, rarity: carta.rarity || carta.rareza,
      set_id: carta.set_id, producto: carta.producto, category: carta.category,
      market_price: carta.market_price, inventory_price: carta.inventory_price,
      print_type: carta.print_type, cardset: carta.cardset, count: next
    };
    cardEl.classList.add("selected");
  }
  actualizarBadge();
  actualizarBadgesEnPagina();
}
function reapplySelectionClasses() {
  if (!selectionMode) return;
  cardsContainer.querySelectorAll(".card").forEach(el => {
    const key = el.getAttribute("data-cardkey");
    if (key && selectedCards[key]) el.classList.add("selected");
  });
}
// ─── Pending Cards ────────────────────────────────────────────────────────
function actualizarBadge() {
  const source = selectionMode ? selectedCards : pendingCards;
  const keys = Object.keys(source);
  const unique = keys.length;
  const total = keys.reduce((s, k) => s + source[k].count, 0);
  const btn = document.getElementById("agregarBtn");
  if (unique) { btn.innerHTML = 'Agregar a <span class="pending-badge">' + unique + '</span> <span class="pending-total">(' + total + ')</span>'; }
  else { btn.textContent = "Agregar a"; }
}
function limpiarPendientes() { pendingCards = {}; actualizarBadge(); actualizarBadgesEnPagina(); }
// ─── Create / Rename Modal ──────────────────────────────────────────────
// Create / Rename Modal
function showCreateModal(opts) {
  const overlay = document.getElementById("createModalOverlay");
  const input = document.getElementById("createModalInput");
  const title = document.getElementById("createModalTitle");
  const confirmBtn = document.getElementById("createModalConfirm");
  const extra = document.getElementById("createModalExtra");
  title.textContent = opts.title || "Crear";
  confirmBtn.textContent = opts.confirmText || "Crear";
  input.placeholder = opts.placeholder || "Nombre";
  input.value = opts.initialValue || "";
  extra.innerHTML = opts.extraHTML || "";
  _createCallback = opts.onConfirm || null;
  overlay.style.display = "flex";
  setTimeout(() => input.focus(), 100);
  input.select();
}
function confirmCreateModal() {
  const input = document.getElementById("createModalInput");
  const nombre = input.value.trim();
  if (!nombre) { input.focus(); input.style.borderColor = "var(--danger)"; setTimeout(() => input.style.borderColor = "", 1500); return; }
  if (_createCallback) _createCallback(nombre);
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}
function hideCreateModal() {
  document.getElementById("createModalOverlay").style.display = "none";
  _createCallback = null;
}
// ─── Add Modal ───────────────────────────────────────────────────────────
function mostrarAddModal() {
  const overlay = document.getElementById("addModalOverlay");
  const list = document.getElementById("addModalList");
  const pendSection = document.getElementById("addModalPendSection");
  const qtyRow = document.getElementById("addModalQtyRow");
  qtyRow.style.display = "none";
  list.innerHTML = "";
  pendSection.innerHTML = "";
  const pendKeys = Object.keys(pendingCards);
  if (!pendKeys.length) {
    list.innerHTML = "<p style='color:var(--text-tertiary);padding:10px;font-size:var(--text-sm)'>No hay cartas pendientes</p>";
    document.getElementById("addModalConfirm").style.display = "none";
    overlay.style.display = "flex";
    return;
  }
  document.getElementById("addModalConfirm").style.display = "";
  const totalCount = pendKeys.reduce((s, k) => s + pendingCards[k].count, 0);
  const maxShow = 5;
  const showAll = pendKeys.length <= maxShow;
  const visibleKeys = showAll ? pendKeys : pendKeys.slice(0, maxShow);
  const makeItem = (key, pc) => `
    <button class="pend-btn pend-minus" data-key="${key}" style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:12px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:1px solid var(--border-default)">&minus;</button>
    <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold);min-width:18px;text-align:center">${pc.count}x</span>
    <button class="pend-btn pend-plus" data-key="${key}" style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.06);color:var(--text-muted);font-size:12px;font-weight:var(--weight-bold);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:1px solid var(--border-default)">+</button>
    <span style="font-size:var(--text-xs);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${formatearNombre(pc)}</span>
    <span style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);margin-left:auto;flex-shrink:0">${(pc.category || pc.producto) === "DON" ? (pc.variant || "") : (pc.card_set_id || "")}</span>`;
  const pendHeader = document.createElement("div");
  pendHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)";
  pendHeader.innerHTML = `<span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Pendientes · ${pendKeys.length} cartas · ${totalCount} copias</span>`;
  pendSection.appendChild(pendHeader);
  const pendGrid = document.createElement("div");
  pendGrid.style.cssText = "display:flex;flex-direction:column;gap:2px";
  const renderKeys = (keys) => {
    pendGrid.innerHTML = "";
    keys.forEach(key => {
      const pc = pendingCards[key];
      if (!pc) return;
      const item = document.createElement("div");
      item.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:4px 6px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle)";
      item.innerHTML = makeItem(key, pc);
      pendGrid.appendChild(item);
    });
  };
  renderKeys(visibleKeys);
  if (!showAll) {
    const toggleBtn = document.createElement("button");
    toggleBtn.style.cssText = "margin-top:var(--space-1);padding:4px 8px;font-size:10px;color:var(--accent);cursor:pointer;background:none;border:none;font-family:var(--font-mono)";
    let expanded = false;
    const updateLabel = () => { toggleBtn.textContent = expanded ? "▲ Mostrar menos" : `▼ +${pendKeys.length - maxShow} más`; };
    updateLabel();
    toggleBtn.addEventListener("click", () => {
      expanded = !expanded;
      renderKeys(expanded ? pendKeys : visibleKeys);
      updateLabel();
      if (expanded) pendGrid.appendChild(toggleBtn); else pendGrid.appendChild(toggleBtn);
    });
    pendGrid.appendChild(toggleBtn);
  }
  pendSection.appendChild(pendGrid);
  // Pend buttons events
  pendSection.querySelectorAll(".pend-minus").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!pendingCards[key]) return;
      pendingCards[key].count--;
      if (pendingCards[key].count <= 0) delete pendingCards[key];
      actualizarBadge();
      mostrarAddModal();
    });
  });
  pendSection.querySelectorAll(".pend-plus").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!pendingCards[key]) return;
      pendingCards[key].count++;
      actualizarBadge();
      mostrarAddModal();
    });
  });
  // Collections list
  const colIds = Object.keys(collections);
  const ventaIds = Object.keys(ventaCols);
  if (colIds.length || ventaIds.length) {
    document.getElementById("addModalConfirm").style.display = "";
    if (colIds.length) {
      const sep = document.createElement("div");
      sep.style.cssText = "font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:var(--space-2) 0 var(--space-1)";
      sep.textContent = "Binder";
      list.appendChild(sep);
      colIds.forEach(id => {
        const col = collections[id];
        if (col.subtype === "deck") return;
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary);transition:background var(--transition-fast)";
        label.innerHTML = `<input type="checkbox" value="${id}" style="accent-color:var(--accent);width:14px;height:14px"> <span style="flex:1">${col.name}</span> <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted)">${col.cards.length}</span>`;
        list.appendChild(label);
      });
    }
    if (ventaIds.length) {
      const sep = document.createElement("div");
      sep.style.cssText = "font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:var(--space-3) 0 var(--space-1)";
      sep.textContent = "Venta";
      list.appendChild(sep);
      ventaIds.forEach(id => {
        const col = ventaCols[id];
        if (col.subtype === "deck") return;
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:var(--space-2);padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-sm);color:var(--text-secondary);transition:background var(--transition-fast)";
        label.innerHTML = `<input type="checkbox" value="${id}" data-venta="true" style="accent-color:var(--accent);width:14px;height:14px"> <span style="flex:1">${col.name}</span> <span style="font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-muted)">${col.cards.length}</span> <span style="font-size:10px;color:var(--accent);font-family:var(--font-mono);background:rgba(0,240,255,0.08);padding:1px 5px;border-radius:var(--radius-sm)">Venta</span>`;
        list.appendChild(label);
      });
    }
  } else {
    list.innerHTML += "<p style='color:var(--text-tertiary);padding:20px 10px;font-size:var(--text-sm);text-align:center'>Crea una colección primero</p>";
    document.getElementById("addModalConfirm").style.display = "none";
  }
  overlay.style.display = "flex";
}
function confirmarAdd() {
  const overlay = document.getElementById("addModalOverlay");
  const checks = overlay.querySelectorAll("#addModalList input:checked");
  if (!checks.length) { alert("Selecciona al menos una colección"); return; }
  checks.forEach(cb => {
    const colId = cb.value;
    const isVenta = cb.hasAttribute("data-venta");
    const target = isVenta ? ventaCols : collections;
    const col = target[colId];
    if (!col) return;
    if (col.subtype === "deck") {
      Object.values(pendingCards).forEach(pc => {
        const key = getCardKey(pc);
        const cardType = pc.card_type || "";
        if (cardType === "LEADER") {
          if (col.leader && !confirm("Ya hay un líder. ¿Reemplazarlo?")) return;
          col.leader = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, customPrice: 0 };
        } else if (cardType === "DON!!" || cardType === "DON") {
          const donCount = col.dons?.length || 0;
          if (donCount + pc.count > 10) { alert("Máximo 10 DON!! en el deck"); return; }
          if (!col.dons) col.dons = [];
          for (let i = 0; i < pc.count; i++) {
            col.dons.push({ _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, customPrice: 0 });
          }
        } else {
          if (col.leader && pc.card_color && col.leader.card_color) {
            const lc = col.leader.card_color?.split("/").map(s => s.trim()) || [];
            if (!lc.some(c => pc.card_color?.includes(c))) {
              if (!confirm("Esta carta no coincide con el color del líder. ¿Agregar de todas formas?")) return;
            }
          }
          const mainTotal = col.cards.reduce((s, c) => s + (c.quantity || 1), 0);
          const newTotal = mainTotal + pc.count;
          if (newTotal > 50) { alert("Máximo 50 cartas en el deck. Solo caben " + (50 - mainTotal) + " más."); return; }
          const existing = col.cards.find(c => c._key === key);
          if (existing) {
            if (isUnlimited(pc)) {
              existing.quantity = (existing.quantity || 1) + pc.count;
            } else {
              existing.quantity = Math.min((existing.quantity || 1) + pc.count, 4);
            }
          } else {
            const defQty = isUnlimited(pc) ? pc.count : Math.min(pc.count, 4);
            col.cards.push({ _key: key, quantity: defQty, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset, customPrice: 0 });
          }
        }
      });
      if (isVenta) guardarVenta(); else guardarCollections();
      overlay.style.display = "none";
      actualizarBotonesBinder();
      limpiarPendientes();
      return;
    }
    if (col.subtype === "tracking") {
      let added = 0;
      Object.values(pendingCards).forEach(pc => {
        const key = getCardKey(pc);
        if (!col.cards.some(c => c._key === key)) {
          col.cards.push({ _key: key, owned: false });
          added++;
        }
      });
      col.target = col.cards.length;
      guardarCollections();
      overlay.style.display = "none";
      limpiarPendientes();
      if (added) showToast(added + " carta(s) agregada(s)", "success");
      return;
    }
    const isGrouped = isVenta && (col.display_mode === "playset" || col.display_mode === "editable");
    Object.values(pendingCards).forEach(pc => {
      const key = getCardKey(pc);
      if (isGrouped) {
        const existing = col.cards.find(c => c._key === key);
        if (existing) {
          existing.quantity = (existing.quantity || 1) + pc.count;
          if (col.display_mode === "playset" && existing.quantity > 4) existing.quantity = 4;
          if (existing.quantity > 999) existing.quantity = 999;
        } else {
          col.cards.push({ _key: key, quantity: col.display_mode === "playset" ? Math.min(pc.count, 4) : Math.min(pc.count, 50), customPrice: 0, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset });
        }
      } else {
        for (let i = 0; i < pc.count; i++) {
          const entry = { _key: key, card_set_id: pc.card_set_id, card_name: pc.card_name, card_image: pc.card_image, card_color: pc.card_color, card_type: pc.card_type, rarity: pc.rarity, set_id: pc.set_id, producto: pc.producto, category: pc.category, market_price: pc.market_price, inventory_price: pc.inventory_price, print_type: pc.print_type, cardset: pc.cardset };
          if (isVenta) entry.customPrice = 0;
          col.cards.push(entry);
        }
      }
    });
  });
  guardarCollections();
  guardarVenta();
  overlay.style.display = "none";
  actualizarBotonesBinder();
  limpiarPendientes();
}
function renderModalInfo(carta) {
  const efecto = (carta.effect || "").replace(/\n/g, "<br>");
  const rareza = obtenerRareza(carta);
  const color = carta.card_color ? (coloresES[carta.card_color] || carta.card_color) : "";
  document.getElementById("modalMainImg").src = carta.card_image || 'TUTCG.webp';
  document.getElementById("modalInfoCol").innerHTML = `
    <h2 class="modal-name">${formatearNombre(carta)}</h2>
    <span class="modal-set-id">${carta.card_set_id || ""}</span>
    <div class="modal-info-grid">
      ${rareza ? `<div class="modal-info-item"><span class="modal-info-label">Rareza</span><span>${rareza}</span></div>` : ""}
      ${carta.print_type ? `<div class="modal-info-item"><span class="modal-info-label">Tipo</span><span>${carta.print_type}</span></div>` : ""}
      ${color ? `<div class="modal-info-item"><span class="modal-info-label">Color</span><span>${color}</span></div>` : ""}
      ${carta.cost ? `<div class="modal-info-item"><span class="modal-info-label">${carta.card_type === "LEADER" ? "Life" : "Cost"}</span><span>${carta.cost}</span></div>` : ""}
      ${carta.power ? `<div class="modal-info-item"><span class="modal-info-label">Power</span><span>${carta.power}</span></div>` : ""}
      ${carta.counter && carta.counter !== "-" ? `<div class="modal-info-item"><span class="modal-info-label">Counter</span><span>${carta.counter}</span></div>` : ""}
      ${carta.attribute ? `<div class="modal-info-item"><span class="modal-info-label">Attribute</span><span>${carta.attribute}</span></div>` : ""}
      ${carta.set_id ? `<div class="modal-info-item"><span class="modal-info-label">Set</span><span>${(carta.category === 'PROMO' || carta.category === 'OTHER') && carta.set_name ? carta.set_name : (nombresExpansiones[carta.set_id] || carta.set_id)}${rareza === "Reprint" ? " (Reprint)" : ""}</span></div>` : ""}
    </div>
    ${efecto ? `<div class="modal-effect"><span class="modal-info-label">Effect</span><p>${efecto}</p></div>` : ""}
  `;
}
function openCardInModal(carta, navList, startIdx) {
  if (!carta) return;
  const isLeader = carta.card_type === "LEADER";
  const leaderVariants = isLeader
    ? cartas.filter(c => c.card_set_id === carta.card_set_id && c.card_type === "LEADER")
    : [];
  const useVariantNav = isLeader && leaderVariants.length > 1;
  const list = navList || (useVariantNav ? leaderVariants : cartasFiltradas);
  if (!list || !list.length) return;
  if (navList && startIdx != null) {
    currentCardIndex = startIdx;
  } else {
    currentCardIndex = list.findIndex(c => getCardKey(c) === getCardKey(carta));
  }
  if (currentCardIndex === -1) currentCardIndex = 0;
  const variants = cartas.filter(c =>
    c.card_set_id === carta.card_set_id &&
    c.language === carta.language &&
    getCardKey(c) !== getCardKey(carta)
  );
  let infoHTML = `
    <div class="modal-nav-wrap">
      <button class="modal-nav-btn prev-btn" data-dir="prev">&#8249;</button>
      <div class="modal-nav-content">
        <div class="modal-layout">
          <div class="modal-image-col">
            <img src="${carta.card_image || 'TUTCG.webp'}" class="modal-main-img" id="modalMainImg">
          </div>
          <div class="modal-info-col" id="modalInfoCol">
          </div>
        </div>`;
  if (variants.length) {
    infoHTML += `<div class="modal-variants"><span class="modal-variants-label">Variants</span><div class="modal-variants-list">`;
    infoHTML += `<div class="modal-variant-item selected" data-cardkey="${getCardKey(carta)}">
      <img src="${carta.card_image || 'TUTCG.webp'}" title="Current">
    </div>`;
    variants.forEach(v => {
      infoHTML += `<div class="modal-variant-item" data-cardkey="${getCardKey(v)}">
        <img src="${v.card_image || 'TUTCG.webp'}" title="${formatearNombre(v)}">
      </div>`;
    });
    infoHTML += `</div></div>`;
  }
  infoHTML += `</div>
    <button class="modal-nav-btn next-btn" data-dir="next">&#8250;</button>
  </div>`;
  const body = document.getElementById("modalBody");
  body.innerHTML = infoHTML;
  modal.style.display = "flex";
  renderModalInfo(carta);
  body.querySelectorAll(".modal-variant-item").forEach(item => {
    item.addEventListener("click", () => {
      const key = item.getAttribute("data-cardkey");
      const v = key ? cartasMap[key] : null;
      if (v) {
        renderModalInfo(v);
        body.querySelectorAll(".modal-variant-item").forEach(el => el.classList.remove("selected"));
        item.classList.add("selected");
      }
    });
  });
  body.querySelectorAll(".modal-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      const len = list.length;
      const newIdx = ((dir === 'prev' ? currentCardIndex - 1 : currentCardIndex + 1) + len) % len;
      const nextCarta = list[newIdx];
      if (!nextCarta) return;
      openCardInModal(nextCarta, navList, navList ? newIdx : undefined);
    });
  });
}
function abrirModal(imgEl) {
  if (selectionMode) { toggleCardSelection(imgEl); return; }
  const cardEl = imgEl?.closest ? imgEl.closest(".card") : null;
  const cardKey = cardEl?.getAttribute("data-cardkey");
  if (cardKey) {
    const carta = cartasMap[cardKey];
    if (carta) openCardInModal(carta);
  }
}
