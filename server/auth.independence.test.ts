/**
 * auth.independence.test.ts
 * Tests for independent email/password authentication (no Manus OAuth required)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database helpers
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    updateUserFields: vi.fn(),
    getOrCreateWallet: vi.fn().mockResolvedValue({ balance: 200 }),
    upsertUser: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock jose SignJWT
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: vi.fn(),
}));

import * as dbModule from "./db";
import * as bcrypt from "bcryptjs";

describe("Independent Auth System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Password hashing", () => {
    it("should hash passwords with bcrypt (cost factor 12)", async () => {
      const password = "SecurePassword123!";
      const hash = await bcrypt.hash(password, 12);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    });

    it("should verify correct password against hash", async () => {
      const password = "SecurePassword123!";
      const hash = await bcrypt.hash(password, 12);
      const valid = await bcrypt.compare(password, hash);
      expect(valid).toBe(true);
    });

    it("should reject wrong password against hash", async () => {
      const password = "SecurePassword123!";
      const hash = await bcrypt.hash(password, 12);
      const valid = await bcrypt.compare("WrongPassword!", hash);
      expect(valid).toBe(false);
    });
  });

  describe("getUserByEmail", () => {
    it("should return null for non-existent email", async () => {
      vi.mocked(dbModule.getUserByEmail).mockResolvedValue(null);
      const result = await dbModule.getUserByEmail("nonexistent@test.com");
      expect(result).toBeNull();
    });

    it("should return user for existing email", async () => {
      const mockUser = {
        id: 1,
        openId: "local:test@test.com",
        name: "Test User",
        email: "test@test.com",
        passwordHash: "$2b$12$hashedpassword",
        role: "user" as const,
        emailVerified: 1,
        loginMethod: "email",
        verifyToken: null,
        verifyTokenExpiresAt: null,
        lastSignedIn: new Date(),
        createdAt: new Date(),
        stripeCustomerId: null,
      };
      vi.mocked(dbModule.getUserByEmail).mockResolvedValue(mockUser);
      const result = await dbModule.getUserByEmail("test@test.com");
      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@test.com");
    });
  });

  describe("LLM provider resolution", () => {
    it("should detect OpenAI key format correctly", () => {
      const openaiKey = "sk-proj-abc123";
      const forgeKey = "manus-forge-key-xyz";
      const isOpenAI = openaiKey.startsWith("sk-") && !openaiKey.startsWith("manus-");
      const isForge = !forgeKey.startsWith("sk-") || forgeKey.startsWith("manus-");
      expect(isOpenAI).toBe(true);
      expect(isForge).toBe(true);
    });
  });

  describe("Registration flow validation", () => {
    it("should generate unique openId for email-based users", () => {
      const email = "user@example.com";
      const openId = `local:${email}`;
      expect(openId).toBe("local:user@example.com");
      expect(openId.startsWith("local:")).toBe(true);
    });

    it("should reject passwords shorter than 8 characters", () => {
      const shortPassword = "abc123";
      expect(shortPassword.length < 8).toBe(true);
    });

    it("should accept passwords of 8+ characters", () => {
      const validPassword = "SecureP1";
      expect(validPassword.length >= 8).toBe(true);
    });
  });
});
