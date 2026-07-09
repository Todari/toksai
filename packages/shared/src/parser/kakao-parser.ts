import { Message, ParsedChat, ParticipantInfo, ParseError } from "../types";

const MSG_RE =
  /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (오전|오후) (\d{1,2}):(\d{2}), (.+?) : ([\s\S]*)$/;
const DATE_HEADER_RE = /^\d{4}년 \d{1,2}월 \d{1,2}일 .+요일$/;

function toDate(
  y: string, mo: string, d: string, ampm: string, h: string, mi: string,
): Date {
  let hour = parseInt(h, 10);
  if (ampm === "오전") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return new Date(
    parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), hour, parseInt(mi, 10),
  );
}

export interface KakaoParser {
  parse(raw: string): ParsedChat;
}

export class IosKakaoParser implements KakaoParser {
  parse(raw: string): ParsedChat {
    const lines = raw.split(/\r?\n/);
    const messages: Message[] = [];
    for (const line of lines) {
      const m = MSG_RE.exec(line);
      if (m) {
        const [, y, mo, d, ampm, h, mi, author, text] = m;
        messages.push({ author, at: toDate(y, mo, d, ampm, h, mi), text });
        continue;
      }
      // 비-메시지 줄: 빈 줄/날짜 구분선은 버리고, 그 외만 멀티라인 병합
      if (messages.length === 0) continue;
      if (line.trim() === "" || DATE_HEADER_RE.test(line)) continue;
      messages[messages.length - 1].text += "\n" + line;
    }

    if (messages.length === 0) {
      throw new ParseError("NO_MESSAGES", "대화 메시지를 찾지 못했습니다.");
    }

    const order: string[] = [];
    const counts = new Map<string, number>();
    for (const msg of messages) {
      if (!counts.has(msg.author)) order.push(msg.author);
      counts.set(msg.author, (counts.get(msg.author) ?? 0) + 1);
    }
    if (order.length !== 2) {
      throw new ParseError(
        "NOT_ONE_TO_ONE",
        `1:1 대화만 지원합니다 (감지된 화자 ${order.length}명).`,
      );
    }
    const participants: ParticipantInfo[] = order.map((rawName) => ({
      rawName,
      messageCount: counts.get(rawName)!,
    }));

    return {
      messages,
      participants,
      startedAt: messages[0].at,
      endedAt: messages[messages.length - 1].at,
    };
  }
}

export function parseKakao(raw: string): ParsedChat {
  return new IosKakaoParser().parse(raw);
}
