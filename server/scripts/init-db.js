import { readFile } from 'node:fs/promises';
import { pool } from '../db.js';
import { requireDatabaseSettings } from '../config.js';

try {
  requireDatabaseSettings();
  const sql = await readFile(new URL('../../sql/schema.sql', import.meta.url), 'utf8');
  // 스키마 파일만 실행합니다. 사용자 입력이나 비밀번호를 SQL 문자열에 끼워 넣지 않습니다.
  for (const statement of sql.split(';').map((s) => s.replace(/^--.*$/gm, '').trim()).filter(Boolean)) await pool.query(statement);
  console.log(`${process.env.DB_NAME}: members / incidents / analysis_records 테이블 준비 완료 (기존 데이터 유지)`);
} catch (error) {
  console.error(`DB 초기화 실패 (${error.code || error.name}). 관리자 DB/계정 준비 및 server/.env를 확인하세요.`);
  process.exitCode = 1;
} finally { await pool.end(); }
