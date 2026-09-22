// ─── Notificaciones vendedor (campana global) ─────────────────────────────
// ponytail: poll 60s, sin realtime. Panel simple con marcar leídas.
async function notifRefresh() {
  const bell = document.getElementById("notifBell");
  const badge = document.getElementById("notifBadge");
  if (!bell) return;
  try {
    if (typeof isAuthenticated !== "function" || !isAuthenticated() || typeof supabaseClient === "undefined") {
      bell.style.display = "none";
      document.getElementById("notifPanel")?.remove();
      return;
    }
    bell.style.display = "";
    const { data, count } = await supabaseClient.from("notifications").select("id", { count: "exact" }).eq("read", false);
    const n = count || 0;
    if (badge) {
      badge.style.display = n ? "" : "none";
      badge.textContent = n > 99 ? "99+" : String(n);
    }
    if (document.getElementById("notifPanel")) notifPaintList();
  } catch (e) {}
}
async function notifPaintList() {
  const panel = document.getElementById("notifList");
  if (!panel) return;
  try {
    const { data } = await supabaseClient.from("notifications").select("id,kind,title,body,read,created_at").order("created_at", { ascending: false }).limit(20);
    panel.innerHTML = (data || []).length ? data.map(function(n) {
      const esc = (typeof escapeHtml === "function") ? escapeHtml : function(s) { return String(s == null ? "" : s); };
      return `<div class="notif-item${n.read ? "" : " unread"}" data-nid="${n.id}" style="padding:8px 10px;border-bottom:1px solid var(--border-default);cursor:pointer;${n.read ? "opacity:.6" : ""}"><div style="font-size:13px;font-weight:${n.read ? "normal" : "bold"}">${n.kind === "sale" ? "💰 " : n.kind === "low_stock" ? "⚠️ " : ""}${esc(n.title)}</div><div style="font-size:12px;color:var(--text-secondary)">${esc(n.body)}</div></div>`;
    }).join("") : `<div style="padding:12px;color:var(--text-muted);font-size:13px">${t("notif.empty")}</div>`;
    panel.querySelectorAll("[data-nid]").forEach(function(el) {
      el.addEventListener("click", async () => {
        await supabaseClient.from("notifications").update({ read: true }).eq("id", el.getAttribute("data-nid"));
        notifRefresh();
      });
    });
  } catch (e) {}
}
function notifTogglePanel() {
  let p = document.getElementById("notifPanel");
  if (p) { p.remove(); return; }
  p = document.createElement("div");
  p.id = "notifPanel";
  p.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border-default)"><b style="flex:1">🔔 ${t("notif.title")}</b><button class="btn-ghost btn-xs" id="notifReadAll">${t("notif.read_all")}</button></div><div id="notifList"></div>`;
  document.body.appendChild(p);
  p.querySelector("#notifReadAll").addEventListener("click", async (e) => {
    e.stopPropagation();
    await supabaseClient.from("notifications").update({ read: true }).eq("read", false);
    notifRefresh();
  });
  notifPaintList();
}
(function notifInit() {
  document.getElementById("notifBell")?.addEventListener("click", (e) => { e.stopPropagation(); notifTogglePanel(); });
  document.addEventListener("click", (e) => {
    const p = document.getElementById("notifPanel");
    if (p && !e.target.closest("#notifPanel") && !e.target.closest("#notifBell")) p.remove();
  });
  setTimeout(notifRefresh, 2000);
  setInterval(notifRefresh, 60000);
})();
