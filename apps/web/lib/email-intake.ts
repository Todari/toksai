import type { EmailIntake } from "./api";

export const EMAIL_INTAKE_STORAGE_KEY = "toksai:pending-email-intake";

export function isActiveEmailIntake(
  intake: EmailIntake,
  now = Date.now(),
): boolean {
  return (
    /^[a-f0-9]{32}$/.test(intake.token) &&
    intake.address.startsWith(`analysis-${intake.token}@`) &&
    new Date(intake.expiresAt).getTime() > now
  );
}

export function emailIntakeErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    EMAIL_NO_SUPPORTED_FILE: "메일에 카카오톡 대화 파일(.zip, .txt, .csv)이 없어요.",
    EMAIL_MULTIPLE_CHAT_FILES: "대화 파일이 여러 개예요. zip 파일 하나만 첨부해 다시 보내주세요.",
    EMAIL_FILE_TOO_LARGE: "첨부파일이 너무 커요. 20MB 이하 파일로 다시 보내주세요.",
    CHAT_TOO_LARGE: "메시지가 너무 많아요. 더 짧은 기간으로 내보내 다시 보내주세요.",
    CHAT_TOO_LONG: "대화 기간이 너무 길어요. 최근 대화만 내보내 다시 보내주세요.",
    NOT_ONE_TO_ONE: "분석할 사람이 두 명 이상 있고, 감지된 이름이 30개 이하인 대화를 보내주세요.",
    NO_MESSAGES: "카카오톡 대화 메시지를 찾지 못했어요. 대화 내용 내보내기 파일인지 확인해주세요.",
    UNSUPPORTED_FORMAT: "카카오톡 대화 형식을 읽지 못했어요.",
  };
  return messages[code] ?? "메일을 처리하지 못했어요. 새 주소를 받아 다시 보내주세요.";
}
