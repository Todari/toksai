"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc, loadAdminToken, startAnalysis } from "../../../../lib/api";
import { trackEvent } from "../../../../lib/analytics";
import {
  buildAliasResolution,
  canonicalNameForGroup,
  groupAliases,
  initializeAliasGroups,
  type AliasGroupIndex,
} from "../../../../lib/author-aliases";

type P = { id: string; rawName: string; nickname: string | null };

const ACCENTS = [
  {
    dot: "#F5B301",
    soft: "bg-[#FDF3D6] dark:bg-[#3a2f12]",
    label: "text-[#8a6a00] dark:text-[#f2d187]",
    chip: "border-amber-300 bg-white/70 text-amber-800 dark:border-amber-400/30 dark:bg-black/10 dark:text-amber-200",
  },
  {
    dot: "#FB7185",
    soft: "bg-[#FEE7EC] dark:bg-[#3a1f27]",
    label: "text-[#b23a52] dark:text-[#fba9b8]",
    chip: "border-rose-300 bg-white/70 text-rose-700 dark:border-rose-400/30 dark:bg-black/10 dark:text-rose-200",
  },
];

export default function Identify({ params }: { params: Promise<{ viewToken: string }> }) {
  const { viewToken } = use(params);
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [parts, setParts] = useState<P[]>([]);
  const [suggestedMap, setSuggestedMap] = useState<Record<string, string>>({});
  const [assignment, setAssignment] = useState<Record<string, AliasGroupIndex>>({});
  const [groupNames, setGroupNames] = useState<[string, string]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
    trpc.analysis.get.query({ viewToken }).then((analysis) => {
      if (!analysis) return;
      const initial = initializeAliasGroups(
        analysis.participants,
        analysis.authorAliasMap,
      );

      setParts(analysis.participants);
      setSuggestedMap(initial.suggestedMap);
      setAssignment(initial.assignment);
      setGroupNames(initial.groupNames);
    });
  }, [viewToken]);

  const groups = groupAliases(parts, assignment);
  const hasNameChanges = parts.length > 2;

  function canonicalName(group: P[], index: AliasGroupIndex): string {
    return canonicalNameForGroup(group, index, suggestedMap);
  }

  function moveAlias(rawName: string) {
    const from = assignment[rawName];
    if (from === undefined) return;
    if (groups[from].length <= 1) {
      setError("각 사람에게 이름이 하나 이상 있어야 해요.");
      return;
    }
    setError("");
    setAssignment({ ...assignment, [rawName]: from === 0 ? 1 : 0 });
  }

  async function submit() {
    if (busy || !adminToken) return;
    if (groups.some((group) => group.length === 0)) {
      setError("감지된 이름을 두 사람에게 모두 나눠주세요.");
      return;
    }

    const { authorAliasMap, nicknames } = buildAliasResolution(
      parts,
      assignment,
      groupNames,
      suggestedMap,
    );

    setBusy(true);
    setError("");
    try {
      await trpc.analysis.identify.mutate({
        adminToken,
        ownerRawName: "",
        nicknames,
        authorAliasMap,
      });
      await startAnalysis(adminToken);
      trackEvent("analysis_started", { merged_aliases: parts.length - 2 });
      router.push(`/a/${viewToken}`);
    } catch {
      trackEvent("analysis_start_failed");
      setError("분석 시작에 실패했어요. 이름 묶음을 확인한 뒤 다시 시도해주세요.");
      setBusy(false);
    }
  }

  const previewA = groupNames[0].trim() || canonicalName(groups[0], 0);
  const previewB = groupNames[1].trim() || canonicalName(groups[1], 1);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-5 py-12 dark:bg-[#1a1714]">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="text-4xl">💬</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100">
            {hasNameChanges ? "같은 사람의 이름을 묶어주세요" : "둘을 뭐라고 부를까요?"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {hasNameChanges ? (
              <>
                표시 이름이 바뀐 흔적을 자동으로 묶어봤어요.
                <br />잘못 묶였다면 이름을 눌러 옮겨주세요.
              </>
            ) : (
              <>
                기본 이름 그대로 둬도 되고,
                <br className="sm:hidden" /> 원하는 닉네임으로 바꿔도 돼요.
              </>
            )}
          </p>
        </div>

        {hasNameChanges && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="font-extrabold">이름 변경이 맞는지 확인해주세요</p>
            <p className="mt-1">
              같은 사람의 예전·현재 이름만 한쪽에 묶어야 정확해요. 실제 여러 사람이 참여한
              단체방은 현재 지원하지 않아요.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 rounded-3xl border border-black/5 bg-white/70 px-4 py-5 backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
          <span
            className="max-w-[38%] truncate text-lg font-extrabold"
            style={{ color: ACCENTS[0].dot }}
          >
            {previewA || "…"}
          </span>
          <span className="text-xl">💛</span>
          <span
            className="max-w-[38%] truncate text-lg font-extrabold"
            style={{ color: ACCENTS[1].dot }}
          >
            {previewB || "…"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {groups.map((group, index) => {
            const groupIndex = index as AliasGroupIndex;
            const accent = ACCENTS[groupIndex];
            const displayName =
              groupNames[groupIndex].trim() || canonicalName(group, groupIndex);
            const initial = displayName.charAt(0) || "?";
            return (
              <div
                key={groupIndex}
                className={`flex items-start gap-3.5 rounded-3xl p-3.5 ${accent.soft}`}
              >
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-sm"
                  style={{ background: accent.dot }}
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-extrabold ${accent.label}`}>
                    사람 {groupIndex + 1} · 감지된 이름
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.map((participant) =>
                      hasNameChanges ? (
                        <button
                          key={participant.id}
                          type="button"
                          onClick={() => moveAlias(participant.rawName)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold transition hover:-translate-y-0.5 ${accent.chip}`}
                          aria-label={`${participant.rawName} 이름을 다른 사람으로 이동`}
                        >
                          {participant.rawName} ↔
                        </button>
                      ) : (
                        <span
                          key={participant.id}
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${accent.chip}`}
                        >
                          {participant.rawName}
                        </span>
                      ),
                    )}
                  </div>
                  <label className="mt-3 block">
                    <span className="sr-only">사람 {groupIndex + 1} 표시 이름</span>
                    <input
                      className="w-full border-b border-black/10 bg-transparent pb-1 text-lg font-bold text-neutral-800 outline-none transition focus:border-black/30 placeholder:font-medium placeholder:text-neutral-400 dark:border-white/10 dark:text-neutral-100 dark:focus:border-white/30"
                      value={groupNames[groupIndex]}
                      placeholder={canonicalName(group, groupIndex)}
                      maxLength={20}
                      onChange={(event) => {
                        const next = [...groupNames] as [string, string];
                        next[groupIndex] = event.target.value;
                        setGroupNames(next);
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 text-center text-sm text-rose-500">{error}</p>}

        <button
          disabled={!adminToken || busy || groups.some((group) => group.length === 0)}
          onClick={submit}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-3.5 text-base font-extrabold text-white shadow-md shadow-amber-300/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-none"
        >
          {busy ? "분석 시작 중…" : "이대로 분석 시작하기 →"}
        </button>
        <p className="mt-3 text-center text-xs text-neutral-400">분석은 몇 초 ~ 수십 초 걸려요</p>
      </div>
    </main>
  );
}
