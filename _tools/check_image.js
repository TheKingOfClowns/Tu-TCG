const https = require('https');

const url = 'https://app.logiatcg.com/cards/DON-OP17-Four-Emperors_EN?lang=EN';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const html = Buffer.concat(chunks).toString();
    
    // Search for image URLs
    const imgMatches = [...html.matchAll(/https?:\/\/[^"'\s<>]+\.(?:jpg|webp|png)/g)];
    console.log('Image URLs found:', imgMatches.map(m => m[0]));
    
    // Search for __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        console.log('\n__NEXT_DATA__ keys:', Object.keys(data));
        if (data.props) {
          console.log('props keys:', Object.keys(data.props));
          if (data.props.pageProps) {
            console.log('pageProps keys:', Object.keys(data.props.pageProps));
            const pp = data.props.pageProps;
            if (pp.card) console.log('card:', JSON.stringify(pp.card).substring(0, 2000));
            if (pp.initialCard) console.log('initialCard:', JSON.stringify(pp.initialCard).substring(0, 2000));
          }
        }
      } catch(e) {
        console.log('Parse error:', e.message);
        console.log('Raw (first 500):', nextDataMatch[1].substring(0, 500));
      }
    } else {
      console.log('No __NEXT_DATA__ found');
    }
    
    // Search for any supabase storage URLs
    const supaMatches = [...html.matchAll(/supabase\.co[^"'\s<>]*/g)];
    console.log('\nSupabase refs:', [...new Set(supaMatches.map(m => m[0]))].slice(0, 10));
    
    // Search for card image patterns
    const cardImgMatches = [...html.matchAll(/card[_]?[Ii]mage[^"]*"[^"]*"/g)];
    console.log('\ncardImage patterns:', cardImgMatches.map(m => m[0]).slice(0, 5));
  });
}).on('error', e => console.log('error:', e.message));
