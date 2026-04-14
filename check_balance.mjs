const platformApiKey = process.env.PLATFORM_API_KEY;
const mousaBaseUrl = process.env.MOUSA_BASE_URL || 'https://www.mousa.ai';
const platformId = process.env.PLATFORM_ID || 'khayal';
const userOpenId = 'Khq29ms9X2pmBFRfPqZCRr'; // openId of mousa@almaskanengineering.com

console.log('Platform ID:', platformId);
console.log('Mousa Base URL:', mousaBaseUrl);
console.log('User OpenID:', userOpenId);

const endpoints = [
  '/api/platform/user-balance?userId=' + userOpenId,
  '/api/platform/balance?userId=' + userOpenId + '&platformId=' + platformId,
  '/api/user/' + userOpenId + '/balance',
  '/api/platform/credits?userId=' + userOpenId,
  '/api/platform/check-balance',
];

for (const ep of endpoints) {
  const url = mousaBaseUrl + ep;
  try {
    const resp = await fetch(url, {
      headers: { 
        'Authorization': 'Bearer ' + platformApiKey,
        'x-api-key': platformApiKey,
      }
    });
    const text = await resp.text();
    const isHtml = text.trim().startsWith('<');
    console.log(ep + ' → ' + resp.status + ': ' + (isHtml ? '[HTML page]' : text.slice(0, 300)));
  } catch (e) {
    console.log(ep + ' → Error: ' + e.message);
  }
}
