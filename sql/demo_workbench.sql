-- MySQL Workbench 전용 CRUD / INNER JOIN 발표 순서
-- schema.sql과 seed.sql을 적용한 동일한 기본 스키마를 선택합니다.
-- 각 번호 블록을 따로 선택해 실행하고, COMMIT 이후 웹을 새로고침합니다.
-- 전체 실행해도 이 파일에서 만든 임시 회원·사건만 정리합니다. 기본 시드/다른 회원은 삭제하지 않습니다.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

-- 1. npm run diagnose의 결과와 비교: 같은 서버 / 포트 / 스키마인가?
SELECT @@hostname AS server, @@port AS port, DATABASE() AS db, CURRENT_USER() AS account, VERSION() AS version;
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;

-- 2. 먼저 웹에서 회원가입·사건 등록 후 실행. 아래 이메일은 방금 가입한 가상 이메일로 바꿉니다.
SET @web_email = 'student.demo@example.test';
SELECT id, username, email, created_at FROM members WHERE email = @web_email;
SELECT i.id, i.title, i.status, i.occurred_at, m.username, m.email
FROM incidents AS i INNER JOIN members AS m ON i.author_id = m.id
WHERE m.email = @web_email ORDER BY i.id DESC;

-- 3. SQL로 새 가상 회원 CREATE. 공개 시연 비밀번호 demo1234의 bcrypt 해시입니다.
-- 비밀번호를 DB에서 평문으로 비교하지 않습니다. 실제 로그인은 Express의 bcrypt.compare가 수행합니다.
SET @demo_tag = LEFT(REPLACE(UUID(), '-', ''), 12);
SET @demo_name = CONCAT('wb_', @demo_tag);
SET @demo_email = CONCAT(@demo_name, '@example.test');
SET @demo_hash = '$2b$10$bg6GUG8FKLwTwLEG3gJjk.FxdxOaifwKTIBMiCpMvXf/byWdW5JQO';
START TRANSACTION;
INSERT INTO members (username, email, password_hash) VALUES (@demo_name, @demo_email, @demo_hash);
SET @demo_member_id = LAST_INSERT_ID();
COMMIT;
SELECT id, username, email FROM members WHERE id = @demo_member_id;

-- 4. 핵심 사건 CREATE. 새로 만든 회원 ID를 실제 FK로 사용합니다.
START TRANSACTION;
INSERT INTO incidents
  (title, category, severity, location, source_type, map_x, map_y, description, status, occurred_at, author_id)
VALUES
  (CONCAT('[Workbench 가상 시연] ', @demo_tag), '통신 장애', '보통', 'A-2', '훈련 상황보고', 35, 60,
   'Workbench에서 생성한 가상 훈련 상황입니다.', '접수', UTC_TIMESTAMP(3), @demo_member_id);
SET @demo_incident_id = LAST_INSERT_ID();
COMMIT;
-- 웹 상황정보 / 사건·작성자 조회를 새로고침하면 이 행이 나타납니다.
SELECT * FROM incidents WHERE id = @demo_incident_id AND author_id = @demo_member_id;

-- 5. 실제 INNER JOIN READ: 화면의 사건 ID, 작성자 아이디, 이메일과 비교합니다.
SELECT i.id AS event_id, i.title, i.category AS event_type, i.location AS sector, i.status,
       i.author_id AS member_id, m.username, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
WHERE i.id = @demo_incident_id;

-- 6. Workbench 직접 UPDATE → COMMIT → 웹 재조회로 제목과 상태 반영 확인.
START TRANSACTION;
UPDATE incidents
SET title = CONCAT('[Workbench 수정 확인] ', @demo_tag), status = '검토 중'
WHERE id = @demo_incident_id AND author_id = @demo_member_id;
UPDATE members SET username = CONCAT('wb_edit_', @demo_tag)
WHERE id = @demo_member_id AND email = @demo_email;
COMMIT;
SELECT i.id, i.title, i.status, m.username, m.email
FROM incidents i INNER JOIN members m ON i.author_id = m.id WHERE i.id = @demo_incident_id;

-- 7. Workbench 직접 DELETE → COMMIT → 웹 새로고침. 방금 만든 사건만 삭제합니다.
START TRANSACTION;
DELETE FROM incidents WHERE id = @demo_incident_id AND author_id = @demo_member_id;
COMMIT;
SELECT COUNT(*) AS remaining_demo_incidents FROM incidents WHERE id = @demo_incident_id;

-- 8. 가상 회원 DELETE 및 정리. 시연 기본 계정 alpha / bravo는 건드리지 않습니다.
START TRANSACTION;
DELETE FROM members WHERE id = @demo_member_id AND email = @demo_email;
COMMIT;
SELECT COUNT(*) AS remaining_demo_members FROM members WHERE id = @demo_member_id;
-- 회원 탈퇴의 ON DELETE CASCADE는 웹에서 별도 가입한 가상 회원에게 사건을 남긴 후 탈퇴하여 시연합니다.
-- 일반 목록과 JOIN에 비밀번호 해시는 표시하지 않습니다.
