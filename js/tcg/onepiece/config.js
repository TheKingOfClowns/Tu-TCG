// ─── One Piece TCG Configuration ───────────────────────────────────────────
window.tcgConfigs = window.tcgConfigs || {};

window.tcgConfigs["one-piece"] = {
  id: "one-piece",
  short: "OP",
  playsetMax: 4,
  hasLanguageFilter: true,

  deckZones: [
    { key: "leader",   label: "Líder",      cardType: "LEADER",    min: 0, max: 1,  isUnique: true },
    { key: "cards",    label: "Main Deck",   min: 0, max: 50, maxCopies: 4, maxCopiesBy: "card_set_id" },
    { key: "dons",     label: "DON!!",       cardType: "DON!!",    min: 0, max: 10, optional: true }
  ],

  rarities:      ["L","C","UC","R","SR","SEC","SP","AA"],
  cardTypes:     ["LEADER","CHARACTER","EVENT","STAGE","DON!!"],
  colors:        ["Red","Blue","Green","Purple","Black","Yellow"],
  colorNames:    { "Red":"Rojo", "Blue":"Azul", "Green":"Verde", "Purple":"Morado", "Black":"Negro", "Yellow":"Amarillo" },
  donVariants:   ["Gold","DP"],
  trackingTypes: ["expansion","character","rarity","don"],

  unlimitedCards: new Set(["OP16-042"]),
  mangaSet: new Set([
    "EB01-006","OP01-016","OP01-120","OP02-013","OP03-122",
    "OP04-083","OP05-069","OP05-074","OP05-119","OP06-118"
  ]),

  expansionNames: {
    "OP-01":"OP01 - Romance Dawn",           "OP01":"OP01 - Romance Dawn",
    "OP-02":"OP02 - Paramount War",           "OP02":"OP02 - Paramount War",
    "OP-03":"OP03 - Pillars of Strength",     "OP03":"OP03 - Pillars of Strength",
    "OP-04":"OP04 - Kingdoms of Intrigue",    "OP04":"OP04 - Kingdoms of Intrigue",
    "OP-05":"OP05 - Awakening of the New Era","OP05":"OP05 - Awakening of the New Era",
    "OP-06":"OP06 - Wings of the Captain",    "OP06":"OP06 - Wings of the Captain",
    "EB-01":"EB01 - Memorial Collection",     "EB01":"EB01 - Memorial Collection",
    "OP-07":"OP07 - 500 Years in the Future", "OP07":"OP07 - 500 Years in the Future",
    "PRB-01":"PRB01 - The Best",              "PRB01":"PRB01 - The Best",
    "OP-08":"OP08 - Two Legends",             "OP08":"OP08 - Two Legends",
    "OP-09":"OP09 - Emperors in the New World","OP09":"OP09 - Emperors in the New World",
    "OP-10":"OP10 - Royal Blood",             "OP10":"OP10 - Royal Blood",
    "EB-02":"EB02 - Anime 25th Collection",   "EB02":"EB02 - Anime 25th Collection",
    "OP-11":"OP11 - A Fist of Divine Speed",  "OP11":"OP11 - A Fist of Divine Speed",
    "OP-12":"OP12 - Legacy of the Master",    "OP12":"OP12 - Legacy of the Master",
    "OP-13":"OP13 - Crossed Paths",           "OP13":"OP13 - Crossed Paths",
    "EB-03":"EB03 - One Piece Heroines",      "EB03":"EB03 - One Piece Heroines",
    "OP14-EB04":"OP14 - Azure Sea's Seven + EB04",
    "OP15-EB04":"OP15 - Sky Island + EB04",
    "PRB-02":"PRB02 - The Best Vol.2",        "PRB02":"PRB02 - The Best Vol.2",
    "OP-16":"OP16 - The Time of Battle",      "OP16":"OP16 - The Time of Battle",
    "OP-14":"OP14 - The Azure Sea's Seven",
    "OP-15":"OP15 - Adventure on KAMI's Island",
    "EB-04":"EB04 - EGGHEAD CRISIS",
    "DON!!":"--- DON!! Cards ---",
    "PROMO":"Promo Cards"
  },

  expansionOrder: {
    "OP-01":1, "OP-02":2, "OP-03":3, "OP-04":4, "OP-05":5, "OP-06":6,
    "EB-01":7, "OP-07":8, "OP-08":9, "PRB-01":10,
    "OP-09":11, "OP-10":12, "EB-02":13,
    "OP-11":14, "OP-12":15, "PRB-02":16,
    "OP-13":17, "OP-14":18, "OP14-EB04":18,
    "EB-04":19, "EB-03":20,
    "OP-15":21, "OP15-EB04":21, "OP-16":22,
    "DON!!":23, "PROMO":24
  }
};

// Add ST-01 through ST-36 to expansion names
for (var i = 1; i <= 36; i++) {
  var key = "ST-" + String(i).padStart(2,"0");
  window.tcgConfigs["one-piece"].expansionNames[key] = key + " - Starter Deck";
}

// ─── Backward-compatibility global aliases ────────────────────────────────
var nombresExpansiones = window.tcgConfigs["one-piece"].expansionNames;
var ordenExpansiones   = window.tcgConfigs["one-piece"].expansionOrder;
var coloresES          = window.tcgConfigs["one-piece"].colorNames;
var unlimitedCards     = window.tcgConfigs["one-piece"].unlimitedCards;
var MANGA_PR01         = window.tcgConfigs["one-piece"].mangaSet;
