# 톡사이 Foundation & Ingestion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오톡 iOS 내보내기 파일(zip/txt)을 업로드하면 서버가 압축해제·파싱해 1:1 대화의 두 참가자를 추출하고, 원본을 암호화 저장한 뒤, 사용자가 "둘 중 나"와 닉네임을 지정할 수 있는 기반 시스템을 만든다.

**Architecture:** `trade-tower`/`band-check` 모노레포 관례를 **그대로** 따른다. 내부 패키지(`shared`/`db`/`api`)는 CommonJS `dist/`로 빌드(`build: tsc`, `main: dist/index.js`, `types: src/index.ts`, `type:module` 없음, import 확장자 없음)하고, CJS NestJS 서버가 이를 `require`한다. tRPC **계약(라우터·컨텍스트 인터페이스·DTO 타입)은 전부 `packages/api`** 에 두고, 서버는 요청 시 컨텍스트 구현만 주입하며, 웹은 `@toksai/api`에서 `AppRouter` 타입만 가져온다. 의존성: `server → api, db, shared` / `web → api` / `api → (독립)` / `db, shared → 독립`.

**Tech Stack:** pnpm@9.15 · Turborepo · TypeScript 5.7 · NestJS 11 · Next.js 16(App Router) · React 19 · Tailwind v4 · Prisma 6.4 + PostgreSQL 16 · tRPC 11 · Zod · Vitest 3 · Docker Compose · Node 22.

## Global Constraints

- **패키지 매니저**: pnpm@9.15.0, corepack. workspace = `apps/*`, `packages/*`.
- **모듈 규약(중요, B1/B3)**: 내부 패키지는 `type:module` 금지, `main: "./dist/index.js"`, `types: "./src/index.ts"`, `"build": "tsc"`. **모든 소스 import는 확장자 없이** 작성(`from "./x"`, `from "../types"`). `.js` 확장자 붙이지 말 것.
- **TS 프리셋**: `@toksai/tsconfig`의 `base.json`(es2022 / moduleResolution bundler), `nestjs.json`(commonjs / node, 데코레이터, outDir dist), `nextjs.json`(dom lib, jsx). 패키지/서버는 `nestjs.json`, 웹은 `nextjs.json` 확장.
- **tRPC 규약(B2)**: 라우터·`TrpcContext`·DTO 타입은 `packages/api`. 서버는 `@toksai/api`의 `appRouter`(값)를 서빙하고 컨텍스트 구현을 주입. 웹은 `@toksai/api`의 `AppRouter`(타입)만 import.
- **DB 적용 방식**: 로컬/CI/프로덕션 모두 Prisma `db push`(migrate 아님). 컨테이너 엔트리포인트에서 `prisma db push`. 로컬은 `dotenv -e ../../.env -- prisma db push`.
- **환경변수 키**: `DATABASE_URL`, `GEMINI_API_KEY`, `ENCRYPTION_KEY`(base64 32바이트), `PORT`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `NODE_ENV`, `TZ=Asia/Seoul`. compose 필수값은 `${VAR:?required}`.
- **내부 패키지 스코프**: `@toksai/db`, `@toksai/api`, `@toksai/shared`, `@toksai/tsconfig`. 내부 참조는 `workspace:*`.
- **1:1 대화만**: 파서가 화자를 정확히 2명 추출하지 못하면 명확한 에러로 거부.
- **대상 포맷**: iOS 카카오톡 "텍스트 메시지만 내보내기". 안드로이드/PC는 범위 밖(파서는 어댑터 구조).
- **원본 암호화**: `RawChat.encryptedText`는 AES-256-GCM. 키는 `ENCRYPTION_KEY`.
- **토큰**: `viewToken`/`adminToken`은 24바이트 난수 base64url.
- **업로드 제한**: 허용 확장자 `.zip`,`.txt`, 최대 20MB.
- **카피 톤**: 사용자 대면 문구 한국어. 호감도는 "재미로 보는 관심 신호"(단정 금지).

---

## File Structure

- 루트: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `.env.example`
- `packages/tsconfig/{package.json,base.json,nestjs.json,nextjs.json}` — 공유 TS 프리셋
- `packages/shared/` — 도메인 타입 + 순수 파서(핵심 로직)
- `packages/db/` — Prisma 스키마 + 클라이언트
- `packages/api/` — tRPC 계약(컨텍스트 인터페이스·DTO·라우터·`AppRouter`)
- `apps/server/` — Nest 부트스트랩, 공통 유틸(crypto/token), 업로드 컨트롤러, 파일 추출·분석 서비스, tRPC 마운트
- `apps/web/` — 랜딩/업로드/식별 페이지, tRPC 클라이언트
- `docker-compose.yml`(로컬 PG), `docker-compose.prod.yml`, `apps/server/Dockerfile`, `apps/server/entrypoint.sh`

의존성 순서(빌드): `shared`,`db`,`api` → `server` / `api` → `web`.

---

## Task 1: 모노레포 스캐폴딩 + TS 프리셋

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `.env.example`
- Create: `packages/tsconfig/{package.json,base.json,nestjs.json,nextjs.json}`

**Interfaces:**
- Produces: 루트 스크립트(turbo 위임), `@toksai/tsconfig` 프리셋 3종.

- [ ] **Step 1: 루트 워크스페이스 파일 생성**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json`:
```json
{
  "name": "toksai",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:generate": "pnpm --filter @toksai/db generate",
    "db:push": "pnpm --filter @toksai/db push"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "dependsOn": ["^build"], "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "test": {},
    "lint": {}
  }
}
```

`.nvmrc`:
```
22
```

`.gitignore`:
```
node_modules
dist
.next
.env
.env.production
*.log
.turbo
*.tsbuildinfo
```

`.env.example`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/toksai
GEMINI_API_KEY=
ENCRYPTION_KEY=
PORT=4100
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4100
NODE_ENV=development
TZ=Asia/Seoul
```

- [ ] **Step 2: tsconfig 프리셋 패키지 생성**

`packages/tsconfig/package.json`:
```json
{
  "name": "@toksai/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["base.json", "nestjs.json", "nextjs.json"]
}
```

`packages/tsconfig/base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

`packages/tsconfig/nestjs.json`:
```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "outDir": "dist"
  }
}
```

`packages/tsconfig/nextjs.json`:
```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "allowJs": true,
    "incremental": true
  }
}
```

- [ ] **Step 3: 설치 검증**

Run: `pnpm install`
Expected: 성공, `pnpm-lock.yaml` 생성, 워크스페이스 경고 없음.

- [ ] **Step 4: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold pnpm+turbo monorepo with tsconfig presets"
```

---

## Task 2: 로컬 PostgreSQL (docker compose) + .env

> S6 반영: DB 작업(Task 5)보다 먼저 Postgres와 `.env`를 준비한다.

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Produces: 로컬 `postgres:16-alpine`(127.0.0.1:5432), DB `toksai`. `.env` 준비.

- [ ] **Step 1: compose 작성**

`docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: toksai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["127.0.0.1:5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
volumes:
  pgdata:
```

- [ ] **Step 2: 기동 & .env 준비**

Run: `docker compose up -d postgres`
Expected: 컨테이너 healthy (`docker compose ps`에서 healthy).

Run: `cp .env.example .env`
그다음 `ENCRYPTION_KEY`를 채운다:
Run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
출력값을 `.env`의 `ENCRYPTION_KEY=`에 붙여넣는다.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: local postgres via docker compose"
```

---

## Task 3: `packages/shared` — 도메인 타입 & 파서 스켈레톤

**Files:**
- Create: `packages/shared/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/shared/src/types.ts`, `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `interface Message { author: string; at: Date; text: string }`
  - `interface ParticipantInfo { rawName: string; messageCount: number }`
  - `interface ParsedChat { messages: Message[]; participants: ParticipantInfo[]; startedAt: Date; endedAt: Date }`
  - `class ParseError extends Error { code: 'NO_MESSAGES' | 'NOT_ONE_TO_ONE' }`

- [ ] **Step 1: 패키지 설정 생성** (B1: dist main, build:tsc, type:module 없음)

`packages/shared/package.json`:
```json
{
  "name": "@toksai/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "echo skip"
  },
  "devDependencies": {
    "@toksai/tsconfig": "workspace:*",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{ "extends": "@toksai/tsconfig/nestjs.json", "include": ["src"] }
```

`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 2: 도메인 타입 작성**

`packages/shared/src/types.ts`:
```ts
export interface Message {
  author: string;
  at: Date;
  text: string;
}

export interface ParticipantInfo {
  rawName: string;
  messageCount: number;
}

export interface ParsedChat {
  messages: Message[];
  participants: ParticipantInfo[];
  startedAt: Date;
  endedAt: Date;
}

export type ParseErrorCode = "NO_MESSAGES" | "NOT_ONE_TO_ONE";

export class ParseError extends Error {
  constructor(public code: ParseErrorCode, message: string) {
    super(message);
    this.name = "ParseError";
  }
}
```

- [ ] **Step 3: index export 작성** (확장자 없음)

`packages/shared/src/index.ts`:
```ts
export * from "./types";
export * from "./parser/kakao-parser";
```

- [ ] **Step 4: 타입체크 (파서 미구현이라 실패 예상)**

Run: `pnpm --filter @toksai/shared typecheck`
Expected: FAIL — `./parser/kakao-parser` 미존재. (다음 태스크에서 해소)

- [ ] **Step 5: Commit**

```bash
git add packages/shared packages/tsconfig
git commit -m "feat(shared): domain types and package setup"
```

---

## Task 4: iOS 카카오톡 파서 (TDD 핵심)

**Files:**
- Create: `packages/shared/src/parser/kakao-parser.ts`
- Test: `packages/shared/src/parser/kakao-parser.test.ts`

**Interfaces:**
- Consumes: `Message`, `ParsedChat`, `ParticipantInfo`, `ParseError` from `../types`.
- Produces:
  - `interface KakaoParser { parse(raw: string): ParsedChat }`
  - `class IosKakaoParser implements KakaoParser`
  - `function parseKakao(raw: string): ParsedChat`

파서 규칙:
- 메시지 줄: `YYYY. M. D. (오전|오후) h:mm, 이름 : 내용`. 이름은 첫 ` : ` 앞까지(non-greedy), 내용은 나머지 전체.
- `오전 12`→0시, `오후 12`→12시, `오후 1~11`→+12, `오전 1~11`→그대로.
- **메시지 줄이 아닌 줄** 중 (a) 빈 줄, (b) 날짜 구분선(`YYYY년 M월 D일 …요일`)은 **무시**. 그 외의 비-메시지 줄만 직전 메시지에 `\n` 병합(멀티라인). 첫 메시지 이전 줄은 전부 무시. **(S4 반영: 날짜 구분선/빈 줄이 메시지에 붙어 원본을 오염시키지 않도록)**
- 참가자 = 등장 순서 distinct 이름. 2명 아니면 `NOT_ONE_TO_ONE`, 0개면 `NO_MESSAGES`.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/parser/kakao-parser.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseKakao } from "./kakao-parser";
import { ParseError } from "../types";

const SAMPLE = `Talk_2026.4.1 15:32-1.txt
저장한 날짜 : 2026. 5. 24. 오전 12:47



2025년 4월 4일 금요일
2025. 4. 4. 오후 11:42, 김승현 : 민성아
2025. 4. 4. 오후 11:42, 김승현 : 너근데 검사 언제옴 ㅡㅡ
2025. 4. 4. 오후 11:58, 곽민성 : 나 진짜
2025. 4. 4. 오후 11:58, 곽민성 : 만간 갈거야

2025년 4월 5일 토요일
2025. 4. 5. 오전 12:19, 김승현 : ㅃㄹ 해 ㅡㅡ
2025. 4. 5. 오전 8:20, 김승현 : 아~~왜5월~~`;

describe("parseKakao (iOS)", () => {
  it("파일 헤더/날짜 헤더/빈 줄을 건너뛰고 메시지만 추출한다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.messages).toHaveLength(6);
    expect(r.messages[0]).toMatchObject({ author: "김승현", text: "민성아" });
  });

  it("오후 11:42→23:42, 오전 12:19→00:19, 오전 8:20→08:20", () => {
    const r = parseKakao(SAMPLE);
    expect(r.messages[0].at.getHours()).toBe(23);
    expect(r.messages[0].at.getMinutes()).toBe(42);
    const midnight = r.messages.find((m) => m.text === "ㅃㄹ 해 ㅡㅡ")!;
    expect(midnight.at.getHours()).toBe(0);
    expect(midnight.at.getMinutes()).toBe(19);
    const morning = r.messages.find((m) => m.text.startsWith("아~~"))!;
    expect(morning.at.getHours()).toBe(8);
  });

  it("오후 12시=정오(12), 오전 12시=자정(0)", () => {
    const raw = `2025. 1. 1. 오후 12:00, 김승현 : 점심
2025. 1. 1. 오전 12:00, 곽민성 : 자정`;
    const r = parseKakao(raw);
    expect(r.messages[0].at.getHours()).toBe(12);
    expect(r.messages[1].at.getHours()).toBe(0);
  });

  it("메시지 줄이 아닌 다음 줄은 직전 메시지에 병합한다", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 첫줄
둘째줄
셋째줄
2025. 1. 1. 오후 1:01, 곽민성 : 답장`;
    const r = parseKakao(raw);
    expect(r.messages).toHaveLength(2);
    expect(r.messages[0].text).toBe("첫줄\n둘째줄\n셋째줄");
  });

  it("날짜 구분선과 빈 줄은 이전 메시지에 붙지 않는다 (원본 오염 방지)", () => {
    const r = parseKakao(SAMPLE);
    const crossDay = r.messages.find((m) => m.author === "곽민성" && m.text.includes("만간"))!;
    expect(crossDay.text).toBe("만간 갈거야");
  });

  it("참가자를 등장 순서로 2명 추출하고 메시지 수를 센다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.participants.map((p) => p.rawName)).toEqual(["김승현", "곽민성"]);
    expect(r.participants.find((p) => p.rawName === "김승현")!.messageCount).toBe(4);
  });

  it("startedAt/endedAt를 첫/마지막 메시지 시각으로 채운다", () => {
    const r = parseKakao(SAMPLE);
    expect(r.startedAt.getTime()).toBe(r.messages[0].at.getTime());
    expect(r.endedAt.getTime()).toBe(r.messages[r.messages.length - 1].at.getTime());
  });

  it("내용에 콜론이 있어도 첫 ' : '만 구분자로 쓴다", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 시간은 3 : 30이야`;
    const r = parseKakao(raw);
    expect(r.messages[0].author).toBe("김승현");
    expect(r.messages[0].text).toBe("시간은 3 : 30이야");
  });

  it("화자가 1명이면 NOT_ONE_TO_ONE", () => {
    const raw = `2025. 1. 1. 오후 1:00, 김승현 : 혼잣말`;
    expect(() => parseKakao(raw)).toThrowError(ParseError);
    try { parseKakao(raw); } catch (e) { expect((e as ParseError).code).toBe("NOT_ONE_TO_ONE"); }
  });

  it("화자가 3명이면 NOT_ONE_TO_ONE", () => {
    const raw = `2025. 1. 1. 오후 1:00, A : 안녕
2025. 1. 1. 오후 1:01, B : 하이
2025. 1. 1. 오후 1:02, C : 반가워`;
    try { parseKakao(raw); } catch (e) { expect((e as ParseError).code).toBe("NOT_ONE_TO_ONE"); }
  });

  it("메시지가 없으면 NO_MESSAGES", () => {
    try { parseKakao("Talk_x.txt\n저장한 날짜 : 2026. 1. 1. 오전 1:00\n\n"); }
    catch (e) { expect((e as ParseError).code).toBe("NO_MESSAGES"); }
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm --filter @toksai/shared test`
Expected: FAIL — `kakao-parser` 미존재 / `parseKakao` 미정의.

- [ ] **Step 3: 파서 구현**

`packages/shared/src/parser/kakao-parser.ts`:
```ts
import { Message, ParsedChat, ParticipantInfo, ParseError } from "../types";

const MSG_RE =
  /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (오전|오후) (\d{1,2}):(\d{2}), (.+?) : ([\s\S]*)$/;
const DATE_HEADER_RE = /^\d{4}년 \d{1,2}월 \d{1,2}일 .+요일$/;

function toDate(
  y: string, mo: string, d: string, ampm: string, h: string, mi: string,
): Date {
  let hour = parseInt(h, 10);
  if (ampm === "오전") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return new Date(
    parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10), hour, parseInt(mi, 10),
  );
}

export interface KakaoParser {
  parse(raw: string): ParsedChat;
}

export class IosKakaoParser implements KakaoParser {
  parse(raw: string): ParsedChat {
    const lines = raw.split(/\r?\n/);
    const messages: Message[] = [];
    for (const line of lines) {
      const m = MSG_RE.exec(line);
      if (m) {
        const [, y, mo, d, ampm, h, mi, author, text] = m;
        messages.push({ author, at: toDate(y, mo, d, ampm, h, mi), text });
        continue;
      }
      // 비-메시지 줄: 빈 줄/날짜 구분선은 버리고, 그 외만 멀티라인 병합
      if (messages.length === 0) continue;
      if (line.trim() === "" || DATE_HEADER_RE.test(line)) continue;
      messages[messages.length - 1].text += "\n" + line;
    }

    if (messages.length === 0) {
      throw new ParseError("NO_MESSAGES", "대화 메시지를 찾지 못했습니다.");
    }

    const order: string[] = [];
    const counts = new Map<string, number>();
    for (const msg of messages) {
      if (!counts.has(msg.author)) order.push(msg.author);
      counts.set(msg.author, (counts.get(msg.author) ?? 0) + 1);
    }
    if (order.length !== 2) {
      throw new ParseError(
        "NOT_ONE_TO_ONE",
        `1:1 대화만 지원합니다 (감지된 화자 ${order.length}명).`,
      );
    }
    const participants: ParticipantInfo[] = order.map((rawName) => ({
      rawName,
      messageCount: counts.get(rawName)!,
    }));

    return {
      messages,
      participants,
      startedAt: messages[0].at,
      endedAt: messages[messages.length - 1].at,
    };
  }
}

export function parseKakao(raw: string): ParsedChat {
  return new IosKakaoParser().parse(raw);
}
```

- [ ] **Step 4: 테스트/타입체크 통과 확인**

Run: `pnpm --filter @toksai/shared test`
Expected: PASS (11 tests).
Run: `pnpm --filter @toksai/shared typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/parser
git commit -m "feat(shared): iOS KakaoTalk parser with TDD"
```

---

## Task 5: `packages/db` — Prisma 스키마 & 클라이언트

**Files:**
- Create: `packages/db/{package.json,tsconfig.json}`, `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`

**Interfaces:**
- Produces: 모델 `Analysis/Participant/RawChat/AnalysisResult`(+`AnalysisStatus`), `export const prisma: PrismaClient`, `export * from "@prisma/client"`.

- [ ] **Step 1: 패키지 설정 생성** (build가 generate+tsc; dotenv-cli ^8)

`packages/db/package.json`:
```json
{
  "name": "@toksai/db",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "push": "dotenv -e ../../.env -- prisma db push",
    "build": "prisma generate && tsc",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "dependencies": { "@prisma/client": "^6.4.0" },
  "devDependencies": {
    "@toksai/tsconfig": "workspace:*",
    "dotenv-cli": "^8.0.0",
    "prisma": "^6.4.0",
    "typescript": "^5.7.0"
  }
}
```

`packages/db/tsconfig.json`:
```json
{ "extends": "@toksai/tsconfig/nestjs.json", "include": ["src"] }
```

- [ ] **Step 2: 스키마 작성** (스펙 §5)

`packages/db/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AnalysisStatus {
  PENDING
  PARSING
  IDENTIFYING
  ANALYZING
  DONE
  FAILED
}

model Analysis {
  id         String         @id @default(cuid())
  viewToken  String         @unique
  adminToken String         @unique
  status     AnalysisStatus @default(PENDING)
  sourceType String         @default("upload")
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  participants Participant[]
  rawChat      RawChat?
  result       AnalysisResult?
}

model Participant {
  id         String   @id @default(cuid())
  analysisId String
  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  rawName    String
  nickname   String?
  isOwner    Boolean  @default(false)
}

model RawChat {
  id            String   @id @default(cuid())
  analysisId    String   @unique
  analysis      Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  encryptedText String
  messageCount  Int
  startedAt     DateTime
  endedAt       DateTime
}

model AnalysisResult {
  id             String   @id @default(cuid())
  analysisId     String   @unique
  analysis       Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  stats          Json
  timeline       Json
  affinitySeries Json
  keywords       Json
  personas       Json
  badges         Json
  chemiScore     Int
  relationType   Json
  highlights     Json
  createdAt      DateTime @default(now())
}
```

- [ ] **Step 3: 클라이언트 싱글턴 export**

`packages/db/src/index.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
```

- [ ] **Step 4: 생성 & DB 반영 검증** (Task 2에서 Postgres·`.env` 준비됨)

Run: `pnpm --filter @toksai/db generate`
Expected: `@prisma/client` 생성 성공.

Run: `pnpm --filter @toksai/db push`
Expected: 테이블 4개 생성.

Run: `pnpm --filter @toksai/db build`
Expected: `dist/index.js` 생성.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): prisma schema and client"
```

---

## Task 6: `packages/api` — tRPC 계약 (컨텍스트·DTO·라우터)

> B2 반영: tRPC 계약 전체를 여기 둔다. 서버 클래스에 의존하지 않는다.

**Files:**
- Create: `packages/api/{package.json,tsconfig.json}`
- Create: `packages/api/src/{context.ts,trpc.ts,root.ts,index.ts}`, `packages/api/src/router/analysis.router.ts`

**Interfaces:**
- Produces:
  - `interface ParticipantView { id; rawName; nickname: string|null; isOwner }`
  - `interface AnalysisView { id; status; createdAt: Date; participants: ParticipantView[] }`
  - `interface AnalysisContract { getByViewToken(viewToken): Promise<AnalysisView|null>; identify(adminToken, ownerRawName, nicknames: Record<string,string>): Promise<void> }`
  - `interface TrpcContext { analysis: AnalysisContract }`
  - `const appRouter` (값), `type AppRouter`

- [ ] **Step 1: 패키지 설정 생성**

`packages/api/package.json`:
```json
{
  "name": "@toksai/api",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@toksai/tsconfig": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

`packages/api/tsconfig.json`:
```json
{ "extends": "@toksai/tsconfig/nestjs.json", "include": ["src"] }
```

- [ ] **Step 2: 컨텍스트/DTO 인터페이스 작성**

`packages/api/src/context.ts`:
```ts
export interface ParticipantView {
  id: string;
  rawName: string;
  nickname: string | null;
  isOwner: boolean;
}

export interface AnalysisView {
  id: string;
  status: string;
  createdAt: Date;
  participants: ParticipantView[];
}

export interface AnalysisContract {
  getByViewToken(viewToken: string): Promise<AnalysisView | null>;
  identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
  ): Promise<void>;
}

export interface TrpcContext {
  analysis: AnalysisContract;
}
```

- [ ] **Step 3: tRPC 초기화 + 라우터 작성**

`packages/api/src/trpc.ts`:
```ts
import { initTRPC } from "@trpc/server";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
```

`packages/api/src/router/analysis.router.ts`:
```ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const analysisRouter = router({
  get: publicProcedure
    .input(z.object({ viewToken: z.string() }))
    .query(({ input, ctx }) => ctx.analysis.getByViewToken(input.viewToken)),
  identify: publicProcedure
    .input(
      z.object({
        adminToken: z.string(),
        ownerRawName: z.string(),
        nicknames: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.analysis.identify(input.adminToken, input.ownerRawName, input.nicknames);
      return { ok: true as const };
    }),
});
```

`packages/api/src/root.ts`:
```ts
import { router } from "./trpc";
import { analysisRouter } from "./router/analysis.router";

export const appRouter = router({ analysis: analysisRouter });
export type AppRouter = typeof appRouter;
```

`packages/api/src/index.ts`:
```ts
export * from "./context";
export { appRouter } from "./root";
export type { AppRouter } from "./root";
```

- [ ] **Step 4: 빌드 & 타입체크**

Run: `pnpm --filter @toksai/api build`
Expected: `dist/index.js` 생성.
Run: `pnpm --filter @toksai/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api
git commit -m "feat(api): trpc contract (context, dto, analysis router)"
```

---

## Task 7: 서버 스캐폴딩 + 공통 유틸 (crypto/token, TDD)

**Files:**
- Create: `apps/server/{package.json,tsconfig.json,tsconfig.build.json,nest-cli.json,vitest.config.ts}`
- Create: `apps/server/src/common/crypto/crypto.service.ts` (+ `.test.ts`)
- Create: `apps/server/src/common/token.util.ts` (+ `.test.ts`)

**Interfaces:**
- Produces:
  - `class CryptoService { encrypt(plain): string; decrypt(payload): string }` (형식 `iv:tag:ciphertext` base64, AES-256-GCM, 키=`ENCRYPTION_KEY`)
  - `function generateToken(bytes = 24): string`

- [ ] **Step 1: 서버 패키지 설정 생성** (S2: multer + @types/multer 포함)

`apps/server/package.json`:
```json
{
  "name": "@toksai/server",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "lint": "echo skip"
  },
  "dependencies": {
    "@toksai/api": "workspace:*",
    "@toksai/db": "workspace:*",
    "@toksai/shared": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "adm-zip": "^0.5.16",
    "multer": "^1.4.5-lts.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@toksai/tsconfig": "workspace:*",
    "@types/adm-zip": "^0.5.7",
    "@types/express": "^5.0.0",
    "@types/multer": "^1.4.0",
    "@types/node": "^22.0.0",
    "@nestjs/cli": "^11.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/server/nest-cli.json`:
```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

`apps/server/tsconfig.json`:
```json
{
  "extends": "@toksai/tsconfig/nestjs.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

`apps/server/tsconfig.build.json`:
```json
{ "extends": "./tsconfig.json", "exclude": ["**/*.test.ts"] }
```

`apps/server/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 2: 암호화 실패 테스트 작성**

`apps/server/src/common/crypto/crypto.service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { CryptoService } from "./crypto.service";

const KEY = randomBytes(32).toString("base64");

describe("CryptoService", () => {
  it("암호화 후 복호화하면 원문이 복원된다", () => {
    const svc = new CryptoService(KEY);
    const plain = "김승현 : 민성아\n곽민성 : 나 진짜";
    const enc = svc.encrypt(plain);
    expect(enc).not.toContain("민성아");
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it("매 암호화마다 IV가 달라 결과가 다르다", () => {
    const svc = new CryptoService(KEY);
    expect(svc.encrypt("x")).not.toBe(svc.encrypt("x"));
  });

  it("변조된 암호문은 복호화에 실패한다", () => {
    const svc = new CryptoService(KEY);
    const enc = svc.encrypt("secret");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "B" : "A");
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
```

- [ ] **Step 3: 실행하여 실패 확인**

Run: `pnpm --filter @toksai/server test crypto`
Expected: FAIL — `crypto.service` 미존재.

- [ ] **Step 4: 암호화 서비스 구현**

`apps/server/src/common/crypto/crypto.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(keyBase64 = process.env.ENCRYPTION_KEY ?? "") {
    const key = Buffer.from(keyBase64, "base64");
    if (key.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (base64)");
    }
    this.key = key;
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, ctB64] = payload.split(":");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  }
}
```

- [ ] **Step 5: 토큰 실패 테스트 작성**

`apps/server/src/common/token.util.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateToken } from "./token.util";

describe("generateToken", () => {
  it("base64url 문자만 포함한다", () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("호출마다 고유하다", () => {
    const set = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(set.size).toBe(100);
  });
  it("충분히 길다(24바이트 → 32자 이상)", () => {
    expect(generateToken().length).toBeGreaterThanOrEqual(32);
  });
});
```

- [ ] **Step 6: 토큰 유틸 구현**

`apps/server/src/common/token.util.ts`:
```ts
import { randomBytes } from "node:crypto";

export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
```

- [ ] **Step 7: 전체 테스트 통과 확인**

Run: `pnpm --filter @toksai/server test`
Expected: PASS (crypto 3 + token 3).

- [ ] **Step 8: Commit**

```bash
git add apps/server
git commit -m "feat(server): scaffold + crypto service and token util (TDD)"
```

---

## Task 8: 파일 추출 서비스 (zip/txt, TDD)

**Files:**
- Create: `apps/server/src/upload/file-extract.service.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `adm-zip`.
- Produces: `class FileExtractService { extractChatText(buffer: Buffer, filename: string): string }`
  - `.txt`→utf8. `.zip`→첫 `.txt` 엔트리 utf8, 디렉토리 엔트리 무시. `.txt` 없으면 `Error("NO_TXT_IN_ZIP")`, 지원 외 `Error("UNSUPPORTED_FILE")`.

- [ ] **Step 1: 실패 테스트 작성**

`apps/server/src/upload/file-extract.service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";
import { FileExtractService } from "./file-extract.service";

const svc = new FileExtractService();

describe("FileExtractService", () => {
  it("txt 버퍼를 문자열로 반환한다", () => {
    const text = "2025. 1. 1. 오후 1:00, A : 안녕";
    expect(svc.extractChatText(Buffer.from(text, "utf8"), "chat.txt")).toBe(text);
  });

  it("zip 내부의 첫 txt를 추출한다", () => {
    const zip = new AdmZip();
    zip.addFile("Talk_x.txt", Buffer.from("hello", "utf8"));
    expect(svc.extractChatText(zip.toBuffer(), "Kakaotalk.zip")).toBe("hello");
  });

  it("zip에 txt가 없으면 NO_TXT_IN_ZIP", () => {
    const zip = new AdmZip();
    zip.addFile("readme.md", Buffer.from("x", "utf8"));
    expect(() => svc.extractChatText(zip.toBuffer(), "a.zip")).toThrowError(/NO_TXT_IN_ZIP/);
  });

  it("지원하지 않는 확장자는 UNSUPPORTED_FILE", () => {
    expect(() => svc.extractChatText(Buffer.from("x"), "a.pdf")).toThrowError(/UNSUPPORTED_FILE/);
  });
});
```

- [ ] **Step 2: 실행하여 실패 확인**

Run: `pnpm --filter @toksai/server test file-extract`
Expected: FAIL — 서비스 미존재.

- [ ] **Step 3: 구현**

`apps/server/src/upload/file-extract.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import AdmZip from "adm-zip";

@Injectable()
export class FileExtractService {
  extractChatText(buffer: Buffer, filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt")) {
      return buffer.toString("utf8");
    }
    if (lower.endsWith(".zip")) {
      const zip = new AdmZip(buffer);
      const entry = zip
        .getEntries()
        .find((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".txt"));
      if (!entry) throw new Error("NO_TXT_IN_ZIP");
      return entry.getData().toString("utf8");
    }
    throw new Error("UNSUPPORTED_FILE");
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @toksai/server test file-extract`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/upload
git commit -m "feat(server): file extraction service (zip/txt) with TDD"
```

---

## Task 9: 분석 서비스 — 업로드→파싱→영속화 (AnalysisContract 구현, TDD)

**Files:**
- Create: `apps/server/src/analysis/analysis.service.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `FileExtractService`, `CryptoService`, `generateToken`, `parseKakao`(@toksai/shared), `PrismaClient`(@toksai/db), `AnalysisContract`/`AnalysisView`(@toksai/api).
- Produces:
  - `class AnalysisService implements AnalysisContract`
  - `createFromUpload(buffer, filename): Promise<{ id; viewToken; adminToken }>`
  - `getByViewToken(viewToken): Promise<AnalysisView | null>`
  - `identify(adminToken, ownerRawName, nicknames): Promise<void>`

- [ ] **Step 1: 실패 테스트 작성** (의존성 생성자 주입, prisma mock)

`apps/server/src/analysis/analysis.service.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { AnalysisService } from "./analysis.service";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";

const SAMPLE = `2025. 4. 4. 오후 11:42, 김승현 : 민성아
2025. 4. 5. 오전 12:19, 곽민성 : 나 진짜`;

function makePrismaMock() {
  const store: any = {};
  return {
    analysis: {
      create: vi.fn(async ({ data }: any) => {
        store.analysis = { id: "a1", ...data };
        return store.analysis;
      }),
    },
  } as any;
}

describe("AnalysisService.createFromUpload", () => {
  it("파싱 성공 시 토큰과 함께 생성하고 원본을 암호문으로 저장한다", async () => {
    const prisma = makePrismaMock();
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto);

    const r = await svc.createFromUpload(Buffer.from(SAMPLE, "utf8"), "chat.txt");

    expect(r.viewToken).toBeTruthy();
    expect(r.adminToken).toBeTruthy();
    const createArg = prisma.analysis.create.mock.calls[0][0].data;
    expect(JSON.stringify(createArg)).not.toContain("민성아"); // 평문 저장 금지
    expect(createArg.participants.create).toHaveLength(2);
  });

  it("1:1이 아니면 에러를 전파한다", async () => {
    const prisma = makePrismaMock();
    const crypto = new CryptoService(randomBytes(32).toString("base64"));
    const svc = new AnalysisService(prisma, new FileExtractService(), crypto);
    await expect(
      svc.createFromUpload(Buffer.from(`2025. 1. 1. 오후 1:00, A : 혼잣말`), "c.txt"),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 실행하여 실패 확인**

Run: `pnpm --filter @toksai/server test analysis.service`
Expected: FAIL — 서비스 미존재.

- [ ] **Step 3: 구현**

`apps/server/src/analysis/analysis.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import type { AnalysisContract, AnalysisView } from "@toksai/api";
import { parseKakao } from "@toksai/shared";
import { FileExtractService } from "../upload/file-extract.service";
import { CryptoService } from "../common/crypto/crypto.service";
import { generateToken } from "../common/token.util";

@Injectable()
export class AnalysisService implements AnalysisContract {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly extractor: FileExtractService,
    private readonly crypto: CryptoService,
  ) {}

  async createFromUpload(buffer: Buffer, filename: string) {
    const text = this.extractor.extractChatText(buffer, filename);
    const parsed = parseKakao(text); // 1:1 아니면 ParseError

    const viewToken = generateToken();
    const adminToken = generateToken();

    const created = await this.prisma.analysis.create({
      data: {
        viewToken,
        adminToken,
        status: "IDENTIFYING",
        sourceType: "upload",
        participants: {
          create: parsed.participants.map((p) => ({ rawName: p.rawName })),
        },
        rawChat: {
          create: {
            encryptedText: this.crypto.encrypt(text),
            messageCount: parsed.messages.length,
            startedAt: parsed.startedAt,
            endedAt: parsed.endedAt,
          },
        },
      },
    });

    return { id: created.id, viewToken, adminToken };
  }

  async getByViewToken(viewToken: string): Promise<AnalysisView | null> {
    const a = await this.prisma.analysis.findUnique({
      where: { viewToken },
      include: { participants: true },
    });
    if (!a) return null;
    return {
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      participants: a.participants.map((p) => ({
        id: p.id, rawName: p.rawName, nickname: p.nickname, isOwner: p.isOwner,
      })),
    };
  }

  async identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
  ): Promise<void> {
    const a = await this.prisma.analysis.findUnique({
      where: { adminToken },
      include: { participants: true },
    });
    if (!a) throw new Error("NOT_FOUND");
    for (const p of a.participants) {
      await this.prisma.participant.update({
        where: { id: p.id },
        data: {
          isOwner: p.rawName === ownerRawName,
          nickname: nicknames[p.rawName] ?? p.nickname,
        },
      });
    }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @toksai/server test analysis.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/analysis
git commit -m "feat(server): analysis service (upload->parse->persist)"
```

---

## Task 10: Nest 부트스트랩 · 업로드 컨트롤러 · tRPC 마운트

> S3 반영: tRPC는 Nest 미들웨어/forRoutes 대신 **express 인스턴스에 `/trpc`로 직접 마운트**(`createExpressMiddleware`). 서비스는 Nest 컨테이너에서 `app.get()`으로 꺼내 컨텍스트로 주입.

**Files:**
- Create: `apps/server/src/common/config/configuration.ts`
- Create: `apps/server/src/health.controller.ts`
- Create: `apps/server/src/upload/upload.controller.ts`
- Create: `apps/server/src/app.module.ts`, `apps/server/src/main.ts`

**Interfaces:**
- Consumes: `AnalysisService`, `CryptoService`, `FileExtractService`, `appRouter`(@toksai/api).
- Produces:
  - REST `POST /upload`(multipart `file`)→`{ id, viewToken, adminToken }`; 파싱/파일 오류 시 400 `{ code, message }`.
  - tRPC `POST|GET /trpc/*` (`analysis.get`, `analysis.identify`).
  - `GET /health`→`{ ok: true }`.

- [ ] **Step 1: 설정 팩토리 & 헬스 컨트롤러**

`apps/server/src/common/config/configuration.ts`:
```ts
export default () => ({
  port: parseInt(process.env.PORT ?? "4100", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  database: { url: process.env.DATABASE_URL ?? "" },
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  gemini: { apiKey: process.env.GEMINI_API_KEY ?? "" },
});
```

`apps/server/src/health.controller.ts`:
```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  ok() {
    return { ok: true };
  }
}
```

- [ ] **Step 2: 업로드 컨트롤러**

`apps/server/src/upload/upload.controller.ts`:
```ts
import {
  BadRequestException, Controller, Post, UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ParseError } from "@toksai/shared";
import { AnalysisService } from "../analysis/analysis.service";

@Controller("upload")
export class UploadController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: "NO_FILE", message: "파일이 없습니다." });
    try {
      return await this.analysisService.createFromUpload(file.buffer, file.originalname);
    } catch (e) {
      if (e instanceof ParseError) {
        throw new BadRequestException({ code: e.code, message: e.message });
      }
      const msg = (e as Error).message;
      if (["UNSUPPORTED_FILE", "NO_TXT_IN_ZIP"].includes(msg)) {
        throw new BadRequestException({ code: msg, message: "지원하지 않는 파일입니다." });
      }
      throw e;
    }
  }
}
```

- [ ] **Step 3: 모듈 작성**

`apps/server/src/app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { prisma } from "@toksai/db";
import configuration from "./common/config/configuration";
import { CryptoService } from "./common/crypto/crypto.service";
import { FileExtractService } from "./upload/file-extract.service";
import { AnalysisService } from "./analysis/analysis.service";
import { UploadController } from "./upload/upload.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [UploadController, HealthController],
  providers: [
    FileExtractService,
    { provide: CryptoService, useFactory: () => new CryptoService() },
    {
      provide: AnalysisService,
      useFactory: (extractor: FileExtractService, crypto: CryptoService) =>
        new AnalysisService(prisma, extractor, crypto),
      inject: [FileExtractService, CryptoService],
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 4: 부트스트랩 + tRPC 마운트**

`apps/server/src/main.ts`:
```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@toksai/api";
import { AppModule } from "./app.module";
import { AnalysisService } from "./analysis/analysis.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? true, credentials: true });

  const analysisService = app.get(AnalysisService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({ analysis: analysisService }),
    }),
  );

  const port = parseInt(process.env.PORT ?? "4100", 10);
  await app.listen(port);
  console.log(`server on :${port}`);
}
bootstrap();
```

- [ ] **Step 5: 빌드 & 수동 스모크 테스트**

먼저 의존 패키지 빌드(런타임 require용):
Run: `pnpm --filter @toksai/shared build && pnpm --filter @toksai/db build && pnpm --filter @toksai/api build`
Expected: 각 `dist/` 생성.

Run: `pnpm --filter @toksai/server build`
Expected: 컴파일 성공(`dist/main` 생성).

`.env` 로드하여 기동: `pnpm --filter @toksai/server dev` (또는 `node -r dotenv/config ...` 대신 셸에 env export). 그다음:

Run: `curl -s localhost:4100/health`
Expected: `{"ok":true}`

sample.txt(2인 대화)로:
Run: `curl -s -F "file=@sample.txt" localhost:4100/upload`
Expected: `{"id":"...","viewToken":"...","adminToken":"..."}`

비배치 tRPC 쿼리(참고: 클라이언트는 batch를 쓰지만 서버는 비배치도 허용):
Run: `curl -s "localhost:4100/trpc/analysis.get?input=$(node -e 'console.log(encodeURIComponent(JSON.stringify({viewToken:process.argv[1]})))' "<위 viewToken>")"`
Expected: `{"result":{"data":{...participants 2명...}}}`

- [ ] **Step 6: Commit**

```bash
git add apps/server/src
git commit -m "feat(server): nest bootstrap, upload endpoint, trpc mount"
```

---

## Task 11: `apps/web` — 업로드 & 식별 화면

> S1 반영: 웹은 `nextjs.json`(dom lib) 확장. adminToken은 URL 쿼리 대신 localStorage로 보관·조회(useSearchParams/Suspense 이슈 회피).

**Files:**
- Create: `apps/web/{package.json,next.config.ts,tsconfig.json,postcss.config.mjs}`
- Create: `apps/web/app/{globals.css,layout.tsx,page.tsx}`
- Create: `apps/web/app/a/[viewToken]/identify/page.tsx`
- Create: `apps/web/lib/api.ts`

**Interfaces:**
- Consumes: 서버 REST `POST /upload`, tRPC `analysis.get`/`analysis.identify` (`AppRouter` @toksai/api).
- Produces: 업로드→`{viewToken,adminToken}` 수신, adminToken localStorage 보관, 식별 페이지 이동.

- [ ] **Step 1: web 스캐폴딩 파일 작성**

`apps/web/package.json`:
```json
{
  "name": "@toksai/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "dependencies": {
    "@toksai/api": "workspace:*",
    "@trpc/client": "^11.0.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@toksai/tsconfig": "workspace:*",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

`apps/web/next.config.ts`:
```ts
import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@toksai/api"] };
export default config;
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "@toksai/tsconfig/nextjs.json",
  "compilerOptions": { "plugins": [{ "name": "next" }] },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

`apps/web/postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`apps/web/app/globals.css`:
```css
@import "tailwindcss";
```

`apps/web/app/layout.tsx`:
```tsx
import "./globals.css";
export const metadata = { title: "톡사이", description: "카톡 대화로 보는 우리 사이" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: API 클라이언트 작성**

`apps/web/lib/api.ts`:
```ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@toksai/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API}/trpc` })],
});

export interface UploadResult { id: string; viewToken: string; adminToken: string }

export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "업로드 실패" }));
    throw new Error(err.message ?? "업로드 실패");
  }
  return res.json();
}

export function saveAdminToken(viewToken: string, adminToken: string) {
  localStorage.setItem(`toksai:admin:${viewToken}`, adminToken);
}
export function loadAdminToken(viewToken: string): string {
  return localStorage.getItem(`toksai:admin:${viewToken}`) ?? "";
}
```

- [ ] **Step 3: 업로드 페이지 작성**

`apps/web/app/page.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadFile, saveAdminToken } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true); setError(null);
    try {
      const r = await uploadFile(file);
      saveAdminToken(r.viewToken, r.adminToken);
      router.push(`/a/${r.viewToken}/identify`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">톡사이</h1>
      <p className="mt-2 text-sm text-gray-500">
        카카오톡 대화 내보내기(zip/txt)를 올리면 둘 사이를 분석해 드려요. 재미로 보는 관심 신호예요.
      </p>
      <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed p-10 text-center">
        {busy ? "분석 준비 중…" : "여기에 파일을 올리거나 클릭"}
        <input
          type="file" accept=".zip,.txt" className="hidden" disabled={busy}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </main>
  );
}
```

- [ ] **Step 4: 식별/닉네임 페이지 작성** (adminToken은 localStorage에서)

`apps/web/app/a/[viewToken]/identify/page.tsx`:
```tsx
"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc, loadAdminToken } from "../../../../lib/api";

type P = { id: string; rawName: string; nickname: string | null; isOwner: boolean };

export default function Identify({ params }: { params: Promise<{ viewToken: string }> }) {
  const { viewToken } = use(params);
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [parts, setParts] = useState<P[]>([]);
  const [owner, setOwner] = useState("");
  const [nick, setNick] = useState<Record<string, string>>({});

  useEffect(() => {
    setAdminToken(loadAdminToken(viewToken));
    trpc.analysis.get.query({ viewToken }).then((a) => {
      if (!a) return;
      setParts(a.participants);
      setNick(Object.fromEntries(a.participants.map((p) => [p.rawName, p.nickname ?? p.rawName])));
    });
  }, [viewToken]);

  async function submit() {
    await trpc.analysis.identify.mutate({ adminToken, ownerRawName: owner, nicknames: nick });
    router.push(`/a/${viewToken}`); // 결과 페이지(Plan 3)
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-bold">둘 중 나는 누구?</h1>
      <div className="mt-4 space-y-3">
        {parts.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <input type="radio" name="owner" checked={owner === p.rawName}
              onChange={() => setOwner(p.rawName)} />
            <span className="w-20 text-gray-500">{p.rawName}</span>
            <input className="flex-1 rounded border px-2 py-1" value={nick[p.rawName] ?? ""}
              onChange={(e) => setNick({ ...nick, [p.rawName]: e.target.value })} />
          </div>
        ))}
      </div>
      <button disabled={!owner || !adminToken} onClick={submit}
        className="mt-6 w-full rounded-lg bg-black py-2 text-white disabled:opacity-40">
        분석 시작
      </button>
    </main>
  );
}
```

- [ ] **Step 5: 타입체크 & 수동 E2E**

Run: `pnpm --filter @toksai/web typecheck`
Expected: PASS (dom lib 프리셋 덕에 localStorage/File/fetch 인식).

서버 dev + web dev 동시 기동 후 브라우저:
1. `http://localhost:3000` → sample.txt 업로드 → 식별 페이지 이동
2. "나" 선택 + 닉네임 편집 → "분석 시작" → `/a/<viewToken>`(빈 페이지, Plan 3)
3. DB에서 `Participant.isOwner`/`nickname` 반영 확인.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): upload and identify screens"
```

---

## Task 12: 프로덕션 Dockerfile · entrypoint · prod compose

> S5 반영: Docker 빌드는 `turbo build --filter`로 의존 패키지까지 빌드.

**Files:**
- Create: `apps/server/Dockerfile`, `apps/server/entrypoint.sh`, `docker-compose.prod.yml`, `.env.production.example`

**Interfaces:**
- Produces: 서버 프로덕션 이미지(의존 패키지 dist 포함 → `prisma db push` → `node dist/main`), EC2용 compose.

- [ ] **Step 1: Dockerfile 작성**

`apps/server/Dockerfile`:
```dockerfile
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm install --frozen-lockfile
# turbo ^build가 shared/db/api를 먼저 빌드(db build는 prisma generate 포함)
RUN pnpm turbo build --filter=@toksai/server

FROM base AS runtime
COPY --from=build /app ./
COPY apps/server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NODE_ENV=production
EXPOSE 4100
ENTRYPOINT ["/entrypoint.sh"]
```

`apps/server/entrypoint.sh`:
```sh
#!/bin/sh
set -e
npx prisma@6.4.0 db push --schema=/app/packages/db/prisma/schema.prisma --skip-generate --accept-data-loss
exec node apps/server/dist/main
```

- [ ] **Step 2: prod compose & env 예시 작성**

`docker-compose.prod.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: toksai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
  server:
    build: { context: ., dockerfile: apps/server/Dockerfile }
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/toksai
      GEMINI_API_KEY: ${GEMINI_API_KEY:?GEMINI_API_KEY is required}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?ENCRYPTION_KEY is required}
      FRONTEND_URL: ${FRONTEND_URL:?FRONTEND_URL is required}
      PORT: "4100"
      NODE_ENV: production
      TZ: Asia/Seoul
    depends_on:
      postgres: { condition: service_healthy }
    ports: ["127.0.0.1:4100:4100"]
    restart: unless-stopped
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }
volumes:
  pgdata:
```

`.env.production.example`:
```
POSTGRES_PASSWORD=
GEMINI_API_KEY=
ENCRYPTION_KEY=
FRONTEND_URL=https://toksai.example
```

- [ ] **Step 3: 프로덕션 이미지 빌드 검증**

Run: `docker compose -f docker-compose.prod.yml build server`
Expected: 빌드 성공(의존 패키지 dist 포함).

- [ ] **Step 4: Commit**

```bash
git add apps/server/Dockerfile apps/server/entrypoint.sh docker-compose.prod.yml .env.production.example
git commit -m "chore: production dockerfile and compose"
```

> web(Next.js)은 todari 관례상 Vercel 배포가 자연스러움. 서버만 EC2 컨테이너. web 프로덕션 배포 세부는 Plan 3에서 결정.

---

## Self-Review (비판 검토 반영본)

**Spec coverage:**
- §4 아키텍처 → Task 1,5,6,7,11,12 ✅ / §5 데이터 모델 → Task 5 ✅ / §7 파싱(iOS,1:1,어댑터) → Task 4 ✅
- §3/§8 업로드→식별→닉네임 → Task 8,9,10,11 ✅ / §9 프라이버시(암호화·토큰) → Task 7,9 ✅
- §6 분석 파이프라인 / §8 결과 페이지 상세 / 추가기능 / 뱃지 → **Plan 2·3**(의도적 범위 밖) ✅
- §비목표(이메일/OG/리캡/안드로이드) → 미포함 ✅

**적용된 검토 지적:**
- B1(패키지 dist 빌드): Task 3/5/6 package.json `main:dist`, `build:tsc`, `type:module` 제거 ✅
- B2(tRPC 계약을 packages/api로): Task 6 신설, 서버는 컨텍스트 주입만(Task 10) ✅
- B3(.js 확장자/모듈 정합): Task 1 프리셋(base bundler / nestjs commonjs·node), 전 소스 확장자 제거 ✅
- S1(web dom lib): Task 1 `nextjs.json` + Task 11 확장 ✅
- S2(multer/@types/multer): Task 7 deps ✅
- S3(tRPC 마운트): express 인스턴스 직접 마운트, provider 이슈 소거(Task 10) ✅
- S4(파서 오염): 날짜구분선/빈줄 skip + 전용 테스트(Task 4) ✅
- S5(Docker 의존 빌드): `turbo build --filter`(Task 12) ✅
- S6(순서): Postgres/.env를 Task 2로 선행 ✅
- 버전 nit: dotenv-cli ^8, vitest ^3, @types/react-dom 추가 ✅ / MINOR: adminToken을 localStorage로(useSearchParams·Suspense 회피) ✅

**Type consistency:**
- `parseKakao/ParseError`(Task 4) ↔ Task 9/10 ✅
- `AnalysisContract`/`AnalysisView`/`TrpcContext`(Task 6) ↔ `AnalysisService implements AnalysisContract`(Task 9) ↔ tRPC 컨텍스트 주입(Task 10) ✅
- `appRouter`(값)/`AppRouter`(타입)(Task 6) ↔ 서버 서빙(Task 10) ↔ 웹 import(Task 11) ✅
- `CryptoService.encrypt/decrypt`(Task 7) ↔ Task 9 ✅ / `FileExtractService.extractChatText`(Task 8) ↔ Task 9 ✅

**남은 경미 리스크(실행 중 확인):**
- Vitest가 데코레이터(@Injectable) 포함 서버 파일을 esbuild로 처리 — `experimentalDecorators`가 프리셋에 있어 정상 처리되어야 함. 문제 시 테스트 대상 클래스에서 데코레이터 제거 가능(런타임 DI는 팩토리 provider로 이미 우회).
- `db build`는 `prisma generate`를 포함하므로 최초 `turbo build` 시 스키마가 필요 — Dockerfile이 `packages/` 전체를 복사하므로 충족.
