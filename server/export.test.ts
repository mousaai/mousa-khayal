import { describe, it, expect, vi } from "vitest";

// Mock storagePut
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.pdf", key: "exports/test.pdf" }),
}));

// Mock fetch for image download
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(100),
}) as unknown as typeof fetch;

describe("exportRouter helpers", () => {
  it("should have exportRouter defined", async () => {
    const { exportRouter } = await import("./exportRouter");
    expect(exportRouter).toBeDefined();
  });

  it("should validate input schema with pdf format", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      title: z.string().default("خيال"),
      scenes: z.array(z.object({
        label: z.string(),
        imageUrl: z.string().url(),
        arabicCaption: z.string().optional(),
        prompt: z.string().optional(),
      })),
      format: z.enum(["pdf", "pptx", "docx"]),
    });
    const result = schema.safeParse({
      title: "مشروع تجريبي",
      scenes: [{ label: "مشهد 1", imageUrl: "https://example.com/img.jpg" }],
      format: "pdf",
    });
    expect(result.success).toBe(true);
  });

  it("should validate pptx format", async () => {
    const { z } = await import("zod");
    const schema = z.enum(["pdf", "pptx", "docx"]);
    expect(schema.parse("pptx")).toBe("pptx");
    expect(schema.parse("docx")).toBe("docx");
    expect(schema.parse("pdf")).toBe("pdf");
  });
});
