// Remove duplicate EN promo entries between set_id=P and set_id=PROMO
// Keep one entry per card_set_id + image combination
const fs = require('fs');

const masterPath = 'data/games/onepiece/cards_master.json';
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('=== Eliminar duplicados P/PROMO ===\n');
console.log('Total antes:', master.cards.length);

// Find duplicates: same card_set_id + same image, different set_id (P vs PROMO)
const seen = new Map(); // key: card_set_id + image -> first index
const toRemove = new Set();
let duplicateCount = 0;

master.cards.forEach((card, idx) => {
  if (card.language !== 'en') return;
  if (!['P', 'PROMO'].includes(card.set_id)) return;
  
  const imageFile = card.card_image.split('/').pop();
  const key = `${card.card_set_id}|${imageFile}`;
  
  if (seen.has(key)) {
    toRemove.add(idx);
    duplicateCount++;
  } else {
    seen.set(key, idx);
  }
});

console.log('Duplicados encontrados:', duplicateCount);

// Remove duplicates
const deduped = master.cards.filter((_, idx) => !toRemove.has(idx));
master.cards = deduped;

console.log('Total despues:', master.cards.length);

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

// Count promos
const promoEN = master.cards.filter(c => c.language === 'en' && (
  c.category === 'PROMO' || ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
)).length;

console.log('\n--- Stats ---');
console.log('Total:', master.cards.length);
console.log('Categorias:', JSON.stringify(cats));
console.log('EN:', en, '| JA:', ja);
console.log('EN Promos:', promoEN);

// Save
fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
console.log('\nGuardado.');
