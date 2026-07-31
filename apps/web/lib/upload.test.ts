import { describe, it, expect } from "vitest";
import { isSupportedChatFile, toFriendlyUploadError } from "./upload";

describe("isSupportedChatFile", () => {
  it("zip/txt/csv만 허용(대소문자 무관)", () => {
    expect(isSupportedChatFile("chat.txt")).toBe(true);
    expect(isSupportedChatFile("KakaoTalk_Chat.ZIP")).toBe(true);
    expect(isSupportedChatFile("KakaoTalk_Chat.CSV")).toBe(true);
    expect(isSupportedChatFile("photo.png")).toBe(false);
    expect(isSupportedChatFile("chat")).toBe(false);
  });
});

describe("toFriendlyUploadError", () => {
  it("네트워크 실패는 연결 안내 문구로 바꾼다", () => {
    expect(toFriendlyUploadError(new TypeError("Failed to fetch"))).toBe(
      "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
  });
  it("한글 서버 메시지는 그대로 보여준다", () => {
    expect(toFriendlyUploadError(new Error("파일이 너무 커요"))).toBe("파일이 너무 커요");
  });
  it("영문·알 수 없는 에러는 일반 안내 문구로 바꾼다", () => {
    expect(toFriendlyUploadError(new Error("Internal Server Error"))).toBe(
      "업로드에 실패했어요. 잠시 후 다시 시도해 주세요.",
    );
    expect(toFriendlyUploadError("boom")).toBe("업로드에 실패했어요. 잠시 후 다시 시도해 주세요.");
  });
});
