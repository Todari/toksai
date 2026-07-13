import { BADGES } from "@toksai/shared";
import type { Badge } from "@toksai/shared";
import type { AnalysisView, ParticipantView } from "@toksai/api";

export function formatDuration(days: number): string {
  return `D+${days}`;
}

export function heatmapMax(heatmap: number[][]): number {
  let max = 0;
  for (const row of heatmap) for (const v of row) if (v > max) max = v;
  return max;
}

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

export function nicknameOf(view: AnalysisView, rawName: string): string {
  const p = view.participants.find((p) => p.rawName === rawName);
  return p?.nickname ?? rawName;
}

export function pickOwnerOther(view: AnalysisView): {
  owner: ParticipantView;
  other: ParticipantView;
} {
  const owner = view.participants.find((p) => p.isOwner) ?? view.participants[0];
  const other = view.participants.find((p) => p !== owner) ?? view.participants[1];
  return { owner, other };
}
