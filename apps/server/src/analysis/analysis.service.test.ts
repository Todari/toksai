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
    const runner = { run: async () => {} } as any;
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);

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
    const runner = { run: async () => {} } as any;
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);
    await expect(
      svc.createFromUpload(Buffer.from(`2025. 1. 1. 오후 1:00, A : 혼잣말`), "c.txt"),
    ).rejects.toThrow();
  });

  it("메일 첨부는 sourceType을 email로 기록한다", async () => {
    const prisma = makePrismaMock();
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const runner = { run: async () => {} } as any;
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);

    await svc.createFromFile(Buffer.from(SAMPLE, "utf8"), "chat.txt", "email");

    expect(prisma.analysis.create.mock.calls[0][0].data.sourceType).toBe("email");
  });
});

describe("AnalysisService.start", () => {
  it("동시에 두 번 호출돼도 분석 러너는 한 번만 시작한다", async () => {
    let claimed = false;
    const prisma = {
      analysis: {
        findUnique: vi.fn(async () => ({
          id: "a1",
          status: claimed ? "ANALYZING" : "IDENTIFYING",
          attemptCount: claimed ? 1 : 0,
          heartbeatAt: claimed ? new Date() : null,
        })),
        updateMany: vi.fn(async () => {
          if (claimed) return { count: 0 };
          claimed = true;
          return { count: 1 };
        }),
      },
    } as any;
    const runner = { run: vi.fn(async () => {}) } as any;
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);

    await Promise.all([svc.start("admin", "127.0.0.1"), svc.start("admin", "127.0.0.1")]);

    expect(runner.run).toHaveBeenCalledTimes(1);
  });

  it("완료된 분석은 다시 실행하지 않는다", async () => {
    const prisma = {
      analysis: {
        findUnique: vi.fn(async () => ({
          id: "a1", status: "DONE", attemptCount: 1, heartbeatAt: null,
        })),
        updateMany: vi.fn(),
      },
    } as any;
    const runner = { run: vi.fn(async () => {}) } as any;
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto, runner);

    await expect(svc.start("admin", "127.0.0.1")).resolves.toEqual({ ok: true });
    expect(runner.run).not.toHaveBeenCalled();
  });
});
