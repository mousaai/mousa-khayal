import mysql from 'mysql2/promise';

const DB_URL = 'mysql://3RYRgiKBksaJ9ku.eff254cfce12:8Hmi5APhIhZsYO1P269W@gateway03.us-east-1.prod.aws.tidbcloud.com:4000/6PpfERRQXfuwb7GGi2gFrK?ssl={"minVersion":"TLSv1.2","rejectUnauthorized":true}';

const conn = await mysql.createConnection(DB_URL);

try {
  // فحص الجداول الموجودة
  const [tables] = await conn.execute("SHOW TABLES LIKE 'cost_events'");
  if (tables.length > 0) {
    console.log('✅ cost_events already exists');
  } else {
    await conn.execute(`
      CREATE TABLE \`cost_events\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`provider\` enum('llm','image_gen','runway','elevenlabs','storage','other') NOT NULL,
        \`operation\` varchar(128) NOT NULL,
        \`units\` int NOT NULL DEFAULT 1,
        \`unitType\` varchar(32) NOT NULL,
        \`costUsd\` varchar(20) NOT NULL,
        \`userId\` int DEFAULT NULL,
        \`jobId\` varchar(64) DEFAULT NULL,
        \`projectId\` int DEFAULT NULL,
        \`metadata\` json DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ cost_events created successfully');
  }
  
  // فحص جميع الجداول المطلوبة
  const requiredTables = ['khayal_projects', 'khayal_scenes', 'cost_events', 'suspended_users', 'architectural_designs', 'users'];
  for (const table of requiredTables) {
    const [rows] = await conn.execute(`SHOW TABLES LIKE '${table}'`);
    console.log(`${rows.length > 0 ? '✅' : '❌'} ${table}`);
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await conn.end();
}
