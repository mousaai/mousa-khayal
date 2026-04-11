/**
 * google.ai.test.ts — اختبار Google AI Key صحيح
 */
import { describe, it, expect } from "vitest";
import { GoogleGenAI } from "@google/genai";

describe("Google AI Key", () => {
  it("should connect to Gemini 2.5 Flash successfully", async () => {
    const key = process.env.GOOGLE_AI_KEY;
    expect(key, "GOOGLE_AI_KEY must be set").toBeTruthy();

    const client = new GoogleGenAI({ apiKey: key! });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: VERIFIED" }] }],
      config: { maxOutputTokens: 200 },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    expect(text.trim().length).toBeGreaterThan(0);
    console.log("✓ Gemini response:", text.trim());
  }, 30_000);
});
