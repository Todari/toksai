<div align="center">
  <img src="apps/web/app/icon.svg" width="96" alt="톡사이 로고" />

# 톡사이

**카카오톡 1:1 대화 속 우리 사이의 신호를 읽어주는 대화 분석 서비스**

관심 신호, 관계 타임라인, 대화 습관, 키워드와 케미 지수를 분석해  
두 사람만 볼 수 있는 비공개 링크로 보여줍니다.

[서비스 이용하기](https://toksai.todari.dev) ·
[샘플 리포트 보기](https://toksai.todari.dev/sample) ·
[문제 제보](https://github.com/Todari/toksai/issues)

</div>

![톡사이 미리보기](https://toksai.todari.dev/opengraph-image)

> 톡사이의 결과는 대화를 재미있게 돌아보기 위한 놀이형 해석이며, 심리 진단이나 관계의 정답이
> 아닙니다.

## 무엇을 분석하나요?

- 시간에 따라 달라지는 두 사람의 관심 신호와 관계 타임라인
- 먼저 대화를 시작한 비율, 답장 속도, 자주 대화한 시간대
- 함께 자주 사용한 키워드와 대화 속 하이라이트
- 두 사람의 대화 성향, 관계 유형, 뱃지와 케미 지수
- 이름이 바뀐 참여자를 포함한 카카오톡 대화 기록

## 사용 흐름

1. 카카오톡에서 1:1 대화를 TXT 또는 CSV로 내보냅니다.
2. 파일이나 ZIP을 직접 업로드하거나 분석 전용 이메일 주소로 전송합니다.
3. 대화 참여자와 닉네임을 확인합니다.
4. 분석이 끝나면 비공개 결과 링크를 함께 봅니다.
5. 분석을 만든 브라우저에서 원본과 결과를 언제든 삭제할 수 있습니다.

## 프라이버시

대화에는 민감한 정보가 포함될 수 있으므로 다음 원칙을 제품과 코드에 함께 반영합니다.

- 원본 대화는 암호화해 저장합니다.
- 분석 과정에서 원문이 Google Gemini로 전송됩니다.
- 이메일 접수 방식을 사용하면 수신 과정에서 Resend를 거칩니다.
- 분석 결과 경로는 검색 엔진에 노출되지 않도록 `noindex`, `nofollow`, `noarchive`를 적용합니다.
- 결과를 만든 브라우저만 가진 관리 토큰으로 원본과 결과를 함께 삭제할 수 있습니다.

## 기술 구성

| 영역           | 기술                                           |
| -------------- | ---------------------------------------------- |
| Web            | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API            | NestJS 11, tRPC, Zod                           |
| Data           | PostgreSQL, Prisma                             |
| AI             | Google Gemini                                  |
| Email intake   | Resend Inbound Webhook                         |
| Test           | Vitest                                         |
| Infrastructure | Vercel, AWS EC2, Docker Compose, Nginx         |
| Analytics      | Google Analytics 4                             |

```text
사용자
  ├─ 파일 업로드 ───────────────┐
  └─ 분석 전용 이메일 → Resend ─┤
                                ▼
Next.js Web → NestJS API → 암호화 저장(PostgreSQL)
                         └→ Gemini 분석
                                ▼
                    검색 비노출 결과 링크
```

## 저장소 구조

```text
.
├── apps
│   ├── web       # Next.js 웹 애플리케이션
│   └── server    # NestJS 분석·이메일 수신 API
├── packages
│   ├── api       # Web·Server가 공유하는 tRPC 계약
│   ├── db        # Prisma 스키마와 데이터베이스 클라이언트
│   ├── shared    # 파서·통계·공용 타입
│   └── tsconfig  # 공용 TypeScript 설정
├── deploy        # 서버 배포와 Nginx 설정
└── docs          # 설계·구현 기록
```

## 로컬 개발

### 요구 사항

- Node.js 22 이상
- pnpm 9.15.0
- PostgreSQL

### 설치

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
```

루트에 `.env`를 만들고 필요한 값을 설정합니다. 실제 비밀값은 저장소에 커밋하지 마세요.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/toksai
ENCRYPTION_KEY=replace-with-a-local-encryption-key
GEMINI_API_KEY=replace-with-your-gemini-api-key
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4100
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 이메일 접수를 확인할 때만 필요합니다.
EMAIL_INBOUND_DOMAIN=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
```

Prisma 클라이언트와 로컬 스키마를 준비한 뒤 개발 서버를 실행합니다.

```bash
pnpm db:generate
pnpm db:push
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4100`

## 검증 명령

| 명령             | 설명                        |
| ---------------- | --------------------------- |
| `pnpm typecheck` | 전체 워크스페이스 타입 검사 |
| `pnpm test`      | 전체 테스트 실행            |
| `pnpm build`     | 프로덕션 빌드               |

## 검색 노출 정책

- 홈과 샘플 리포트만 sitemap에 포함합니다.
- 개인 분석 결과 경로(`/a/*`)는 응답 헤더와 페이지 메타데이터에서 검색 노출을 차단합니다.
- 대표 주소는 `https://toksai.todari.dev`이며, 모든 공개 페이지는 이 주소를 canonical로 사용합니다.
- `robots.txt`, `sitemap.xml`, Open Graph 이미지, JSON-LD와 `llms.txt`를 제공합니다.
