import { describe, expect, it } from "vitest";
import { fileKind, fileSizeBucket } from "./analytics";

describe("analytics helpers", () => {
  it("개인정보 대신 파일 종류만 분류한다", () => {
    expect(fileKind("민수와 대화.ZIP")).toBe("zip");
    expect(fileKind("chat.csv")).toBe("csv");
    expect(fileKind("photo.png")).toBe("other");
  });

  it("정확한 파일 크기 대신 구간으로 분류한다", () => {
    expect(fileSizeBucket(500)).toBe("under_1mb");
    expect(fileSizeBucket(2 * 1024 * 1024)).toBe("1_to_5mb");
    expect(fileSizeBucket(12 * 1024 * 1024)).toBe("over_10mb");
  });
});
