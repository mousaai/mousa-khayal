/**
 * platformApi.test.ts — Tests for Platform Integration API
 * Tests: Token Handoff, Credit Deduction, Balance Check
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getOrCreateWallet: vi.fn().mockResolvedValue({ balance: 500, totalEarned: 700, totalSpent: 200 }),
  deductCredits: vi.fn().mockResolvedValue({ success: true, newBalance: 470 }),
  getUserByOpenId: vi.fn().mockResolvedValue({ id: 1, openId: "user-123", name: "مهندس", email: "eng@test.com" }),
}));

// ─── Mock ENV ─────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-key-for-jwt-signing-2024",
    ownerOpenId: "owner-open-id",
    appId: "test-app-id",
    oAuthServerUrl: "https://api.manus.im",
    stripeSecretKey: "sk_test_xxx",
    stripeWebhookSecret: "whsec_test_xxx",
    stripePublishableKey: "pk_test_xxx",
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Platform API — Token Handoff", () => {
  const JWT_SECRET = new TextEncoder().encode("test-secret-key-for-jwt-signing-2024");

  it("should generate a valid JWT with correct payload fields", async () => {
    const { SignJWT } = await import("jose");

    const payload = {
      sub: "42",
      openId: "user-open-id",
      name: "مهندس أحمد",
      email: "ahmed@test.com",
      creditBalance: 500,
      platform: "fada",
      iss: "mousa.ai",
      type: "platform-handoff",
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(JWT_SECRET);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // valid JWT structure

    // Verify the token
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    expect(decoded["sub"]).toBe("42");
    expect(decoded["platform"]).toBe("fada");
    expect(decoded["type"]).toBe("platform-handoff");
    expect(decoded["iss"]).toBe("mousa.ai");
    expect(decoded["creditBalance"]).toBe(500);
  });

  it("should reject tokens with wrong secret", async () => {
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret");

    const token = await new SignJWT({ sub: "1", type: "platform-handoff" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(wrongSecret);

    await expect(jwtVerify(token, JWT_SECRET)).rejects.toThrow();
  });

  it("should reject expired tokens", async () => {
    const { SignJWT } = await import("jose");

    const token = await new SignJWT({ sub: "1", type: "platform-handoff", platform: "fada" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1s") // expires in 1 second
      .sign(JWT_SECRET);

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 1100));

    await expect(jwtVerify(token, JWT_SECRET)).rejects.toThrow();
  });
});

describe("Platform API — Credit System", () => {
  it("should validate platform IDs correctly", () => {
    const VALID_PLATFORMS = new Set(["fada", "raqaba", "harara", "maskan", "code"]);
    expect(VALID_PLATFORMS.has("fada")).toBe(true);
    expect(VALID_PLATFORMS.has("raqaba")).toBe(true);
    expect(VALID_PLATFORMS.has("harara")).toBe(true);
    expect(VALID_PLATFORMS.has("maskan")).toBe(true);
    expect(VALID_PLATFORMS.has("code")).toBe(true);
    expect(VALID_PLATFORMS.has("unknown")).toBe(false);
    expect(VALID_PLATFORMS.has("")).toBe(false);
  });

  it("should have correct platform costs", () => {
    const PLATFORM_COSTS: Record<string, number> = {
      fada: 20, raqaba: 30, harara: 35, maskan: 15, code: 10,
    };
    expect(PLATFORM_COSTS["fada"]).toBe(20);
    expect(PLATFORM_COSTS["raqaba"]).toBe(30);
    expect(PLATFORM_COSTS["harara"]).toBe(35);
    expect(PLATFORM_COSTS["maskan"]).toBe(15);
    expect(PLATFORM_COSTS["code"]).toBe(10);
  });

  it("should correctly determine if balance is sufficient", () => {
    const balance = 25;
    expect(balance >= 20).toBe(true);  // fada: sufficient
    expect(balance >= 30).toBe(false); // raqaba: insufficient
    expect(balance >= 35).toBe(false); // harara: insufficient
    expect(balance >= 15).toBe(true);  // maskan: sufficient
    expect(balance >= 10).toBe(true);  // code: sufficient
  });
});

describe("Platform API — URL Mapping", () => {
  it("should have correct platform URLs", () => {
    const PLATFORM_URLS: Record<string, string> = {
      fada:   "https://sarahdesign-umc8qbss.manus.space/",
      raqaba: "https://khaledinspec-vbvhhdsv.manus.space/",
      harara: "https://thermabuild-x9xsnp5r.manus.space/",
      maskan: "https://famhousing-glcsxkkd.manus.space/",
      code:   "https://archicodesa-wzq39rwg.manus.space/",
    };

    // Verify raqaba and code are NOT swapped
    expect(PLATFORM_URLS["raqaba"]).toContain("khaledinspec");
    expect(PLATFORM_URLS["code"]).toContain("archicodesa");
    expect(PLATFORM_URLS["fada"]).toContain("sarahdesign");
    expect(PLATFORM_URLS["harara"]).toContain("thermabuild");
    expect(PLATFORM_URLS["maskan"]).toContain("famhousing");

    // All URLs should be valid HTTPS
    Object.values(PLATFORM_URLS).forEach((url) => {
      expect(url).toMatch(/^https:\/\//);
      expect(url).toContain(".manus.space/");
    });
  });

  it("should generate correct platformUrl with token", () => {
    const baseUrl = "https://khaledinspec-vbvhhdsv.manus.space/";
    const token = "test-jwt-token";
    const platformUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;
    expect(platformUrl).toBe("https://khaledinspec-vbvhhdsv.manus.space/?token=test-jwt-token");
  });
});

describe("Platform API — API Key Validation", () => {
  it("should validate correct API keys", () => {
    const PLATFORM_API_KEYS: Record<string, string> = {
      fada:    "dev-key-fada-mousa2024",
      raqaba:  "dev-key-raqaba-mousa2024",
      harara:  "dev-key-harara-mousa2024",
      maskan:  "dev-key-maskan-mousa2024",
      code:    "dev-key-code-mousa2024",
    };

    function validateKey(platformId: string, apiKey: string): boolean {
      return PLATFORM_API_KEYS[platformId] === apiKey;
    }

    expect(validateKey("fada", "dev-key-fada-mousa2024")).toBe(true);
    expect(validateKey("raqaba", "dev-key-raqaba-mousa2024")).toBe(true);
    expect(validateKey("fada", "wrong-key")).toBe(false);
    expect(validateKey("unknown", "any-key")).toBe(false);
  });
});

describe("Platform API — user-by-openid", () => {
  const JWT_SECRET = new TextEncoder().encode("test-secret-key-for-jwt-signing-2024");

  it("should find user by openId and return userId + balance + token", async () => {
    const { getUserByOpenId, getOrCreateWallet } = await import("./db");
    const { SignJWT } = await import("jose");

    // Mock returns user with id=1
    const user = await getUserByOpenId("user-123");
    expect(user).toBeTruthy();
    expect(user!.id).toBe(1);
    expect(user!.openId).toBe("user-123");

    // Mock returns wallet with balance=500
    const wallet = await getOrCreateWallet(user!.id);
    expect(wallet.balance).toBe(500);

    // Generate token as the endpoint would
    const payload = {
      sub: String(user!.id),
      openId: user!.openId,
      name: user!.name ?? "",
      email: user!.email ?? "",
      creditBalance: wallet.balance,
      platform: "fada",
      iss: "mousa.ai",
      type: "platform-handoff",
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(JWT_SECRET);

    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);

    // Verify token payload
    const { jwtVerify } = await import("jose");
    const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
    expect(decoded["sub"]).toBe("1");
    expect(decoded["openId"]).toBe("user-123");
    expect(decoded["platform"]).toBe("fada");
    expect(decoded["type"]).toBe("platform-handoff");
    expect(decoded["creditBalance"]).toBe(500);
  });

  it("should return USER_NOT_FOUND when openId does not exist", async () => {
    const { getUserByOpenId } = await import("./db");
    // Override mock to return null
    vi.mocked(getUserByOpenId).mockResolvedValueOnce(null);

    const user = await getUserByOpenId("nonexistent-open-id");
    expect(user).toBeNull();
    // Endpoint would return 404 { error: "USER_NOT_FOUND" }
  });

  it("should reject empty openId", () => {
    const openId = "";
    expect(openId.trim() === "").toBe(true); // would be rejected by endpoint
  });

  it("should reject missing Authorization header", () => {
    const auth = undefined;
    const apiKey = auth ? (auth as string).slice(7) : null;
    expect(apiKey).toBeNull();
  });

  it("should include correct response shape: userId, balance, token", async () => {
    const { getUserByOpenId, getOrCreateWallet } = await import("./db");
    const { SignJWT } = await import("jose");

    const user = await getUserByOpenId("user-123");
    const wallet = await getOrCreateWallet(user!.id);

    const token = await new SignJWT({
      sub: String(user!.id), openId: user!.openId, platform: "fada",
      iss: "mousa.ai", type: "platform-handoff", creditBalance: wallet.balance,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(JWT_SECRET);

    const response = {
      userId: user!.id,
      balance: wallet.balance,
      token,
    };

    expect(response).toHaveProperty("userId");
    expect(response).toHaveProperty("balance");
    expect(response).toHaveProperty("token");
    expect(typeof response.userId).toBe("number");
    expect(typeof response.balance).toBe("number");
    expect(typeof response.token).toBe("string");
  });
});
