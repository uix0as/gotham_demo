import { ApiError } from '../errors.js';
import { eventId } from '../validation.js';
import { listAnalysisRecords, findAnalysisRecord } from '../analysis-data.js';

export async function list(req, res) { res.json({ data: await listAnalysisRecords() }); }
export async function get(req, res) {
  const raw = String(req.params.id);
  const record = await findAnalysisRecord(eventId(raw.startsWith('-') ? raw.slice(1) : raw));
  if (!record) throw new ApiError(404, 'NOT_FOUND', '분석 자료를 찾을 수 없습니다.');
  res.json({ data: record });
}
