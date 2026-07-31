import { describe, expect, it } from "vitest";
import { emailIntakeErrorMessage, isActiveEmailIntake } from "./email-intake";

describe("isActiveEmailIntake", () => {
  const intake = {
    token: "a".repeat(32),
    address: `analysis-${"a".repeat(32)}@talk.todari.dev`,
    expiresAt: "2026-08-01T00:00:00.000Z",
  };

  it("유효한 전용 주소와 만료시간이면 복구할 수 있다", () => {
    expect(isActiveEmailIntake(intake, new Date("2026-07-31T00:00:00Z").getTime())).toBe(true);
  });

  it("만료된 주소는 복구하지 않는다", () => {
    expect(isActiveEmailIntake(intake, new Date("2026-08-02T00:00:00Z").getTime())).toBe(false);
  });
});

describe("emailIntakeErrorMessage", () => {
  it("첨부가 없을 때 구체적인 해결 방법을 안내한다", () => {
    expect(emailIntakeErrorMessage("EMAIL_NO_SUPPORTED_FILE")).toContain(".zip");
  });
});
