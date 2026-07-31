type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue | undefined>;

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, params?: AnalyticsParams) => void;
};

/** 대화 내용·파일명·닉네임을 넣지 않는 제품 퍼널 이벤트 전송기. */
export function trackEvent(eventName: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", eventName, params);
}

export function fileKind(fileName: string): "zip" | "txt" | "csv" | "other" {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "zip" || extension === "txt" || extension === "csv") return extension;
  return "other";
}

export function fileSizeBucket(size: number): string {
  if (size < 1024 * 1024) return "under_1mb";
  if (size < 5 * 1024 * 1024) return "1_to_5mb";
  if (size < 10 * 1024 * 1024) return "5_to_10mb";
  return "over_10mb";
}
