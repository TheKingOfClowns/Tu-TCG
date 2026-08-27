// _tools/dedup_promos.js
// Deduplicates promo cards by removing exact duplicates (same card_set_id + language + card_image)
// Usage: node _tools/dedup_promos.js

const fs = require('fs');

const masterPath = 'data/games/onepiece/cards_master.json';
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('=== Deduplicacion de cartas ===\n');
console.log('Total cartas antes:', master.cards.length);

// Track duplicates
const seen = new Map(); // key -> { index, card }
const duplicates = [];
const removedByLang = { en: 0, ja: 0 };

master.cards.forEach((card, idx) => {
  // Create unique key from card_set_id + language + card_image
  const key = `${card.card_set_id}|${card.language}|${card.card_image}`;
  
  if (seen.has(key)) {
    duplicates.push({ idx, key, card });
    if (card.language === 'en') removedByLang.en++;
    else if (card.language === 'ja') removedByLang.ja++;
  } else {
    seen.set(key, { idx, card });
  }
});

console.log('Duplicados exactos encontrados:', duplicates.length);
console.log('  EN:', removedByLang.en);
console.log('  JA:', removedByLang.ja);

// Build deduplicated array (keep first occurrence of each)
const keepIndices = new Set([...seen.values()].map(v => v.idx));
const deduped = master.cards.filter((_, idx) => keepIndices.has(idx));

console.log('\nCartas despues de deduplicar:', deduped.length);
console.log('Eliminadas:', master.cards.length - deduped.length);

// Update master
master.cards = deduped;

// Recalculate stats
const cats = { BOOSTER: 0, STARTER: 0, PROMO: 0, OTHER: 0, DON: 0 };
master.cards.forEach(c => {
  const cat = c.category || '';
  if (cats[cat] !== undefined) cats[cat]++;
});

const ja = master.cards.filter(c => c.language === 'ja').length;
const en = master.cards.filter(c => c.language === 'en').length;

master.generated_at = new Date().toISOString();
master.total_unique = master.cards.length;
master.categories = cats;
master.stats = { without_image: 0, japanese_cards: ja, without_ja_image: 0, english_cards: en };

console.log('\n--- Stats actualizadas ---');
console.log('Total:', master.cards.length);
console.log('Categorias:', JSON.stringify(cats));
console.log('EN:', en, '| JA:', ja);

// Count promo cards by language
const promoEN = master.cards.filter(c => 
  (c.category === 'PROMO' || c.category === 'OTHER' || 
   ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)) && 
  c.language === 'en'
).length;
const promoJA = master.cards.filter(c => 
  (c.category === 'PROMO' || c.category === 'OTHER' || 
   ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)) && 
  c.language === 'ja'
).length;

console.log('\n--- Promos por idioma ---');
console.log('EN promos:', promoEN, '(esperado: 511)');
console.log('JA promos:', promoJA, '(esperado: 624)');
console.log('Total promos:', promoEN + promoJA, '(esperado: 1135)');

// Save
fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
fs.copyFileSync(masterPath, 'data/games/onepiece/cards_master_backup.json');
console.log('\nGuardado. Backup creado.');

// Show some examples of removed duplicates
if (duplicates.length > 0) {
  console.log('\n--- Ejemplos de duplicados eliminados (primeros 10) ---');
  duplicates.slice(0, 10).forEach(d => {
    console.log(`  [${d.card.language}] ${d.card.card_set_id} | ${d.card.card_image.split('/').pop()}`);
  });
}
