// Test script for image generation using the correct endpoint
import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';

// Read env
let envVars = {};
try {
  const envContent = readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
  });
} catch(e) {}

const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY || envVars.BUILT_IN_FORGE_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || envVars.BUILT_IN_FORGE_API_URL || 'https://forge.manus.ai';

console.log('FORGE_API_KEY:', FORGE_API_KEY ? FORGE_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('FORGE_API_URL:', FORGE_API_URL);

if (!FORGE_API_KEY) {
  console.error('ERROR: BUILT_IN_FORGE_API_KEY not set');
  process.exit(1);
}

const baseUrl = FORGE_API_URL.endsWith('/') ? FORGE_API_URL : `${FORGE_API_URL}/`;
const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();

console.log('\nEndpoint:', fullUrl);
console.log('Generating image: "نملة تأكل آيس كريم"...\n');

const prompt = 'A macro cinematic shot of a tiny ant eating a colorful ice cream cone, photorealistic, detailed, dramatic lighting, close-up';

const body = JSON.stringify({
  prompt,
  original_images: []
});

const url = new URL(fullUrl);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'connect-protocol-version': '1',
    'authorization': `Bearer ${FORGE_API_KEY}`,
    'content-length': Buffer.byteLength(body)
  }
};

const lib = url.protocol === 'https:' ? https : http;
const startTime = Date.now();

const req = lib.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Status: ${res.statusCode} (took ${elapsed}s)`);
    try {
      const json = JSON.parse(data);
      if (json.image && json.image.b64Json) {
        const size = Math.round(json.image.b64Json.length * 0.75 / 1024);
        console.log(`\n✅ SUCCESS! Image generated:`);
        console.log(`   - Format: ${json.image.mimeType}`);
        console.log(`   - Size: ~${size} KB`);
        console.log(`   - Base64 length: ${json.image.b64Json.length} chars`);
        
        // Save to file for viewing
        import('fs').then(fs => {
          const buf = Buffer.from(json.image.b64Json, 'base64');
          fs.writeFileSync('/tmp/test_ant_icecream.png', buf);
          console.log(`   - Saved to: /tmp/test_ant_icecream.png`);
        });
      } else if (json.error) {
        console.log(`\n❌ ERROR: ${json.error}`);
      } else {
        console.log('Response:', JSON.stringify(json, null, 2).substring(0, 500));
      }
    } catch(e) {
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.setTimeout(60000, () => {
  console.error('Request timed out after 60s');
  req.destroy();
});
req.write(body);
req.end();
