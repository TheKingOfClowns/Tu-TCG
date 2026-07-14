// ─── Venta Dispatcher ─────────────────────────────────────────────────────
// Routes venta functions to OP or RB implementation based on currentTcg.

function pedirCrearVenta() {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return pedirCrearVenta_RB();
  return pedirCrearVenta_OP();
}

function renderVentaList() {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return renderVentaList_RB();
  return renderVentaList_OP();
}

function renderVentaGrouped(col, grid, mode) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return renderVentaGrouped_RB(col, grid, mode);
  return renderVentaGrouped_OP(col, grid, mode);
}

function attachVentaEvents(col, mode, grid, totalPages) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return attachVentaEvents_RB(col, mode, grid, totalPages);
  return attachVentaEvents_OP(col, mode, grid, totalPages);
}

function buildVentaCardHTML(c, globalIdx, mode) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return buildVentaCardHTML_RB(c, globalIdx, mode);
  return buildVentaCardHTML_OP(c, globalIdx, mode);
}

function renderVentaIndividual(col, grid) {
  if (typeof currentTcg !== "undefined" && currentTcg === "riftbound") return renderVentaIndividual_RB(col, grid);
  return renderVentaIndividual_OP(col, grid);
}
