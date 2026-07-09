"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadFile, saveAdminToken } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true); setError(null);
    try {
      const r = await uploadFile(file);
      saveAdminToken(r.viewToken, r.adminToken);
      router.push(`/a/${r.viewToken}/identify`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">톡사이</h1>
      <p className="mt-2 text-sm text-gray-500">
        카카오톡 대화 내보내기(zip/txt)를 올리면 둘 사이를 분석해 드려요. 재미로 보는 관심 신호예요.
      </p>
      <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed p-10 text-center">
        {busy ? "분석 준비 중…" : "여기에 파일을 올리거나 클릭"}
        <input
          type="file" accept=".zip,.txt" className="hidden" disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </main>
  );
}
