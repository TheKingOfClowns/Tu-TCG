// ─── Deck Dispatcher ────────────────────────────────────────────────────────
// Routes deck functions to the correct TCG implementation.
// Suffix resolution: reads tcgConfigs[currentTcg].short → "_OP" / "_RB" / "_PK"

(function() {
  var _suffixMap = { "one-piece":"OP", "riftbound":"RB", "pokemon":"PK" };

  function _fn(name) {
    var s = (typeof tcgConfigs !== "undefined" && tcgConfigs[currentTcg]) ? _suffixMap[currentTcg] : null;
    return (s && window[name + "_" + s]) || window[name + "_OP"];
  }

  window.showDeckPicker = function showDeckPicker(mode, legendColor, existingKeys, legendSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys) {
    return _fn("showDeckPicker")(mode, legendColor, existingKeys, legendSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys);
  };

  window.renderDeckView = function renderDeckView(type, col, grid, title, toggleContainer) {
    return _fn("renderDeckView")(type, col, grid, title, toggleContainer);
  };

  window.saveDeck = function saveDeck(isSale) {
    return _fn("saveDeck")(isSale);
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
