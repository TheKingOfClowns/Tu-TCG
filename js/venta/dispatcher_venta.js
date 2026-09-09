// ─── Venta Dispatcher ─────────────────────────────────────────────────────
// Routes venta functions to the correct TCG implementation.

(function() {
  function _fn(name) {
    var s = (typeof tcgShort === "function") ? tcgShort(currentTcg) : null;
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

  window.renderVentaIndividual = function renderVentaIndividual(col, grid) {
    return _fn("renderVentaIndividual")(col, grid);
  };
})();

// Event listener: registered here because pedirCrearVenta is defined in this file
document.getElementById("createVentaBtn")?.addEventListener("click", pedirCrearVenta);
