// ─── Binder Dispatcher ────────────────────────────────────────────────────
// Routes binder functions to OP or RB implementation based on currentTcg.

function pedirCrearColeccion() {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return pedirCrearColeccion_RB();
  return pedirCrearColeccion_OP();
}

function renderCollectionList() {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return renderCollectionList_RB();
  return renderCollectionList_OP();
}

function renderBinder() {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return renderBinder_RB();
  return renderBinder_OP();
}
