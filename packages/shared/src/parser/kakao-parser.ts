import { Message, ParsedChat, ParseError } from "../types";
import { GAP_HOURS, MAX_AUTHOR_ALIASES } from "../constants";

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
  parse(raw: string, options?: ParseKakaoOptions): ParsedChat;
}

export interface ParseKakaoOptions {
  allowMultipleAuthors?: boolean;
}

export class IosKakaoParser implements KakaoParser {
  parse(raw: string, options?: ParseKakaoOptions): ParsedChat {
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

    return finalize(messages, options);
  }
}

/** Android 및 PC TXT의 날짜 구분선 + [이름] [시간] 메시지 형식. */
export class BracketKakaoParser implements KakaoParser {
  parse(raw: string, options?: ParseKakaoOptions): ParsedChat {
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
    return finalize(messages, options);
  }
}

/** PC/Mac에서 내보낼 수 있는 Date,User,Message CSV 형식. */
export class CsvKakaoParser implements KakaoParser {
  parse(raw: string, options?: ParseKakaoOptions): ParsedChat {
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
    return finalize(messages, options);
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

function suggestAuthorMap(messages: Message[], order: string[]): Record<string, string> {
  if (order.length === 2) {
    return Object.fromEntries(order.map((name) => [name, name]));
  }

  const index = new Map(order.map((name, i) => [name, i]));
  const transitionWeights = Array.from(
    { length: order.length },
    () => Array<number>(order.length).fill(0),
  );
  const maxGapMs = GAP_HOURS * 60 * 60 * 1000;

  for (let i = 1; i < messages.length; i++) {
    const previous = messages[i - 1];
    const current = messages[i];
    if (previous.author === current.author) continue;
    const gap = current.at.getTime() - previous.at.getTime();
    if (gap < 0 || gap > maxGapMs) continue;
    const a = index.get(previous.author);
    const b = index.get(current.author);
    if (a === undefined || b === undefined) continue;
    transitionWeights[a][b] += 1;
    transitionWeights[b][a] += 1;
  }

  // 이름 수가 많은 단체방도 지수 시간 없이 처리하도록 탐욕적으로 2분할한다.
  // 실제 1:1 이름 변경에서는 짧은 화자 전환이 그룹 사이에 최대한 놓여
  // 예전·현재 이름이 같은 쪽에 모인다. 단체방이면 UI에서 사용자가 두 대상을 다시 고른다.
  const groups = [[order[0]], []] as string[][];
  const assignedGroup = new Map<string, 0 | 1>([[order[0], 0]]);
  for (let i = 1; i < order.length; i++) {
    let crossIfZero = 0;
    let crossIfOne = 0;
    for (let j = 0; j < i; j++) {
      const assigned = assignedGroup.get(order[j]) ?? 0;
      if (assigned === 1) crossIfZero += transitionWeights[i][j];
      else crossIfOne += transitionWeights[i][j];
    }
    const group: 0 | 1 =
      crossIfOne > crossIfZero
        ? 1
        : crossIfZero > crossIfOne
          ? 0
          : groups[0].length <= groups[1].length ? 0 : 1;
    groups[group].push(order[i]);
    assignedGroup.set(order[i], group);
  }

  const activity = new Map<string, { lastAt: number; count: number; order: number }>();
  for (const message of messages) {
    const current = activity.get(message.author);
    activity.set(message.author, {
      lastAt: Math.max(current?.lastAt ?? -Infinity, message.at.getTime()),
      count: (current?.count ?? 0) + 1,
      order: index.get(message.author) ?? 0,
    });
  }
  const representative = (names: string[]) =>
    [...names].sort((a, b) => {
      const aa = activity.get(a)!;
      const bb = activity.get(b)!;
      return bb.lastAt - aa.lastAt || bb.count - aa.count || aa.order - bb.order;
    })[0];

  const result: Record<string, string> = {};
  for (const group of groups) {
    const canonical = representative(group);
    for (const alias of group) result[alias] = canonical;
  }
  return result;
}

function finalize(messages: Message[], options?: ParseKakaoOptions): ParsedChat {
  if (messages.length === 0) {
    throw new ParseError("NO_MESSAGES", "대화 메시지를 찾지 못했습니다.");
  }
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const msg of messages) {
    if (!counts.has(msg.author)) order.push(msg.author);
    counts.set(msg.author, (counts.get(msg.author) ?? 0) + 1);
  }
  const allowMultipleAuthors = options?.allowMultipleAuthors === true;
  if (order.length < 2 || (!allowMultipleAuthors && order.length !== 2)) {
    throw new ParseError(
      "NOT_ONE_TO_ONE",
      `1:1 대화만 지원합니다 (감지된 화자 ${order.length}명).`,
    );
  }
  if (order.length > MAX_AUTHOR_ALIASES) {
    throw new ParseError(
      "NOT_ONE_TO_ONE",
      `감지된 이름이 너무 많아요. ${MAX_AUTHOR_ALIASES}명 이하 대화를 올려주세요.`,
    );
  }
  return {
    messages,
    participants: order.map((rawName) => ({
      rawName,
      messageCount: counts.get(rawName)!,
    })),
    suggestedAuthorMap: suggestAuthorMap(messages, order),
    startedAt: messages[0].at,
    endedAt: messages[messages.length - 1].at,
  };
}

export function parseKakao(raw: string, options?: ParseKakaoOptions): ParsedChat {
  const firstNonEmpty = raw.replace(/^\ufeff/, "").split(/\r?\n/).find((line) => line.trim());
  if (firstNonEmpty && CSV_HEADER_RE.test(firstNonEmpty.trim())) {
    return new CsvKakaoParser().parse(raw, options);
  }
  if (raw.split(/\r?\n/).some((line) => BRACKET_MSG_RE.test(line.trim()))) {
    return new BracketKakaoParser().parse(raw, options);
  }
  return new IosKakaoParser().parse(raw, options);
}
