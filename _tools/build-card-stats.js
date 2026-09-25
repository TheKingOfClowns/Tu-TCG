const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function buildCardStats() {
  const games = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "games.json"), "utf8"));
  const counts = {};
  let totalCards = 0;

  for (const [gameId, game] of Object.entries(games)) {
    if (!game.enabled) continue;
    const master = JSON.parse(fs.readFileSync(path.join(ROOT, game.data_dir, "cards_master.json"), "utf8"));
    const count = Number.isFinite(master.total_cards) ? master.total_cards
      : Number.isFinite(master.total_unique) ? master.total_unique
      : Array.isArray(master.cards) ? master.cards.length : 0;
    counts[gameId] = count;
    totalCards += count;
  }

  const output = { total_cards: totalCards, games: counts };
  fs.writeFileSync(path.join(ROOT, "config", "card-stats.json"), `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Updated config/card-stats.json (${totalCards.toLocaleString()} cards)`);
  return output;
}

if (require.main === module) buildCardStats();
module.exports = buildCardStats;
