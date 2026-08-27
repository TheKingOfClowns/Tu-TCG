// Better analysis of the 215 miscategorized EN cards
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));

// Get miscategorized EN cards
const miscategorized = master.cards.filter(c => 
  c.language === 'en' && 
  c.category === 'PROMO' && 
  !['PROMO', 'P', 'OP-PR', 'LP', 'FDS', 'OPDD'].includes(c.set_id)
);

console.log('Total miscategorizadas:', miscategorized.length);
console.log('\n--- Muestras de campos ---');
miscategorized.slice(0, 5).forEach(c => {
  console.log({
    card_id: c.card_id,
    card_set_id: c.card_set_id,
    set_id: c.set_id,
    category: c.category,
    name: c.name,
    image: c.card_image?.split('/').pop()
  });
});

// What identifier should we use?
console.log('\n--- Analisis de campos ---');
const hasCardId = miscategorized.filter(c => c.card_id).length;
const hasCardSetId = miscategorized.filter(c => c.card_set_id).length;
console.log('Con card_id:', hasCardId, '/', miscategorized.length);
console.log('Con card_set_id:', hasCardSetId, '/', miscategorized.length);

// Try using card_set_id as the unique identifier
const cardSetId = (c) => c.card_set_id || c.card_id;

// Build index of all EN cards by card_set_id
const enCards = master.cards.filter(c => c.language === 'en');
const byCardSetId = {};
enCards.forEach(c => {
  const id = cardSetId(c);
  if (!byCardSetId[id]) byCardSetId[id] = [];
  byCardSetId[id].push(c);
});

// For each miscategorized card, check if other versions exist
const results = {
  hasCorrectCategory: [],  // card_set_id also exists as BOOSTER/STARTER
  onlyAsPromo: [],          // card_set_id only exists as PROMO
  onlyAsPromoButCorrect: [] // miscategorized but should be re-categorized
};

miscategorized.forEach(card => {
  const id = cardSetId(card);
  const siblings = byCardSetId[id] || [];
  const hasBooster = siblings.some(s => s.category === 'BOOSTER');
  const hasStarter = siblings.some(s => s.category === 'STARTER');
  const promoSiblings = siblings.filter(s => s.category === 'PROMO');
  
  // Check the actual set this card belongs to
  const expectedCategory = card.set_id.startsWith('OP-') ? 'BOOSTER' : 
                           card.set_id.startsWith('ST-') ? 'STARTER' : 
                           card.set_id.startsWith('EB-') ? 'BOOSTER' : 'OTHER';
  
  if (hasBooster || hasStarter) {
    results.hasCorrectCategory.push({
      id,
      name: card.name,
      set_id: card.set_id,
      siblingCategories: [...new Set(siblings.map(s => s.category))]
    });
  } else {
    results.onlyAsPromo.push({
      id,
      name: card.name,
      set_id: card.set_id,
      expectedCategory,
      allSiblings: siblings.map(s => s.category + ':' + s.set_id)
    });
  }
});

console.log('\n=== RESULTADOS ===\n');
console.log('1. card_set_id ya tiene entradas BOOSTER/STARTER:', results.hasCorrectCategory.length);
results.hasCorrectCategory.slice(0, 15).forEach(item => {
  console.log(`   ${item.id} (${item.set_id}) "${item.name}" → categorias: ${item.siblingCategories.join(', ')}`);
});

console.log(`\n2. card_set_id NO tiene BOOSTER/STARTER (solo PROMO):`, results.onlyAsPromo.length);
results.onlyAsPromo.slice(0, 15).forEach(item => {
  console.log(`   ${item.id} (${item.set_id}) "${item.name}" → esperado: ${item.expectedCategory}`);
});
