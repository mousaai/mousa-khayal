import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const DB_URL = 'mysql://3RYRgiKBksaJ9ku.eff254cfce12:8Hmi5APhIhZsYO1P269W@gateway03.us-east-1.prod.aws.tidbcloud.com:4000/6PpfERRQXfuwb7GGi2gFrK?ssl={"minVersion":"TLSv1.2","rejectUnauthorized":true}';

async function runMigrations() {
  const conn = await createConnection(DB_URL);
  
  const [tables] = await conn.execute('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('Existing tables:', tableNames.join(', '));
  
  const migrations = [
    { file: 'drizzle/0009_fast_boomerang.sql', table: 'cost_events' },
    { file: 'drizzle/0010_workable_tigra.sql', table: 'architectural_designs' },
    { file: 'drizzle/0011_elite_black_tom.sql', table: 'suspended_users' }
  ];
  
  for (const { file, table } of migrations) {
    if (!tableNames.includes(table)) {
      console.log('Creating table:', table);
      const sql = readFileSync(file, 'utf8');
      await conn.execute(sql);
      console.log('Done:', table);
    } else {
      console.log('Already exists:', table);
    }
  }
  
  await conn.end();
  console.log('All migrations complete!');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
