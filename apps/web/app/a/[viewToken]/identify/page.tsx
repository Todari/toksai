"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc, loadAdminToken } from "../../../../lib/api";

type P = { id: string; rawName: string; nickname: string | null; isOwner: boolean };

export default function Identify({ params }: { params: Promise<{ viewToken: string }> }) {
  const { viewToken } = use(params);
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [parts, setParts] = useState<P[]>([]);
  const [owner, setOwner] = useState("");
  const [nick, setNick] = useState<Record<string, string>>({});

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
    trpc.analysis.get.query({ viewToken }).then((a) => {
      if (!a) return;
      setParts(a.participants);
      setNick(Object.fromEntries(a.participants.map((p) => [p.rawName, p.nickname ?? p.rawName])));
    });
  }, [viewToken]);

  async function submit() {
    await trpc.analysis.identify.mutate({ adminToken, ownerRawName: owner, nicknames: nick });
    router.push(`/a/${viewToken}`); // 결과 페이지(Plan 3)
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-bold">둘 중 나는 누구?</h1>
      <div className="mt-4 space-y-3">
        {parts.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <input type="radio" name="owner" checked={owner === p.rawName}
              onChange={() => setOwner(p.rawName)} />
            <span className="w-20 text-gray-500">{p.rawName}</span>
            <input className="flex-1 rounded border px-2 py-1" value={nick[p.rawName] ?? ""}
              onChange={(e) => setNick({ ...nick, [p.rawName]: e.target.value })} />
          </div>
        ))}
      </div>
      <button disabled={!owner || !adminToken} onClick={submit}
        className="mt-6 w-full rounded-lg bg-black py-2 text-white disabled:opacity-40">
        분석 시작
      </button>
    </main>
  );
}
