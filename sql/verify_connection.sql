-- Workbench에서 npm run diagnose 및 웹 API와 같은 DB인지 확인합니다.
-- 기본 학교 DB 이름을 바꿨다면 아래 USE 대상도 server/.env의 DB_NAME과 맞춥니다.
USE gotham_20612;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
SELECT DATABASE() AS db, @@hostname AS server, @@port AS port, CURRENT_USER() AS account, VERSION() AS version,
       (SELECT COUNT(*) FROM members) AS members,
       (SELECT COUNT(*) FROM incidents) AS incidents,
       (SELECT COUNT(*) FROM analysis_records) AS analysis_records;
SELECT i.id AS event_id, i.title, i.status, i.author_id AS member_id, m.username, m.email
FROM incidents AS i INNER JOIN members AS m ON i.author_id = m.id
ORDER BY i.occurred_at DESC, i.id DESC LIMIT 5;
