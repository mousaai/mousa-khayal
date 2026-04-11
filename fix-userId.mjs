import mysql from 'mysql2/promise';

const DB_URL = 'mysql://3RYRgiKBksaJ9ku.eff254cfce12:8Hmi5APhIhZsYO1P269W@gateway03.us-east-1.prod.aws.tidbcloud.com:4000/6PpfERRQXfuwb7GGi2gFrK?ssl={"minVersion":"TLSv1.2","rejectUnauthorized":true}';

const conn = await mysql.createConnection(DB_URL);

try {
  // فحص تعريف جدول khayal_projects الحالي
  const [cols] = await conn.execute("SHOW CREATE TABLE `khayal_projects`");
  console.log('Current table definition:');
  console.log(cols[0]['Create Table']);
  
  // فحص إذا كان userId يقبل NULL
  const [desc] = await conn.execute("DESCRIBE `khayal_projects`");
  const userIdCol = desc.find(c => c.Field === 'userId');
  console.log('\nuserId column:', userIdCol);
  
  if (userIdCol && userIdCol.Null === 'NO') {
    console.log('\n⚠️ userId does NOT allow NULL — fixing...');
    await conn.execute("ALTER TABLE `khayal_projects` MODIFY COLUMN `userId` int(11) DEFAULT NULL");
    console.log('✅ Fixed: userId now allows NULL');
  } else {
    console.log('\n✅ userId already allows NULL — no fix needed');
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await conn.end();
}
