# 프로젝트 개요

DEFENSE NEXUS는 가상의 사건·센서 정보를 지도·목록·관계망으로 살펴보는 데이터베이스 수행평가 프로젝트입니다. 참조 대시보드의 시각 체계와 실제 Express·MySQL 기능을 연결했습니다.

## 목표와 범위

회원 CREATE·READ·UPDATE·DELETE, 사건 CREATE·READ·UPDATE·DELETE, 작성자 권한 검증, SQL INNER JOIN을 직접 설명하고 시연할 수 있는 것이 핵심 목표입니다. 사건명·유형·중요도·위치·발생 시각·설명·상태·작성자를 저장합니다.

실제 군사정보와 연결하지 않습니다. 공개 USGS 지진 데이터는 파일로 가져와 별도 `analysis_records`에 저장하며 회원 사건 CRUD와 구분합니다. 학교에서는 저장한 스냅샷을 사용하므로 실시간 외부 API 연결 없이 분석할 수 있습니다. 지도는 가상 좌표이며 관계망은 같은 구역·가까운 발생 시각이라는 규칙으로 연관 후보를 표시합니다. 관계선이 인과관계를 증명하거나 위험도를 자동 판정하지 않습니다.

## 화면

| 경로 | 화면 | 역할 |
|---|---|---|
| `/` | 종합 상황판 | DB 사건 KPI·지도·최근 목록·차트 |
| `/events` | 사건 목록 | 검색·필터·등록·수정·삭제 |
| `/events/:id` | 사건 상세 | 사건 전체 필드·위치·관련 사건 |
| `/analysis` | 연관 분석 | DB 사건의 구역·시각 기반 관계망·차트 |
| `/joined` | 사건·작성자 통합 분석 | 실제 INNER JOIN 결과 |
| `/mypage` | 마이페이지 | 자기 회원정보 수정·작성 사건·탈퇴 |
| `/login`, `/signup` | 로그인·회원가입 | JWT 인증·회원 CREATE |

비로그인 사용자는 조회할 수 있습니다. 로그인한 회원은 사건을 등록하고 본인의 사건만 수정·삭제합니다. 마이페이지 API는 토큰에서 본인 ID를 얻습니다.

## 데이터 흐름

```text
React 화면 / Context
  → Axios httpApi.js (/api, withCredentials)
  → Vite 프록시 (개발) 또는 Express 동일 출처 (빌드 실행)
  → Express 라우트 · 입력 검증 · JWT/작성자 검사
  → mysql2/promise pool.execute(직접 작성한 SQL, 값 배열)
  → MySQL gotham_20612.members / incidents / analysis_records
  → JSON {data} → Context 갱신 → 목록·지도·차트
```

데이터베이스 사용자명 `20612`는 MySQL 연결 계정입니다. 웹 회원 아이디 `members.username`과는 서로 다른 개념입니다. 인증 JWT의 비밀키와 DB 비밀번호는 백엔드 `.env`만 사용합니다.

## 구현 읽기 순서

1. `sql/schema.sql`: 회원 1:N 사건 관계와 CASCADE.
2. `server/queries.js`: CRUD·INNER JOIN SQL.
3. `server/app.js`: 버튼별 API 라우트와 결과.
4. `server/middleware/auth.js`, `validation.js`: JWT·서버 입력 검증.
5. `client/src/services/httpApi.js`: Axios API 호출.
6. `client/src/context/EventsContext.jsx`, `AuthContext.jsx`: 화면 데이터 갱신.
7. `client/src/pages/JoinedRecords.jsx`: 독립 JOIN 메뉴.
8. `client/src/analysis/ruleBasedEngine.js`: 조회한 사건으로 관계 계산.

실행 방법은 루트 README와 README_SCHOOL_SETUP.md, 발표 준비는 PRESENTATION.md를 참고합니다.

## 공개 분석 데이터

`data/`의 USGS GeoJSON 스냅샷 또는 CSV를 `server/scripts/import-data.js`로 가져옵니다. GET `/api/analysis-records`에서 읽기 전용으로 반환하며 출처·원본 URL·실제 좌표·규모·가져온 시각을 보존합니다. 분석에서 직접 등록 사건과 함께 표시할 수 있지만 회원 JOIN·작성자 권한 CRUD에는 포함하지 않습니다. 출처를 필터링할 수 있고 그래프 노드는 성능을 위해 제한합니다. 실제 좌표와 가상 지도 배치는 구분합니다. 상세한 구조와 이용 조건은 `DATA_SOURCES.md`를 참고합니다.
