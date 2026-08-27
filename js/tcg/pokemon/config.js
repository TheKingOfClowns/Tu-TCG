// ─── Pokémon TCG Configuration ─────────────────────────────────────────────
window.tcgConfigs = window.tcgConfigs || {};

window.tcgConfigs["pokemon"] = {
  id: "pokemon",
  short: "PK",
  playsetMax: 4,
  hasLanguageFilter: true,

  deckZones: [
    { key: "cards", label: "Deck", min: 60, max: 60, maxCopies: 4, maxCopiesBy: "card_name" }
  ],

  aceSpecLimit: 1,
  radiantLimit: 1,
  basicEnergyUnlimited: true,

  rarities: [
    "Common",
    "Uncommon",
    "Rare",
    "Double Rare",
    "Illustration Rare",
    "Ultra Rare",
    "Special Illustration Rare",
    "Hyper Rare",
    "Promo"
  ],

  cardTypes: ["Pokémon", "Trainer", "Energy"],

  trainerSubtypes: ["Item", "Supporter", "Stadium", "Tool"],
  energySubtypes:  ["Basic Energy", "Special Energy"],

  colors: [
    "Grass", "Fire", "Water", "Lightning", "Psychic",
    "Fighting", "Darkness", "Metal", "Dragon", "Colorless"
  ],

  colorNames: {
    "Grass": "Planta", "Fire": "Fuego", "Water": "Agua",
    "Lightning": "Rayo", "Psychic": "Psíquico", "Fighting": "Lucha",
    "Darkness": "Siniestro", "Metal": "Metálico", "Dragon": "Dragón",
    "Colorless": "Incoloro"
  },

  cardFlags: [
    { key: "is_ace_spec",     label: "ACE SPEC" },
    { key: "is_radiant",      label: "Radiant" },
    { key: "is_ancient",      label: "Ancient" },
    { key: "is_future",       label: "Future" },
    { key: "is_terastal",     label: "Terastal" },
    { key: "has_rule_box",    label: "Rule Box" },
    { key: "is_shiny",        label: "Shiny" }
  ],

  trackingTypes: ["expansion", "character", "rarity"]
};
