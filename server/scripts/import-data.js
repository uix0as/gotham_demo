import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pool } from '../db.js';
import { requireDatabaseSettings } from '../config.js';
import { USGS_FEED, parseGeoJson, parseCsv, importAnalysisRecords } from '../analysis-data.js';

const projectDirectory = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

try {
  requireDatabaseSettings();
  const allowed = ['--file', '--limit', '--refresh-usgs'];
  for (let i = 0; i < args.length; i += 1) {
    if (!allowed.includes(args[i])) throw new Error(`알 수 없는 옵션: ${args[i]}`);
    if (args[i] !== '--refresh-usgs') { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${args[i]} 값이 필요합니다.`); i += 1; }
  }
  const file = resolve(projectDirectory, option('--file') || 'data/usgs-earthquakes.geojson');
  const manifestFile = basename(file) === 'usgs-earthquakes.geojson' ? resolve(dirname(file), 'usgs-source.json') : `${file}.source.json`;
  const limit = Number(option('--limit') || (extname(file).toLowerCase() === '.csv' ? 10000 : 1000));
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('--limit은 1~10000 정수여야 합니다.');
  if (args.includes('--refresh-usgs')) {
    if (extname(file).toLowerCase() === '.csv') throw new Error('--refresh-usgs는 GeoJSON 파일에만 사용할 수 있습니다.');
    const response = await fetch(USGS_FEED, { signal: AbortSignal.timeout(30000), headers: { Accept: 'application/geo+json,application/json' } });
    if (!response.ok) throw new Error(`USGS 수집 실패: HTTP ${response.status}`);
    const received = await response.text();
    if (Buffer.byteLength(received) > 50 * 1024 * 1024) throw new Error('USGS 응답이 50MB를 초과했습니다.');
    // DB에 넣기 전 구조와 레코드를 검사한 뒤 오프라인 재현용 원본으로 저장합니다.
    const document = JSON.parse(received);
    parseGeoJson(document, { limit });
    const feedCount = document.features.length;
    document.features.sort((a, b) => (b.properties?.time || 0) - (a.properties?.time || 0));
    document.features = document.features.slice(0, limit);
    document.metadata = { ...document.metadata, count: document.features.length, original_count: feedCount,
      snapshot_note: `Latest ${document.features.length} features retained; per-feature source fields unchanged.` };
    const text = `${JSON.stringify(document)}\n`;
    const manifest = {
      source: 'U.S. Geological Survey / contributing seismic networks', source_url: USGS_FEED,
      format_documentation: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      terms_url: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
      retrieved_at: new Date().toISOString(), http_status: response.status, feed_generated_ms: document.metadata.generated,
      feed_records: feedCount, included_records: document.features.length, selection: `Latest ${document.features.length} features by properties.time`,
      sha256: createHash('sha256').update(text).digest('hex'),
      attribution: 'Credit: U.S. Geological Survey and the net/source contributors identified in each event. USGS-produced data is public domain; third-party notices remain applicable.',
      is_synthetic: false,
    };
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  const info = await stat(file);
  if (info.size > 50 * 1024 * 1024) throw new Error('입력 파일은 50MB 이하여야 합니다.');
  const text = await readFile(file, 'utf8');
  let collectedAt = info.mtime;
  if (extname(file).toLowerCase() !== '.csv') {
    let manifest;
    try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (manifest) {
      if (manifest.sha256 && createHash('sha256').update(text).digest('hex') !== manifest.sha256) throw new Error('원본 스냅샷과 출처 manifest SHA-256이 다릅니다. 원본을 복원하거나 --refresh-usgs로 함께 갱신하세요.');
      const retrievedAt = new Date(manifest.retrieved_at);
      if (!Number.isFinite(retrievedAt.getTime())) throw new Error('출처 manifest의 retrieved_at이 올바르지 않습니다.');
      collectedAt = retrievedAt;
    }
  }
  const options = { limit, collectedAt };
  const records = extname(file).toLowerCase() === '.csv' ? parseCsv(text, options) : parseGeoJson(JSON.parse(text), options);
  const result = await importAnalysisRecords(records);
  console.log(`분석 자료 MySQL 저장 완료: ${JSON.stringify(result)}`);
  console.log(`원본: ${file}. 이후 화면 조회는 외부 API에 접속하지 않습니다.`);
} catch (error) {
  console.error(error.code ? `분석 자료 가져오기 실패 (${error.code}). 파일과 DB 설정을 확인하세요.` : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
