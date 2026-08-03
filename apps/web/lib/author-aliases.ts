export type AliasGroupIndex = 0 | 1;

export interface AliasParticipant {
  rawName: string;
  nickname: string | null;
}

export interface InitialAliasGroups {
  suggestedMap: Record<string, string>;
  assignment: Record<string, AliasGroupIndex>;
  groupNames: [string, string];
}

export function initializeAliasGroups(
  participants: AliasParticipant[],
  suggested?: Record<string, string>,
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
    rawNames.every((rawName) => rawNames.includes(suggestedMap[rawName]));
  const assignment: Record<string, AliasGroupIndex> = {};
  rawNames.forEach((rawName, index) => {
    assignment[rawName] = validSuggestion
      ? (canonicalOrder.indexOf(suggestedMap[rawName]) as AliasGroupIndex)
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

export function groupAliases<T extends { rawName: string }>(
  participants: T[],
  assignment: Record<string, AliasGroupIndex>,
): [T[], T[]] {
  return [
    participants.filter((participant) => assignment[participant.rawName] === 0),
    participants.filter((participant) => assignment[participant.rawName] === 1),
  ];
}

export function canonicalNameForGroup<T extends { rawName: string }>(
  group: T[],
  index: AliasGroupIndex,
  suggestedMap: Record<string, string>,
): string {
  const suggestedCanonical = group.find(
    (participant) => suggestedMap[participant.rawName] === participant.rawName,
  );
  return suggestedCanonical?.rawName ?? group[0]?.rawName ?? `사람 ${index + 1}`;
}

export function buildAliasResolution<T extends { rawName: string }>(
  participants: T[],
  assignment: Record<string, AliasGroupIndex>,
  groupNames: [string, string],
  suggestedMap: Record<string, string>,
): { authorAliasMap: Record<string, string>; nicknames: Record<string, string> } {
  const groups = groupAliases(participants, assignment);
  if (groups.some((group) => group.length === 0)) {
    throw new Error("EMPTY_ALIAS_GROUP");
  }
  const canonicalNames = groups.map((group, index) =>
    canonicalNameForGroup(group, index as AliasGroupIndex, suggestedMap),
  );
  const authorAliasMap: Record<string, string> = {};
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
