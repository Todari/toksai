import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(keyBase64 = process.env.ENCRYPTION_KEY ?? "") {
    const key = Buffer.from(keyBase64, "base64");
    if (key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (base64)");
    }
    this.key = key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, ctB64] = payload.split(":");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  }
}
