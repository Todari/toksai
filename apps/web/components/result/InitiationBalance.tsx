import type { ChatStats, PersonStat } from "@toksai/shared";

export interface PersonRef {
  rawName: string;
  name: string;
  color: string;
}

interface InitiationBalanceProps {
  stats: ChatStats;
  owner: PersonRef;
  other: PersonRef;
}

/** 초 단위 답장텀 중앙값을 보기 좋은 한글 단위로("42초"/"3분"/"1.5시간"). null이면 "–". */
function formatReplyLatency(sec: number | null): string {
  if (sec === null) return "–";
  if (sec < 60) return `${Math.round(sec)}초`;
  const minutes = sec / 60;
  if (minutes < 60) return `${Math.round(minutes)}분`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-3 py-2.5 dark:bg-white/5">
      <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-base font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function PersonStatBlock({ person, stat }: { person: PersonRef; stat: PersonStat }) {
  return (
    <div>
      <p className="text-sm font-bold" style={{ color: person.color }}>
        {person.name}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <StatTile
          icon="⏱️"
          label="답장 속도"
          value={formatReplyLatency(stat.replyLatencyMedianSec)}
          color={person.color}
        />
        <StatTile
          icon="✏️"
          label="평균 길이"
          value={`${Math.round(stat.avgMessageLength)}자`}
          color={person.color}
        />
        <StatTile
          icon="😀"
          label="이모지"
          value={`${stat.emojiCount.toLocaleString("ko-KR")}개`}
          color={person.color}
        />
        <StatTile
          icon="😂"
          label="ㅋㅎ"
          value={`${stat.laughCount.toLocaleString("ko-KR")}개`}
          color={person.color}
        />
        <StatTile
          icon="❓"
          label="물음표"
          value={`${stat.questionCount.toLocaleString("ko-KR")}개`}
          color={person.color}
        />
        <StatTile
          icon="❗"
          label="느낌표"
          value={`${stat.exclamationCount.toLocaleString("ko-KR")}개`}
          color={person.color}
        />
      </div>
    </div>
  );
}

/** 선톡(대화 시작) 밸런스 바 + 1인당 KPI 통계 타일. 색은 AffinityChart와 동일한 owner/other 팔레트. */
export function InitiationBalance({ stats, owner, other }: InitiationBalanceProps) {
  const ownerStat = stats.perPerson[owner.rawName];
  const otherStat = stats.perPerson[other.rawName];
  if (!ownerStat || !otherStat) return null;

  const ownerInit = ownerStat.initiationCount;
  const otherInit = otherStat.initiationCount;
  const totalInit = ownerInit + otherInit;
  const ownerPct = totalInit > 0 ? Math.round((ownerInit / totalInit) * 100) : 50;
  const otherPct = 100 - ownerPct;

  return (
    <div>
      <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
        누가 더 먼저 말을 걸었을까?
      </h3>

      <div className="mt-3 flex items-center justify-between text-xs font-semibold">
        <span style={{ color: owner.color }}>
          {owner.name} {ownerPct}%
        </span>
        <span style={{ color: other.color }}>
          {other.name} {otherPct}%
        </span>
      </div>

      {totalInit > 0 ? (
        <div
          className="mt-1.5 flex h-3 w-full gap-[2px]"
          role="img"
          aria-label={`${owner.name} 선톡 ${ownerPct}퍼센트, ${other.name} 선톡 ${otherPct}퍼센트`}
        >
          <div
            title={`${owner.name} · ${ownerInit.toLocaleString("ko-KR")}회 (${ownerPct}%)`}
            className="h-full rounded-full"
            style={{ width: `${ownerPct}%`, backgroundColor: owner.color }}
          />
          <div
            title={`${other.name} · ${otherInit.toLocaleString("ko-KR")}회 (${otherPct}%)`}
            className="h-full rounded-full"
            style={{ width: `${otherPct}%`, backgroundColor: other.color }}
          />
        </div>
      ) : (
        <div className="mt-1.5 h-3 w-full rounded-full bg-neutral-100 dark:bg-white/10" />
      )}

      <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        {totalInit > 0
          ? `총 ${totalInit.toLocaleString("ko-KR")}번의 대화 시작 중 ${owner.name}가 ${ownerInit.toLocaleString(
              "ko-KR",
            )}번, ${other.name}가 ${otherInit.toLocaleString("ko-KR")}번 먼저 말을 걸었어요.`
          : "대화 시작 데이터가 충분하지 않아요."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <PersonStatBlock person={owner} stat={ownerStat} />
        <PersonStatBlock person={other} stat={otherStat} />
      </div>
    </div>
  );
}
