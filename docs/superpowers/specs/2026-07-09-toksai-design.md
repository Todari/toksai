# 톡사이 (toksai) — 설계 문서

- **작성일**: 2026-07-09
- **상태**: 설계 확정(브레인스토밍 완료), 구현 계획 작성 대기
- **한 줄 소개**: 카카오톡 1:1 대화를 업로드하면, 둘 사이의 이벤트·호감 신호·관심사·대화 습관을 분석하고 뱃지와 관계 유형까지 뽑아 비공개 링크로 함께 보는 서비스.

---

## 1. 포지셔닝

- **엔터테인먼트/재미 포지셔닝.** "호감도"는 단정적 진단이 아니라 **재미로 보는 관심 신호 지수**로 톤을 잡는다 (자매 서비스 lvti 톤과 유사).
- 둘이 링크로 함께 보며 웃고 공유하는 **바이럴 컨슈머 서비스**.
- 타깃: 연인/썸/친구 등 1:1로 오래 대화한 관계.

---

## 2. 목표 / 비목표 (범위)

### MVP 목표
1. 웹에서 카톡 내보내기 파일(zip/txt) 업로드 → 압축해제 → 파싱.
2. "둘 중 내가 누구인지" 선택 + 두 사람 닉네임 편집.
3. 하이브리드 분석: 코드 정량통계 + Gemini 월버킷 의미분석 → 통합.
4. 결과 페이지: 헤드라인 통계 · 호감/관심 신호 시계열 곡선 · 관계 타임라인(이벤트) · 시간대 히트맵 · 선톡/답장 밸런스 · 관심사/키워드 · 각자 성향 한줄평.
5. **추가 MVP 기능**: 케미 지수(한 숫자) · 하이라이트 명장면 · 관계 유형(MBTI풍).
6. AI 자동 뱃지 부여.
7. 로그인 없이 비공개 링크(조회 토큰 + 관리 토큰), 관리 토큰으로 삭제.
8. 원본 + 분석결과 모두 영구 저장(원본 컬럼 암호화).

### 비목표 (Phase 2 이후로 문서화)
- **이메일 수신 경로** (전용 주소로 카톡 내보내기 메일 → IMAP 폴링 → 파싱). MVP는 웹 업로드만.
- **공유 카드 / OG 이미지 자동 생성** (케미 지수·유형 박힌 이미지).
- **연말정산 리캡** (Spotify Wrapped 스타일 스토리).
- **안드로이드 / PC 카톡 내보내기 포맷 파서** (MVP는 iOS 포맷 타깃).
- **그룹 대화**(3명 이상) 지원. MVP는 1:1만.
- 카카오 로그인 / 계정 / 내 분석 목록.
- 뱃지 상호 선물(수동), 재분석 UI.

---

## 3. 사용자 플로우

```
[웹 랜딩] 업로드(zip/txt 드래그앤드롭)
   ↓ 서버가 압축해제 · 파싱 (1:1, 화자 2명 추출)
[식별 화면] "둘 중 내가 누구?" 선택 + 두 명 닉네임 편집
   ↓ 분석 실행
   - 코드: 정량 통계 계산
   - Gemini: 대화를 월(또는 주) 버킷으로 나눠 각 구간 의미분석 → 상위 통합
   ↓
[결과 페이지] 케미 지수 · 관계 유형 · 타임라인 · 호감 곡선 · 통계 · 뱃지 · 하이라이트
   ↓
비공개 조회 링크 공유 (상대와 함께 보기)
관리 토큰으로 언제든 삭제
```

- 분석은 수 초~수십 초 걸릴 수 있으므로 **비동기 잡 + 진행 상태 표시**(폴링 또는 상태 스텝). 대화 크기에 따라 버킷 수가 달라짐.

---

## 4. 아키텍처

trade-tower 모노레포 관례를 그대로 따른다.

- **패키지 매니저/빌드**: pnpm@9.15 + Turborepo. `pnpm-workspace.yaml` = `apps/*`, `packages/*`.
- **앱**:
  - `apps/server` — NestJS (업로드/파싱/분석 잡/결과 API).
  - `apps/web` — Next.js App Router (랜딩·업로드·식별·결과 페이지). Tailwind.
- **패키지**: `packages/db`(`@toksai/db`, Prisma 6) · `packages/api`(`@toksai/api`, tRPC 계약) · `packages/shared`(타입·상수, 모델 id·뱃지 정의 등) · `packages/tsconfig`.
- **DB**: PostgreSQL 16, Prisma 6. 컨테이너 엔트리포인트에서 `prisma db push`.
- **AI**: `@google/genai` (최신 SDK), `GEMINI_API_KEY`. 모델 id는 `packages/shared` 상수로 중앙화(예: flash-lite 계열). JSON 모드 + `responseSchema` + Zod 검증.
- **배포**: todari-consolidate 공용 EC2에 docker-compose. `127.0.0.1:PORT` 바인딩 → 호스트 nginx + certbot 뒤. `.env`/`.env.production`로 시크릿 주입(`${VAR:?required}`), TZ=Asia/Seoul, 로그 로테이션.
- **비동기 처리**: 분석 잡은 서버 내부 큐(간단히는 in-process 큐/BullMQ 없이 NestJS 스케줄/프로미스 + 상태 컬럼)로 시작. 규모 커지면 Redis 큐로 승격(phase 2).

> tRPC vs REST: trade-tower 관례상 tRPC(`packages/api`) 채택. 업로드(멀티파트)만 별도 REST/route handler로 처리하고 나머지 조회는 tRPC.

---

## 5. 데이터 모델 (Prisma 초안)

```prisma
model Analysis {
  id          String   @id @default(cuid())
  viewToken   String   @unique   // 비공개 조회 링크용 (추측 불가)
  adminToken  String   @unique   // 삭제/관리용
  status      AnalysisStatus @default(PENDING) // PENDING|PARSING|IDENTIFYING|ANALYZING|DONE|FAILED
  sourceType  String   @default("upload")      // upload | email(phase2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  participants Participant[]
  rawChat      RawChat?
  result       AnalysisResult?
}

model Participant {
  id         String  @id @default(cuid())
  analysisId String
  analysis   Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  rawName    String   // 원본 대화의 표기 이름 (예: "김승현")
  nickname   String?  // 사용자가 지정한 닉네임
  isOwner    Boolean  @default(false) // "둘 중 내가 누구"
}

model RawChat {
  id            String   @id @default(cuid())
  analysisId    String   @unique
  analysis      Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  encryptedText String   // 원본 파싱 전/후 텍스트 암호화 저장 (at-rest)
  messageCount  Int
  startedAt     DateTime
  endedAt       DateTime
}

model AnalysisResult {
  id             String   @id @default(cuid())
  analysisId     String   @unique
  analysis       Analysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  stats          Json     // 정량 통계 (아래 6.1)
  timeline       Json     // 이벤트 배열 (아래 6.2)
  affinitySeries Json     // 시간별 호감/관심 신호 곡선
  keywords       Json     // 관심사/키워드/토픽
  personas       Json     // 각자 성향 한줄평
  badges         Json     // 각자 자동 뱃지
  chemiScore     Int      // 케미 지수 0~100 (또는 온도)
  relationType   Json     // 관계 유형(MBTI풍) {code,label,description}
  highlights     Json     // 하이라이트 명장면 배열
  createdAt      DateTime @default(now())
}
```

- **암호화**: `RawChat.encryptedText`는 앱 레벨 대칭키(env `ENCRYPTION_KEY`)로 AES-GCM 암호화 후 저장. 결과 JSON은 파생물이라 평문 저장.
- **삭제**: `adminToken`으로 `Analysis` 삭제 → cascade로 전부 제거.

---

## 6. 분석 파이프라인 (하이브리드)

### 6.1 코드 정량 통계 (결정적, LLM 미사용)
파싱된 메시지 배열로부터 계산:
- 총 메시지 수, 관계 기간(D+n, 첫/마지막 메시지 일시)
- 각자 메시지 수 & 비율
- **선톡 횟수/비율**: 직전 메시지와 간격이 임계치(예: 6시간) 이상 벌어진 뒤 먼저 보낸 쪽을 "선톡"으로 카운트
- **답장 텀**: 상대 메시지 후 내 첫 응답까지 걸린 시간(중앙값/평균), 각자별
- **시간대 히트맵**: 시(hour) × 요일 메시지 분포
- 평균 메시지 길이, 이모지/`ㅋ`/물음표/느낌표 빈도 (각자별)
- 월별 메시지 볼륨 (시계열 베이스)

### 6.2 Gemini 의미분석 (월/주 버킷 → 통합)
1. **버킷팅**: 대화를 월 단위(대화량 적으면 주 단위 자동 조정)로 분할. 버킷당 토큰이 커지면 재분할.
2. **버킷별 분석** (각 버킷 1콜, JSON 스키마 강제):
   - 그 구간의 큼직한 이벤트/사건 후보 (날짜, 요약, 관련 인용)
   - 그 구간의 호감/관심 신호 강도 (각자 → 상대, 0~100)와 근거
   - 그 구간 주요 키워드/토픽
   - 인상적 순간 후보(하이라이트 재료)
3. **상위 통합 콜**: 버킷 결과들을 입력으로,
   - 전체 **관계 타임라인**(중복 제거·병합된 핵심 이벤트)
   - **호감 신호 시계열**(버킷별 점수를 곡선으로)
   - 통합 **관심사/키워드 Top N**
   - **각자 성향 한줄평(personas)**
   - **자동 뱃지** (아래 6.3)
   - **케미 지수**(정량 통계 + 호감 곡선 종합, 0~100)
   - **관계 유형(MBTI풍)** 코드/라벨/설명
   - **하이라이트 명장면** 최종 선별(인용 + 캡션)
- 모든 Gemini 콜은 `responseMimeType: application/json` + `responseSchema` + Zod 재검증. 비용은 flash-lite 계열로 통제.

### 6.3 뱃지 (AI 자동)
- `packages/shared`에 뱃지 카탈로그(id, 이름, 설명, 아이콘, 판정 힌트) 정의.
- 통합 콜에서 Gemini가 각 참가자에게 어울리는 뱃지를 카탈로그에서 선택(+근거 인용). 예: `새벽감성 선톡왕`, `무뚝뚝보다 답장요정`, `이모지 폭격기`, `장문파`, `읽씹장인` 등.
- 정량 통계와 결합 가능한 뱃지(예: 선톡왕)는 코드 지표로 후보를 좁힌 뒤 Gemini가 확정.

---

## 7. 파싱 사양

- **대상 포맷 (MVP)**: iOS 카카오톡 "대화 내용 내보내기 → 텍스트 메시지만" 결과.
  - 파일 헤더: `Talk_...txt`, `저장한 날짜 : ...`
  - 날짜 구분 줄: `2025년 4월 5일 토요일`
  - 메시지 줄: `2025. 4. 5. 오전 12:19, 김승현 : 내용`
  - **멀티라인 메시지**: 다음 메시지 줄 패턴이 나오기 전까지는 이전 메시지의 연속으로 병합.
- **화자 추출**: 등장 이름 집합. **정확히 2명이 아니면** MVP에서는 안내 후 중단(그룹/시스템 메시지 다수 케이스 방어).
- **어댑터 구조**: `KakaoParser` 인터페이스 + `IosKakaoParser` 구현. 안드로이드/PC 포맷은 phase 2에 어댑터 추가.
- **zip 처리**: 서버에서 안전하게 압축해제(zip slip 방지, 크기 제한), `.txt` 추출. txt 직접 업로드도 허용.
- **업로드 제한**: 최대 파일 크기 상한(예: 20MB), 허용 확장자(zip, txt).

---

## 8. 결과 페이지 구성 (`apps/web`)

상단부터:
1. **헤드라인**: 두 닉네임, 관계 기간(D+n), 총 메시지 수, **케미 지수**(대형), **관계 유형** 배지.
2. **호감/관심 신호 곡선**: 시간축 라인 차트(각자 → 상대 2개 라인) + 위에 **주요 이벤트 마커** 오버레이.
3. **관계 타임라인**: 이벤트 카드 리스트(날짜, 요약, 인용).
4. **대화 습관**: 선톡/답장 밸런스 게이지, 시간대 히트맵, 답장 텀, 메시지 길이/이모지 통계.
5. **관심사·키워드**: Top 키워드/토픽.
6. **각자 프로필**: 성향 한줄평 + 획득 뱃지.
7. **하이라이트 명장면**: 설렘/웃김/감동 순간 인용 카드.
8. **공유 바**: 비공개 조회 링크 복사, (phase 2) 공유 카드.
9. **관리**: 관리 토큰 소지 시 삭제 버튼.

- 차트는 dataviz 가이드 준수. 라이트/다크 대응.

---

## 9. 프라이버시 · 보안

- 원본 대화는 매우 민감 → `RawChat.encryptedText` AES-GCM 암호화 저장, 키는 env.
- 조회 토큰/관리 토큰은 추측 불가한 난수(예: 24바이트 base64url). 조회 토큰만 아는 사람이 결과 열람.
- 관리 토큰은 업로더에게만 노출(업로드 직후 1회 + 로컬 보관 안내). 관리 토큰으로 즉시 삭제 가능.
- 업로드/결과 페이지에 "원본은 암호화 저장되며 언제든 삭제 가능" 안내.
- Gemini 전송: 대화 원문이 외부(Google)로 전송됨을 명시적 고지.

---

## 10. 비용 · 성능

- 버킷팅으로 콜당 토큰 통제, flash-lite 계열로 단가 최소화.
- 대화가 매우 크면 버킷 수 증가 → 콜 수 증가. 버킷 병렬 처리(동시성 상한)로 지연 단축.
- 실패/부분 실패 처리: 버킷 단위 재시도, 일부 실패 시 가능한 범위로 결과 생성 + 경고.

---

## 11. 리스크 & 열린 질문

- **포맷 다양성**: iOS/안드로이드/PC 내보내기 포맷이 다름. MVP는 iOS만, 다른 포맷 업로드 시 명확한 안내. (열린: 초기부터 안드로이드도 필요할지)
- **호감도의 주관성**: 오해·불쾌감 소지 → "재미로 보는 신호"라는 카피/톤으로 방어.
- **비동기 잡 인프라**: MVP는 in-process로 시작, 트래픽 시 Redis 큐로 승격.
- **동시성/비용 상한**: 남용 방지를 위한 IP 기반 rate limit 필요 여부(열린).
- **케미 지수/관계 유형 산식**: 정량+정성 가중치 구체화는 구현 단계에서 튜닝.

---

## 12. 마일스톤 (구현 계획에서 세분화)

- **M1 스캐폴딩**: trade-tower 관례로 모노레포·Prisma·docker-compose·배포 파이프라인.
- **M2 업로드 & 파싱**: zip/txt 업로드, iOS 파서, 식별/닉네임 화면.
- **M3 분석 파이프라인**: 코드 통계 + Gemini 버킷/통합, 상태 잡.
- **M4 결과 페이지**: 차트·타임라인·뱃지·케미지수·관계유형·하이라이트.
- **M5 공유/삭제 & 다듬기**: 비공개 링크, 관리 삭제, 프라이버시 고지, 톤/카피.

---

## 부록 A. 확정된 브레인스토밍 결정

| 항목 | 결정 |
|---|---|
| 수집 | 웹 업로드 우선(MVP) · 이메일 수신 phase 2 |
| 접근/소유 | 로그인 없음 · 비공개 링크(조회 토큰 + 관리 토큰) |
| 뱃지 | AI 자동 부여 |
| 보관 | 원본+결과 모두 영구 저장(원본 암호화, 관리 토큰 삭제) |
| 분석 | 하이브리드(코드 정량통계 + 월버킷 Gemini 의미분석) |
| 추가 MVP 기능 | 케미 지수 · 하이라이트 명장면 · 관계 유형(MBTI풍) |
| phase 2 후보 | 이메일 수신 · 공유 카드(OG) · 연말정산 리캡 · 안드로이드/PC 파서 |
| 이름 | 톡사이 (toksai) |
