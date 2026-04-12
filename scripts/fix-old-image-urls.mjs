/**
 * fix-old-image-urls.mjs
 *
 * يُصلح الصور القديمة في قاعدة البيانات التي تحتوي على:
 *   1. روابط presigned منتهية (X-Amz-Signature في الرابط)
 *   2. روابط R2 القديمة بدون pub- prefix
 *
 * يُحوّلها إلى روابط عامة دائمة بصيغة:
 *   https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev/{key}
 *
 * الاستخدام:
 *   node scripts/fix-old-image-urls.mjs [--dry-run]
 *
 * --dry-run: يعرض فقط ما سيتم تغييره دون تطبيق التغييرات
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const PUBLIC_BASE = "https://pub-e56d13155b5a436d9df39f96ea86b218.r2.dev";
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) {
  console.log("🔍 وضع المعاينة (--dry-run) — لن يتم تطبيق أي تغييرات\n");
}

// ── استخراج file key من رابط presigned أو رابط R2 قديم ──────────────────
function extractKeyFromUrl(url) {
  if (!url) return null;

  // رابط presigned: https://ACCOUNT_ID.r2.cloudflarestorage.com/BUCKET/KEY?X-Amz-...
  const presignedMatch = url.match(/\.r2\.cloudflarestorage\.com\/[^/]+\/(.+?)(?:\?|$)/);
  if (presignedMatch) return presignedMatch[1];

  // رابط pub- عام: https://pub-XXX.r2.dev/KEY
  const pubMatch = url.match(/pub-[a-f0-9]+\.r2\.dev\/(.+)/);
  if (pubMatch) return pubMatch[1];

  // رابط R2 مباشر بدون pub: https://BUCKET.ACCOUNT_ID.r2.cloudflarestorage.com/KEY
  const directMatch = url.match(/\.r2\.cloudflarestorage\.com\/(.+?)(?:\?|$)/);
  if (directMatch) {
    // إزالة اسم الـ bucket من البداية إذا كان موجوداً
    const parts = directMatch[1].split("/");
    if (parts.length > 1) return parts.slice(1).join("/");
    return directMatch[1];
  }

  return null;
}

// ── التحقق من أن الرابط يحتاج إصلاح ────────────────────────────────────
function needsFix(url) {
  if (!url) return false;
  // presigned URL
  if (url.includes("X-Amz-Signature") || url.includes("X-Amz-Algorithm")) return true;
  // رابط R2 مباشر (ليس pub-)
  if (url.includes(".r2.cloudflarestorage.com")) return true;
  return false;
}

// ── بناء الرابط العام الجديد ──────────────────────────────────────────────
function buildPublicUrl(url) {
  const key = extractKeyFromUrl(url);
  if (!key) return null;
  return `${PUBLIC_BASE}/${key}`;
}

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("✅ متصل بقاعدة البيانات\n");

  let totalFixed = 0;
  let totalSkipped = 0;

  // ── 1. khayal_scenes.imageUrl ─────────────────────────────────────────
  console.log("📋 فحص khayal_scenes...");
  const [scenes] = await db.execute("SELECT id, imageUrl FROM khayal_scenes WHERE imageUrl IS NOT NULL");
  for (const row of scenes) {
    if (!needsFix(row.imageUrl)) { totalSkipped++; continue; }
    const newUrl = buildPublicUrl(row.imageUrl);
    if (!newUrl) { console.warn(`  ⚠️ لا يمكن استخراج key من: ${row.imageUrl?.substring(0, 80)}`); continue; }
    console.log(`  🔧 scene ${row.id}: ${row.imageUrl?.substring(0, 60)}... → ${newUrl}`);
    if (!DRY_RUN) await db.execute("UPDATE khayal_scenes SET imageUrl = ? WHERE id = ?", [newUrl, row.id]);
    totalFixed++;
  }

  // ── 2. architectural_designs.imageUrl ────────────────────────────────
  console.log("\n📋 فحص architectural_designs...");
  const [designs] = await db.execute("SELECT id, imageUrl, imageKey FROM architectural_designs WHERE imageUrl IS NOT NULL");
  for (const row of designs) {
    if (!needsFix(row.imageUrl)) { totalSkipped++; continue; }
    // إذا كان imageKey محفوظاً، استخدمه مباشرة
    const newUrl = row.imageKey
      ? `${PUBLIC_BASE}/${row.imageKey}`
      : buildPublicUrl(row.imageUrl);
    if (!newUrl) { console.warn(`  ⚠️ لا يمكن استخراج key من: ${row.imageUrl?.substring(0, 80)}`); continue; }
    console.log(`  🔧 design ${row.id}: → ${newUrl}`);
    if (!DRY_RUN) await db.execute("UPDATE architectural_designs SET imageUrl = ? WHERE id = ?", [newUrl, row.id]);
    totalFixed++;
  }

  // ── 3. scene_revisions.imageUrl ──────────────────────────────────────
  console.log("\n📋 فحص scene_revisions...");
  const [revisions] = await db.execute("SELECT id, imageUrl FROM scene_revisions WHERE imageUrl IS NOT NULL");
  for (const row of revisions) {
    if (!needsFix(row.imageUrl)) { totalSkipped++; continue; }
    const newUrl = buildPublicUrl(row.imageUrl);
    if (!newUrl) { console.warn(`  ⚠️ لا يمكن استخراج key من: ${row.imageUrl?.substring(0, 80)}`); continue; }
    console.log(`  🔧 revision ${row.id}: → ${newUrl}`);
    if (!DRY_RUN) await db.execute("UPDATE scene_revisions SET imageUrl = ? WHERE id = ?", [newUrl, row.id]);
    totalFixed++;
  }

  // ── 4. video_jobs.videoUrl ────────────────────────────────────────────
  console.log("\n📋 فحص video_jobs.videoUrl...");
  const [jobs] = await db.execute("SELECT id, videoUrl FROM video_jobs WHERE videoUrl IS NOT NULL");
  for (const row of jobs) {
    if (!needsFix(row.videoUrl)) { totalSkipped++; continue; }
    const newUrl = buildPublicUrl(row.videoUrl);
    if (!newUrl) { console.warn(`  ⚠️ لا يمكن استخراج key من: ${row.videoUrl?.substring(0, 80)}`); continue; }
    console.log(`  🔧 job ${row.id} videoUrl: → ${newUrl}`);
    if (!DRY_RUN) await db.execute("UPDATE video_jobs SET videoUrl = ? WHERE id = ?", [newUrl, row.id]);
    totalFixed++;
  }

  // ── 5. share_links.videoUrl و thumbnailUrl ────────────────────────────
  console.log("\n📋 فحص share_links...");
  const [links] = await db.execute("SELECT id, videoUrl, thumbnailUrl FROM share_links");
  for (const row of links) {
    let changed = false;
    let newVideoUrl = row.videoUrl;
    let newThumbUrl = row.thumbnailUrl;

    if (needsFix(row.videoUrl)) {
      newVideoUrl = buildPublicUrl(row.videoUrl);
      if (newVideoUrl) { console.log(`  🔧 share_link ${row.id} videoUrl: → ${newVideoUrl}`); changed = true; totalFixed++; }
    } else totalSkipped++;

    if (needsFix(row.thumbnailUrl)) {
      newThumbUrl = buildPublicUrl(row.thumbnailUrl);
      if (newThumbUrl) { console.log(`  🔧 share_link ${row.id} thumbnailUrl: → ${newThumbUrl}`); changed = true; totalFixed++; }
    } else totalSkipped++;

    if (changed && !DRY_RUN) {
      await db.execute(
        "UPDATE share_links SET videoUrl = ?, thumbnailUrl = ? WHERE id = ?",
        [newVideoUrl, newThumbUrl, row.id]
      );
    }
  }

  await db.end();

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ تم إصلاح: ${totalFixed} رابط`);
  console.log(`⏭️  تم تخطي (لا يحتاج إصلاح): ${totalSkipped} رابط`);
  if (DRY_RUN) console.log("\n⚠️  وضع المعاينة — لم يتم تطبيق أي تغييرات. أعد التشغيل بدون --dry-run للتطبيق.");
  else console.log("\n🎉 اكتملت عملية الإصلاح بنجاح!");
}

main().catch(err => {
  console.error("❌ خطأ:", err.message);
  process.exit(1);
});
