// ─── Binder Pokémon ────────────────────────────────────────────────────────
// PK binder: colección plana de cartas, 4 copias máx.

function pedirCrearColeccion_PK() {
  if (!isAuthenticated()) { showAuthModal(); return; }
  showCreateModal({
    title: "Crear colección",
    confirmText: "Crear",
    placeholder: "Nombre de la colección",
    extraHTML: '<label style="display:block;font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);margin-top:var(--space-2);text-transform:uppercase;letter-spacing:0.05em">Tipo</label><select id="createColSubtype" style="width:100%;padding:var(--space-3);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none"><option value="binder">Binder — cartas libres</option><option value="deck">Deck — 60 cartas</option></select>',
    onConfirm: function(nombre) {
      var subtype = (document.getElementById("createColSubtype") && document.getElementById("createColSubtype").value) || "binder";
      var id = generarId();
      collections[id] = { id: id, name: nombre.trim(), subtype: subtype, cards: [], is_public: false, tcg: currentTcg || "pokemon" };
      guardarCollections();
      renderCollectionList();
    }
  });
}

function renderCollectionList_PK() {
  var container = document.getElementById("collectionList");
  if (!container) return;
  container.innerHTML = "";
  var ids = Object.keys(collections).filter(function(id) {
    var tcg = collections[id].tcg || "pokemon";
    return !currentTcg || tcg === currentTcg;
  });
  if (!ids.length) {
    var msg = currentTcg ? "No tienes colecciones para este TCG" : "No tienes colecciones";
    container.innerHTML = '<div class="collection-empty"><p>' + msg + '</p><button class="btn-primary" id="createFirstColBtn">Crear primera colección</button></div>';
    var btn = document.getElementById("createFirstColBtn");
    if (btn) btn.addEventListener("click", pedirCrearColeccion);
    return;
  }
  container.className = "collection-binder-grid";
  ids.forEach(function(id) {
    var col = collections[id];
    var coverImg = getFirstCardImage(col.cards, col);
    var isDeck = col.subtype === "deck";
    var totalCards = isDeck ? (col.cards || []).reduce(function(s, c) { return s + (c.quantity || 1); }, 0) + " cartas" : col.cards.length + " cartas";
    var badgeClass = isDeck ? "deck" : "collection";
    var badgeText = isDeck ? "Deck" : "Colección";
    var div = document.createElement("div");
    div.className = "binder-cover-card";
    div.innerHTML = '<div class="binder-cover-img" style="background-image:url(' + (coverImg ? escapeAttr(coverImg) : "'TUTCG.webp'") + ')"><div class="binder-cover-overlay"><span class="binder-cover-count">' + totalCards + '</span></div></div><div class="binder-cover-meta"><span class="binder-cover-name-badge">' + col.name + '</span><span class="binder-cover-badge ' + badgeClass + '">' + badgeText + '</span></div><div class="binder-cover-actions"><button class="btn-ghost btn-xs" data-action="open" data-id="' + id + '">Abrir</button><button class="btn-ghost btn-xs" data-action="rename" data-id="' + id + '">Renombrar</button><button class="btn-danger btn-xs" data-action="delete" data-id="' + id + '">Eliminar</button></div>';
    container.appendChild(div);
  });
  container.querySelectorAll(".binder-cover-card").forEach(function(card) {
    card.style.cursor = "pointer";
    card.addEventListener("click", function(e) {
      if (e.target.closest("button")) return;
      var openBtn = card.querySelector("[data-action='open']");
      if (openBtn) { currentCollectionId = openBtn.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); }
    });
  });
  container.querySelectorAll("[data-action='open']").forEach(function(b) {
    b.addEventListener("click", function() { currentCollectionId = b.getAttribute("data-id"); binderPage = 1; mostrarVista("binder"); });
  });
  container.querySelectorAll("[data-action='rename']").forEach(function(b) {
    b.addEventListener("click", function() {
      var id = b.getAttribute("data-id");
      showCreateModal({ title: "Renombrar colección", confirmText: "Guardar", placeholder: "Nuevo nombre", initialValue: collections[id].name, onConfirm: function(nombre) { collections[id].name = nombre.trim(); guardarCollections(); renderCollectionList(); } });
    });
  });
  container.querySelectorAll("[data-action='delete']").forEach(function(b) {
    b.addEventListener("click", function() {
      var idCol = b.getAttribute("data-id");
      showConfirmModal('¿Eliminar la colección "' + collections[idCol].name + '"?', function() { delete collections[idCol]; guardarCollections(); renderCollectionList(); });
    });
  });
}

function renderBinder_PK() {
  var grid = document.getElementById("binderGrid");
  var deckContainer = document.getElementById("binderDeckContainer");
  var pagination = document.getElementById("binderPagination");
  var title = document.getElementById("binderTitle");
  var toggleContainer = document.getElementById("binderPublicToggleContainer");
  if (!grid || !currentCollectionId) return;
  var col = collections[currentCollectionId];
  if (!col) { mostrarVista("collections"); return; }
  if (col.subtype === "deck") {
    grid.style.display = "none";
    if (pagination) pagination.style.display = "none";
    deckContainer.style.display = "";
    document.getElementById("trackingHeader").style.display = "none";
    document.getElementById("binderClearPageBtn").style.display = "";
    document.getElementById("binderClearAllBtn").style.display = "";
    renderDeckView("collection", col, deckContainer, title, toggleContainer);
    return;
  }
  // Fallback: use OP renderer for normal binder (same structure)
  renderBinder_OP();
}
