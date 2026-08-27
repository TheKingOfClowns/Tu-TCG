// Remove 215 miscategorized EN PROMO cards (they already exist as BOOSTER/STARTER)
const fs = require('fs');

const masterPath = 'data/games/onepiece/cards_master.json';
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('=== Eliminar 215 miscategorizadas ===\n');
console.log('Total antes:', master.cards.length);

// Build index of EN cards by card_set_id
const enCards = master.cards.filter(c => c.language === 'en');
const byCardSetId = {};
enCards.forEach(c => {
  const id = c.card_set_id;
  if (!byCardSetId[id]) byCardSetId[id] = [];
  byCardSetId[id].push(c);
});

// Identify miscategorized cards to remove
const toRemove = new Set();
const removedCount = { bySetId: {} };

master.cards.forEach((card, idx) => {
  if (card.language !== 'en') return;
  if (card.category !== 'PROMO') return;
  if (['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(card.set_id)) return;
  
  // This is a miscategorized card
  const id = card.card_set_id;
  const siblings = byCardSetId[id] || [];
  const hasBooster = siblings.some(s => s.category === 'BOOSTER');
  const hasStarter = siblings.some(s => s.category === 'STARTER');
  
  if (hasBooster || hasStarter) {
    toRemove.add(idx);
    const sid = card.set_id;
    removedCount.bySetId[sid] = (removedCount.bySetId[sid] || 0) + 1;
  }
});

console.log('Cartas a eliminar:', toRemove.size);

// Remove them
const deduped = master.cards.filter((_, idx) => !toRemove.has(idx));
master.cards = deduped;

console.log('Total despues:', master.cards.length);
console.log('Eliminadas:', master.cards.length === deduped.length ? 0 : master.cards.length - deduped.length);

// Breakdown by set_id
console.log('\n--- Breakdown por set_id ---');
Object.entries(removedCount.bySetId).sort((a,b) => b[1] - a[1]).forEach(([sid, count]) => {
  console.log(`  ${sid}: ${count}`);
});

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

// Check promo counts
const promoEN = master.cards.filter(c => c.language === 'en' && (
  c.category === 'PROMO' || ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
)).length;
const promoJA = master.cards.filter(c => c.language === 'ja' && (
  c.category === 'PROMO' || ['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
)).length;

console.log('\n--- Promos por idioma ---');
console.log('EN:', promoEN, '(esperado: 511)');
console.log('JA:', promoJA, '(esperado: 624)');

// Save
fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
fs.copyFileSync(masterPath, 'data/games/onepiece/cards_master_backup.json');
console.log('\nGuardado.');
