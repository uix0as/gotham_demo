import { ApiError } from '../errors.js';
import { eventId, validateIncident } from '../validation.js';
import * as db from '../queries.js';

async function ownedIncident(req) {
  const incident = await db.findIncident(eventId(req.params.id));
  if (!incident) throw new ApiError(404, 'NOT_FOUND', '사건을 찾을 수 없습니다.');
  if (incident.author_id !== req.member.id) throw new ApiError(403, 'FORBIDDEN', '본인이 작성한 사건만 수정·삭제할 수 있습니다.');
  return incident;
}
export async function list(req, res) { res.json({ data: await db.listIncidents() }); }
export async function listWithAuthors(req, res) { res.json({ data: await db.listIncidentsWithAuthors() }); }
export async function get(req, res) {
  const incident = await db.findIncident(eventId(req.params.id));
  if (!incident) throw new ApiError(404, 'NOT_FOUND', '사건을 찾을 수 없습니다.');
  res.json({ data: incident });
}
export async function create(req, res) {
  const input = validateIncident(req.body);
  const id = await db.createIncident(req.member.id, input);
  res.status(201).json({ data: await db.findIncident(id) });
}
export async function update(req, res) {
  const incident = await ownedIncident(req);
  const input = validateIncident(req.body, true);
  await db.updateIncident(incident.id, req.member.id, { ...incident, ...input });
  const updated = await db.findIncident(incident.id);
  if (!updated) throw new ApiError(404, 'NOT_FOUND', '사건을 찾을 수 없습니다.');
  res.json({ data: updated });
}
export async function remove(req, res) {
  const incident = await ownedIncident(req);
  const deleted = await db.deleteIncident(incident.id, req.member.id);
  if (!deleted) throw new ApiError(404, 'NOT_FOUND', '사건을 찾을 수 없습니다.');
  res.json({ data: { deleted: true, event_id: incident.id } });
}
