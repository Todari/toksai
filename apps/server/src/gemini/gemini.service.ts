import { Injectable } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
import { GEMINI_MODEL } from "@toksai/shared";
import type { LlmClient, LlmJsonRequest } from "./llm-client";

@Injectable()
export class GeminiService implements LlmClient {
  private client: GoogleGenAI | null = null;

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
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
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
      try {
        return zodSchema.parse(JSON.parse(res.text ?? "null"));
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`Gemini JSON validation failed: ${String(lastErr)}`);
  }
}
