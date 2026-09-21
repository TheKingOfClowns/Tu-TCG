// ─── View options popover (1 barra: tamaño; filas/columnas por fórmula, solo localStorage) ───
// ponytail: un popover compartido; la barra manda columnas/filas, el px emerge. pageSizeFor() lee todo.
(function () {
  function snap10(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) return 50;
    return Math.max(0, Math.min(100, Math.round(v / 10) * 10));
  }

  function vis(id) {
    var el = document.getElementById(id);
    return !!(el && el.style.display !== "none");
  }

  // ponytail: panel adaptativo — portadas solo tamaño cartas, decks solo tamaño deck
  function viewMode() {
    if (vis("collectionManager") || vis("ventaManager")) return "covers";
    if ((vis("binderView") && vis("binderDeckContainer")) || (vis("ventaView") && vis("ventaDeckContainer"))) return "deck";
    return "full";
  }

  function refreshVisibleView() {
    if (typeof currentPage !== "undefined") currentPage = 1;
    if (typeof binderPage !== "undefined") binderPage = 1;
    if (typeof ventaPage !== "undefined") ventaPage = 1;
    if (typeof explorePage !== "undefined") explorePage = 1;
    if (typeof exploreDetailPage !== "undefined") exploreDetailPage = 1;
    if (vis("catalogView") && typeof renderCards === "function") renderCards();
    else if (vis("collectionManager")) { if (typeof syncGridCols === "function") syncGridCols(document.getElementById("collectionList")); if (typeof renderCollectionList === "function") renderCollectionList(); }
    else if (vis("ventaManager")) { if (typeof syncGridCols === "function") syncGridCols(document.getElementById("ventaList")); if (typeof renderVentaList === "function") renderVentaList(); }
    else if (vis("binderView") && typeof renderBinder === "function") renderBinder();
    else if (vis("ventaView") && typeof renderVentaView === "function") renderVentaView();
    else if (vis("exploreDetailView") && typeof filterExploreCards === "function") filterExploreCards();
    else if (vis("exploreView") && typeof renderExploreView === "function") renderExploreView();
  }

  // ponytail: debounce 300ms — la barra cambia columnas → el paginado se recalcula
  var _voTimer = null;
  function refreshSoon() {
    try { clearTimeout(_voTimer); } catch (e) {}
    _voTimer = setTimeout(refreshVisibleView, 300);
  }

  function sizeHint(val) {
    var g = (typeof gridColsRows === "function") ? gridColsRows(val, 1100) : { cols: 5, rows: 7, size: 35 };
    return t("view.size_hint", { c: g.cols, s: g.size });
  }

  function buildPanel() {
    var p = document.createElement("div");
    p.id = "viewOptsPanel";
    p.className = "viewopts-panel glass-panel";
    p.style.display = "none";
    p.innerHTML =
      '<label class="viewopts-row" id="viewOptsRowCard"><span>' + t("view.card_size") + ' <em id="viewOptsSizeVal"></em></span>' +
      '<input type="range" id="viewOptsSize" min="0" max="100" step="10"></label>' +
      '<label class="viewopts-row" id="viewOptsRowDeck"><span>' + t("view.deck_size") + ' <em id="viewOptsDeckVal"></em></span>' +
      '<input type="range" id="viewOptsDeck" min="0" max="100" step="1"></label>';
    document.body.appendChild(p);

    var size = document.getElementById("viewOptsSize");
    size.addEventListener("input", function () {
      var v = snap10(size.value);
      try { localStorage.setItem("tutcg_card_min", String(v)); } catch (e) {}
      document.getElementById("viewOptsSizeVal").textContent = sizeHint(v);
      refreshSoon();
    });
    var deck = document.getElementById("viewOptsDeck");
    deck.addEventListener("input", function () {
      var v = parseInt(deck.value, 10) || 0;
      if (typeof applyDeckSize === "function") applyDeckSize(v, true);
      document.getElementById("viewOptsDeckVal").textContent = v + "%";
    });
    return p;
  }

  function syncPanel() {
    var saved = function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    };
    var v = snap10(saved("tutcg_card_min"));
    document.getElementById("viewOptsSize").value = v;
    document.getElementById("viewOptsSizeVal").textContent = sizeHint(v);
    var d = parseInt(saved("tutcg_deck_min"), 10);
    if (isNaN(d)) d = 50;
    document.getElementById("viewOptsDeck").value = d;
    document.getElementById("viewOptsDeckVal").textContent = d + "%";
    // ponytail: 1 sola barra — card en todo, deck solo en decks
    var deckMode = viewMode() === "deck";
    var show = function (id, on) { var el = document.getElementById(id); if (el) el.style.display = on ? "" : "none"; };
    show("viewOptsRowCard", !deckMode);
    show("viewOptsRowDeck", deckMode);
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

  // ponytail: aplica tamaños guardados al arrancar + limpia keys viejas de filas/count
  document.addEventListener("DOMContentLoaded", function () {
    try { localStorage.removeItem("tutcg_page_rows"); localStorage.removeItem("tutcg_page_size"); } catch (e) {}
    var saved = function (key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    };
    if (typeof applyCardSize === "function") applyCardSize(saved("tutcg_card_min"), false);
    if (typeof applyDeckSize === "function") applyDeckSize(saved("tutcg_deck_min"), false);
  });
})();
