// ─── Deck Dispatcher ────────────────────────────────────────────────────────
// Routes deck functions to the correct TCG implementation.
// Suffix resolution: reads tcgConfigs[currentTcg].short → "_OP" / "_RB" / "_PK"

(function() {
  function _fn(name) {
    var s = (typeof tcgShort === "function") ? tcgShort(currentTcg) : null;
    return (s && window[name + "_" + s]) || window[name + "_OP"];
  }

  window.renderDeckView = function renderDeckView(type, col, grid, title, toggleContainer) {
    return _fn("renderDeckView")(type, col, grid, title, toggleContainer);
  };

  // Overlay click handler
  document.getElementById("deckPickerOverlay")?.addEventListener("click", function(e) {
    if (e.target === e.currentTarget) {
      document.getElementById("deckPickerOverlay").style.display = "none";
      _deckPickerResolve = null;
      if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; }
    }
  });
})();
