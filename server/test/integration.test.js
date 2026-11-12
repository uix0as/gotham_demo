import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { pool } from '../db.js';
import { config, requireSettings } from '../config.js';
import { parseGeoJson, parseCsv, importAnalysisRecords } from '../analysis-data.js';

test('실제 MySQL: 회원·사건 CRUD, bcrypt/JWT, 권한, INNER JOIN, 탈퇴 연쇄 삭제', async (t) => {
  requireSettings();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const a = { nickname: `testA_${unique}`, email: `${unique}.a@example.test`, password: 'TestPass1234' };
  const b = { nickname: `testB_${unique}`, email: `${unique}.b@example.test`, password: 'TestPass1234' };
  let first;
  let second;
  let cookieA;
  let cookieB;
  let incident;
  let externalRecord;
  const fixtureSource = `test_source_${unique}`;
  const input = {
    title: "가상 테스트 사건 ' OR 1=1 --", severity: '높음', source_type: '훈련 상황보고', event_type: '통신 장애',
    sector: 'A-2', map_x: 35, map_y: 60, description: '가상 테스트 사건 설명입니다.', status: '접수', occurred_at: '2026-11-08T14:20:00+09:00',
  };
  async function request(path, method = 'GET', body, cookie, headers = {}) {
    const res = await fetch(`${base}${path}`, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const payload = await res.json();
    assert.equal(JSON.stringify(payload).includes('password_hash'), false, 'API 응답에 password_hash가 없어야 함');
    return { status: res.status, ...payload, cookie: res.headers.get('set-cookie')?.split(';')[0] };
  }
  try {
    await t.test('회원 CREATE: bcrypt 해시, 아이디·이메일 중복 거부', async () => {
      const result = await request('/auth/signup', 'POST', a);
      assert.equal(result.status, 201); first = result.data;
      const [rows] = await pool.execute('SELECT username, password_hash FROM members WHERE id = ?', [first.member_id]);
      assert.equal(rows[0].username, a.nickname);
      assert.match(rows[0].password_hash, /^\$2[ab]\$/);
      assert.equal(await bcrypt.compare(a.password, rows[0].password_hash), true);
      assert.equal((await request('/auth/signup', 'POST', { ...a, email: `${unique}.other@example.test` })).status, 409);
      assert.equal((await request('/auth/signup', 'POST', { ...a, nickname: `dup_${unique}` })).status, 409);
      const other = await request('/auth/signup', 'POST', b); assert.equal(other.status, 201); second = other.data;
    });
    await t.test('회원 READ: JWT 발급·검증, 로그인 실패, 프로필 SELECT', async () => {
      assert.equal((await request('/auth/login', 'POST', { email: a.email, password: 'Wrong1234' })).status, 401);
      const loginA = await request('/auth/login', 'POST', a); assert.equal(loginA.status, 200); cookieA = loginA.cookie;
      const loginB = await request('/auth/login', 'POST', b); assert.equal(loginB.status, 200); cookieB = loginB.cookie;
      const payload = jwt.verify(decodeURIComponent(cookieA.slice(cookieA.indexOf('=') + 1)), config.jwtSecret, { algorithms: ['HS256'], issuer: 'gotham-demo' });
      assert.equal(payload.sub, String(first.member_id));
      assert.equal((await request('/auth/me', 'GET', undefined, cookieA)).data.email, a.email);
      assert.equal((await request('/auth/me')).status, 401);
    });
    await t.test('회원 UPDATE: DB와 다음 조회에 수정 반영', async () => {
      const nickname = `edit_${unique}`;
      const email = `${unique}.updated@example.test`;
      const result = await request('/members/me', 'PATCH', { nickname, email }, cookieA);
      assert.equal(result.status, 200); assert.equal(result.data.nickname, nickname);
      const [rows] = await pool.execute('SELECT username,email FROM members WHERE id = ?', [first.member_id]);
      assert.deepEqual(rows[0], { username: nickname, email });
      assert.equal((await request('/auth/me', 'GET', undefined, cookieA)).data.nickname, nickname);
    });
    await t.test('사건 CREATE: JWT 작성자, SQL 문자열 바인딩, 필수 필드 저장', async () => {
      assert.equal((await request('/events', 'POST', input)).status, 401);
      const result = await request('/events', 'POST', { ...input, member_id: second.member_id, author_id: second.member_id }, cookieA);
      assert.equal(result.status, 201); incident = result.data;
      assert.equal(incident.member_id, first.member_id); assert.equal(incident.title, input.title); assert.equal(incident.severity, '높음');
      const [rows] = await pool.execute('SELECT title, author_id FROM incidents WHERE id = ?', [incident.event_id]);
      assert.equal(rows[0].title, input.title); assert.equal(rows[0].author_id, first.member_id);
    });
    await t.test('사건 READ: 비로그인 목록·상세 공개, 시간대 보존', async () => {
      assert.ok((await request('/events')).data.some((row) => row.event_id === incident.event_id));
      const detail = await request(`/events/${incident.event_id}`);
      assert.equal(detail.data.occurred_at, '2026-11-08T05:20:00.000Z');
    });
    await t.test('작성자 권한: 다른 회원 수정·삭제 및 작성자 위조 거부', async () => {
      assert.equal((await request(`/events/${incident.event_id}`, 'PATCH', { status: '처리 완료', author_id: first.member_id }, cookieB)).status, 403);
      assert.equal((await request(`/events/${incident.event_id}`, 'DELETE', undefined, cookieB)).status, 403);
      assert.equal((await request(`/events/${incident.event_id}`)).data.status, '접수');
    });
    await t.test('사건 UPDATE: 모든 필드와 변경 시각, 부분 수정', async () => {
      const next = { ...input, title: '수정한 가상 사건', severity: '긴급', event_type: '전원 이상', source_type: '가상 장비센서', sector: 'B-1', map_x: 42, map_y: 17, description: '수정된 사건 상세 설명입니다.', occurred_at: '2026-11-08T15:00:00+09:00', status: '검토 중' };
      const result = await request(`/events/${incident.event_id}`, 'PATCH', next, cookieA);
      assert.equal(result.status, 200);
      for (const field of ['title', 'severity', 'event_type', 'source_type', 'sector', 'map_x', 'map_y', 'description', 'status']) assert.equal(result.data[field], next[field]);
      assert.equal((await request(`/events/${incident.event_id}`, 'PATCH', { status: '처리 완료' }, cookieA)).data.status, '처리 완료');
      const [rows] = await pool.execute('SELECT title, severity, status FROM incidents WHERE id = ?', [incident.event_id]);
      assert.deepEqual(rows[0], { title: next.title, severity: '긴급', status: '처리 완료' });
    });
    await t.test('INNER JOIN: 사건 + 작성자 아이디·이메일, SQL 직접 비교', async () => {
      const joined = (await request('/events-with-authors')).data.find((row) => row.event_id === incident.event_id);
      const [rows] = await pool.execute('SELECT i.id,m.username,m.email FROM incidents i INNER JOIN members m ON i.author_id=m.id WHERE i.id=?', [incident.event_id]);
      assert.equal(joined.username, rows[0].username); assert.equal(joined.email, rows[0].email); assert.equal(joined.event_id, rows[0].id);
    });
    await t.test('INNER JOIN 2: 로그인 회원의 사건만 서버에서 조회', async () => {
      assert.equal((await request('/members/me/events')).status, 401);
      const otherIncident = (await request('/events', 'POST', { ...input, title: `B 회원 사건 ${unique}` }, cookieB)).data;
      const mine = (await request('/members/me/events', 'GET', undefined, cookieA)).data;
      const [rows] = await pool.execute('SELECT i.id,m.username,m.email FROM incidents i INNER JOIN members m ON i.author_id=m.id WHERE m.id=? ORDER BY i.occurred_at DESC, i.id DESC', [first.member_id]);
      assert.deepEqual(mine.map((row) => row.event_id), rows.map((row) => row.id));
      assert.ok(mine.length >= 1 && mine.every((row) => row.member_id === first.member_id && row.email === `${unique}.updated@example.test`));
      assert.equal(mine.some((row) => row.event_id === otherIncident.event_id), false);
      const theirs = (await request('/members/me/events', 'GET', undefined, cookieB)).data;
      assert.ok(theirs.some((row) => row.event_id === otherIncident.event_id) && theirs.every((row) => row.member_id === second.member_id));
      assert.equal((await request(`/events/${otherIncident.event_id}`, 'DELETE', undefined, cookieB)).status, 200);
    });
    await t.test('분석 기록 CRUD: 작성자 권한, 3테이블 JOIN, 사건 삭제 CASCADE', async () => {
      const noteInput = { incident_id: incident.event_id, title: `분석 ${unique}`, assessment: '주의', confidence: '보통', content: '테스트 분석 내용입니다.' };
      assert.equal((await request('/analysis-notes', 'POST', noteInput)).status, 401);
      assert.equal((await request('/analysis-notes', 'POST', { ...noteInput, incident_id: 4294967295 }, cookieA)).status, 400);
      assert.equal((await request('/analysis-notes', 'POST', { ...noteInput, assessment: '모름' }, cookieA)).status, 400);
      const created = await request('/analysis-notes', 'POST', { ...noteInput, author_id: second.member_id }, cookieA);
      assert.equal(created.status, 201);
      const note = created.data;
      assert.equal(note.author_id, first.member_id); assert.equal(note.incident_title, (await request(`/events/${incident.event_id}`)).data.title);
      const [rows] = await pool.execute('SELECT n.title, m.email, i.id AS incident_id FROM analysis_notes n INNER JOIN members m ON n.author_id=m.id INNER JOIN incidents i ON n.incident_id=i.id WHERE n.id=?', [note.note_id]);
      assert.deepEqual(rows[0], { title: noteInput.title, email: note.email, incident_id: incident.event_id });
      assert.ok((await request('/analysis-notes')).data.some((row) => row.note_id === note.note_id));
      assert.equal((await request(`/analysis-notes/${note.note_id}`, 'PATCH', { title: '타인 수정' }, cookieB)).status, 403);
      assert.equal((await request(`/analysis-notes/${note.note_id}`, 'DELETE', undefined, cookieB)).status, 403);
      const edited = await request(`/analysis-notes/${note.note_id}`, 'PATCH', { assessment: '위험', content: '수정된 분석 내용입니다.' }, cookieA);
      assert.equal(edited.status, 200); assert.equal(edited.data.assessment, '위험'); assert.equal(edited.data.title, noteInput.title);
      const mine = (await request('/members/me/notes', 'GET', undefined, cookieA)).data;
      assert.ok(mine.some((row) => row.note_id === note.note_id) && mine.every((row) => row.author_id === first.member_id));
      assert.equal((await request('/members/me/notes', 'GET', undefined, cookieB)).data.some((row) => row.note_id === note.note_id), false);
      assert.equal((await request('/members')).status, 401);
      const members = (await request('/members', 'GET', undefined, cookieB)).data;
      const memberA = members.find((row) => row.member_id === first.member_id);
      assert.ok(memberA.note_count >= 1 && memberA.incident_count >= 1 && !('password_hash' in memberA));
      const records = (await request(`/members/${first.member_id}/records`, 'GET', undefined, cookieB)).data;
      assert.ok(records.notes.some((row) => row.note_id === note.note_id) && records.incidents.every((row) => row.member_id === first.member_id));
      assert.equal((await request(`/analysis-notes/${note.note_id}`, 'DELETE', undefined, cookieA)).status, 200);
      assert.equal((await request(`/analysis-notes/${note.note_id}`)).status, 404);
      const temp = (await request('/events', 'POST', { ...input, title: `임시 ${unique}` }, cookieA)).data;
      const tempNote = (await request('/analysis-notes', 'POST', { ...noteInput, incident_id: temp.event_id }, cookieA)).data;
      assert.equal((await request(`/events/${temp.event_id}`, 'DELETE', undefined, cookieA)).status, 200);
      const [left] = await pool.execute('SELECT COUNT(*) AS n FROM analysis_notes WHERE id = ?', [tempNote.note_id]);
      assert.equal(left[0].n, 0);
    });
    await t.test('입력 검증: 좌표·타입·빈 수정·Origin·잘못된 JSON', async () => {
      assert.equal((await request('/events', 'POST', { ...input, map_x: 101 }, cookieA)).status, 400);
      assert.equal((await request('/events', 'POST', { ...input, title: {} }, cookieA)).status, 400);
      assert.equal((await request('/events', 'POST', { ...input, occurred_at: '2026-02-31T15:00:00+09:00' }, cookieA)).status, 400);
      assert.equal((await request(`/events/${incident.event_id}`, 'PATCH', {}, cookieA)).status, 400);
      assert.equal((await request('/auth/signup', 'POST', null)).status, 400);
      assert.equal((await request('/auth/signup', 'POST', [])).status, 400);
      assert.equal((await request('/events', 'POST', input, cookieA, { Origin: 'https://invalid.example' })).status, 403);
      assert.equal((await request('/auth/login', 'POST', b, undefined, { Origin: new URL(base).origin })).status, 200);
      const invalid = await fetch(`${base}/auth/signup`, { method: 'POST', body: '{broken', headers: { 'Content-Type': 'application/json' } });
      assert.equal(invalid.status, 400);
      assert.equal((await request('/events/1abc')).status, 400);
    });
    await t.test('사건 DELETE: SQL 실제 삭제 및 404', async () => {
      assert.equal((await request(`/events/${incident.event_id}`, 'DELETE', undefined, cookieA)).status, 200);
      assert.equal((await request(`/events/${incident.event_id}`)).status, 404);
      const [rows] = await pool.execute('SELECT id FROM incidents WHERE id = ?', [incident.event_id]); assert.equal(rows.length, 0);
    });
    await t.test('외부 API/CSV 분석 자료: 실제 MySQL 저장·중복 방지·출처·읽기 전용', async () => {
      const records = parseGeoJson({ type: 'FeatureCollection', features: [{ type: 'Feature', id: `test_${unique}`, properties: { time: Date.parse('2026-11-08T05:20:00Z'), mag: 4.2, title: '테스트 관측', place: '가상 테스트 위치', net: 'test', type: 'earthquake', url: 'https://earthquake.usgs.gov/' }, geometry: { type: 'Point', coordinates: [127.1, 37.5, 10] } }] });
      // 이 검증용 관측은 합성이므로 실측 USGS와 구분해 저장합니다.
      records[0].source_name = fixtureSource; records[0].is_synthetic = true;
      await importAnalysisRecords(records); await importAnalysisRecords(records);
      const [rows] = await pool.execute('SELECT id,source_name,is_synthetic FROM analysis_records WHERE source_name = ?', [fixtureSource]);
      assert.equal(rows.length, 1); assert.equal(rows[0].is_synthetic, 1);
      externalRecord = rows[0];
      const result = await request(`/analysis-records/${externalRecord.id}`);
      assert.equal(result.status, 200); assert.equal(result.data.event_id, -externalRecord.id); assert.equal(result.data.member_id, 0);
      assert.equal(result.data.data_source, 'synthetic'); assert.equal(result.data.is_synthetic, true); assert.equal(result.data.latitude, 37.5);
      assert.equal(result.data.source_name, fixtureSource); assert.equal(result.data.source_url, 'https://earthquake.usgs.gov/');
      assert.ok((await request('/analysis-records')).data.some((r) => r.event_id === -externalRecord.id));
      assert.equal((await request(`/analysis-records/${externalRecord.id}`, 'PATCH', { title: '수정 불가' }, cookieA)).status, 404);
      assert.equal((await request(`/analysis-records/${externalRecord.id}`, 'DELETE', undefined, cookieA)).status, 404);
      assert.equal((await request(`/events/${-externalRecord.id}`, 'PATCH', { title: '수정 불가' }, cookieA)).status, 400);
      const csv = 'source_name,external_id,title,event_type,severity,sector,map_x,map_y,description,status,occurred_at,source_url,is_synthetic\n' + `${fixtureSource},csv_${unique},"CSV, 인용부호 테스트",가상 관측,보통,A-2,40,60,가상 합성 자료입니다,접수,2026-11-08T14:20:00+09:00,https://example.test/source,true\n`;
      const parsed = parseCsv(csv); assert.equal(parsed[0].title, 'CSV, 인용부호 테스트'); assert.equal(parsed[0].is_synthetic, true);
      await importAnalysisRecords(parsed); await importAnalysisRecords(parsed);
      const [csvRows] = await pool.execute('SELECT id FROM analysis_records WHERE source_name = ?', [fixtureSource]); assert.equal(csvRows.length, 2);
      assert.throws(() => parseCsv(csv.replace(',true\n', ',\n')), /true\/false/);
      const [before] = await pool.execute('SELECT COUNT(*) AS count FROM analysis_records WHERE source_name = ?', [fixtureSource]);
      await assert.rejects(() => importAnalysisRecords([{ ...records[0], external_id: 'would_be_inserted' }, { ...records[0], map_x: 101 }]));
      const [after] = await pool.execute('SELECT COUNT(*) AS count FROM analysis_records WHERE source_name = ?', [fixtureSource]); assert.equal(after[0].count, before[0].count);
    });
    await t.test('회원 DELETE: 연쇄 삭제, 이전 JWT 거부, 재로그인 실패', async () => {
      const created = await request('/events', 'POST', input, cookieA);
      assert.equal(created.status, 201);
      assert.equal((await request('/members/me', 'DELETE', undefined, cookieA)).status, 200);
      const [members] = await pool.execute('SELECT id FROM members WHERE id = ?', [first.member_id]); assert.equal(members.length, 0);
      const [incidents] = await pool.execute('SELECT id FROM incidents WHERE id = ?', [created.data.event_id]); assert.equal(incidents.length, 0);
      assert.equal((await request('/auth/me', 'GET', undefined, cookieA)).status, 401);
      assert.equal((await request('/auth/login', 'POST', { email: `${unique}.updated@example.test`, password: a.password })).status, 401);
      assert.equal((await request(`/analysis-records/${externalRecord.id}`)).status, 200, '회원 탈퇴에도 외부 분석 자료 보존');
      const logout = await request('/auth/logout', 'POST', undefined, cookieB); assert.equal(logout.status, 200); assert.equal(logout.cookie, 'dnx_token=');
    });
  } finally {
    // 실패해도 테스트가 만든 계정만 삭제하며 시연/사용자 데이터는 보존합니다.
    try {
      for (const email of [a.email, b.email, `${unique}.updated@example.test`]) await pool.execute('DELETE FROM members WHERE email = ?', [email]);
      await pool.execute('DELETE FROM analysis_records WHERE source_name = ?', [fixtureSource]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    }
  }
});
