// ─── TCG Registry (extendido) ──────────────────────────────────────────────
// Agrega TCGs habilitados en config/games.json al tcgList que define script.js.

// Shared suffix resolver used by all dispatchers and deck adders.
window.tcgShort = function tcgShort(tcgId) {
  var cfg = (typeof tcgConfigs !== "undefined" && tcgConfigs[tcgId]) || null;
  return (cfg && cfg.short) || "OP";
};

(function() {
  function ensureRiftbound() {
    if (typeof tcgList === "undefined") { setTimeout(ensureRiftbound, 50); return; }
    if (tcgList.find(function(t) { return t.id === "riftbound"; })) return;
    tcgList.push({ id: "riftbound", name: "Riftbound", color: "#00b4c7", short: "RB", logo: "assets/logos/riftbound.webp" });
    if (typeof renderTcgSelector === "function") renderTcgSelector();
  }
  async function load() {
    try {
      const res = await fetch("config/games.json");
      const gamesConfig = await res.json();
      if (!(gamesConfig.riftbound && gamesConfig.riftbound.enabled)) return;
      ensureRiftbound();
    } catch (e) {
      ensureRiftbound();
    }
  }
  load();
})();
