-- Workbench: 먼저 사용할 스키마를 기본 스키마로 선택한 다음 전체 실행합니다.
-- 기본 학교 스키마는 gotham_20612입니다. 관리자 준비는 admin-bootstrap.sql을 사용합니다.
-- npm run db:init은 server/.env의 DB_NAME에 연결합니다. 여기서 다른 DB로 전환하지 않습니다.
-- CREATE TABLE IF NOT EXISTS는 기존 데이터를 보존하며, 과거의 다른 스키마를 자동 변환하지 않습니다.

CREATE TABLE IF NOT EXISTS members (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(40) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_username (username),
  UNIQUE KEY uq_members_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incidents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity ENUM('낮음', '보통', '높음', '긴급') NOT NULL DEFAULT '보통',
  location VARCHAR(20) NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('접수', '검토 중', '처리 완료') NOT NULL DEFAULT '접수',
  author_id INT UNSIGNED NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  map_x TINYINT UNSIGNED NOT NULL,
  map_y TINYINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_incidents_author (author_id),
  KEY idx_incidents_occurred (occurred_at, id),
  KEY idx_incidents_status (status),
  CONSTRAINT fk_incidents_author FOREIGN KEY (author_id)
    REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT chk_incidents_map_x CHECK (map_x BETWEEN 0 AND 100),
  CONSTRAINT chk_incidents_map_y CHECK (map_y BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 회원 탈퇴 정책: 회원의 사건은 ON DELETE CASCADE로 함께 삭제됩니다.
-- DATETIME은 UTC로 저장하며 API에서는 ISO 8601(Z), 화면에서는 한국 시간으로 표시합니다.

-- 외부 분석 자료는 수동 CRUD 사건과 분리합니다. 작성자/회원 FK가 없으며 회원 탈퇴에도 유지됩니다.
CREATE TABLE IF NOT EXISTS analysis_records (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_name VARCHAR(80) NOT NULL,
  external_id VARCHAR(100) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  dataset_url VARCHAR(1000) NOT NULL,
  source_license VARCHAR(255) NOT NULL,
  contributor VARCHAR(120) NOT NULL DEFAULT '',
  is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  title VARCHAR(150) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity ENUM('낮음', '보통', '높음', '긴급') NOT NULL,
  sector VARCHAR(20) NOT NULL,
  map_x DECIMAL(7,4) NOT NULL,
  map_y DECIMAL(7,4) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('접수', '검토 중', '처리 완료') NOT NULL DEFAULT '접수',
  occurred_at DATETIME(3) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(11,7) NULL,
  magnitude DECIMAL(5,2) NULL,
  collected_at DATETIME(3) NOT NULL,
  imported_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_analysis_source_external (source_name, external_id),
  KEY idx_analysis_occurred (occurred_at, id),
  KEY idx_analysis_synthetic (is_synthetic),
  CONSTRAINT chk_analysis_map_x CHECK (map_x BETWEEN 0 AND 100),
  CONSTRAINT chk_analysis_map_y CHECK (map_y BETWEEN 0 AND 100),
  CONSTRAINT chk_analysis_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_analysis_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
