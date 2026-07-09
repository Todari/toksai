import { describe, it, expect } from "vitest";
import { generateToken } from "./token.util";

describe("generateToken", () => {
  it("base64url 문자만 포함한다", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("호출마다 고유하다", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(set.size).toBe(100);
  });
  it("충분히 길다(24바이트 → 32자 이상)", () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(32);
  });
});
