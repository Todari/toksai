import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";
import { FileExtractService } from "./file-extract.service";

const svc = new FileExtractService();

describe("FileExtractService", () => {
  it("txt 버퍼를 문자열로 반환한다", () => {
    const text = "2025. 1. 1. 오후 1:00, A : 안녕";
    expect(svc.extractChatText(Buffer.from(text, "utf8"), "chat.txt")).toBe(text);
  });

  it("zip 내부의 첫 txt를 추출한다", () => {
    const zip = new AdmZip();
    zip.addFile("Talk_x.txt", Buffer.from("hello", "utf8"));
    expect(svc.extractChatText(zip.toBuffer(), "Kakaotalk.zip")).toBe("hello");
  });

  it("zip에 txt가 없으면 NO_TXT_IN_ZIP", () => {
    const zip = new AdmZip();
    zip.addFile("readme.md", Buffer.from("x", "utf8"));
    expect(() => svc.extractChatText(zip.toBuffer(), "a.zip")).toThrowError(/NO_TXT_IN_ZIP/);
  });

  it("지원하지 않는 확장자는 UNSUPPORTED_FILE", () => {
    expect(() => svc.extractChatText(Buffer.from("x"), "a.pdf")).toThrowError(/UNSUPPORTED_FILE/);
  });
});
