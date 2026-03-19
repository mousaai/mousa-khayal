const API_KEY = process.env.RUNWAY_API_KEY;
const BASE_URL = "https://api.dev.runwayml.com/v1";

// صورة PNG 1x1 بسيطة
const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

console.log("Testing Runway uploads endpoint...");

// Step 1: Init upload
const initResp = await fetch(`${BASE_URL}/uploads`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  },
  body: JSON.stringify({
    filename: "test.png",
    contentType: "image/png",
    fileSize: pngBuffer.byteLength,
    type: "ephemeral",
  }),
});

const initData = await initResp.json();
console.log(`Init (${initResp.status}):`, JSON.stringify(initData).substring(0, 400));

if (!initResp.ok) process.exit(1);

const { uploadUrl, fields, id } = initData;
console.log("ID:", id, "| Fields:", Object.keys(fields || {}));

// Step 2: Upload using multipart form (native FormData in Node 22)
const formData = new FormData();
for (const [key, value] of Object.entries(fields || {})) {
  formData.append(key, value);
}
// إضافة الملف
const blob = new Blob([pngBuffer], { type: "image/png" });
formData.append("file", blob, "test.png");

const uploadResp = await fetch(uploadUrl, {
  method: "POST",
  body: formData,
});
const uploadText = await uploadResp.text();
console.log(`S3 upload (${uploadResp.status}):`, uploadText.substring(0, 200));

// Step 3: Complete upload
if (id) {
  const completeResp = await fetch(`${BASE_URL}/uploads/${id}/complete`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
  });
  const completeData = await completeResp.json();
  console.log(`Complete (${completeResp.status}):`, JSON.stringify(completeData).substring(0, 300));
} else {
  console.log("Full init data:", JSON.stringify(initData));
}
