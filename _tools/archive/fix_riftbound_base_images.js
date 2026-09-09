// _tools/fix_riftbound_base_images.js
// Re-downloads base card images that incorrectly have AA variant images.
// Uso: node _tools/fix_riftbound_base_images.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const sharp = require('sharp');

const API_BASE = 'https://api.riftcodex.com';
const JSON_PATH = 'data/games/riftbound/cards_master.json';
const WEBP_QUALITY = 85;
const BATCH_SIZE = 6;

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

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function getVariantSuffix(cardName) {
  if (cardName.includes('(Alternate Art)')) return 'a';
  if (cardName.includes('(Signature)')) return 's';
  if (cardName.includes('(Overnumbered)')) return 'v';
  return '';
}

async function main() {
  console.log('=== Fix Riftbound Base Images ===\n');

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
  console.log('\nDownloaded: ' + allApiCards.length + ' cards');

  // 2. Build API map: set_id|collector_number|suffix -> image_url
  const apiMap = {};
  allApiCards.forEach(card => {
    const set = (card.set.set_id || '').toUpperCase();
    const num = String(card.collector_number);
    const suffix = getVariantSuffix(card.name || '');
    const key = set + '|' + num + '|' + suffix;
    if (!apiMap[key]) {
      apiMap[key] = card.media?.image_url || null;
    }
  });
  console.log('API map built: ' + Object.keys(apiMap).length + ' entries');

  // 3. Read cards_master.json
  const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const cards = jsonData.cards;

  // 4. Build AA lookup: set_id|number -> AA card
  const aaLookup = {};
  cards.forEach(card => {
    const suffix = getVariantSuffix(card.card_name || '');
    if (suffix !== 'a') return;
    const match = (card.card_set_id || '').match(/^([A-Z]+)-(\d+)/);
    if (!match) return;
    const key = match[1] + '|' + parseInt(match[2], 10);
    aaLookup[key] = card;
  });
  console.log('AA variants in JSON: ' + Object.keys(aaLookup).length);

  // 5. Find base cards that need fixing
  const toFix = [];
  cards.forEach(card => {
    const suffix = getVariantSuffix(card.card_name || '');
    if (suffix) return; // skip variants
    const match = (card.card_set_id || '').match(/^([A-Z]+)-(\d+)$/);
    if (!match) return;
    const set = match[1];
    const num = parseInt(match[2], 10);
    const key = set + '|' + num;
    const aaCard = aaLookup[key];
    if (!aaCard) return; // no AA variant exists

    const baseImgPath = card.card_image;
    const aaImgPath = aaCard.card_image;
    const baseHash = hashFile(baseImgPath);
    const aaHash = hashFile(aaImgPath);

    if (!baseHash || !aaHash) {
      if (!baseHash) toFix.push({ card, set, num, reason: 'missing_base' });
      return;
    }

    if (baseHash !== aaHash) return; // images are different, correct

    // Same hash = wrong image on base
    const apiKey = set + '|' + num + '|';
    const apiUrl = apiMap[apiKey];
    if (!apiUrl) {
      toFix.push({ card, set, num, reason: 'no_api_url' });
      return;
    }

    toFix.push({ card, set, num, apiKey, apiUrl });
  });

  console.log('\nCards to fix: ' + toFix.length);
  const reasonCounts = {};
  toFix.forEach(f => { reasonCounts[f.reason || 'same_hash'] = (reasonCounts[f.reason || 'same_hash'] || 0) + 1; });
  Object.entries(reasonCounts).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

  // 6. Download correct base images
  console.log('\nDownloading correct base images...');
  let downloaded = 0;
  let failed = 0;
  let noUrl = 0;

  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = toFix.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (item) => {
      if (!item.apiUrl) {
        noUrl++;
        console.log('  No API URL: ' + item.card.card_set_id);
        return;
      }
      const imgPath = item.card.card_image;
      try {
        const buffer = await downloadFile(item.apiUrl);
        const dir = path.dirname(imgPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await sharp(buffer).webp({ quality: WEBP_QUALITY }).toFile(imgPath);
        downloaded++;
      } catch (e) {
        console.log('  Error: ' + item.card.card_set_id + ' - ' + e.message);
        failed++;
      }
    }));
    process.stdout.write('\r' + Math.min(i + BATCH_SIZE, toFix.length) + '/' + toFix.length +
      ' (dl: ' + downloaded + ', fail: ' + failed + ', noUrl: ' + noUrl + ')');
  }
  console.log('');

  // 7. Verify
  console.log('\nVerifying fixes...');
  let stillWrong = 0;
  let fixed = 0;
  toFix.forEach(item => {
    const key = item.set + '|' + item.num;
    const aaCard = aaLookup[key];
    if (!aaCard || !item.apiUrl) return;
    const baseHash = hashFile(item.card.card_image);
    const aaHash = hashFile(aaCard.card_image);
    if (!baseHash || !aaHash) return;
    if (baseHash === aaHash) {
      stillWrong++;
      console.log('  STILL WRONG: ' + item.card.card_set_id + ' vs ' + aaCard.card_set_id);
    } else {
      fixed++;
    }
  });
  console.log('Fixed: ' + fixed);
  console.log('Still wrong: ' + stillWrong);

  // 8. Summary
  console.log('\n=== Summary ===');
  console.log('  Total pairs checked: ' + Object.keys(aaLookup).length);
  console.log('  Base images fixed: ' + downloaded);
  console.log('  Failed: ' + failed);
  console.log('  No API URL available: ' + noUrl);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
