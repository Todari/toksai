export const GENERIC_UPLOAD_ERROR = "업로드에 실패했어요. 잠시 후 다시 시도해 주세요.";
export const NETWORK_UPLOAD_ERROR = "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
export const UNSUPPORTED_FILE_ERROR = "지원하지 않는 파일이에요. 카카오톡 대화 내보내기 파일(.zip, .txt, .csv)을 올려주세요.";

/** 카카오톡 대화 내보내기 파일(.zip/.txt/.csv)인지 확장자로 판별한다. */
export function isSupportedChatFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".txt") || lower.endsWith(".csv");
}

/**
 * 업로드 실패 원인을 사용자에게 보여줄 한국어 문구로 바꾼다.
 * 서버가 준 한국어 메시지는 그대로 쓰고, "Failed to fetch" 같은
 * 기술 메시지는 노출하지 않는다.
 */
export function toFriendlyUploadError(e: unknown): string {
  if (e instanceof TypeError) return NETWORK_UPLOAD_ERROR;
  if (e instanceof Error && /[가-힣]/.test(e.message)) return e.message;
  return GENERIC_UPLOAD_ERROR;
}
