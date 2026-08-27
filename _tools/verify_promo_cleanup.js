// verify_promo_cleanup.js
// Verifica el estado actual de promos EN después de la limpieza
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

console.log('=== VERIFICACIÓN POST-LIMPIEZA ===\n');

// EN Promos
const enPromos = master.cards.filter(c => 
  c.language === 'en' && 
  (c.set_id === 'PROMO' || c.set_id === 'P') &&
  c.category !== 'DON'
);

console.log(`Total EN Promos (sin DON): ${enPromos.length}`);

// Agrupar por card_id base (sin _p1, _p2, etc.)
function getBaseId(cardSetId) {
  return cardSetId.replace(/_p\d+$/, '');
}

const grouped = {};
enPromos.forEach(c => {
  const baseId = getBaseId(c.card_set_id);
  if (!grouped[baseId]) grouped[baseId] = [];
  grouped[baseId].push(c);
});

console.log(`Cards únicas (base): ${Object.keys(grouped).length}\n`);

// Cargar oficiales
const oficial = JSON.parse(fs.readFileSync('_tools/promos_oficiales.json', 'utf8'));
const enOficialIds = new Set(oficial.en.map(c => getBaseId(c.card_id)));

// Verificar coincidencia
const ourIds = new Set(Object.keys(grouped));

// Cards que no son promos oficiales
const noSonPromo = [];
ourIds.forEach(id => {
  if (!enOficialIds.has(id)) {
    noSonPromo.push(id);
  }
});

console.log(`Cards en DB que NO son promos oficiales: ${noSonPromo.length}`);
if (noSonPromo.length > 0) {
  console.log('IDs:', noSonPromo.join(', '));
}

// Cards oficiales que nos faltan
const nosFaltan = [];
enOficialIds.forEach(id => {
  if (!ourIds.has(id)) {
    nosFaltan.push(id);
  }
});

console.log(`\nCards oficiales que nos faltan: ${nosFaltan.length}`);
if (nosFaltan.length > 0) {
  console.log('IDs:', nosFaltan.join(', '));
}

// Verificar duplicados exactos (misma imagen, diferente card_set_id)
console.log('\n=== VERIFICANDO DUPLICADOS DE IMÁGENES ===\n');

const imageMap = new Map(); // image -> card_set_ids[]
enPromos.forEach(c => {
  const img = c.card_image;
  if (!imageMap.has(img)) imageMap.set(img, []);
  imageMap.get(img).push(c.card_set_id);
});

let dupCount = 0;
const dupExamples = [];
imageMap.forEach((ids, img) => {
  const uniqueIds = new Set(ids);
  if (uniqueIds.size > 1) {
    dupCount++;
    if (dupExamples.length < 10) {
      dupExamples.push({ image: img.split('/').pop(), card_ids: [...uniqueIds] });
    }
  }
});

console.log(`Imágenes con múltiples card_set_id: ${dupCount}`);
if (dupExamples.length > 0) {
  console.log('\nEjemplos:');
  dupExamples.forEach(ex => {
    console.log(`  ${ex.image}: ${ex.card_ids.join(', ')}`);
  });
}

// Verificar P-001 específicamente
console.log('\n=== ANÁLISIS DE P-001 ===');
const p001 = enPromos.filter(c => c.card_set_id && c.card_set_id.startsWith('P-001'));
console.log(`Entradas de P-001: ${p001.length}`);
p001.forEach(c => {
  console.log(`  ${c.card_set_id}: ${c.card_image.split('/').pop()}`);
});

// Verificar que P-073, P-074, P-075 ya no tienen entradas en set_id: P
console.log('\n=== VERIFICANDO P-073, P-074, P-075 ===');
['P-073', 'P-074', 'P-075'].forEach(id => {
  const entries = master.cards.filter(c => 
    c.language === 'en' && 
    c.card_set_id && c.card_set_id.startsWith(id) &&
    c.set_id === 'P'
  );
  console.log(`${id} en set_id=P: ${entries.length} entradas`);
});

// Resumen final
console.log('\n=== RESUMEN ===');
console.log(`Total EN Promos: ${enPromos.length}`);
console.log(`Cards únicas: ${Object.keys(grouped).length}`);
console.log(`Cards oficiales: ${enOficialIds.size}`);
console.log(`Cards que NO son promos oficiales: ${noSonPromo.length}`);
console.log(`Cards oficiales que nos faltan: ${nosFaltan.length}`);
