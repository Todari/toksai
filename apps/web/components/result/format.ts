import { BADGES } from "@toksai/shared";
import type { Badge } from "@toksai/shared";

// tRPC 클라이언트 응답은 Date 필드를 문자열로 직렬화하므로 @toksai/api의
// AnalysisView(createdAt: Date)를 그대로 쓰지 않고, 이 헬퍼들이 실제로 쓰는
// 필드만 구조적으로 요구하는 최소 타입을 둔다(identify 페이지와 동일한 패턴).
export interface ParticipantView {
  id: string;
  rawName: string;
  nickname: string | null;
  isOwner: boolean;
}

export interface AnalysisView {
  participants: ParticipantView[];
}

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
