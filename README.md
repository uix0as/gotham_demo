# Gotham · DEFENSE NEXUS

가상 국방 훈련 상황정보를 등록하고 지도·목록·관계망으로 조회하는 데이터베이스 프로젝트입니다. 회원 관리와 사건 관리를 연결하고, MySQL의 외래키와 INNER JOIN으로 사건·작성자 정보를 함께 조회합니다.

React + Vite + JavaScript 프런트엔드와 Node.js + Express 백엔드를 분리했습니다. DB는 MySQL이며, mysql2/promise로 SQL을 실행합니다.

## 주요 기능

- 회원가입, bcrypt 비밀번호 검증, JWT 로그인, 회원정보 조회·수정·탈퇴
- 로그인 회원의 훈련 사건 등록, 전체 목록·상세 조회, 작성자 본인만 수정·삭제
- 사건·작성자 JOIN 조회, 작성자 필터, 검색과 페이지 이동
- 구역·시간 기준 연관 분석, 차트, 가상 구역 지도와 CSV 내보내기
- 공개 관측 자료의 출처 표시, 밝은·어두운 테마, 모바일 화면

## 구성

```text
gotham_demo/
├── client/                 React·Vite 프런트엔드
│   └── src/
│       ├── components/     공통 UI
│       ├── pages/          화면
│       ├── App.jsx         라우팅
│       └── main.jsx        진입점
├── server/                 Express API
│   ├── index.js            서버 시작·DB 연결 확인
│   ├── db.js               MySQL 연결 풀
│   ├── queries.js          회원·사건 CRUD와 JOIN SQL
│   ├── routes/             API 경로
│   ├── controllers/        검증·권한 검사·SQL 호출
│   ├── middleware/         인증·오류 처리
│   └── scripts/            DB 초기화·시드·진단·자료 가져오기
├── sql/                    스키마·시드·Workbench 시연 쿼리
├── data/                   공개 관측 스냅샷과 출처
└── docs/                   API·DB·자료 출처·발표 안내
```

## 설치와 실행

Node.js 24 또는22.12 이상, npm, MySQL Server와 MySQL Workbench가 필요합니다. Windows의 DB 준비와 PowerShell 명령은 [학교 설치 안내](README_SCHOOL_SETUP.md)를 참고하세요.

**현재 DB가 동봉된 학교용 ZIP이라면 [학교 설치 안내의4번](README_SCHOOL_SETUP.md)으로 복원합니다. 이 경우 아래 schema.sql·seed.sql 초기화는 건너뜁니다. GitHub 소스에는 개인 DB 백업이 포함되지 않습니다.**

1. Workbench 관리자 연결에서 `sql/admin-bootstrap.sql`의 예시 비밀번호를 수정하고 실행합니다.
2. `20612` 계정으로 연결해 `gotham_20612`를 기본 스키마로 선택합니다.
3. `sql/schema.sql`, `sql/seed.sql`을 순서대로 실행합니다.
4. 프로젝트 루트에서 다음 명령을 실행합니다. 기존 `.env`는 덮어쓰지 않습니다.

```powershell
npm run setup
Copy-Item server/.env.example server/.env
notepad server/.env
```

`server/.env`에 학교 DB 접속정보와32자 이상의 무작위 JWT_SECRET을 입력합니다. 실제 비밀번호·비밀키는 커밋하지 않습니다.

```powershell
npm run diagnose
npm run dev
```

웹은 <http://localhost:5173>, 기본 API는 <http://localhost:5000/api/health>입니다. Vite가 `/api` 요청을 Express로 전달합니다. 포트를 바꿀 때는 `server/.env`의 PORT와 `client/.env.local`의 API_PROXY_TARGET을 함께 변경합니다.

## 데이터

기본 시드는 가상 회원2명과 훈련 사건18건입니다. 실제 군사정보·개인정보를 사용하지 않습니다. 시연 계정은 `alpha@demo.local`, `bravo@demo.local`, 비밀번호는 `demo1234`입니다. DB에는 bcrypt 해시를 저장합니다.

USGS의 실제 공개 지진 관측1,000건은 별도 분석 테이블에 저장합니다. 동봉 GeoJSON 스냅샷을 가져오려면 다음 명령을 실행합니다.

```powershell
npm run data:import
```

자료는 저장 시점의 스냅샷이며 실시간 관측이 아닙니다. 원본 좌표와 출처를 보존하고, 지도상의 정규화 좌표·구역·중요도는 시연을 위한 표시값입니다. 합성 CSV2행은 다음 명령으로 가져올 수 있습니다.

```powershell
node server/scripts/import-data.js --file docs/example-analysis.csv
```

자료의 출처와 이용 조건은 [데이터 출처](docs/DATA_SOURCES.md)를 참고하세요.

## 빌드와 검사

```powershell
npm run lint
npm run build
npm test
```

테스트는 설정된 실제 MySQL에 고유한 검증용 회원·사건을 생성하고 정리합니다. 빌드 후 개발 서버를 종료하고 `npm start`를 실행하면 Express가 `client/dist`와 API를 함께 제공합니다.

macOS에서 빌드·API·MySQL·압축 해제 후 설치를 검증했습니다. 실제 Windows 실행은 학교 PC에서 확인해야 합니다.

## SQL 시연과 문서

- [Workbench CRUD·JOIN 시연](sql/demo_workbench.sql): 번호 블록별 실행 후 웹에서 재조회
- [실제 API SQL](server/queries.js): INSERT·SELECT·UPDATE·DELETE·INNER JOIN
- [API 규격](docs/API_CONTRACT.md)
- [DB 스키마](docs/DATABASE_SCHEMA.md)
- [프로젝트 개요](docs/PROJECT_OVERVIEW.md)
- [발표 순서](docs/PRESENTATION.md)

웹과 Workbench는 같은 `gotham_20612`를 사용합니다. `sql/verify_connection.sql`과 `npm run diagnose`로 DB 이름·서버·포트·계정을 비교할 수 있습니다.

`npm run package`는 `release/gotham_demo.zip`을 생성합니다. 실제 환경설정·의존성·빌드 결과·MySQL 원시 데이터 파일은 제외합니다. 로컬 sql/gotham_20612_backup.sql이 있으면 학교용 ZIP에 함께 넣습니다. 이 SQL 백업은 Git에서 제외하며, 복원 절차는 README_SCHOOL_SETUP.md에 있습니다.
