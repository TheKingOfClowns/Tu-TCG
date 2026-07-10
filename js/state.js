// ─── Application State ────────────────────────────────────────────────────
// Fuente única de verdad. Accedido desde módulos extraídos.
// Los globales legacy en script.js se migrarán gradualmente.

const state = {
  app: {
    currentTcg: null,
    pendingView: null,
  },
  catalog: {
    cartas: [],
    cartasFiltradas: [],
    cartasMap: {},
    currentPage: 1,
    currentCardIndex: -1,
    setCategoryMap: {},
    prbBadgeMap: {},
    tcgplayerMap: null,
    rebuildingFilters: false,
    prb02CardlistLabels: null,
    catalogLanguage: "en",
  },
  binder: {
    collections: {},
    currentCollectionId: null,
    binderPage: 1,
  },
  venta: {
    ventaCols: {},
    currentVentaId: null,
    ventaPage: 1,
  },
  explore: {
    exploreDetailBinder: null,
  },
  pendingCards: {},
};
