// ─── Collection List ──────────────────────────────────────────────────────
function getFirstCardImage(cards, col) {
  if (col?.leader?.card_image) return col.leader.card_image;
  if (col?.leader?._key) {
    const found = cartasMap[col.leader._key];
    if (found?.card_image) return found.card_image;
  }
  if (col?.legend?.card_image) return col.legend.card_image;
  if (col?.legend?._key) {
    const found = cartasMap[col.legend._key];
    if (found?.card_image) return found.card_image;
  }
  if (col?.champions?.length) {
    const firstChamp = col.champions[0];
    if (firstChamp.card_image) return firstChamp.card_image;
    if (firstChamp._key) {
      const found = cartasMap[firstChamp._key];
      if (found?.card_image) return found.card_image;
    }
  }
  if (!cards || !cards.length) return null;
  const first = cards[0];
  if (first.card_image) return first.card_image;
  if (first._key) {
    const found = cartasMap[first._key];
    if (found?.card_image) return found.card_image;
  }
  return null;
}
function getTotalPrice(col) {
  let total = 0;
  const cards = col.cards || [];
  const isDeck = col.subtype === "deck";
  if (isDeck && col.leader && col.leader.customPrice != null) total += Number(col.leader.customPrice);
  if (isDeck && col.legend && col.legend.customPrice != null) total += Number(col.legend.customPrice);
  if (isDeck && col.champions) {
    col.champions.forEach(function(ch) {
      if (ch.customPrice != null) total += Number(ch.customPrice) * (ch.quantity || 1);
    });
  }
  if (isDeck) {
    (col.runes || []).forEach(function(r) { if (r.customPrice != null) total += Number(r.customPrice) * (r.quantity || 1); });
    (col.battlefields || []).forEach(function(b) { if (b.customPrice != null) total += Number(b.customPrice); });
    (col.sideboard || []).forEach(function(s) { if (s.customPrice != null) total += Number(s.customPrice); });
  }
  cards.forEach(c => {
    const qty = c.quantity || 1;
    if (c.customPrice != null) total += Number(c.customPrice) * qty;
  });
  if (isDeck && col.dons) {
    col.dons.forEach(d => { if (d.customPrice != null) total += Number(d.customPrice); });
  }
  return total;
}
function renderCollectionList_OP() {
  const container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(collections).filter(id => {
    const tcg = collections[id].tcg || "one-piece";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    const msg = currentTcg ? "No tienes colecciones para este TCG" : "No tienes colecciones";
    container.innerHTML = `<div class="collection-empty"><p>${msg}</p><button class="btn-primary" id="createFirstColBtn">Crear primera colección</button></div>`;
    const btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion_OP);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(id => {
    const col = collections[id];
    const coverImg = getFirstCardImage(col.cards, col);
    const isDeck = col.subtype === "deck";
    const isTracking = col.subtype === "tracking";
    const deckCount = isDeck ? (col.cards || []).reduce((s, c) => s + (c.quantity || 1), 0) : col.cards.length;
    let totalCards, badgeClass, badgeText;
    if (isDeck) {
      totalCards = `${col.leader ? "1 líder · " : ""}${deckCount} cartas${col.dons?.length ? " · " + col.dons.length + " DON" : ""}`;
      badgeClass = "deck"; badgeText = "Deck";
    } else if (isTracking) {
      const owned = col.cards.filter(c => c.owned).length;
      const total = col.target || col.cards.length;
      const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      totalCards = `${owned} / ${total}`;
      badgeClass = "collection"; badgeText = { expansion: "Expansiones", rarity: "Rarezas", character: "Personaje", don: "Don Cards" }[col.tracking_type] || "Tracking";
    } else {
      totalCards = `${col.cards.length} cartas`;
      badgeClass = "collection"; badgeText = "Colección";
    }
    const div = document.createElement("div");
    div.className = "binder-cover-card";
    const progressSection = isTracking ? (() => {
      const owned = col.cards.filter(c => c.owned).length;
      const total = col.target || col.cards.length;
      const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      return `<div class="tracking-cover-progress"><div class="tracking-cover-progress-bar"><div class="tracking-cover-progress-fill" style="width:${pct}%"></div></div><span class="tracking-cover-progress-text">${pct}% — ${owned} de ${total}</span></div>`;
    })() : "";
    div.innerHTML = `
      <div class="binder-cover-img" style="background-image:url(${coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'"})">
        <div class="binder-cover-overlay">
          <span class="binder-cover-count">${totalCards}</span>
        </div>
      </div>
      <div class="binder-cover-meta">
        <span class="binder-cover-name-badge">${col.name}</span>
        <span class="binder-cover-badge ${badgeClass}">${badgeText}</span>
        ${progressSection}
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
      if (e.target.closest("button")) return;
      const openBtn = card.querySelector("[data-action='open']");
      if (openBtn) {
        currentCollectionId = openBtn.getAttribute("data-id");
        binderPage = 1;
        mostrarVista("binder");
      }
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: collections[id].name,
        onConfirm: (nombre) => { collections[id].name = nombre.trim(); guardarCollections(); renderCollectionList_OP(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const idCol = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección "' + collections[idCol].name + '"?', () => {
        delete collections[idCol]; guardarCollections(); renderCollectionList_OP();
      });
    });
  });
}
function pedirCrearColeccion_OP() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección",
    confirmText: "Crear",
    placeholder: "Nombre de la colección",
    extraHTML: `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);margin-top:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>
      <select id="createColSubtype" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="binder">Binder — cartas libres</option>
        <option value="deck">Deck — líder + 50 cartas + 10 DON!!</option>
      </select>`,
    onConfirm: (nombre) => {
      const subtype = document.getElementById("createColSubtype")?.value || "binder";
      const id = generarId();
      collections[id] = { id, name: nombre.trim(), subtype, cards: [], leader: null, dons: [], is_public: false, tcg: currentTcg || "one-piece" };
      guardarCollections();
      renderCollectionList_OP();
    }
  });
}

// ─── Binder Rendering ─────────────────────────────────────────────────────
function renderBinder_OP() {
  const grid = document.getElementById("binderGrid");
  const deckContainer = document.getElementById("binderDeckContainer");
  const trackingHeader = document.getElementById("trackingHeader");
  const pagination = document.getElementById("binderPagination");
  const title = document.getElementById("binderTitle");
  const toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (!grid || !currentCollectionId) return;
  grid.parentElement.classList.remove("tracking-checklist");
  const col = collections[currentCollectionId];
  if (!col) { mostrarVista("collections"); return; }
  if (col.subtype === "deck") {
    grid.style.display = "none";
    if (pagination) pagination.style.display = "none";
    deckContainer.style.display = "";
    trackingHeader.style.display = "none";
    document.getElementById("binderClearPageBtn").style.display = "";
    document.getElementById("binderClearAllBtn").style.display = "";
    renderDeckView("collection", col, deckContainer, title, toggleContainer);
    return;
  }
  if (col.subtype === "tracking") {
    grid.style.display = "";
    renderTrackingBinder(col, grid, title);
    return;
  }
  deckContainer.style.display = "none";
  trackingHeader.style.display = "none";
  document.getElementById("binderClearPageBtn").style.display = "";
  document.getElementById("binderClearAllBtn").style.display = "";
  grid.style.display = "";
  if (pagination) pagination.style.display = "";
  const clearPB = document.getElementById("binderClearPageBtn");
  const clearAB = document.getElementById("binderClearAllBtn");
  if (clearPB) clearPB.textContent = "Vaciar página";
  if (clearAB) clearAB.textContent = "Vaciar todo";
  title.textContent = col.name;
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">Privado</span>
        <input type="checkbox" id="binderPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">Público</span>
      </label>
    ` : "";
    const chk = document.getElementById("binderPublicCheck");
    if (chk) {
      chk.onchange = () => toggleBinderPublic(currentCollectionId);
    }
  }
  grid.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
  const start = (binderPage - 1) * binderPerPage;
  const pageCards = col.cards.slice(start, start + binderPerPage);
  for (let i = 0; i < binderPerPage; i++) {
    const slot = document.createElement("div");
    const globalIdx = start + i;
    slot.className = "card fade-in";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      const c = pageCards[i];
      const fullBinderCard = c._key ? cartasMap[c._key] : null;
      const data = fullBinderCard || c;
      const nombre = formatearNombre(data);
      const setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
      let badge = "";
      if (fullBinderCard) {
        const r = obtenerRareza(fullBinderCard);
        if (fullBinderCard.category === "DON" || fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") {
          if (fullBinderCard.set_id === "PRB-01" || fullBinderCard.set_id === "PRB-02") {
            if (["Reprint","Jolly Roger","Full Art","AA","Textured Foil","Manga","SP"].includes(r)) badge = r;
          } else if (r !== "Normal") {
            badge = r;
          }
        }
      }
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key);
      slot.setAttribute("data-cardkey", c._key);
      slot.innerHTML = `
        <div class="card-img-wrap">
          <img src="${c.card_image || fullBinderCard?.card_image || 'TUTCG.webp'}" onerror="this.src='TUTCG.webp'" loading="lazy">
        </div>
        <div class="card-body">
          <h3>${nombre}</h3>
          ${badge ? `<span class="card-print-type">${badge}</span>` : ""}
          <span class="card-set-id">${setId}</span>
        </div>
        <button class="binder-remove" data-global="${globalIdx}">&times;</button>`;
    } else {
      slot.innerHTML = `<div class="binder-empty">+</div>`;
      slot.removeAttribute("draggable");
    }
    grid.appendChild(slot);
  }
  grid.querySelectorAll(".card img").forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      const key = this.closest(".card")?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
  grid.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); removeFromCurrentCollection(parseInt(btn.getAttribute("data-global"))); });
  });
  document.getElementById("binderPrevBtn").disabled = binderPage <= 1;
  document.getElementById("binderNextBtn").disabled = binderPage >= totalPages;
  document.getElementById("binderPageInfo").textContent = "Página " + binderPage + " de " + totalPages;
  setupBinderDragDrop();
  if (!grid.hasAttribute("data-empty-click")) {
    grid.setAttribute("data-empty-click", "1");
    grid.addEventListener("click", function(e) {
      if (e.target.closest(".binder-empty")) {
        addingToBinderId = currentCollectionId;
        addingToBinderName = collections[currentCollectionId] ? collections[currentCollectionId].name : "";
        addingToBinderType = "collection";
        mostrarVista("catalog");
      }
    });
  }
}
function removeFromCurrentCollection(realIdx) {
  const col = collections[currentCollectionId];
  if (!col) return;
  col.cards.splice(realIdx, 1);
  guardarCollections();
  renderBinder_OP();
  actualizarBotonesBinder();
}
function actualizarBotonesBinder() {
  document.querySelectorAll(".add-binder-btn").forEach(btn => btn.classList.remove("added"));
}
function setupBinderDragDrop() {
  const slots = document.querySelectorAll("#binderGrid .card");
  slots.forEach(slot => {
    slot.addEventListener("dragstart", e => {
      const key = slot.getAttribute("data-key");
      if (!key) { e.preventDefault(); return; }
      e.dataTransfer.setData("text/plain", key);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging");
    });
    slot.addEventListener("dragend", e => slot.classList.remove("dragging"));
    slot.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
    slot.addEventListener("drop", e => {
      e.preventDefault();
      const fromKey = e.dataTransfer.getData("text/plain");
      const toGlobal = parseInt(slot.getAttribute("data-global"));
      const col = collections[currentCollectionId];
      if (!col) return;
      const fromIdx = col.cards.findIndex(s => s && s._key === fromKey);
      if (fromIdx === -1 || toGlobal >= col.cards.length) return;
      const card = col.cards.splice(fromIdx, 1)[0];
      const adjustedTo = toGlobal > fromIdx ? toGlobal - 1 : toGlobal;
      col.cards.splice(adjustedTo, 0, card);
      guardarCollections();
      renderBinder_OP();
    });
  });
}
