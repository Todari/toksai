import { z } from "zod";
import { BADGE_IDS } from "@toksai/shared";

const kindEnum = z.enum(["flutter", "funny", "touching"]);

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
      from: { type: "string" }, to: { type: "string" }, score: { type: "number" }, reason: { type: "string" },
    }, required: ["from", "to", "score", "reason"] } },
    keywords: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: ["flutter", "funny", "touching"] },
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
    chemiScore: { type: "number" },
    relationType: { type: "object", properties: {
      code: { type: "string" }, label: { type: "string" }, description: { type: "string" },
    }, required: ["code", "label", "description"] },
    highlights: { type: "array", items: { type: "object", properties: {
      quote: { type: "string" }, caption: { type: "string" },
      kind: { type: "string", enum: ["flutter", "funny", "touching"] }, at: { type: "string" },
    }, required: ["quote", "caption", "kind"] } },
  },
  required: ["timeline", "keywords", "personas", "badges", "chemiScore", "relationType", "highlights"],
} as const;
