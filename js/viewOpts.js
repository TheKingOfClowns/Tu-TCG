// ─── View options popover (tamaño + filas + count por página, solo localStorage) ───
// ponytail: un popover compartido para catálogo/binder/venta/explore; pageSizeFor() lee las keys.
(function () {
  var ROWS_KEY = "tutcg_page_rows";
  var SIZE_KEY = "tutcg_page_size";

  function getRows() {
    try {
      var r = parseInt(localStorage.getItem(ROWS_KEY), 10);
      if (!isNaN(r) && r >= 2 && r <= 6) return r;
    } catch (e) {}
    return 3;
  }

  function refreshVisibleView() {
    if (typeof currentPage !== "undefined") currentPage = 1;
    if (typeof binderPage !== "undefined") binderPage = 1;
    if (typeof ventaPage !== "undefined") ventaPage = 1;
    if (typeof explorePage !== "undefined") explorePage = 1;
    if (typeof exploreDetailPage !== "undefined") exploreDetailPage = 1;
    var vis = function (id) {
      var el = document.getElementById(id);
      return el && el.style.display !== "none";
    };
    if (vis("catalogView") && typeof renderCards === "function") renderCards();
    else if (vis("binderView") && typeof renderBinder === "function") renderBinder();
    else if (vis("ventaView") && typeof renderVentaView === "function") renderVentaView();
    else if (vis("exploreDetailView") && typeof filterExploreCards === "function") filterExploreCards();
    else if (vis("exploreView") && typeof renderExploreView === "function") renderExploreView();
  }

  function sizeHint(val) {
    var px = (typeof sizePx === "function") ? sizePx(val) : Math.round(120 + val * 1.6);
    return val + "% · ≈" + Math.max(2, Math.floor(1100 / px)) + "/fila";
  }

  function buildPanel() {
    var p = document.createElement("div");
    p.id = "viewOptsPanel";
    p.className = "viewopts-panel glass-panel";
    p.style.display = "none";
    p.innerHTML =
      '<label class="viewopts-row"><span>Tamaño cartas <em id="viewOptsSizeVal"></em></span>' +
      '<input type="range" id="viewOptsSize" min="0" max="100" step="1"></label>' +
      '<label class="viewopts-row"><span>Tamaño deck <em id="viewOptsDeckVal"></em></span>' +
      '<input type="range" id="viewOptsDeck" min="0" max="100" step="1"></label>' +
      '<label class="viewopts-row"><span>Filas por página</span>' +
      '<select id="viewOptsRows">' +
      [2, 3, 4, 5, 6].map(function (r) { return '<option value="' + r + '">' + r + "</option>"; }).join("") +
      "</select></label>" +
      '<label class="viewopts-row"><span>Cartas por página</span>' +
      '<select id="viewOptsSize2">' +
      '<option value="">Auto (filas)</option>' +
      [10, 20, 30, 40].map(function (n) { return '<option value="' + n + '">' + n + "</option>"; }).join("") +
      "</select></label>";
    document.body.appendChild(p);

    var size = document.getElementById("viewOptsSize");
    size.addEventListener("input", function () {
      var v = parseInt(size.value, 10) || 0;
      if (typeof applyCardSize === "function") applyCardSize(v, true);
      document.getElementById("viewOptsSizeVal").textContent = sizeHint(v);
    });
    var deck = document.getElementById("viewOptsDeck");
    deck.addEventListener("input", function () {
      var v = parseInt(deck.value, 10) || 0;
      if (typeof applyDeckSize === "function") applyDeckSize(v, true);
      document.getElementById("viewOptsDeckVal").textContent = sizeHint(v);
    });
    document.getElementById("viewOptsRows").addEventListener("change", function (e) {
      try { localStorage.setItem(ROWS_KEY, e.target.value); } catch (err) {}
      refreshVisibleView();
    });
    document.getElementById("viewOptsSize2").addEventListener("change", function (e) {
      try {
        if (e.target.value) localStorage.setItem(SIZE_KEY, e.target.value);
        else localStorage.removeItem(SIZE_KEY);
      } catch (err) {}
      refreshVisibleView();
    });
    return p;
  }

  function syncPanel() {
    var saved = function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    };
    var v = parseInt(saved("tutcg_card_min"), 10);
    if (isNaN(v)) v = 50;
    document.getElementById("viewOptsSize").value = v;
    document.getElementById("viewOptsSizeVal").textContent = sizeHint(v);
    var d = parseInt(saved("tutcg_deck_min"), 10);
    if (isNaN(d)) d = 50;
    document.getElementById("viewOptsDeck").value = d;
    document.getElementById("viewOptsDeckVal").textContent = sizeHint(d);
    document.getElementById("viewOptsRows").value = String(getRows());
    var fixed = "";
    try { fixed = localStorage.getItem(SIZE_KEY) || ""; } catch (e) {}
    document.getElementById("viewOptsSize2").value = fixed;
  }

  function togglePanel(anchor) {
    var p = document.getElementById("viewOptsPanel") || buildPanel();
    if (p.style.display !== "none") { p.style.display = "none"; return; }
    syncPanel();
    p.style.display = "flex";
    var r = anchor.getBoundingClientRect();
    var pw = p.offsetWidth || 240;
    p.style.top = Math.min(window.innerHeight - p.offsetHeight - 8, r.bottom + 8) + "px";
    p.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw)) + "px";
  }

  document.addEventListener("click", function (e) {
    var gear = e.target.closest ? e.target.closest(".viewopts-gear") : null;
    var panel = document.getElementById("viewOptsPanel");
    if (gear) { togglePanel(gear); return; }
    if (panel && panel.style.display !== "none" && !panel.contains(e.target)) panel.style.display = "none";
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var panel = document.getElementById("viewOptsPanel");
      if (panel) panel.style.display = "none";
    }
  });

  // ponytail: aplica tamaños guardados al arrancar (antes lo hacía initSizeSlider en perfil)
  document.addEventListener("DOMContentLoaded", function () {
    var saved = function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    };
    if (typeof applyCardSize === "function") applyCardSize(saved("tutcg_card_min"), false);
    if (typeof applyDeckSize === "function") applyDeckSize(saved("tutcg_deck_min"), false);
  });
})();
