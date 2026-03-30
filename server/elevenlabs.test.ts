import { describe, it, expect } from "vitest";

describe("ElevenLabs TTS Integration", () => {
  it("should have ELEVENLABS_API_KEY configured", () => {
    const key = process.env.ELEVENLABS_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should successfully generate Arabic TTS audio", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    const voiceId = "6LC8fQJu1Jg3bglhviXA"; // Mousa uae
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key!,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: "مرحباً، أنا موسى الذكي.",
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    expect(response.status).toBe(200);
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  }, 20000);
});
