// ─── TCG Registry (extendido) ──────────────────────────────────────────────
// Carga después de script.js. Agrega TCGs nuevos al tcgList existente.
// Solo agrega TCGs que estén habilitados en config/games.json.

(async () => {
  try {
    const res = await fetch("config/games.json");
    const gamesConfig = await res.json();
    if (gamesConfig.riftbound?.enabled && !tcgList.find(t => t.id === "riftbound")) {
      tcgList.push({ id:"riftbound", name:"Riftbound", color:"#00b4c7", short:"RB", logo:"assets/logos/riftbound.webp" });
      if (typeof renderTcgSelector === "function") renderTcgSelector();
    }
  } catch (e) {
    // Si falla la carga de games.json, agregar riftbound por defecto
    if (!tcgList.find(t => t.id === "riftbound")) {
      tcgList.push({ id:"riftbound", name:"Riftbound", color:"#00b4c7", short:"RB", logo:"assets/logos/riftbound.webp" });
      if (typeof renderTcgSelector === "function") renderTcgSelector();
    }
  }
})();
