"use client";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { UploadApiError, uploadFile, saveAdminToken } from "../../lib/api";
import { fileKind, fileSizeBucket, trackEvent } from "../../lib/analytics";
import { isSupportedChatFile, toFriendlyUploadError, UNSUPPORTED_FILE_ERROR } from "../../lib/upload";

/**
 * 히어로의 업로드 CTA. 클릭 선택과 드래그&드롭을 모두 지원하고,
 * 실패 원인은 기술 메시지 대신 한국어 안내로 보여준다.
 */
export function UploadCta() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    if (!isSupportedChatFile(file.name)) {
      setError(UNSUPPORTED_FILE_ERROR);
      trackEvent("upload_failed", { error_code: "CLIENT_UNSUPPORTED_FILE" });
      return;
    }
    const startedAt = performance.now();
    const kind = fileKind(file.name);
    trackEvent("upload_selected", {
      file_kind: kind,
      size_bucket: fileSizeBucket(file.size),
    });
    setBusy(true);
    setError(null);
    try {
      const r = await uploadFile(file);
      saveAdminToken(r.viewToken, r.adminToken);
      trackEvent("upload_succeeded", {
        file_kind: kind,
        elapsed_ms: Math.round(performance.now() - startedAt),
      });
      router.push(`/a/${r.viewToken}/identify`);
      // 성공 시에는 페이지 이동이 끝날 때까지 busy 상태를 유지한다.
    } catch (e) {
      trackEvent("upload_failed", {
        file_kind: kind,
        error_code: e instanceof UploadApiError ? e.code : e instanceof TypeError ? "NETWORK" : "UNKNOWN",
      });
      setError(toFriendlyUploadError(e));
      setBusy(false);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!busy) setDragging(true);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="mt-8">
      <label
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group relative block cursor-pointer rounded-3xl border-2 border-dashed bg-white p-10 text-center shadow-sm transition active:scale-[0.99] dark:bg-[#241d17] ${
          dragging
            ? "scale-[1.01] border-amber-500 bg-amber-50 shadow-md dark:bg-amber-400/10"
            : "border-amber-300 hover:border-amber-400 hover:shadow-md dark:border-amber-500/30"
        }`}
      >
        <span className="pointer-events-none block">
          <span aria-hidden className="block text-4xl">
            {busy ? "⏳" : dragging ? "📂" : "💌"}
          </span>
          <span className="mt-3 block text-base font-bold text-neutral-800 dark:text-neutral-100">
            {busy ? "분석 준비 중…" : dragging ? "여기에 놓아주세요!" : "여기에 파일을 올리거나 클릭"}
          </span>
          <span className="mt-1 block text-xs text-neutral-400 dark:text-neutral-500">
            카카오톡 대화 내보내기 파일(.zip, .txt, .csv)
          </span>
        </span>
        <input
          type="file"
          accept=".zip,.txt,.csv"
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
