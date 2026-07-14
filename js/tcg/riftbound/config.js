// ─── Riftbound TCG Configuration ────────────────────────────────────────────
window.tcgConfigs = window.tcgConfigs || {};

window.tcgConfigs["riftbound"] = {
  id: "riftbound",
  short: "RB",
  playsetMax: 3,
  hasLanguageFilter: false,

  deckZones: [
    { key: "legend",      label: "Legend",       cardType: "Legend",     min: 0, max: 1,  isUnique: true },
    { key: "champions",   label: "Champions",    cardType: "Unit",       min: 0, max: 3,  maxCopies: 3, maxCopiesBy: "card_name", attribute: "Champion", matchFeature: true },
    { key: "cards",       label: "Main Deck",    min: 0, max: 40, maxCopies: 3, maxCopiesBy: "card_name", checkColor: true },
    { key: "runes",       label: "Runes",         cardType: "Rune",       min: 0, max: 12 },
    { key: "battlefields",label: "Battlefields",  cardType: "Battlefield",min: 0, max: 3,  uniqueByName: true },
    { key: "sideboard",   label: "Sideboard",    min: 0, max: 8,  optional: true, requiresZone: "champions" }
  ],

  rarities:  ["Common","Uncommon","Rare","Epic","Promo","Showcase","AA"],
  cardTypes: ["Unit","Spell","Legend","Gear","Battlefield","Rune"],
  colors:    ["Mind","Order","Calm","Body","Chaos","Fury","Colorless"],
  trackingTypes: ["expansion","character","rarity"],

  detectAA: function(carta) {
    return /^\w+-\d+[asv]$/i.test(carta.card_set_id || "");
  },

  getAASuffix: function(cardSetId) {
    var m = (cardSetId || "").match(/[asv]$/i);
    if (!m) return null;
    return { a: "AA", s: "Sig", v: "OV" }[m[0].toLowerCase()] || null;
  }
};
