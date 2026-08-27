// Verify if miscategorized PROMO cards already exist under correct category
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Get all miscategorized EN cards (category=PROMO but booster/starter set_id)
const miscategorized = master.cards.filter(c => 
  c.language === 'en' && 
  c.category === 'PROMO' && 
  !['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
);

console.log('Total miscategorizadas:', miscategorized.length);
console.log('\n--- Analisis: ¿Estas cartas ya existen bajo categoria correcta? ---\n');

// Build index of all EN cards by card_id and their categories
const cardIndex = {};
master.cards.filter(c => c.language === 'en').forEach(c => {
  const id = c.card_id; // e.g., "EB01-003"
  if (!cardIndex[id]) cardIndex[id] = [];
  cardIndex[id].push({ category: c.category, set_id: c.set_id, card_image: c.card_image });
});

// Analyze each miscategorized card
const results = {
  hasCorrectCategory: [], // card exists under BOOSTER/STARTER already
  onlyAsPromo: [],         // card only exists as PROMO (no correct category)
  multiplePromo: []        // card exists multiple times as PROMO (variant issue)
};

const checkedIds = new Set();

miscategorized.forEach(card => {
  const id = card.card_id;
  if (checkedIds.has(id)) return;
  checkedIds.add(id);
  
  const entries = cardIndex[id] || [];
  const hasBoosterStarter = entries.some(e => 
    e.category === 'BOOSTER' || e.category === 'STARTER'
  );
  const promoEntries = entries.filter(e => e.category === 'PROMO');
  
  if (hasBoosterStarter) {
    results.hasCorrectCategory.push({
      card_id: id,
      set_id: card.set_id,
      categories: entries.map(e => `${e.category}/${e.set_id}`)
    });
  } else if (promoEntries.length > 1) {
    results.multiplePromo.push({
      card_id: id,
      set_id: card.set_id,
      promoCount: promoEntries.length
    });
  } else {
    results.onlyAsPromo.push({
      card_id: id,
      set_id: card.set_id
    });
  }
});

console.log('=== RESULTADOS ===\n');

console.log('1. YA EXISTEN bajo categoria correcta (BOOSTER/STARTER):', results.hasCorrectCategory.length);
if (results.hasCorrectCategory.length > 0) {
  console.log('   Primeras 20:');
  results.hasCorrectCategory.slice(0, 20).forEach(item => {
    console.log(`   - ${item.card_id} (set_id=${item.set_id}) → ${item.categories.join(', ')}`);
  });
  if (results.hasCorrectCategory.length > 20) {
    console.log(`   ... y ${results.hasCorrectCategory.length - 20} mas`);
  }
}

console.log('\n2. SOLO EXISTEN como PROMO (sin categoria correcta):', results.onlyAsPromo.length);
if (results.onlyAsPromo.length > 0) {
  console.log('   Primeras 20:');
  results.onlyAsPromo.slice(0, 20).forEach(item => {
    console.log(`   - ${item.card_id} (set_id=${item.set_id})`);
  });
  if (results.onlyAsPromo.length > 20) {
    console.log(`   ... y ${results.onlyAsPromo.length - 20} mas`);
  }
}

console.log('\n3. MULTIPLES PROMO (mismo card_id, variants):', results.multiplePromo.length);
if (results.multiplePromo.length > 0) {
  console.log('   Primeras 20:');
  results.multiplePromo.slice(0, 20).forEach(item => {
    console.log(`   - ${item.card_id}: ${item.promoCount} entradas PROMO`);
  });
  if (results.multiplePromo.length > 20) {
    console.log(`   ... y ${results.multiplePromo.length - 20} mas`);
  }
}

// Summary by set_id for the "only as promo" group
if (results.onlyAsPromo.length > 0) {
  console.log('\n--- Breakdown de "solo PROMO" por set_id ---');
  const bySet = {};
  results.onlyAsPromo.forEach(item => {
    if (!bySet[item.set_id]) bySet[item.set_id] = 0;
    bySet[item.set_id]++;
  });
  Object.entries(bySet).sort((a,b) => b[1] - a[1]).forEach(([sid, count]) => {
    console.log(`  ${sid}: ${count}`);
  });
}

console.log('\n=== RECOMENDACION ===');
console.log(`Si ${results.hasCorrectCategory.length} cartas ya existen bajo categoria correcta:`);
console.log('→ Son DUPLICADOS con categoria incorrecta → se pueden ELIMINAR');
console.log(`Si ${results.onlyAsPromo.length} cartas solo existen como PROMO:`);
console.log('→ Son promos legítimas que pertenecen a ese set_id → se debe RECATEGORIZAR (no eliminar)');
