// ─── Deck Dispatcher ────────────────────────────────────────────────────────
// Routes showDeckPicker, renderDeckView, and saveDeck to the correct TCG

function showDeckPicker(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") {
    return showDeckPicker_RB(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots, legendFeature, restrictToKeys);
  }
  return showDeckPicker_OP(mode, leaderColor, existingKeys, leaderSetId, existingCounts, remainingSlots);
}

function renderDeckView(type, col, grid, title, toggleContainer) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") {
    return renderDeckView_RB(type, col, grid, title, toggleContainer);
  }
  return renderDeckView_OP(type, col, grid, title, toggleContainer);
}

function saveDeck(isSale) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") {
    return saveDeck_RB(isSale);
  }
  return saveDeck_OP(isSale);
}

// Overlay click handler (uses the current showDeckPicker via dispatcher)
document.getElementById("deckPickerOverlay")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById("deckPickerOverlay").style.display = "none";
    _deckPickerResolve = null;
    if (_deckPickerInterval) { clearInterval(_deckPickerInterval); _deckPickerInterval = null; }
  }
});
