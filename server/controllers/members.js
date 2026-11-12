import { validateMember } from '../validation.js';
import { clearLogin } from '../middleware/auth.js';
import { ApiError } from '../errors.js';
import { recordId } from '../validation.js';
import * as db from '../queries.js';

export async function updateMe(req, res) {
  const input = validateMember(req.body);
  await db.updateMember(req.member.id, { nickname: input.nickname, email: input.email ?? req.member.email });
  res.json({ data: await db.findMemberById(req.member.id) });
}
export async function deleteMe(req, res) {
  await db.deleteMember(req.member.id);
  clearLogin(res);
  res.json({ data: { deleted: true } });
}
export async function myEvents(req, res) {
  res.json({ data: await db.listMyIncidentsWithAuthor(req.member.id) });
}
export async function myNotes(req, res) {
  res.json({ data: await db.listNotesByAuthor(req.member.id) });
}
export async function list(req, res) { res.json({ data: await db.listMembers() }); }
export async function records(req, res) {
  // 회원 상세 — 회원 + 그 회원의 사건(JOIN) + 분석 기록(JOIN)
  const id = recordId(req.params.id, '회원 ID');
  const member = await db.findMemberById(id);
  if (!member) throw new ApiError(404, 'NOT_FOUND', '회원을 찾을 수 없습니다.');
  const [incidents, notes] = await Promise.all([db.listMyIncidentsWithAuthor(id), db.listNotesByAuthor(id)]);
  res.json({ data: { member, incidents, notes } });
}
