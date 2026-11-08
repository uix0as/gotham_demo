import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ApiError } from '../errors.js';
import { findMemberById } from '../queries.js';

export const COOKIE_NAME = 'dnx_token';
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: config.secureCookie, path: '/' };

export function issueLogin(res, memberId) {
  const token = jwt.sign({}, config.jwtSecret, { subject: String(memberId), expiresIn: '8h', algorithm: 'HS256', issuer: 'gotham-demo' });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}

export function clearLogin(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export async function requireAuth(req, res, next) {
  const bearer = req.get('Authorization');
  let cookieToken;
  try {
    const cookie = (req.headers.cookie || '').split(';').find((part) => part.trim().startsWith(`${COOKIE_NAME}=`));
    if (cookie) cookieToken = decodeURIComponent(cookie.trim().slice(COOKIE_NAME.length + 1));
  } catch { /* 잘못 인코딩된 쿠키는 인증 실패로 처리합니다. */ }
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookieToken;
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'gotham-demo' });
  } catch {
    clearLogin(res);
    throw new ApiError(401, 'SESSION_EXPIRED', '로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
  }
  if (!payload || typeof payload === 'string' || !/^\d+$/.test(payload.sub || '')) throw new ApiError(401, 'UNAUTHORIZED', '유효하지 않은 인증입니다.');
  // 탈퇴 후 이전 JWT가 남아 있어도 회원이 없으면 모든 요청을 거절합니다.
  const member = await findMemberById(Number(payload.sub));
  if (!member) {
    clearLogin(res);
    throw new ApiError(401, 'UNAUTHORIZED', '가입된 회원 정보를 찾을 수 없습니다.');
  }
  req.member = member;
  next();
}
