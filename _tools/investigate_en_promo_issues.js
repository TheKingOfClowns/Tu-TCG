// investigate_en_promo_issues.js
// Investiga las 5 cards que no son promos y las variantes extras
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

console.log('=== INVESTIGANDO EN PROMOS ISSUES ===\n');

// Las 5 cards que no son promos oficiales
const noSonPromo = ['P-072', 'P-073', 'P-074', 'P-075', 'P-093'];

console.log('=== 1. CARDS QUE NO SON PROMOS OFICIALES ===\n');
noSonPromo.forEach(cardId => {
  const inDb = master.cards.filter(c => 
    c.language === 'en' && 
    c.card_set_id.startsWith(cardId)
  );
  
  if (inDb.length === 0) {
    console.log(`${cardId}: NO encontrada en DB`);
    return;
  }
  
  console.log(`${cardId}: ${inDb.length} entradas en DB`);
  inDb.forEach(c => {
    console.log(`   set_id: ${c.set_id}, category: ${c.category}`);
    console.log(`   card_set_id: ${c.card_set_id}`);
    console.log(`   name: ${c.card_name || 'N/A'}`);
    console.log(`   image: ${c.card_image.split('/').pop()}`);
    console.log('');
  });
});

// Verificar si existen en boosters/starter
console.log('\n=== 2. ¿EXISTEN EN BOOSTERS/STARTER? ===\n');
noSonPromo.forEach(cardId => {
  const inBoosters = master.cards.filter(c => 
    c.language === 'en' && 
    c.card_set_id.startsWith(cardId) &&
    c.category === 'BOOSTER'
  );
  
  const inStarters = master.cards.filter(c => 
    c.language === 'en' && 
    c.card_set_id.startsWith(cardId) &&
    c.category === 'STARTER'
  );
  
  if (inBoosters.length > 0) {
    console.log(`${cardId}: ✅ Existe en BOOSTER (${inBoosters.length} variantes)`);
  } else if (inStarters.length > 0) {
    console.log(`${cardId}: ✅ Existe en STARTER (${inStarters.length} variantes)`);
  } else {
    console.log(`${cardId}: ❌ NO existe en boosters/starter`);
  }
});

// Analizar las variantes extras
console.log('\n\n=== 3. ANALIZANDO VARIANTES EXTRAS ===\n');

// Cargar el resumen
const resumen = JSON.parse(fs.readFileSync('_tools/promos_resumen.json', 'utf8'));

// Tomar algunas cards con diferencias
const conDiferencias = resumen.en.variantes_diferentes.slice(0, 10);

conDiferencias.forEach(item => {
  const cardId = item.card_id;
  const dbVariants = master.cards.filter(c => 
    c.language === 'en' && 
    (c.set_id === 'PROMO' || c.set_id === 'P') &&
    c.card_set_id.startsWith(cardId) &&
    !c.card_set_id.endsWith('_p1') || c.card_set_id === cardId + '_p1'
  );
  
  const allVariants = master.cards.filter(c => 
    c.language === 'en' && 
    (c.set_id === 'PROMO' || c.set_id === 'P') &&
    c.card_set_id.startsWith(cardId)
  );
  
  console.log(`\n${cardId}: DB=${item.db}, Oficial=${item.oficial}, Diff=${item.diff}`);
  console.log(`   Total variantes en DB: ${allVariants.length}`);
  allVariants.forEach(c => {
    const img = c.card_image.split('/').pop();
    console.log(`   - ${c.card_set_id}: ${img}`);
  });
});

console.log('\n\n=== 4. RESUMEN DE ACCIONES NECESARIAS ===\n');
console.log('Para EN promos:');
console.log('1. Eliminar 5 cards que no son promos oficiales:');
noSonPromo.forEach(id => console.log(`   - ${id}`));

console.log('\n2. Para las 43 cards con variantes diferentes:');
console.log('   OPCIÓN A: Mantener todas (son paralelas reales de eventos/productos)');
console.log('   OPCIÓN B: Eliminar las que no están en la página oficial');
console.log('');
console.log('   Las variantes _p2, _p3, _p4, _p5, _p6, _p7 suelen ser de:');
console.log('   - Premium Boosters (PRB-01, PRB-02)');
console.log('   - Extra Boosters (EB-01, EB-02)');
console.log('   - Ediciones especiales de anime/manga');
console.log('   - Promociones de eventos específicos');
console.log('');
console.log('   RECOMENDACIÓN: Mantener todas las variantes porque son cartas reales');
console.log('   que existen físicamente, aunque no aparezcan en la página de promos.');
