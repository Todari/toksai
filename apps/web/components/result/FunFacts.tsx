import type { AnalysisResultView } from "@toksai/api";
import { nicknameOf, OTHER_COLOR, OWNER_COLOR, pickOwnerOther, type AnalysisView } from "./format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface FunFactsProps {
  view: AnalysisView;
  result: AnalysisResultView;
}

function formatDateDot(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${y}.${m}.${d}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 시간(h) 단위 간격을 보기 좋은 분/시간/일 단위로. */
function formatGapHours(hours: number): string {
  if (hours >= 24) return `${(hours / 24).toFixed(1)}일`;
  if (hours >= 1) return `${hours.toFixed(1)}시간`;
  return `${Math.max(1, Math.round(hours * 60))}분`;
}

function FactTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-white/5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-[15px] font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
      {detail && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
          {detail}
        </p>
      )}
    </div>
  );
}

/**
 * stats.funFacts 기반 재미 기록 타일 모음(골든타임/폭풍수다데이/잠수이력/밤샘/첫대화/최애이모지/마무리담당).
 * funFacts는 Wave1에서 추가돼 구버전 결과에는 없을 수 있으므로 최상단에서 가드한다.
 */
export function FunFacts({ view, result }: FunFactsProps) {
  const funFacts = result.stats.funFacts;
  if (!funFacts) return null;

  const { owner, other } = pickOwnerOther(view);
  const people = [
    { rawName: owner.rawName, name: nicknameOf(view, owner.rawName), color: OWNER_COLOR },
    { rawName: other.rawName, name: nicknameOf(view, other.rawName), color: OTHER_COLOR },
  ];

  const { goldenHour, busiestDay, longestSilence, lateNightCount, firstMessage, topEmoji, conversationEnder } =
    funFacts;

  const silenceBrokenByName = longestSilence ? nicknameOf(view, longestSilence.brokenBy) : null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">우리 대화 속 자잘한 기록들</h2>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {goldenHour.count > 0 && (
          <FactTile
            icon="⏰"
            label="골든타임"
            value={`${WEEKDAYS[goldenHour.weekday]}요일 ${goldenHour.hour}시`}
            detail={`${goldenHour.count.toLocaleString("ko-KR")}건으로 가장 활발했어요`}
          />
        )}
        {busiestDay.count > 0 && (
          <FactTile
            icon="🔥"
            label="폭풍수다데이"
            value={formatDateDot(busiestDay.date)}
            detail={`${busiestDay.count.toLocaleString("ko-KR")}개의 메시지`}
          />
        )}
        <FactTile
          icon="🌙"
          label="밤샘 메시지"
          value={`${lateNightCount.toLocaleString("ko-KR")}개`}
          detail="자정~새벽 5시 사이"
        />
        {firstMessage.author && (
          <FactTile
            icon="🌱"
            label="첫 대화"
            value={formatDateTime(firstMessage.at)}
            detail={
              firstMessage.text
                ? `${nicknameOf(view, firstMessage.author)} · “${firstMessage.text}”`
                : nicknameOf(view, firstMessage.author)
            }
          />
        )}
      </div>

      {longestSilence && (
        <div className="mt-3 rounded-2xl bg-neutral-50 p-4 dark:bg-white/5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            <span aria-hidden>🌊</span>
            가장 길었던 잠수
          </div>
          <p className="mt-1.5 text-[15px] font-bold text-neutral-800 dark:text-neutral-100">
            {formatGapHours(longestSilence.gapHours)} 동안 조용했어요
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {silenceBrokenByName}가 다시 말을 걸며 깼어요 · {formatDateTime(longestSilence.brokenAt)}
          </p>
          <blockquote className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-neutral-500 italic dark:bg-black/20 dark:text-neutral-400">
            “{longestSilence.message}”
          </blockquote>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 dark:border-white/10">
        {people.map((person) => (
          <div key={person.rawName}>
            <p className="text-sm font-bold" style={{ color: person.color }}>
              {person.name}
            </p>
            <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">최애 이모지</p>
            <p className="text-xl leading-tight">{topEmoji[person.rawName] ?? "-"}</p>
            <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">대화 마무리 담당</p>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {(conversationEnder[person.rawName] ?? 0).toLocaleString("ko-KR")}번
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
