import { describe, expect, it, vi } from "vitest";
import { RateLimitService } from "./rate-limit.service";

describe("RateLimitService", () => {
  it("윈도우 안의 허용 횟수를 넘으면 429를 던진다", () => {
    const limiter = new RateLimitService();
    limiter.assert("upload", "client-a", 2, 60_000);
    limiter.assert("upload", "client-a", 2, 60_000);
    expect(() => limiter.assert("upload", "client-a", 2, 60_000)).toThrowError(
      /요청이 너무 많아요/,
    );
  });

  it("윈도우가 지나면 다시 허용한다", () => {
    vi.useFakeTimers();
    const limiter = new RateLimitService();
    limiter.assert("upload", "client-a", 1, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(() => limiter.assert("upload", "client-a", 1, 1_000)).not.toThrow();
    vi.useRealTimers();
  });
});
