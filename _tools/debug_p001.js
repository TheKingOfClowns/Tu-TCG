// debug_p001.js
// Debug: Ver exactamente qué hay con P-001
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

console.log('=== DEBUG P-001 ===\n');

// Encontrar todas las entradas que empiezan con P-001
const p001Entries = master.cards.filter(c => 
  c.language === 'en' && 
  c.card_set_id && 
  c.card_set_id.startsWith('P-001')
);

console.log(`Total entradas con card_set_id que empieza con P-001: ${p001Entries.length}\n`);

p001Entries.forEach((c, i) => {
  console.log(`[${i}] card_set_id: "${c.card_set_id}"`);
  console.log(`    set_id: "${c.set_id}"`);
  console.log(`    category: "${c.category}"`);
  console.log(`    card_image: "${c.card_image}"`);
  console.log('');
});

// Verificar si hay imágenes duplicadas
console.log('\n=== BUSCANDO IMÁGENES DUPLICADAS ===\n');

const imageMap = new Map();
p001Entries.forEach(c => {
  const img = c.card_image;
  if (!imageMap.has(img)) imageMap.set(img, []);
  imageMap.get(img).push(c.card_set_id);
});

let dupCount = 0;
imageMap.forEach((ids, img) => {
  if (ids.length > 1) {
    dupCount++;
    console.log(`Imagen: ${img}`);
    console.log(`  Aparece en: ${ids.join(', ')}`);
  }
});

console.log(`\nImágenes duplicadas: ${dupCount}`);

// Verificar getBaseId
console.log('\n=== VERIFICAR getBaseId ===\n');
function getBaseId(cardSetId) {
  return cardSetId.replace(/_p\d+$/, '');
}

console.log(`getBaseId("P-001"): "${getBaseId('P-001')}"`);
console.log(`getBaseId("P-001_p1"): "${getBaseId('P-001_p1')}"`);
console.log(`¿Son iguales? ${getBaseId('P-001') === getBaseId('P-001_p1')}`);
