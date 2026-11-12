# GOTHAM · 국방 훈련 정보 분석 시스템

가상 국방 훈련 사건을 등록하고, 사건에 대한 분석 기록과 작성 회원의 관계를 MySQL 외래키·JOIN으로 추적하는 학교 데이터베이스 프로그래밍 프로젝트입니다 (학번 20612). 실제 군사 정보와 무관한 **훈련용 가상 데이터**입니다.

- 프론트엔드: React 19 + Vite 8 + JavaScript(JSX), Tailwind CSS, Lucide, Recharts, React Flow(@xyflow/react), 글꼴 Barlow · IBM Plex Mono · Noto Sans KR (npm 패키지로 번들, 외부 CDN 없음)
- 백엔드: Node.js + Express 5, mysql2/promise, bcrypt, JWT(HttpOnly 쿠키)
- DB: MySQL 8.0.16 이상 (`gotham_20612`, 계정 `20612`)

## 주요 기능

| 영역 | 기능 | 화면 |
|---|---|---|
| 회원 CRUD | 회원가입(bcrypt 해시), 로그인, 회원 목록·상세, 본인 정보 수정, 탈퇴(작성 기록 CASCADE 삭제) | `/signup` `/login` `/members` `/mypage` |
| 훈련 사건 CRUD | 등록(로그인), 전체 조회·필터·정렬·열 너비 조절, 우측 상세 패널, 작성자만 수정·삭제 | `/events` |
| 분석 기록 CRUD | 사건 하나에 대한 판단·신뢰도·내용 기록, 작성자만 수정·삭제 | `/notes` |
| JOIN 화면 1 | 전체 사건 + 등록 회원 아이디·이메일 (서버 INNER JOIN) | `/joined` |
| JOIN 화면 2 | 내가 등록한 사건·분석 기록 + 내 회원정보 (서버 JOIN, `WHERE m.id = ?`) | `/my-events` |
| 관계 분석 | 회원 → 사건 → 분석 기록 그래프. 모든 연결선은 외래키 JOIN 결과 | `/graph` |
| 작전 상황판 | 구역별 상태, 가상 구역 지도, 우선 처리 대기열, 최근 활동, 시간대별 차트 | `/` |
| 구역·시간 연관 / 데이터 소스 | 규칙 기반 연관 후보, USGS 공개 관측 스냅샷(읽기 전용) | `/analysis` `/sources` |

권한은 브라우저 값을 믿지 않고 서버가 JWT의 회원 ID로 검사합니다 (컨트롤러 확인 + SQL `WHERE ... AND author_id = ?`).

## 데이터베이스

| 테이블 | 역할 | 관계 |
|---|---|---|
| `members` | 회원 (username·email UNIQUE, bcrypt 해시) | — |
| `incidents` | 훈련 사건 | `author_id → members.id` ON DELETE CASCADE |
| `analysis_notes` | 분석 기록 | `incident_id → incidents.id`, `author_id → members.id` 둘 다 ON DELETE CASCADE |
| `analysis_records` | 가져온 공개 관측 자료 (읽기 전용) | 외래키 없음 |

**SQL 실행 순서**: 외래키 때문에 `members → incidents → analysis_notes` 순서로 만들어야 하며, `sql/schema.sql`이 이 순서대로 작성되어 있습니다. 모든 문장이 `CREATE TABLE IF NOT EXISTS`라서 기존 데이터를 지우지 않습니다.

1. `sql/admin-bootstrap.sql` (root) — DB와 `20612` 계정·권한
2. `sql/schema.sql` (20612) — 테이블 4개
3. `sql/seed.sql` (선택) — 시연 회원 2명·사건 18건·분석 기록 4건, 다시 실행해도 중복 없음
4. `npm run data:import` (선택) — 동봉 USGS 관측 1,000건

Mac에서 내보낸 Workbench 덤프(members·incidents·analysis_records)를 복원한 경우에는 그 뒤에 `sql/schema.sql`을 한 번 더 실행해 `analysis_notes`를 추가합니다. 서버는 시작할 때 네 테이블이 모두 있는지 확인하고, 없으면 실행하지 않고 안내를 출력합니다.

## 설치와 실행

학교 Windows PC(`D:\GOTHAM`) 기준 전체 절차: **[WINDOWS_SETUP.md](WINDOWS_SETUP.md)**. DB 백업 파일 복원·Workbench 시연 SQL: [README_SCHOOL_SETUP.md](README_SCHOOL_SETUP.md).

```powershell
npm run setup                               # root·server·client npm ci
Copy-Item server\.env.example server\.env   # 이미 있으면 생략
notepad server\.env                         # DB_PASSWORD, JWT_SECRET 입력
npm run diagnose                            # DB 연결·테이블 확인
npm run dev                                 # Express 5000 + Vite 5173
```

- 웹: <http://localhost:5173> · API: <http://localhost:5000/api/health>
- `JWT_SECRET`은 32자 이상 무작위 값이어야 서버가 시작됩니다: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`
- 실제 `.env`는 `.gitignore`로 제외됩니다.
- 시연 계정: `alpha@demo.local`, `bravo@demo.local` / `demo1234`

## CRUD·JOIN 검증 순서 (선생님 평가용)

1. 회원가입 → 로그인 → `내 계정`에서 정보 확인
2. `훈련 사건` → 사건 등록 → 목록·상세 패널 확인 → `내 기록`에 바로 표시되는지 확인
3. 상세 패널에서 수정 → 저장 결과 확인
4. `이 사건 분석 기록 작성` → `분석 기록`에서 수정
5. `전체 사건·작성자`(JOIN 1), `내 기록`(JOIN 2), `관계 분석` 확인
6. 다른 회원의 사건을 열면 "조회 전용" (API로 직접 요청해도 403)
7. 분석 기록·사건 삭제 → 목록에서 사라짐
8. `내 계정` → 회원정보 수정 → 회원탈퇴("탈퇴" 입력) → 재로그인 실패

각 단계의 Workbench 확인 SQL은 WINDOWS_SETUP.md 11절에 있습니다.

## 검사

```powershell
npm run lint
npm run build
npm test      # 실제 MySQL에 임시 회원·사건·분석 기록을 만들고 정리 (세부 시나리오 14개)
```

## 문서

- [API 규격](docs/API_CONTRACT.md) · [DB 스키마](docs/DATABASE_SCHEMA.md) · [프로젝트 개요](docs/PROJECT_OVERVIEW.md) · [발표 순서](docs/PRESENTATION.md) · [데이터 출처](docs/DATA_SOURCES.md)
- 실제 SQL: [server/queries.js](server/queries.js)

USGS 관측은 2026-11-08에 저장한 스냅샷이며 실시간 연동이 아닙니다. 지도 배경은 NASA Earth Observatory / USGS Landsat 공개(Public domain) 위성사진이고(`client/public/map/SOURCE.txt`), 사건 좌표·구역은 그 위에 올린 0~100 가상 값입니다. 해당 지역에서 실제로 일어난 일이 아닙니다.
