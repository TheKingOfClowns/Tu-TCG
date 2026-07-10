// ─── TCG Registry (extendido) ──────────────────────────────────────────────
// Carga después de script.js. Agrega TCGs nuevos al tcgList existente.

if (!tcgList.find(t => t.id === "riftbound")) {
  tcgList.push({ id:"riftbound", name:"Riftbound", color:"#00b4c7", short:"RB", logo:"assets/logos/riftbound.webp" });
}
