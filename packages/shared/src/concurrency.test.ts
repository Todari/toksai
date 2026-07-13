import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("결과를 입력 순서대로 반환한다", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("동시 실행 수가 limit을 넘지 않는다", async () => {
    let active = 0, peak = 0;
    await mapWithConcurrency(Array.from({ length: 8 }, (_, i) => i), 3, async () => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });
});
