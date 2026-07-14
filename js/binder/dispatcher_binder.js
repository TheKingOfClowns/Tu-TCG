// ─── Binder Dispatcher ────────────────────────────────────────────────────
// Routes binder functions to the correct TCG implementation.

(function() {
  var _suffixMap = { "one-piece":"OP", "riftbound":"RB", "pokemon":"PK" };

  function _fn(name) {
    var s = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) ? _suffixMap[currentTcg] : null;
    return (s && window[name + "_" + s]) || window[name + "_OP"];
  }

  window.pedirCrearColeccion = function pedirCrearColeccion() {
    return _fn("pedirCrearColeccion")();
  };

  window.renderCollectionList = function renderCollectionList() {
    return _fn("renderCollectionList")();
  };

  window.renderBinder = function renderBinder() {
    return _fn("renderBinder")();
  };
})();

// Event listener: registered here because pedirCrearColeccion is defined in this file
document.getElementById("createCollectionBtn")?.addEventListener("click", pedirCrearColeccion);
