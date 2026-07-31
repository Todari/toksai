import { afterEach, describe, expect, it } from "vitest";
import { ResendInboundGateway } from "./resend-inbound.gateway";

const ORIGINAL_API_KEY = process.env.RESEND_API_KEY;

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = ORIGINAL_API_KEY;
  }
});

describe("ResendInboundGateway", () => {
  it("API 키가 아직 없어도 서버 부팅을 막지 않는다", () => {
    delete process.env.RESEND_API_KEY;

    expect(() => new ResendInboundGateway()).not.toThrow();
  });

  it("실제 Resend API 호출 시점에는 키 누락을 명확히 알린다", async () => {
    delete process.env.RESEND_API_KEY;
    const gateway = new ResendInboundGateway();

    await expect(gateway.listAttachments("email-1")).rejects.toThrow(
      "RESEND_API_NOT_CONFIGURED",
    );
  });
});
