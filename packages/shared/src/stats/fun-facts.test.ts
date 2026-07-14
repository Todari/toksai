import { describe, it, expect } from "vitest";
import { computeFunFacts } from "./fun-facts";
import type { Message } from "../types";

function m(author: string, iso: string, text: string): Message {
  return { author, at: new Date(iso), text };
}

describe("computeFunFacts", () => {
  it("골든타임: 요일×시 히트맵에서 최다 셀을 찾는다", () => {
    // 2025-01-01 is a Wednesday (weekday 3)
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "1"),
      m("B", "2025-01-01T10:05:00", "2"),
      m("A", "2025-01-01T10:10:00", "3"), // 3 msgs at weekday=3, hour=10
      m("A", "2025-01-02T11:00:00", "4"), // 1 msg weekday=4, hour=11
    ];
    const f = computeFunFacts(msgs);
    expect(f.goldenHour).toEqual({ weekday: 3, hour: 10, count: 3 });
  });

  it("폭풍수다데이: 하루(YYYY-MM-DD) 최다 메시지 날짜를 찾는다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "1"),
      m("B", "2025-01-01T20:00:00", "2"),
      m("A", "2025-01-01T21:00:00", "3"), // 3 on 2025-01-01
      m("A", "2025-01-02T11:00:00", "4"), // 1 on 2025-01-02
    ];
    const f = computeFunFacts(msgs);
    expect(f.busiestDay).toEqual({ date: "2025-01-01", count: 3 });
  });

  it("잠수이력: GAP_HOURS(6h) 이상 벌어진 최장 간격을 깬 사람/시각/메시지로 반환한다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "안녕"),
      m("B", "2025-01-01T10:05:00", "ㅎㅇ"), // gap 5m, not silence
      m("A", "2025-01-02T20:00:00", "오랜만"), // gap ~33h55m -> longest silence, broken by A
      m("B", "2025-01-02T20:10:00", "ㅇㅇ"), // gap 10m
    ];
    const f = computeFunFacts(msgs);
    expect(f.longestSilence).not.toBeNull();
    expect(f.longestSilence?.brokenBy).toBe("A");
    expect(f.longestSilence?.brokenAt).toBe(new Date("2025-01-02T20:00:00").toISOString());
    expect(f.longestSilence?.message).toBe("오랜만");
    expect(f.longestSilence?.gapHours).toBeCloseTo(33.92, 1);
  });

  it("잠수이력: 최장 간격도 GAP_HOURS 미만이면 null이다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "안녕"),
      m("B", "2025-01-01T10:05:00", "ㅎㅇ"),
      m("A", "2025-01-01T13:00:00", "점심"), // gap ~2h55m < 6h
    ];
    const f = computeFunFacts(msgs);
    expect(f.longestSilence).toBeNull();
  });

  it("밤샘 메시지 수: 0~4시(getHours 0..4) 메시지를 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T00:30:00", "1"), // 0시 -> 밤샘
      m("A", "2025-01-01T04:59:00", "2"), // 4시 -> 밤샘
      m("A", "2025-01-01T05:00:00", "3"), // 5시 -> 아님
      m("A", "2025-01-01T12:00:00", "4"), // 낮 -> 아님
    ];
    const f = computeFunFacts(msgs);
    expect(f.lateNightCount).toBe(2);
  });

  it("첫 대화: 첫 메시지의 시각/작성자/내용을 담는다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "첫인사"),
      m("B", "2025-01-01T10:05:00", "안녕"),
    ];
    const f = computeFunFacts(msgs);
    expect(f.firstMessage).toEqual({
      at: new Date("2025-01-01T10:00:00").toISOString(),
      author: "A",
      text: "첫인사",
    });
  });

  it("최애 이모지: 사람별 가장 빈번한 이모지를 찾고 없으면 null이다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "😀 좋아 😀"),
      m("A", "2025-01-01T10:01:00", "😀 또"),
      m("A", "2025-01-01T10:02:00", "😂"),
      m("B", "2025-01-01T10:03:00", "이모지 없음"),
    ];
    const f = computeFunFacts(msgs);
    expect(f.topEmoji["A"]).toBe("😀");
    expect(f.topEmoji["B"]).toBeNull();
  });

  it("대화 마무리 담당: 마지막 메시지이거나 다음 메시지와 간격이 GAP_HOURS 이상이면 세션 종료로 센다", () => {
    const msgs: Message[] = [
      m("A", "2025-01-01T10:00:00", "1"),
      m("B", "2025-01-01T10:05:00", "2"), // gap to next >= 6h -> ender
      m("A", "2025-01-02T20:00:00", "3"),
      m("B", "2025-01-02T20:05:00", "4"), // last message -> ender
    ];
    const f = computeFunFacts(msgs);
    expect(f.conversationEnder).toEqual({ B: 2 });
  });

  it("빈 입력: 안전한 기본값을 반환한다", () => {
    const f = computeFunFacts([]);
    expect(f.goldenHour).toEqual({ weekday: 0, hour: 0, count: 0 });
    expect(f.busiestDay).toEqual({ date: "", count: 0 });
    expect(f.longestSilence).toBeNull();
    expect(f.lateNightCount).toBe(0);
    expect(f.firstMessage).toEqual({ at: new Date(0).toISOString(), author: "", text: "" });
    expect(f.topEmoji).toEqual({});
    expect(f.conversationEnder).toEqual({});
  });
});
