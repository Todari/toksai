import { afterEach, describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { GeminiService } from "./gemini.service";
import { FakeLlmClient } from "./fake-llm-client";

describe("GeminiService", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("GEMINI_API_KEY 없으면 호출 시 throw", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const svc = new GeminiService();
    await expect(
      svc.generateJson({ systemInstruction: "s", prompt: "p", responseSchema: {} }, z.any()),
    ).rejects.toThrow(/GEMINI_API_KEY/);
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  });

  it("일시적인 API 실패도 재시도한다", async () => {
    process.env.GEMINI_API_KEY = "test";
    const generateContent = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const svc = new GeminiService(0);
    (svc as unknown as { client: unknown }).client = { models: { generateContent } };

    await expect(
      svc.generateJson(
        { systemInstruction: "s", prompt: "p", responseSchema: {} },
        z.object({ ok: z.boolean() }),
      ),
    ).resolves.toEqual({ ok: true });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe("FakeLlmClient", () => {
  it("핸들러 반환을 zod로 검증해 돌려준다", async () => {
    const fake = new FakeLlmClient([() => ({ n: 1 })]);
    const out = await fake.generateJson(
      { systemInstruction: "", prompt: "", responseSchema: {} },
      z.object({ n: z.number() }),
    );
    expect(out).toEqual({ n: 1 });
  });
});
