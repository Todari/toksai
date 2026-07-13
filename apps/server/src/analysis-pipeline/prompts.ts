import { BADGES } from "@toksai/shared";

export const SYSTEM_INSTRUCTION =
  "너는 두 사람의 카카오톡 대화를 '재미로 보는 관심 신호'로 해석하는 분석가다. " +
  "심리 진단이나 단정적 평가가 아니라, 애정 어린 유머와 따뜻한 시선으로 해석한다. " +
  "모든 출력은 한국어로, 반드시 지정된 JSON 스키마에 맞춘다. 근거 인용은 실제 대화에서 발췌한다.";

interface People { nickA: string; nickB: string; rawA: string; rawB: string; }

export function buildBucketPrompt(
  p: People & { month: string; text: string },
): string {
  return [
    `아래는 ${p.nickA}(${p.rawA})와 ${p.nickB}(${p.rawB})의 ${p.month} 한 달 대화다.`,
    `이 구간에서:`,
    `- 큼직한 이벤트/사건 (events): 날짜(YYYY-MM-DD), 제목, 한 줄 요약, 가능하면 실제 인용.`,
    `- 관심 신호 (affinity): 각자가 상대에게 보인 관심의 강도(0~100)와 근거. from/to는 실제 이름(${p.rawA}, ${p.rawB})을 쓴다. 두 방향 모두.`,
    `- 키워드 (keywords): 이 구간의 주요 화제 5개 이내.`,
    `- 인상적 순간 (highlights): 설렘(flutter)/웃김(funny)/감동(touching) 중 하나로 분류.`,
    ``,
    `대화:`,
    p.text,
  ].join("\n");
}

export function buildSynthesisPrompt(
  p: People & { statsSummary: string; buckets: string },
): string {
  const badgeList = BADGES.map((b) => `- ${b.id}: ${b.name} (${b.description})`).join("\n");
  return [
    `${p.nickA}(${p.rawA})와 ${p.nickB}(${p.rawB})의 전체 관계를 아래 재료로 종합한다.`,
    ``,
    `[정량 통계 요약]`,
    p.statsSummary,
    ``,
    `[월별 버킷 분석(JSON 배열)]`,
    p.buckets,
    ``,
    `다음을 JSON으로 만든다:`,
    `- timeline: 버킷 이벤트들을 병합/중복제거한 핵심 관계 타임라인.`,
    `- keywords: 전체 관심사/키워드 Top 8.`,
    `- personas: 각자 성향 한 줄평(rawName은 ${p.rawA}, ${p.rawB}).`,
    `- badges: 각자에게 어울리는 뱃지를 아래 카탈로그의 id에서 골라 근거와 함께. 사람당 1~2개.`,
    badgeList,
    `- chemiScore: 0~100 케미 지수(정량+정성 종합).`,
    `- relationType: 관계 유형 코드(영문 4자 내외)/라벨(한국어)/설명. MBTI풍의 재미있는 분류.`,
    `- highlights: 전체에서 가장 인상적인 순간 3~5개(인용+캡션+kind).`,
  ].join("\n");
}
