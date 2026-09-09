// scrape_official_promos.js
// Scrapea las páginas oficiales de promos EN y JA
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EN_SERIES = '569901';
const JA_SERIES = '556901';

function scrapeOfficialPage(lang, series) {
  console.log(`\n=== Scrapeando promos oficiales ${lang.toUpperCase()} ===`);
  
  const htmlPath = path.join(process.env.TEMP || '/tmp', `opcg_${lang}_promos_scrape.html`);
  const baseUrl = lang === 'en' 
    ? 'https://en.onepiece-cardgame.com/cardlist/'
    : 'https://asia-en.onepiece-cardgame.com/cardlist/';
  
  console.log(`Descargando HTML de: ${baseUrl}`);
  try {
    execSync(`curl.exe -s -X POST "${baseUrl}" -d "series=${series}" -o "${htmlPath}"`, { stdio: 'pipe' });
  } catch (e) {
    console.error(`Error descargando: ${e.message}`);
    return null;
  }
  
  if (!fs.existsSync(htmlPath)) {
    console.error('Error: no se pudo descargar HTML');
    return null;
  }
  
  const raw = fs.readFileSync(htmlPath, 'utf8');
  const resultsCount = (raw.match(/(\d+) results/) || [])[1];
  console.log(`HTML descargado: ${(raw.length / 1024).toFixed(0)} KB, ${resultsCount || '?'} resultados`);
  
  // Parsear las cartas
  const dlRegex = /<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g;
  const cards = [];
  let dlMatch;
  
  while ((dlMatch = dlRegex.exec(raw)) !== null) {
    const fullId = dlMatch[1];
    const block = dlMatch[2];
    
    // Extraer datos
    const nameMatch = block.match(/<div class="cardName">([^<]+)<\/div>/);
    let name = nameMatch ? nameMatch[1].trim() : '';
    name = name.replace(/&amp;/g, '&').replace(/&#039;/g, "'");
    
    const imgMatch = block.match(/data-src="[^"]*?card\/([^"?]+)/);
    const imgFile = imgMatch ? imgMatch[1] : '';
    
    const infoMatch = block.match(/<span>([A-Za-z0-9_-]+)<\/span>\s*\|\s*<span>(\w+)<\/span>/);
    const rarity = infoMatch ? infoMatch[1] : '';
    const cardType = infoMatch ? infoMatch[2].toUpperCase() : '';
    
    // Determinar si es variante paralela
    const isParallel = /_p\d+/.test(fullId);
    const cardId = fullId.replace(/_[pr]\d+$/, '');
    
    // Detectar el set_id basado en el prefijo del card_set_id
    let setId = 'PROMO'; // Por defecto
    if (cardId.startsWith('P-')) {
      setId = 'P';
    } else if (cardId.startsWith('ST')) {
      // Mantener el set original pero marcar como variante promo
      setId = 'PROMO'; // Las variantes de ST en promo van como PROMO
    }
    
    cards.push({
      full_id: fullId,
      card_id: cardId,
      name: name,
      rarity: rarity,
      type: cardType,
      image: imgFile,
      is_parallel: isParallel,
      suggested_set_id: setId
    });
  }
  
  console.log(`Parseadas: ${cards.length} cartas (${cards.filter(c => c.is_parallel).length} paralelas)`);
  
  // Limpiar
  try { fs.unlinkSync(htmlPath); } catch (e) {}
  
  return cards;
}

console.log('=== SCRAPING DE PROMOS OFICIALES ===\n');

const enCards = scrapeOfficialPage('en', EN_SERIES);
const jaCards = scrapeOfficialPage('ja', JA_SERIES);

if (enCards && jaCards) {
  console.log('\n=== RESUMEN ===');
  console.log(`EN: ${enCards.length} cartas oficiales`);
  console.log(`JA: ${jaCards.length} cartas oficiales`);
  
  // Comparar con nuestra base de datos
  const master = JSON.parse(fs.readFileSync('data/games/onepiece/cards_master.json', 'utf8'));
  
  const enInDb = master.cards.filter(c => 
    c.language === 'en' && 
    (c.set_id === 'PROMO' || c.set_id === 'P')
  );
  
  console.log(`\nEN en nuestra DB: ${enInDb.length} entradas`);
  console.log(`EN unicas: ${new Set(enInDb.map(c => c.card_set_id.replace(/_p\d+/, '_p1'))).size}`);
  
  // Guardar resultados para análisis posterior
  const outputPath = path.join('_tools', 'promos_oficiales.json');
  fs.writeFileSync(outputPath, JSON.stringify({ en: enCards, ja: jaCards }, null, 2));
  console.log(`\nResultados guardados en: ${outputPath}`);
}
