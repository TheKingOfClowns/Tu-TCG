// ─── Explore / Public Binders ─────────────────────────────────────────────
let exploreDetailOwner = { username: "Usuario", avatar_url: "" };
let exploreFilterMode = "all";
let exploreSearchQuery = "";
let exploreTabFilter = "todas";
let exploreExploreSearchQuery = "";
function setExploreDetailOwner(username, avatarUrl) {
  exploreDetailOwner = { username: username || "Usuario", avatar_url: avatarUrl || "" };
}
async function verPerfilPublico(userId) {
  try {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single();
    const username = profile?.username || "Usuario";
    const avatarUrl = profile?.avatar_url || "";
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.id = "publicProfileModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000";
    modal.innerHTML = `
      <div style="background:var(--bg-elevated);border-radius:var(--radius-lg);padding:var(--space-6);max-width:320px;width:90%;text-align:center;border:1px solid var(--border-accent)">
        <img src="${avatarUrl || "TUTCG.webp"}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);margin-bottom:var(--space-3)">
        <h2 style="margin:0 0 var(--space-2);font-size:var(--text-xl);color:var(--text-primary)">${username}</h2>
        <p style="margin:0 0 var(--space-4);color:var(--text-secondary);font-size:var(--text-sm)">Miembro de TuTCG</p>
        <button onclick="cerrarModalPerfilPublico()" style="padding:var(--space-2) var(--space-4);background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:var(--weight-semibold)">Cerrar</button>
      </div>
    `;
    modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModalPerfilPublico(); });
    document.body.appendChild(modal);
  } catch (e) {
    console.error("Error loading profile:", e);
  }
}
function cerrarModalPerfilPublico() {
  const modal = document.getElementById("publicProfileModal");
  if (modal) modal.remove();
}
function renderExploreDetailCards(cards, grid, b, navList) {
  grid.innerHTML = "";
  if (!cards || !cards.length) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-tertiary)">No hay cartas para mostrar</div>';
    return;
  }
  cards.forEach((row, idx) => {
    const carta = cartasMap[row._key] || row;
    if (!carta || !carta.card_image) return;
    const qty = row.quantity || 1;
    const div = document.createElement("div");
    div.className = "card fade-in";
    div.innerHTML = `
      <div class="card-img-wrap">
        <img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
        ${qty > 1 ? `<span class="deck-card-qty">&times;${qty}</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${formatearNombre(carta)}</h3>
        <span class="card-set-id">${carta.card_set_id || ""}</span>
        ${b.type === "sale" && row.price != null ? `<div class="card-price">$${parseFloat(row.price).toFixed(2)} <span class="${row.price_currency === "USD" ? "usd" : ""}" style="font-size:11px;font-family:var(--font-mono);font-weight:bold;color:${row.price_currency === "USD" ? "#ffd700" : "var(--accent)"}">${row.price_currency || "ARS"}</span></div>` : ""}
      </div>`;
    const startIdx = navList ? idx : undefined;
    div.addEventListener("click", () => openCardInModal(carta, navList, startIdx));
    grid.appendChild(div);
  });
}
function getExploreDisplayCards() {
  const b = exploreDetailBinder;
  if (!b) return [];
  const isTracking = b.config && b.config.subtype === "tracking";
  if (isTracking) {
    const ownerHas = new Set((b.binder_cards || []).map(bc => bc.card_id));
    const targetCards = (b.target_cards || []).map(c => ({ ...c, _key: c._key }));
    if (exploreFilterMode === "faltantes") {
      return targetCards.filter(c => !ownerHas.has(c._key));
    }
    return targetCards;
  }
  const isDeck = b.config && b.config.subtype === "deck";
  if (isDeck) {
    const deck = expandDbDeck(b.binder_cards || []);
    const allCards = [];
    if (deck.leader) allCards.push({ ...deck.leader, _key: deck.leader._key });
    if (deck.cards) deck.cards.forEach(c => allCards.push({ ...c, _key: c._key }));
    if (deck.dons) deck.dons.forEach(c => allCards.push({ ...c, _key: c._key }));
    return allCards;
  }
  return (b.binder_cards || []).map(c => ({ ...c, _key: c.card_id }));
}
function updateExploreProgress() {
  const b = exploreDetailBinder;
  if (!b) return;
  const isTracking = b.config && b.config.subtype === "tracking";
  if (!isTracking) return;
  const ownerHas = new Set((b.binder_cards || []).map(bc => bc.card_id));
  const targetCards = b.target_cards || [];
  const has = targetCards.filter(c => ownerHas.has(c._key)).length;
  const total = targetCards.length;
  const pct = total > 0 ? Math.round((has / total) * 100) : 0;
  const progressText = document.getElementById("exploreProgressText");
  const progressFill = document.getElementById("exploreProgressFill");
  if (progressText) progressText.textContent = `${has} / ${total} cartas (${pct}%)`;
  if (progressFill) progressFill.style.width = pct + "%";
}
function filterExploreCards() {
  const b = exploreDetailBinder;
  const container = document.getElementById("exploreDetailContainer");
  if (!container || !b) return;
  let cards = getExploreDisplayCards();
  if (exploreSearchQuery.trim()) {
    cards = fuzzySearch(cards, exploreSearchQuery, ['card_name', 'card_set_id', 'set_name']);
  }
  const grid = container.querySelector(".explore-detail-grid");
  if (grid) renderExploreDetailCards(cards, grid, b, cards);
}
function setupExploreFilters() {
  const container = document.getElementById("exploreDetailContainer");
  if (!container) return;
  const searchInput = container.querySelector("#exploreSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      exploreSearchQuery = searchInput.value;
      filterExploreCards();
    });
  }
  const allBtn = container.querySelector("[data-filter='all']");
  const faltantesBtn = container.querySelector("[data-filter='faltantes']");
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      exploreFilterMode = "all";
      if (faltantesBtn) faltantesBtn.classList.remove("active");
      allBtn.classList.add("active");
      filterExploreCards();
      updateExploreProgress();
    });
  }
  if (faltantesBtn) {
    faltantesBtn.addEventListener("click", () => {
      exploreFilterMode = "faltantes";
      if (allBtn) allBtn.classList.remove("active");
      faltantesBtn.classList.add("active");
      filterExploreCards();
      updateExploreProgress();
    });
  }
}
let _exploreController = null;
function buildExploreFiltersHTML() {
  return `
    <div class="explore-filters">
      <div class="explore-tabs">
        <button class="explore-tab ${exploreTabFilter === 'colecciones' ? 'active' : ''}" data-tab="colecciones">Colecciones</button>
        <button class="explore-tab ${exploreTabFilter === 'ventas' ? 'active' : ''}" data-tab="ventas">Ventas</button>
        <button class="explore-tab ${exploreTabFilter === 'todas' ? 'active' : ''}" data-tab="todas">Todas</button>
      </div>
      <div class="explore-search">
        <div style="position:relative">
          <svg class="explore-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="exploreSearchInput" placeholder="Buscar por nombre, cartas..." value="${exploreExploreSearchQuery || ''}">
        </div>
      </div>
    </div>
  `;
}
function attachExploreListeners() {
  document.querySelectorAll('.explore-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      exploreTabFilter = btn.dataset.tab;
      renderExploreView();
    });
  });
  const searchInput = document.getElementById('exploreSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        exploreExploreSearchQuery = searchInput.value.trim();
        renderExploreView();
      }
    });
  }
}
async function renderExploreView() {
  if (_exploreController) _exploreController.abort();
  _exploreController = new AbortController();
  const container = document.getElementById("exploreContainer");
  if (!container) return;
  const tcgName = currentTcg ? (tcgList.find(t => t.id === currentTcg)?.name || "") : "";
  container.innerHTML = buildExploreFiltersHTML() + '<div class="loader" style="text-align:center;padding:40px;color:var(--text-tertiary)">Cargando binders públicos…</div>';
  attachExploreListeners();
  if (!isAuthenticated()) {
    container.innerHTML = '<div class="collection-empty"><p>Inicia sesión para explorar binders públicos</p></div>';
    return;
  }
  try {
    const { data: publicBinders, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*), target_cards")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .abortSignal(_exploreController.signal);
    if (error) throw error;
    const seen = new Set();
    const uniqueBinders = publicBinders.filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
    let filteredBinders = uniqueBinders;
    if (currentTcg) {
      filteredBinders = filteredBinders.filter(b => {
        const cfg = b.config || {};
        return (!cfg.tcg || cfg.tcg === currentTcg);
      });
    }
    if (exploreTabFilter === 'colecciones') {
      filteredBinders = filteredBinders.filter(b => b.type !== "sale");
    } else if (exploreTabFilter === 'ventas') {
      filteredBinders = filteredBinders.filter(b => b.type === "sale");
    }
    if (filteredBinders.length === 0 || !filteredBinders) {
      container.innerHTML = buildExploreFiltersHTML() + '<div class="collection-empty"><p>No hay binders' + (tcgName ? " para " + tcgName : "") + '</p><p style="font-size:var(--text-sm);color:var(--text-muted)">Los usuarios pueden publicar sus colecciones y ventas desde la vista de Colecciones o Venta</p></div>';
      attachExploreListeners();
      return;
    }
    if (exploreExploreSearchQuery) {
      const terms = exploreExploreSearchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 1);
      if (terms.length > 0) {
        filteredBinders = filteredBinders.filter(b => {
          const cardNames = (b.binder_cards || []).map(c => {
            const fullCard = cartasMap[c.card_id];
            return fullCard ? fullCard.card_name : '';
          }).join(' ').toLowerCase();
          const searchable = (b.name + ' ' + cardNames).toLowerCase();
          return terms.every(term => searchable.includes(term));
        });
      }
    }
    if (!filteredBinders || !filteredBinders.length) {
      container.innerHTML = buildExploreFiltersHTML() + '<div class="collection-empty"><p>No se encontraron resultados para "' + exploreExploreSearchQuery + '"</p></div>';
      attachExploreListeners();
      return;
    }
    container.innerHTML = buildExploreFiltersHTML() + '<div id="exploreGridContainer" class="explore-grid"></div>';
    attachExploreListeners();
    const gridContainer = document.getElementById('exploreGridContainer');
    for (const b of filteredBinders) {
      let username = "Usuario";
      let avatarUrl = "";
      try {
        const { data: prof } = await supabaseClient
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", b.user_id)
          .single();
        if (prof?.username) username = prof.username;
        if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      } catch (e) { console.error("Explore profile fetch error:", e); }
      const cardCount = b.binder_cards?.reduce((s, c) => s + c.quantity, 0) || 0;
      const typeLabel = b.type === "sale" ? "Venta" : "Colección";
      const isOwner = authUser && b.user_id === authUser.id;
      let coverImg = null;
      if (b.binder_cards?.length) {
        const first = b.binder_cards[0];
        if (first.card_id) {
          const found = cartasMap[first.card_id];
          if (found?.card_image) coverImg = found.card_image;
        }
      }
      let arsTotal = 0, usdTotal = 0;
      if (b.type === "sale" && b.binder_cards?.length) {
        b.binder_cards.forEach(c => {
          const qty = c.quantity || 1;
          if (c.price != null) {
            if (c.price_currency === "USD") usdTotal += Number(c.price) * qty;
            else arsTotal += Number(c.price) * qty;
          }
        });
      }
      const hasArs = arsTotal > 0;
      const hasUsd = usdTotal > 0;
      const isTracking = (b.config && b.config.subtype) === "tracking";
      let trackingHas = 0, trackingTotal = 0, trackingPct = 0;
      if (isTracking) {
        const ownerHas = new Set((b.binder_cards || []).map(bc => bc.card_id));
        const targetCards = b.target_cards || [];
        trackingHas = targetCards.filter(c => ownerHas.has(c._key)).length;
        trackingTotal = targetCards.length;
        trackingPct = trackingTotal > 0 ? Math.round((trackingHas / trackingTotal) * 100) : 0;
      }
      const div = document.createElement("div");
      div.className = "binder-cover-card";
      div.innerHTML = `
        <div class="binder-cover-img" style="background-image:url(${coverImg ? coverImg : 'TUTCG.webp'})">
          <div class="binder-cover-overlay">
            <span class="binder-cover-count">${cardCount} cartas</span>
          </div>
        </div>
        <div class="binder-cover-meta">
          <div class="binder-cover-user-row">
            <img src="${avatarUrl || 'TUTCG.webp'}" class="binder-cover-avatar" onerror="this.src='TUTCG.webp'">
            <span class="binder-cover-username">${username}</span>
          </div>
          <div class="binder-cover-name-row">
            <span class="binder-cover-name-badge">${b.name}</span>
            <span class="binder-cover-badge ${b.type}">${typeLabel}</span>
          </div>
          ${isTracking ? `<div class="binder-cover-tracking">
            <span class="tracking-pct">${trackingPct}%</span>
            <span class="tracking-count">(${trackingHas} / ${trackingTotal} cartas)</span>
          </div>` : ""}
          ${b.type === "sale" && (hasArs || hasUsd) ? `<div style="margin-top:4px;display:flex;flex-direction:column;gap:1px">${hasArs ? `<span style="font-size:10px;font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${hasUsd ? `<span style="font-size:10px;font-family:var(--font-mono);color:#ffd700;font-weight:var(--weight-bold)">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
      `;
      div.addEventListener("click", () => openExploreDetail(b));
      gridContainer.appendChild(div);
    }
  } catch (e) {
    console.error("Explore error:", e);
    container.innerHTML = '<div class="collection-empty"><p>Error al cargar binders públicos</p></div>';
  }
}
function openExploreDetail(binder) {
  exploreDetailBinder = binder;
  exploreFilterMode = "all";
  exploreSearchQuery = "";
  exploreDetailOwner = { username: "Usuario", avatar_url: "" };
  (async () => {
    try {
      const { data: prof } = await supabaseClient
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", binder.user_id)
        .single();
      if (prof) {
        exploreDetailOwner = {
          username: prof.username || "Usuario",
          avatar_url: prof.avatar_url || ""
        };
      }
    } catch (e) { console.error("Explore owner fetch error:", e); }
    if (typeof navigateToView === 'function') navigateToView("exploreDetail", {id: binder.id}, {}); else mostrarVista("exploreDetail");
  })();
}
function renderExploreDetail() {
  const container = document.getElementById("exploreDetailContainer");
  const title = document.getElementById("exploreDetailTitle");
  if (!container || !exploreDetailBinder) return;
  const b = exploreDetailBinder;
  title.textContent = b.name;
  const cards = b.binder_cards || [];
  const typeLabel = b.type === "sale" ? "Venta" : "Colección";
  const subtype = (b.config && b.config.subtype) || "binder";
  const isTracking = subtype === "tracking";
  const totalCards = cards.reduce((s, c) => s + c.quantity, 0);

  // Calculate totals by currency for sale views
  let arsTotal = 0, usdTotal = 0;
  if (b.type === "sale") {
    cards.forEach(c => {
      const qty = c.quantity || 1;
      if (c.price != null) {
        if (c.price_currency === "USD") usdTotal += Number(c.price) * qty;
        else arsTotal += Number(c.price) * qty;
      }
    });
  }

  // Calculate progress for tracking
  let progressHTML = "";
  if (isTracking) {
    const ownerHas = new Set((b.binder_cards || []).map(bc => bc.card_id));
    const targetCards = b.cards || [];
    const has = targetCards.filter(c => ownerHas.has(c._key)).length;
    const total = targetCards.length;
    const pct = total > 0 ? Math.round((has / total) * 100) : 0;
    progressHTML = `
      <div class="explore-progress" style="margin:var(--space-3) 0">
        <span id="exploreProgressText" style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:6px;display:block">${has} / ${total} cartas (${pct}%)</span>
        <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
          <div id="exploreProgressFill" style="height:100%;width:${pct}%;background:var(--accent);transition:width 0.3s"></div>
        </div>
      </div>
    `;
  }

  const ownerAvatar = exploreDetailOwner.avatar_url || "";
  const ownerName = exploreDetailOwner.username || "Usuario";

  if (subtype === "deck") {
    const deck = expandDbDeck(cards);
    const leader = deck.leader;
    const mainCards = deck.cards || [];
    const dons = deck.dons || [];
    const mainTotal = mainCards.reduce((s, c) => s + (c.quantity || 1), 0);

    const deckNavList = [];
    if (leader) deckNavList.push({ ...leader, _key: leader._key });
    mainCards.forEach(c => deckNavList.push({ ...c, _key: c._key }));
    dons.forEach(c => deckNavList.push({ ...c, _key: c._key }));

    container.innerHTML = `
      <div class="explore-detail-header">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
          <img src="${ownerAvatar || "TUTCG.webp"}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent)">
          <span style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${ownerName}</span>
          <button onclick="verPerfilPublico('${b.user_id}')" style="padding:4px 12px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs);font-weight:var(--weight-semibold)">Ver Perfil</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="explore-badge ${b.type}">${typeLabel}</span>
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">Deck · ${totalCards} cartas</span>
          ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
      </div>
      <div class="deck-container">
        <div class="deck-section deck-leader-section">
          <h3 class="deck-section-title">Líder</h3>
          <div class="deck-leader-slot" id="exploreDeckLeaderSlot">
            ${leader ? '<div class="deck-leader-card" id="exploreLeaderCard"></div>' : '<div class="deck-empty-slot deck-leader-placeholder">Sin líder</div>'}
          </div>
        </div>
        <div class="deck-section">
          <div class="deck-section-title-row">
            <h3 class="deck-section-title">Cartas</h3>
            <span class="deck-count">${mainTotal}/50</span>
          </div>
          <div class="deck-main-grid" id="exploreDeckMainGrid"></div>
        </div>
        <div class="deck-section">
          <div class="deck-section-title-row">
            <h3 class="deck-section-title">DON!!</h3>
            <span class="deck-count">${dons.length}/10 <span class="deck-optional">opcional</span></span>
          </div>
          <div class="deck-don-row" id="exploreDeckDonRow"></div>
        </div>
      </div>
    `;

    if (leader) {
      const leaderCard = container.querySelector("#exploreLeaderCard");
      if (leaderCard) {
        const carta = cartasMap[leader._key];
        if (carta) {
          leaderCard.style.cursor = "pointer";
          leaderCard.innerHTML = `
            <div class="card-img-wrap"><img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'"></div>
            <div class="card-body">
              <h3>${carta.card_name || ""}</h3>
              <span class="card-set-id">${carta.card_color || ""}</span>
              ${b.type === "sale" && leader.customPrice != null ? `<div class="card-price">$${parseFloat(leader.customPrice).toFixed(2)} <span class="${leader.priceCurrency === "USD" ? "usd" : ""}" style="font-size:11px;font-family:var(--font-mono);font-weight:bold;color:${leader.priceCurrency === "USD" ? "#ffd700" : "var(--accent)"}">${leader.priceCurrency || "ARS"}</span></div>` : ""}
            </div>`;
          leaderCard.addEventListener("click", () => openCardInModal(carta, deckNavList, 0));
        }
      }
    }

    const mainGrid = container.querySelector("#exploreDeckMainGrid");
    mainCards.forEach((c, i) => {
      const carta = cartasMap[c._key];
      if (!carta) return;
      const qty = c.quantity || 1;
      const div = document.createElement("div");
      div.className = "deck-card-slot";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <div class="card-img-wrap">
          <img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
          <span class="deck-card-qty">&times;${qty}</span>
        </div>
        <div class="card-body">
          <h3>${formatearNombre(carta)}</h3>
          <span class="card-set-id">${carta.card_set_id || ""}</span>
          ${b.type === "sale" && c.customPrice != null ? `<div class="card-price">$${parseFloat(c.customPrice).toFixed(2)} <span class="${c.priceCurrency === "USD" ? "usd" : ""}" style="font-size:11px;font-family:var(--font-mono);font-weight:bold;color:${c.priceCurrency === "USD" ? "#ffd700" : "var(--accent)"}">${c.priceCurrency || "ARS"}</span></div>` : ""}
        </div>`;
      const cardIdx = 1 + i;
      div.addEventListener("click", () => openCardInModal(carta, deckNavList, cardIdx));
      mainGrid.appendChild(div);
    });

    const donRow = container.querySelector("#exploreDeckDonRow");
    dons.forEach((c, i) => {
      const carta = cartasMap[c._key];
      if (!carta) return;
      const div = document.createElement("div");
      div.className = "deck-don-slot";
      div.style.cursor = "pointer";
      div.innerHTML = `
        <div class="card-img-wrap">
          <img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
        </div>
        ${b.type === "sale" && c.customPrice != null ? `<div style="font-size:10px;font-family:var(--font-mono);font-weight:bold;color:${c.priceCurrency === "USD" ? "#ffd700" : "var(--accent)"}">$${parseFloat(c.customPrice).toFixed(2)} ${c.priceCurrency || "ARS"}</div>` : ""}`;
      const cardIdx = 1 + mainCards.length + i;
      div.addEventListener("click", () => openCardInModal(carta, deckNavList, cardIdx));
      donRow.appendChild(div);
    });
  } else {
    container.innerHTML = `
      <div class="explore-detail-header">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
          <img src="${ownerAvatar || "TUTCG.webp"}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent)">
          <span style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${ownerName}</span>
          <button onclick="verPerfilPublico('${b.user_id}')" style="padding:4px 12px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs);font-weight:var(--weight-semibold)">Ver Perfil</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="explore-badge ${b.type}">${typeLabel}</span>
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">${totalCards} cartas</span>
          ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
        ${progressHTML}
        ${isTracking ? `
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">
          <input type="text" id="exploreSearchInput" placeholder="Buscar (ej: GoldRoger OP09)..." style="flex:1;min-width:150px;padding:var(--space-2);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
          <button class="explore-filter-btn active" data-filter="all" style="padding:6px 14px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs);font-weight:var(--weight-semibold)">Todas</button>
          <button class="explore-filter-btn" data-filter="faltantes" style="padding:6px 14px;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-default);border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs)">Faltantes</button>
        </div>
        ` : ""}
      </div>
      <div class="explore-detail-grid"></div>
    `;

    setupExploreFilters();
    filterExploreCards();
    updateExploreProgress();
  }
}
