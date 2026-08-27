// compare_db_vs_official.js
// Read-only comparison of our DB vs official website
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));
const en = master.cards.filter(c => c.language === 'en' && c.category !== 'DON');

// Official sets from en.onepiece-cardgame.com
const officialSets = [
  { id: 'OP-01', name: 'ROMANCE DAWN' },
  { id: 'OP-02', name: 'PARAMOUNT WAR' },
  { id: 'OP-03', name: 'PILLARS OF STRENGTH' },
  { id: 'OP-04', name: 'KINGDOMS OF INTRIGUE' },
  { id: 'OP-05', name: 'AWAKENING OF THE NEW ERA' },
  { id: 'OP-06', name: 'WINGS OF THE CAPTAIN' },
  { id: 'OP-07', name: '500 YEARS IN THE FUTURE' },
  { id: 'OP-08', name: 'TWO LEGENDS' },
  { id: 'OP-09', name: 'EMPERORS IN THE NEW WORLD' },
  { id: 'OP-10', name: 'ROYAL BLOOD' },
  { id: 'OP-11', name: 'A FIST OF DIVINE SPEED' },
  { id: 'OP-12', name: 'LEGACY OF THE MASTER' },
  { id: 'OP-13', name: 'CARRYING ON HIS WILL' },
  { id: 'OP-16', name: 'THE TIME OF BATTLE' },
  { id: 'OP-17', name: "THE WORLD'S STRONGEST WARRIORS" },
  { id: 'EB-01', name: 'MEMORIAL COLLECTION' },
  { id: 'EB-02', name: 'Anime 25th Collection' },
  { id: 'EB-03', name: 'ONE PIECE HEROINES EDITION' },
  { id: 'OP14-EB04', name: "THE AZURE SEA'S SEVEN" },
  { id: 'OP15-EB04', name: "ADVENTURE ON KAMI'S ISLAND" },
  { id: 'PRB-01', name: 'PREMIUM BOOSTER -THE BEST-' },
  { id: 'PRB-02', name: 'PREMIUM BOOSTER -THE BEST vol.2-' },
];

function getBaseId(cardSetId) {
  return cardSetId.replace(/_p\d+|_r\d+/g, '');
}

console.log('=== COMPARATIVA: BASE DE DATOS vs PAGINA OFICIAL (EN) ===\n');
console.log('Nota: Excluye DON cards y Promos\n');

// Summary table
console.log('SET         | NOMBRE                               | EN DB  | UNICOS | PARALELOS');
console.log('------------|--------------------------------------|--------|--------|----------');

const results = [];

officialSets.forEach(s => {
  const cards = en.filter(c => c.set_id === s.id);
  const baseIds = new Set(cards.map(c => getBaseId(c.card_set_id)));
  const parallel = cards.filter(c => c.is_parallel || /_p\d+/.test(c.card_set_id)).length;

  results.push({
    id: s.id,
    name: s.name,
    entries: cards.length,
    uniqueIds: baseIds.size,
    parallel: parallel,
    missing: 0 // We'll fill this after scraping
  });

  const namePad = (s.name + '                              ').slice(0, 36);
  console.log(
    (s.id + '          ').slice(0, 11) + ' | ' +
    namePad + ' | ' +
    (cards.length + '      ').slice(0, 6) + ' | ' +
    (baseIds.size + '      ').slice(0, 6) + ' | ' +
    parallel
  );
});

// Count Starter Decks
const stCards = en.filter(c => c.set_id && c.set_id.startsWith('ST-'));
const stUnique = new Set(stCards.map(c => getBaseId(c.card_set_id)));
console.log('\nSTARTER DECKS (ST-01 a ST-36):');
console.log('  Total entries: ' + stCards.length);
console.log('  Unique card_ids: ' + stUnique.size);

// Problems detected
console.log('\n=== PROBLEMAS DETECTADOS ===\n');

// Check for sets with unusual counts
results.forEach(r => {
  if (r.entries === 0) {
    console.log('❌ ' + r.id + ': SET COMPLETAMENTE FALTANTE');
  } else if (r.uniqueIds < 60) {
    console.log('⚠️  ' + r.id + ': Solo ' + r.uniqueIds + ' card_ids unicos (posiblemente incompleto)');
  }
});

// Check for miscategorized cards
console.log('\n=== CARDS CON set_id INCORRECTO ===');
const mislabeled = en.filter(c => {
  const expectedPrefix = c.set_id.replace('-', '').slice(0, 2);
  const cardPrefix = c.card_setId ? c.card_setId.slice(0, 2) : c.card_set_id.slice(0, 2);
  return c.card_set_id && c.card_set_id.startsWith('OP') && c.set_id.startsWith('EB');
});
console.log('Cards con card_set_id OP-xxx pero set_id EB-xxx: ' + mislabeled.length);
mislabeled.slice(0, 10).forEach(c => {
  console.log('  ' + c.card_set_id + ' -> set_id: ' + c.set_id);
});

// Promos summary (separate)
const promos = en.filter(c =>
  c.set_id === 'PROMO' || c.set_id === 'P' || c.set_id === 'OP-PR' || c.set_id === 'OPDD'
);
const promoUnique = new Set(promos.map(c => c.card_set_id));
console.log('\n=== PROMOS ===');
console.log('Total promo entries: ' + promos.length);
console.log('Unique card_ids: ' + promoUnique.size);

// Final summary
console.log('\n=== RESUMEN ===');
const totalEn = en.filter(c => !c.set_id.startsWith('ST-')).length;
const totalSt = stCards.length;
console.log('Total EN cards (excl DON): ' + master.cards.filter(c => c.language === 'en').length);
console.log('  - Boosters/Extras/Premium: ' + totalEn);
console.log('  - Starter Decks: ' + totalSt);
console.log('  - Promos: ' + promos.length);
console.log('  - DON: ' + master.cards.filter(c => c.language === 'en' && c.category === 'DON').length);
