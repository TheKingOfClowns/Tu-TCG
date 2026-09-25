// ─── Seller public profile (/seller/:id) ─────────────────────────────────
// ponytail: 1 vista, 4 tabs (Reseñas / Colecciones / En venta / Valorar). Sin montos ni items
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
  const esc = (typeof escapeHtml === "function") ? escapeHtml : function(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  };
  const displayName = String(prof.display_name || prof.username || t("expl.fallback_user")).trim() || t("expl.fallback_user");
  const name = esc(displayName);
  const handle = prof.username && prof.username !== displayName ? esc(String(prof.username).trim().replace(/^@/, "")) : "";
  if (title) title.textContent = t("prof.profile_title");
  let rep = { avg: null, n: 0 };
  try {
    const { data: r } = await supabaseClient.rpc("seller_reputation", { p_seller: sid });
    if (r) rep = r;
  } catch (e) {}
  const reviewCount = Math.max(0, Number(rep.n) || 0);
  const average = Math.min(5, Math.max(0, Number(rep.avg) || 0));
  const rounded = Math.round(average);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);
  const bio = esc(prof.bio || "");
  const loc = [prof.city, prof.country].map(v => esc(String(v || "").trim())).filter(Boolean).join(" · ");
  const wspUrl = (typeof sanitizeWspUrl === "function") ? sanitizeWspUrl(prof.contact_wsp) : null;
  const phone = prof.contact_phone || "";
  const safeUrl = function(raw) {
    try {
      const url = new URL(raw);
      return ["https:", "http:"].includes(url.protocol) ? url.href : null;
    } catch (e) { return null; }
  };
  const avatarUrl = safeUrl(prof.avatar_url);
  const initial = esc(String(displayName).trim().charAt(0).toUpperCase() || "?");
  const socials = (Array.isArray(prof.social_links) ? prof.social_links : [])
    .map(function(l) {
      const url = (l && typeof l === "object" && l.url) ? safeUrl(l.url) : null;
      if (!url) return null;
      return { label: esc((typeof SOCIAL_PLATFORM_LABELS !== "undefined" && SOCIAL_PLATFORM_LABELS[l.platform]) || t("prof.platform_other")), url: esc(url) };
    }).filter(Boolean);
  const crewName = esc(prof.crew || "");
  container.innerHTML = `
    <article class="profile-showcase seller-profile-hero">
      <div class="profile-showcase-cover seller-profile-cover">
        <span class="profile-showcase-eyebrow">${t("prof.public_preview_other")}</span>
      </div>
      <div class="seller-profile-main">
        <div class="seller-profile-avatar" aria-hidden="true">
          <span>${initial}</span>
          ${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="">` : ""}
        </div>
        <div class="seller-profile-info">
          <h1 class="seller-profile-name">${name}</h1>
          ${handle ? `<p class="seller-profile-handle">@${handle}</p>` : ""}
          <div class="seller-profile-meta">
            ${prof.is_admin ? `<span class="seller-profile-badge">🛡️ ${t("seller.mod_badge")}</span>` : ""}
            ${crewName ? `<span class="seller-profile-crew">${crewName}</span>` : ""}
          </div>
          <div class="seller-profile-rating" aria-label="${reviewCount ? `${average.toFixed(1)} / 5, ${reviewCount} ${t("seller.tab_reviews")}` : t("seller.no_reviews_yet")}">
            <span class="seller-profile-stars" aria-hidden="true">${stars}</span>
            <span>${reviewCount ? `${average.toFixed(1)} · ${reviewCount} ${t("seller.tab_reviews").toLowerCase()}` : t("seller.no_reviews_yet")}</span>
          </div>
          ${bio ? `<p class="seller-profile-bio">${bio}</p>` : ""}
          ${loc ? `<p class="seller-profile-location">${loc}</p>` : ""}
          ${(wspUrl || phone || socials.length) ? `<div class="seller-profile-links">
            ${wspUrl ? `<a href="${esc(wspUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>` : ""}
            ${phone ? `<a href="tel:${String(phone).replace(/[^\d+]/g, "")}">${esc(phone)}</a>` : ""}
            ${socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a>`).join("")}
          </div>` : ""}
        </div>
      </div>
    </article>
    <div class="seller-profile-tabs" role="tablist" aria-label="${t("seller.title")}">
      <button class="seller-profile-tab${_sellerTab === "reviews" ? " active" : ""}" data-stab="reviews" role="tab" aria-selected="${_sellerTab === "reviews"}">${t("seller.tab_reviews")}</button>
      <button class="seller-profile-tab${_sellerTab === "collections" ? " active" : ""}" data-stab="collections" role="tab" aria-selected="${_sellerTab === "collections"}">${t("seller.tab_collections")}</button>
      <button class="seller-profile-tab${_sellerTab === "sales" ? " active" : ""}" data-stab="sales" role="tab" aria-selected="${_sellerTab === "sales"}">${t("seller.tab_sales")}</button>
      <button class="seller-profile-tab${_sellerTab === "rate" ? " active" : ""}" data-stab="rate" role="tab" aria-selected="${_sellerTab === "rate"}" id="sellerRateTab" style="display:none">${t("seller.tab_rate")}</button>
    </div>
    <div id="sellerTabBody"></div>`;
  const avatarImage = container.querySelector(".seller-profile-avatar img");
  if (avatarImage) avatarImage.addEventListener("error", () => { avatarImage.remove(); });
  container.querySelectorAll("[data-stab]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      _sellerTab = btn.getAttribute("data-stab");
      container.querySelectorAll("[data-stab]").forEach(b => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      sellerPaintTab(sid);
    });
    btn.addEventListener("keydown", function(event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const tabs = [...container.querySelectorAll("[data-stab]")].filter(tab => tab.style.display !== "none");
      const next = (tabs.indexOf(btn) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });
  sellerPaintTab(sid);
  sellerRefreshRateTab(sid);
}
async function sellerPaintTab(sid) {
  const body = document.getElementById("sellerTabBody");
  if (!body) return;
  if (_sellerTab === "collections") { sellerPaintCollections(sid, body); return; }
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
    return `<article class="seller-review">
      <div class="seller-review-header"><span class="seller-review-author">${esc(r.buyer)}</span><span class="seller-review-stars" aria-hidden="true">${st}</span><time class="seller-review-date">${d}</time></div>
      ${r.comment ? `<p class="seller-review-comment">${esc(r.comment)}</p>` : ""}
      ${canReport ? `<button class="btn-ghost btn-xs seller-review-report" data-report="${r.id}">${t("seller.report")}</button>` : ""}
    </article>`;
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
async function sellerPaintCollections(sid, body) {
  body.innerHTML = `<div class="collection-empty"><p>${t("seller.loading")}</p></div>`;
  try {
    if (typeof ensureCartasLoaded === "function") await ensureCartasLoaded();
    const { data, error } = await supabaseClient.from("binders")
      .select("*, binder_cards(*), target_cards")
      .eq("user_id", sid).eq("is_public", true)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    if (_sellerTab !== "collections" || window._sellerId !== sid || !body.isConnected) return;
    const collections = (data || []).filter(b => b.type !== "sale");
    if (!collections.length) {
      body.innerHTML = `<div class="collection-empty"><p>${t("seller.no_collections")}</p></div>`;
      return;
    }
    const grid = document.createElement("div");
    grid.className = "collection-binder-grid seller-collection-grid";
    collections.forEach(binder => {
      const count = (binder.binder_cards || []).reduce((sum, card) => sum + (Number(card.quantity) || 0), 0);
      const cover = publicBinderCoverImage(binder) || "TUTCG.webp";
      const card = document.createElement("button");
      card.type = "button";
      card.className = "binder-cover-card seller-collection-card";
      card.setAttribute("aria-label", `${binder.name || t("expl.type_collection")} · ${t("expl.card_count", { n: count })}`);
      card.innerHTML = `<div class="binder-cover-img"><div class="binder-cover-overlay"><span class="binder-cover-count"></span></div></div>
        <div class="binder-cover-meta"><div class="binder-cover-name-row"><span class="binder-cover-name-badge"></span><span class="binder-cover-badge"></span></div></div>`;
      const image = document.createElement("img");
      image.className = "seller-collection-image";
      image.src = cover;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => { if (!image.src.endsWith("TUTCG.webp")) image.src = "TUTCG.webp"; });
      card.querySelector(".binder-cover-img").prepend(image);
      card.querySelector(".binder-cover-count").textContent = t("expl.card_count", { n: count });
      card.querySelector(".binder-cover-name-badge").textContent = binder.name || t("expl.type_collection");
      const badge = card.querySelector(".binder-cover-badge");
      badge.classList.add("collection");
      badge.textContent = t("expl.type_collection");
      card.addEventListener("click", () => openExploreDetail(binder));
      grid.appendChild(card);
    });
    body.replaceChildren(grid);
  } catch (error) {
    if (_sellerTab === "collections" && body.isConnected) {
      body.innerHTML = `<div class="collection-empty"><p>${t("expl.load_error")}</p></div>`;
    }
  }
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
        _sellerTab = "reviews";
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
