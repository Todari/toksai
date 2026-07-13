export function AnalyzingState() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
      <p className="text-gray-600">
        둘 사이를 분석하는 중…
        <br />
        <span className="text-sm text-gray-400">(수십 초 걸릴 수 있어요)</span>
      </p>
    </main>
  );
}
