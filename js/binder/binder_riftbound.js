// ─── Binder Riftbound ────────────────────────────────────────────────────
// Overrides binder functions with RB-specific logic.
// Dependencias: binder/binder.js (pedirCrearColeccion, renderCollectionList)

var _pedirCrearColeccion_OP = pedirCrearColeccion;
var _renderCollectionList_OP = renderCollectionList;
var _renderBinder_OP = renderBinder;

function pedirCrearColeccion_RB() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección",
    confirmText: "Crear",
    placeholder: "Nombre de la colección",
    extraHTML: '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);margin-top:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label>' +
      '<select id="createColSubtype" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">' +
        '<option value="binder">Binder — cartas libres</option>' +
        '<option value="deck">Deck</option>' +
      '</select>',
    onConfirm: function(nombre) {
      var subtype = document.getElementById("createColSubtype") ? document.getElementById("createColSubtype").value : "binder";
      var id = generarId();
      collections[id] = { id: id, name: nombre.trim(), subtype: subtype, cards: [], leader: null, dons: [], is_public: false, tcg: currentTcg || "riftbound" };
      if (subtype === "deck") {
        collections[id].legend = null;
        collections[id].runes = [];
        collections[id].battlefields = [];
      }
      guardarCollections();
      renderCollectionList();
    }
  });
}

function renderCollectionList_RB() {
  var container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  var ids = Object.keys(collections).filter(function(id) {
    var tcg = collections[id].tcg || "one-piece";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    container.innerHTML = '<div class="collection-empty"><p>No tienes colecciones para este TCG</p><button class="btn-primary" id="createFirstColBtn">Crear primera colección</button></div>';
    var btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(function(id) {
    var col = collections[id];
    var coverImg = getFirstCardImage(col.cards, col);
    var isDeck = col.subtype === "deck";
    var isTracking = col.subtype === "tracking";
    var deckCount = isDeck ? (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0) : col.cards.length;
    var totalCards, badgeClass, badgeText;
    if (isDeck) {
      totalCards = deckCount + " cartas";
      badgeClass = "deck"; badgeText = "Deck";
    } else if (isTracking) {
      var owned = col.cards.filter(function(c) { return c.owned; }).length;
      var total = col.target || col.cards.length;
      var pct = total > 0 ? Math.round((owned / total) * 100) : 0;
      totalCards = owned + " / " + total;
      badgeClass = "collection"; badgeText = "Tracking";
    } else {
      totalCards = col.cards.length + " cartas";
      badgeClass = "collection"; badgeText = "Colección";
    }
    var div = document.createElement("div");
    div.className = "binder-cover-card";
    var progressSection = isTracking ? (function() {
      var o = col.cards.filter(function(c) { return c.owned; }).length;
      var t = col.target || col.cards.length;
      var p = t > 0 ? Math.round((o / t) * 100) : 0;
      return '<div class="tracking-cover-progress"><div class="tracking-cover-progress-bar"><div class="tracking-cover-progress-fill" style="width:' + p + '%"></div></div><span class="tracking-cover-progress-text">' + p + '% — ' + o + ' de ' + t + '</span></div>';
    })() : "";
    div.innerHTML = '<div class="binder-cover-img" style="background-image:url(' + (coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'") + ')">' +
      '<div class="binder-cover-overlay"><span class="binder-cover-count">' + totalCards + '</span></div></div>' +
      '<div class="binder-cover-meta">' +
        '<span class="binder-cover-name-badge">' + col.name + '</span>' +
        '<span class="binder-cover-badge ' + badgeClass + '">' + badgeText + '</span>' +
        progressSection +
      '</div>' +
      '<div class="binder-cover-actions">' +
        '<button class="btn-ghost btn-xs" data-action="open" data-id="' + id + '">Abrir</button>' +
        '<button class="btn-ghost btn-xs" data-action="rename" data-id="' + id + '">Renombrar</button>' +
        '<button class="btn-danger btn-xs" data-action="delete" data-id="' + id + '">Eliminar</button>' +
      '</div>';
    container.appendChild(div);
  });
  container.querySelectorAll(".binder-cover-card").forEach(function(card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function(e) {
      if (e.target.closest("button")) return;
      var openBtn = card.querySelector("[data-action='open']");
      if (openBtn) {
        currentCollectionId = openBtn.getAttribute("data-id");
        binderPage = 1;
        mostrarVista("binder");
      }
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(function(b) {
    b.addEventListener("click", function() { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(function(b) {
    b.addEventListener("click", function() {
      var cid = b.getAttribute("data-id");
      showCreateModal({
        title: "Renombrar colección",
        confirmText: "Guardar",
        placeholder: "Nuevo nombre",
        initialValue: collections[cid].name,
        onConfirm: function(n) { collections[cid].name = n.trim(); guardarCollections(); renderCollectionList(); }
      });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(function(b) {
    b.addEventListener("click", function() {
      var idCol = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección "' + collections[idCol].name + '"?', function() {
        delete collections[idCol]; guardarCollections(); renderCollectionList();
      });
    });
  });
}

function renderBinder_RB() {
  var grid = document.getElementById("binderGrid");
  var deckContainer = document.getElementById("binderDeckContainer");
  var trackingHeader = document.getElementById("trackingHeader");
  var pagination = document.getElementById("binderPagination");
  var title = document.getElementById("binderTitle");
  var toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (!grid || !currentCollectionId) return;
  grid.parentElement.classList.remove("tracking-checklist");
  var col = collections[currentCollectionId];
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
  var clearPB = document.getElementById("binderClearPageBtn");
  var clearAB = document.getElementById("binderClearAllBtn");
  if (clearPB) clearPB.textContent = "Vaciar página";
  if (clearAB) clearAB.textContent = "Vaciar todo";
  title.textContent = col.name;
  if (toggleContainer) {
    toggleContainer.innerHTML = isAuthenticated() ? '<label class="public-toggle"><span class="public-toggle-label ' + (!col.is_public ? "active" : "") + '">Privado</span><input type="checkbox" id="binderPublicCheck" ' + (col.is_public ? "checked" : "") + '><span class="public-toggle-track"><span class="public-toggle-thumb"></span></span><span class="public-toggle-label ' + (col.is_public ? "active" : "") + '">Público</span></label>' : "";
    var chk = document.getElementById("binderPublicCheck");
    if (chk) {
      chk.onchange = function() { toggleBinderPublic(currentCollectionId); };
    }
  }
  grid.innerHTML = "";
  var totalPages = Math.max(1, Math.ceil(col.cards.length / binderPerPage));
  var start = (binderPage - 1) * binderPerPage;
  var pageCards = col.cards.slice(start, start + binderPerPage);
  for (var i = 0; i < binderPerPage; i++) {
    var slot = document.createElement("div");
    var globalIdx = start + i;
    slot.className = "card fade-in";
    slot.setAttribute("data-global", globalIdx);
    if (pageCards[i]) {
      var c = pageCards[i];
      var fullBinderCard = c._key ? cartasMap[c._key] : null;
      var data = fullBinderCard || c;
      var nombre = formatearNombre(data);
      var setId = (data.category || data.producto) === "DON" ? (data.variant || "") : (data.card_set_id || "");
      var badge = "";
      if (fullBinderCard) {
        var r = obtenerRareza(fullBinderCard);
        badge = r || fullBinderCard.rarity || "";
        if (typeof esCartaAA_RB === "function" && esCartaAA_RB(fullBinderCard)) {
          var suffix = (fullBinderCard.card_set_id || "").match(/[asv]$/i);
          var variantLabel = suffix ? { a: "AA", s: "Sig", v: "OV" }[suffix[0].toLowerCase()] : "AA";
          if (variantLabel !== r) {
            badge = badge ? badge + " - " + variantLabel : variantLabel;
          }
        }
      }
      slot.setAttribute("draggable", "true");
      slot.setAttribute("data-key", c._key);
      slot.setAttribute("data-cardkey", c._key);
      slot.innerHTML = '<div class="card-img-wrap"><img src="' + (c.card_image || (fullBinderCard ? fullBinderCard.card_image : 'TUTCG.webp')) + '" onerror="this.src=\'TUTCG.webp\'" loading="lazy"></div>' +
        '<div class="card-body">' +
          '<h3>' + nombre + '</h3>' +
          (badge ? '<span class="card-print-type">' + badge + '</span>' : '') +
          '<span class="card-set-id">' + setId + '</span>' +
        '</div>' +
        '<button class="binder-remove" data-global="' + globalIdx + '">&times;</button>';
    } else {
      slot.innerHTML = '<div class="binder-empty">+</div>';
      slot.removeAttribute("draggable");
    }
    grid.appendChild(slot);
  }
  grid.querySelectorAll(".card img").forEach(function(img) {
    img.addEventListener("click", function(e) {
      e.stopPropagation();
      var key = this.closest(".card") ? this.closest(".card").getAttribute("data-cardkey") : null;
      var carta = key ? cartasMap[key] : null;
      if (carta) {
        var navList = (col.cards || []).map(function(entry) { return cartasMap[entry._key]; }).filter(Boolean);
        openCardInModal(carta, navList);
      }
    });
  });
  grid.querySelectorAll(".binder-remove").forEach(function(btn) {
    btn.addEventListener("click", function(e) { e.stopPropagation(); removeFromCurrentCollection(parseInt(btn.getAttribute("data-global"))); });
  });
  document.getElementById("binderPrevBtn").disabled = binderPage <= 1;
  document.getElementById("binderNextBtn").disabled = binderPage >= totalPages;
  document.getElementById("binderPageInfo").textContent = "Página " + binderPage + " de " + totalPages;
  setupBinderDragDrop();
}

// ─── Dispatch overrides ─────────────────────────────────────────────────

pedirCrearColeccion = function() {
  if (currentTcg === "riftbound") return pedirCrearColeccion_RB();
  return _pedirCrearColeccion_OP();
};

renderCollectionList = function() {
  if (currentTcg === "riftbound") return renderCollectionList_RB();
  return _renderCollectionList_OP();
};

renderBinder = function() {
  if (currentTcg === "riftbound") return renderBinder_RB();
  return _renderBinder_OP();
};
