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

/**
 * 두 참여자의 고정 색상 매핑. 케미 게이지 그라데이션과 같은 팔레트를 쓰며,
 * isOwner 여부와 무관하게 오너=amber(카톡 옐로 계열)/상대=rose(코랄 계열)로
 * 헤드라인·차트·타임라인 등 페이지 전역에서 동일하게 유지한다.
 */
export const OWNER_COLOR = "#F5B301";
export const OTHER_COLOR = "#FB7185";
