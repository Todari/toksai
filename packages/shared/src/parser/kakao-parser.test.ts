import { describe, it, expect } from "vitest";
import { parseKakao } from "./kakao-parser";
import { ParseError } from "../types";

const SAMPLE = `Talk_2026.4.1 15:32-1.txt
저장한 날짜 : 2026. 5. 24. 오전 12:47



2025년 4월 4일 금요일
2025. 4. 4. 오후 11:42, 김승현 : 민성아
2025. 4. 4. 오후 11:42, 김승현 : 너근데 검사 언제옴 ㅡㅡ
2025. 4. 4. 오후 11:58, 곽민성 : 나 진짜
2025. 4. 4. 오후 11:58, 곽민성 : 만간 갈거야

2025년 4월 5일 토요일
2025. 4. 5. 오전 12:19, 김승현 : ㅃㄹ 해 ㅡㅡ
2025. 4. 5. 오전 8:20, 김승현 : 아~~왜5월~~`;

describe("parseKakao (iOS)", () => {
  it("파일 헤더/날짜 헤더/빈 줄을 건너뛰고 메시지만 추출한다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.messages).toHaveLength(6);
    expect(r.messages[0]).toMatchObject({ author: "김승현", text: "민성아" });
  });

  it("오후 11:42→23:42, 오전 12:19→00:19, 오전 8:20→08:20", () => {
    const r = parseKakao(SAMPLE);
    expect(r.messages[0].at.getHours()).toBe(23);
    expect(r.messages[0].at.getMinutes()).toBe(42);
    const midnight = r.messages.find((m) => m.text === "ㅃㄹ 해 ㅡㅡ")!;
    expect(midnight.at.getHours()).toBe(0);
    expect(midnight.at.getMinutes()).toBe(19);
    const morning = r.messages.find((m) => m.text.startsWith("아~~"))!;
    expect(morning.at.getHours()).toBe(8);
  });

  it("오후 12시=정오(12), 오전 12시=자정(0)", () => {
    const raw = `2025. 1. 1. 오후 12:00, 김승현 : 점심
2025. 1. 1. 오전 12:00, 곽민성 : 자정`;
    const r = parseKakao(raw);
    expect(r.messages[0].at.getHours()).toBe(12);
    expect(r.messages[1].at.getHours()).toBe(0);
  });

  it("메시지 줄이 아닌 다음 줄은 직전 메시지에 병합한다", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 첫줄
둘째줄
셋째줄
2025. 1. 1. 오후 1:01, 곽민성 : 답장`;
    const r = parseKakao(raw);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].text).toBe("첫줄\n둘째줄\n셋째줄");
  });

  it("날짜 구분선과 빈 줄은 이전 메시지에 붙지 않는다 (원본 오염 방지)", () => {
    const r = parseKakao(SAMPLE);
    const crossDay = r.messages.find((m) => m.author === "곽민성" && m.text.includes("만간"))!;
    expect(crossDay.text).toBe("만간 갈거야");
  });

  it("참가자를 등장 순서로 2명 추출하고 메시지 수를 센다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.participants.map((p) => p.rawName)).toEqual(["김승현", "곽민성"]);
    expect(r.participants.find((p) => p.rawName === "김승현")!.messageCount).toBe(4);
  });

  it("startedAt/endedAt를 첫/마지막 메시지 시각으로 채운다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.startedAt.getTime()).toBe(r.messages[0].at.getTime());
    expect(r.endedAt.getTime()).toBe(r.messages[r.messages.length - 1].at.getTime());
  });

  it("내용에 콜론이 있어도 첫 ' : '만 구분자로 쓴다", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 시간은 3 : 30이야
2025. 1. 1. 오후 1:01, 곽민성 : ㅇㅋ`;
    const r = parseKakao(raw);
    expect(r.messages[0].author).toBe("김승현");
    expect(r.messages[0].text).toBe("시간은 3 : 30이야");
  });

  it("화자가 1명이면 NOT_ONE_TO_ONE", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 혼잣말`;
    expect(() => parseKakao(raw)).toThrowError(ParseError);
    try { parseKakao(raw); } catch (e) { expect((e as ParseError).code).toBe("NOT_ONE_TO_ONE"); }
  });

  it("화자가 3명이면 NOT_ONE_TO_ONE", () => {
    const raw = `2025. 1. 1. 오후 1:00, A : 안녕
2025. 1. 1. 오후 1:01, B : 하이
2025. 1. 1. 오후 1:02, C : 반가워`;
    try { parseKakao(raw); } catch (e) { expect((e as ParseError).code).toBe("NOT_ONE_TO_ONE"); }
  });

  it("메시지가 없으면 NO_MESSAGES", () => {
    try { parseKakao("Talk_x.txt\n저장한 날짜 : 2026. 1. 1. 오전 1:00\n\n"); }
    catch (e) { expect((e as ParseError).code).toBe("NO_MESSAGES"); }
  });
});

describe("parseKakao (iOS, 24시간제·분할 zip)", () => {
  it("오전/오후 없는 24시간제 형식을 파싱한다", () => {
    const raw = `2026. 2. 22. 12:19, 신우 : 조식
2026. 2. 22. 23:45, 이마따전 🤯⚒️💙 : 야식
2026. 2. 23. 0:05, 신우 : 자정 넘김`;
    const r = parseKakao(raw);
    expect(r.messages).toHaveLength(3);
    expect(r.messages[0].at.getHours()).toBe(12);
    expect(r.messages[1].at.getHours()).toBe(23);
    expect(r.messages[2].at.getHours()).toBe(0);
  });

  it("BOM으로 시작하는 메시지 줄도 파싱한다", () => {
    const raw = `﻿2026. 2. 22. 오후 12:19, 신우 : 안녕
2026. 2. 22. 오후 12:20, 영희 : 하이`;
    expect(parseKakao(raw).messages).toHaveLength(2);
  });

  it("분할 파일 경계의 헤더 줄(BOM+파일명, 저장한 날짜)이 직전 메시지에 붙지 않는다", () => {
    const raw = `2026. 2. 22. 12:19, 신우 : 마지막 메시지
﻿Talk_2026.7.14 10:21-2.txt
저장한 날짜 : 2026. 7. 14. 10:41


2026년 2월 22일 일요일
2026. 2. 22. 12:30, 영희 : 다음 파일 첫 메시지`;
    const r = parseKakao(raw);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].text).toBe("마지막 메시지");
  });
});
