# 실제 발표 시연 순서

학교 설치는 ../README_SCHOOL_SETUP.md, SQL은 ../server/queries.js, API 경로는 API_CONTRACT.md에서 확인합니다. 발표 전 npm run diagnose와 npm test, npm run build를 실행합니다.

| 순서 | 시연 | 확인할 근거 |
|---|---|---|
| 1 | React/Vite·별도 Express·MySQL 구조 소개 | client/package.json, vite.config.js, server/package.json·index.js·db.js |
| 2 | Workbench 20612 연결과 웹 DB 일치 | sql/verify_connection.sql ↔ npm run diagnose ↔ /api/health |
| 3 | 가상 이메일로 회원가입 | MySQL members INSERT, 중복 가입 409, bcrypt 해시 |
| 4 | 잘못된 비밀번호 후 정상 로그인·내 계정 | bcrypt.compare, HttpOnly JWT, GET /auth/me |
| 5 | 회원정보 수정 | PATCH /members/me → UPDATE members, Workbench 재조회 |
| 6 | 훈련 사건 2건 등록·목록·상세·지도 | POST/GET /events, incidents 실제 행 |
| 7 | 전체 사건·작성자(JOIN 1)와 내 사건·회원정보(JOIN 2) 메뉴 | /events-with-authors, /members/me/events, INNER JOIN, members 1:N incidents |
| 8 | 본인 사건 수정·삭제 | PATCH/DELETE /events/:id, Workbench 확인 |
| 9 | 브라보 계정에서 알파 사건 수정·삭제 제한 | 화면 메뉴와 직접 API의 403, author_id 조건 |
| 10 | sql/demo_workbench.sql의 가상 행 CREATE/JOIN/UPDATE/DELETE | 각 블록 후 COMMIT·웹 재조회, 마지막 시연 행 정리 |
| 11 | 새 가상 계정에 사건 1건 남기고 회원탈퇴 | 회원 DELETE·FK CASCADE·기존 JWT 거부 |
| 12 | queries.js의 실제 SQL과 전체 호출 관계 설명 | client httpApi.js → routes → controllers → pool.execute(SQL, [값]) |
| 13 | 검증 범위 보고 | macOS 실측 PASS와 Windows 실측 NOT TESTED 구분 |

기본 시드 계정 대신 별도 가상 계정으로 탈퇴를 시연합니다. 공개 관측 자료는 필수 회원 CRUD와 분리된 읽기 전용 테이블이며 실제 국방 관측정보가 아닙니다.
