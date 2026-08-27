// Deep analysis of EN promo situation
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Get EN promos by set_id category
const enPromos = master.cards.filter(c => c.language === 'en' && (
  c.category === 'PROMO' || ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
));

console.log('=== ANALISIS EN PROMOS ===\n');
console.log('Total:', enPromos.length);

// Breakdown by set_id
const bySetId = {};
enPromos.forEach(c => {
  const sid = c.set_id;
  if (!bySetId[sid]) bySetId[sid] = [];
  bySetId[sid].push(c);
});

console.log('\n--- Por set_id ---');
Object.entries(bySetId).sort((a,b) => b[1].length - a[1].length).forEach(([sid, cards]) => {
  const unique = new Set(cards.map(c => c.card_set_id));
  console.log(`  ${sid}: ${cards.length} entries, ${unique.size} unicas`);
});

// Check overlap between P and PROMO set_ids
const pCards = new Set(enPromos.filter(c => c.set_id === 'P').map(c => c.card_set_id));
const promoCards = new Set(enPromos.filter(c => c.set_id === 'PROMO').map(c => c.card_set_id));
const overlap = [...pCards].filter(id => promoCards.has(id));

console.log('\n--- Overlap P vs PROMO ---');
console.log('Cards en P:', pCards.size);
console.log('Cards en PROMO:', promoCards.size);
console.log('Cards en AMBOS:', overlap.length);

// Check if overlap cards have same or different images
console.log('\n--- Ejemplos de overlap (primeros 10) ---');
overlap.slice(0, 10).forEach(id => {
  const pEntries = enPromos.filter(c => c.card_set_id === id && c.set_id === 'P');
  const promoEntries = enPromos.filter(c => c.card_set_id === id && c.set_id === 'PROMO');
  console.log(`\n${id}:`);
  pEntries.forEach(c => console.log(`  P:     ${c.card_image.split('/').pop()}`));
  promoEntries.forEach(c => console.log(`  PROMO: ${c.card_image.split('/').pop()}`));
});

// Count true unique cards (deduplicate by card_set_id + set_id + image)
const trueUnique = new Set();
enPromos.forEach(c => {
  const key = `${c.card_set_id}|${c.set_id}|${c.card_image}`;
  trueUnique.add(key);
});
console.log('\n--- Verdaderas unicas (card_set_id + set_id + imagen) ---');
console.log('Total:', trueUnique.size);

// If we keep only one image per card_set_id (removing _p2, _p3, etc. variants)
const keepOnePerCard = new Set();
enPromos.forEach(c => {
  const key = `${c.card_set_id}|${c.set_id}`;
  if (!keepOnePerCard.has(key)) {
    keepOnePerCard.add(key);
  }
});
console.log('Si mantenemos 1 imagen por (card_set_id + set_id):', keepOnePerCard.size);

// If we keep only one image per card_set_id (ignoring set_id duplication)
const keepOnePerId = new Set(enPromos.map(c => c.card_set_id));
console.log('Si mantenemos 1 imagen por card_set_id (ignorando P/PROMO):', keepOnePerId.size);
