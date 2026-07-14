export interface PersonStat {
  rawName: string;
  messageCount: number;
  charCount: number;
  avgMessageLength: number;
  initiationCount: number;
  replyLatencyMedianSec: number | null;
  emojiCount: number;
  laughCount: number;
  questionCount: number;
  exclamationCount: number;
}

export interface MonthlyVolume {
  month: string; // "YYYY-MM"
  total: number;
  perPerson: Record<string, number>;
}

export interface FunFacts {
  goldenHour: { weekday: number; hour: number; count: number }; // heatmap argmax (weekday 0=Sun)
  busiestDay: { date: string; count: number };                  // "YYYY-MM-DD" with most messages
  longestSilence: { gapHours: number; brokenBy: string; brokenAt: string; message: string } | null;
  lateNightCount: number;                                        // messages with hour in [0,5)
  firstMessage: { at: string; author: string; text: string };
  topEmoji: Record<string, string | null>;                      // rawName -> most frequent emoji (or null)
  conversationEnder: Record<string, number>;                    // rawName -> count of session-ending messages
}

export interface ChatStats {
  totalMessages: number;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  durationDays: number;
  perPerson: Record<string, PersonStat>;
  heatmap: number[][]; // [weekday 0-6 (0=Sun)][hour 0-23]
  monthly: MonthlyVolume[];
  funFacts: FunFacts;
}

export interface TimelineEvent {
  date: string;   // "YYYY-MM-DD" or "YYYY-MM"
  title: string;
  summary: string;
  quote?: string;
}

export interface AffinityPoint {
  month: string; // "YYYY-MM"
  scores: Record<string, number>; // rawName -> 0..100 (toward the other)
}

export interface Persona {
  rawName: string;
  oneLiner: string;
}

export interface AwardedBadge {
  rawName: string;
  badgeId: string;
  reason: string;
}

// 하이라이트 분류. 긍정(설렘/웃김/감동)만이 아니라 중립·부정(티키타카/어색/투닥)도
// 포함해, 실제 관계 온도를 미화 없이 담는다.
export const HIGHLIGHT_KINDS = ["flutter", "funny", "touching", "banter", "awkward", "clash"] as const;
export type HighlightKind = (typeof HIGHLIGHT_KINDS)[number];

export interface Highlight {
  quote: string;
  caption: string;
  kind: HighlightKind;
  at?: string;
}

export interface RelationType {
  code: string;
  label: string;
  description: string;
}

export interface AnalysisExtras {
  movie: { title: string; reason: string };
  aiComment: string;
  insideJokes: string[];
  moodSeries: { month: string; mood: string; note: string }[];
  topicSuggestion: string;
}

export interface AnalysisResultView {
  stats: ChatStats;
  timeline: TimelineEvent[];
  affinitySeries: AffinityPoint[];
  keywords: string[];
  personas: Persona[];
  badges: AwardedBadge[];
  chemiScore: number; // 0..100
  relationType: RelationType;
  highlights: Highlight[];
  extras: AnalysisExtras;
}

// Gemini 중간 산출물 (버킷별)
export interface BucketAnalysis {
  month: string;
  events: { date: string; title: string; summary: string; quote?: string }[];
  affinity: { from: string; to: string; score: number; reason: string }[];
  keywords: string[];
  highlights: { quote: string; caption: string; kind: HighlightKind }[];
}
