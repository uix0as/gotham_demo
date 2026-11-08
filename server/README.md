# Gotham server

별도 Node.js + Express + JavaScript ESM 서버입니다. index.js가 server/.env 검증과 SELECT 1 연결 확인 후 시작합니다. db.js는 mysql2/promise 연결 풀(limit10·UTC), queries.js는 실제 파라미터 바인딩 SQL입니다. routes → controllers → queries로 분리했습니다.

루트에서 npm run setup, server/.env 설정, sql/schema.sql·seed.sql 실행 후 npm run dev:server로 시작합니다. 기본 PORT=5000입니다. npm run diagnose로 Workbench와 같은 DB인지 확인하고 npm test로 실제 API/DB 13개 검사를 수행합니다. 테스트가 생성한 고유 가상 자료만 정리하며 기본 데이터는 보존합니다.

인증은 bcrypt + HS256 JWT·8시간 HttpOnly/SameSite=Lax 쿠키입니다. JWT_SECRET은 환경변수만 사용합니다. 인증 시 현재 회원을 DB에서 조회하고 사건 작성자 ID는 JWT 회원에서 결정합니다. 본문 작성자 위조를 무시하며 UPDATE·DELETE WHERE에서도 작성자 ID를 검사합니다. 계정 탈퇴는 FK ON DELETE CASCADE입니다.

Express는 client/dist가 있으면 정적 파일·SPA 경로를 함께 제공합니다. Next.js API Routes나 ORM에 의존하지 않습니다. API 규격은 ../docs/API_CONTRACT.md, SQL은 queries.js, Windows 안내는 ../README_SCHOOL_SETUP.md에 있습니다.
