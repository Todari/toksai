export interface Message {
  author: string;
  at: Date;
  text: string;
  /** 관계 집중 모드에서 이 메시지 앞에 생략된 제3자 발화 수. */
  contextBreakBefore?: number;
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
