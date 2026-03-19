import { config } from 'dotenv';
config();

const replicateToken = process.env.REPLICATE_API_TOKEN;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;

async function test() {
  console.log('Testing Replicate...');
  try {
    const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + replicateToken,
        'prefer': 'wait=5'
      },
      body: JSON.stringify({
        input: { prompt: 'test', width: 512, height: 512, num_outputs: 1, output_format: 'webp', num_inference_steps: 4 }
      })
    });
    if (res.status >= 400) {
      const err = await res.text();
      throw new Error('Replicate failed (' + res.status + '): ' + err.slice(0, 100));
    }
    const data = await res.json();
    console.log('Replicate OK, status:', data.status);
  } catch (err) {
    console.log('Replicate failed:', err.message.slice(0, 100));
    console.log('Trying Manus fallback...');
    const baseUrl = forgeUrl.endsWith('/') ? forgeUrl : forgeUrl + '/';
    const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();
    const manusRes = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'connect-protocol-version': '1',
        'authorization': 'Bearer ' + forgeKey
      },
      body: JSON.stringify({ prompt: 'a beautiful sunset', original_images: [] })
    });
    console.log('Manus status:', manusRes.status);
    if (manusRes.ok) {
      const data = await manusRes.json();
      console.log('Manus fallback SUCCESS! Image b64 length:', data.image?.b64Json?.length);
    } else {
      console.log('Manus fallback FAILED:', (await manusRes.text()).slice(0, 100));
    }
  }
}

test().catch(e => console.error('Fatal:', e.message));
