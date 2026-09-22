// ─── Seller public profile (/seller/:id) ─────────────────────────────────
// ponytail: 1 vista, 3 tabs (Reseñas / En venta / Valorar). Sin montos ni items
// de ventas ajenas: solo comprador + puntuación + texto.
var _sellerTab = "reviews";
async function renderSellerView() {
  const container = document.getElementById("sellerContainer");
  const title = document.getElementById("sellerTitle");
  const sid = window._sellerId;
  if (!container || !sid) return;
  container.innerHTML = `<div class="collection-empty"><p>${t("seller.loading")}</p></div>`;
  let prof = null;
  try {
    const { data } = await supabaseClient.from("profiles")
      .select("id, username, display_name, avatar_url, bio, city, country, contact_phone, contact_wsp, social_links, crew, is_admin")
      .eq("id", sid).single();
    prof = data;
  } catch (e) {}
  if (!prof) {
    container.innerHTML = `<div class="collection-empty"><p>${t("seller.not_found")}</p></div>`;
    return;
  }
  const esc = (typeof escapeHtml === "function") ? escapeHtml : function(s) { return String(s == null ? "" : s); };
  const name = esc(prof.username || prof.display_name || t("expl.fallback_user"));
  if (title) title.textContent = prof.username || prof.display_name || t("seller.title");
  let rep = { avg: null, n: 0 };
  try {
    const { data: r } = await supabaseClient.rpc("seller_reputation", { p_seller: sid });
    if (r) rep = r;
  } catch (e) {}
  const stars = rep.n ? ("★".repeat(Math.round(Number(rep.avg))) + "☆".repeat(5 - Math.round(Number(rep.avg)))) : "☆☆☆☆☆";
  const bio = esc(prof.bio || "");
  const loc = [esc(prof.city || ""), esc(prof.country || "")].filter(Boolean).join(", ");
  const wspUrl = (typeof sanitizeWspUrl === "function") ? sanitizeWspUrl(prof.contact_wsp) : null;
  const phone = prof.contact_phone || "";
  const socials = (Array.isArray(prof.social_links) ? prof.social_links : [])
    .map(function(l) {
      const url = (l && typeof l === "object" && l.url) ? String(l.url).trim() : "";
      if (!/^https?:\/\//i.test(url)) return null;
      return { label: esc((typeof SOCIAL_PLATFORM_LABELS !== "undefined" && SOCIAL_PLATFORM_LABELS[l.platform]) || (l.platform || "link")), url: esc(url) };
    }).filter(Boolean);
  let crewName = "";
  try { crewName = esc(prof.crew || ""); } catch (e) {}
  container.innerHTML = `
    <div class="explore-detail-header">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
        <img src="${esc(prof.avatar_url || "") || "TUTCG.webp"}" onerror="this.src='TUTCG.webp'" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent)">
        <div style="flex:1;min-width:0">
          <div class="explore-owner-name" style="font-size:var(--text-lg);font-weight:var(--weight-bold)">${name}</div>
          ${prof.is_admin ? `<span class="binder-cover-badge sale">🛡️ ${t("seller.mod_badge")}</span>` : ""}
          ${crewName ? `<span style="font-size:var(--text-xs);color:var(--text-secondary)"> · ${crewName}</span>` : ""}
          <div style="font-size:var(--text-sm);color:var(--text-secondary)"><span style="color:#ffd700">${stars}</span> ${rep.n ? `${rep.avg} (${rep.n})` : t("seller.no_reviews_yet")}</div>
        </div>
      </div>
      ${bio ? `<p style="font-size:var(--text-sm);color:var(--text-secondary);margin:0 0 var(--space-2)">${bio}</p>` : ""}
      ${loc ? `<p style="font-size:var(--text-xs);color:var(--text-muted);margin:0 0 var(--space-2)">${loc}</p>` : ""}
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        ${wspUrl ? `<a href="${wspUrl}" target="_blank" rel="noopener" class="btn-ghost btn-xs">WhatsApp</a>` : ""}
        ${phone ? `<a href="tel:${String(phone).replace(/[^\d+]/g, "")}" class="btn-ghost btn-xs">${esc(phone)}</a>` : ""}
        ${socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener" class="btn-ghost btn-xs">${s.label} →</a>`).join("")}
      </div>
      <div class="explore-tabs" style="margin-top:var(--space-3)">
        <button class="explore-tab${_sellerTab === "reviews" ? " active" : ""}" data-stab="reviews">${t("seller.tab_reviews")}</button>
        <button class="explore-tab${_sellerTab === "sales" ? " active" : ""}" data-stab="sales">${t("seller.tab_sales")}</button>
        <button class="explore-tab${_sellerTab === "rate" ? " active" : ""}" data-stab="rate" id="sellerRateTab" style="display:none">${t("seller.tab_rate")}</button>
      </div>
    </div>
    <div id="sellerTabBody"></div>`;
  container.querySelectorAll("[data-stab]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      _sellerTab = btn.getAttribute("data-stab");
      container.querySelectorAll("[data-stab]").forEach(b => b.classList.toggle("active", b === btn));
      sellerPaintTab(sid);
    });
  });
  sellerPaintTab(sid);
  sellerRefreshRateTab(sid);
}
async function sellerPaintTab(sid) {
  const body = document.getElementById("sellerTabBody");
  if (!body) return;
  if (_sellerTab === "sales") { sellerPaintSales(sid, body); return; }
  if (_sellerTab === "rate") { sellerPaintRate(sid, body); return; }
  body.innerHTML = `<div class="collection-empty"><p>${t("seller.loading")}</p></div>`;
  let list = [];
  try {
    const { data } = await supabaseClient.rpc("seller_reviews", { p_seller: sid, p_limit: 20 });
    if (data) list = data;
  } catch (e) {}
  const esc = (typeof escapeHtml === "function") ? escapeHtml : function(s) { return String(s == null ? "" : s); };
  if (!list.length) { body.innerHTML = `<div class="collection-empty"><p>${t("seller.no_reviews")}</p></div>`; return; }
  const canReport = (typeof isAuthenticated === "function") && isAuthenticated();
  body.innerHTML = list.map(function(r) {
    const st = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    let d = "";
    try { d = new Date(r.created_at).toLocaleDateString(); } catch (e) {}
    return `<div style="padding:10px 0;border-bottom:1px solid var(--border-default)">
      <div style="display:flex;gap:8px;align-items:center"><b style="font-size:13px">${esc(r.buyer)}</b><span style="color:#ffd700;font-size:13px">${st}</span><span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${d}</span></div>
      ${r.comment ? `<p style="font-size:13px;color:var(--text-secondary);margin:6px 0 0">${esc(r.comment)}</p>` : ""}
      ${canReport ? `<button class="btn-ghost btn-xs" data-report="${r.id}" style="margin-top:6px">${t("seller.report")}</button>` : ""}
    </div>`;
  }).join("");
  body.querySelectorAll("[data-report]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      const rid = btn.getAttribute("data-report");
      showCreateModal({
        title: t("seller.report_title"),
        confirmText: t("seller.report_send"),
        placeholder: t("seller.report_reason_ph"),
        onConfirm: async function(reason) {
          try {
            const { error } = await supabaseClient.rpc("report_review", { p_review_id: rid, p_reason: reason || "" });
            if (error) throw error;
            if (typeof showToast === "function") showToast(t("seller.reported_ok"), "success");
          } catch (e) { if (typeof showToast === "function") showToast(t("seller.report_error"), "error"); }
        }
      });
    });
  });
}
async function sellerPaintSales(sid, body) {
  body.innerHTML = `<div class="collection-empty"><p>${t("seller.loading")}</p></div>`;
  let rows = [];
  try {
    const { data } = await supabaseClient.from("binders")
      .select("id, name, is_public, config, binder_cards(quantity, price, price_currency)")
      .eq("user_id", sid).eq("type", "sale").eq("is_public", true).order("updated_at", { ascending: false }).limit(20);
    if (data) rows = data;
  } catch (e) {}
  if (!rows.length) { body.innerHTML = `<div class="collection-empty"><p>${t("seller.no_sales")}</p></div>`; return; }
  body.innerHTML = `<div class="collection-binder-grid">` + rows.map(function(b) {
    const cards = b.binder_cards || [];
    const n = cards.reduce(function(s, c) { return s + (c.quantity || 0); }, 0);
    let ars = 0, usd = 0;
    cards.forEach(function(c) {
      if (c.price == null) return;
      if (c.price_currency === "USD") usd += Number(c.price) * (c.quantity || 0);
      else ars += Number(c.price) * (c.quantity || 0);
    });
    return `<div class="binder-cover-card" data-sale="${b.id}" style="cursor:pointer">
      <div class="binder-cover-meta">
        <span class="binder-cover-name-badge">${((typeof escapeHtml === "function") ? escapeHtml(b.name) : b.name)}</span>
        <span style="font-size:11px;color:var(--text-muted)">${t("venta.count_cards", { n: n })}</span>
        <div style="font-family:var(--font-mono);font-size:11px;font-weight:bold">${ars > 0 ? `<span style="color:var(--accent)">ARS $${ars.toFixed(2)}</span>` : ""}${usd > 0 ? ` <span style="color:#ffd700">USD $${usd.toFixed(2)}</span>` : ""}</div>
      </div></div>`;
  }).join("") + `</div>`;
  body.querySelectorAll("[data-sale]").forEach(function(el) {
    el.addEventListener("click", async function() {
      const id = el.getAttribute("data-sale");
      try {
        if (typeof loadPublicBinderById === "function") {
          const full = await loadPublicBinderById(id);
          if (full && typeof openExploreDetail === "function") { openExploreDetail(full); return; }
        }
      } catch (e) {}
      if (typeof navigateToView === "function") navigateToView("exploreDetail", { id: id }, {});
    });
  });
}
async function sellerPaintRate(sid, body) {
  body.innerHTML = `<div class="collection-empty"><p>${t("seller.loading")}</p></div>`;
  let orders = [], rated = {};
  try {
    if (!isAuthenticated() || (typeof authUser !== "undefined" && authUser && authUser.id === sid)) {
      body.innerHTML = `<div class="collection-empty"><p>${t("seller.no_pending")}</p></div>`;
      return;
    }
    const { data: os } = await supabaseClient.from("sale_orders").select("id, items, created_at").eq("buyer_id", authUser.id).eq("seller_id", sid).order("created_at", { ascending: false }).limit(10);
    orders = os || [];
    if (orders.length) {
      const { data: rs } = await supabaseClient.from("reviews").select("order_id").eq("reviewer_id", authUser.id).in("order_id", orders.map(o => o.id));
      (rs || []).forEach(function(r) { rated[r.order_id] = true; });
    }
  } catch (e) {}
  const pending = orders.filter(o => !rated[o.id]);
  if (!pending.length) { body.innerHTML = `<div class="collection-empty"><p>${t("seller.no_pending")}</p></div>`; return; }
  const esc = (typeof escapeHtml === "function") ? escapeHtml : function(s) { return String(s == null ? "" : s); };
  body.innerHTML = pending.map(function(o) {
    const items = (o.items || []).map(function(it) { return (it.qty || 0) + "x " + esc(it.card_id); }).join(", ");
    let d = "";
    try { d = new Date(o.created_at).toLocaleDateString(); } catch (e) {}
    return `<div data-order="${o.id}" style="padding:10px 0;border-bottom:1px solid var(--border-default)">
      <div style="font-size:13px">${items} <span style="color:var(--text-muted);font-size:11px">· ${d}</span></div>
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap" data-stars>
        ${[0, 1, 2, 3, 4, 5].map(n => `<button class="btn-ghost btn-xs" data-star="${n}">${n}★</button>`).join("")}
      </div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <input type="text" data-comment maxlength="500" placeholder="${t("seller.rate_placeholder")}" style="flex:1;min-width:0;padding:6px 10px;background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-size:13px;outline:none">
        <button class="btn-primary btn-xs" data-send disabled>${t("seller.rate_send")}</button>
      </div></div>`;
  }).join("");
  body.querySelectorAll("[data-order]").forEach(function(box) {
    const oid = box.getAttribute("data-order");
    let picked = -1;
    const send = box.querySelector("[data-send]");
    box.querySelectorAll("[data-star]").forEach(function(sb) {
      sb.addEventListener("click", function() {
        picked = parseInt(sb.getAttribute("data-star"));
        box.querySelectorAll("[data-star]").forEach(x => x.classList.toggle("active", parseInt(x.getAttribute("data-star")) <= picked));
        send.disabled = false;
      });
    });
    send.addEventListener("click", async function() {
      if (picked < 0) { if (typeof showToast === "function") showToast(t("seller.select_stars"), "error"); return; }
      try {
        const { error } = await supabaseClient.rpc("rate_order", { p_order_id: oid, p_rating: picked, p_comment: box.querySelector("[data-comment]").value || "" });
        if (error) throw error;
        if (typeof showToast === "function") showToast(t("seller.rated_ok"), "success");
        renderSellerView();
      } catch (e) { if (typeof showToast === "function") showToast(t("seller.rate_error"), "error"); }
    });
  });
}
async function sellerRefreshRateTab(sid) {
  // ponytail: muestra Valorar solo si tengo compras sin puntuar
  try {
    const tab = document.getElementById("sellerRateTab");
    if (!tab) return;
    tab.style.display = "none";
    if (!isAuthenticated() || (typeof authUser !== "undefined" && authUser && authUser.id === sid)) return;
    const { data: os } = await supabaseClient.from("sale_orders").select("id").eq("buyer_id", authUser.id).eq("seller_id", sid).limit(10);
    if (!os || !os.length) return;
    const { data: rs } = await supabaseClient.from("reviews").select("order_id").eq("reviewer_id", authUser.id).in("order_id", os.map(o => o.id));
    const rated = {};
    (rs || []).forEach(function(r) { rated[r.order_id] = true; });
    if (os.some(o => !rated[o.id])) tab.style.display = "";
  } catch (e) {}
}
