import type { ZodType } from "zod";

export interface LlmJsonRequest {
  systemInstruction: string;
  prompt: string;
  responseSchema: unknown;
}

export interface LlmClient {
  generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T>;
}
