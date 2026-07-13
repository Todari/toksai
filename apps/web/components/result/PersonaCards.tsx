import type { AnalysisResultView } from "@toksai/api";
import type { PersonRef } from "./InitiationBalance";
import { badgeById, nicknameOf, OTHER_COLOR, OWNER_COLOR, pickOwnerOther, type AnalysisView } from "./format";

interface PersonaCardsProps {
  view: AnalysisView;
  result: AnalysisResultView;
}

function PersonCard({ person, result }: { person: PersonRef; result: AnalysisResultView }) {
  const persona = result.personas.find((p) => p.rawName === person.rawName);
  const badges = result.badges.filter((b) => b.rawName === person.rawName);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: `${person.color}14` }}>
      <p className="text-sm font-bold" style={{ color: person.color }}>
        {person.name}
      </p>
      {persona && (
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          “{persona.oneLiner}”
        </p>
      )}

      {badges.length > 0 && (
        <ul className="mt-3 space-y-2">
          {badges.map((awarded, i) => {
            const badge = badgeById(awarded.badgeId);
            if (!badge) return null;
            return (
              <li
                key={`${awarded.badgeId}-${i}`}
                className="flex items-start gap-2.5 rounded-xl bg-white/70 px-3 py-2 dark:bg-black/20"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {badge.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">{badge.name}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                    {awarded.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 두 사람의 성향 한줄평 + 획득 뱃지를 사람별 색으로 구분한 카드로 보여준다. */
export function PersonaCards({ view, result }: PersonaCardsProps) {
  if (result.personas.length === 0 && result.badges.length === 0) return null;

  const { owner, other } = pickOwnerOther(view);
  const ownerRef: PersonRef = { rawName: owner.rawName, name: nicknameOf(view, owner.rawName), color: OWNER_COLOR };
  const otherRef: PersonRef = { rawName: other.rawName, name: nicknameOf(view, other.rawName), color: OTHER_COLOR };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm dark:bg-[#241d17]">
      <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">우리 둘의 성향</h2>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <PersonCard person={ownerRef} result={result} />
        <PersonCard person={otherRef} result={result} />
      </div>
    </section>
  );
}
