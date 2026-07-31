import { describe, expect, it, vi } from "vitest";
import { EmailIntakeService } from "./email-intake.service";
import { RateLimitService } from "../common/rate-limit.service";

const EVENT = {
  type: "email.received",
  created_at: new Date().toISOString(),
  data: {
    email_id: "email-1",
    created_at: new Date().toISOString(),
    from: "sender@example.com",
    to: [] as string[],
    bcc: [],
    cc: [],
    received_for: [],
    message_id: "message-1",
    subject: "KakaoTalk Chats",
    attachments: [],
  },
} as const;

function makePrisma() {
  const records = new Map<string, any>();
  return {
    records,
    emailIntake: {
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: "intake-1",
          status: "WAITING",
          sourceEmailId: null,
          analysisId: null,
          errorCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        records.set(row.token, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where, include }: any) => {
        const row = where.token
          ? records.get(where.token)
          : [...records.values()].find((item) => item.id === where.id);
        if (!row) return null;
        if (include?.analysis) return { ...row, analysis: row.analysis ?? null };
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const row = [...records.values()].find((item) => item.id === where.id);
        if (!row || row.status !== where.status) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = [...records.values()].find((item) => item.id === where.id);
        Object.assign(row, data);
        if (data.analysisId) {
          row.analysis = {
            id: data.analysisId,
            viewToken: "view-1",
            adminToken: "admin-1",
          };
        }
        return row;
      }),
    },
  } as any;
}

describe("EmailIntakeService", () => {
  it("분석마다 추측하기 어려운 전용 수신 주소를 발급한다", async () => {
    const prisma = makePrisma();
    const service = new EmailIntakeService(
      prisma,
      {} as any,
      new RateLimitService(),
      {} as any,
    );

    const intake = await service.create("client-1");

    expect(intake.token).toMatch(/^[a-f0-9]{32}$/);
    expect(intake.address).toBe(`analysis-${intake.token}@talk.todari.dev`);
    expect(new Date(intake.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("서명된 수신 이벤트의 첨부를 기존 분석 생성 흐름에 연결한다", async () => {
    const prisma = makePrisma();
    const analysis = {
      createFromFile: vi.fn(async () => ({
        id: "analysis-1",
        viewToken: "view-1",
        adminToken: "admin-1",
      })),
    };
    const gateway = {
      verify: vi.fn(),
      listAttachments: vi.fn(async () => [
        {
          filename: "KakaoTalk_Chats.zip",
          size: 100,
          content_disposition: "attachment",
          download_url: "https://example.com/chat.zip",
        },
      ]),
      download: vi.fn(async () => Buffer.from("zip")),
    };
    const service = new EmailIntakeService(
      prisma,
      analysis as any,
      new RateLimitService(),
      gateway as any,
    );
    const intake = await service.create("client-1");
    gateway.verify.mockReturnValue({
      ...EVENT,
      data: { ...EVENT.data, to: [intake.address] },
    });

    await service.handleWebhook("{}", {
      id: "webhook-1",
      timestamp: "1",
      signature: "signature",
    });

    expect(analysis.createFromFile).toHaveBeenCalledWith(
      Buffer.from("zip"),
      "KakaoTalk_Chats.zip",
      "email",
    );
    expect(gateway.download).toHaveBeenCalledWith(
      "https://example.com/chat.zip",
      20 * 1024 * 1024,
    );
    await expect(service.getStatus(intake.token)).resolves.toMatchObject({
      status: "READY",
      viewToken: "view-1",
      adminToken: "admin-1",
    });
  });

  it("지원 파일이 없으면 AI 분석을 시작하지 않고 사용자 오류 상태로 남긴다", async () => {
    const prisma = makePrisma();
    const analysis = { createFromFile: vi.fn() };
    const gateway = {
      verify: vi.fn(),
      listAttachments: vi.fn(async () => [
        {
          filename: "image.png",
          size: 100,
          content_disposition: "attachment",
          download_url: "https://example.com/image.png",
        },
      ]),
      download: vi.fn(),
    };
    const service = new EmailIntakeService(
      prisma,
      analysis as any,
      new RateLimitService(),
      gateway as any,
    );
    const intake = await service.create("client-1");
    gateway.verify.mockReturnValue({
      ...EVENT,
      data: { ...EVENT.data, to: [intake.address] },
    });

    await service.handleWebhook("{}", {
      id: "webhook-1",
      timestamp: "1",
      signature: "signature",
    });

    expect(analysis.createFromFile).not.toHaveBeenCalled();
    await expect(service.getStatus(intake.token)).resolves.toMatchObject({
      status: "FAILED",
      errorCode: "EMAIL_NO_SUPPORTED_FILE",
    });
  });
});
