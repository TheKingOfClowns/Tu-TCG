// ─── Venta Dispatcher ─────────────────────────────────────────────────────
// Routes venta functions to the correct TCG implementation.

(function() {
  var _suffixMap = { "one-piece":"OP", "riftbound":"RB", "pokemon":"PK" };

  function _fn(name) {
    var s = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) ? _suffixMap[currentTcg] : null;
    return (s && window[name + "_" + s]) || window[name + "_OP"];
  }

  window.pedirCrearVenta = function pedirCrearVenta() {
    return _fn("pedirCrearVenta")();
  };

  window.renderVentaList = function renderVentaList() {
    return _fn("renderVentaList")();
  };

  window.renderVentaGrouped = function renderVentaGrouped(col, grid, mode) {
    return _fn("renderVentaGrouped")(col, grid, mode);
  };

  window.attachVentaEvents = function attachVentaEvents(col, mode, grid, totalPages) {
    return _fn("attachVentaEvents")(col, mode, grid, totalPages);
  };

  window.buildVentaCardHTML = function buildVentaCardHTML(c, globalIdx, mode) {
    return _fn("buildVentaCardHTML")(c, globalIdx, mode);
  };

  window.renderVentaIndividual = function renderVentaIndividual(col, grid) {
    return _fn("renderVentaIndividual")(col, grid);
  };
})();

// Event listener: registered here because pedirCrearVenta is defined in this file
document.getElementById("createVentaBtn")?.addEventListener("click", pedirCrearVenta);
