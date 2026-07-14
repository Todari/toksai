"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadFile, saveAdminToken } from "../../lib/api";

/**
 * 히어로의 업로드 CTA. 기존 `app/page.tsx`에 있던 업로드→식별 페이지 이동 로직을
 * 동작·문구·accept 그대로 유지한 채 이관한 것이다(회귀 방지).
 */
export function UploadCta() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
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
    <div className="mt-8">
      <label className="group relative block cursor-pointer rounded-3xl border-2 border-dashed border-amber-300 bg-white p-10 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md active:scale-[0.99] dark:border-amber-500/30 dark:bg-[#241d17]">
        <span aria-hidden className="block text-4xl">
          {busy ? "⏳" : "💌"}
        </span>
        <span className="mt-3 block text-base font-bold text-neutral-800 dark:text-neutral-100">
          {busy ? "분석 준비 중…" : "여기에 파일을 올리거나 클릭"}
        </span>
        <span className="mt-1 block text-xs text-neutral-400 dark:text-neutral-500">
          카카오톡 대화 내보내기 파일(.zip, .txt)
        </span>
        <input
          type="file"
          accept=".zip,.txt"
          className="hidden"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {error && (
        <p className="mt-4 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
