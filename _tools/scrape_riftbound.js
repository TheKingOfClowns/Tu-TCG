// _tools/scrape_riftbound.js
// Descarga cartas de Riftbound desde Riftcodex API y genera cards_master.json
// Uso: node _tools/scrape_riftbound.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const API_BASE = 'https://api.riftcodex.com';
const IMG_DIR = 'assets/images/riftbound';
const DATA_DIR = 'data/games/riftbound';
const BATCH_SIZE = 8;
const WEBP_QUALITY = 85;

// ─── Mapeo de sets a categorias ──────────────────────────────────────────
function getProducto(setId) {
  const upper = setId.toUpperCase();
  if (upper === 'OGS') return 'STARTER';
  if (['OPP', 'PR', 'JDG', 'ARC'].includes(upper)) return 'PROMO';
  return 'BOOSTER';
}

// ─── Fetch helper ────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TuTCG/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TuTCG/1.0' } }, (res) => {
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

// ─── Mapeo Riftcodex → TuTCG ─────────────────────────────────────────────
function mapCard(apiCard) {
  const setId = apiCard.set.set_id.toUpperCase();
  const collectorNum = String(apiCard.collector_number);
  const paddedNum = collectorNum.padStart(3, '0');

  // Detect variant type for unique card_set_id
  let variantSuffix = '';
  const name = apiCard.name || '';
  if (name.includes('(Alternate Art)')) variantSuffix = 'a';
  else if (name.includes('(Signature)')) variantSuffix = 's';
  else if (name.includes('(Overnumbered)')) variantSuffix = 'v';

  const cardSetId = setId + '-' + paddedNum + variantSuffix;

  const producto = getProducto(setId);
  const domains = apiCard.classification.domain || [];
  const cardColor = domains.join('/');

  // card_type: Unit|Spell|Champion|Legend|Battlefield|Gear|Rune|Token|Signature Spell|etc.
  const cardType = apiCard.classification.type || '';

  // effect: use plain text, fallback to rich stripped
  let effect = (apiCard.text?.plain || apiCard.text?.rich || '').trim();
  // Remove :rb_*: markup
  effect = effect.replace(/:[a-z_]+:/g, '');

  // feature: tags as comma-separated
  const feature = (apiCard.tags || []).join('/');

  return {
    card_set_id: cardSetId,
    card_name: apiCard.name || '',
    set_id: setId,
    set_name: apiCard.set.label || '',
    rarity: apiCard.classification.rarity || '',
    card_color: cardColor,
    card_type: cardType,
    producto: producto,
    category: producto,
    card_image: 'assets/images/riftbound/' + setId + '/' + cardSetId + '.webp',
    effect: effect,
    power: apiCard.attributes?.might != null ? String(apiCard.attributes.might) : '',
    counter: '',
    attribute: apiCard.classification.supertype || '',
    block_icon: '',
    feature: feature,
    cost: apiCard.attributes?.energy != null ? String(apiCard.attributes.energy) : '',
    language: 'en',
    is_parallel: apiCard.metadata?.alternate_art || false,
  };
}

// ─── Download images ─────────────────────────────────────────────────────
async function downloadImages(cards) {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (card) => {
      const imgPath = path.join(card.card_image);
      if (fs.existsSync(imgPath)) {
        skipped++;
        return;
      }
      // Ensure directory exists
      const dir = path.dirname(imgPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const imgUrl = card._image_url;
      if (!imgUrl) {
        failed++;
        return;
      }
      try {
        const buf = await downloadFile(imgUrl);
        await sharp(buf).webp({ quality: WEBP_QUALITY }).toFile(imgPath);
        downloaded++;
      } catch (e) {
        console.error('  Error downloading ' + imgUrl + ': ' + e.message);
        failed++;
      }
    }));
    process.stdout.write('\rDescargando imagenes: ' + (downloaded + skipped) + '/' + cards.length + ' (' + downloaded + ' nuevas, ' + skipped + ' existentes, ' + failed + ' fallos)');
  }
  console.log('');
  console.log('Imagenes: ' + downloaded + ' nuevas, ' + skipped + ' existentes, ' + failed + ' fallos');
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Riftbound Scraper ===');
  console.log('');

  // 1. Fetch all cards from API
  console.log('Obteniendo total de cartas...');
  const firstPage = await fetchJSON(API_BASE + '/cards?size=100');
  const totalCards = firstPage.total;
  const totalPages = firstPage.pages;
  console.log('Total: ' + totalCards + ' cartas en ' + totalPages + ' paginas');

  const allApiCards = [...firstPage.items];
  for (let p = 2; p <= totalPages; p++) {
    process.stdout.write('\rDescargando pagina ' + p + '/' + totalPages + '...');
    const page = await fetchJSON(API_BASE + '/cards?size=100&page=' + p);
    allApiCards.push(...page.items);
  }
  console.log('');
  console.log('Descargadas: ' + allApiCards.length + ' cartas de la API');

  // 2. Map to TuTCG format
  const cards = allApiCards.map(apiCard => {
    const mapped = mapCard(apiCard);
    mapped._image_url = apiCard.media?.image_url || null;
    return mapped;
  });
  console.log('Mapeadas: ' + cards.length + ' cartas al formato TuTCG');

  // 3. Download images
  console.log('');
  console.log('Descargando imagenes (webp)...');
  await downloadImages(cards);

  // 4. Clean up temp field
  cards.forEach(c => delete c._image_url);

  // 5. Build master JSON
  const sets = {};
  const products = new Set();
  cards.forEach(c => {
    sets[c.set_id] = (sets[c.set_id] || 0) + 1;
    products.add(c.producto);
  });

  const withoutImage = cards.filter(c => {
    const imgPath = c.card_image;
    return !fs.existsSync(imgPath);
  }).length;

  const master = {
    generated_at: new Date().toISOString(),
    source: 'Riftcodex API (api.riftcodex.com)',
    total_cards: cards.length,
    sets: sets,
    stats: {
      without_image: withoutImage,
    },
    cards: cards,
  };

  // 6. Write JSON
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const jsonPath = path.join(DATA_DIR, 'cards_master.json');
  fs.writeFileSync(jsonPath, JSON.stringify(master, null, 2), 'utf8');
  console.log('');
  console.log('JSON guardado: ' + jsonPath);
  console.log('Total cartas: ' + cards.length);
  console.log('Sets: ' + Object.keys(sets).length + ' (' + Object.entries(sets).map(([k, v]) => k + ':' + v).join(', ') + ')');
  console.log('Sin imagen: ' + withoutImage);

  // 7. Summary
  const types = {};
  cards.forEach(c => {
    types[c.card_type] = (types[c.card_type] || 0) + 1;
  });
  console.log('');
  console.log('Tipos de carta:');
  Object.entries(types).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => {
    console.log('  ' + t + ': ' + n);
  });

  const rarities = {};
  cards.forEach(c => {
    rarities[c.rarity] = (rarities[c.rarity] || 0) + 1;
  });
  console.log('');
  console.log('Rarezas:');
  Object.entries(rarities).sort((a, b) => b[1] - a[1]).forEach(([r, n]) => {
    console.log('  ' + r + ': ' + n);
  });

  const colors = {};
  cards.forEach(c => {
    colors[c.card_color] = (colors[c.card_color] || 0) + 1;
  });
  console.log('');
  console.log('Colores (dominios):');
  Object.entries(colors).sort((a, b) => b[1] - a[1]).forEach(([c2, n]) => {
    console.log('  ' + c2 + ': ' + n);
  });
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
