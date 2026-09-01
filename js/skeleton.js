// ═══ Skeleton UI Helpers ═════════════════════════════════════════════════
// Placeholders de carga (shimmer) para todas las vistas.
// Uso:
//   skeletonCardGrid(container, count, fill)   → grid de cartas 63/88
//   skeletonCoverGrid(container, count)        → grid de portadas (colecciones/venta/explore)
//   skeletonDeck(container, count)             → layout de deck (líder + cartas)
//   skeletonExploreDetail(container, count)    → header + grid (explore detail)
//   skeletonStats()                            → números del landing
//   skeletonTcgSelector(container, count)      → selector de TCG (home)
(function () {
  function repeat(fn, n) {
    var s = "";
    for (var i = 0; i < n; i++) s += fn();
    return s;
  }
  function cardBlock() {
    return '<div class="sk-card"><div class="sk-img sk-shimmer"></div><div class="sk-body"><div class="sk-line sk-shimmer"></div><div class="sk-line short sk-shimmer"></div></div></div>';
  }
  function coverBlock() {
    return '<div class="sk-cover"><div class="sk-cover-img sk-shimmer"></div><div class="sk-cover-body"><div class="sk-cover-line sk-shimmer"></div><div class="sk-cover-line short sk-shimmer"></div></div></div>';
  }
  function slotBlock() {
    return '<div class="sk-deck-slot"><div class="sk-img sk-shimmer"></div><div class="sk-body"><div class="sk-line sk-shimmer"></div></div></div>';
  }

  window.skeletonCardGrid = function (container, count, fill) {
    if (!container) return;
    container.innerHTML = '<div class="sk-grid' + (fill ? ' sk-fill' : '') + '">' + repeat(cardBlock, count || 12) + '</div>';
  };

  window.skeletonCoverGrid = function (container, count) {
    if (!container) return;
    container.innerHTML = '<div class="sk-covers">' + repeat(coverBlock, count || 10) + '</div>';
  };

  window.skeletonDeck = function (container, count) {
    if (!container) return;
    container.innerHTML = '<div class="sk-deck">' +
      '<div class="sk-deck-leader"><div class="sk-img sk-shimmer"></div><div class="sk-body"><div class="sk-line sk-shimmer"></div></div></div>' +
      '<div class="sk-deck-slots">' + repeat(slotBlock, count || 15) + '</div>' +
      '</div>';
  };

  window.skeletonExploreDetail = function (container, count) {
    if (!container) return;
    container.innerHTML = '<div class="sk-detail">' +
      '<div class="sk-detail-header"><div class="sk-avatar sk-shimmer"></div><div class="sk-detail-line sk-shimmer"></div></div>' +
      '<div class="sk-grid" style="padding:0">' + repeat(cardBlock, count || 10) + '</div>' +
      '</div>';
  };

  window.skeletonStats = function () {
    var statCards = document.getElementById("statCards");
    if (statCards) statCards.innerHTML = '<span class="sk-stat sk-shimmer"></span>';
  };

  window.skeletonTcgSelector = function (container, count) {
    if (!container) return;
    container.innerHTML = '<div class="sk-tcg-grid">' + repeat(function () {
      return '<div class="sk-tcg sk-shimmer"></div>';
    }, count || 3) + '</div>';
  };
})();
