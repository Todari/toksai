import { describe, it, expect } from "vitest";
import { computeStats } from "./compute-stats";
import type { Message } from "../types";

function m(author: string, iso: string, text: string): Message {
  return { author, at: new Date(iso), text };
}

describe("computeStats", () => {
  it("총 메시지/기간/사람별 카운트를 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "안녕"),
      m("B", "2025-01-01T10:01:00", "ㅎㅇ"),
      m("A", "2025-01-03T10:00:00", "자니?"),
    ];
    const s = computeStats(msgs);
    expect(s.totalMessages).toBe(3);
    expect(s.perPerson["A"].messageCount).toBe(2);
    expect(s.perPerson["B"].messageCount).toBe(1);
    expect(s.durationDays).toBe(2);
  });

  it("6시간 이상 벌어진 뒤 먼저 보낸 메시지를 선톡으로 센다(첫 메시지 포함)", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "첫톡"),          // 선톡(A) - 첫 메시지
      m("B", "2025-01-01T10:05:00", "답"),            // 답장(B)
      m("A", "2025-01-01T20:00:00", "다시 선톡"),      // gap ~10h → 선톡(A)
      m("A", "2025-01-01T20:01:00", "연속"),          // gap 1m → 선톡 아님
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["A"].initiationCount).toBe(2);
    expect(s.perPerson["B"].initiationCount).toBe(0);
  });

  it("답장 텀은 화자 전환 && 간격<GAP인 경우만 표본에 넣고 중앙값을 낸다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "질문1"),
      m("B", "2025-01-01T10:00:20", "답1"),   // 20s
      m("A", "2025-01-01T10:01:00", "질문2"),
      m("B", "2025-01-01T10:01:40", "답2"),   // 40s
      m("A", "2025-01-02T10:00:00", "다음날"), // gap>6h → 표본 제외
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["B"].replyLatencyMedianSec).toBe(30); // median(20,40)
    expect(s.perPerson["A"].replyLatencyMedianSec).toBe(40); // A도 화자전환 후 응답 표본 1개(40s)
  });

  it("제3자 발화 경계를 건너뛴 화자 전환은 답장으로 세지 않는다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "단체방 질문"),
      { ...m("B", "2025-01-01T10:02:00", "다른 얘기"), contextBreakBefore: 2 },
    ];

    const s = computeStats(msgs);

    expect(s.perPerson["B"].replyLatencyMedianSec).toBeNull();
  });

  it("이모지/ㅋㅎ/물음표를 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "좋아😀😀 ㅋㅋㅋ 진짜?!"),
    ];
    const s = computeStats(msgs);
    expect(s.perPerson["A"].emojiCount).toBe(2);
    expect(s.perPerson["A"].laughCount).toBe(3);
    expect(s.perPerson["A"].questionCount).toBe(1);
    expect(s.perPerson["A"].exclamationCount).toBe(1);
  });

  it("시간대/요일 히트맵과 월별 볼륨을 만든다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "x"), // 수요일(3), 10시
      m("B", "2025-02-01T22:00:00", "y"), // 토요일(6), 22시
    ];
    const s = computeStats(msgs);
    expect(s.heatmap).toHaveLength(7);
    expect(s.heatmap[0]).toHaveLength(24);
    expect(s.heatmap[3][10]).toBe(1); // 2025-01-01 수요일(3) 10시
    expect(s.heatmap[6][22]).toBe(1); // 2025-02-01 토요일(6) 22시
    expect(s.monthly.map((mo) => mo.month)).toEqual(["2025-01", "2025-02"]);
    expect(s.monthly[0].perPerson["A"]).toBe(1);
  });
});
