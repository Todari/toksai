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

export interface ChatStats {
  totalMessages: number;
  startedAt: string; // ISO
  endedAt: string;   // ISO
  durationDays: number;
  perPerson: Record<string, PersonStat>;
  heatmap: number[][]; // [weekday 0-6 (0=Sun)][hour 0-23]
  monthly: MonthlyVolume[];
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

export interface Highlight {
  quote: string;
  caption: string;
  kind: "flutter" | "funny" | "touching";
  at?: string;
}

export interface RelationType {
  code: string;
  label: string;
  description: string;
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
}

// Gemini 중간 산출물 (버킷별)
export interface BucketAnalysis {
  month: string;
  events: { date: string; title: string; summary: string; quote?: string }[];
  affinity: { from: string; to: string; score: number; reason: string }[];
  keywords: string[];
  highlights: { quote: string; caption: string; kind: "flutter" | "funny" | "touching" }[];
}
