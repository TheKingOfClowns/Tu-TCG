// ─── Pokémon TCG Configuration ──────────────────────────────────────────────
window.tcgConfigs = window.tcgConfigs || {};

window.tcgConfigs["pokemon"] = {
  id: "pokemon",
  short: "PK",
  playsetMax: 4,
  hasLanguageFilter: true,

  deckZones: [
    { key: "cards", label: "Deck", min: 60, max: 60, maxCopies: 4, maxCopiesBy: "card_name" }
  ],

  rarities:  ["Common","Uncommon","Rare","Holo Rare","Ultra Rare","Secret Rare","Amazing Rare","Radiant Rare","Illustration Rare","Special Illustration Rare","Hyper Rare","Promo"],
  cardTypes: ["Pokémon","Trainer","Energy"],
  colors:    ["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Fairy","Dragon","Colorless"],
  trackingTypes: ["expansion","character","rarity"]
};
