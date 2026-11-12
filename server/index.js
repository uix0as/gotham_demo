import { config, requireSettings } from './config.js';
import { pool } from './db.js';
import { app } from './app.js';

try {
  requireSettings();
  await pool.execute('SELECT 1');
  console.log(`MySQL 연결 성공 (DB: ${process.env.DB_NAME})`);
  const [tables] = await pool.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
  const missing = ['members', 'incidents', 'analysis_notes', 'analysis_records'].filter((name) => !tables.some((row) => row.name === name));
  if (missing.length) throw new Error(`테이블이 없습니다: ${missing.join(', ')}. sql/schema.sql 또는 npm run db:init을 실행하세요. (기존 데이터는 유지됩니다)`);
  const server = app.listen(config.port, (error) => {
    if (!error) console.log(`Gotham API: http://localhost:${config.port} (DB: ${process.env.DB_NAME})`);
  });
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `${config.port} 포트가 사용 중입니다. PORT를 변경하거나 기존 서버를 종료하세요.` : `서버 시작 오류: ${error.code}`);
    pool.end().finally(() => process.exit(1));
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => pool.end().finally(() => process.exit(0))));
} catch (error) {
  console.error(error.code ? `MySQL 연결 실패 (${error.code}). server/.env와 MySQL 실행 상태를 확인하세요.` : error.message);
  await pool.end();
  process.exitCode = 1;
}
