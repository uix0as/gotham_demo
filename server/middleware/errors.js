import { ApiError } from '../errors.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 'ER_DUP_ENTRY') {
    const field = String(error.sqlMessage).includes('username') ? 'nickname' : 'email';
    return res.status(409).json({ error: { code: 'CONFLICT', message: '이미 사용 중인 아이디 또는 이메일입니다.', details: { [field]: '이미 사용 중입니다.' } } });
  }
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '올바른 JSON을 전송해 주세요.' } });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'VALIDATION_ERROR', message: '요청 데이터가 너무 큽니다.' } });
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
  console.error(`API error: ${error.code || error.name || 'UNKNOWN'}`);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버에서 요청을 처리하지 못했습니다. DB 연결과 서버 로그를 확인해 주세요.' } });
}
