# 톡사이 프로덕션 배포 러너북

프로덕션 구성:

- Web: Vercel, `https://toksai.todari.dev`
- API: todari-consolidated 공유 EC2, `https://api.toksai.todari.dev`
- DB: 같은 EC2의 Toksai 전용 Postgres 컨테이너와 전용 볼륨
- 이미지: GitHub Actions에서 빌드해 GHCR에 push
- 배포: GitHub Actions가 `~/toksai`의 전용 Compose 스택만 갱신

공유 EC2의 `~/.env`, `~/docker-compose.yml`, 다른 서비스 디렉터리는 건드리지 않는다.

## 1. DNS

가비아 DNS에 다음 레코드를 둔다.

- `toksai.todari.dev`: Vercel이 안내하는 CNAME
- `api.toksai.todari.dev`: EC2 Elastic/Public IP의 A 레코드

메일용 `todari.dev` MX/TXT/CNAME과 Toksai API 레코드는 서로 독립적이다.

## 2. GitHub Actions 시크릿

저장소 `Todari/toksai`의 Actions secrets:

- `EC2_HOST`: EC2 공인 IP 또는 고정 호스트명
- `EC2_SSH_KEY`: `ubuntu` 계정에 등록된 배포 전용 개인키

GHCR 인증에는 장기 토큰을 저장하지 않는다. 워크플로 실행 중 발급되는
`GITHUB_TOKEN`으로 이미지를 push/pull하고 배포 후 EC2에서 logout한다.

## 3. EC2 최초 부트스트랩

```bash
mkdir -p ~/toksai
chmod 700 ~/toksai

cat > ~/toksai/.env.production <<'EOF'
POSTGRES_PASSWORD=<강력한 랜덤 비밀번호>
GEMINI_API_KEY=<Gemini API 키>
ENCRYPTION_KEY=<base64 32바이트>
FRONTEND_URL=https://toksai.todari.dev
EOF

chmod 600 ~/toksai/.env.production
```

`ENCRYPTION_KEY` 생성 예:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`ENCRYPTION_KEY`를 바꾸면 기존 암호화 원문을 복호화할 수 없으므로 백업하고 고정한다.
EC2에서 저장소를 clone하거나 이미지를 빌드하지 않는다.

## 4. API DNS와 nginx

`api.toksai.todari.dev` A 레코드가 EC2를 가리킨 뒤:

```bash
sed 's/<DOMAIN>/toksai.todari.dev/g' \
  deploy/nginx-toksai-api.conf.template \
  | sudo tee /etc/nginx/sites-available/toksai-api.conf
sudo ln -sfn \
  /etc/nginx/sites-available/toksai-api.conf \
  /etc/nginx/sites-enabled/toksai-api.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.toksai.todari.dev
```

## 5. 서버 배포

`Deploy Server (EC2)` 워크플로를 수동 실행하거나, main의 서버·패키지·배포 파일을
push한다. 워크플로는 다음 순서로 동작한다.

1. GitHub Actions에서 서버 이미지를 빌드한다.
2. 커밋 SHA와 `latest` 태그로 GHCR에 push한다.
3. `docker-compose.prod.yml`만 `~/toksai`에 업로드한다.
4. EC2가 정확한 커밋 SHA 이미지를 pull한다.
5. `prisma migrate deploy` 후 서버를 시작한다.
6. `/health`가 성공할 때만 배포를 성공 처리한다.

확인:

```bash
cd ~/toksai
TOKSAI_SERVER_IMAGE=ghcr.io/todari/toksai-server:<commit-sha> \
  docker compose -f docker-compose.prod.yml --env-file .env.production ps
curl --fail https://api.toksai.todari.dev/health
```

## 6. Web 배포

Vercel 프로젝트 설정:

- 저장소: `Todari/toksai`
- Root Directory: `apps/web`
- Production Branch: `main`
- Include source files outside Root Directory: 켜기
- `NEXT_PUBLIC_API_URL=https://api.toksai.todari.dev`
- `NEXT_PUBLIC_SITE_URL=https://toksai.todari.dev`
- `NEXT_PUBLIC_GA_ID`: GA4를 사용할 때만 설정
- Production Domain: `toksai.todari.dev`

`apps/web/vercel.json`의 pnpm/turbo 명령을 사용한다.

## 7. 배포 후 확인

- `https://api.toksai.todari.dev/health`가 `{"ok":true}`를 반환한다.
- `https://toksai.todari.dev`에서 샘플 리포트가 열린다.
- 실제 카카오톡 내보내기 파일로 업로드 → 본인 식별 → 분석 → 결과 흐름을 확인한다.
- `robots.txt`가 `/a/`를 차단하고 결과 페이지가 `noindex`인지 확인한다.
- iCloud Mail에서 `hello@todari.dev` 송신 주소를 선택할 수 있고 실제 송수신되는지 확인한다.

## 롤백과 운영

이전 GitHub 커밋 SHA의 이미지를 지정해 Compose를 다시 올린다.

```bash
cd ~/toksai
TOKSAI_SERVER_IMAGE=ghcr.io/todari/toksai-server:<previous-commit-sha> \
  docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d --no-build
```

```bash
# 상태
TOKSAI_SERVER_IMAGE=ghcr.io/todari/toksai-server:latest \
  docker compose -f docker-compose.prod.yml --env-file .env.production ps

# 로그
TOKSAI_SERVER_IMAGE=ghcr.io/todari/toksai-server:latest \
  docker compose -f docker-compose.prod.yml --env-file .env.production logs -f server
```

DB 데이터는 `toksai_pgdata` 볼륨에 유지된다. `docker compose down -v`는 데이터까지
삭제하므로 실행하지 않는다.
