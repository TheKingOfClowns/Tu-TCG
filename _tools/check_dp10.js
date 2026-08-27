const https = require('https');

const urls = [
  'https://app.logiatcg.com/cards/DON-DP10_EN?lang=EN&set=all&types=DON!!&q=dp',
  'https://app.logiatcg.com/cards/DON-DP10-2_EN?lang=EN&set=all&types=DON!!&q=dp'
];

async function check(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString();
        const imgs = [...html.matchAll(/assets\.logiatcg\.com[^"'\s<>\\]+\.(?:png|jpg|webp)/g)];
        console.log(url.split('/cards/')[1].split('?')[0] + ':');
        console.log('  Images:', [...new Set(imgs.map(m => m[0].replace(/\\/g, '')))]);
        resolve();
      });
    }).on('error', e => { console.log('error:', e.message); resolve(); });
  });
}

(async () => {
  for (const url of urls) await check(url);
})();
