// ─── Tracking Pokémon ──────────────────────────────────────────────────────
// PK tracking stub. Delegates to OP implementation for now.

function pedirCrearTracking_PK(preFillName) {
  return pedirCrearTracking(preFillName);
}

function renderTrackingExtra_PK(type, panel) {
  // If RB tracking functions exist, use them as base (no DON, no language filter)
  if (typeof renderTrackingExtra_RB === "function") return renderTrackingExtra_RB(type, panel);
  return renderTrackingExtra(type, panel);
}

function getAvailableSets_PK() {
  if (typeof getAvailableSets_RB === "function") return getAvailableSets_RB();
  return getAvailableSets();
}

function buildTrackingCardList_PK(type, config) {
  if (typeof buildTrackingCardList_RB === "function") return buildTrackingCardList_RB(type, config);
  return buildTrackingCardList(type, config);
}

function trackingCardPasses_PK(c, config) {
  if (typeof trackingCardPasses_RB === "function") return trackingCardPasses_RB(c, config);
  return trackingCardPasses(c, config);
}

function confirmCreateTracking_PK() {
  if (typeof confirmCreateTracking_RB === "function") return confirmCreateTracking_RB();
  return confirmCreateTracking();
}
