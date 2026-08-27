// Analyze EN promo cards in detail
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Get all EN promo cards
const enPromos = master.cards.filter(c => c.language === 'en' && (
  c.category === 'PROMO' || c.category === 'OTHER' || 
  ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
));

console.log('Total EN promos:', enPromos.length);

// Breakdown by set_id
const bySetId = {};
enPromos.forEach(c => {
  const sid = c.set_id || 'null';
  if (!bySetId[sid]) bySetId[sid] = [];
  bySetId[sid].push(c);
});

console.log('\n--- Por set_id ---');
Object.entries(bySetId).sort((a,b) => b[1].length - a[1].length).forEach(([sid, cards]) => {
  console.log(`  ${sid}: ${cards.length}`);
});

// Breakdown by category
const byCategory = {};
enPromos.forEach(c => {
  const cat = c.category || 'null';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(c);
});

console.log('\n--- Por category ---');
Object.entries(byCategory).sort((a,b) => b[1].length - a[1].length).forEach(([cat, cards]) => {
  console.log(`  ${cat}: ${cards.length}`);
});

// Find cards with PROMO category but non-promo set_ids
const miscategorized = enPromos.filter(c => 
  c.category === 'PROMO' && 
  !['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
);

console.log('\n--- Miscategorizadas (category=PROMO pero set_id de booster/starter) ---');
console.log('Total:', miscategorized.length);
const miscBySet = {};
miscategorized.forEach(c => {
  if (!miscBySet[c.set_id]) miscBySet[c.set_id] = 0;
  miscBySet[c.set_id]++;
});
Object.entries(miscBySet).sort((a,b) => b[1] - a[1]).forEach(([sid, count]) => {
  console.log(`  ${sid}: ${count}`);
});

// Find parallel variants (same card_set_id + language, different card_image)
const byCardSetId = {};
enPromos.forEach(c => {
  const key = c.card_set_id;
  if (!byCardSetId[key]) byCardSetId[key] = [];
  byCardSetId[key].push(c);
});

const variants = Object.entries(byCardSetId).filter(([_, cards]) => cards.length > 1);
const variantCards = variants.reduce((sum, [_, cards]) => sum + cards.length - 1, 0);

console.log('\n--- Variantes paralelas (mismo card_set_id, diferente imagen) ---');
console.log('Grupos con variantes:', variants.length);
console.log('Entradas excedentes:', variantCards);

// Show some examples
console.log('\nEjemplos de variantes:');
variants.slice(0, 10).forEach(([id, cards]) => {
  console.log(`  ${id} (${cards.length} variantes):`);
  cards.forEach(c => {
    console.log(`    set_id=${c.set_id} | ${c.card_image.split('/').pop()}`);
  });
});

// Count unique promo cards (by card_set_id, ignoring variants)
const uniqueIds = new Set(enPromos.map(c => c.card_set_id));
console.log('\n--- Resumen ---');
console.log('Total entradas EN promo:', enPromos.length);
console.log('Unicas por card_set_id:', uniqueIds.size);
console.log('Exceso por variantes:', variantCards);
console.log('Miscategorizadas:', miscategorized.length);
console.log('Exceso total:', enPromos.length - 511);
