// â”€â”€â”€ Explore / Public Binders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderExploreView() {
  const container = document.getElementById("exploreContainer");
  if (!container) return;
  container.className = "explore-grid";
  container.innerHTML = '<div class="loader" style="text-align:center;padding:40px;color:var(--text-tertiary)">Cargando binders pÃºblicosâ€¦</div>';
  if (!isAuthenticated()) {
    container.innerHTML = '<div class="collection-empty"><p>Inicia sesiÃ³n para explorar binders pÃºblicos</p></div>';
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
      container.innerHTML = `<div class="collection-empty"><p>No hay binders pÃºblicos aÃºn${tcgName ? " para " + tcgName : ""}</p><p style="font-size:var(--text-sm);color:var(--text-tertiary)">Los usuarios pueden publicar sus colecciones y ventas desde la vista de Binder o Venta</p></div>`;
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
      const typeLabel = b.type === "sale" ? "Venta" : "ColecciÃ³n";
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
        </div>
      `;
      div.addEventListener("click", () => openExploreDetail(b));
      container.appendChild(div);
    }
  } catch (e) {
    console.error("Explore error:", e);
    container.innerHTML = '<div class="collection-empty"><p>Error al cargar binders pÃºblicos</p></div>';
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
  const typeLabel = b.type === "sale" ? "Venta" : "ColecciÃ³n";
  container.innerHTML = `
    <div class="explore-detail-header">
      <span class="explore-badge ${b.type}">${typeLabel}</span>
      <span>${cards.reduce((s, c) => s + c.quantity, 0)} cartas</span>
    </div>
    <div class="explore-detail-grid"></div>
  `;
  const grid = container.querySelector(".explore-detail-grid");
  cards.forEach(row => {
    const carta = cartasMap[row.card_id];
    if (!carta) return;
    for (let i = 0; i < row.quantity; i++) {
      const div = document.createElement("div");
      div.className = "card fade-in";
      div.innerHTML = `
        <div class="card-img-wrap">
          <img src="${carta.card_image || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" loading="lazy">
        </div>
        <div class="card-body">
          <h3>${formatearNombre(carta)}</h3>
          <span class="card-set-id">${carta.card_set_id || ""}</span>
          ${b.type === "sale" && row.price != null ? `<div class="card-price">Precio vendedor: $${parseFloat(row.price).toFixed(2)}</div>` : ""}
        </div>`;
      grid.appendChild(div);
    }
  });
}
