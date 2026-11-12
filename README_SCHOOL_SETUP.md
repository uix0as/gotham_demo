# Gotham 학교 Windows 설치·SQL 시연 안내

현재 구조는 **React + Vite + JavaScript / Node.js + Express + JavaScript / MySQL / mysql2/promise**입니다. 선생님 school_market 예시의 client·server 분리 방식을 따릅니다. Next.js·TypeScript는 필요하지 않습니다.

검증 범위: macOS에서 실제 MySQL·API·Vite·빌드·ZIP 재설치를 검사했습니다. **실제 Windows PC 실행은 NOT TESTED**입니다. 아래 절차를 학교 PC에서 실행한 후에만 Windows 완료로 표시합니다. 인터넷은 최초 npm 패키지 설치에 필요합니다. 설치 후 동봉 데이터로 CRUD·JOIN·분석을 시연할 수 있습니다.

## 1. 준비와 압축 해제

Node.js 24(또는 22.12 이상), npm, MySQL Server와 MySQL Workbench를 준비합니다. Workbench는 접속 도구이며 DB 서버와 별개입니다. `release/gotham_demo.zip`을 예를 들어 `C:\school`에 압축 해제합니다. 실제 폴더명에 맞춰 PowerShell에서 이동합니다.

```powershell
Set-Location C:\school\gotham_demo
node --version
npm --version
```

GitHub에서 내려받은 소스에는 DB 백업이 없습니다. 이 경우2·3번에서 DB·계정을 준비하고, 4번은 건너뛰어5번의 스키마·시드를 실행합니다.

이번 학교용 ZIP에는 현재 DB의 구조·데이터를 담은 `sql/gotham_20612_backup.sql`이 포함되어 있습니다. 회원2명·훈련 사건18건·분석 자료1,002건을 복원할 수 있습니다. node_modules·dist·실제.env·MySQL Server의 원시 데이터 파일은 포함하지 않습니다.

**이번 ZIP은 2·3번으로 DB와 계정을 준비한 뒤, 4번 백업 복원을 진행하고 5번 시드는 건너뜁니다.** 그다음 6번.env 설정과7번 패키지 설치부터 계속합니다. 덤프를 복원했다면 공개 데이터 가져오기도 다시 실행할 필요가 없습니다.

SQL 백업에는 웹 회원의 bcrypt 비밀번호 해시가 포함됩니다. 학교 PC 복원용으로 보관하며 공개 GitHub에는 포함하지 않습니다. MySQL20612 계정의 비밀번호와 JWT_SECRET은 덤프에 없으므로 학교에서 별도로 설정합니다.

## 2. MySQL Server와 관리자 연결

MySQL Server 서비스를 실행합니다. Workbench의 `+`로 관리자 Connection을 만듭니다. Standard TCP/IP, Hostname `127.0.0.1`, Port `3306`, 관리자 계정으로 Test Connection을 실행합니다. 학교 서버 주소·포트가 다르면 담당 선생님의 값을 사용합니다.

File → Open SQL Script로 `sql/admin-bootstrap.sql`을 엽니다. `REPLACE_WITH_YOUR_LOCAL_DB_PASSWORD` 두 곳을 학교에서 정한 DB 비밀번호로 바꾸고 실행합니다. 실제 비밀번호를 소스 저장소나 제출 ZIP에 저장하지 않습니다.

이 파일은 `gotham_20612`, 사용자 `20612`와 해당 스키마의 CRUD·테이블 준비 권한을 만듭니다. 기존 계정의 비밀번호는 CREATE USER IF NOT EXISTS로 변경되지 않습니다. 기존 계정이면 현재 비밀번호를 사용합니다.

## 3. 앱 계정 Workbench Connection

새 Connection을 아래와 같이 만듭니다.

| 항목 | 값 |
|---|---|
| Connection Name | Gotham 20612 |
| Connection Method | Standard TCP/IP |
| Hostname | 127.0.0.1 |
| Port | 3306 |
| Username | 20612 |
| Password | 앞에서 정한 학교 DB 비밀번호 |
| Default Schema | gotham_20612 |

Test Connection 성공 후 이 연결에서 작업합니다. SCHEMAS의 gotham_20612를 더블 클릭해 기본 스키마로 선택합니다. 학교에서 다른 이름을 지정했다면 모든 연결과 server/.env의 DB_NAME을 동일하게 바꿉니다.

## 4. 현재 DB 백업 복원 — 이번 ZIP 권장 방법

복원 파일: **sql/gotham_20612_backup.sql**. 스키마와 세 테이블의 데이터가 모두 들어 있습니다. 이번 백업은 gotham_20612를 대상으로 하므로 기본 DB 이름을 그대로 사용합니다.

1. Workbench의 학교 MySQL 관리자 연결을 엽니다. 앞의2번 admin-bootstrap.sql을 먼저 실행해 DB·20612 계정을 준비합니다.
2. 새 SQL 탭에서 다음을 실행해 **테이블이 없는 빈 DB**인지 확인합니다.

```sql
USE gotham_20612;
SHOW TABLES;
```

이미 테이블이나 데이터가 있으면 복원을 중단하고 기존 DB를 먼저 별도로 백업합니다. 이 백업 파일(`gotham_20612_backup.sql`)은 기존 테이블을 DROP하지 않으며, 재실행하면 테이블/기본키 중복 오류가 날 수 있습니다. 이번 경로에서는 schema.sql과 seed.sql을 먼저 실행하지 않습니다.

3. 상단 **Server → Data Import**를 엽니다.
4. **Import from Self-Contained File**을 선택하고 압축을 푼 폴더의 `sql/gotham_20612_backup.sql`을 지정합니다.
5. **Default Target Schema**를 `gotham_20612`로 선택합니다. 목록이 없으면 새로고침하고 앞의 DB 준비 단계를 확인합니다.
6. **Start Import**를 누르고 Import Progress에서 오류 없이 완료됐는지 확인합니다.
7. SCHEMAS를 새로고침합니다. members·incidents·analysis_records가 보여야 합니다.
8. 앞의3번에서 만든 **20612 연결**을 열어 아래 SQL로 결과를 확인합니다.

```sql
USE gotham_20612;
SELECT DATABASE() AS db, @@port AS port, CURRENT_USER() AS account;
SELECT COUNT(*) AS members FROM members;                   -- 2
SELECT COUNT(*) AS incidents FROM incidents;               -- 18
SELECT COUNT(*) AS analysis_records FROM analysis_records; -- 1002

SELECT i.id, i.title, i.status, m.username, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
ORDER BY i.occurred_at DESC, i.id DESC;
```

현재 웹 회원의 비밀번호 해시도 함께 복원되므로 기존 웹 로그인 비밀번호를 그대로 사용합니다. 기본 시연 계정은 alpha@demo.local / demo1234, bravo@demo.local / demo1234입니다. MySQL 접속 비밀번호는 웹 로그인 비밀번호와 별개입니다.

이제 아래6번에서 server/.env를 학교 접속정보로 설정합니다. **5번 시드, db:init·db:seed·data:import는 다시 실행하지 않습니다.**

Workbench의 Data Export(Dump Project Folder)로 만든 테이블별 덤프는 `DROP TABLE IF EXISTS`를 포함하므로 다른 절차가 필요합니다. [WINDOWS_SETUP.md](WINDOWS_SETUP.md) 5단계 방법 B를 따릅니다.

Workbench 절차 참고: [공식 SQL Data Export and Import 안내](https://dev.mysql.com/doc/workbench/en/wb-admin-export-import-management.html). 백업 원본은 MySQL9.0.1에서 내보냈습니다. macOS의 별도 MySQL에 실제 복원하여 세 테이블의 전체 행 내용과 외래키 CASCADE가 원본과 일치하는 것을 확인했습니다. 실제 Windows 복원은 학교에서 확인해야 합니다.

## 5. 백업 없이 새 데이터로 시작할 때만

GitHub 소스처럼 백업 SQL이 없는 경우에 사용합니다. **4번에서 백업을 복원했다면 이 단계 전체를 건너뜁니다.**

1. 빈 gotham_20612를 기본 스키마로 선택합니다.
2. sql/schema.sql을 실행합니다. 세 테이블과 incidents.author_id → members.id 외래키가 생성됩니다.
3. sql/seed.sql을 실행합니다. 가상 회원2명·훈련 사건18건이 추가됩니다.
4. 공개 분석 자료는 뒤의 선택적 data:import 명령으로 가져옵니다.

## 6. server 환경설정

이미 .env가 있으면 덮어쓰지 말고 필요한 값만 수정합니다.

```powershell
Copy-Item server/.env.example server/.env
notepad server/.env
```

```ini
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=20612
DB_PASSWORD=학교에서설정한DB비밀번호
DB_NAME=gotham_20612
JWT_SECRET=별도로생성한32자이상의무작위비밀키
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
COOKIE_SECURE=false
```

JWT 비밀키는 DB 비밀번호와 다르게 생성합니다. PowerShell에서 다음 명령의 출력값을 .env에 직접 붙여 넣을 수 있습니다. 예시 문구를 그대로 쓰지 않습니다.

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

브라우저에 노출되는 VITE_ 환경변수에는 DB 비밀번호나 JWT_SECRET을 넣지 않습니다. 학교 기본 API 포트 5000을 쓴다면 client 환경파일은 추가로 만들 필요가 없습니다.

## 7. npm 패키지 설치와 DB 진단

```powershell
npm run setup
npm run diagnose
```

setup은 root·client·server 각각 npm ci를 실행합니다. 수동으로 실행하려면 다음과 같습니다.

```powershell
npm ci
npm --prefix server ci
npm --prefix client ci
```

진단 결과의 DB 이름·서버·포트·계정을 Workbench의 SELECT 결과와 비교합니다. API 시작 전에는 DB 연결 성공과 API 미확인이 함께 표시될 수 있습니다. DB 연결 실패는 해결한 후 진행합니다.

백업 SQL을 복원하지 않은 경우에만, Workbench 대신 Node로 schema·seed를 초기화할 수도 있습니다. 4번에서 복원했다면 아래 두 명령은 실행하지 않습니다.

```powershell
npm run db:init
npm run db:seed
```

## 8. Express 실행

첫 번째 PowerShell을 프로젝트 루트에서 열고 실행합니다.

```powershell
npm run dev:server
```

`MySQL 연결 성공 (DB: gotham_20612)`과 `Gotham API: http://localhost:5000`이 보여야 합니다. DB 접속이 실패하면 서버는 시작하지 않고 오류 코드를 출력합니다. 브라우저에서 <http://localhost:5000/api/health>를 열어 database가 gotham_20612인지 확인합니다.

## 9. Vite React 실행

두 번째 PowerShell에서 같은 프로젝트 루트로 이동해 실행합니다.

```powershell
npm run dev:client
```

또는 한 터미널에서 `npm run dev`로 두 서버를 함께 실행할 수 있습니다. 개발 서버를 이중으로 실행하지 않습니다. 종료는 Ctrl+C입니다.

## 10. 브라우저 접속과 빌드 확인

<http://localhost:5173>에 접속합니다. 요청 경로는 `React /api → Vite 프록시 → Express → mysql2/promise → MySQL`입니다. 프록시는 client/vite.config.js에 있습니다.

```powershell
npm run lint
npm run build
```

별도 빌드 실행은 개발 서버를 종료하고 `npm start`로 Express를 실행한 뒤 <http://localhost:5000>을 엽니다. 이 경우 Express가 client/dist를 제공합니다. Vite 개발 서버는 필요하지 않습니다.

## 11. 회원·사건 CRUD와 권한

별도의 가상 이메일로 회원가입 → 로그인 → 내 계정에서 회원정보 수정 → 사건 2건 등록 → 목록·상세 재조회 → 본인 사건 수정·삭제 순으로 실행합니다. 다른 시연 계정으로 로그인하면 타인의 수정·삭제 메뉴가 없고 직접 API 요청도 403입니다. 로그인하지 않은 등록은 로그인 화면으로 이동하며 서버도 401을 반환합니다. 아이디·이메일 중복 가입은 409입니다.

회원탈퇴를 시연할 때는 방금 가입한 가상 계정에 사건 1건을 남깁니다. 탈퇴 확인문구 입력 후 탈퇴하면 해당 회원과 사건이 함께 삭제됩니다. 기본 시연 회원은 보존합니다.

## 12. Workbench에서 실제 데이터 변화 확인

웹과 같은 20612 연결에서 `sql/verify_connection.sql`을 실행합니다. 기본 DB 이름을 변경했다면 이 파일의 USE도 바꿉니다. `npm run diagnose`, `/api/health`와 DB 이름·포트를 비교합니다.

`sql/demo_workbench.sql`을 열고 번호 블록을 **하나씩** 선택 실행합니다. 2번의 @web_email을 웹에서 가입한 가상 이메일로 바꾸면 회원·사건 JOIN이 보입니다. 직접 SQL 수정·삭제를 COMMIT한 뒤 브라우저 새로고침 또는 출처 다시 조회/목록 재진입으로 새 값을 확인합니다. 웹은 영구적인 로컬 목데이터 캐시를 사용하지 않습니다.

전체 SQL 실행 시 이 SQL이 만든 시연 회원·사건은 마지막에 정리됩니다. 기본 회원·다른 회원은 대상으로 삼지 않습니다.

## 13. 실제 JOIN과 JavaScript SQL 발표

웹의 **전체 사건·작성자**(JOIN 화면 1) 메뉴와 아래 SQL을 비교합니다. **내 사건·회원정보**(JOIN 화면 2)는 같은 JOIN에 `WHERE m.id = ?`(로그인 회원)를 더한 결과입니다.

```sql
SELECT i.id AS event_id, i.title, i.status, m.id AS member_id, m.username, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
ORDER BY i.occurred_at DESC, i.id DESC;
```

`client/src/services/httpApi.js → server/routes/events.js → server/controllers/events.js → server/queries.js` 순으로 코드를 엽니다. 회원 API도 같은 흐름입니다. 실제 INSERT·SELECT·UPDATE·DELETE·JOIN이 queries.js에 있고, 사용자 값은 ?에 바인딩됩니다. API 경로는 docs/API_CONTRACT.md, 테이블 구조는 docs/DATABASE_SCHEMA.md에서 확인합니다.

## 추가 분석 데이터와 문제 해결

가상 사건18건만으로 모든 필수 CRUD·JOIN을 시연할 수 있습니다. 아래 가져오기는 백업 없이 새로 구성한 DB에서만 선택적으로 실행합니다. 이번 백업에는 공개 관측1,000건·합성 CSV2건이 이미 들어 있습니다.

```powershell
npm run data:import -- --limit 1000
node server/scripts/import-data.js --file docs/example-analysis.csv
npm run diagnose
npm test
```

동봉 GeoJSON·CSV는 설치 후 외부 API 접속 없이 MySQL로 가져옵니다. CSV의 예시 이메일·사건은 합성 자료이며 실제 인물 정보가 아닙니다.

| 증상 | 확인 |
|---|---|
| ECONNREFUSED | MySQL Server 서비스·DB_HOST·DB_PORT; Workbench만 실행한 것은 아닌지 |
| ER_ACCESS_DENIED_ERROR | 20612 계정·비밀번호·해당 호스트 권한 |
| ER_BAD_DB_ERROR | DB_NAME과 같은 스키마 생성 여부 |
| ER_NO_SUCH_TABLE | 같은 기본 스키마에서 schema.sql 실행 |
| EADDRINUSE | 기존 서버 종료 또는 아래 포트 설정 함께 변경 |
| API 502 / 연결 실패 | Express 실행 여부, API_PROXY_TARGET과 PORT 일치 |
| 변경이 안 보임 | COMMIT 실행, 올바른 스키마·연결, 브라우저 새로고침, 두 서버 재시작 |
| npm 엔진 오류 | Node.js 22.12 이상인지 확인 |
| PowerShell npm.ps1 실행 제한 | 정책을 끄지 않고 npm 대신 npm.cmd로 명령 실행 |

5000 포트가 사용 중이면 server/.env의 PORT=5001로 바꾸고 다음을 설정합니다. 기존 client/.env.local이 있으면 덮어쓰지 말고 값을 수정합니다.

```powershell
Copy-Item client/.env.example client/.env.local
notepad client/.env.local
```

```ini
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://127.0.0.1:5001
```

두 서버를 재시작합니다. 학교 방화벽·권한·실제 Windows 브라우저/네이티브 bcrypt 설치 결과는 학교 PC에서 직접 확인합니다. macOS 재현 성공을 Windows 실측 성공으로 해석하지 않습니다.
