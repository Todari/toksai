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

/**
 * 초 단위 답장텀 중앙값을 보기 좋은 한글 단위로. null이면 "–".
 * 카톡 내보내기 타임스탬프는 '분' 단위(초 없음)라 같은 분 답장은 0초로 계산된다.
 * 즉 1분 미만은 실제로 잴 수 없는 값이므로 "1분 이내"로 정직하게 표기한다.
 */
function formatReplyLatency(sec: number | null): string {
  if (sec === null) return "–";
  if (sec < 60) return "1분 이내";
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
          icon="👋"
          label="선톡"
          value={`${stat.initiationCount.toLocaleString("ko-KR")}회`}
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

/**
 * 텍스트 양(메시지 수) 밸런스 바 + 1인당 KPI 통계 타일. 누가 더 많이 말했는지가
 * 헤드라인이고, 선톡 횟수는 PersonStatBlock의 보조 타일로 내려갔다.
 * 색은 AffinityChart와 동일한 owner/other 팔레트.
 */
export function InitiationBalance({ stats, owner, other }: InitiationBalanceProps) {
  const ownerStat = stats.perPerson[owner.rawName];
  const otherStat = stats.perPerson[other.rawName];
  if (!ownerStat || !otherStat) return null;

  const ownerMsgs = ownerStat.messageCount;
  const otherMsgs = otherStat.messageCount;
  const totalMsgs = ownerMsgs + otherMsgs;
  const ownerPct = totalMsgs > 0 ? Math.round((ownerMsgs / totalMsgs) * 100) : 50;
  const otherPct = 100 - ownerPct;

  return (
    <div>
      <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
        누가 더 많이 말했을까?
      </h3>

      <div className="mt-3 flex items-center justify-between text-xs font-semibold">
        <span style={{ color: owner.color }}>
          {owner.name} {ownerPct}%
        </span>
        <span style={{ color: other.color }}>
          {other.name} {otherPct}%
        </span>
      </div>

      {totalMsgs > 0 ? (
        <div
          className="mt-1.5 flex h-3 w-full gap-[2px]"
          role="img"
          aria-label={`${owner.name} 메시지량 ${ownerPct}퍼센트, ${other.name} 메시지량 ${otherPct}퍼센트`}
        >
          <div
            title={`${owner.name} · ${ownerMsgs.toLocaleString("ko-KR")}개 (${ownerPct}%)`}
            className="h-full rounded-full"
            style={{ width: `${ownerPct}%`, backgroundColor: owner.color }}
          />
          <div
            title={`${other.name} · ${otherMsgs.toLocaleString("ko-KR")}개 (${otherPct}%)`}
            className="h-full rounded-full"
            style={{ width: `${otherPct}%`, backgroundColor: other.color }}
          />
        </div>
      ) : (
        <div className="mt-1.5 h-3 w-full rounded-full bg-neutral-100 dark:bg-white/10" />
      )}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div>
          <p className="text-lg font-extrabold" style={{ color: owner.color }}>
            {ownerMsgs.toLocaleString("ko-KR")}<span className="text-xs font-bold">개</span>
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {ownerStat.charCount.toLocaleString("ko-KR")}자
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold" style={{ color: other.color }}>
            {otherMsgs.toLocaleString("ko-KR")}<span className="text-xs font-bold">개</span>
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {otherStat.charCount.toLocaleString("ko-KR")}자
          </p>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        {totalMsgs > 0
          ? `총 ${totalMsgs.toLocaleString("ko-KR")}개의 메시지 중 ${owner.name}가 ${ownerPct}%, ${other.name}가 ${otherPct}%를 보냈어요.`
          : "메시지 데이터가 충분하지 않아요."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <PersonStatBlock person={owner} stat={ownerStat} />
        <PersonStatBlock person={other} stat={otherStat} />
      </div>
    </div>
  );
}
