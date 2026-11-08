import { pool } from './db.js';

// DB의 명확한 컬럼 이름을 기존 프론트 화면 이름에 대응시킵니다.
const memberColumns = 'id, id AS member_id, username, username AS nickname, email, created_at, updated_at';
const incidentColumns = `id, id AS event_id, author_id, author_id AS member_id,
  title, category, category AS event_type, severity, location, location AS sector,
  source_type, map_x, map_y, description, status, occurred_at, created_at, updated_at`;

export async function createMember({ nickname, email, passwordHash }) {
  // 회원 CREATE — 회원가입 버튼
  const [result] = await pool.execute(
    'INSERT INTO members (username, email, password_hash) VALUES (?, ?, ?)',
    [nickname, email, passwordHash],
  );
  return result.insertId;
}

export async function findMemberById(id) {
  // 회원 READ — 로그인 상태 복원 및 마이페이지
  const [rows] = await pool.execute(`SELECT ${memberColumns} FROM members WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function findMemberForLogin(email) {
  // 회원 READ — 로그인 전용; password_hash는 서버 안에서만 비교합니다.
  const [rows] = await pool.execute('SELECT id, password_hash FROM members WHERE email = ?', [email]);
  return rows[0] || null;
}

export async function updateMember(id, { nickname, email }) {
  // 회원 UPDATE — 마이페이지 저장 버튼, 인증된 자신의 ID만 사용
  const [result] = await pool.execute(
    'UPDATE members SET username = ?, email = ? WHERE id = ?',
    [nickname, email, id],
  );
  return result.affectedRows;
}

export async function deleteMember(id) {
  // 회원 DELETE — 회원 탈퇴 버튼; FK ON DELETE CASCADE로 작성 사건도 삭제
  const [result] = await pool.execute('DELETE FROM members WHERE id = ?', [id]);
  return result.affectedRows;
}

export async function listIncidents() {
  // 사건 READ — 공개 목록, 대시보드, 지도, 관계망의 원본
  const [rows] = await pool.execute(`SELECT ${incidentColumns} FROM incidents ORDER BY occurred_at DESC, id DESC`);
  return rows;
}

export async function findIncident(id) {
  // 사건 READ — 상세 패널 및 수정/삭제 전 작성자 확인
  const [rows] = await pool.execute(`SELECT ${incidentColumns} FROM incidents WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function createIncident(authorId, incident) {
  const { title, event_type, severity, sector, source_type, map_x, map_y, description, status, occurred_at } = incident;
  // 사건 CREATE — 사건 등록 / 가상 사건 생성 버튼, authorId는 JWT에서 결정
  const [result] = await pool.execute(
    `INSERT INTO incidents
      (title, category, severity, location, source_type, map_x, map_y, description, status, occurred_at, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, event_type, severity, sector, source_type, map_x, map_y, description, status, occurred_at, authorId],
  );
  return result.insertId;
}

export async function updateIncident(id, authorId, incident) {
  const { title, event_type, severity, sector, source_type, map_x, map_y, description, status, occurred_at } = incident;
  // 사건 UPDATE — 사건 수정 버튼; WHERE의 사건 ID와 작성자 ID로 권한 이중 확인
  const [result] = await pool.execute(
    `UPDATE incidents
     SET title = ?, category = ?, severity = ?, location = ?, source_type = ?,
         map_x = ?, map_y = ?, description = ?, status = ?, occurred_at = ?
     WHERE id = ? AND author_id = ?`,
    [title, event_type, severity, sector, source_type, map_x, map_y, description, status, occurred_at, id, authorId],
  );
  return result.affectedRows;
}

export async function deleteIncident(id, authorId) {
  // 사건 DELETE — 사건 삭제 확인 버튼; 타인의 사건은 SQL에서도 삭제 불가
  const [result] = await pool.execute('DELETE FROM incidents WHERE id = ? AND author_id = ?', [id, authorId]);
  return result.affectedRows;
}

export async function listIncidentsWithAuthors() {
  // JOIN 조회 — 사건·작성자 통합 분석 메뉴 (브라우저 배열 결합이 아님)
  const [rows] = await pool.execute(
    `SELECT i.id, i.id AS event_id, i.author_id, i.author_id AS member_id,
       i.title, i.category, i.category AS event_type, i.severity,
       i.location, i.location AS sector, i.source_type, i.map_x, i.map_y,
       i.description, i.status, i.occurred_at, i.created_at, i.updated_at,
       m.username, m.username AS nickname, m.email
     FROM incidents AS i
     INNER JOIN members AS m ON i.author_id = m.id
     ORDER BY i.occurred_at DESC, i.id DESC`,
  );
  return rows;
}
