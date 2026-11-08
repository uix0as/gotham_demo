import { validateMember } from '../validation.js';
import { clearLogin } from '../middleware/auth.js';
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
