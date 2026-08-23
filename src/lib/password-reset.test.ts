import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createResetToken,
  parseResetToken,
  verifyResetToken,
} from "./password-reset";

const user = { id: "clx123abc456", password: "$2a$12$fakehashfakehashfakeha" };

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = "test-secret";
});

describe("createResetToken / verifyResetToken", () => {
  it("round-trips a valid token", () => {
    const token = createResetToken(user);
    const parsed = parseResetToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed!.userId).toBe(user.id);
    expect(verifyResetToken(parsed!, user.password)).toBe(true);
  });

  it("rejects a token after the password changes (single-use)", () => {
    const token = createResetToken(user);
    const parsed = parseResetToken(token)!;
    expect(verifyResetToken(parsed, "$2a$12$differenthashentirely00")).toBe(
      false
    );
  });

  it("rejects an expired token", () => {
    const token = createResetToken(user);
    const parsed = parseResetToken(token)!;
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61 * 60 * 1000);
    expect(verifyResetToken(parsed, user.password)).toBe(false);
    vi.useRealTimers();
  });

  it("rejects a tampered payload", () => {
    const token = createResetToken(user);
    const [payload, sig] = token.split(".");
    const otherPayload = Buffer.from(
      `otheruser.${Date.now() + 60 * 60 * 1000}`,
      "utf8"
    ).toString("base64url");
    const forged = parseResetToken(`${otherPayload}.${sig}`);
    expect(forged).not.toBeNull();
    expect(verifyResetToken(forged!, user.password)).toBe(false);
    // Original payload with a truncated signature also fails.
    const clipped = parseResetToken(`${payload}.${sig.slice(0, -2)}`)!;
    expect(verifyResetToken(clipped, user.password)).toBe(false);
  });

  it("rejects a token signed with a different server secret", () => {
    const token = createResetToken(user);
    process.env.NEXTAUTH_SECRET = "rotated-secret";
    const parsed = parseResetToken(token)!;
    expect(verifyResetToken(parsed, user.password)).toBe(false);
  });

  it("returns null for malformed tokens", () => {
    expect(parseResetToken("")).toBeNull();
    expect(parseResetToken("no-dot")).toBeNull();
    expect(parseResetToken("a.b.c")).toBeNull();
    expect(parseResetToken(`${Buffer.from("nodothere").toString("base64url")}.sig`)).toBeNull();
  });

  it("throws when NEXTAUTH_SECRET is missing", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => createResetToken(user)).toThrow(/NEXTAUTH_SECRET/);
  });
});
