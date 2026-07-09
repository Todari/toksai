import { describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { AnalysisService } from "./analysis.service";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";

const SAMPLE = `2025. 4. 4. 오후 11:42, 김승현 : 민성아
2025. 4. 5. 오전 12:19, 곽민성 : 나 진짜`;

function makePrismaMock() {
  const store: any = {};
  return {
    analysis: {
      create: vi.fn(async ({ data }: any) => {
        store.analysis = { id: "a1", ...data };
        return store.analysis;
      }),
    },
  } as any;
}

describe("AnalysisService.createFromUpload", () => {
  it("파싱 성공 시 토큰과 함께 생성하고 원본을 암호문으로 저장한다", async () => {
    const prisma = makePrismaMock();
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto);

    const r = await svc.createFromUpload(Buffer.from(SAMPLE, "utf8"), "chat.txt");

    expect(r.viewToken).toBeTruthy();
    expect(r.adminToken).toBeTruthy();
    const createArg = prisma.analysis.create.mock.calls[0][0].data;
    expect(JSON.stringify(createArg)).not.toContain("민성아"); // 평문 저장 금지
    expect(createArg.participants.create).toHaveLength(2);
  });

  it("1:1이 아니면 에러를 전파한다", async () => {
    const prisma = makePrismaMock();
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto);
    await expect(
      svc.createFromUpload(Buffer.from(`2025. 1. 1. 오후 1:00, A : 혼잣말`), "c.txt"),
    ).rejects.toThrow();
  });
});
