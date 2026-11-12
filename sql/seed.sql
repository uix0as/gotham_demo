-- Workbench: schema.sql을 실행한 같은 기본 스키마에서 전체 실행합니다.
-- 가상 회원 2명 / 가상 훈련 사건 18건 / 분석 기록 4건만 추가합니다. 실제 개인정보가 아닙니다.
-- 두 계정의 최초 로그인 비밀번호: demo1234 (공개 시연 전용). 아래는 bcrypt 해시입니다.
-- 기존 계정·비밀번호·사건을 수정하거나 삭제하지 않습니다. 같은 시드는 중복 삽입하지 않습니다.
-- 기존 회원이 같은 아이디 또는 이메일을 사용하면 해당 회원을 덮어쓰지 않고 건너뜁니다.
-- 마지막 확인 SELECT에서 정확한 시연 계정 2개 / 사건 18개를 확인하세요. 충돌은 npm run db:seed로 진단합니다.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';
START TRANSACTION;

INSERT INTO members (username,email,password_hash)
SELECT '알파 관제관','alpha@demo.local','$2b$10$bg6GUG8FKLwTwLEG3gJjk.FxdxOaifwKTIBMiCpMvXf/byWdW5JQO'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE username='알파 관제관' OR email='alpha@demo.local');

INSERT INTO members (username,email,password_hash)
SELECT '브라보 분석관','bravo@demo.local','$2b$10$bg6GUG8FKLwTwLEG3gJjk.FxdxOaifwKTIBMiCpMvXf/byWdW5JQO'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE username='브라보 분석관' OR email='bravo@demo.local');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 01] A-2 통신 장애','통신 장애','높음','A-2','훈련 상황보고',35,60,'[가상 훈련] 가상 통신 중계기 R-07 연결 장애. 중앙 기동구역 통신 점검 요청.','접수','2026-11-08 05:20:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 01] A-2 통신 장애');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 02] A-2 강풍 관측','강풍 관측','높음','A-2','가상 기상센서',42,66,'[가상 훈련] 가상 기상센서 WX-12 순간 풍속 관측. 임시 안테나 상태 확인 필요.','검토 중','2026-11-08 05:25:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 02] A-2 강풍 관측');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 03] B-1 전원 이상','전원 이상','긴급','B-1','가상 장비센서',46,30,'[가상 훈련] 가상 발전기 PG-2 출력 변동 감지. 예비 전원 전환 기록.','접수','2026-11-08 05:30:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 03] B-1 전원 이상');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 04] A-2 센서 연결 오류','센서 연결 오류','보통','A-2','가상 장비센서',39,72,'[가상 훈련] 가상 감지센서 GS-03 하트비트 누락. 링크 재연결 시도 중.','접수','2026-11-08 05:41:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 04] A-2 센서 연결 오류');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 05] B-1 장비 점검','장비 점검','보통','B-1','훈련 상황보고',52,24,'[가상 훈련] 가상 발전기 및 배전반 점검 착수. 가상 연료 필터 교체 예정.','검토 중','2026-11-08 05:52:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 05] B-1 장비 점검');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 06] A-2 통신 복구','통신 복구','낮음','A-2','훈련 상황보고',36,62,'[가상 훈련] 가상 예비 중계기 전환으로 통신 복구 완료. 신호 품질 양호.','처리 완료','2026-11-08 06:05:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 06] A-2 통신 복구');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 07] C-3 레이더 신호 감쇠','레이더 신호 감쇠','높음','C-3','가상 레이더',78,70,'[가상 훈련] 가상 레이더 RD-5 반사 신호 저하. 모의 탐지 범위 점검.','처리 완료','2026-11-08 00:10:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 07] C-3 레이더 신호 감쇠');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 08] C-3 시정 악화','시정 악화','보통','C-3','가상 기상센서',84,64,'[가상 훈련] 가상 기상센서 WX-21 안개 관측. 모의 훈련 시정 점검.','처리 완료','2026-11-08 00:22:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 08] C-3 시정 악화');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 09] C-3 장비 점검','장비 점검','낮음','C-3','훈련 상황보고',80,76,'[가상 훈련] 가상 RD-5 레이돔 결로 확인 및 모의 제습 조치 완료.','처리 완료','2026-11-08 00:35:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 09] C-3 장비 점검');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 10] A-1 센서 연결 오류','센서 연결 오류','보통','A-1','가상 장비센서',14,22,'[가상 훈련] 가상 광학 관측센서 OP-1 영상 스트림 단절. 가상 전원 정상.','검토 중','2026-11-08 02:05:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 10] A-1 센서 연결 오류');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 11] A-1 통신 장애','통신 장애','높음','A-1','훈련 상황보고',18,30,'[가상 훈련] 가상 관측소 데이터 회선 간헐적 단절 보고. 모의 회선 확인 요청.','접수','2026-11-08 02:48:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 11] A-1 통신 장애');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 12] B-2 레이더 신호 감쇠','레이더 신호 감쇠','높음','B-2','가상 레이더',82,20,'[가상 훈련] 가상 RD-2 북동 구간 잡음 증가. 모의 장비 상태 확인.','검토 중','2026-11-08 03:30:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 12] B-2 레이더 신호 감쇠');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 13] B-2 강풍 관측','강풍 관측','보통','B-2','가상 기상센서',88,28,'[가상 훈련] 가상 WX-08 돌풍 관측. 가상 레이더 회전부 점검 필요.','접수','2026-11-08 03:38:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 13] B-2 강풍 관측');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 14] C-1 전원 이상','전원 이상','보통','C-1','가상 장비센서',12,70,'[가상 훈련] 가상 컨테이너 전원 순간 차단 후 모의 자동 복귀 확인.','처리 완료','2026-11-08 04:15:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 14] C-1 전원 이상');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 15] C-1 장비 점검','장비 점검','낮음','C-1','훈련 상황보고',16,82,'[가상 훈련] 가상 보급 차량 정기 점검 일정 등록. 모의 점검 특이사항 없음.','접수','2026-11-08 07:40:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 15] C-1 장비 점검');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 16] B-1 통신 장애','통신 장애','보통','B-1','훈련 상황보고',40,16,'[가상 훈련] 가상 지휘망 데이터 링크 지연 발생. 모의 라우팅 확인.','처리 완료','2026-11-07 23:10:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 16] B-1 통신 장애');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 17] B-1 통신 복구','통신 복구','낮음','B-1','가상 장비센서',44,18,'[가상 훈련] 가상 링크 라우팅 재설정 후 모의 지연 정상화 확인.','처리 완료','2026-11-07 23:34:00',m.id
FROM members AS m
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 17] B-1 통신 복구');

INSERT INTO incidents (title,category,severity,location,source_type,map_x,map_y,description,status,occurred_at,author_id)
SELECT '[가상 훈련 18] A-2 강풍 관측','강풍 관측','높음','A-2','가상 기상센서',50,84,'[가상 훈련] 가상 WX-14 풍속 관측 지속. 모의 훈련로 이동 주의 안내.','접수','2026-11-08 06:20:00',m.id
FROM members AS m
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM incidents AS i WHERE i.author_id=m.id AND i.title='[가상 훈련 18] A-2 강풍 관측');

-- 시연 분석 기록 4건 (analysis_notes). 같은 작성자·제목이 있으면 건너뜁니다.
INSERT INTO analysis_notes (incident_id,author_id,title,assessment,confidence,content)
SELECT i.id,m.id,'A-2 통신 장애와 강풍의 시간 근접','주의','보통','통신 장애(14:20) 5분 뒤 같은 구역에서 강풍이 관측됨. 임시 안테나 고정 상태 확인 필요. 인과관계는 확인되지 않음.'
FROM members AS m INNER JOIN incidents AS i ON i.title='[가상 훈련 02] A-2 강풍 관측'
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM analysis_notes AS n WHERE n.author_id=m.id AND n.title='A-2 통신 장애와 강풍의 시간 근접')
LIMIT 1;

INSERT INTO analysis_notes (incident_id,author_id,title,assessment,confidence,content)
SELECT i.id,m.id,'중계기 R-07 장애 원인 후보','관찰','낮음','장비 자체 결함과 기상 영향 두 가지 후보. 예비 중계기 전환(15:05) 이후 복구된 점으로 보아 일시적 장애 가능성.'
FROM members AS m INNER JOIN incidents AS i ON i.title='[가상 훈련 01] A-2 통신 장애'
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM analysis_notes AS n WHERE n.author_id=m.id AND n.title='중계기 R-07 장애 원인 후보')
LIMIT 1;

INSERT INTO analysis_notes (incident_id,author_id,title,assessment,confidence,content)
SELECT i.id,m.id,'B-1 발전기 출력 변동 재발 위험','위험','높음','PG-2 출력 변동 후 22분 뒤 점검 착수. 연료 필터 교체 전까지 재발 가능성이 높음. 예비 전원 유지 권고.'
FROM members AS m INNER JOIN incidents AS i ON i.title='[가상 훈련 03] B-1 전원 이상'
WHERE m.username='알파 관제관' AND m.email='alpha@demo.local'
  AND NOT EXISTS (SELECT 1 FROM analysis_notes AS n WHERE n.author_id=m.id AND n.title='B-1 발전기 출력 변동 재발 위험')
LIMIT 1;

INSERT INTO analysis_notes (incident_id,author_id,title,assessment,confidence,content)
SELECT i.id,m.id,'B-2 레이더 잡음과 돌풍','주의','보통','RD-2 잡음 증가 8분 뒤 돌풍 관측. 회전부 점검 결과를 받은 뒤 상태 재평가.'
FROM members AS m INNER JOIN incidents AS i ON i.title='[가상 훈련 12] B-2 레이더 신호 감쇠'
WHERE m.username='브라보 분석관' AND m.email='bravo@demo.local'
  AND NOT EXISTS (SELECT 1 FROM analysis_notes AS n WHERE n.author_id=m.id AND n.title='B-2 레이더 잡음과 돌풍')
LIMIT 1;

COMMIT;
SELECT id,username,email FROM members WHERE (username='알파 관제관' AND email='alpha@demo.local') OR (username='브라보 분석관' AND email='bravo@demo.local');
SELECT COUNT(*) AS demo_incidents FROM incidents i INNER JOIN members m ON i.author_id=m.id WHERE i.title LIKE '[가상 훈련 %]%' AND ((m.username='알파 관제관' AND m.email='alpha@demo.local') OR (m.username='브라보 분석관' AND m.email='bravo@demo.local'));
