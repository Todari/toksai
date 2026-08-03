export interface Message {
  author: string;
  at: Date;
  text: string;
}

export interface ParticipantInfo {
  rawName: string;
  messageCount: number;
}

export interface ParsedChat {
  messages: Message[];
  participants: ParticipantInfo[];
  suggestedAuthorMap: Record<string, string>;
  startedAt: Date;
  endedAt: Date;
}

export type ParseErrorCode =
  | "NO_MESSAGES"
  | "NOT_ONE_TO_ONE"
  | "CHAT_TOO_LARGE"
  | "CHAT_TOO_LONG";

export class ParseError extends Error {
  constructor(public code: ParseErrorCode, message: string) {
    super(message);
    this.name = "ParseError";
  }
}
