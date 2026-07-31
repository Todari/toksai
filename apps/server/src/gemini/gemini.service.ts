import { Inject, Injectable, Optional } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { GEMINI_MODEL } from "@toksai/shared";
import type { LlmClient, LlmJsonRequest } from "./llm-client";

export const GEMINI_RETRY_DELAY_MS = Symbol("GEMINI_RETRY_DELAY_MS");

@Injectable()
export class GeminiService implements LlmClient {
  private client: GoogleGenAI | null = null;
  private readonly retryDelayMs: number;

  constructor(
    @Optional()
    @Inject(GEMINI_RETRY_DELAY_MS)
    retryDelayMs?: number,
  ) {
    this.retryDelayMs = retryDelayMs ?? 250;
  }

  private get genAI(): GoogleGenAI {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  async generateJson<T>(req: LlmJsonRequest, zodSchema: ZodType<T>): Promise<T> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.genAI.models.generateContent({
          model: GEMINI_MODEL,
          contents: req.prompt,
          config: {
            systemInstruction: req.systemInstruction,
            responseMimeType: "application/json",
            responseSchema: req.responseSchema as object,
            temperature: 0.4,
          },
        });
        return zodSchema.parse(JSON.parse(res.text ?? "null"));
      } catch (e) {
        lastErr = e;
        if (attempt < 2 && this.retryDelayMs > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelayMs * 2 ** attempt),
          );
        }
      }
    }
    throw new Error(`Gemini request failed after retries: ${String(lastErr)}`);
  }
}
