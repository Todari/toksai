"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc, loadAdminToken, startAnalysis } from "../../../../lib/api";
import { trackEvent } from "../../../../lib/analytics";

type P = { id: string; rawName: string; nickname: string | null };

const ACCENTS = [
  { dot: "#F5B301", soft: "bg-[#FDF3D6] dark:bg-[#3a2f12]", label: "text-[#8a6a00] dark:text-[#f2d187]" },
  { dot: "#FB7185", soft: "bg-[#FEE7EC] dark:bg-[#3a1f27]", label: "text-[#b23a52] dark:text-[#fba9b8]" },
];

export default function Identify({ params }: { params: Promise<{ viewToken: string }> }) {
  const { viewToken } = use(params);
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [parts, setParts] = useState<P[]>([]);
  const [nick, setNick] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
    trpc.analysis.get.query({ viewToken }).then((a) => {
      if (!a) return;
      setParts(a.participants);
      setNick(Object.fromEntries(a.participants.map((p) => [p.rawName, p.nickname ?? p.rawName])));
    });
  }, [viewToken]);

  async function submit() {
    if (busy || !adminToken) return;
    setBusy(true);
    setError("");
    try {
      // "둘 중 나" 선택 없이 닉네임만 저장(소유자 표시 없음).
      await trpc.analysis.identify.mutate({ adminToken, ownerRawName: "", nicknames: nick });
      await startAnalysis(adminToken); // 분석 시작(fire-and-forget 서버측)
      trackEvent("analysis_started");
      router.push(`/a/${viewToken}`);
    } catch {
      trackEvent("analysis_start_failed");
      setError("분석 시작에 실패했어요. 잠시 후 다시 시도해주세요.");
      setBusy(false);
    }
  }

  const nameOf = (p?: P) => (p ? (nick[p.rawName]?.trim() || p.rawName) : "");
  const previewA = nameOf(parts[0]);
  const previewB = nameOf(parts[1]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#FFFBF3] px-5 py-12 dark:bg-[#1a1714]">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center">
          <div className="text-4xl">💬</div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100">
            둘을 뭐라고 부를까요?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            기본 이름 그대로 둬도 되고,
            <br className="sm:hidden" /> 원하는 닉네임으로 바꿔도 돼요.
          </p>
        </div>

        {/* 라이브 페어링 미리보기 */}
        <div className="mt-7 flex items-center justify-center gap-3 rounded-3xl border border-black/5 bg-white/70 px-4 py-5 backdrop-blur dark:border-white/10 dark:bg-neutral-900/60">
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

        {/* 사람별 닉네임 카드 */}
        <div className="mt-5 space-y-3">
          {parts.map((p, i) => {
            const a = ACCENTS[i % ACCENTS.length];
            const val = nick[p.rawName] ?? "";
            const initial = (val.trim() || p.rawName).charAt(0) || "?";
            return (
              <div key={p.id} className={`flex items-center gap-3.5 rounded-3xl p-3.5 ${a.soft}`}>
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-sm"
                  style={{ background: a.dot }}
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-semibold ${a.label}`}>원래 이름 · {p.rawName}</div>
                  <input
                    className="mt-0.5 w-full bg-transparent text-lg font-bold text-neutral-800 outline-none placeholder:font-medium placeholder:text-neutral-400 dark:text-neutral-100"
                    value={val}
                    placeholder={p.rawName}
                    maxLength={20}
                    aria-label={`${p.rawName} 닉네임`}
                    onChange={(e) => setNick({ ...nick, [p.rawName]: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 text-center text-sm text-rose-500">{error}</p>}

        <button
          disabled={!adminToken || busy}
          onClick={submit}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#FB7185] py-3.5 text-base font-extrabold text-white shadow-md shadow-amber-300/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-none"
        >
          {busy ? "분석 시작 중…" : "분석 시작하기 →"}
        </button>
        <p className="mt-3 text-center text-xs text-neutral-400">분석은 몇 초 ~ 수십 초 걸려요</p>
      </div>
    </main>
  );
}
