// ─── Explore / Public Binders ─────────────────────────────────────────────
async function renderExploreView() {
  const container = document.getElementById("exploreContainer");
  if (!container) return;
  container.className = "explore-grid";
  container.innerHTML = '<div class="loader" style="text-align:center;padding:40px;color:var(--text-tertiary)">Cargando binders públicos…</div>';
  if (!isAuthenticated()) {
    container.innerHTML = '<div class="collection-empty"><p>Inicia sesión para explorar binders públicos</p></div>';
    return;
  }
  try {
    const { data: publicBinders, error } = await supabaseClient
      .from("binders")
      .select("*, binder_cards(*)")
      .eq("is_public", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    let filteredBinders = publicBinders;
    if (currentTcg) {
      filteredBinders = publicBinders.filter(b => {
        const cfg = b.config || {};
        return (!cfg.tcg || cfg.tcg === currentTcg);
      });
    }
    if (!filteredBinders || !filteredBinders.length) {
      const tcgName = currentTcg ? (tcgList.find(t => t.id === currentTcg)?.name || "") : "";
      container.innerHTML = `<div class="collection-empty"><p>No hay binders públicos aún${tcgName ? " para " + tcgName : ""}</p><p style="font-size:var(--text-sm);color:var(--text-tertiary)">Los usuarios pueden publicar sus colecciones y ventas desde la vista de Binder o Venta</p></div>`;
      return;
    }
    container.innerHTML = "";
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
      // Get cover image from first card
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
      const div = document.createElement("div");
      div.className = "explore-card";
      div.innerHTML = `
        <div style="aspect-ratio:63/88;background:${coverImg ? `url(${coverImg}) center/cover` : 'linear-gradient(135deg, var(--bg-elevated), var(--bg-secondary))'};border-bottom:1px solid var(--border-subtle)"></div>
        <div style="padding:var(--space-2) var(--space-3) var(--space-3)">
          <div style="display:flex;align-items:center;gap:var(--space-1);margin-bottom:var(--space-1)">
            <h3 style="font-size:11px;font-weight:var(--weight-semibold);color:#fff;margin:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</h3>
            <span class="explore-badge ${b.type}" style="font-size:8px;padding:1px 5px">${typeLabel}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-1)">
            ${avatarUrl ? `<img src="${avatarUrl}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent);flex-shrink:0">` : `<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#0891b2,#1e3a5f);flex-shrink:0"></div>`}
            <span style="font-size:10px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${username}${isOwner ? "" : ""}</span>
            <span style="font-size:9px;color:var(--text-muted);margin-left:auto;white-space:nowrap">${cardCount} c</span>
          </div>
          ${b.type === "sale" && (hasArs || hasUsd) ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:2px">${hasArs ? `<span style="font-size:11px;font-family:var(--font-mono);color:var(--accent);font-weight:var(--weight-bold)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${hasUsd ? `<span style="font-size:11px;font-family:var(--font-mono);color:#ffd700;font-weight:var(--weight-bold)">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
        </div>
      `;
      div.addEventListener("click", () => openExploreDetail(b));
      container.appendChild(div);
    }
  } catch (e) {
    console.error("Explore error:", e);
    container.innerHTML = '<div class="collection-empty"><p>Error al cargar binders públicos</p></div>';
  }
}
function openExploreDetail(binder) {
  exploreDetailBinder = binder;
  mostrarVista("exploreDetail");
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

  if (subtype === "deck") {
    const deck = expandDbDeck(cards);
    const leader = deck.leader;
    const mainCards = deck.cards || [];
    const dons = deck.dons || [];
    const mainTotal = mainCards.reduce((s, c) => s + (c.quantity || 1), 0);

    container.innerHTML = `
      <div class="explore-detail-header">
        <span class="explore-badge ${b.type}">${typeLabel}</span>
        <span>Deck · ${totalCards} cartas</span>
        ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
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
          leaderCard.addEventListener("click", () => openCardInModal(carta));
        }
      }
    }

    const mainGrid = container.querySelector("#exploreDeckMainGrid");
    mainCards.forEach((c) => {
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
      div.addEventListener("click", () => openCardInModal(carta));
      mainGrid.appendChild(div);
    });

    const donRow = container.querySelector("#exploreDeckDonRow");
    dons.forEach((c) => {
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
      div.addEventListener("click", () => openCardInModal(carta));
      donRow.appendChild(div);
    });
  } else {
    container.innerHTML = `
      <div class="explore-detail-header">
        <span class="explore-badge ${b.type}">${typeLabel}</span>
        <span>${totalCards} cartas</span>
        ${b.type === "sale" && (arsTotal > 0 || usdTotal > 0) ? `<div style="display:flex;gap:12px;margin-left:auto;font-size:11px;font-family:var(--font-mono);font-weight:bold">${arsTotal > 0 ? `<span style="color:var(--accent)">ARS $${arsTotal.toFixed(2)}</span>` : ""}${usdTotal > 0 ? `<span style="color:#ffd700">USD $${usdTotal.toFixed(2)}</span>` : ""}</div>` : ""}
      </div>
      <div class="explore-detail-grid"></div>
    `;
    const grid = container.querySelector(".explore-detail-grid");
    cards.forEach(row => {
      const carta = cartasMap[row.card_id];
      if (!carta) return;
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
      div.addEventListener("click", () => openCardInModal(carta));
      grid.appendChild(div);
    });
  }
}
