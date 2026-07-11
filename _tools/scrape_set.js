// _tools/scrape_set.js
// Uso: node _tools/scrape_set.js <set_id> <series_number> <category> [producto]
// Ejemplo: node _tools/scrape_set.js OP-02 556102 BOOSTER
//          node _tools/scrape_set.js ST-01 556001 STARTER

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const sharp = require('sharp');

const [,, setId, seriesNum, category, producto] = process.argv;
if (!setId || !seriesNum || !category) {
  console.error('Uso: node _tools/scrape_set.js <set_id> <series_number> <category> [producto]');
  process.exit(1);
}

const cat = producto || category;
const setSlug = setId.replace('-', '');
const dirSafe = setId.replace('-', '-');
const htmlPath = path.join(process.env.TEMP || '/tmp', 'opcg_scrape_' + setId + '.html');

// ── 1. Download HTML ──
console.log('[' + setId + '] Descargando HTML...');
execSync('curl.exe -s -X POST "https://asia-en.onepiece-cardgame.com/cardlist/" -d "series=' + seriesNum + '" -o "' + htmlPath + '"', { stdio: 'pipe' });
if (!fs.existsSync(htmlPath)) { console.error('Error: no se pudo descargar HTML'); process.exit(1); }
const raw = fs.readFileSync(htmlPath, 'utf8');
const resultsCount = (raw.match(/(\d+) results/) || [])[1];
console.log('[' + setId + '] HTML descargado: ' + (raw.length / 1024).toFixed(0) + ' KB, ' + (resultsCount || '?') + ' resultados');

// ── 2. Parse ──
const dlRegex = /<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g;
const cards = [];
let dlMatch;

while ((dlMatch = dlRegex.exec(raw)) !== null) {
  const fullId = dlMatch[1];
  const block = dlMatch[2];
  const isParallel = /_p\d+$/.test(fullId);
  const cardId = fullId.replace(/_[pr]\d+$/, '');

  const nameMatch = block.match(/<div class="cardName">([^<]+)<\/div>/);
  let name = nameMatch ? nameMatch[1].trim() : '';
  name = name.replace(/\s*\(Parallel\)\s*$/, '').trim();

  const infoMatch = block.match(/<span>([A-Za-z0-9]+)<\/span>\s*\|\s*<span>(\w+)<\/span>/);
  const rarity = infoMatch ? infoMatch[1] : '';
  const cardType = infoMatch ? infoMatch[2].toUpperCase() : '';

  const imgMatch = block.match(/data-src="[^"]*?card\/([^"?]+\.png)/);
  const imgFile = imgMatch ? imgMatch[1].replace('.png', '.webp') : '';

  const costMatch = block.match(/<div class="cost"><h3>(?:Cost|Life)<\/h3>\s*(\d+|-)\s*<\/div>/);
  const cost = costMatch ? costMatch[1] : '';

  const powerMatch = block.match(/<div class="power"><h3>Power<\/h3>\s*(\d+|-)\s*<\/div>/);
  const power = powerMatch ? powerMatch[1] : '';

  const counterMatch = block.match(/<div class="counter"><h3>Counter<\/h3>\s*(\d+|-)\s*<\/div>/);
  const counter = counterMatch ? counterMatch[1] : '';

  const colorMatch = block.match(/<div class="color"><h3>Color<\/h3>\s*([^<]+)/);
  const color = colorMatch ? colorMatch[1].trim() : '';

  const blockMatch = block.match(/<div class="block">[\s\S]*?<h3>Block[\s\S]*?<\/h3>\s*(\d+)/);
  const blockIcon = blockMatch ? blockMatch[1] : '';

  let attribute = '';
  const attrDiv = block.match(/<div class="attribute">([\s\S]*?)<\/div>/);
  if (attrDiv) {
    const attrI = attrDiv[1].match(/<i>([^<]+)<\/i>/);
    attribute = attrI ? attrI[1].trim() : '-';
  }

  const featureMatch = block.match(/<div class="feature"><h3>Type<\/h3>\s*([^<]+)/);
  const feature = featureMatch ? featureMatch[1].trim() : '';

  const effectMatch = block.match(/<div class="text"><h3>Effect<\/h3>\s*([\s\S]*?)<\/div>/);
  const effect = effectMatch ? effectMatch[1].trim().replace(/\s+/g, ' ') : '';

  const setInfoMatch = block.match(/<div class="getInfo"><h3>Card Set\(s\)<\/h3>\s*([^<]+)/);
  const setName = setInfoMatch ? setInfoMatch[1].trim() : '';

  cards.push({
    card_set_id: isParallel ? cardId + '_p1' : cardId,
    card_name: name,
    set_id: setId,
    set_name: setName,
    rarity: rarity,
    card_color: color,
    card_type: cardType,
    producto: cat,
    category: category,
    card_image: 'assets/images/onepiece/ja/' + dirSafe + '/' + imgFile,
    effect: effect,
    power: power,
    counter: counter,
    attribute: attribute,
    block_icon: blockIcon,
    feature: feature,
    cost: cost,
    language: 'ja',
    is_parallel: isParallel
  });
}

console.log('[' + setId + '] Parseadas: ' + cards.length + ' cartas (' + cards.filter(c => c.is_parallel).length + ' paralelas)');

// ── 3. Download images ──
const outDir = path.join('assets/images/onepiece/ja', setId);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const BASE = 'https://asia-en.onepiece-cardgame.com/images/cardlist/card/';

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302].includes(res.statusCode)) {
        https.get(res.headers.location, (r2) => {
          const chunks = [];
          r2.on('data', c => chunks.push(c));
          r2.on('end', () => resolve(Buffer.concat(chunks)));
          r2.on('error', reject);
        }).on('error', reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processImages() {
  const newImgs = [];
  const skipped = [];
  const batchSize = 8;
  let done = 0;

  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    await Promise.all(batch.map(async (card) => {
      const imgName = path.basename(card.card_image).replace('.webp', '');
      const outPath = path.join(outDir, imgName + '.webp');
      if (fs.existsSync(outPath)) { skipped.push(imgName); done++; return; }
      const pngUrl = BASE + imgName + '.png';
      try {
        const buf = await download(pngUrl);
        await sharp(buf).webp({ quality: 85 }).toFile(outPath);
        newImgs.push(imgName);
      } catch (e) { /* ignore missing images */ }
      done++;
    }));
    process.stdout.write('\r[' + setId + '] Imagenes: ' + done + '/' + cards.length);
  }
  console.log(' (' + newImgs.length + ' nuevas, ' + skipped.length + ' existentes)');
}

(async () => {
  await processImages();

  // ── 4. Add to master ──
  const masterPath = 'data/games/onepiece/cards_master.json';
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  master.cards.push(...cards);
  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
  fs.copyFileSync(masterPath, 'data/games/onepiece/cards_master_backup.json');
  console.log('[' + setId + '] Agregado al master. Total: ' + master.cards.length + ' cartas');

  // Cleanup
  try { fs.unlinkSync(htmlPath); } catch (e) { /* ignore */ }
})();
