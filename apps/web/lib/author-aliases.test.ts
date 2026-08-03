import { describe, expect, it } from "vitest";
import {
  buildAliasResolution,
  excludedAliases,
  groupAliases,
  initializeAliasGroups,
  initializeFocusGroups,
} from "./author-aliases";

const participants = [
  { rawName: "A", nickname: null },
  { rawName: "나", nickname: null },
  { rawName: "B", nickname: null },
];

describe("initializeAliasGroups", () => {
  it("서버 제안대로 예전·현재 이름을 같은 사람에 묶는다", () => {
    const result = initializeAliasGroups(participants, { A: "B", B: "B", 나: "나" });
    const groups = groupAliases(participants, result.assignment);

    expect(groups.map((group) => group.map((participant) => participant.rawName)))
      .toEqual([["A", "B"], ["나"]]);
    expect(result.groupNames).toEqual(["B", "나"]);
  });

  it("기존 2인 대화는 각자 독립된 그룹으로 유지한다", () => {
    const two = participants.slice(0, 2);
    const result = initializeAliasGroups(two, { A: "A", 나: "나" });

    expect(result.assignment).toEqual({ A: 0, 나: 1 });
  });
});

describe("buildAliasResolution", () => {
  it("사용자가 확인한 두 그룹을 API 별칭 매핑과 닉네임으로 변환한다", () => {
    const initial = initializeAliasGroups(participants, { A: "B", B: "B", 나: "나" });

    const result = buildAliasResolution(
      participants,
      initial.assignment,
      ["상대", "나"],
      initial.suggestedMap,
    );

    expect(result.authorAliasMap).toEqual({ A: "B", B: "B", 나: "나" });
    expect(result.nicknames).toEqual({ B: "상대", 나: "나" });
  });

  it("단체방에서는 선택하지 않은 참여자를 null로 제외한다", () => {
    const initial = initializeFocusGroups(participants);
    const assignment = { ...initial.assignment, A: 0 as const, 나: 1 as const };

    const result = buildAliasResolution(
      participants,
      assignment,
      ["상대", "나"],
      initial.suggestedMap,
    );

    expect(result.authorAliasMap).toEqual({ A: "A", 나: "나", B: null });
    expect(excludedAliases(participants, assignment).map((participant) => participant.rawName))
      .toEqual(["B"]);
  });

  it("한쪽이 빈 매핑은 생성하지 않는다", () => {
    expect(() => buildAliasResolution(
      participants,
      { A: 0, 나: 0, B: 0 },
      ["A", "나"],
      { A: "A", 나: "나", B: "B" },
    )).toThrow("EMPTY_ALIAS_GROUP");
  });
});

describe("initializeFocusGroups", () => {
  it("단체방 참여자는 처음에 모두 분석 제외 상태로 둔다", () => {
    const result = initializeFocusGroups(participants);

    expect(result.assignment).toEqual({ A: null, 나: null, B: null });
    expect(groupAliases(participants, result.assignment)).toEqual([[], []]);
  });

  it("자동 이름 변경 제안을 저장된 단체방 선택으로 오인하지 않는다", () => {
    const result = initializeFocusGroups(participants, { A: "B", B: "B", 나: "나" });

    expect(result.assignment).toEqual({ A: null, 나: null, B: null });
  });

  it("저장된 단체방 선택은 새로고침해도 복원한다", () => {
    const result = initializeFocusGroups(participants, { A: "A", 나: "나", B: null });

    expect(result.assignment).toEqual({ A: 0, 나: 1, B: null });
  });
});
