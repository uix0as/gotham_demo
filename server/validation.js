import { ApiError, validationError } from './errors.js';

const statuses = ['접수', '검토 중', '처리 완료'];
const severities = ['낮음', '보통', '높음', '긴급'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'JSON 객체를 전송해 주세요.');
  }
  return body;
}

function trimmed(value) { return typeof value === 'string' ? value.trim() : ''; }

export function validateMember(body, { signup = false } = {}) {
  bodyObject(body);
  const errors = {};
  const nickname = trimmed(body.nickname);
  if (!/^[가-힣a-zA-Z0-9_\-\s]{2,20}$/.test(nickname)) errors.nickname = '아이디는 한글, 영문, 숫자, 공백, -, _로 2~20자 입력해 주세요.';
  const output = { nickname };
  if (signup || body.email !== undefined) {
    const email = trimmed(body.email).toLowerCase();
    if (email.length > 255 || !emailPattern.test(email)) errors.email = '올바른 이메일을 입력해 주세요.';
    output.email = email;
  }
  if (signup) {
    const p = body.password;
    if (typeof p !== 'string' || p.length < 8 || p.length > 64 || Buffer.byteLength(p, 'utf8') > 72 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
      errors.password = '비밀번호는 영문과 숫자를 포함해 8~64자, UTF-8 72바이트 이하로 입력해 주세요.';
    }
    output.password = p;
  }
  validationError(errors);
  return output;
}

export function validateLogin(body) {
  bodyObject(body);
  const email = trimmed(body.email).toLowerCase();
  const password = body.password;
  validationError({
    ...(!emailPattern.test(email) || email.length > 255 ? { email: '올바른 이메일을 입력해 주세요.' } : {}),
    ...(typeof password !== 'string' || !password || password.length > 64 || Buffer.byteLength(password || '', 'utf8') > 72 ? { password: '비밀번호를 확인해 주세요.' } : {}),
  });
  return { email, password };
}

export function eventId(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) {
    throw new ApiError(400, 'VALIDATION_ERROR', '사건 ID는 양의 정수여야 합니다.');
  }
  return Number(value);
}

export function validateIncident(body, partial = false) {
  bodyObject(body);
  const output = {};
  const errors = {};
  for (const [field, min, max] of [['title', 1, 150], ['event_type', 1, 50], ['sector', 1, 20], ['source_type', 1, 30], ['description', 5, 1000]]) {
    if (partial && body[field] === undefined) continue;
    const value = trimmed(body[field]);
    if (value.length < min || value.length > max) errors[field] = `${field}: ${min}~${max}자로 입력해 주세요.`;
    output[field] = value;
  }
  for (const [field, choices] of [['status', statuses], ['severity', severities]]) {
    if (partial && body[field] === undefined) continue;
    if (!choices.includes(body[field])) errors[field] = `${choices.join(', ')} 중 선택해 주세요.`;
    output[field] = body[field];
  }
  for (const field of ['map_x', 'map_y']) {
    if (partial && body[field] === undefined) continue;
    if (!Number.isInteger(body[field]) || body[field] < 0 || body[field] > 100) errors[field] = '좌표는 0~100 사이 정수여야 합니다.';
    output[field] = body[field];
  }
  if (!partial || body.occurred_at !== undefined) {
    const value = body.occurred_at;
    // 날짜를 모호하게 해석하지 않도록 시간대가 있는 ISO 8601만 받습니다.
    const iso = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
    const parts = iso ? value.slice(0, 19).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/) : null;
    const calendar = parts ? new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))) : null;
    const calendarValid = parts && calendar.getUTCFullYear() === Number(parts[1]) && calendar.getUTCMonth() === Number(parts[2]) - 1 && calendar.getUTCDate() === Number(parts[3]) && Number(parts[4]) < 24 && Number(parts[5]) < 60 && Number(parts[6] || 0) < 60;
    const date = iso ? new Date(value) : new Date(NaN);
    if (!calendarValid || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) errors.occurred_at = '시간대가 포함된 올바른 발생 일시를 입력해 주세요.';
    output.occurred_at = date;
  }
  if (partial && !Object.keys(output).length) errors.form = '수정할 사건 정보를 입력해 주세요.';
  validationError(errors);
  return output;
}

const assessments = ['관찰', '주의', '위험'];
const confidences = ['낮음', '보통', '높음'];

export function recordId(value, label = 'ID') {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${label}는 양의 정수여야 합니다.`);
  }
  return Number(value);
}

export function validateNote(body, partial = false) {
  bodyObject(body);
  const output = {};
  const errors = {};
  if (!partial || body.incident_id !== undefined) {
    if (!Number.isInteger(body.incident_id) || body.incident_id < 1) errors.incident_id = '대상 사건을 선택해 주세요.';
    output.incident_id = body.incident_id;
  }
  for (const [field, min, max] of [['title', 1, 150], ['content', 5, 2000]]) {
    if (partial && body[field] === undefined) continue;
    const value = trimmed(body[field]);
    if (value.length < min || value.length > max) errors[field] = `${min}~${max}자로 입력해 주세요.`;
    output[field] = value;
  }
  for (const [field, choices] of [['assessment', assessments], ['confidence', confidences]]) {
    if (partial && body[field] === undefined) continue;
    if (!choices.includes(body[field])) errors[field] = `${choices.join(', ')} 중 선택해 주세요.`;
    output[field] = body[field];
  }
  if (partial && !Object.keys(output).length) errors.form = '수정할 분석 기록 정보를 입력해 주세요.';
  validationError(errors);
  return output;
}
