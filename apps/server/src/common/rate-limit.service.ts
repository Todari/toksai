import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

interface WindowCounter {
  count: number;
  resetsAt: number;
}

/**
 * 단일 서버 인스턴스용 고정 윈도우 제한기.
 * 현재 배포가 서버 1대이므로 외부 저장소 없이 남용을 막고, 수평 확장 시 Redis 기반으로 교체한다.
 */
@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, WindowCounter>();

  assert(scope: string, clientId: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const key = `${scope}:${clientId || "unknown"}`;
    const current = this.counters.get(key);

    if (!current || current.resetsAt <= now) {
      this.counters.set(key, { count: 1, resetsAt: now + windowMs });
      this.prune(now);
      return;
    }

    if (current.count >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetsAt - now) / 1000));
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.",
          retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
  }

  private prune(now: number): void {
    if (this.counters.size < 1_000) return;
    for (const [key, value] of this.counters) {
      if (value.resetsAt <= now) this.counters.delete(key);
    }
  }
}
