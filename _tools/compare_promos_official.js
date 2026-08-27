// compare_promos_official.js
// Compara las promos oficiales con nuestra base de datos
const fs = require('fs');

// Cargar datos
const oficial = JSON.parse(fs.readFileSync('_tools/promos_oficiales.json', 'utf8'));
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

console.log('=== COMPARATIVA PROMOS: OFICIAL vs NUESTRA DB ===\n');

// Función para normalizar card_id (quitar _p1, _p2, etc. y dejar solo el base)
function normalizeId(id) {
  return id.replace(/_p\d+$/, '');
}

// Función para obtener el card_id base del card_set_id de nuestra DB
function getBaseCardId(cardSetId) {
  return cardSetId.replace(/_p\d+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISIS EN
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ANÁLISIS EN');
console.log('═══════════════════════════════════════════════════════════════\n');

// Obtener IDs oficiales EN (normalizados)
const enOficialIds = new Set(oficial.en.map(c => normalizeId(c.card_id)));
console.log(`Oficiales EN: ${oficial.en.length} cartas (${enOficialIds.size} únicas normalizadas)`);

// Obtener cartas EN de nuestra DB (solo PROMO y P, excluyendo DON)
const enInDb = master.cards.filter(c => 
  c.language === 'en' && 
  (c.set_id === 'PROMO' || c.set_id === 'P') &&
  c.category !== 'DON'
);
console.log(`En nuestra DB: ${enInDb.length} entradas`);

// Agrupar por card_id normalizado
const enDbGrouped = {};
enInDb.forEach(c => {
  const baseId = getBaseCardId(c.card_set_id);
  if (!enDbGrouped[baseId]) enDbGrouped[baseId] = [];
  enDbGrouped[baseId].push(c);
});
const enDbBaseIds = new Set(Object.keys(enDbGrouped));
console.log(`En nuestra DB: ${enDbBaseIds.size} cards únicas normalizadas\n`);

// 1. Cards en nuestra DB que NO están en los oficiales
const enEnNuestraDBQueNoSonPromo = [];
enDbBaseIds.forEach(baseId => {
  if (!enOficialIds.has(baseId)) {
    enEnNuestraDBQueNoSonPromo.push({
      card_id: baseId,
      count: enDbGrouped[baseId].length,
      examples: enDbGrouped[baseId].slice(0, 3)
    });
  }
});

console.log(`❌ EN - Cards en nuestra DB que NO son promos oficiales: ${enEnNuestraDBQueNoSonPromo.length} cards`);
enEnNuestraDBQueNoSonPromo.forEach(item => {
  console.log(`   ${item.card_id} (${item.count} variantes)`);
});

// 2. Cards oficiales que NO están en nuestra DB
const enOficialQueNoTenemos = [];
enOficialIds.forEach(baseId => {
  if (!enDbBaseIds.has(baseId)) {
    enOficialQueNoTenemos.push({
      card_id: baseId,
      official_cards: oficial.en.filter(c => normalizeId(c.card_id) === baseId)
    });
  }
});

console.log(`\n❌ EN - Cards oficiales que NO tenemos en DB: ${enOficialQueNoTenemos.length} cards`);
enOficialQueNoTenemos.forEach(item => {
  console.log(`   ${item.card_id} (${item.official_cards.length} variantes oficiales)`);
  item.official_cards.forEach(c => console.log(`      ${c.full_id} - ${c.name} - ${c.image}`));
});

// 3. Cards que tenemos pero con diferente cantidad de variantes
console.log('\n⚠️  EN - Cards con diferente cantidad de variantes:');
const enDiferencias = [];
enDbBaseIds.forEach(baseId => {
  if (enOficialIds.has(baseId)) {
    const dbVariants = enDbGrouped[baseId].length;
    const oficialVariants = oficial.en.filter(c => normalizeId(c.card_id) === baseId).length;
    if (dbVariants !== oficialVariants) {
      enDiferencias.push({
        card_id: baseId,
        db: dbVariants,
        oficial: oficialVariants,
        diff: dbVariants - oficialVariants
      });
    }
  }
});

console.log(`   Total: ${enDiferencias.length} cards con diferencias`);
enDiferencias.slice(0, 20).forEach(item => {
  console.log(`   ${item.card_id}: DB=${item.db}, Oficial=${item.oficial}, Diff=${item.diff}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISIS JA
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  ANÁLISIS JA');
console.log('═══════════════════════════════════════════════════════════════\n');

// Obtener IDs oficiales JA
const jaOficialIds = new Set(oficial.ja.map(c => normalizeId(c.card_id)));
console.log(`Oficiales JA: ${oficial.ja.length} cartas (${jaOficialIds.size} únicas normalizadas)`);

// Obtener cartas JA de nuestra DB
const jaInDb = master.cards.filter(c => 
  c.language === 'ja' && 
  c.set_id === 'PROMO' &&
  c.category !== 'DON'
);
console.log(`En nuestra DB: ${jaInDb.length} entradas`);

const jaDbGrouped = {};
jaInDb.forEach(c => {
  const baseId = getBaseCardId(c.card_set_id);
  if (!jaDbGrouped[baseId]) jaDbGrouped[baseId] = [];
  jaDbGrouped[baseId].push(c);
});
const jaDbBaseIds = new Set(Object.keys(jaDbGrouped));
console.log(`En nuestra DB: ${jaDbBaseIds.size} cards únicas normalizadas\n`);

// 1. Cards en nuestra DB que NO están en los oficiales
const jaEnNuestraDBQueNoSonPromo = [];
jaDbBaseIds.forEach(baseId => {
  if (!jaOficialIds.has(baseId)) {
    jaEnNuestraDBQueNoSonPromo.push({
      card_id: baseId,
      count: jaDbGrouped[baseId].length
    });
  }
});

console.log(`❌ JA - Cards en nuestra DB que NO son promos oficiales: ${jaEnNuestraDBQueNoSonPromo.length} cards`);
jaEnNuestraDBQueNoSonPromo.forEach(item => {
  console.log(`   ${item.card_id} (${item.count} variantes)`);
});

// 2. Cards oficiales que NO están en nuestra DB
const jaOficialQueNoTenemos = [];
jaOficialIds.forEach(baseId => {
  if (!jaDbBaseIds.has(baseId)) {
    jaOficialQueNoTenemos.push({
      card_id: baseId,
      official_cards: oficial.ja.filter(c => normalizeId(c.card_id) === baseId)
    });
  }
});

console.log(`\n❌ JA - Cards oficiales que NO tenemos en DB: ${jaOficialQueNoTenemos.length} cards`);
jaOficialQueNoTenemos.slice(0, 30).forEach(item => {
  console.log(`   ${item.card_id} (${item.official_cards.length} variantes oficiales)`);
});

// 3. Cards con diferente cantidad de variantes
console.log('\n⚠️  JA - Cards con diferente cantidad de variantes:');
const jaDiferencias = [];
jaDbBaseIds.forEach(baseId => {
  if (jaOficialIds.has(baseId)) {
    const dbVariants = jaDbGrouped[baseId].length;
    const oficialVariants = oficial.ja.filter(c => normalizeId(c.card_id) === baseId).length;
    if (dbVariants !== oficialVariants) {
      jaDiferencias.push({
        card_id: baseId,
        db: dbVariants,
        oficial: oficialVariants,
        diff: dbVariants - oficialVariants
      });
    }
  }
});

console.log(`   Total: ${jaDiferencias.length} cards con diferencias`);
jaDiferencias.slice(0, 20).forEach(item => {
  console.log(`   ${item.card_id}: DB=${item.db}, Oficial=${item.oficial}, Diff=${item.diff}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  RESUMEN FINAL');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('EN:');
console.log(`   ✅ Cards oficiales que tenemos correctas: ${enDbBaseIds.size - enEnNuestraDBQueNoSonPromo.length}`);
console.log(`   ❌ Cards en DB que NO son promos: ${enEnNuestraDBQueNoSonPromo.length}`);
console.log(`   ❌ Cards oficiales que nos faltan: ${enOficialQueNoTenemos.length}`);
console.log(`   ⚠️  Cards con variantes diferentes: ${enDiferencias.length}`);

console.log('\nJA:');
console.log(`   ✅ Cards oficiales que tenemos correctas: ${jaDbBaseIds.size - jaEnNuestraDBQueNoSonPromo.length}`);
console.log(`   ❌ Cards en DB que NO son promos: ${jaEnNuestraDBQueNoSonPromo.length}`);
console.log(`   ❌ Cards oficiales que nos faltan: ${jaOficialQueNoTenemos.length}`);
console.log(`   ⚠️  Cards con variantes diferentes: ${jaDiferencias.length}`);

// Guardar resumen
const resumen = {
  en: {
    no_son_promo: enEnNuestraDBQueNoSonPromo.map(c => c.card_id),
    nos_faltan: enOficialQueNoTenemos.map(c => c.card_id),
    variantes_diferentes: enDiferencias
  },
  ja: {
    no_son_promo: jaEnNuestraDBQueNoSonPromo.map(c => c.card_id),
    nos_faltan: jaOficialQueNoTenemos.map(c => c.card_id),
    variantes_diferentes: jaDiferencias
  }
};

fs.writeFileSync('_tools/promos_resumen.json', JSON.stringify(resumen, null, 2));
console.log('\nResumen guardado en: _tools/promos_resumen.json');
