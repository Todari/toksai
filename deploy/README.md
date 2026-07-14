# 톡사이 배포 러너북

구성: **web = Vercel**, **server + Postgres = todari-consolidate 공유 EC2 docker(격리 `~/toksai` 스택)**, 배포 = **GitHub Actions(SSH)**.

> ⚠️ 공유 EC2에는 사용자 라이브 서비스(trade-tower, api.metronomdeul, api.haengdong, todari-ops-bot 등)가 돈다. toksai는 `~/toksai` + 자체 `docker-compose.prod.yml` + `~/toksai/.env.production`로 **완전 격리**한다. 공유 `~/.env`·`~/docker-compose.yml`은 건드리지 않는다.

---

## 0) 도메인 확정
- 예: web = `toksai.<도메인>` (또는 apex `<도메인>`), API = `api.<도메인>`.
- 아래 `<DOMAIN>`을 실제 값으로 치환.

## 1) DNS
- `toksai.<도메인>` (또는 apex) → **Vercel** (Vercel가 안내하는 A/CNAME).
- `api.<도메인>` → **EC2 공인 IP** (A 레코드).

## 2) GitHub 시크릿 (repo: Todari/toksai → Settings → Secrets → Actions)
- `EC2_HOST` : EC2 공인 IP 또는 호스트.
- `EC2_SSH_KEY` : EC2 `ubuntu` 사용자로 접속 가능한 **개인키**(전체 내용). (기존 trade-tower 배포와 동일 키 재사용 가능.)

## 3) EC2 부트스트랩 (최초 1회, SSH 접속해서)
```bash
# (a) private repo 접근용 SSH 키가 EC2에 있어야 함 (trade-tower와 동일 키/agent 재사용 가능).
#     git@github.com:Todari/toksai.git 를 읽을 수 있어야 함.
ssh-keyscan -t rsa,ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null; sort -u ~/.ssh/known_hosts -o ~/.ssh/known_hosts

# (b) 격리 디렉토리에 clone
git clone git@github.com:Todari/toksai.git ~/toksai
cd ~/toksai

# (c) 포트 확인 — 4100이 비었는지 (쓰이면 docker-compose.prod.yml의 ports와 nginx proxy_pass를 함께 다른 포트로)
sudo lsof -i :4100 || echo "4100 free"

# (d) 시크릿 env 생성 (.env.production — gitignore됨, 절대 커밋 금지)
cat > ~/toksai/.env.production <<'EOF'
POSTGRES_PASSWORD=<강력한_랜덤_비밀번호>
GEMINI_API_KEY=<Gemini_API_키>
ENCRYPTION_KEY=<base64_32바이트>            # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
FRONTEND_URL=https://toksai.<도메인>        # web(Vercel) 주소 — CORS 허용 origin
EOF
chmod 600 ~/toksai/.env.production
```
> `ENCRYPTION_KEY`는 **한 번 정하면 바꾸지 말 것** — 바꾸면 기존 암호화된 원본 대화를 복호화 못 함.

## 4) 첫 배포 (GitHub Actions)
- Actions → **Deploy Server (EC2)** → `Run workflow` (workflow_dispatch), 또는 main에 server/packages/compose 변경 push.
- 워크플로가 EC2에서 `cd ~/toksai; git pull; docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build` 수행.
- 확인:
```bash
cd ~/toksai && docker compose -f docker-compose.prod.yml --env-file .env.production ps   # server, postgres healthy
curl -s http://127.0.0.1:4100/health   # {"ok":true}
```
- 컨테이너 엔트리포인트가 `prisma db push`로 스키마를 반영한다(4 테이블).

## 5) nginx + HTTPS (API 서브도메인)
```bash
sed "s/<DOMAIN>/<도메인>/g" ~/toksai/deploy/nginx-toksai-api.conf.template | sudo tee /etc/nginx/sites-available/toksai-api.conf
sudo ln -sf /etc/nginx/sites-available/toksai-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.<도메인>          # 443 + 자동갱신
curl -s https://api.<도메인>/health           # {"ok":true}
```

## 6) web (Vercel)
- Vercel에서 **Import** `Todari/toksai`.
- **Root Directory = `apps/web`** (모노레포). "Include source files outside of the Root Directory" 켜짐 확인.
- 빌드/설치는 `apps/web/vercel.json`이 turbo로 처리(설치/빌드 command 포함). 안 잡히면 대시보드에서 동일하게 지정.
- **Environment Variables** (Production):
  - `NEXT_PUBLIC_API_URL = https://api.<도메인>`
  - `NEXT_PUBLIC_SITE_URL = https://toksai.<도메인>`
  - `NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX` (GA4 측정 ID; 없으면 비워두면 GA 미렌더)
- 도메인 `toksai.<도메인>` 연결.
- 배포 후: 랜딩 로드, 업로드 → 식별 → 분석 → 결과까지 실제 확인. (server의 `FRONTEND_URL`이 web 도메인과 일치해야 CORS 통과.)

## 7) 배포 후 점검
- `https://toksai.<도메인>/robots.txt` → `Disallow: /a/` 확인.
- `https://toksai.<도메인>/a/<임의>` 응답 헤드에 `noindex` 확인(결과 페이지 검색 비노출).
- OG: 링크를 카톡/트위터에 붙여 미리보기 이미지 뜨는지.
- GA4 실시간에서 방문 잡히는지(측정 ID 설정 시).

## 롤백 / 운영
```bash
cd ~/toksai
git log --oneline -5
git checkout <이전_커밋> && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build   # 특정 커밋으로
# 중지:  docker compose -f docker-compose.prod.yml --env-file .env.production down
# 로그:  docker compose -f docker-compose.prod.yml --env-file .env.production logs -f server
```
> DB 데이터는 `toksai_pgdata` 볼륨에 유지된다. `down -v`는 데이터까지 삭제되니 주의.

## 하드닝 백로그(실사용자 전, 별도 PR)
- entrypoint `npx prisma@6.4.0` 매부팅 fetch → 설치 바이너리 사용 / `--accept-data-loss` 상시 → migrate deploy 검토 / 런타임 이미지 non-root + 프루닝(devDeps 제거) / zip 압축폭탄 상한 / start() 멱등성 / rate limit.
