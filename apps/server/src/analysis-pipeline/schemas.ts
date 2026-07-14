import { z } from "zod";
import { BADGE_IDS, HIGHLIGHT_KINDS } from "@toksai/shared";

const kindEnum = z.enum(HIGHLIGHT_KINDS);

export const bucketZod = z.object({
  month: z.string(),
  events: z.array(z.object({
    date: z.string(), title: z.string(), summary: z.string(), quote: z.string().optional(),
  })),
  affinity: z.array(z.object({
    from: z.string(), to: z.string(), score: z.number().min(0).max(100), reason: z.string(),
  })),
  keywords: z.array(z.string()),
  highlights: z.array(z.object({
    quote: z.string(), caption: z.string(), kind: kindEnum,
  })),
});

export const synthesisZod = z.object({
  timeline: z.array(z.object({
    date: z.string(), title: z.string(), summary: z.string(), quote: z.string().optional(),
  })),
  keywords: z.array(z.string()),
  personas: z.array(z.object({ rawName: z.string(), oneLiner: z.string() })),
  badges: z.array(z.object({
    rawName: z.string(), badgeId: z.enum(BADGE_IDS as [string, ...string[]]), reason: z.string(),
  })),
  chemiScore: z.number().min(0).max(100),
  relationType: z.object({ code: z.string(), label: z.string(), description: z.string() }),
  highlights: z.array(z.object({
    quote: z.string(), caption: z.string(), kind: kindEnum, at: z.string().optional(),
  })),
  extras: z.object({
    movie: z.object({ title: z.string(), reason: z.string() }),
    aiComment: z.string(),
    insideJokes: z.array(z.string()),
    moodSeries: z.array(z.object({ month: z.string(), mood: z.string(), note: z.string() })),
    topicSuggestion: z.string(),
  }),
});

// Gemini responseSchema (JSON Schema subset). 필드는 Zod와 일치.
export const bucketResponseSchema = {
  type: "object",
  properties: {
    month: { type: "string" },
    events: { type: "array", items: { type: "object", properties: {
      date: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, quote: { type: "string" },
    }, required: ["date", "title", "summary"] } },
    affinity: { type: "array", items: { type: "object", properties: {
      from: { type: "string" }, to: { type: "string" }, score: { type: "number", minimum: 0, maximum: 100 }, reason: { type: "string" },
    }, required: ["from", "to", "score", "reason"] } },
    keywords: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: HIGHLIGHT_KINDS },
    }, required: ["quote", "caption", "kind"] } },
  },
  required: ["month", "events", "affinity", "keywords", "highlights"],
} as const;

export const synthesisResponseSchema = {
  type: "object",
  properties: {
    timeline: { type: "array", items: { type: "object", properties: {
      date: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, quote: { type: "string" },
    }, required: ["date", "title", "summary"] } },
    keywords: { type: "array", items: { type: "string" } },
    personas: { type: "array", items: { type: "object", properties: {
      rawName: { type: "string" }, oneLiner: { type: "string" },
    }, required: ["rawName", "oneLiner"] } },
    badges: { type: "array", items: { type: "object", properties: {
      rawName: { type: "string" }, badgeId: { type: "string", enum: BADGE_IDS },
      reason: { type: "string" },
    }, required: ["rawName", "badgeId", "reason"] } },
    chemiScore: { type: "number", minimum: 0, maximum: 100 },
    relationType: { type: "object", properties: {
      code: { type: "string" }, label: { type: "string" }, description: { type: "string" },
    }, required: ["code", "label", "description"] },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: HIGHLIGHT_KINDS }, at: { type: "string" },
    }, required: ["quote", "caption", "kind"] } },
    extras: { type: "object", properties: {
      movie: { type: "object", properties: { title: { type: "string" }, reason: { type: "string" } }, required: ["title", "reason"] },
      aiComment: { type: "string" },
      insideJokes: { type: "array", items: { type: "string" } },
      moodSeries: { type: "array", items: { type: "object", properties: {
        month: { type: "string" }, mood: { type: "string" }, note: { type: "string" },
      }, required: ["month", "mood", "note"] } },
      topicSuggestion: { type: "string" },
    }, required: ["movie", "aiComment", "insideJokes", "moodSeries", "topicSuggestion"] },
  },
  required: ["timeline", "keywords", "personas", "badges", "chemiScore", "relationType", "highlights", "extras"],
} as const;
