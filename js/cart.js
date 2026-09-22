// ─── Carrito venta (reserva 20min, solo logueados) ─────────────────────────
// ponytail: ventana por updated_at (cada add/set la resetea). Sin cron: RPCs filtran 20min.
var Cart = { reserved: {}, mine: {}, binder: null, expiresAt: 0, _tick: null, seller: null };
function cartWindowMs() { return 20 * 60 * 1000; }
async function cartLoad(binderId) {
  Cart.binder = binderId; Cart.reserved = {}; Cart.mine = {}; Cart.expiresAt = 0; Cart.seller = null;
  try {
    if (typeof supabaseClient === "undefined") return;
    const { data: r } = await supabaseClient.rpc("sale_reserved", { p_binder_id: binderId });
    if (r) Cart.reserved = r;
    if (typeof isAuthenticated === "function" && isAuthenticated() && typeof authUser !== "undefined" && authUser) {
      const { data: m } = await supabaseClient.from("sale_carts").select("items,updated_at").eq("binder_id", binderId).eq("buyer_id", authUser.id).single();
      (m?.items || []).forEach(function(it) { Cart.mine[it.card_id] = it.qty; });
      if (m?.updated_at && Object.keys(Cart.mine).length) Cart.expiresAt = new Date(m.updated_at).getTime() + cartWindowMs();
    }
  } catch (e) {}
  try {
    var ow = (typeof exploreDetailOwner !== "undefined") ? exploreDetailOwner : null;
    if (ow) Cart.seller = { name: ow.username || "", wsp: ow.contact_wsp || "", phone: ow.contact_phone || "" };
  } catch (e) {}
  cartBar();
  cartTick();
  try {
    var b = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
    if (b && b.id === binderId && typeof cartPaintRows === "function") cartPaintRows(b);
  } catch (e) {}
}
function cartAvail(cardId, stock) {
  return Math.max(0, (stock || 0) - (Cart.reserved[cardId] || 0));
}
async function cartRefresh() {
  if (!Cart.binder) return;
  try {
    const { data: r } = await supabaseClient.rpc("sale_reserved", { p_binder_id: Cart.binder });
    if (r) Cart.reserved = r;
    if (typeof authUser !== "undefined" && authUser) {
      const { data: m } = await supabaseClient.from("sale_carts").select("items,updated_at").eq("binder_id", Cart.binder).eq("buyer_id", authUser.id).single();
      Cart.mine = {};
      (m?.items || []).forEach(function(it) { Cart.mine[it.card_id] = it.qty; });
      Cart.expiresAt = (m?.updated_at && Object.keys(Cart.mine).length) ? new Date(m.updated_at).getTime() + cartWindowMs() : 0;
    }
  } catch (e) {}
  cartBar();
  try {
    var b = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
    if (b && b.id === Cart.binder && typeof cartPaintRows === "function") cartPaintRows(b);
  } catch (e) {}
  if (typeof cartDrawerPaint === "function") cartDrawerPaint();
}
async function cartAdd(binderId, cardId, qty) {
  if (typeof isAuthenticated === "function" && !isAuthenticated()) { if (typeof showAuthModal === "function") showAuthModal(); return; }
  try {
    const { data, error } = await supabaseClient.rpc("cart_add", { p_binder_id: binderId, p_card_id: cardId, p_qty: qty || 1 });
    if (error) throw error;
    Cart.mine = {};
    (data || []).forEach(function(it) { Cart.mine[it.card_id] = it.qty; });
    Cart.expiresAt = Date.now() + cartWindowMs();
    const { data: r } = await supabaseClient.rpc("sale_reserved", { p_binder_id: binderId });
    if (r) Cart.reserved = r;
  } catch (e) {
    const m = String(e?.message || "");
    if (typeof showToast === "function") showToast(m.indexOf("STOCK") === 0 ? t("cart.no_stock") : t("cart.error"), "error");
    return;
  }
  if (typeof showToast === "function") showToast(t("cart.added"), "success");
  cartBar();
  cartTick();
  if (typeof filterExploreCards === "function") filterExploreCards();
  if (typeof cartDrawerPaint === "function") cartDrawerPaint();
}
async function cartSet(binderId, cardId, qty) {
  try {
    const { data, error } = await supabaseClient.rpc("cart_set_qty", { p_binder_id: binderId, p_card_id: cardId, p_qty: qty });
    if (error) throw error;
    Cart.mine = {};
    (data || []).forEach(function(it) { Cart.mine[it.card_id] = it.qty; });
    Cart.expiresAt = Object.keys(Cart.mine).length ? Date.now() + cartWindowMs() : 0;
    const { data: r } = await supabaseClient.rpc("sale_reserved", { p_binder_id: binderId });
    if (r) Cart.reserved = r;
  } catch (e) {
    if (typeof showToast === "function") showToast(t("cart.error"), "error");
    return;
  }
  cartBar();
  cartTick();
  if (typeof filterExploreCards === "function") filterExploreCards();
  if (typeof cartDrawerPaint === "function") cartDrawerPaint();
}
async function cartClear(binderId) {
  try {
    if (typeof authUser === "undefined" || !authUser) return;
    await supabaseClient.from("sale_carts").delete().eq("binder_id", binderId).eq("buyer_id", authUser.id);
    Cart.mine = {}; Cart.expiresAt = 0;
    const { data: r } = await supabaseClient.rpc("sale_reserved", { p_binder_id: binderId });
    if (r) Cart.reserved = r;
  } catch (e) {}
  cartBar();
  cartTick();
  if (typeof filterExploreCards === "function") filterExploreCards();
  if (typeof cartDrawerPaint === "function") cartDrawerPaint();
}
function cartCount() { return Object.values(Cart.mine).reduce((s, q) => s + q, 0); }
function cartLeftMs() { return Cart.expiresAt ? Math.max(0, Cart.expiresAt - Date.now()) : 0; }
function cartLeftStr() {
  const s = Math.ceil(cartLeftMs() / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function cartTick() {
  if (Cart._tick) { clearInterval(Cart._tick); Cart._tick = null; }
  if (!Cart.expiresAt || !cartCount()) return;
  Cart._tick = setInterval(function() {
    if (cartLeftMs() <= 0) {
      clearInterval(Cart._tick); Cart._tick = null;
      Cart.mine = {}; Cart.expiresAt = 0;
      if (typeof showToast === "function") showToast(t("cart.expired"), "info");
      cartRefresh();
      return;
    }
    const el = document.getElementById("cartTimer");
    if (el) el.textContent = cartLeftStr();
    const el2 = document.getElementById("cartDrawerTimer");
    if (el2) el2.textContent = cartLeftStr();
  }, 5000);
}
function cartBar() {
  let bar = document.getElementById("cartBar");
  const n = cartCount();
  cartTopSync(n);
  if (!n) { if (bar) bar.remove(); cartDrawerClose(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "cartBar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span>🛒 <b>${n}</b> · <span id="cartTimer">${cartLeftStr()}</span> · ${t("cart.tap_detail")}</span><button class="btn-ghost btn-xs" id="cartClearBtn">${t("cart.clear")}</button>`;
  bar.onclick = function(e) {
    if (e.target.closest("#cartClearBtn")) return;
    cartDrawerOpen();
  };
  bar.querySelector("#cartClearBtn").addEventListener("click", (e) => { e.stopPropagation(); cartClear(Cart.binder); });
}
// ponytail: botón global junto a la campana; abre el mismo drawer
function cartTopSync(n) {
  try {
    const btn = document.getElementById("cartTopBtn");
    const badge = document.getElementById("cartTopBadge");
    if (!btn) return;
    if (typeof n !== "number") n = cartCount();
    btn.style.display = n ? "" : "none";
    if (badge) {
      badge.style.display = n ? "" : "none";
      badge.textContent = n > 99 ? "99+" : String(n);
    }
  } catch (e) {}
}
(function cartTopInit() {
  document.getElementById("cartTopBtn")?.addEventListener("click", () => cartDrawerOpen());
})();
// ─── Drawer ───
function cartCartRows() {
  var b = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
  if (!b || b.id !== Cart.binder) return [];
  var byId = {};
  (b.binder_cards || []).forEach(function(c) {
    if (!byId[c.card_id]) byId[c.card_id] = { card_id: c.card_id, qty: 0, price: c.price, price_currency: c.price_currency };
    byId[c.card_id].qty += (c.quantity || 0);
  });
  return Object.keys(Cart.mine).map(function(cid) {
    var info = byId[cid] || { card_id: cid, qty: 0, price: null };
    var carta = (typeof cartasMap !== "undefined") ? cartasMap[cid] : null;
    return { card_id: cid, qty: Cart.mine[cid], stock: info.qty, price: info.price, price_currency: info.price_currency || "ARS", name: carta ? formatearNombre(carta) : cid };
  });
}
function cartDrawerOpen() {
  if (document.getElementById("cartDrawer")) { cartDrawerPaint(); return; }
  const d = document.createElement("div");
  d.id = "cartDrawer";
  d.innerHTML = `<div id="cartDrawerBody"></div>`;
  d.addEventListener("click", (e) => { if (e.target === d) cartDrawerClose(); });
  document.body.appendChild(d);
  document.addEventListener("keydown", cartDrawerEsc);
  cartDrawerPaint();
}
function cartDrawerEsc(e) { if (e.key === "Escape") cartDrawerClose(); }
function cartDrawerClose() {
  const d = document.getElementById("cartDrawer");
  if (d) d.remove();
  document.removeEventListener("keydown", cartDrawerEsc);
}
function cartDrawerPaint() {
  const body = document.getElementById("cartDrawerBody");
  if (!body) return;
  const rows = cartCartRows();
  let ars = 0, usd = 0;
  rows.forEach(function(r) {
    if (r.price != null) {
      if (r.price_currency === "USD") usd += Number(r.price) * r.qty;
      else ars += Number(r.price) * r.qty;
    }
  });
  const wsp = cartWspLink(rows, ars, usd);
  body.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><h3 style="flex:1;margin:0">🛒 ${t("cart.title")}</h3><span id="cartDrawerTimer" style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">${cartLeftStr()}</span><button class="btn-ghost btn-xs" id="cartDrawerX">✕</button></div>` +
    (rows.length ? rows.map(function(r) {
      return `<div class="cart-line"><span style="flex:1;font-size:13px">${r.name} <span style="color:var(--text-muted);font-size:11px">stock ${Math.max(0, r.stock - (Cart.reserved[r.card_id] || 0))}/${r.stock}</span></span><button class="btn-ghost btn-xs" data-dec="${r.card_id}">−</button><b>${r.qty}</b><button class="btn-ghost btn-xs" data-inc="${r.card_id}">+</button></div>`;
    }).join("") : `<p style="color:var(--text-muted)">${t("cart.empty")}</p>`) +
    `<div style="margin:12px 0;font-family:var(--font-mono);font-size:13px;font-weight:bold">${ars > 0 ? `<div style="color:var(--accent)">ARS $${ars.toFixed(2)}</div>` : ""}${usd > 0 ? `<div style="color:#ffd700">USD $${usd.toFixed(2)}</div>` : ""}</div>` +
    `<p style="font-size:11px;color:var(--text-muted)">${t("cart.expire_note")}</p>` +
    (wsp ? `<a href="${wsp}" target="_blank" rel="noopener" class="btn-primary" style="display:flex;justify-content:center;text-decoration:none;margin-top:8px">💬 ${t("cart.send_wsp")}</a>` : `<p style="font-size:11px;color:var(--text-muted)">${t("cart.no_contact")}</p>`) +
    `<div style="display:flex;gap:8px;margin-top:8px"><button class="btn-primary" id="cartCheckoutBtn" style="flex:1">${t("cart.checkout")}</button><button class="btn-ghost" id="cartDrawerClear">${t("cart.clear")}</button></div>`;
  body.querySelector("#cartDrawerX").addEventListener("click", cartDrawerClose);
  body.querySelector("#cartDrawerClear").addEventListener("click", () => cartClear(Cart.binder));
  body.querySelector("#cartCheckoutBtn").addEventListener("click", () => cartCheckout());
  body.querySelectorAll("[data-dec]").forEach(function(btn) {
    btn.addEventListener("click", () => cartSet(Cart.binder, btn.getAttribute("data-dec"), (Cart.mine[btn.getAttribute("data-dec")] || 1) - 1));
  });
  body.querySelectorAll("[data-inc]").forEach(function(btn) {
    btn.addEventListener("click", () => cartAdd(Cart.binder, btn.getAttribute("data-inc"), 1));
  });
}
// ponytail: link WhatsApp al vendedor con pedido armado; valida dominios como el perfil público
function cartWspLink(rows, ars, usd) {
  try {
    if (!rows.length || !Cart.seller) return "";
    var base = "";
    var wsp = (Cart.seller.wsp || "").trim();
    if (wsp) {
      var ok = false;
      try { ok = (typeof sanitizeWspUrl === "function") ? !!sanitizeWspUrl(wsp) : /^https?:\/\//i.test(wsp); } catch (e) { ok = /^https?:\/\//i.test(wsp); }
      if (/^(wa\.me|web\.whatsapp\.com|api\.whatsapp\.com)/i.test(wsp)) wsp = "https://" + wsp;
      if (ok) base = wsp;
    }
    if (!base) {
      var digits = String(Cart.seller.phone || "").replace(/[^\d]/g, "");
      if (digits.length >= 8) base = "https://wa.me/" + digits;
    }
    if (!base) return "";
    var buyer = "";
    try { buyer = (typeof currentProfile !== "undefined" && currentProfile?.username) || ""; } catch (e) {}
    var b = (typeof exploreDetailBinder !== "undefined") ? exploreDetailBinder : null;
    var lines = rows.map(function(r) {
      return "• " + r.qty + "x " + r.name + (r.price != null ? " ($" + Number(r.price).toFixed(2) + " " + r.price_currency + ")" : "");
    });
    var msg = t("cart.wsp_hello", { seller: Cart.seller.name || "", buyer: buyer }) + "\n" +
      t("cart.wsp_sale", { sale: b ? b.name : "" }) + "\n" + lines.join("\n") + "\n" +
      t("cart.wsp_total", { ars: ars.toFixed(2), usd: usd.toFixed(2) });
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "text=" + encodeURIComponent(msg);
  } catch (e) { return ""; }
}
async function cartCheckout() {
  if (!Cart.binder || !cartCount()) return;
  if (!confirm(t("cart.checkout_confirm"))) return;
  try {
    const { error } = await supabaseClient.rpc("checkout_cart", { p_binder_id: Cart.binder });
    if (error) throw error;
  } catch (e) {
    const m = String(e?.message || "");
    if (typeof showToast === "function") showToast(m.indexOf("STOCK") === 0 ? t("cart.no_stock") : t("cart.error"), "error");
    cartRefresh();
    return;
  }
  Cart.mine = {}; Cart.expiresAt = 0;
  if (typeof showToast === "function") showToast(t("cart.bought"), "success");
  cartDrawerClose();
  cartRefresh();
}
// ponytail: pinta steppers por fila (stock - reservas); dueño no compra propio
function cartPaintRows(b) {
  try {
    if (!b || b.type !== "sale") return;
    if (typeof authUser !== "undefined" && authUser && b.user_id === authUser.id) return;
    document.querySelectorAll(".cart-row").forEach(function(el) {
      const cid = el.getAttribute("data-cardid");
      const stock = parseInt(el.getAttribute("data-stock")) || 0;
      const avail = cartAvail(cid, stock);
      const mine = Cart.mine[cid] || 0;
      if (typeof isAuthenticated !== "function" || !isAuthenticated()) {
        el.innerHTML = `<span style="font-size:11px;color:var(--text-muted)">stock ${stock}</span>`;
        return;
      }
      if (!mine) {
        el.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><span class="stock-pill${avail <= 0 ? " out" : ""}">${avail <= 0 ? t("cart.soldout") : "stock " + avail}</span><button class="btn-ghost btn-xs cart-add" ${avail <= 0 ? "disabled" : ""}>${t("cart.add")}</button></div>`;
        const btn = el.querySelector(".cart-add");
        if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); cartAdd(b.id, cid, 1); });
      } else {
        el.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-top:6px"><button class="btn-ghost btn-xs cart-dec">−</button><span class="stock-pill">🛒 ${mine} · stock ${avail}</span><button class="btn-ghost btn-xs cart-inc" ${avail <= 0 ? "disabled" : ""}>+</button></div>`;
        el.querySelector(".cart-dec").addEventListener("click", (e) => { e.stopPropagation(); cartSet(b.id, cid, mine - 1); });
        const inc = el.querySelector(".cart-inc");
        if (inc) inc.addEventListener("click", (e) => { e.stopPropagation(); cartAdd(b.id, cid, 1); });
      }
    });
  } catch (e) {}
}
