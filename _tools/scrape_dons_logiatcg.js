// _tools/scrape_dons_logiatcg.js
// Scrapes missing DON cards from logiatcg.com individual card pages
// Usage: node _tools/scrape_dons_logiatcg.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const DON_CARDS = [
  { cardId: 'DON-DP10_EN', name: 'DON!! Card (DP10)' },
  { cardId: 'DON-DP10-2_EN', name: 'DON!! Card (DP10 2)' },
  { cardId: 'DON-OP17-Four-Emperors_EN', name: 'DON!! Card (OP17 Four Emperors)' },
  { cardId: 'DON-OP17-Four-Emperors-Gold_EN', name: 'DON!! Card (OP17 Four Emperors) (Gold)' },
  { cardId: 'DON-OP17-Luffy_EN', name: 'DON!! Card (OP17 Luffy)' },
  { cardId: 'DON-OP17-Luffy-Gold_EN', name: 'DON!! Card (OP17 Luffy) (Gold)' },
  { cardId: 'DON-OP17-Luffy-Loki_EN', name: 'DON!! Card (OP17 Luffy & Loki)' },
  { cardId: 'DON-OP17-Luffy-Loki-Gold_EN', name: 'DON!! Card (OP17 Luffy & Loki) (Gold)' },
  { cardId: 'DON-OP17-Rocks-Pirates-Diamond_EN', name: 'DON!! Card (OP17 Rocks Pirates) (Diamond)' },
  { cardId: 'DON-OP17-Rocks-Pirates_EN', name: 'DON!! Card (OP17 Rocks Pirates)' },
  { cardId: 'World_United_DON_Luffy', name: 'DON!! Card (World United Luffy)' },
  { cardId: 'World_United_DON_Zoro', name: 'DON!! Card (World United Zoro)' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if ([301, 302].includes(res.statusCode)) {
        fetch(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processCard(card, index) {
  console.log(`[${index + 1}/${DON_CARDS.length}] ${card.cardId}`);
  
  // 1. Image URL and output path
  const imgUrl = `https://assets.logiatcg.com/cards/english/${card.cardId}.png`;
  const imgFileName = card.cardId.replace(/-/g, '_') + '.webp';
  const outDir = path.join('assets/images/onepiece/en/DON!!');
  const outPath = path.join(outDir, imgFileName);
  
  // 2. Download and convert image
  if (!fs.existsSync(outPath)) {
    try {
      console.log(`  Descargando: ${imgUrl}`);
      const imgBuf = await fetch(imgUrl);
      await sharp(imgBuf).webp({ quality: 85 }).toFile(outPath);
      console.log(`  Imagen OK: ${imgFileName} (${(imgBuf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`  Error imagen: ${e.message}`);
      return null;
    }
  } else {
    console.log(`  Imagen existe: ${imgFileName}`);
  }
  
  // 3. Determine set_id and set_name
  let setId, setName;
  if (card.cardId.includes('OP17')) {
    setId = 'OP-17';
    setName = "The World's Strongest Warriors (OP-17)";
  } else if (card.cardId.includes('DP10')) {
    setId = 'OP12';
    setName = 'Legacy of the Master (OP12)';
  } else if (card.cardId.includes('World_United')) {
    setId = 'OP-PR';
    setName = 'One Piece Promotion Cards (OP-PR)';
  } else {
    setId = 'OP-PR';
    setName = 'One Piece Promotion Cards (OP-PR)';
  }
  
  // 4. Build card entry (matching existing DON card structure)
  const cardSetId = card.cardId.replace(/_EN$/, '');
  const entry = {
    card_set_id: cardSetId,
    card_name: card.name,
    set_id: setId,
    set_name: setName,
    rarity: 'DON!!',
    card_color: '',
    card_type: 'DON!!',
    producto: 'DON',
    category: 'DON',
    card_image: 'assets/images/onepiece/en/DON!!/' + imgFileName,
    effect: '',
    power: '-',
    counter: '-',
    attribute: '',
    block_icon: '',
    feature: '',
    cost: '',
    language: 'en',
    is_parallel: /Gold|Diamond|_p\d/.test(card.cardId)
  };
  
  console.log(`  OK - ${entry.card_name} [${setId}]`);
  return entry;
}

(async () => {
  console.log('=== Scraping DON cards from logiatcg.com ===\n');
  
  const outDir = path.join('assets/images/onepiece/en/DON!!');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const newCards = [];
  for (let i = 0; i < DON_CARDS.length; i++) {
    const entry = await processCard(DON_CARDS[i], i);
    if (entry) newCards.push(entry);
  }
  
  if (!newCards.length) {
    console.log('\nNo se procesaron cartas.');
    return;
  }
  
  console.log(`\n=== ${newCards.length} cartas procesadas ===`);
  
  // Add to master
  const masterPath = 'data/games/onepiece/cards_master.json';
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  
  // Check for duplicates
  const existingIds = new Set(master.cards.map(c => c.card_set_id));
  const toAdd = newCards.filter(c => !existingIds.has(c.card_set_id));
  
  if (!toAdd.length) {
    console.log('Todas las cartas ya existen en el master.');
    return;
  }
  
  master.cards.push(...toAdd);
  
  // Update stats
  const cats = { BOOSTER: 0, STARTER: 0, PROMO: 0, OTHER: 0, DON: 0 };
  master.cards.forEach(c => { const cat = c.category || ''; if (cats[cat] !== undefined) cats[cat]++; });
  const ja = master.cards.filter(c => c.language === 'ja').length;
  const en = master.cards.filter(c => c.language === 'en').length;
  
  master.generated_at = new Date().toISOString();
  master.total_unique = master.cards.length;
  master.categories = cats;
  master.stats = { without_image: 0, japanese_cards: ja, without_ja_image: 0, english_cards: en };
  
  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
  fs.copyFileSync(masterPath, 'data/games/onepiece/cards_master_backup.json');
  
  console.log(`\n${toAdd.length} cartas nuevas agregadas al master.`);
  console.log(`Total cartas: ${master.cards.length}`);
  console.log('DON cards:', cats.DON);
  console.log('Backup: cards_master_backup.json');
  
  // List added cards
  console.log('\nCartas agregadas:');
  toAdd.forEach(c => console.log(`  - ${c.card_name} [${c.set_id}] (${c.card_set_id})`));
})();
