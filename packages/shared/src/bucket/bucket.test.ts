import { describe, it, expect } from "vitest";
import { bucketByMonth, renderBucketText } from "./bucket";
import type { Message } from "../types";

const m = (a: string, iso: string, t: string): Message => ({ author: a, at: new Date(iso), text: t });

describe("bucketByMonth", () => {
  it("메시지를 월 단위로 그룹핑하고 시간순 유지", () => {
    const msgs = [
      m("A", "2025-01-05T10:00:00", "1월"),
      m("B", "2025-01-20T10:00:00", "1월2"),
      m("A", "2025-02-02T10:00:00", "2월"),
    ];
    const b = bucketByMonth(msgs);
    expect(b.map((x) => x.month)).toEqual(["2025-01", "2025-02"]);
    expect(b[0].messages).toHaveLength(2);
    expect(b[0].startedAt).toBe(msgs[0].at.toISOString());
    expect(b[0].endedAt).toBe(msgs[1].at.toISOString());
  });

  it("빈 입력은 빈 배열", () => {
    expect(bucketByMonth([])).toEqual([]);
  });
});

describe("renderBucketText", () => {
  it("이름: 내용 줄로 렌더", () => {
    const b = bucketByMonth([m("김", "2025-01-01T10:00:00", "안녕"), m("이", "2025-01-01T10:01:00", "하이")])[0];
    expect(renderBucketText(b)).toBe(
      "[2025-01-01 10:00] 김: 안녕\n[2025-01-01 10:01] 이: 하이",
    );
  });

  it("maxChars 초과 시 앞뒤를 보존하며 잘라낸다", () => {
    const many: Message[] = Array.from({ length: 500 }, (_, i) =>
      m(i % 2 ? "A" : "B", `2025-01-01T10:00:${String(i % 60).padStart(2, "0")}`, `msg${i}`));
    const b = bucketByMonth(many)[0];
    const out = renderBucketText(b, 200);
    expect(out.length).toBeLessThanOrEqual(200 + 40); // 여유(생략 표시 포함)
    expect(out).toContain("msg0");                    // 앞 보존
    expect(out).toContain("msg499");                  // 끝 보존
  });

  it("샘플링된 메시지는 홀로 떨어지지 않고 앞뒤 문맥과 함께 남는다", () => {
    const many: Message[] = Array.from({ length: 120 }, (_, i) =>
      m(i % 2 ? "A" : "B", `2025-01-01T10:${String(i % 60).padStart(2, "0")}:00`, `turn-${i}`));
    const out = renderBucketText(bucketByMonth(many)[0], 600);
    const indexes = [...out.matchAll(/turn-(\d+)/g)].map((match) => Number(match[1]));
    expect(indexes.some((value, i) => i > 0 && value === indexes[i - 1] + 1)).toBe(true);
    expect(out).toContain("중간 대화 생략");
  });
});
