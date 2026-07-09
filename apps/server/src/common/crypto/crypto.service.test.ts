import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { CryptoService } from "./crypto.service";

const KEY = randomBytes(32).toString("base64");

describe("CryptoService", () => {
  it("암호화 후 복호화하면 원문이 복원된다", () => {
    const svc = new CryptoService(KEY);
    const plain = "김승현 : 민성아\n곽민성 : 나 진짜";
    const enc = svc.encrypt(plain);
    expect(enc).not.toContain("민성아");
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it("매 암호화마다 IV가 달라 결과가 다르다", () => {
    const svc = new CryptoService(KEY);
    expect(svc.encrypt("x")).not.toBe(svc.encrypt("x"));
  });

  it("변조된 암호문은 복호화에 실패한다", () => {
    const svc = new CryptoService(KEY);
    const enc = svc.encrypt("secret");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "B" : "A");
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
