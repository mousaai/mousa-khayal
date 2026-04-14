const platformApiKey = process.env.PLATFORM_API_KEY || process.env.MOUSA_API_KEY;
const mousaBaseUrl = process.env.MOUSA_BASE_URL || process.env.MOUSA_API_BASE || 'https://www.mousa.ai';
const platformId = process.env.PLATFORM_ID || process.env.MOUSA_PLATFORM_ID || 'khayal';

// userId الرقمي في قاعدة بيانات خيال = 1
// openId في موسى = 'Khq29ms9X2pmBFRfPqZCRr'
const userId = 1;
const userOpenId = 'Khq29ms9X2pmBFRfPqZCRr';

const HEADERS = {
  'Authorization': 'Bearer ' + platformApiKey,
  'X-Platform-ID': platformId,
  'Content-Type': 'application/json',
};

// check-balance بـ userId الرقمي
const attempts = [
  { method: 'GET', url: '/api/platform/check-balance?userId=' + userId },
  { method: 'GET', url: '/api/platform/check-balance?userId=' + userOpenId + '&platformId=' + platformId },
  { method: 'POST', url: '/api/platform/check-balance', body: { userId: userId, platformId } },
  { method: 'POST', url: '/api/platform/check-balance', body: { userId: userOpenId, platformId } },
  { method: 'GET', url: '/api/platform/user/' + userOpenId },
  { method: 'GET', url: '/api/platform/user/' + userId },
];

for (const ep of attempts) {
  try {
    const opts = { method: ep.method, headers: HEADERS };
    if (ep.body) opts.body = JSON.stringify(ep.body);
    
    const resp = await fetch(mousaBaseUrl + ep.url, opts);
    const text = await resp.text();
    const isHtml = text.trim().startsWith('<');
    console.log(ep.method + ' ' + ep.url + ' → ' + resp.status + ': ' + (isHtml ? '[HTML page]' : text.slice(0, 400)));
  } catch (e) {
    console.log(ep.url + ' → Error: ' + e.message);
  }
}
