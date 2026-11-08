import bcrypt from 'bcrypt';
import { ApiError } from '../errors.js';
import { issueLogin, clearLogin } from '../middleware/auth.js';
import { validateMember, validateLogin } from '../validation.js';
import * as db from '../queries.js';

export async function signup(req, res) {
  const input = validateMember(req.body, { signup: true });
  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = await db.createMember({ ...input, passwordHash });
  res.status(201).json({ data: await db.findMemberById(id) });
}
export async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const member = await db.findMemberForLogin(email);
  const hash = member?.password_hash || '$2b$10$XCzrrro1LMmUAdlp6BRMYevDh3/L.N8ttS9qK7uFSlOwbo3gPu3/6';
  const valid = await bcrypt.compare(password, hash);
  if (!member || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
  issueLogin(res, member.id);
  res.json({ data: await db.findMemberById(member.id) });
}
export function logout(req, res) { clearLogin(res); res.json({ data: { logged_out: true } }); }
export function me(req, res) { res.json({ data: req.member }); }
