# 톡사이 배포 인프라 (Plan 6) — Implementation Plan

**구성(확정):** web = **Vercel**, server+Postgres = **todari-consolidate EC2 docker**, 배포 = **GitHub Actions**(SSH). 도메인 = 새 도메인(사용자 제공 예정). 이 계획은 **인프라·러너북을 준비**하고, 실제 라이브 전환(도메인/시크릿/Vercel 연결/첫 배포)은 사용자 액션이 필요.

## 핵심 원칙
- **공유 EC2 격리(중요):** todari-consolidate에는 사용자 라이브 서비스(trade-tower, api.metronomdeul, api.haengdong, todari-ops-bot 등)가 돈다. toksai는 **`~/toksai` 디렉토리 + 자체 `docker-compose.prod.yml` + `~/toksai/.env.production`**로 완전 격리한다. 공유 `~/.env`/`~/docker-compose.yml`(trade-tower stack) **절대 건드리지 않음**. compose 프로젝트명=디렉토리(toksai)라 컨테이너/네트워크/볼륨(`toksai-*`, `toksai_pgdata`) 자동 격리.
- **포트:** server는 `127.0.0.1:<HOST_PORT>:4100`. EC2에서 빈 포트 확인 후 지정(기본 4100; 충돌 시 조정). postgres는 host 미노출(내부만).
- **시크릿은 로그 비노출:** GitHub Actions는 `git pull + docker compose up`만. 실제 시크릿(`.env.production`)은 러너북대로 EC2에 **1회 수동 생성**(Actions 로그에 안 흘림). Actions 시크릿은 SSH 접속용 `EC2_HOST`/`EC2_SSH_KEY`만.
- **web(Vercel):** GitHub 연동, root=`apps/web`, pnpm 모노레포 빌드(turbo). env는 Vercel 대시보드(`NEXT_PUBLIC_API_URL`=EC2 api 도메인, `NEXT_PUBLIC_SITE_URL`=web 도메인, `NEXT_PUBLIC_GA_ID`).

## 산출물(파일)
- `.github/workflows/deploy-server.yml` — main push(server/packages/compose 경로) 또는 수동 트리거 시 EC2 SSH → `cd ~/toksai; git pull; docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`. origin은 `git@github.com:Todari/toksai.git`로 정규화. known_hosts 보장. **`~/.env` 등 공유 파일 미변경.**
- `deploy/nginx-toksai-api.conf.template` — `api.<DOMAIN>` server block → `proxy_pass http://127.0.0.1:4100`. certbot 주석.
- `deploy/README.md`(러너북) — DNS, EC2 부트스트랩(clone `~/toksai` + `.env.production` 생성 + 포트 확인), GitHub 시크릿, 첫 배포, nginx+certbot, Vercel 설정, env 체크리스트, 롤백.
- `apps/web/vercel.json` — 모노레포 빌드 설정(root apps/web에서 turbo로 web 빌드) + 헤더(선택).

## Task 1: 배포 워크플로 + nginx 템플릿 + Vercel 설정 + 러너북

- [ ] **Step 1: `.github/workflows/deploy-server.yml`** (trade-tower 관례 미러, ~/toksai 격리, 시크릿 sync 없음)
- [ ] **Step 2: `deploy/nginx-toksai-api.conf.template`** (도메인 플레이스홀더)
- [ ] **Step 3: `apps/web/vercel.json`** (모노레포 빌드)
- [ ] **Step 4: `deploy/README.md`** — 단계별 라이브 전환 러너북 + env/시크릿 체크리스트
- [ ] **Step 5: 검증** — `yaml` 구문 확인(`python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/deploy-server.yml'))"`), 워크스페이스 빌드 회귀 없음(`pnpm build`). 실제 배포는 사용자 액션(도메인/시크릿) 후.
- [ ] **Step 6: Commit + push** — `chore(deploy): EC2 server deploy workflow + nginx/Vercel/runbook (isolated ~/toksai stack)`.

## 사용자 액션(라이브 전환 — 도메인 확정 후)
1. 도메인 알려주기 → nginx server_name·Vercel env·`.env.production`의 FRONTEND_URL/NEXT_PUBLIC_API_URL 확정.
2. DNS: `toksai.<도메인>`(또는 apex) → Vercel, `api.<도메인>` → EC2 IP(A레코드).
3. GitHub 시크릿: `EC2_HOST`, `EC2_SSH_KEY` 추가.
4. EC2 부트스트랩(러너북): `git clone git@github.com:Todari/toksai.git ~/toksai` + `~/toksai/.env.production` 생성(POSTGRES_PASSWORD/GEMINI_API_KEY/ENCRYPTION_KEY/FRONTEND_URL) + 포트 확인.
5. 첫 배포: workflow_dispatch 또는 main push → 컨테이너 기동. nginx vhost 설치 + `certbot --nginx -d api.<도메인>`.
6. Vercel: 레포 import, root `apps/web`, env 3개 설정, `toksai.<도메인>` 연결.

## Self-Review
- 공유 EC2 격리(~/toksai, 시크릿 미노출, 공유 파일 미변경) ✅ / 관례 미러 ✅ / 도메인 대기 부분 템플릿+러너북 ✅
- 리스크: EC2 실제 상태(빈 포트, nginx 구조)는 첫 부트스트랩에서 확인 필요 — 러너북에 포트 확인 단계 포함. 실제 배포 검증은 사용자 액션 후.
