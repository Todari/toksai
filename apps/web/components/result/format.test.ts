import { describe, it, expect } from "vitest";
import { formatDuration, heatmapMax, badgeById } from "./format";

describe("format helpers", () => {
  it("formatDuration → D+n", () => {
    expect(formatDuration(0)).toBe("D+0");
    expect(formatDuration(123)).toBe("D+123");
  });
  it("heatmapMax → 최대 셀", () => {
    expect(heatmapMax([[0, 2], [5, 1]])).toBe(5);
    expect(heatmapMax([])).toBe(0);
  });
  it("badgeById → 카탈로그 조회", () => {
    expect(badgeById("first_texter")?.name).toBe("선톡왕");
    expect(badgeById("nope")).toBeUndefined();
  });
});
