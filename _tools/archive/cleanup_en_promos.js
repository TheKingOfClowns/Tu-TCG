// cleanup_en_promos.js
// Limpieza de promos EN y eliminación de OP-14/OP-15 de EN
const fs = require('fs');

const masterPath = 'data/games/onepiece/cards_master.json';
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

console.log('=== LIMPIEZA DE EN PROMOS Y OP-14/OP-15 ===\n');
console.log('Total antes:', master.cards.length);

// ═══════════════════════════════════════════════════════════════════════════
// 1. ELIMINAR OP-14 Y OP-15 DE EN
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- 1. ELIMINANDO OP-14 Y OP-15 DE EN ---');
const beforeOp14 = master.cards.length;
master.cards = master.cards.filter(c => {
  // Mantener si NO es EN o si NO es OP-14/OP-15
  return !(c.language === 'en' && (c.set_id === 'OP-14' || c.set_id === 'OP-15'));
});
console.log(`Eliminadas: ${beforeOp14 - master.cards.length} cartas de OP-14/OP-15 EN`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. ELIMINAR ENTRADAS EXTRAS DE P-073, P-074, P-075 EN SET_ID: P
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- 2. ELIMINANDO ENTRAS EXTRAS DE P-073, P-074, P-075 ---');
const beforeP73 = master.cards.length;
master.cards = master.cards.filter(c => {
  // Eliminar si es EN, set_id: P, category: OTHER, y card_set_id empieza con P-073, P-074, P-075
  if (c.language === 'en' && c.set_id === 'P' && c.category === 'OTHER') {
    if (c.card_set_id && (c.card_set_id.startsWith('P-073') || c.card_set_id.startsWith('P-074') || c.card_set_id.startsWith('P-075'))) {
      return false; // Eliminar
    }
  }
  return true; // Mantener
});
console.log(`Eliminadas: ${beforeP73 - master.cards.length} entradas extras`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. ELIMINAR DUPLICADOS DE VARIANTES
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- 3. ELIMINANDO DUPLICADOS DE VARIANTES ---');

// Identificar duplicados: misma imagen, diferente card_set_id
const seen = new Map(); // key: card_image -> first card
const toRemove = new Set();

master.cards.forEach((card, idx) => {
  if (card.language !== 'en') return;
  if (card.set_id !== 'P' && card.set_id !== 'PROMO') return;
  if (card.category === 'DON') return;
  
  const img = card.card_image;
  const cardId = card.card_set_id;
  
  // Si ya vimos esta imagen con un card_set_id diferente
  if (seen.has(img)) {
    const prevCardId = seen.get(img);
    // Mantener la versión base (sin _p1, _p2, etc. en card_set_id)
    const prevBaseId = prevCardId.replace(/_p\d+$/, '');
    const curBaseId = cardId.replace(/_p\d+$/, '');
    
    if (prevBaseId === curBaseId) {
      // Mismo card_id base, eliminar el duplicado
      // Mantener el que tenga el card_set_id más "base" (sin sufijo)
      if (prevCardId === prevBaseId) {
        // El anterior es la versión base, eliminar esta
        toRemove.add(idx);
      } else if (cardId === curBaseId) {
        // Esta es la versión base, eliminar la anterior
        // (Esto no debería pasar porque vimos la anterior primero)
      } else {
        // Ambos tienen sufijos, mantener el primero
        toRemove.add(idx);
      }
    }
  } else {
    seen.set(img, cardId);
  }
});

const beforeDups = master.cards.length;
master.cards = master.cards.filter((_, idx) => !toRemove.has(idx));
console.log(`Eliminadas: ${beforeDups - master.cards.length} entradas duplicadas`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. ELIMINAR P-072 Y P-093 (NO SON PROMOS OFICIALES)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- 4. ELIMINANDO P-072 Y P-093 (NO SON PROMOS OFICIALES) ---');
const beforeP72 = master.cards.length;
master.cards = master.cards.filter(c => {
  if (c.language === 'en' && (c.set_id === 'P' || c.set_id === 'PROMO')) {
    if (c.card_set_id && (c.card_set_id.startsWith('P-072') || c.card_set_id.startsWith('P-093'))) {
      return false; // Eliminar
    }
  }
  return true; // Mantener
});
console.log(`Eliminadas: ${beforeP72 - master.cards.length} cartas (P-072, P-093)`);

// ═══════════════════════════════════════════════════════════════════════════
// 5. RECALCULAR STATS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n--- 5. RECALCULANDO STATS ---');

// Categorías
const cats = { BOOSTER: 0, STARTER: 0, PROMO: 0, OTHER: 0, DON: 0 };
master.cards.forEach(c => {
  const cat = c.category || 'OTHER';
  if (cats[cat] !== undefined) cats[cat]++;
  else cats['OTHER']++;
});

// Idiomas
const ja = master.cards.filter(c => c.language === 'ja').length;
const en = master.cards.filter(c => c.language === 'en').length;

master.generated_at = new Date().toISOString();
master.total_unique = master.cards.length;
master.categories = cats;
master.stats = { without_image: 0, japanese_cards: ja, without_ja_image: 0, english_cards: en };

console.log(`Total: ${master.cards.length}`);
console.log(`EN: ${en}, JA: ${ja}`);
console.log(`Categorías:`, cats);

// ═══════════════════════════════════════════════════════════════════════════
// 6. GUARDAR
// ═══════════════════════════════════════════════════════════════════════════

fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
fs.copyFileSync(masterPath, 'data/games/onepiece/cards_master_backup.json');

console.log('\n=== RESUMEN FINAL ===');
console.log(`Total después de limpieza: ${master.cards.length}`);
console.log(`Eliminadas en total: ${master.cards.length}`);
