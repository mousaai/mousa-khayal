const platformApiKey = process.env.PLATFORM_API_KEY || process.env.MOUSA_API_KEY;
const mousaBaseUrl = process.env.MOUSA_BASE_URL || process.env.MOUSA_API_BASE || 'https://www.mousa.ai';
const platformId = process.env.PLATFORM_ID || process.env.MOUSA_PLATFORM_ID || 'khayal';
const userOpenId = 'Khq29ms9X2pmBFRfPqZCRr';

const HEADERS = {
  'Authorization': 'Bearer ' + platformApiKey,
  'X-Platform-ID': platformId,
  'Content-Type': 'application/json',
};

console.log('Platform ID:', platformId);
console.log('API Key (first 10):', platformApiKey?.slice(0, 10));

// محاولة check-balance بالطريقة الصحيحة
const endpoints = [
  { method: 'GET', url: '/api/platform/check-balance?userId=' + userOpenId },
  { method: 'POST', url: '/api/platform/check-balance', body: { userId: userOpenId } },
  { method: 'GET', url: '/api/platform/balance?userId=' + userOpenId },
  { method: 'POST', url: '/api/platform/verify-token', body: { token: userOpenId } },
];

for (const ep of endpoints) {
  try {
    const opts = {
      method: ep.method,
      headers: HEADERS,
    };
    if (ep.body) opts.body = JSON.stringify(ep.body);
    
    const resp = await fetch(mousaBaseUrl + ep.url, opts);
    const text = await resp.text();
    const isHtml = text.trim().startsWith('<');
    console.log(ep.method + ' ' + ep.url + ' → ' + resp.status + ': ' + (isHtml ? '[HTML page]' : text.slice(0, 400)));
  } catch (e) {
    console.log(ep.url + ' → Error: ' + e.message);
  }
}
