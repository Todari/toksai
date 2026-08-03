import type { AuthorAliasMap } from "@toksai/api";

export type AliasGroupIndex = 0 | 1;
export type AliasAssignment = AliasGroupIndex | null;

export interface AliasParticipant {
  rawName: string;
  nickname: string | null;
}

export interface InitialAliasGroups {
  suggestedMap: AuthorAliasMap;
  assignment: Record<string, AliasAssignment>;
  groupNames: [string, string];
}

export function initializeAliasGroups(
  participants: AliasParticipant[],
  suggested?: AuthorAliasMap,
): InitialAliasGroups {
  const rawNames = participants.map((participant) => participant.rawName);
  const suggestedMap =
    suggested ?? Object.fromEntries(rawNames.map((rawName) => [rawName, rawName]));
  const canonicalOrder: string[] = [];
  for (const rawName of rawNames) {
    const canonical = suggestedMap[rawName];
    if (canonical && !canonicalOrder.includes(canonical)) canonicalOrder.push(canonical);
  }
  const validSuggestion =
    canonicalOrder.length === 2 &&
    rawNames.every((rawName) => {
      const canonical = suggestedMap[rawName];
      return typeof canonical === "string" && rawNames.includes(canonical);
    });
  const assignment: Record<string, AliasAssignment> = {};
  rawNames.forEach((rawName, index) => {
    assignment[rawName] = validSuggestion
      ? (canonicalOrder.indexOf(suggestedMap[rawName] as string) as AliasGroupIndex)
      : index === 0 ? 0 : 1;
  });
  const canonicalNames = validSuggestion
    ? canonicalOrder
    : [rawNames[0] ?? "", rawNames[1] ?? ""];
  const nicknameOf = (rawName: string) =>
    participants.find((participant) => participant.rawName === rawName)?.nickname ?? rawName;

  return {
    suggestedMap,
    assignment,
    groupNames: [nicknameOf(canonicalNames[0]), nicknameOf(canonicalNames[1])],
  };
}

export function initializeFocusGroups(
  participants: AliasParticipant[],
  suggested?: AuthorAliasMap,
): InitialAliasGroups {
  const rawNames = participants.map((participant) => participant.rawName);
  const suggestedMap =
    suggested ?? Object.fromEntries(rawNames.map((rawName) => [rawName, rawName]));
  const canonicalOrder: string[] = [];
  for (const rawName of rawNames) {
    const canonical = suggestedMap[rawName];
    if (typeof canonical === "string" && !canonicalOrder.includes(canonical)) {
      canonicalOrder.push(canonical);
    }
  }
  const hasSavedSelection =
    rawNames.some((rawName) => suggestedMap[rawName] === null) &&
    canonicalOrder.length === 2 &&
    rawNames.every((rawName) => {
      const canonical = suggestedMap[rawName];
      return canonical === null || (
        typeof canonical === "string" && rawNames.includes(canonical)
      );
    });
  const nicknameOf = (rawName: string) =>
    participants.find((participant) => participant.rawName === rawName)?.nickname ?? rawName;
  return {
    suggestedMap,
    assignment: Object.fromEntries(rawNames.map((rawName) => {
      const canonical = suggestedMap[rawName];
      return [
        rawName,
        hasSavedSelection && typeof canonical === "string"
          ? canonicalOrder.indexOf(canonical) as AliasGroupIndex
          : null,
      ];
    })),
    groupNames: hasSavedSelection
      ? [nicknameOf(canonicalOrder[0]), nicknameOf(canonicalOrder[1])]
      : ["", ""],
  };
}

export function groupAliases<T extends { rawName: string }>(
  participants: T[],
  assignment: Record<string, AliasAssignment>,
): [T[], T[]] {
  return [
    participants.filter((participant) => assignment[participant.rawName] === 0),
    participants.filter((participant) => assignment[participant.rawName] === 1),
  ];
}

export function excludedAliases<T extends { rawName: string }>(
  participants: T[],
  assignment: Record<string, AliasAssignment>,
): T[] {
  return participants.filter((participant) => assignment[participant.rawName] === null);
}

export function canonicalNameForGroup<T extends { rawName: string }>(
  group: T[],
  index: AliasGroupIndex,
  suggestedMap: AuthorAliasMap,
): string {
  const suggestedCanonical = group.find(
    (participant) => suggestedMap[participant.rawName] === participant.rawName,
  );
  return suggestedCanonical?.rawName ?? group[0]?.rawName ?? `사람 ${index + 1}`;
}

export function buildAliasResolution<T extends { rawName: string }>(
  participants: T[],
  assignment: Record<string, AliasAssignment>,
  groupNames: [string, string],
  suggestedMap: AuthorAliasMap,
): { authorAliasMap: AuthorAliasMap; nicknames: Record<string, string> } {
  const groups = groupAliases(participants, assignment);
  if (groups.some((group) => group.length === 0)) {
    throw new Error("EMPTY_ALIAS_GROUP");
  }
  const canonicalNames = groups.map((group, index) =>
    canonicalNameForGroup(group, index as AliasGroupIndex, suggestedMap),
  );
  const authorAliasMap: AuthorAliasMap = Object.fromEntries(
    participants.map((participant) => [participant.rawName, null]),
  );
  groups.forEach((group, index) => {
    for (const participant of group) {
      authorAliasMap[participant.rawName] = canonicalNames[index];
    }
  });
  return {
    authorAliasMap,
    nicknames: Object.fromEntries(
      canonicalNames.map((rawName, index) => [
        rawName,
        groupNames[index].trim() || rawName,
      ]),
    ),
  };
}
