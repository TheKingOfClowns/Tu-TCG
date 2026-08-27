// analyze_promos_detailed.js
// Análisis detallado de promos EN y JA
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Función para obtener el set_id base (sin sufijos _p, _r)
function getBaseSetId(cardId) {
  return cardId.replace(/_p\d+|_r\d+|_p1/g, '');
}

console.log('=== ANÁLISIS DETALLADO DE PROMOS ===\n');

// ── ANÁLISIS EN PROMOS ──
console.log('--- EN PROMOS ---');
const enPromos = master.cards.filter(c => 
  c.language === 'en' && 
  (c.set_id === 'PROMO' || c.set_id === 'P' || c.set_id === 'OP-PR' || c.set_id === 'OPDD')
);

console.log('Total entradas:', enPromos.length);

// Agrupar por set_id
const enBySetId = {};
enPromos.forEach(c => {
  const sid = c.set_id;
  if (!enBySetId[sid]) enBySetId[sid] = [];
  enBySetId[sid].push(c);
});

Object.entries(enBySetId).forEach(([sid, cards]) => {
  const uniqueIds = new Set(cards.map(c => getBaseSetId(c.card_set_id)));
  console.log(`  ${sid}: ${cards.length} entradas, ${uniqueIds.size} cards únicos`);
  
  // Mostrar algunos ejemplos
  console.log('    Ejemplos:', cards.slice(0, 5).map(c => c.card_set_id).join(', '));
});

// Detectar problemas
console.log('\n--- Detectando problemas EN ---');

// 1. Cards con set_id=P pero con card_set_id que no empieza con P-
const pCards = enBySetId['P'] || [];
const pIssues = pCards.filter(c => !c.card_set_id.startsWith('P-'));
if (pIssues.length > 0) {
  console.log(`❌ Cards con set_id=P pero card_set_id no empieza con P-: ${pIssues.length}`);
  pIssues.forEach(c => console.log(`   ${c.card_set_id} (${c.card_image})`));
}

// 2. Cards con set_id=PROMO pero con card_set_id que sí existe en otros sets
const promoCards = enBySetId['PROMO'] || [];
const boosterStarterIds = new Set();
master.cards.filter(c => c.language === 'en' && c.category !== 'PROMO').forEach(c => {
  boosterStarterIds.add(getBaseSetId(c.card_set_id));
});

const promoDuplicates = promoCards.filter(c => boosterStarterIds.has(getBaseSetId(c.card_set_id)));
if (promoDuplicates.length > 0) {
  console.log(`❌ Cards PROMO que ya existen en otros sets: ${promoDuplicates.length}`);
  promoDuplicates.forEach(c => console.log(`   ${c.card_set_id} en ${c.set_id}`));
}

// 3. Listar todas las promos EN con formato
console.log('\n--- Lista completa EN PROMOS ---');
const enPromoList = enPromos.map(c => ({
  card_set_id: getBaseSetId(c.card_set_id),
  full_id: c.card_set_id,
  set_id: c.set_id,
  name: c.card_name || 'N/A',
  image: c.card_image.split('/').pop()
})).sort((a, b) => a.full_id.localeCompare(b.full_id));

// Agrupar por set_id para mostrar
const enGrouped = {};
enPromoList.forEach(c => {
  if (!enGrouped[c.set_id]) enGrouped[c.set_id] = [];
  enGrouped[c.set_id].push(c);
});

Object.entries(enGrouped).sort().forEach(([sid, cards]) => {
  console.log(`\n[${sid}] (${cards.length} cards)`);
  cards.forEach(c => console.log(`  ${c.full_id.padEnd(20)} ${c.name} | ${c.image}`));
});

// ── ANÁLISIS JA PROMOS ──
console.log('\n\n--- JA PROMOS ---');
const jaPromos = master.cards.filter(c => 
  c.language === 'ja' && 
  (c.set_id === 'PROMO' || c.set_id === 'P' || c.set_id === 'OP-PR' || c.set_id === 'OPDD')
);

console.log('Total entradas:', jaPromos.length);

const jaBySetId = {};
jaPromos.forEach(c => {
  const sid = c.set_id;
  if (!jaBySetId[sid]) jaBySetId[sid] = [];
  jaBySetId[sid].push(c);
});

Object.entries(jaBySetId).forEach(([sid, cards]) => {
  const uniqueIds = new Set(cards.map(c => getBaseSetId(c.card_set_id)));
  console.log(`  ${sid}: ${cards.length} entradas, ${uniqueIds.size} cards únicos`);
});

// Lista completa JA
const jaPromoList = jaPromos.map(c => ({
  card_set_id: getBaseSetId(c.card_set_id),
  full_id: c.card_set_id,
  set_id: c.set_id,
  name: c.card_name || 'N/A',
  image: c.card_image.split('/').pop()
})).sort((a, b) => a.full_id.localeCompare(b.full_id));

console.log('\n--- Lista completa JA PROMOS ---');
const jaGrouped = {};
jaPromoList.forEach(c => {
  if (!jaGrouped[c.set_id]) jaGrouped[c.set_id] = [];
  jaGrouped[c.set_id].push(c);
});

Object.entries(jaGrouped).sort().forEach(([sid, cards]) => {
  console.log(`\n[${sid}] (${cards.length} cards)`);
  cards.slice(0, 10).forEach(c => console.log(`  ${c.full_id.padEnd(20)} ${c.name} | ${c.image}`));
  if (cards.length > 10) console.log(`  ... y ${cards.length - 10} más`);
});

// Resumen final
console.log('\n\n=== RESUMEN ===');
console.log('EN total promos:', enPromos.length);
console.log('JA total promos:', jaPromos.length);
console.log('EN unique card_ids:', new Set(enPromos.map(c => getBaseSetId(c.card_set_id))).size);
console.log('JA unique card_ids:', new Set(jaPromos.map(c => getBaseSetId(c.card_set_id))).size);
