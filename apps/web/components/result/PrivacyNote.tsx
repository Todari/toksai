/** 대화 내용의 비저장 원칙과 Gemini 전송을 알리는 프라이버시 고지. */
export function PrivacyNote() {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-center dark:bg-white/5">
      <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        🔒 대화 내용은 분석에만 사용하고 저장하지 않으며, 분석을 위해 Google Gemini로
        전송됩니다.
      </p>
    </div>
  );
}
