import { parse } from 'csv-parse/sync';
import { pool } from './db.js';

export const USGS_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
const sourceName = 'USGS 지진 관측';
const sectors = [
  ['A-1', [[0, 0], [27, 0], [26, 22], [29, 50], [0, 47]]],
  ['B-1', [[27, 0], [66, 0], [68, 45], [57, 48], [29, 50], [26, 22]]],
  ['B-2', [[66, 0], [100, 0], [100, 49], [68, 45]]],
  ['C-1', [[0, 47], [29, 50], [31, 76], [30, 100], [0, 100]]],
  ['A-2', [[29, 50], [57, 48], [60, 72], [60, 100], [30, 100], [31, 76]]],
  ['C-3', [[57, 48], [68, 45], [100, 49], [100, 100], [60, 100], [60, 72]]],
];

function contains(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function normalizedLocation(latitude, longitude) {
  const map_x = Number((((longitude + 180) / 360) * 100).toFixed(4));
  const map_y = Number((((90 - latitude) / 180) * 100).toFixed(4));
  // 기존 UI의 완전 가상 다각형에 투영한 표시 구역이며 실제 행정/군사 구역이 아닙니다.
  const sector = sectors.find(([, polygon]) => contains(map_x, map_y, polygon))?.[0] || (map_x < 30 ? (map_y < 50 ? 'A-1' : 'C-1') : map_x < 60 ? (map_y < 50 ? 'B-1' : 'A-2') : map_y < 49 ? 'B-2' : 'C-3');
  return { map_x, map_y, sector };
}

function requiredString(value, field, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new Error(`${field}: 1~${maximum}자의 문자열이 필요합니다.`);
  return value.trim();
}

function validDate(value, field) {
  if (!(value instanceof Date) && (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value))) throw new Error(`${field}: 시간대가 포함된 ISO 8601이 필요합니다.`);
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) throw new Error(`${field}: 날짜를 확인하세요.`);
  if (typeof value === 'string') {
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    const calendar = parts ? new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))) : null;
    if (!parts || calendar.getUTCFullYear() !== Number(parts[1]) || calendar.getUTCMonth() !== Number(parts[2]) - 1 || calendar.getUTCDate() !== Number(parts[3]) || Number(parts[4]) > 23 || Number(parts[5]) > 59 || Number(parts[6] || 0) > 59) throw new Error(`${field}: 실제 달력 날짜와 시간을 입력하세요.`);
  }
  return date;
}

export function validateAnalysisRecord(raw) {
  const output = {};
  for (const [key, max] of [['source_name', 80], ['external_id', 100], ['source_url', 1000], ['dataset_url', 1000], ['source_license', 255], ['title', 150], ['event_type', 50], ['sector', 20], ['description', 10000]]) output[key] = requiredString(raw[key], key, max);
  for (const key of ['source_url', 'dataset_url']) {
    let url; try { url = new URL(output[key]); } catch { throw new Error(`${key}: 올바른 출처 URL이 필요합니다.`); }
    if (url.protocol !== 'https:') throw new Error(`${key}: HTTPS 출처 URL이 필요합니다.`);
  }
  output.contributor = typeof raw.contributor === 'string' ? raw.contributor.trim().slice(0, 120) : '';
  if (raw.is_synthetic !== true && raw.is_synthetic !== false) throw new Error('is_synthetic: 합성 여부를 true 또는 false로 명시하세요.');
  output.is_synthetic = raw.is_synthetic;
  if (!['낮음', '보통', '높음', '긴급'].includes(raw.severity)) throw new Error('severity: 낮음, 보통, 높음, 긴급 중 선택하세요.');
  output.severity = raw.severity;
  if (!['접수', '검토 중', '처리 완료'].includes(raw.status)) throw new Error('status: 허용된 상태를 입력하세요.');
  output.status = raw.status;
  for (const key of ['map_x', 'map_y']) {
    if (!Number.isFinite(raw[key]) || raw[key] < 0 || raw[key] > 100) throw new Error(`${key}: 0~100 사이 숫자가 필요합니다.`);
    output[key] = raw[key];
  }
  for (const [key, min, max] of [['latitude', -90, 90], ['longitude', -180, 180], ['magnitude', -10, 20]]) {
    const value = raw[key] ?? null;
    if (value !== null && (!Number.isFinite(value) || value < min || value > max)) throw new Error(`${key}: ${min}~${max} 사이 숫자 또는 빈 값이 필요합니다.`);
    output[key] = value;
  }
  output.occurred_at = validDate(raw.occurred_at, 'occurred_at');
  output.collected_at = validDate(raw.collected_at, 'collected_at');
  return output;
}

export function parseGeoJson(document, { limit = 1000, collectedAt = new Date() } = {}) {
  if (document?.type !== 'FeatureCollection' || !Array.isArray(document.features)) throw new Error('USGS GeoJSON FeatureCollection이 필요합니다.');
  const sorted = [...document.features].sort((a, b) => (b.properties?.time || 0) - (a.properties?.time || 0)).slice(0, limit);
  return sorted.map((feature, index) => {
    const properties = feature.properties || {};
    const coordinates = feature.geometry?.coordinates;
    if (!Array.isArray(coordinates) || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) || !Number.isFinite(properties.time)) throw new Error(`GeoJSON ${index + 1}행: 좌표/발생 일시가 없습니다.`);
    const [longitude, latitude] = coordinates;
    const magnitude = properties.mag === null ? null : Number(properties.mag);
    const isSynthetic = false;
    return validateAnalysisRecord({
      source_name: sourceName, external_id: String(feature.id || ''),
      source_url: properties.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(feature.id || '')}`,
      dataset_url: USGS_FEED, source_license: 'USGS 및 관측망 기여자 공개 데이터; 원문 이용조건 확인', contributor: properties.net || '',
      is_synthetic: isSynthetic, title: String(properties.title || `지진 M${magnitude ?? '?'} · ${properties.place || feature.id}`).slice(0, 150),
      event_type: properties.type === 'earthquake' ? '지진 관측' : properties.type === 'quarry blast' ? '채석장 발파 관측' : properties.type === 'explosion' ? '폭발 관측' : '기타 지구물리 관측', severity: magnitude >= 6 ? '긴급' : magnitude >= 5 ? '높음' : magnitude >= 3 ? '보통' : '낮음',
      ...normalizedLocation(latitude, longitude),
      description: `USGS 공개 관측 기록. 위치: ${properties.place || '원문 참조'}. 규모: ${magnitude ?? '미확정'}. 깊이: ${coordinates[2] ?? '미확정'}km. 관측망: ${properties.net || '원문 참조'}. 상태는 조회용 기본 표시이며 실제 대응 상태를 뜻하지 않습니다.`,
      status: '접수', occurred_at: new Date(properties.time), latitude, longitude, magnitude, collected_at: collectedAt,
    });
  });
}

export const CSV_REQUIRED_HEADERS = ['source_name', 'external_id', 'title', 'event_type', 'severity', 'sector', 'map_x', 'map_y', 'description', 'status', 'occurred_at', 'source_url', 'is_synthetic'];

export function parseCsv(text, { collectedAt = new Date(), limit = 10000 } = {}) {
  let headers;
  const rows = parse(text, { bom: true, skip_empty_lines: true, trim: true, columns(input) { headers = input; return input; } });
  if (!headers || CSV_REQUIRED_HEADERS.some((header) => !headers.includes(header))) throw new Error(`CSV 필수 헤더: ${CSV_REQUIRED_HEADERS.join(',')}`);
  if (!rows.length || rows.length > limit) throw new Error(`CSV는 1~${limit}개 행을 포함해야 합니다.`);
  return rows.map((row, index) => {
    try {
      if (!['true', 'false'].includes(row.is_synthetic)) throw new Error('is_synthetic에 true/false를 명시하세요.');
      const numberOrNull = (value) => value === undefined || value === '' ? null : Number(value);
      return validateAnalysisRecord({ ...row,
        dataset_url: row.dataset_url || row.source_url,
        source_license: row.source_license || '제공 CSV 데이터; 제공자 이용조건 확인',
        is_synthetic: row.is_synthetic === 'true', map_x: row.map_x === '' ? NaN : Number(row.map_x), map_y: row.map_y === '' ? NaN : Number(row.map_y),
        latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), magnitude: numberOrNull(row.magnitude),
        collected_at: row.collected_at || collectedAt,
      });
    } catch (error) { throw new Error(`CSV ${index + 2}행: ${error.message}`); }
  });
}

export async function importAnalysisRecords(records) {
  if (!Array.isArray(records) || !records.length || records.length > 10000) throw new Error('가져올 분석 자료는 1~10000개여야 합니다.');
  // 모든 행을 먼저 검증하여 잘못된 CSV가 일부만 반영되는 것을 방지합니다.
  const validated = records.map(validateAnalysisRecord);
  const connection = await pool.getConnection();
  let inserted = 0; let updated = 0; let unchanged = 0;
  try {
    await connection.beginTransaction();
    for (const row of validated) {
      // 외부 분석 데이터 CREATE/UPDATE — 출처 + 원본 ID UNIQUE 키로 재수집 중복 방지
      const [result] = await connection.execute(
        `INSERT INTO analysis_records
          (source_name,external_id,source_url,dataset_url,source_license,contributor,is_synthetic,title,event_type,severity,sector,map_x,map_y,description,status,occurred_at,latitude,longitude,magnitude,collected_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           source_url=VALUES(source_url),dataset_url=VALUES(dataset_url),source_license=VALUES(source_license),contributor=VALUES(contributor),is_synthetic=VALUES(is_synthetic),
           title=VALUES(title),event_type=VALUES(event_type),severity=VALUES(severity),sector=VALUES(sector),map_x=VALUES(map_x),map_y=VALUES(map_y),description=VALUES(description),
           status=VALUES(status),occurred_at=VALUES(occurred_at),latitude=VALUES(latitude),longitude=VALUES(longitude),magnitude=VALUES(magnitude),collected_at=VALUES(collected_at),imported_at=CURRENT_TIMESTAMP(3)`,
        [row.source_name,row.external_id,row.source_url,row.dataset_url,row.source_license,row.contributor,row.is_synthetic,row.title,row.event_type,row.severity,row.sector,row.map_x,row.map_y,row.description,row.status,row.occurred_at,row.latitude,row.longitude,row.magnitude,row.collected_at],
      );
      if (result.affectedRows === 1) inserted += 1;
      else if (result.affectedRows === 2) updated += 1;
      else unchanged += 1;
    }
    await connection.commit();
    return { attempted: validated.length, inserted, updated, unchanged };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

const analysisColumns = `id, -CAST(id AS SIGNED) AS event_id, 0 AS member_id, title,event_type,severity,sector,map_x,map_y,description,status,occurred_at,created_at,updated_at,
  source_name,source_name AS source_type,external_id,source_url,dataset_url,source_license,contributor,is_synthetic,latitude,longitude,magnitude,collected_at,imported_at,
  CASE WHEN is_synthetic = 1 THEN 'synthetic' ELSE 'external' END AS data_source`;

function normalizeRecord(row) {
  if (!row) return null;
  return { ...row, is_synthetic: Boolean(row.is_synthetic), map_x: Number(row.map_x), map_y: Number(row.map_y),
    latitude: row.latitude === null ? null : Number(row.latitude), longitude: row.longitude === null ? null : Number(row.longitude), magnitude: row.magnitude === null ? null : Number(row.magnitude) };
}

export async function listAnalysisRecords() {
  // 외부 분석 자료 READ — 대시보드/지도/관계망 전용, 회원 사건 JOIN에는 포함하지 않음
  const [rows] = await pool.execute(`SELECT ${analysisColumns} FROM analysis_records ORDER BY occurred_at DESC, id DESC`);
  return rows.map(normalizeRecord);
}

export async function findAnalysisRecord(id) {
  const [rows] = await pool.execute(`SELECT ${analysisColumns} FROM analysis_records WHERE id = ?`, [id]);
  return normalizeRecord(rows[0]);
}
