// ─── One Piece TCG Configuration ───────────────────────────────────────────
// nombresExpansiones, ordenExpansiones y coloresES ya los define script.js.
// Este archivo agrega metadata nueva no presente en script.js.

const OnePieceConfig = {
  tcgId: "one-piece",
  deckRules: {
    leader: { min: 1, max: 1 },
    main: { min: 50, max: 50 },
    don: { min: 0, max: 10 },
  },
  categories: ["BOOSTER", "STARTER", "PROMO", "DON", "OTHER"],
  rarityLabels: ["L", "C", "UC", "R", "SR", "SEC", "SP", "AA", "Gold", "DP", "Foil", "Full Art", "Manga", "Jolly Roger"],
  colors: { "Red":"Rojo", "Blue":"Azul", "Green":"Verde", "Purple":"Morado", "Black":"Negro", "Yellow":"Amarillo" },
};
