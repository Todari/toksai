import { Message, ParsedChat, ParseError } from "../types";

// 기기 설정에 따라 12시간제(오전/오후)와 24시간제 모두 내보내진다.
const IOS_MSG_RE =
  /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (?:(오전|오후) )?(\d{1,2}):(\d{2}), (.+?) : ([\s\S]*)$/;
const PC_FULL_MSG_RE =
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*([\s\S]*)$/;
const DATE_HEADER_RE = /^\d{4}년 \d{1,2}월 \d{1,2}일 .+요일$/;
const BRACKET_DATE_RE =
  /^(?:-{3,}\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s+\S+요일)?(?:\s*-{3,})?$/;
const BRACKET_MSG_RE = /^\[([^\]]+)]\s*\[(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})]\s*(.*)$/;
// 긴 대화는 여러 txt로 분할 내보내지며, 각 파일 머리에 파일명·저장 날짜 줄이 붙는다.
const FILE_HEADER_RE = /^Talk_.+\.txt$/;
const SAVED_AT_RE = /^저장한 날짜 : /;
const CSV_HEADER_RE = /^"?date"?\s*,\s*"?user"?\s*,\s*"?message"?$/i;
const CSV_DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::\d{2})?/;

function toDate(
  y: string, mo: string, d: string, ampm: string | undefined, h: string, mi: string,
): Date {
  let hour = parseInt(h, 10);
  if (ampm === "오전") {
    if (hour === 12) hour = 0;
  } else if (ampm === "오후" && hour !== 12) {
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
    for (let line of lines) {
      if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
      const m = IOS_MSG_RE.exec(line) ?? PC_FULL_MSG_RE.exec(line);
      if (m) {
        const [, y, mo, d, ampm, h, mi, author, text] = m;
        messages.push({ author, at: toDate(y, mo, d, ampm, h, mi), text });
        continue;
      }
      // 비-메시지 줄: 빈 줄/날짜 구분선/분할 파일 헤더는 버리고, 그 외만 멀티라인 병합
      if (messages.length === 0) continue;
      if (line.trim() === "" || DATE_HEADER_RE.test(line)) continue;
      if (FILE_HEADER_RE.test(line) || SAVED_AT_RE.test(line)) continue;
      messages[messages.length - 1].text += "\n" + line;
    }

    return finalize(messages);
  }
}

/** Android 및 PC TXT의 날짜 구분선 + [이름] [시간] 메시지 형식. */
export class BracketKakaoParser implements KakaoParser {
  parse(raw: string): ParsedChat {
    const messages: Message[] = [];
    let currentDate: { y: string; mo: string; d: string } | null = null;

    for (let line of raw.split(/\r?\n/)) {
      if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
      const trimmed = line.trim();
      const date = BRACKET_DATE_RE.exec(trimmed);
      if (date) {
        currentDate = { y: date[1], mo: date[2], d: date[3] };
        continue;
      }

      const match = BRACKET_MSG_RE.exec(trimmed);
      if (match && currentDate) {
        const [, author, ampm, h, mi, text] = match;
        messages.push({
          author: author.trim(),
          at: toDate(currentDate.y, currentDate.mo, currentDate.d, ampm, h, mi),
          text,
        });
        continue;
      }

      if (!trimmed || FILE_HEADER_RE.test(trimmed) || SAVED_AT_RE.test(trimmed)) continue;
      if (/님이 (들어왔습니다|나갔습니다|초대했습니다)/.test(trimmed)) continue;
      if (messages.length > 0) messages[messages.length - 1].text += `\n${line}`;
    }
    return finalize(messages);
  }
}

/** PC/Mac에서 내보낼 수 있는 Date,User,Message CSV 형식. */
export class CsvKakaoParser implements KakaoParser {
  parse(raw: string): ParsedChat {
    const rows = parseCsvRows(raw.replace(/^\ufeff/, ""));
    if (rows.length === 0 || !CSV_HEADER_RE.test(rows[0].join(","))) {
      throw new ParseError("NO_MESSAGES", "대화 메시지를 찾지 못했습니다.");
    }
    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const dateIndex = header.indexOf("date");
    const userIndex = header.indexOf("user");
    const messageIndex = header.indexOf("message");
    const messages: Message[] = [];

    for (const row of rows.slice(1)) {
      const date = CSV_DATE_RE.exec(row[dateIndex] ?? "");
      const author = (row[userIndex] ?? "").trim();
      if (!date || !author) continue;
      messages.push({
        author,
        at: toDate(date[1], date[2], date[3], undefined, date[4], date[5]),
        text: row[messageIndex] ?? "",
      });
    }
    return finalize(messages);
  }
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') {
      if (quoted && raw[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && raw[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function finalize(messages: Message[]): ParsedChat {
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
  return {
    messages,
    participants: order.map((rawName) => ({
      rawName,
      messageCount: counts.get(rawName)!,
    })),
    startedAt: messages[0].at,
    endedAt: messages[messages.length - 1].at,
  };
}

export function parseKakao(raw: string): ParsedChat {
  const firstNonEmpty = raw.replace(/^\ufeff/, "").split(/\r?\n/).find((line) => line.trim());
  if (firstNonEmpty && CSV_HEADER_RE.test(firstNonEmpty.trim())) {
    return new CsvKakaoParser().parse(raw);
  }
  if (raw.split(/\r?\n/).some((line) => BRACKET_MSG_RE.test(line.trim()))) {
    return new BracketKakaoParser().parse(raw);
  }
  return new IosKakaoParser().parse(raw);
}
