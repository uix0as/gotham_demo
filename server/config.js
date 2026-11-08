import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// 실행한 현재 폴더에 상관없이 server/.env를 읽습니다.
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });

export function requireDatabaseSettings() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`server/.env 설정이 필요합니다: ${missing.join(', ')}`);
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT는 1~65535 정수여야 합니다.');
}

export function requireSettings() {
  requireDatabaseSettings();
  if (!process.env.JWT_SECRET) throw new Error('server/.env 설정이 필요합니다: JWT_SECRET');
  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('REPLACE_')) {
    throw new Error('JWT_SECRET을 무작위 32자 이상 문자열로 설정하세요.');
  }
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 정수여야 합니다.');
}

export const config = {
  port: Number(process.env.PORT || 5000),
  origins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
  secureCookie: process.env.COOKIE_SECURE === 'true',
  jwtSecret: process.env.JWT_SECRET,
};
