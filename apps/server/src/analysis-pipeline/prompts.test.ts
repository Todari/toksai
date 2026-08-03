import { describe, it, expect } from "vitest";
import { buildSynthesisPrompt } from "./prompts";

const people = {
  nickA: "승현",
  nickB: "민성",
  rawA: "김승현",
  rawB: "곽민성",
  mode: "direct" as const,
};

describe("buildSynthesisPrompt", () => {
  it("일방적 관계(짝사랑)를 숨기지 않고 판정하도록 지시한다", () => {
    const prompt = buildSynthesisPrompt({ ...people, statsSummary: "s", buckets: "[]" });
    expect(prompt).toContain("짝사랑");
    expect(prompt).toContain("일방적");
  });

  it("케미 지수가 상호적인 합 기준임을 명시한다", () => {
    const prompt = buildSynthesisPrompt({ ...people, statsSummary: "s", buckets: "[]" });
    expect(prompt).toContain("한쪽만");
  });

  it("단체방 관계 집중 모드는 직접 상호작용 근거만 쓰도록 지시한다", () => {
    const prompt = buildSynthesisPrompt({
      ...people,
      mode: "group-focus",
      statsSummary: "s",
      buckets: "[]",
    });

    expect(prompt).toContain("단체방 관계 집중 모드");
    expect(prompt).toContain("직접 근거가 부족하면");
  });
});
