import { pool } from '../db.js';
import { config, requireSettings } from '../config.js';

const remedies = {
  ECONNREFUSED: 'MySQL Server 실행 여부와 DB_HOST / DB_PORT를 확인하세요. Workbench만 설치하면 서버가 없습니다.',
  ER_ACCESS_DENIED_ERROR: 'DB_USER / DB_PASSWORD 및 해당 host의 사용자 권한을 확인하세요.',
  ER_BAD_DB_ERROR: '관리자 연결에서 DB_NAME과 같은 스키마를 먼저 생성하세요.',
  ER_NO_SUCH_TABLE: '같은 스키마에서 sql/schema.sql 또는 npm run db:init을 실행하세요.',
  ETIMEDOUT: 'MySQL 서버 주소, 방화벽, 네트워크와 포트를 확인하세요.',
};

try {
  requireSettings();
  const [identity] = await pool.query('SELECT DATABASE() AS db, @@hostname AS server, @@port AS port, CURRENT_USER() AS account, VERSION() AS version');
  console.log('MySQL 연결 성공 — Workbench의 아래 SELECT 결과와 비교하세요.');
  console.log(JSON.stringify(identity[0], null, 2));
  const [counts] = await pool.query('SELECT (SELECT COUNT(*) FROM members) AS members, (SELECT COUNT(*) FROM incidents) AS incidents, (SELECT COUNT(*) FROM analysis_notes) AS analysis_notes, (SELECT COUNT(*) FROM analysis_records) AS analysis_records');
  console.log('행 수:', JSON.stringify(counts[0]));
  const [relations] = await pool.execute(`SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME = ?`, ['incidents', 'members']);
  if (!relations.some(row => row.DELETE_RULE === 'CASCADE')) throw new Error('incidents → members 외래키와 ON DELETE CASCADE를 확인하세요.');
  console.log('회원 1:N 사건 외래키 / 탈퇴 CASCADE 확인.');
  const [noteKeys] = await pool.query(`SELECT REFERENCED_TABLE_NAME AS ref, DELETE_RULE AS rule FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'analysis_notes'`);
  if (!['members', 'incidents'].every((ref) => noteKeys.some((row) => row.ref === ref && row.rule === 'CASCADE'))) throw new Error('analysis_notes → members / incidents 외래키(ON DELETE CASCADE)를 확인하세요. sql/schema.sql을 실행하세요.');
  console.log('분석 기록 → 회원·사건 외래키 / CASCADE 확인.');
  try {
    const response = await fetch(`http://127.0.0.1:${config.port}/api/health`, { signal: AbortSignal.timeout(2500) });
    const payload = await response.json();
    if (!response.ok || payload.data?.database !== identity[0].db) throw new Error('다른 DB에 연결된 서버 또는 API 오류');
    console.log(`Express ${config.port}: 같은 DB 연결 확인. 개발 화면은 http://localhost:5173 입니다.`);
  } catch {
    console.log(`Express ${config.port} 응답 미확인. npm run dev로 실행하고 다시 검사하세요. client API_PROXY_TARGET도 이 포트와 맞춰야 합니다.`);
  }
  console.log('비밀번호·JWT_SECRET은 출력하지 않았습니다.');
} catch (error) {
  console.error(`진단 실패: ${error.code || error.message}`);
  if (remedies[error.code]) console.error(remedies[error.code]);
  process.exitCode = 1;
} finally {
  await pool.end();
}
