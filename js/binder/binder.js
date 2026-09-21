// ─── Collection List ──────────────────────────────────────────────────────
function renderCollectionList_OP() {
  const container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  const ids = Object.keys(collections).filter(id => {
    const tcg = collections[id].tcg || "one-piece";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    const msg = currentTcg ? t("binder.empty_tcg") : t("binder.empty");
    container.innerHTML = `<div class="collection-empty"><p>${msg}</p><button class="btn-primary" id="createFirstColBtn">${t("binder.create_first")}</button></div>`;
    const btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion);
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
      totalCards = `${col.leader ? t("binder.leader_prefix") : ""}${t("binder.count_cards", { n: deckCount })}${col.dons?.length ? " · " + col.dons.length + " DON" : ""}`;
      badgeClass = "deck"; badgeText = t("binder.badge_deck");
    } else if (isTracking) {
      const owned = col.cards.filter(c => c.owned).length;
      const total = col.target || col.cards.length;
      const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      totalCards = `${owned} / ${total}`;
      badgeClass = "collection"; badgeText = { expansion: t("binder.track_expansion"), rarity: t("binder.track_rarity"), character: t("binder.track_character"), don: t("binder.track_don") }[col.tracking_type] || t("binder.track_default");
    } else {
      totalCards = `${t("binder.count_cards", { n: col.cards.length })}`;
      badgeClass = "collection"; badgeText = t("binder.badge_collection");
    }
    const div = document.createElement("div");
    div.className = "binder-cover-card";
    const progressSection = isTracking ? (() => {
      const owned = col.cards.filter(c => c.owned).length;
      const total = col.target || col.cards.length;
      const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      return `<div class="tracking-cover-progress"><div class="tracking-cover-progress-bar"><div class="tracking-cover-progress-fill" style="width:${pct}%"></div></div><span class="tracking-cover-progress-text">${t("binder.progress", { p: pct, o: owned, total: total })}</span></div>`;
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
        <button class="btn-ghost btn-xs" data-action="open" data-id="${id}">${t("binder.open")}</button>
        <button class="btn-ghost btn-xs" data-action="rename" data-id="${id}">${t("binder.rename")}</button>
        <button class="btn-danger btn-xs" data-action="delete" data-id="${id}">${t("binder.delete")}</button>
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
        if (typeof navigateToView === 'function') navigateToView("binder", {id: currentCollectionId}, {}); else mostrarVista("binder");
      }
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(b => {
    b.addEventListener("click", () => { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; if (typeof navigateToView === 'function') navigateToView("binder", {id: currentCollectionId}, {}); else mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      showCreateModal({
        title: t("binder.rename_title"),
        confirmText: t("binder.save"),
        placeholder: t("binder.new_name_ph"),
        initialValue: collections[id].name,
        onConfirm: (nombre) => { collections[id].name = nombre.trim(); guardarCollections(); renderCollectionList_OP(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(b => {
    b.addEventListener("click", () => {
      const idCol = b.getAttribute("data-id");
      showConfirmModal(t("binder.delete_confirm", { name: collections[idCol].name }), () => {
        delete collections[idCol]; guardarCollections(); renderCollectionList_OP();
      });
    });
  });
}
function pedirCrearColeccion_OP() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: t("binder.create_title"),
    confirmText: t("binder.create"),
    placeholder: t("binder.create_name_ph"),
    extraHTML: `
      <label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);margin-top:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">${t("binder.type_label")}</label>
      <select id="createColSubtype" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
        <option value="binder">${t("binder.opt_binder")}</option>
        <option value="deck">${t("binder.opt_deck_op")}</option>
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
  var _rs = (typeof snapScroll === "function") ? snapScroll() : null;
  const grid = document.getElementById("binderGrid");
  const deckContainer = document.getElementById("binderDeckContainer");
  const trackingHeader = document.getElementById("trackingHeader");
  const pagination = document.getElementById("binderPagination");
  const title = document.getElementById("binderTitle");
  const toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (!grid || !currentCollectionId) return;
  grid.parentElement.classList.remove("tracking-checklist");
  const col = collections[currentCollectionId];
  if (!col) { if (typeof navigateToView === 'function') navigateToView("collections", {}, {}); else mostrarVista("collections"); return; }
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
  if (clearPB) clearPB.textContent = t("binder.clear_page_btn");
  if (clearAB) clearAB.textContent = t("binder.clear_all_btn");
  title.textContent = col.name;
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? `
      <label class="public-toggle">
        <span class="public-toggle-label ${!col.is_public ? "active" : ""}">${t("binder.private")}</span>
        <input type="checkbox" id="binderPublicCheck" ${col.is_public ? "checked" : ""}>
        <span class="public-toggle-track">
          <span class="public-toggle-thumb"></span>
        </span>
        <span class="public-toggle-label ${col.is_public ? "active" : ""}">${t("binder.public")}</span>
      </label>
    ` : "";
    const chk = document.getElementById("binderPublicCheck");
    if (chk) {
      chk.onchange = () => toggleBinderPublic(currentCollectionId);
    }
  }
  grid.innerHTML = "";
  var _pgSize = pageSizeFor(grid, 3).size; // ponytail: 3 filas exactas
  const totalPages = Math.max(1, Math.ceil(col.cards.length / _pgSize));
  const start = (binderPage - 1) * _pgSize;
  const pageCards = col.cards.slice(start, start + _pgSize);
  for (let i = 0; i < _pgSize; i++) {
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
      const card = this.closest(".card");
      const key = card?.getAttribute("data-cardkey");
      const carta = key ? cartasMap[key] : null;
      if (carta) {
        const navList = (col.cards || []).map(entry => cartasMap[entry._key]).filter(Boolean);
        const startIdx = parseInt(card?.getAttribute("data-global")) || 0;
        openCardInModal(carta, navList, startIdx);
      }
    });
  });
  grid.querySelectorAll(".binder-remove").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); removeFromCurrentCollection(parseInt(btn.getAttribute("data-global"))); });
  });
  document.getElementById("binderPrevBtn").disabled = binderPage <= 1;
  document.getElementById("binderNextBtn").disabled = binderPage >= totalPages;
  document.getElementById("binderPageInfo").textContent = t("binder.page", { a: binderPage, b: totalPages });
  setupBinderDragDrop();
  if (!grid.hasAttribute("data-empty-click")) {
    grid.setAttribute("data-empty-click", "1");
    grid.addEventListener("click", function(e) {
      if (e.target.closest(".binder-empty")) {
        var _col = collections[currentCollectionId];
        if (_col && _col.subtype === "deck") {
          addingToBinderId = currentCollectionId;
          addingToBinderName = _col.name || "";
          addingToBinderType = "collection";
          if (typeof navigateToView === 'function') navigateToView("catalog", {}, {}); else mostrarVista("catalog");
        } else if (typeof goToCatalogWithTarget === "function") goToCatalogWithTarget("collection", currentCollectionId);
      }
    });
  }
  if (_rs) _rs();
}
function removeFromCurrentCollection(realIdx) {
  const col = collections[currentCollectionId];
  if (!col) return;
  removeEntryWithUndo(col, realIdx, guardarCollections, renderBinder);
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
      renderBinder();
    });
  });
}
