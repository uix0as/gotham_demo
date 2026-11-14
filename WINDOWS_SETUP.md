# GOTHAM Windows 실행 매뉴얼 (학교 실습실)

학교 Windows PC에서 GitHub 저장소를 `D:\GOTHAM`에 클론하고, 빈 MySQL에서 시작해 브라우저로 회원 CRUD·훈련 사건 CRUD·분석 기록 CRUD·JOIN 화면 2개를 확인하는 절차입니다.

> 검증 범위: 이 절차는 macOS(MySQL 9.0.1, Node.js)에서 같은 명령 흐름으로 확인했습니다. **실제 Windows PC에서는 아직 실행해 보지 않았습니다.** 학교 PC에서 아래 순서대로 실행해 확인해 주세요.

| 항목 | 값 |
|---|---|
| 저장소 | `https://github.com/uix0as/gotham_demo.git` |
| 설치 위치 | `D:\GOTHAM` |
| DB 이름 / 계정 | `gotham_20612` / `20612` |
| MySQL 포트 | 3306 |
| 백엔드(Express) | `http://localhost:5000` |
| 프론트엔드(Vite) | `http://localhost:5173` |

모든 명령은 **Windows PowerShell**에서 실행합니다.

## 0. 빠른 체크리스트 (이미 클론·DB 준비를 해 둔 경우)

프로젝트 폴더(예: `D:\GOTHAM`)에서 PowerShell을 열고 위에서부터 차례로 확인합니다.

| # | 확인 | 명령 / 위치 | 정상 결과 |
|---|---|---|---|
| 1 | Node 버전 | `node -v` | `v22.12` 이상 |
| 2 | MySQL 서비스 | `Get-Service MySQL*` | `Running` |
| 3 | 최신 코드 | `git pull` | `Already up to date` 또는 갱신 |
| 4 | 패키지 | `npm.cmd run setup` | `설치 완료` |
| 5 | `.env` 위치·이름 | `Get-ChildItem server\.env` | `.env` 한 개 (`.env.txt` 아님) |
| 6 | 테이블 4개 | `npm.cmd run db:init` | `members / incidents / analysis_notes / analysis_records 테이블 준비 완료` |
| 7 | 시연 데이터(선택) | `npm.cmd run db:seed` | `시연 데이터 준비 완료` |
| 8 | 연결 진단 | `npm.cmd run diagnose` | `행 수: {...}`와 외래키 `확인` 두 줄 |
| 9 | 실행 | `npm.cmd run dev` | `MySQL 연결 성공`, `Gotham API: http://localhost:5000`, `Local: http://localhost:5173/` |
| 10 | 브라우저 | `http://localhost:5173` → 회원가입 | 가입 후 로그인 화면으로 이동 |

- **Mac에서 내보낸 덤프를 복원한 DB는 6번이 꼭 필요합니다.** 덤프에는 `analysis_notes`(분석 기록) 테이블이 없어서, 그대로 두면 서버가 시작하지 않고 회원가입도 실패합니다. `db:init`은 없는 테이블만 만들고 기존 데이터는 지우지 않습니다.
- 9번에서 Vite 주소만 나오고 `Gotham API` 줄이 없으면 서버가 멈춘 것입니다. 그 위에 출력된 `[사전 점검 실패]` 또는 오류 줄의 해결 방법을 따릅니다. 12절 표도 참고합니다.

## 1. 사전 준비

| 프로그램 | 필요 버전 | 비고 |
|---|---|---|
| Git | 최신 | 클론용 |
| Node.js (npm 포함) | **22.12 이상** (24 LTS 권장) | Vite 8 요구사항 |
| MySQL Server | 8.0.16 이상 (8.0 / 8.4 / 9.x) | CHECK 제약조건 사용 |
| MySQL Workbench | 8.0 이상 | DB·계정 생성, 데이터 확인 |

설치 여부 확인:

```powershell
git --version
node --version
npm --version
Get-Service MySQL*
```

- 네 명령이 모두 버전/서비스를 출력하면 2단계로 넘어갑니다.
- 설치되어 있지 않다면 각 공식 사이트 설치 파일로 설치합니다. **설치에는 관리자 권한이 필요**합니다. 권한이 없으면 담당 선생님께 요청합니다.
- npm 패키지를 처음 설치할 때 인터넷이 필요합니다.

## 2. D 드라이브에 클론

```powershell
git clone https://github.com/uix0as/gotham_demo.git D:\GOTHAM
Set-Location D:\GOTHAM
```

이미 `D:\GOTHAM`이 있으면 새로 클론하지 말고 최신 내용만 받습니다.

```powershell
Set-Location D:\GOTHAM
git pull
```

## 3. MySQL Server 실행

```powershell
Get-Service MySQL*
```

`Status`가 `Running`이면 됩니다. `Stopped`이면 **관리자 PowerShell**(시작 메뉴 → PowerShell 우클릭 → 관리자 권한으로 실행)에서 서비스 이름에 맞춰 실행합니다.

```powershell
Start-Service MySQL80
```

서비스 이름은 설치 버전에 따라 `MySQL80`, `MySQL84`, `MySQL90` 등입니다. 서비스 앱(`services.msc`)에서 시작해도 됩니다. **Workbench는 접속 도구일 뿐이고 DB 서버가 아닙니다.**

## 4. Workbench에서 DB와 `20612` 계정 만들기

1. Workbench 첫 화면의 root 연결(Local instance, `127.0.0.1:3306`, `root`)을 엽니다.
2. **File → Open SQL Script** → `D:\GOTHAM\sql\admin-bootstrap.sql`을 엽니다.
3. `REPLACE_WITH_YOUR_LOCAL_DB_PASSWORD` **두 곳**을 직접 정한 DB 비밀번호로 바꿉니다.
4. 번개 아이콘(Execute)으로 전체 실행합니다.

이 스크립트가 하는 일:

- `gotham_20612` 데이터베이스 생성 (utf8mb4)
- `'20612'@'localhost'`, `'20612'@'127.0.0.1'` 계정 생성
- `gotham_20612.*`에 대한 SELECT·INSERT·UPDATE·DELETE·CREATE·DROP·REFERENCES·INDEX·ALTER·LOCK TABLES 권한 부여 (DROP·LOCK TABLES는 백업 복원용)

계정이 이미 있으면 비밀번호는 바뀌지 않습니다. 기존 비밀번호를 모르면 root 연결에서 실행합니다.

```sql
ALTER USER '20612'@'localhost' IDENTIFIED BY '새비밀번호';
ALTER USER '20612'@'127.0.0.1' IDENTIFIED BY '새비밀번호';
```

### 20612 계정 연결 만들기

Workbench 홈의 `+`로 새 연결을 만듭니다.

| 항목 | 값 |
|---|---|
| Connection Name | GOTHAM 20612 |
| Hostname / Port | 127.0.0.1 / 3306 |
| Username | 20612 |
| Password | Store in Vault… → 4단계에서 정한 비밀번호 |
| Default Schema | gotham_20612 |

**Test Connection**이 성공하면 이 연결을 엽니다.

## 5. 테이블 만들기 — 둘 중 하나만

### 방법 A. 새로 만들기 (GitHub 클론 기본)

20612 연결에서 SCHEMAS의 `gotham_20612`를 더블 클릭(굵게 표시)한 다음:

1. **File → Open SQL Script** → `D:\GOTHAM\sql\schema.sql` → 전체 실행
   - `members` → `incidents` → `analysis_notes` → `analysis_records` 순서로 만듭니다. 외래키가 앞 테이블을 참조하므로 이 순서가 필요합니다.
   - 외래키: `incidents.author_id → members.id`, `analysis_notes.incident_id → incidents.id`, `analysis_notes.author_id → members.id` (모두 ON DELETE CASCADE)
   - `CREATE TABLE IF NOT EXISTS`라서 기존 테이블·데이터는 건드리지 않습니다.
2. (선택) `D:\GOTHAM\sql\seed.sql` → 전체 실행
   - 시연 회원 2명(`alpha@demo.local`, `bravo@demo.local`, 비밀번호 `demo1234`), 가상 훈련 사건 18건, 분석 기록 4건을 추가합니다.
   - 같은 이메일·사건이 이미 있으면 건너뛰므로 다시 실행해도 중복되지 않습니다.

Workbench 대신 Node 스크립트로도 같은 일을 할 수 있습니다(7단계 설치 후).

```powershell
npm run db:init     # schema.sql 적용 (기존 데이터 유지)
npm run db:seed     # 시연 회원 2명 + 사건 18건 + 분석 기록 4건 (중복 없이)
npm run data:import # 선택: 동봉된 USGS 공개 관측 1,000건 (분석 화면용)
```

### 방법 B. Mac에서 내보낸 Workbench 덤프 폴더 복원

Mac에서 **Server → Data Export → Export to Dump Project Folder**로 만든 폴더(`gotham_20612_members.sql`, `gotham_20612_incidents.sql`, `gotham_20612_analysis_records.sql`)를 USB 등으로 옮긴 경우에만 사용합니다. 이 파일들은 Git에 없습니다.

- 각 파일은 `DROP TABLE IF EXISTS` 후 다시 만듭니다. **같은 이름의 테이블이 있으면 그 데이터가 삭제됩니다.** 복원은 비어 있는 `gotham_20612`에만 합니다.
- `admin-bootstrap.sql`의 DROP·LOCK TABLES 권한이 필요합니다. 이전 버전 스크립트로 계정을 만들었다면 root 연결에서 실행합니다.

```sql
GRANT DROP, LOCK TABLES ON gotham_20612.* TO '20612'@'localhost';
GRANT DROP, LOCK TABLES ON gotham_20612.* TO '20612'@'127.0.0.1';
```

1. **Server → Data Import** → **Import from Dump Project Folder** → 덤프 폴더 선택
2. **Default Target Schema**: `gotham_20612`
3. 세 테이블이 모두 체크됐는지 확인 → **Start Import**
4. 이 덤프는 `analysis_notes`(분석 기록) 테이블이 생기기 전에 내보낸 것입니다. **복원 후 `sql/schema.sql`을 한 번 실행**해 `analysis_notes`를 추가합니다 (`CREATE TABLE IF NOT EXISTS`라 복원한 데이터는 그대로입니다). 시연용 분석 기록이 필요하면 `sql/seed.sql`도 실행합니다. 둘 다 생략하면 서버가 "테이블이 없습니다: analysis_notes"를 출력하고 시작하지 않습니다.

복원 결과 확인:

```sql
USE gotham_20612;
SELECT (SELECT COUNT(*) FROM members) AS members,
       (SELECT COUNT(*) FROM incidents) AS incidents,
       (SELECT COUNT(*) FROM analysis_records) AS analysis_records;
SELECT COUNT(*) AS analysis_notes FROM analysis_notes;
-- 2026-11-08 덤프 + schema.sql + seed.sql 기준: 2 / 18 / 1002 / 4
```

## 6. `.env` 설정

```powershell
Set-Location D:\GOTHAM
Copy-Item server\.env.example server\.env
notepad server\.env
```

`.env`가 이미 있으면 복사하지 말고 값만 고칩니다.

```ini
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=20612
DB_PASSWORD=4단계에서_정한_DB_비밀번호
DB_NAME=gotham_20612
JWT_SECRET=아래_명령으로_만든_값
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
COOKIE_SECURE=false
```

`JWT_SECRET`은 예시 문구를 그대로 쓰면 서버가 시작을 거부합니다. 다음 출력값을 붙여 넣습니다.

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

`server\.env`는 `.gitignore`로 제외되어 GitHub에 올라가지 않습니다. 프론트엔드는 기본값(`/api` → `http://127.0.0.1:5000`)을 쓰므로 `client\.env.local`은 만들지 않아도 됩니다.

## 7. 의존성 설치

```powershell
Set-Location D:\GOTHAM
npm run setup
```

루트·`server`·`client`에서 각각 `npm ci`를 실행합니다(`package-lock.json` 기준). 따로 실행하려면 다음과 같습니다.

```powershell
npm ci
npm --prefix server ci
npm --prefix client ci
```

설치 후 DB 연결을 확인합니다.

```powershell
npm run diagnose
```

DB 이름 `gotham_20612`, 계정 `20612@...`, 각 테이블 행 수가 출력되어야 합니다.

## 8. 백엔드 실행 (PowerShell 창 1)

```powershell
Set-Location D:\GOTHAM
npm run dev:server
```

정상 출력:

```text
MySQL 연결 성공 (DB: gotham_20612)
Gotham API: http://localhost:5000 (DB: gotham_20612)
```

DB에 접속하지 못하면 서버는 **시작하지 않고** `MySQL 연결 실패 (오류코드)`를 출력합니다. 브라우저에서 <http://localhost:5000/api/health>를 열면 `"database":"gotham_20612"`가 보여야 합니다.

## 9. 프론트엔드 실행 (PowerShell 창 2)

```powershell
Set-Location D:\GOTHAM
npm run dev:client
```

`Local: http://localhost:5173/`이 보이면 됩니다. 한 창에서 `npm run dev`로 두 서버를 함께 실행할 수도 있습니다(8·9단계와 중복 실행하지 않기). 종료는 `Ctrl+C`입니다.

## 10. 브라우저 접속

<http://localhost:5173>

| 메뉴 | 경로 | 내용 |
|---|---|---|
| 작전 상황판 | `/` | 구역별 현황·지도·우선 처리 대기열·최근 활동 |
| 훈련 사건 | `/events` | 훈련 사건 전체 조회·등록·수정·삭제 (우측 상세 패널) |
| 분석 기록 | `/notes` | 분석 기록 조회·등록·수정·삭제 (기록 ⨝ 회원 ⨝ 사건) |
| 회원 | `/members` | 회원 목록·상세·작성 기록 (로그인 필요), 본인 수정·탈퇴 |
| 관계 분석 | `/graph` | 회원 → 사건 → 분석 기록 그래프 |
| 전체 사건·작성자 | `/joined` | **JOIN 화면 1**: 모든 사건 + 작성자 아이디·이메일 |
| 내 기록 | `/my-events` | **JOIN 화면 2**: 로그인한 회원의 사건·분석 기록 + 회원정보 (로그인 필요) |
| 내 계정 | `/mypage` | 회원정보 조회·수정·탈퇴 |
| 회원가입 / 로그인 | `/signup`, `/login` | |

## 11. CRUD·JOIN 검증 순서

새 가상 계정 두 개(예: `t1@example.test`, `t2@example.test`, 비밀번호는 영문+숫자 8자 이상)로 진행합니다.

| # | 브라우저 동작 | Workbench 확인 SQL |
|---|---|---|
| 1 | 회원가입 (계정 1) | `SELECT id, username, email, LEFT(password_hash,7) FROM members WHERE email='t1@example.test';` → `$2b$10$` (bcrypt) |
| 2 | 같은 이메일로 다시 가입 | "이미 사용 중" 오류 (409) |
| 3 | 로그인 → 내 계정 | 화면 정보와 1번 결과 비교 |
| 4 | 회원정보 수정(아이디 변경) → 새로고침 | `SELECT username, updated_at FROM members WHERE email='t1@example.test';` |
| 5 | 상황정보 → 상황정보 등록 | `SELECT id, title, author_id FROM incidents ORDER BY id DESC LIMIT 3;` → author_id = 계정 1 id |
| 6 | 상황정보 목록 / 새로고침 | 등록한 사건이 남아 있음 |
| 7 | 내 기록 | 계정 1의 사건만 표시 |
| 8 | 사건 상세 패널 → 수정 | `SELECT title, status, updated_at FROM incidents WHERE id=<사건id>;` |
| 8-1 | 상세 패널 → 이 사건 분석 기록 작성 → 분석 기록에서 수정 | `SELECT id, title, assessment, incident_id, author_id FROM analysis_notes ORDER BY id DESC LIMIT 3;` |
| 9 | 로그아웃 → 계정 2 가입·로그인 → 사건 등록 | |
| 10 | 전체 사건·작성자 | 두 계정의 사건과 작성자 이메일이 함께 표시 |
| 11 | 내 기록 / 관계 분석 | 계정 2의 사건만 표시 / 회원→사건→분석 연결 확인 |
| 12 | 계정 1의 사건 상세 열기 | 수정·삭제 버튼 대신 "조회 전용" (API로 직접 요청해도 403) |
| 13 | 계정 2의 사건 삭제 | `SELECT COUNT(*) FROM incidents WHERE id=<사건id>;` → 0 |
| 14 | 계정 1로 로그인 → 내 계정 → 회원탈퇴("탈퇴" 입력) | `SELECT * FROM members WHERE email='t1@example.test';` → 0행, 계정 1의 사건·분석 기록도 0행 (CASCADE) |
| 15 | 계정 1로 다시 로그인 | 로그인 실패 |

JOIN 화면 2개를 Workbench 결과와 비교하는 SQL:

```sql
-- JOIN 화면 1 (server/queries.js · listIncidentsWithAuthors)
SELECT i.id, i.title, i.category, i.status, i.occurred_at, m.username, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
ORDER BY i.occurred_at DESC, i.id DESC;

-- JOIN 화면 2 (server/queries.js · listMyIncidentsWithAuthor)
SELECT i.id, i.title, i.category, i.status, i.occurred_at, m.id, m.username, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
WHERE m.email = 't2@example.test'
ORDER BY i.occurred_at DESC, i.id DESC;
```

웹은 브라우저 저장소에 데이터를 두지 않고 매번 API로 MySQL을 조회합니다. Workbench에서 직접 바꾼 값은 `COMMIT` 후 브라우저를 새로고침하면 보입니다.

## 12. 문제 해결

### MySQL 접속 오류

| 증상 (`npm run diagnose` / 서버 출력) | 확인할 것 |
|---|---|
| `ECONNREFUSED` | MySQL 서비스가 Running인지 (3단계), `DB_HOST`·`DB_PORT` |
| `ER_ACCESS_DENIED_ERROR` | `.env`의 `DB_USER`·`DB_PASSWORD`, 4단계 계정이 `localhost`와 `127.0.0.1` 둘 다 있는지 |
| `ER_BAD_DB_ERROR` | `gotham_20612` 생성 여부, `DB_NAME` 철자 |
| `ER_NO_SUCH_TABLE` / `테이블이 없습니다: analysis_notes` | 5단계 schema.sql을 `gotham_20612`에서 실행했는지 (덤프 복원 후에도 한 번 실행) |
| `DROP command denied` (덤프 복원 중) | 5단계 방법 B의 GRANT 실행 또는 root 연결로 복원 |
| `server/.env 설정이 필요합니다` | `server\.env` 파일 위치와 항목 |
| `JWT_SECRET을 무작위 32자 이상…` | 6단계 명령으로 만든 값 사용 |

### 포트 충돌

| 증상 | 해결 |
|---|---|
| `5000 포트가 사용 중입니다` | 사용 중인 프로그램 확인: `Get-NetTCPConnection -LocalPort 5000 \| Select-Object OwningProcess` → `Get-Process -Id <번호>` 후 종료. 또는 `server\.env`의 `PORT=5001`로 바꾸고 아래 client 설정 |
| `Port 5173 is in use` | 이미 실행 중인 Vite 창을 `Ctrl+C`로 종료 |
| 화면에 "백엔드 서버에 연결할 수 없습니다" / 502 | 8단계 서버 실행 여부, 포트 일치 |

백엔드 포트를 5001로 바꿨다면:

```powershell
Copy-Item client\.env.example client\.env.local
notepad client\.env.local
```

```ini
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://127.0.0.1:5001
```

두 서버를 다시 시작합니다.

### Windows 권한 문제

| 증상 | 해결 |
|---|---|
| `npm.ps1 … 이 시스템에서 스크립트를 실행할 수 없으므로` | 실행 정책을 바꾸지 말고 `npm` 대신 `npm.cmd` 사용 (예: `npm.cmd run setup`) |
| `Start-Service` 액세스 거부 | 관리자 PowerShell에서 실행하거나 선생님께 요청 |
| `D:\GOTHAM` 생성·쓰기 거부 (`EPERM`) | D 드라이브 쓰기 권한 확인, 탐색기·편집기에서 폴더를 연 채로 `npm ci`를 하지 않기, 백신 검사 중이면 잠시 후 재시도 |
| Windows 방화벽 알림 (node.exe) | localhost에서만 쓰므로 "취소"해도 동작합니다 |
| `npm ci` 중 bcrypt 오류 | Node.js 버전 확인(22.12 이상). bcrypt 6은 Windows x64용 미리 빌드된 파일을 포함하므로 보통 컴파일이 필요 없습니다 |

### 관리자 권한이 필요한 작업

- Git·Node.js·MySQL Server·Workbench 설치
- MySQL 서비스 시작/중지
- (권한이 막혀 있는 PC라면) D 드라이브 최상위 폴더 생성

DB·계정 생성은 MySQL root 계정이 필요하지만 Windows 관리자 권한은 필요 없습니다.

## 13. 테스트 명령 (선택)

```powershell
npm run lint    # ESLint
npm run build   # 프로덕션 빌드
npm test        # 실제 MySQL에 테스트 회원·사건을 만들고 끝나면 정리
```

`npm test`는 `.env`의 DB에 임시 회원·사건·분석 기록을 만들었다가 지웁니다. 기존 데이터는 바꾸지 않지만, 평가 직전에는 실행하지 않아도 됩니다.
