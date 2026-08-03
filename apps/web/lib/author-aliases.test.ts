import { describe, expect, it } from "vitest";
import {
  buildAliasResolution,
  groupAliases,
  initializeAliasGroups,
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

  it("한쪽이 빈 매핑은 생성하지 않는다", () => {
    expect(() => buildAliasResolution(
      participants,
      { A: 0, 나: 0, B: 0 },
      ["A", "나"],
      { A: "A", 나: "나", B: "B" },
    )).toThrow("EMPTY_ALIAS_GROUP");
  });
});
