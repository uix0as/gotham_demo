// npm run dev 전에 실행되는 사전 점검: server/.env, MySQL 접속, 테이블, API 포트를 확인합니다.
// 문제가 있으면 원인과 해결 방법을 한 번에 출력하고 종료 코드 1로 끝납니다.
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { config, requireSettings } from '../config.js';
import { pool } from '../db.js';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const tables = ['members', 'incidents', 'analysis_notes', 'analysis_records'];
const hints = {
  ECONNREFUSED: 'MySQL Server가 실행 중이 아닙니다. 서비스(MySQL80 등)를 시작하고 DB_HOST / DB_PORT를 확인하세요.',
  ER_ACCESS_DENIED_ERROR: 'DB_USER / DB_PASSWORD가 틀렸습니다. Workbench에서 20612 계정으로 접속되는 비밀번호를 server/.env에 넣으세요.',
  ER_BAD_DB_ERROR: 'DB_NAME 데이터베이스가 없습니다. sql/admin-bootstrap.sql을 root로 실행하세요.',
  ETIMEDOUT: 'MySQL 서버에 연결 시간이 초과되었습니다. 주소·포트·방화벽을 확인하세요.',
};

function fail(title, fix) {
  console.error(`\n[사전 점검 실패] ${title}\n해결: ${fix}\n자세한 순서: WINDOWS_SETUP.md\n`);
  process.exitCode = 1;
}

function portFree(port) {
  return new Promise((resolve) => {
    const probe = createServer().once('error', () => resolve(false)).once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

async function main() {
  if (!existsSync(envPath)) {
    return fail('server/.env 파일이 없습니다.', 'PowerShell에서 Copy-Item server\\.env.example server\\.env 후 notepad server\\.env로 DB_PASSWORD와 JWT_SECRET을 입력하세요.');
  }
  try { requireSettings(); } catch (error) { return fail(error.message, 'server/.env의 값을 확인하세요. JWT_SECRET은 node -e "console.log(require(\'node:crypto\').randomBytes(48).toString(\'hex\'))" 출력값을 사용합니다.'); }
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    return fail(`MySQL 연결 실패 (${error.code || error.message})`, hints[error.code] ?? 'server/.env의 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME을 확인하세요.');
  }
  const [rows] = await pool.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
  const missing = tables.filter((name) => !rows.some((row) => row.name === name));
  if (missing.length) return fail(`테이블이 없습니다: ${missing.join(', ')}`, 'npm run db:init 또는 Workbench에서 sql/schema.sql을 실행하세요. (기존 데이터는 유지됩니다)');
  if (!(await portFree(config.port))) {
    return fail(`API 포트 ${config.port}을(를) 다른 프로그램이 사용 중입니다.`, `이미 켜 둔 서버를 끄거나, server/.env의 PORT와 client/.env.local의 API_PROXY_TARGET을 같은 다른 포트(예: 5001)로 바꾸세요. macOS는 AirPlay 수신 모드가 5000을 사용합니다.`);
  }
  console.log(`[사전 점검 통과] MySQL ${process.env.DB_NAME} 연결 · 테이블 4개 확인 · API 포트 ${config.port} 사용 가능`);
}

try { await main(); } finally { await pool.end(); }
