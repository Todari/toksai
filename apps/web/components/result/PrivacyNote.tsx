/** 원본 저장 방식(암호화)과 Gemini 전송, 삭제 가능 여부를 알리는 프라이버시 고지. */
export function PrivacyNote() {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-center dark:bg-white/5">
      <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        🔒 원본 대화는 암호화되어 저장되며, 분석을 위해 대화 내용이 Google Gemini로 전송됩니다.
        <br />
        관리 링크로 언제든 삭제할 수 있습니다.
      </p>
    </div>
  );
}
