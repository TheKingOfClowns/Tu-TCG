// Check current EN promo variants
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Get current EN promos
const enPromos = master.cards.filter(c => c.language === 'en' && (
  c.category === 'PROMO' || ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
));

console.log('Total EN promos actuales:', enPromos.length);

// Find parallel variants (same card_set_id + language, different card_image)
const byCardSetId = {};
enPromos.forEach(c => {
  const key = c.card_set_id;
  if (!byCardSetId[key]) byCardSetId[key] = [];
  byCardSetId[key].push(c);
});

const variantGroups = Object.entries(byCardSetId).filter(([_, cards]) => cards.length > 1);
const variantExcess = variantGroups.reduce((sum, [_, cards]) => sum + cards.length - 1, 0);

console.log('Grupos con variantes:', variantGroups.length);
console.log('Entradas excedentes por variantes:', variantExcess);

// Unique promo cards (by card_set_id)
const uniqueIds = new Set(enPromos.map(c => c.card_set_id));
console.log('Unicas por card_set_id:', uniqueIds.size);
console.log('Exceso sobre 511:', enPromos.length - 511);

// Check: do variant cards have legitimate parallel images?
console.log('\n--- Ejemplos de variantes (primeros 10 grupos) ---');
variantGroups.slice(0, 10).forEach(([id, cards]) => {
  console.log(`\n${id} (${cards.length} variantes):`);
  cards.forEach(c => {
    console.log(`  set_id=${c.set_id} | ${c.card_image.split('/').pop()}`);
  });
});

// Are these variant images actual parallel versions?
// Check if all variant images for same card_set_id have _p1, _p2, _p3, etc.
console.log('\n--- Analisis de patrones de variantes ---');
const parallelCount = [];
const nonParallelCount = [];

variantGroups.forEach(([id, cards]) => {
  const images = cards.map(c => c.card_image.split('/').pop());
  const hasPNumbering = images.every(img => /_p\d+/.test(img));
  if (hasPNumbering) {
    parallelCount.push({ id, count: cards.length, images });
  } else {
    nonParallelCount.push({ id, count: cards.length, images });
  }
});

console.log('Grupos con _p1, _p2, etc:', parallelCount.length);
console.log('Grupos SIN _pN numbering:', nonParallelCount.length);

// Summary
console.log('\n=== RESUMEN ===');
console.log(`Promos EN: ${enPromos.length}`);
console.log(`Unicas: ${uniqueIds.size} (esperado: 511)`);
console.log(`Variantes paralelas excedentes: ${variantExcess}`);
console.log(`Si eliminamos variantes: ${uniqueIds.size} cartas`);
