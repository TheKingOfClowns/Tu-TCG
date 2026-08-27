// scrape_all_en_official.js
// Scrapea todas las series oficiales de EN desde en.onepiece-cardgame.com
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://en.onepiece-cardgame.com/cardlist/';
const OUTPUT_DIR = path.join(process.env.TEMP || 'C:\\temp', 'opcg_en_official');

// Todas las series oficiales EN (incluyendo promociones)
const OFFICIAL_SERIES = [
  // Boosters
  { id: '569302', name: 'PRB-02', type: 'PREMIUM_BOOSTER' },
  { id: '569301', name: 'PRB-01', type: 'PREMIUM_BOOSTER' },
  { id: '569203', name: 'EB-03', type: 'EXTRA_BOOSTER' },
  { id: '569202', name: 'EB-02', type: 'EXTRA_BOOSTER' },
  { id: '569201', name: 'EB-01', type: 'EXTRA_BOOSTER' },
  { id: '569117', name: 'OP-17', type: 'BOOSTER' },
  { id: '569116', name: 'OP-16', type: 'BOOSTER' },
  { id: '569115', name: 'OP15-EB04', type: 'BOOSTER' },
  { id: '569114', name: 'OP14-EB04', type: 'BOOSTER' },
  { id: '569113', name: 'OP-13', type: 'BOOSTER' },
  { id: '569112', name: 'OP-12', type: 'BOOSTER' },
  { id: '569111', name: 'OP-11', type: 'BOOSTER' },
  { id: '569110', name: 'OP-10', type: 'BOOSTER' },
  { id: '569109', name: 'OP-09', type: 'BOOSTER' },
  { id: '569108', name: 'OP-08', type: 'BOOSTER' },
  { id: '569107', name: 'OP-07', type: 'BOOSTER' },
  { id: '569106', name: 'OP-06', type: 'BOOSTER' },
  { id: '569105', name: 'OP-05', type: 'BOOSTER' },
  { id: '569104', name: 'OP-04', type: 'BOOSTER' },
  { id: '569103', name: 'OP-03', type: 'BOOSTER' },
  { id: '569102', name: 'OP-02', type: 'BOOSTER' },
  { id: '569101', name: 'OP-01', type: 'BOOSTER' },
  // Starters
  { id: '569036', name: 'ST-36', type: 'STARTER' },
  { id: '569035', name: 'ST-35', type: 'STARTER' },
  { id: '569034', name: 'ST-34', type: 'STARTER' },
  { id: '569033', name: 'ST-33', type: 'STARTER' },
  { id: '569032', name: 'ST-32', type: 'STARTER' },
  { id: '569031', name: 'ST-31', type: 'STARTER' },
  { id: '569030', name: 'ST-30', type: 'STARTER' },
  { id: '569029', name: 'ST-29', type: 'STARTER' },
  { id: '569028', name: 'ST-28', type: 'STARTER' },
  { id: '569027', name: 'ST-27', type: 'STARTER' },
  { id: '569026', name: 'ST-26', type: 'STARTER' },
  { id: '569025', name: 'ST-25', type: 'STARTER' },
  { id: '569024', name: 'ST-24', type: 'STARTER' },
  { id: '569023', name: 'ST-23', type: 'STARTER' },
  { id: '569022', name: 'ST-22', type: 'STARTER' },
  { id: '569021', name: 'ST-21', type: 'STARTER' },
  { id: '569020', name: 'ST-20', type: 'STARTER' },
  { id: '569019', name: 'ST-19', type: 'STARTER' },
  { id: '569018', name: 'ST-18', type: 'STARTER' },
  { id: '569017', name: 'ST-17', type: 'STARTER' },
  { id: '569016', name: 'ST-16', type: 'STARTER' },
  { id: '569015', name: 'ST-15', type: 'STARTER' },
  { id: '569014', name: 'ST-14', type: 'STARTER' },
  { id: '569013', name: 'ST-13', type: 'STARTER' },
  { id: '569012', name: 'ST-12', type: 'STARTER' },
  { id: '569011', name: 'ST-11', type: 'STARTER' },
  { id: '569010', name: 'ST-10', type: 'STARTER' },
  { id: '569009', name: 'ST-09', type: 'STARTER' },
  { id: '569008', name: 'ST-08', type: 'STARTER' },
  { id: '569007', name: 'ST-07', type: 'STARTER' },
  { id: '569006', name: 'ST-06', type: 'STARTER' },
  { id: '569005', name: 'ST-05', type: 'STARTER' },
  { id: '569004', name: 'ST-04', type: 'STARTER' },
  { id: '569003', name: 'ST-03', type: 'STARTER' },
  { id: '569002', name: 'ST-02', type: 'STARTER' },
  { id: '569001', name: 'ST-01', type: 'STARTER' },
  // Promociones
  { id: '569901', name: 'PROMO-569901', type: 'PROMOTION' },
  { id: '569801', name: 'OTHER-569801', type: 'OTHER_PRODUCT' },
];

console.log('=== SCRAPING OFICIAL EN ===\n');
console.log(`Total series a scrapear: ${OFFICIAL_SERIES.length}`);
console.log(`Directorio de salida: ${OUTPUT_DIR}\n`);

// Función para esperar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Crear directorio de salida
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Función para scrapear una serie
function scrapeSeries(series) {
  const htmlPath = path.join(OUTPUT_DIR, `series_${series.id}.html`);
  
  console.log(`Scrapeando: ${series.name} (series=${series.id})`);
  
  try {
    execSync(`curl.exe -s -X POST "${BASE_URL}" -d "series=${series.id}" -o "${htmlPath}"`, { 
      stdio: 'pipe' 
    });
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return null;
  }
  
  if (!fs.existsSync(htmlPath)) {
    console.error('  Error: no se pudo descargar HTML');
    return null;
  }
  
  let raw;
  try {
    raw = fs.readFileSync(htmlPath, 'utf8');
  } catch (e) {
    console.error(`  Error leyendo archivo: ${e.message}`);
    return null;
  }
  const resultsCount = (raw.match(/(\d+) results/) || [])[1];
  console.log(`  Descargado: ${(raw.length / 1024).toFixed(0)} KB, ${resultsCount || '?'} resultados`);
  
  return {
    series: series,
    html: raw,
    resultsCount: parseInt(resultsCount) || 0,
    htmlPath: htmlPath
  };
}

// Función para parsear cartas del HTML
function parseCardsFromHtml(html, seriesInfo) {
  const dlRegex = /<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g;
  const cards = [];
  let dlMatch;
  
  while ((dlMatch = dlRegex.exec(html)) !== null) {
    const fullId = dlMatch[1];
    const block = dlMatch[2];
    
    // Extraer datos
    const nameMatch = block.match(/<div class="cardName">([^<]+)<\/div>/);
    let name = nameMatch ? nameMatch[1].trim() : '';
    name = name.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');
    
    const imgMatch = block.match(/data-src="[^"]*?card\/([^"?]+)/);
    const imgFile = imgMatch ? imgMatch[1] : '';
    
    const infoMatch = block.match(/<span>([A-Za-z0-9_-]+)<\/span>\s*\|\s*<span>(\w+)<\/span>/);
    const rarity = infoMatch ? infoMatch[1] : '';
    const cardType = infoMatch ? infoMatch[2].toUpperCase() : '';
    
    const isParallel = /_p\d+/.test(fullId);
    const cardId = fullId.replace(/_[pr]\d+$/, '');
    
    cards.push({
      full_id: fullId,
      card_id: cardId,
      name: name,
      rarity: rarity,
      type: cardType,
      image: imgFile,
      is_parallel: isParallel,
      series_id: seriesInfo.series.id,
      series_name: seriesInfo.series.name,
      series_type: seriesInfo.series.type
    });
  }
  
  return cards;
}

// Ejecutar scraping de todas las series (async con delays)
const allSeriesData = [];
const allCards = [];

async function scrapeAll() {
  for (const series of OFFICIAL_SERIES) {
    const result = scrapeSeries(series);
    if (result) {
      allSeriesData.push(result);
      
      const cards = parseCardsFromHtml(result.html, result);
      cards.forEach(c => {
        c.source_series = series.name;
        c.source_type = series.type;
      });
      allCards.push(...cards);
      
      console.log(`  Parseadas: ${cards.length} cartas`);
    }
    console.log('');
    
    // Delay entre descargas para evitar bloqueos
    await sleep(100);
  }
}

scrapeAll().then(() => {

// Guardar resultados
const summaryPath = path.join(OUTPUT_DIR, 'scrape_summary.json');
const cardsPath = path.join(OUTPUT_DIR, 'all_cards_en.json');

fs.writeFileSync(summaryPath, JSON.stringify({
  totalSeries: allSeriesData.length,
  totalCards: allCards.length,
  series: allSeriesData.map(s => ({
    id: s.series.id,
    name: s.series.name,
    type: s.series.type,
    resultsCount: s.resultsCount,
    parsedCards: allCards.filter(c => c.series_id === s.series.id).length
  }))
}, null, 2));

fs.writeFileSync(cardsPath, JSON.stringify(allCards, null, 2));

console.log('=== RESUMEN FINAL ===\n');
console.log(`Total series scrapeadas: ${allSeriesData.length}`);
console.log(`Total cartas parseadas: ${allCards.length}`);
console.log(`\nResultados guardados en:`);
console.log(`  ${summaryPath}`);
console.log(`  ${cardsPath}`);

// Estadísticas por tipo
const byType = {};
allCards.forEach(c => {
  if (!byType[c.source_type]) byType[c.source_type] = 0;
  byType[c.source_type]++;
});

console.log('\n=== CARTAS POR TIPO ===\n');
Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Estadísticas de promos específicamente
const promoTypes = ['PROMOTION', 'OTHER_PRODUCT'];
const promoCards = allCards.filter(c => promoTypes.includes(c.source_type));
const promoUnique = new Set(promoCards.map(c => c.card_id));

console.log('\n=== PROMOS EN ===\n');
console.log(`Total entradas: ${promoCards.length}`);
console.log(`Cards únicas: ${promoUnique.size}`);
console.log(`Paralelas: ${promoCards.filter(c => c.is_parallel).length}`);

}); // End of scrapeAll().then()
