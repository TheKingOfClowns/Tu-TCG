// ─── Explore / Public Binders ─────────────────────────────────────────────
let exploreDetailOwner = { username: "", avatar_url: "" };
let exploreFilterMode = "all";
let exploreSearchQuery = "";
let exploreTabFilter = "todas";
let exploreExploreSearchQuery = "";
let explorePage = 1;
let exploreDetailPage = 1;
let _exploreCols = 0;
let _exploreDetailCols = 0;
let _exploreCache = { data: null, ts: 0 };
const EXPLORE_CACHE_TTL = 30000;
window.invalidateExploreCache = function () { _exploreCache = { data: null, ts: 0 }; };
function setExploreDetailOwner(username, avatarUrl) {
  exploreDetailOwner = { username: username || t("expl.fallback_user"), avatar_url: avatarUrl || "" };
}
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function sanitizeWspUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    if (["wa.me", "web.whatsapp.com", "api.whatsapp.com"].includes(u.hostname)) return u.href;
  } catch (e) { /* invalid url */ }
  return null;
}
function publicBinderCoverImage(binder) {
  const first = binder?.binder_cards?.[0];
  return first?.card_id ? (cartasMap[first.card_id]?.card_image || null) : null;
}
const SOCIAL_PLATFORM_LABELS = {
  instagram: "Instagram", twitter: "X (Twitter)", tiktok: "TikTok",
  youtube: "YouTube", discord: "Discord"
};
async function verPerfilPublico(userId) {
  if (!userId) return;
  window._sellerId = userId;
  _sellerTab = "reviews";
  if (typeof navigateToView === "function") navigateToView("seller", { id: userId }, {});
  else if (typeof mostrarVista === "function") mostrarVista("seller");
}
function renderExploreDetailCards(cards, grid, b, navList, base) {
  grid.innerHTML = "";
  if (!cards || !cards.length) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-tertiary)">' + t("expl.empty_cards") + '</div>';
    return;
  }
  const _base = base || 0;
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
        ${b.type === "sale" ? `<div class="cart-row" data-cardid="${row._key || row.card_id || ""}" data-stock="${qty}"></div>` : ""}
      </div>`;
    const startIdx = navList ? _base + idx : undefined;
    div.addEventListener("click", (e) => { if (e.target.closest(".cart-row")) return; openCardInModal(carta, navList, startIdx); });
    grid.appendChild(div);
  });
  if (b.type === "sale" && typeof cartPaintRows === "function") cartPaintRows(b);
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
    if (exploreFilterMode === "owned") {
      return targetCards.filter(c => ownerHas.has(c._key));
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
  if (progressText) progressText.textContent = t("expl.progress", { has: has, total: total, pct: pct });
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
  if (!grid) return;
  // ponytail: 3 filas exactas; navList completa para el modal
  const _pg = (typeof pageSizeFor === "function") ? pageSizeFor(grid, 3) : { cols: 5, size: 15 };
  _exploreDetailCols = _pg.cols;
  const _totalPages = Math.max(1, Math.ceil(cards.length / _pg.size));
  if (exploreDetailPage > _totalPages) exploreDetailPage = _totalPages;
  const _start = (exploreDetailPage - 1) * _pg.size;
  renderExploreDetailCards(cards.slice(_start, _start + _pg.size), grid, b, cards, _start);
  let pager = container.querySelector("#exploreDetailPager");
  if (pager) pager.remove();
  if (_totalPages > 1) {
    pager = document.createElement("div");
    pager.id = "exploreDetailPager";
    pager.className = "binder-pagination";
    pager.innerHTML = '<button class="btn-page" id="exploreDetailPrevBtn">' + t("expl.prev") + '</button><span>' + t("expl.page", { a: exploreDetailPage, b: _totalPages }) + '</span><button class="btn-page" id="exploreDetailNextBtn">' + t("expl.next") + '</button>';
    grid.after(pager);
    const prevB = pager.querySelector("#exploreDetailPrevBtn"), nextB = pager.querySelector("#exploreDetailNextBtn");
    if (prevB) { prevB.disabled = exploreDetailPage <= 1; prevB.addEventListener("click", () => { if (exploreDetailPage > 1) { exploreDetailPage--; filterExploreCards(); } }); }
    if (nextB) { nextB.disabled = exploreDetailPage >= _totalPages; nextB.addEventListener("click", () => { if (exploreDetailPage < _totalPages) { exploreDetailPage++; filterExploreCards(); } }); }
  }
}
function setupExploreFilters() {
  const container = document.getElementById("exploreDetailContainer");
  if (!container) return;
  const searchInput = container.querySelector("#exploreSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      exploreSearchQuery = searchInput.value;
      exploreDetailPage = 1;
      filterExploreCards();
    });
  }
  const allBtn = container.querySelector("[data-filter='all']");
  const faltantesBtn = container.querySelector("[data-filter='faltantes']");
  const ownedBtn = container.querySelector("[data-filter='owned']");
  const setActive = (btn) => {
    [allBtn, faltantesBtn, ownedBtn].forEach(b => b && b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  };
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      exploreFilterMode = "all";
      exploreDetailPage = 1;
      setActive(allBtn);
      filterExploreCards();
      updateExploreProgress();
    });
  }
  if (faltantesBtn) {
    faltantesBtn.addEventListener("click", () => {
      exploreFilterMode = "faltantes";
      exploreDetailPage = 1;
      setActive(faltantesBtn);
      filterExploreCards();
      updateExploreProgress();
    });
  }
  if (ownedBtn) {
    ownedBtn.addEventListener("click", () => {
      exploreFilterMode = "owned";
      exploreDetailPage = 1;
      setActive(ownedBtn);
      filterExploreCards();
      updateExploreProgress();
    });
  }
}
let _exploreController = null;
// ponytail: resize recalcula filas solo si cambian las columnas (evita flashes)
let _exploreRzT = null;
window.addEventListener("resize", () => {
  clearTimeout(_exploreRzT);
  _exploreRzT = setTimeout(() => {
    const ev = document.getElementById("exploreView");
    if (!ev || ev.style.display === "none") return;
    const gc = document.getElementById("exploreGridContainer");
    if (gc && typeof pageSizeFor === "function" && pageSizeFor(gc, 3).cols !== _exploreCols && typeof renderExploreView === "function") { renderExploreView(); return; }
    const edv = document.getElementById("exploreDetailView");
    if (edv && edv.style.display !== "none" && typeof pageSizeFor === "function") {
      const dg = document.querySelector("#exploreDetailContainer .explore-detail-grid");
      if (dg && pageSizeFor(dg, 3).cols !== _exploreDetailCols && typeof filterExploreCards === "function") filterExploreCards();
    }
  }, 250);
});
function buildExploreFiltersHTML() {
  return `
    <div class="explore-filters">
      <div class="explore-tabs">
        <button class="explore-tab ${exploreTabFilter === 'colecciones' ? 'active' : ''}" data-tab="colecciones">${t("expl.tab_collections")}</button>
        <button class="explore-tab ${exploreTabFilter === 'ventas' ? 'active' : ''}" data-tab="ventas">${t("expl.tab_sales")}</button>
        <button class="explore-tab ${exploreTabFilter === 'todas' ? 'active' : ''}" data-tab="todas">${t("expl.tab_all")}</button>
      </div>
      <div class="explore-search">
        <div style="position:relative">
          <svg class="explore-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="exploreSearchInput" placeholder="${t("expl.search_ph")}" value="${exploreExploreSearchQuery || ''}">
        </div>
      </div>
    </div>
  `;
}
function attachExploreListeners() {
  var scope = document.getElementById("exploreContainer") || document;
  scope.querySelectorAll('.explore-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      exploreTabFilter = btn.dataset.tab;
      scope.querySelectorAll('.explore-tab').forEach(b => b.classList.toggle('active', b === btn));
      explorePage = 1;
      renderExploreView();
    });
  });
  const searchInput = document.getElementById('exploreSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        exploreExploreSearchQuery = searchInput.value.trim();
        explorePage = 1;
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
  container.innerHTML = buildExploreFiltersHTML() + '<div id="exploreSkeletonWrap"></div>';
  if (typeof skeletonCoverGrid === 'function') skeletonCoverGrid(document.getElementById("exploreSkeletonWrap"), 10);
  attachExploreListeners();
  if (!isAuthenticated()) {
    container.innerHTML = '<div class="collection-empty"><p>' + t("expl.login_required") + '</p></div>';
    return;
  }
  try {
    let publicBinders = null;
    const cacheFresh = _exploreCache.data && (Date.now() - _exploreCache.ts) < EXPLORE_CACHE_TTL;
    if (cacheFresh) {
      publicBinders = _exploreCache.data;
    } else {
      const res = await supabaseClient
        .from("binders")
        .select("*, binder_cards(*), target_cards")
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .abortSignal(_exploreController.signal);
      if (res.error) throw res.error;
      publicBinders = res.data;
      _exploreCache = { data: publicBinders, ts: Date.now() };
    }
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
      container.innerHTML = buildExploreFiltersHTML() + '<div class="collection-empty"><p>' + t("expl.empty_title", { tcg: (tcgName ? t("expl.empty_title_tcg", { name: tcgName }) : "") }) + '</p><p style="font-size:var(--text-sm);color:var(--text-muted)">' + t("expl.empty_hint") + '</p></div>';
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
      container.innerHTML = buildExploreFiltersHTML() + '<div class="collection-empty"><p>' + t("expl.no_results", { q: escapeHtml(exploreExploreSearchQuery) }) + '</p></div>';
      attachExploreListeners();
      return;
    }
    container.innerHTML = buildExploreFiltersHTML() + '<div id="exploreGridContainer" class="explore-grid"></div>';
    attachExploreListeners();
    const gridContainer = document.getElementById('exploreGridContainer');
    // ponytail: 3 filas exactas de portadas
    const _pg = (typeof pageSizeFor === "function") ? pageSizeFor(gridContainer, 3) : { cols: 5, size: 15 };
    _exploreCols = _pg.cols;
    const _totalPages = Math.max(1, Math.ceil(filteredBinders.length / _pg.size));
    if (explorePage > _totalPages) explorePage = _totalPages;
    const _pageBinders = filteredBinders.slice((explorePage - 1) * _pg.size, explorePage * _pg.size);
    const userIds = [...new Set(filteredBinders.map(b => b.user_id))];
    const profileMap = {};
    if (userIds.length) {
      try {
        const { data: profs } = await supabaseClient
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);
        (profs || []).forEach(p => { profileMap[p.id] = p; });
      } catch (e) { console.error("Explore profiles fetch error:", e); }
    }
    // ponytail: reputación batch por página (1 RPC, sin N+1)
    let repMap = {};
    try {
      const pageIds = [...new Set(_pageBinders.map(b => b.user_id))];
      if (pageIds.length) {
        const { data: reps } = await supabaseClient.rpc("seller_reputations", { p_sellers: pageIds });
        if (reps) repMap = reps;
      }
    } catch (e) {}
    for (const b of _pageBinders) {
      const prof = profileMap[b.user_id];
      const username = escapeHtml(prof?.username || t("expl.fallback_user"));
      const rawAvatar = prof?.avatar_url || "";
      const avatarUrl = /^https?:\/\//i.test(rawAvatar) ? escapeHtml(rawAvatar) : "TUTCG.webp";
      const cardCount = b.binder_cards?.reduce((s, c) => s + c.quantity, 0) || 0;
      const typeLabel = b.type === "sale" ? t("expl.type_sale") : t("expl.type_collection");
      const isOwner = authUser && b.user_id === authUser.id;
      const coverImg = publicBinderCoverImage(b);
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
            <span class="binder-cover-count">${t("expl.card_count", { n: cardCount })}</span>
          </div>
        </div>
        <div class="binder-cover-meta">
          <div class="binder-cover-user-row">
            <img src="${avatarUrl || 'TUTCG.webp'}" class="binder-cover-avatar" onerror="this.src='TUTCG.webp'">
            <span class="binder-cover-username">${username}</span>
            ${repMap[b.user_id] && repMap[b.user_id].n ? `<span style="font-size:10px;color:#ffd700;font-family:var(--font-mono);font-weight:bold" title="${repMap[b.user_id].n} reseñas">★ ${repMap[b.user_id].avg}</span>` : ""}
          </div>
          <div class="binder-cover-name-row">
            <span class="binder-cover-name-badge">${escapeHtml(b.name || "")}</span>
            <span class="binder-cover-badge ${b.type}">${typeLabel}</span>
          </div>
          ${isTracking ? `<div class="binder-cover-tracking">
            <span class="tracking-pct">${trackingPct}%</span>
            <span class="tracking-count">${t("expl.tracking_count", { has: trackingHas, total: trackingTotal })}</span>
          </div>` : ""}
          ${b.type === "sale" && (hasArs || hasUsd) ? `<div style="margin-top:4px;display:flex;flex-direction:column;gap:1px">${hasArs ? `<span style="font-size:10px;font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${hasUsd ? `<span style="font-size:10px;font-family:var(--font-mono);color:#ffd700;font-weight:var(--weight-bold)">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
      `;
      div.addEventListener("click", () => openExploreDetail(b));
      gridContainer.appendChild(div);
    }
    if (_totalPages > 1) {
      const pager = document.createElement("div");
      pager.className = "binder-pagination";
      pager.innerHTML = '<button class="btn-page" id="explorePrevBtn">' + t("expl.prev") + '</button><span id="explorePageInfo">' + t("expl.page", { a: explorePage, b: _totalPages }) + '</span><button class="btn-page" id="exploreNextBtn">' + t("expl.next") + '</button>';
      container.appendChild(pager);
      const prevB = pager.querySelector("#explorePrevBtn"), nextB = pager.querySelector("#exploreNextBtn");
      if (prevB) { prevB.disabled = explorePage <= 1; prevB.addEventListener("click", () => { if (explorePage > 1) { explorePage--; renderExploreView(); } }); }
      if (nextB) { nextB.disabled = explorePage >= _totalPages; nextB.addEventListener("click", () => { if (explorePage < _totalPages) { explorePage++; renderExploreView(); } }); }
    }
  } catch (e) {
    const isAbort = e.name === 'AbortError' || e.message?.toLowerCase().includes('abort');
    if (isAbort) return;
    console.error("Explore error:", e);
    container.innerHTML = '<div class="collection-empty"><p>' + t("expl.load_error") + '</p></div>';
  }
}
function openExploreDetail(binder) {
  exploreDetailBinder = binder;
  exploreFilterMode = "all";
  exploreSearchQuery = "";
  exploreDetailPage = 1;
  exploreDetailOwner = { username: "", avatar_url: "", contact_wsp: "", contact_phone: "" };
  (async () => {
    try {
      const { data: prof } = await supabaseClient
        .from("profiles")
        .select("username, avatar_url, contact_wsp, contact_phone")
        .eq("id", binder.user_id)
        .single();
      if (prof) {
        exploreDetailOwner = {
          username: prof.username || t("expl.fallback_user"),
          avatar_url: prof.avatar_url || "",
          contact_wsp: prof.contact_wsp || "",
          contact_phone: prof.contact_phone || ""
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
  const typeLabel = b.type === "sale" ? t("expl.type_sale") : t("expl.type_collection");
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
    const targetCards = b.target_cards || [];
    const has = targetCards.filter(c => ownerHas.has(c._key)).length;
    const total = targetCards.length;
    const pct = total > 0 ? Math.round((has / total) * 100) : 0;
    progressHTML = `
      <div class="explore-progress" style="margin:var(--space-3) 0">
        <span id="exploreProgressText" style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:6px;display:block">${t("expl.progress", { has: has, total: total, pct: pct })}</span>
        <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
          <div id="exploreProgressFill" style="height:100%;width:${pct}%;background:var(--accent);transition:width 0.3s"></div>
        </div>
      </div>
    `;
  }

  const ownerAvatar = exploreDetailOwner.avatar_url || "";
  const ownerName = exploreDetailOwner.username || t("expl.fallback_user");

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
          <span class="explore-owner-name" style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${ownerName}</span>
          <button class="explore-profile-btn" onclick="verPerfilPublico('${b.user_id}')" style="padding:4px 12px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs);font-weight:var(--weight-semibold)">${t("expl.view_profile")}</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="explore-badge ${b.type}">${typeLabel}</span>
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">${t("expl.deck_cards", { n: totalCards })}</span>
          ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div class="explore-sale-totals" style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
      </div>
      <div class="deck-container">
        <div class="deck-section deck-leader-section">
          <h3 class="deck-section-title">${t("expl.leader")}</h3>
          <div class="deck-leader-row">
          <div class="deck-leader-slot" id="exploreDeckLeaderSlot">
            ${leader ? '<div class="deck-leader-card" id="exploreLeaderCard"></div>' : '<div class="deck-empty-slot deck-leader-placeholder">' + t("expl.no_leader") + '</div>'}
          </div>
          ${b.type === "sale" && b.config && b.config.extras ? `<div class="deck-extras-box"><h4 class="deck-extras-title">${t("deck.extras_title")}</h4><div class="deck-extras-input" style="min-height:0;white-space:pre-wrap">${escapeHtml(String(b.config.extras))}</div></div>` : ""}
          </div>
        </div>
        <div class="deck-section">
          <div class="deck-section-title-row">
            <h3 class="deck-section-title">${t("expl.cards")}</h3>
            <span class="deck-count">${mainTotal}/50</span>
          </div>
          <div class="deck-main-grid" id="exploreDeckMainGrid"></div>
        </div>
        <div class="deck-section">
          <div class="deck-section-title-row">
            <h3 class="deck-section-title">DON!!</h3>
            <span class="deck-count">${dons.length}/10 <span class="deck-optional">${t("expl.optional")}</span></span>
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
          <span class="explore-owner-name" style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${ownerName}</span>
          <button class="explore-profile-btn" onclick="verPerfilPublico('${b.user_id}')" style="padding:4px 12px;background:var(--accent);color:var(--bg-primary);border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--text-xs);font-weight:var(--weight-semibold)">${t("expl.view_profile")}</button>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span class="explore-badge ${b.type}">${typeLabel}</span>
          <span style="font-size:var(--text-sm);color:var(--text-secondary)">${t("expl.card_count", { n: totalCards })}</span>
          ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div class="explore-sale-totals" style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
        ${progressHTML}
        ${isTracking ? `
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap">
          <input type="text" id="exploreSearchInput" placeholder="${t("expl.search_tracking_ph")}" style="flex:1;min-width:150px;padding:var(--space-2);background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:var(--text-sm);outline:none">
          <button class="explore-filter-btn active" data-filter="all">${t("expl.tab_all")}</button>
          <button class="explore-filter-btn" data-filter="faltantes">${t("expl.filter_missing")}</button>
          <button class="explore-filter-btn" data-filter="owned">${t("track.filter_owned")}</button>
        </div>
        ` : ""}
      </div>
      <div class="explore-detail-grid"></div>
    `;

    setupExploreFilters();
    updateExploreProgress();
    if (b.type === "sale" && subtype !== "deck" && typeof cartLoad === "function") { cartLoad(b.id).then(function() { filterExploreCards(); }); }
    else if (typeof cartBar === "function") { try { Cart.binder = null; Cart.mine = {}; } catch (e) {} cartBar(); }
    filterExploreCards();
  }
}
