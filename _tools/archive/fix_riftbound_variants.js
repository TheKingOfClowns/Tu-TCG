// _tools/fix_riftbound_variants.js
// Fix card_set_id collisions for Alternate Art, Signature, Overnumbered cards
// Downloads correct images from Riftcodex API and updates cards_master.json
// Uso: node _tools/fix_riftbound_variants.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const API_BASE = 'https://api.riftcodex.com';
const JSON_PATH = 'data/games/riftbound/cards_master.json';
const WEBP_QUALITY = 85;
const BATCH_SIZE = 8;

// ─── Helpers ────────────────────────────────────────────────────────────────
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

function getVariantSuffix(cardName) {
  if (cardName.includes('(Alternate Art)')) return 'a';
  if (cardName.includes('(Signature)')) return 's';
  if (cardName.includes('(Overnumbered)')) return 'v';
  return '';
}

async function convertToWebp(buffer, outputPath) {
  await sharp(buffer)
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Fix Riftbound Variants ===');
  console.log('');

  // 1. Fetch all cards from Riftcodex API
  console.log('Fetching cards from Riftcodex API...');
  const firstPage = await fetchJSON(API_BASE + '/cards?size=100');
  const totalCards = firstPage.total;
  const totalPages = firstPage.pages;
  console.log('Total: ' + totalCards + ' cards in ' + totalPages + ' pages');

  const allApiCards = [...firstPage.items];
  for (let p = 2; p <= totalPages; p++) {
    process.stdout.write('\rPage ' + p + '/' + totalPages + '...');
    const page = await fetchJSON(API_BASE + '/cards?size=100&page=' + p);
    allApiCards.push(...page.items);
  }
  console.log('');
  console.log('Downloaded: ' + allApiCards.length + ' cards');

  // 2. Build lookup: set_id|collector_number|suffix -> image_url
  const apiMap = {};
  allApiCards.forEach(card => {
    const set = card.set.set_id.toUpperCase();
    const num = String(card.collector_number);
    const suffix = getVariantSuffix(card.name);
    const key = set + '|' + num + '|' + suffix;
    apiMap[key] = card.media?.image_url || null;
  });

  console.log('API map built: ' + Object.keys(apiMap).length + ' entries');

  // 3. Read cards_master.json
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const cards = jsonData.cards;
  console.log('Current cards in JSON: ' + cards.length);

  // 4. Identify variant cards to fix
  const toFix = [];
  cards.forEach((card, idx) => {
    const suffix = getVariantSuffix(card.card_name);
    if (!suffix) return;

    const oldId = card.card_set_id;
    const set = card.set_id;

    // Extract base number from card_set_id (remove any existing suffix letters)
    const numMatch = oldId.match(/^[A-Z]+-(\d+)[a-z]*$/);
    if (!numMatch) return;
    const baseNum = numMatch[1];
    const existingSuffix = oldId.replace(/^[A-Z]+-\d+/, '');

    // Skip if already has the correct suffix
    if (existingSuffix === suffix) return;

    const newId = set + '-' + baseNum + suffix;
    const apiKey = set + '|' + String(parseInt(baseNum, 10)) + '|' + suffix;

    toFix.push({
      idx: idx,
      card: card,
      set: set,
      number: baseNum,
      suffix: suffix,
      oldId: oldId,
      newId: newId,
      apiKey: apiKey,
      apiUrl: apiMap[apiKey] || null
    });
  });

  console.log('Variants to fix: ' + toFix.length);
  console.log('  Alternate Art (a): ' + toFix.filter(f => f.suffix === 'a').length);
  console.log('  Signature (s): ' + toFix.filter(f => f.suffix === 's').length);
  console.log('  Overnumbered (v): ' + toFix.filter(f => f.suffix === 'v').length);

  // 5. Update card_set_id and card_image in JSON
  let fixed = 0;
  let noApiUrl = 0;
  toFix.forEach(item => {
    item.card.card_set_id = item.newId;
    const numPadded = item.number.padStart(3, '0');
    item.card.card_image = 'assets/images/riftbound/' + item.set + '/' + item.set + '-' + numPadded + item.suffix + '.webp';
    if (!item.apiUrl) noApiUrl++;
    fixed++;
  });

  // 6. Download variant images
  console.log('');
  console.log('Downloading variant images...');
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = toFix.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (item) => {
      if (!item.apiUrl) {
        failed++;
        return;
      }
      const imgPath = item.card.card_image;
      // Ensure directory exists
      const dir = path.dirname(imgPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(imgPath)) {
        // Check if the existing file is for the correct variant
        // Just re-download since we're fixing collisions
        skipped++;
        try {
          const buffer = await downloadFile(item.apiUrl);
          await convertToWebp(buffer, imgPath);
          downloaded++;
          skipped--;
        } catch (e) {
          console.log('  Error: ' + item.newId + ' - ' + e.message);
          failed++;
        }
        return;
      }

      try {
        const buffer = await downloadFile(item.apiUrl);
        await convertToWebp(buffer, imgPath);
        downloaded++;
      } catch (e) {
        console.log('  Error downloading ' + item.newId + ': ' + e.message);
        failed++;
      }
    }));
    process.stdout.write('\rProgress: ' + (i + batch.length) + '/' + toFix.length + ' (' + downloaded + ' dl, ' + skipped + ' skip, ' + failed + ' fail)');
  }
  console.log('');

  // 7. Save updated JSON
  console.log('');
  console.log('Saving updated JSON...');
  jsonData.generated_at = new Date().toISOString();
  jsonData.total_cards = cards.length;

  // Update sets breakdown
  const setsCount = {};
  cards.forEach(c => {
    setsCount[c.set_id] = (setsCount[c.set_id] || 0) + 1;
  });
  jsonData.sets = Object.keys(setsCount).sort().map(s => ({ set_id: s, count: setsCount[s] }));

  // Update stats
  const withoutImage = cards.filter(c => !fs.existsSync(c.card_image)).length;
  if (!jsonData.stats) jsonData.stats = {};
  jsonData.stats.without_image = withoutImage;

  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log('Saved: ' + JSON_PATH);
  console.log('');
  console.log('=== Summary ===');
  console.log('  Variants fixed: ' + fixed);
  console.log('  Images downloaded: ' + downloaded);
  console.log('  Skipped: ' + skipped);
  console.log('  Failed: ' + failed);
  console.log('  No API URL: ' + noApiUrl);
  console.log('  Without image: ' + withoutImage);
}

main().catch(e => { console.error(e); process.exit(1); });
