// fix_promo_categories.js
// Fixes miscategorized PROMO/OTHER cards that should be BOOSTER/STARTER

const fs = require('fs');
const master = JSON.parse(fs.readFileSync('./data/games/onepiece/cards_master.json', 'utf8'));
const oficial = JSON.parse(fs.readFileSync('./_tools/promos_oficiales.json', 'utf8')).en || [];
const oficialIds = new Set(oficial.map(o => o.full_id));

// Define known set types
const boosterSets = new Set([
  'OP01','OP02','OP03','OP04','OP05','OP06','OP07','OP08','OP09','OP10',
  'OP11','OP12','OP13','OP14','OP15','OP16','OP17',
  'EB01','EB02','EB03','EB04',
  'OP-01','OP-02','OP-03','OP-04','OP-05','OP-06','OP-07','OP-08','OP-09','OP-10',
  'OP-11','OP-12','OP-13','OP-14','OP-15','OP-16','OP-17',
  'EB-01','EB-02','EB-03','EB-04',
]);

const starterSets = new Set([
  'ST01','ST02','ST03','ST04','ST05','ST06','ST07','ST08','ST09','ST10',
  'ST11','ST12','ST13','ST14','ST15','ST16','ST17','ST18','ST19','ST20',
  'ST21','ST22','ST23','ST24','ST25','ST26','ST27','ST28','ST29','ST30',
  'ST31','ST32','ST33','ST34','ST35','ST36',
  'ST-01','ST-02','ST-03','ST-04','ST-05','ST-06','ST-07','ST-08','ST-09','ST-10',
  'ST-11','ST-12','ST-13','ST-14','ST-15','ST-16','ST-17','ST-18','ST-19','ST-20',
  'ST-21','ST-22','ST-23','ST-24','ST-25','ST-26','ST-27','ST-28','ST-29','ST-30',
  'ST-31','ST-32','ST-33','ST-34','ST-35','ST-36',
]);

const promoSets = new Set([
  'PROMO','P','OP-PR','LP','FDS','OPDD',
  'PRB01','PRB02','PRB-01','PRB-02',
]);

function getSetBase(setId) {
  if (!setId) return null;
  return setId.replace(/-0*$/, '').replace(/-/g, '');
}

let stats = { booster: 0, starter: 0, promo: 0, unchanged: 0 };
let changes = [];

master.cards.forEach(card => {
  if (card.language !== 'en') return;
  if (card.category !== 'PROMO' && card.category !== 'OTHER') return;

  const setBase = getSetBase(card.set_id);

  // Cards with _p1 suffix that are NOT in official promo list -> should be BOOSTER
  // These are alternative art variants of regular booster cards, not promos
  if (card.card_set_id.includes('_p1') && !oficialIds.has(card.card_set_id)) {
    const oldCat = card.category;
    card.category = 'BOOSTER';
    stats.booster++;
    changes.push(`${card.card_set_id}: ${oldCat} -> BOOSTER (_p1 not in official)`);
    return;
  }

  // Check if it's a booster card miscategorized
  if (boosterSets.has(setBase) || boosterSets.has(card.set_id)) {
    const oldCat = card.category;
    card.category = 'BOOSTER';
    stats.booster++;
    changes.push(`${card.card_set_id}: ${oldCat} -> BOOSTER (set: ${card.set_id})`);
    return;
  }

  // Check if it's a starter card miscategorized
  if (starterSets.has(setBase) || starterSets.has(card.set_id)) {
    const oldCat = card.category;
    card.category = 'STARTER';
    stats.starter++;
    changes.push(`${card.card_set_id}: ${oldCat} -> STARTER (set: ${card.set_id})`);
    return;
  }

  // Check if it's actually a promo (has promo set_id)
  if (promoSets.has(setBase) || promoSets.has(card.set_id) || card.set_id === 'PROMO') {
    const oldCat = card.category;
    if (card.category !== 'PROMO') {
      card.category = 'PROMO';
      stats.promo++;
      changes.push(`${card.card_set_id}: ${oldCat} -> PROMO (set: ${card.set_id})`);
    } else {
      stats.unchanged++;
    }
    return;
  }

  // For OTHER category with non-standard sets, leave as OTHER but log
  if (card.category === 'OTHER') {
    stats.unchanged++;
    if (changes.length < 50) {
      changes.push(`${card.card_set_id}: OTHER (set: ${card.set_id}) - unchanged`);
    }
  }
});

console.log('=== FIX PROMO CATEGORIES ===\n');
console.log('Stats:');
console.log('  Fixed as BOOSTER:', stats.booster);
console.log('  Fixed as STARTER:', stats.starter);
console.log('  Fixed as PROMO:', stats.promo);
console.log('  Unchanged (legit promos):', stats.unchanged);
console.log('\nTotal fixed:', stats.booster + stats.starter + stats.promo);

console.log('\n--- All changes ---');
changes.forEach(c => console.log(' ', c));

// Save backup
fs.writeFileSync('./data/games/onepiece/cards_master_backup2.json', JSON.stringify(master, null, 2));
console.log('\nBackup saved: cards_master_backup2.json');

// Save fixed version
fs.writeFileSync('./data/games/onepiece/cards_master.json', JSON.stringify(master, null, 2));
console.log('Fixed cards_master.json saved!');
