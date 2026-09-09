// remove_duplicate_variants.js
// Elimina entradas donde la MISMA imagen tiene diferente card_set_id
const fs = require('fs');

const masterPath = 'data/games/onepiece/cards_master.json';
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('=== ELIMINANDO VARIANTES DUPLICADAS ===\n');
console.log('Total antes:', master.cards.length);

// Solo EN promos (P y PROMO, sin DON)
const enPromos = master.cards.filter(c => 
  c.language === 'en' && 
  (c.set_id === 'P' || c.set_id === 'PROMO') &&
  c.category !== 'DON'
);

console.log(`\nAnalizando ${enPromos.length} entradas EN Promos...\n`);

// Función para obtener card_set_id base (sin _p1, _p2, etc.)
function getBaseId(cardSetId) {
  return cardSetId.replace(/_p\d+$/, '');
}

// Agrupar por imagen completa (path)
const byImage = new Map();
enPromos.forEach((card, idx) => {
  const img = card.card_image;
  if (!byImage.has(img)) byImage.set(img, []);
  byImage.get(img).push({ card, idx });
});

// Encontrar duplicados (misma imagen, diferentes card_set_id)
const duplicates = [];
byImage.forEach((entries, img) => {
  if (entries.length > 1) {
    // Verificar si tienen diferentes card_set_id
    const uniqueIds = new Set(entries.map(e => e.card.card_set_id));
    if (uniqueIds.size > 1) {
      duplicates.push({ image: img, entries });
    }
  }
});

console.log(`Encontradas ${duplicates.length} imágenes con múltiples card_set_id:\n`);

// Para cada imagen duplicada, decidir cuál mantener
// Mantener la que tenga card_set_id más "base" (sin sufijo _pN)
const toRemove = new Set();

duplicates.forEach(dup => {
  console.log(`${dup.image.split('/').pop()}:`);
  
  // Ordenar: primero los que NO tienen sufijo en card_set_id
  const sorted = [...dup.entries].sort((a, b) => {
    const aHasSuffix = /_p\d+$/.test(a.card.card_set_id);
    const bHasSuffix = /_p\d+$/.test(b.card.card_set_id);
    
    if (!aHasSuffix && bHasSuffix) return -1; // a va primero
    if (aHasSuffix && !bHasSuffix) return 1;  // b va primero
    return 0; // ambos iguales
  });
  
  // Mantener el primero (sin sufijo o el que tenga el sufijo más bajo)
  const keep = sorted[0];
  console.log(`  Mantener: ${keep.card.card_set_id}`);
  
  // Eliminar el resto
  sorted.slice(1).forEach(entry => {
    console.log(`  Eliminar: ${entry.card.card_set_id}`);
    toRemove.add(entry.idx);
  });
});

console.log(`\nTotal a eliminar: ${toRemove.size} entradas`);

// Eliminar del master (no solo de enPromos)
const beforeRemove = master.cards.length;
master.cards = master.cards.filter((_, idx) => !toRemove.has(idx));
console.log(`Eliminadas: ${beforeRemove - master.cards.length}`);
console.log(`Total después: ${master.cards.length}`);

// Recalcular stats
const cats = { BOOSTER: 0, STARTER: 0, PROMO: 0, OTHER: 0, DON: 0 };
master.cards.forEach(c => {
  const cat = c.category || 'OTHER';
  if (cats[cat] !== undefined) cats[cat]++;
  else cats['OTHER']++;
});

const ja = master.cards.filter(c => c.language === 'ja').length;
const en = master.cards.filter(c => c.language === 'en').length;

master.generated_at = new Date().toISOString();
master.total_unique = master.cards.length;
master.categories = cats;
master.stats = { without_image: 0, japanese_cards: ja, without_ja_image: 0, english_cards: en };

console.log('\n=== STATS ACTUALIZADAS ===');
console.log(`Total: ${master.cards.length}`);
console.log(`EN: ${en}, JA: ${ja}`);
console.log(`Categorías:`, cats);

// Guardar
fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
console.log('\nGuardado.');

// Verificar P-001 después
console.log('\n=== VERIFICACIÓN P-001 ===');
const p001After = master.cards.filter(c => 
  c.language === 'en' && 
  c.card_set_id && c.card_set_id.startsWith('P-001') &&
  (c.set_id === 'P' || c.set_id === 'PROMO')
);
console.log(`Entradas de P-001 después: ${p001After.length}`);
p001After.forEach(c => {
  console.log(`  ${c.card_set_id}: ${c.card_image.split('/').pop()}`);
});
