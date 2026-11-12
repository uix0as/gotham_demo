import { ApiError } from '../errors.js';
import { recordId, validateNote } from '../validation.js';
import * as db from '../queries.js';

async function requireIncident(incidentId) {
  if (!(await db.findIncident(incidentId))) throw new ApiError(400, 'VALIDATION_ERROR', '입력값을 확인해 주세요.', { incident_id: '존재하지 않는 사건입니다.' });
}
async function ownedNote(req) {
  const note = await db.findNote(recordId(req.params.id, '분석 기록 ID'));
  if (!note) throw new ApiError(404, 'NOT_FOUND', '분석 기록을 찾을 수 없습니다.');
  if (note.author_id !== req.member.id) throw new ApiError(403, 'FORBIDDEN', '본인이 작성한 분석 기록만 수정·삭제할 수 있습니다.');
  return note;
}
export async function list(req, res) { res.json({ data: await db.listNotes() }); }
export async function get(req, res) {
  const note = await db.findNote(recordId(req.params.id, '분석 기록 ID'));
  if (!note) throw new ApiError(404, 'NOT_FOUND', '분석 기록을 찾을 수 없습니다.');
  res.json({ data: note });
}
export async function create(req, res) {
  const input = validateNote(req.body);
  await requireIncident(input.incident_id);
  const id = await db.createNote(req.member.id, input);
  res.status(201).json({ data: await db.findNote(id) });
}
export async function update(req, res) {
  const note = await ownedNote(req);
  const input = validateNote(req.body, true);
  if (input.incident_id !== undefined) await requireIncident(input.incident_id);
  await db.updateNote(note.id, req.member.id, { ...note, ...input });
  res.json({ data: await db.findNote(note.id) });
}
export async function remove(req, res) {
  const note = await ownedNote(req);
  if (!(await db.deleteNote(note.id, req.member.id))) throw new ApiError(404, 'NOT_FOUND', '분석 기록을 찾을 수 없습니다.');
  res.json({ data: { deleted: true, note_id: note.id } });
}
