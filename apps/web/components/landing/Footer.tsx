/** 서비스명 + 프라이버시 문구 + 저작권. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-2 px-4 pb-10 pt-6 text-center">
      <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">톡사이</p>
      <p className="mx-auto mt-1 max-w-[36ch] text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        원본 대화는 암호화되어 저장되며 분석을 위해 Google Gemini로 전송됩니다.
        분석을 만든 브라우저에서 원본과 결과를 언제든 삭제할 수 있어요.
      </p>
      <p className="mt-3 text-[11px] text-neutral-300 dark:text-neutral-600">© {year} 톡사이</p>
    </footer>
  );
}
