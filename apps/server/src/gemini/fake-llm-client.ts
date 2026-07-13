import type { ZodType } from "zod";
import type { LlmClient, LlmJsonRequest } from "./llm-client";

// 각 호출마다 handler를 순서대로 소비. handler는 prompt를 받아 임의 객체 반환.
export class FakeLlmClient implements LlmClient {
  private calls = 0;
  constructor(private readonly handlers: Array<(req: LlmJsonRequest) => unknown>) {}

  async generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T> {
    const h = this.handlers[Math.min(this.calls, this.handlers.length - 1)];
    this.calls++;
    return zodSchema.parse(h(req));
  }
}
