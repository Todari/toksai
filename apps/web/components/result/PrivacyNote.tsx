/** 원본 저장 방식과 외부 AI 처리, 삭제 가능 여부를 알리는 프라이버시 고지. */
export function PrivacyNote() {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-center dark:bg-white/5">
      <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        🔒 원본 대화는 암호화되어 저장되며 분석을 위해 Google Gemini로 전송됩니다.
        <br />
        이 분석을 만든 브라우저에서는 아래 삭제 기능으로 원본과 결과를 함께 지울 수 있어요.
      </p>
    </div>
  );
}
