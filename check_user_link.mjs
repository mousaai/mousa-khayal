import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

console.log('=== فحص ربط بيانات المستخدم ===\n');

// 1. كل المستخدمين
const [users] = await conn.execute('SELECT id, name, email, openId, createdAt FROM users');
console.log('المستخدمون:', JSON.stringify(users, null, 2));

// 2. توزيع userId في video_jobs
const [jobsByUser] = await conn.execute(`
  SELECT 
    vj.userId,
    u.name,
    u.email,
    COUNT(*) as total,
    SUM(CASE WHEN vj.status='done' THEN 1 ELSE 0 END) as done,
    SUM(CASE WHEN vj.status='failed' THEN 1 ELSE 0 END) as failed,
    MIN(vj.createdAt) as first_job,
    MAX(vj.createdAt) as last_job
  FROM video_jobs vj
  LEFT JOIN users u ON vj.userId = u.id
  GROUP BY vj.userId, u.name, u.email
  ORDER BY total DESC
`);
console.log('\nتوزيع الجلسات حسب المستخدم:');
for (const row of jobsByUser) {
  console.log(`  userId=${row.userId} (${row.name || 'NULL'} / ${row.email || 'NULL'}): total=${row.total} done=${row.done} failed=${row.failed}`);
  console.log(`    أول جلسة: ${row.first_job} | آخر جلسة: ${row.last_job}`);
}

// 3. هل الجلسات NULL هي فعلاً لنفس المستخدم؟
const [nullJobs] = await conn.execute(`
  SELECT id, status, createdAt, 
    JSON_EXTRACT(scriptData, '$.userId') as scriptUserId,
    JSON_EXTRACT(optionsData, '$.userId') as optionsUserId
  FROM video_jobs 
  WHERE userId IS NULL 
  ORDER BY createdAt DESC 
  LIMIT 5
`);
console.log('\nعينة من الجلسات بدون userId:');
console.log(JSON.stringify(nullJobs, null, 2));

// 4. فحص كيف يتم تعيين userId في الجلسات
const [recentJobs] = await conn.execute(`
  SELECT id, userId, status, createdAt
  FROM video_jobs
  ORDER BY createdAt DESC
  LIMIT 10
`);
console.log('\nآخر 10 جلسات:');
for (const j of recentJobs) {
  console.log(`  ${j.id}: userId=${j.userId} status=${j.status} at=${j.createdAt}`);
}

// 5. فحص كيف يتم استدعاء deductMousaCredits - هل يمرر userId الصحيح؟
// فحص cost_events مع userId
const [costByUser] = await conn.execute(`
  SELECT userId, COUNT(*) as count, SUM(CAST(costUsd AS DECIMAL(10,6))) as totalUsd
  FROM cost_events
  GROUP BY userId
`);
console.log('\nتوزيع cost_events حسب userId:', JSON.stringify(costByUser));

await conn.end();
