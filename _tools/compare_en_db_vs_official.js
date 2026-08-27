// compare_en_db_vs_official.js
// Compara nuestra DB EN con los datos oficiales scrapeados
const fs = require('fs');
const path = require('path');

const officialPath = path.join(process.env.TEMP || 'C:\\temp', 'opcg_en_official', 'all_cards_en.json');
const masterPath = 'data/games/onepiece/cards_master.json';

const officialCards = JSON.parse(fs.readFileSync(officialPath, 'utf8'));
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

// Función para normalizar card_id (quitar sufijos _pN)
function normalizeId(id) {
  return id.replace(/_p\d+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISIS DE PROMOS
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  ANÁLISIS COMPLETO DE PROMOS EN');
console.log('═══════════════════════════════════════════════════════════════\n');

// Promos oficiales
const officialPromos = officialCards.filter(c => 
  c.source_type === 'PROMOTION' || c.source_type === 'OTHER_PRODUCT'
);
console.log(`Oficiales: ${officialPromos.length} entradas (${new Set(officialPromos.map(c => normalizeId(c.card_id))).size} únicas)`);

// Promos en nuestra DB
const dbPromos = master.cards.filter(c => 
  c.language === 'en' && 
  (c.set_id === 'PROMO' || c.set_id === 'P') &&
  c.category !== 'DON'
);
console.log(`En nuestra DB: ${dbPromos.length} entradas (${new Set(dbPromos.map(c => normalizeId(c.card_set_id))).size} únicas)\n`);

// IDs oficiales normalizados
const officialPromoIds = new Set(officialPromos.map(c => normalizeId(c.card_id)));

// IDs en DB normalizados
const dbPromoIds = new Set(dbPromos.map(c => normalizeId(c.card_set_id)));

// 1. Cards que tenemos pero NO son promos oficiales
console.log('─'.repeat(60));
console.log('❌ EN NUESTRA DB PERO NO SON PROMOS OFICIALES:');
console.log('─'.repeat(60));

const notOfficialPromo = [];
dbPromoIds.forEach(id => {
  if (!officialPromoIds.has(id)) {
    notOfficialPromo.push(id);
  }
});

console.log(`Total: ${notOfficialPromo.length} cards\n`);
if (notOfficialPromo.length > 0) {
  notOfficialPromo.sort().forEach(id => {
    // Encontrar en qué set oficial podría estar
    const inOfficial = officialCards.find(c => normalizeId(c.card_id) === id);
    const setInfo = inOfficial ? `(${inOfficial.series_name} - ${inOfficial.source_type})` : '(NO está en ningún set oficial)';
    console.log(`  ${id} ${setInfo}`);
  });
}

// 2. Cards oficiales que NO tenemos
console.log('\n' + '─'.repeat(60));
console.log('❌ PROMOS OFICIALES QUE NO TENEMOS:');
console.log('─'.repeat(60));

const missingPromos = [];
officialPromoIds.forEach(id => {
  if (!dbPromoIds.has(id)) {
    missingPromos.push(id);
  }
});

console.log(`Total: ${missingPromos.length} cards\n`);
if (missingPromos.length > 0) {
  missingPromos.sort().forEach(id => {
    const offCards = officialPromos.filter(c => normalizeId(c.card_id) === id);
    const names = [...new Set(offCards.map(c => c.name))].join(', ');
    const sources = [...new Set(offCards.map(c => c.source_series))].join(', ');
    console.log(`  ${id} - ${names} (${sources})`);
    offCards.forEach(c => {
      console.log(`    ${c.full_id} | ${c.source_series} | ${c.image}`);
    });
  });
}

// 3. Cards que tenemos con variantes diferentes
console.log('\n' + '─'.repeat(60));
console.log('⚠️  VARIANTES DIFERENTES (mismo card_id, diferente cantidad):');
console.log('─'.repeat(60));

const variantDiffs = [];
dbPromoIds.forEach(id => {
  if (officialPromoIds.has(id)) {
    const dbVariants = dbPromos.filter(c => normalizeId(c.card_set_id) === id);
    const officialVariants = officialPromos.filter(c => normalizeId(c.card_id) === id);
    
    if (dbVariants.length !== officialVariants.length) {
      variantDiffs.push({
        id,
        dbCount: dbVariants.length,
        officialCount: officialVariants.length,
        diff: dbVariants.length - officialVariants.length
      });
    }
  }
});

console.log(`Total: ${variantDiffs.length} cards con diferencias\n`);

// Separar: tenemos más vs tenemos menos
const haveMore = variantDiffs.filter(v => v.diff > 0).sort((a, b) => b.diff - a.diff);
const haveLess = variantDiffs.filter(v => v.diff < 0).sort((a, b) => a.diff - b.diff);

if (haveMore.length > 0) {
  console.log('  Tenemos MÁS variantes de lo oficial:');
  haveMore.forEach(v => {
    console.log(`    ${v.id}: DB=${v.dbCount}, Oficial=${v.officialCount}, +${v.diff}`);
  });
}

if (haveLess.length > 0) {
  console.log('\n  Tenemos MENOS variantes de lo oficial:');
  haveLess.forEach(v => {
    console.log(`    ${v.id}: DB=${v.dbCount}, Oficial=${v.officialCount}, ${v.diff}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANÁLISIS DE BOOSTERS/STARTERS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  ANÁLISIS DE BOOSTERS/STARTERS EN');
console.log('═══════════════════════════════════════════════════════════════\n');

// Agrupar oficiales por series_name
const seriesNames = [...new Set(officialCards.filter(c => 
  c.source_type !== 'PROMOTION' && c.source_type !== 'OTHER_PRODUCT'
).map(c => c.series_name))];

console.log('SET         | OFICIAL | EN DB | DIF | STATUS');
console.log('------------|---------|-------|-----|-------');

const boosterIssues = [];

seriesNames.sort().forEach(seriesName => {
  const officialSet = officialCards.filter(c => c.series_name === seriesName);
  const officialUnique = new Set(officialSet.map(c => normalizeId(c.card_id)));
  
  // Buscar en nuestra DB (excluyendo promos y DON)
  const dbCards = master.cards.filter(c => 
    c.language === 'en' && 
    c.set_id === seriesName &&
    c.category !== 'DON' &&
    c.set_id !== 'PROMO' && c.set_id !== 'P'
  );
  const dbUnique = new Set(dbCards.map(c => normalizeId(c.card_set_id)));
  
  const diff = dbUnique.size - officialUnique.size;
  const status = diff === 0 ? '✅' : diff > 0 ? '🟡' : '❌';
  
  console.log(
    (seriesName + '          ').slice(0, 11) + ' | ' +
    (officialUnique.size + '        ').slice(0, 7) + ' | ' +
    (dbUnique.size + '      ').slice(0, 5) + ' | ' +
    (diff >= 0 ? '+' : '') + diff + '  | ' + status
  );
  
  if (diff !== 0) {
    boosterIssues.push({ seriesName, official: officialUnique.size, db: dbUnique.size, diff });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN EJECUTIVO
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  RESUMEN EJECUTIVO EN');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('PROMOS:');
console.log(`  Oficial: ${officialPromoIds.size} cards únicas`);
console.log(`  DB: ${dbPromoIds.size} cards únicas`);
console.log(`  No son promos oficiales: ${notOfficialPromo.length}`);
console.log(`  Nos faltan: ${missingPromos.length}`);
console.log(`  Con variantes diferentes: ${variantDiffs.length}`);
console.log(`    - Tenemos más: ${haveMore.length}`);
console.log(`    - Tenemos menos: ${haveLess.length}`);

console.log('\nBOOSTERS/STARTERS:');
console.log(`  Sets con diferencias: ${boosterIssues.length}`);
if (boosterIssues.length > 0) {
  boosterIssues.forEach(b => {
    console.log(`    ${b.seriesName}: oficial=${b.official}, db=${b.db}, diff=${b.diff}`);
  });
}
