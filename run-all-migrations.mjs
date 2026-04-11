/**
 * run-all-migrations.mjs
 * يشغّل جميع ملفات migration SQL على TiDB Cloud
 */
import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// قراءة DATABASE_URL من ملف .env على السيرفر أو من البيئة
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// تحليل DATABASE_URL
const url = new URL(DB_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 4000,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace('/', ''),
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  multipleStatements: true,
};

console.log(`🔌 Connecting to: ${config.host}:${config.port}/${config.database}`);

const conn = await createConnection(config);
console.log('✅ Connected to TiDB Cloud');

// قراءة جميع ملفات migration بالترتيب
const migrationsDir = join(__dirname, 'drizzle');
const sqlFiles = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📁 Found ${sqlFiles.length} migration files`);

for (const file of sqlFiles) {
  const filePath = join(migrationsDir, file);
  const sql = readFileSync(filePath, 'utf-8');
  
  // تقسيم SQL إلى statements منفصلة
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`\n📄 Running: ${file} (${statements.length} statements)`);
  
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      // طباعة أول 60 حرف من الـ statement
      console.log(`  ✅ ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`);
    } catch (err) {
      if (err.message.includes('already exists') || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ⚠️  Already exists (skipped): ${stmt.slice(0, 50)}...`);
      } else {
        console.error(`  ❌ Error: ${err.message}`);
        console.error(`     SQL: ${stmt.slice(0, 100)}`);
      }
    }
  }
}

// التحقق من الجداول الموجودة الآن
const [tables] = await conn.execute('SHOW TABLES');
console.log('\n📊 Tables in database:');
tables.forEach(t => console.log('  -', Object.values(t)[0]));

await conn.end();
console.log('\n✅ Migration complete!');
