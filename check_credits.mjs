import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

// قراءة .env يدوياً
const envFile = readFileSync('/home/ubuntu/tashkila-3d-walkthrough/.env', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const platformApiKey = env.PLATFORM_API_KEY;
const platformId = env.PLATFORM_ID || 'khayal';
const mousaBaseUrl = env.MOUSA_BASE_URL || env.MOUSA_API_BASE || 'https://www.mousa.ai';
const mousaApiKey = env.MOUSA_API_KEY;

console.log('Platform ID:', platformId);
console.log('Mousa Base URL:', mousaBaseUrl);
console.log('PLATFORM_API_KEY exists:', !!platformApiKey);
console.log('MOUSA_API_KEY exists:', !!mousaApiKey);

// محاولة 1: استخدام PLATFORM_API_KEY
const endpoints = [
  '/api/platform/credits/usage',
  '/api/platform/stats',
  '/api/credits/usage',
  '/api/platform/usage',
];

for (const ep of endpoints) {
  try {
    const url = mousaBaseUrl + ep + '?platformId=' + platformId;
    const resp = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + (platformApiKey || mousaApiKey) }
    });
    const text = await resp.text();
    console.log(`\n${ep} → ${resp.status}:`, text.slice(0, 300));
    if (resp.ok) break;
  } catch (e) {
    console.log(`${ep} → Error:`, e.message);
  }
}

// فحص قاعدة البيانات - cost_events
const conn = await createConnection(env.DATABASE_URL);

// إجمالي التكلفة
const [grand] = await conn.execute(
  'SELECT SUM(CAST(costUsd AS DECIMAL(10,6))) as totalUsd, SUM(units) as totalUnits, COUNT(*) as count FROM cost_events'
);
console.log('\n=== إجمالي الاستهلاك في قاعدة البيانات ===');
console.log('Total USD:', grand[0].totalUsd);
console.log('Total Units:', grand[0].totalUnits);
console.log('Total Events:', grand[0].count);

// حسب المزود
const [byProvider] = await conn.execute(
  'SELECT provider, SUM(CAST(costUsd AS DECIMAL(10,6))) as totalUsd, SUM(units) as totalUnits, COUNT(*) as count FROM cost_events GROUP BY provider ORDER BY totalUsd DESC'
);
console.log('\n=== حسب المزود ===');
for (const row of byProvider) {
  console.log(`${row.provider}: $${row.totalUsd} | ${row.totalUnits} units | ${row.count} events`);
}

// حسب المستخدم
const [byUser] = await conn.execute(
  'SELECT userId, SUM(CAST(costUsd AS DECIMAL(10,6))) as totalUsd, COUNT(*) as count FROM cost_events GROUP BY userId ORDER BY totalUsd DESC LIMIT 10'
);
console.log('\n=== حسب المستخدم ===');
for (const row of byUser) {
  console.log(`User ${row.userId}: $${row.totalUsd} | ${row.count} events`);
}

// نقاط Mousa المستهلكة (كل جلسة = 25 نقطة بناءً على MOUSA_CREDITS_PER_SESSION)
const creditsPerSession = parseInt(env.MOUSA_CREDITS_PER_SESSION || '25');
const [sessions] = await conn.execute(
  "SELECT COUNT(*) as count FROM video_jobs WHERE status = 'completed'"
);
console.log('\n=== جلسات مكتملة ===');
console.log('Completed jobs:', sessions[0].count);
console.log('Credits per session:', creditsPerSession);
console.log('Estimated Mousa credits used:', sessions[0].count * creditsPerSession);

await conn.end();
