import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { EVENT_STATUSES, EVENT_SEVERITIES } from '@/domain';
import { EVENT_TYPES, SOURCE_TYPES } from '@/utils/constants';
import { SECTORS, sectorAt } from '@/utils/sectors';
import { isoToLocalInput, localInputToIso, nowKstIso } from '@/utils/date';
import { DESCRIPTION_MAX, hasErrors, validateEventInput } from '@/utils/validation';
import { isApiError } from '@/services/api';
import { eventCode } from '@/utils/format';
import { useEvents } from '@/context/EventsContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';
import { TacticalMap } from '@/components/map/TacticalMap';
function initialState(event) {
    if (event)
        return {
            title: event.title,
            severity: event.severity,
            source_type: event.source_type,
            event_type: event.event_type,
            sector: event.sector,
            map_x: String(event.map_x),
            map_y: String(event.map_y),
            description: event.description,
            status: event.status,
            occurred_local: isoToLocalInput(event.occurred_at),
        };
    return {
        title: '',
        severity: '보통',
        source_type: SOURCE_TYPES[0],
        event_type: EVENT_TYPES[0],
        sector: '',
        map_x: '',
        map_y: '',
        description: '',
        status: '접수',
        occurred_local: isoToLocalInput(nowKstIso()),
    };
}
function toInput(f) {
    const toInt = (s) => (s.trim() === '' ? NaN : Number(s));
    return {
        title: f.title.trim(),
        severity: f.severity,
        source_type: f.source_type,
        event_type: f.event_type,
        sector: f.sector,
        map_x: toInt(f.map_x),
        map_y: toInt(f.map_y),
        description: f.description,
        status: f.status,
        occurred_at: localInputToIso(f.occurred_local),
    };
}
export function EventFormModal({ open, event, onClose, onSaved }) {
    const { create, update, events } = useEvents();
    const [form, setForm] = useState(() => initialState(event));
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null);
    const [saving, setSaving] = useState(false);
    const isEdit = !!event;
    useEffect(() => {
        if (open) {
            setForm(initialState(event));
            setErrors({});
            setSubmitError(null);
        }
    }, [open, event]);
    const set = (k, v) => {
        setForm((f) => ({ ...f, [k]: v }));
        const map = { occurred_local: 'occurred_at' };
        const key = (map[k] ?? k);
        if (errors[key])
            setErrors((e) => ({ ...e, [key]: undefined }));
    };
    const x = Number(form.map_x);
    const y = Number(form.map_y);
    const hasPoint = form.map_x !== '' && form.map_y !== '' && Number.isFinite(x) && Number.isFinite(y);
    const pointSector = hasPoint ? sectorAt(x, y) : null;
    const mismatch = hasPoint && form.sector && pointSector && pointSector !== form.sector;
    const others = useMemo(() => events.filter((e) => e.event_id !== event?.event_id), [events, event]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        const input = toInput(form);
        const v = validateEventInput(input);
        setErrors(v);
        if (hasErrors(v))
            return;
        setSaving(true);
        try {
            const saved = isEdit ? await update(event.event_id, input) : await create(input);
            onSaved(saved);
        }
        catch (err) {
            if (isApiError(err) && err.details)
                setErrors(err.details);
            setSubmitError(isApiError(err) ? err.message : '저장하지 못했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    return (<Modal open={open} onClose={onClose} busy={saving} size="xl" title={isEdit ? `상황정보 수정 · ${eventCode(event.event_id)}` : '새 상황정보 등록'} description="모든 입력값은 가상 훈련 시뮬레이션 데이터로만 사용됩니다. 작성자는 로그인한 회원으로 자동 지정됩니다." footer={<>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" type="submit" form="event-form" loading={saving}>
            {isEdit ? '변경사항 저장' : '등록'}
          </Button>
        </>}>
      <form id="event-form" onSubmit={handleSubmit} noValidate className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="사건명" required error={errors.title} className="sm:col-span-2">
            {(p) => <TextInput {...p} data-autofocus value={form.title} maxLength={150} invalid={!!errors.title} onChange={(e) => set('title', e.target.value)} placeholder="예: A-2 중계기 통신 연결 장애"/>}
          </Field>
          <Field label="중요도" required error={errors.severity} className="sm:col-span-2">
            {(p) => <SelectInput {...p} value={form.severity} invalid={!!errors.severity} onChange={(e) => set('severity', e.target.value)}>{EVENT_SEVERITIES.map((v) => <option key={v}>{v}</option>)}</SelectInput>}
          </Field>
          <Field label="정보 출처" required error={errors.source_type}>
            {(p) => (<SelectInput {...p} value={form.source_type} invalid={!!errors.source_type} onChange={(e) => set('source_type', e.target.value)}>
                {SOURCE_TYPES.map((s) => (<option key={s}>{s}</option>))}
                {!SOURCE_TYPES.includes(form.source_type) && form.source_type && <option>{form.source_type}</option>}
              </SelectInput>)}
          </Field>
          <Field label="사건 유형" required error={errors.event_type}>
            {(p) => (<SelectInput {...p} value={form.event_type} invalid={!!errors.event_type} onChange={(e) => set('event_type', e.target.value)}>
                {EVENT_TYPES.map((s) => (<option key={s}>{s}</option>))}
                {!EVENT_TYPES.includes(form.event_type) && form.event_type && <option>{form.event_type}</option>}
              </SelectInput>)}
          </Field>
          <Field label="발생 구역" required error={errors.sector}>
            {(p) => (<SelectInput {...p} value={form.sector} invalid={!!errors.sector} onChange={(e) => set('sector', e.target.value)}>
                <option value="">구역 선택</option>
                {SECTORS.map((s) => (<option key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </option>))}
              </SelectInput>)}
          </Field>
          <Field label="처리 상태" required error={errors.status}>
            {(p) => (<SelectInput {...p} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {EVENT_STATUSES.map((s) => (<option key={s}>{s}</option>))}
              </SelectInput>)}
          </Field>
          <Field label="가상 X좌표 (0~100)" required error={errors.map_x}>
            {(p) => (<TextInput {...p} type="number" inputMode="numeric" min={0} max={100} step={1} value={form.map_x} invalid={!!errors.map_x} onChange={(e) => set('map_x', e.target.value)} placeholder="예: 35"/>)}
          </Field>
          <Field label="가상 Y좌표 (0~100)" required error={errors.map_y}>
            {(p) => (<TextInput {...p} type="number" inputMode="numeric" min={0} max={100} step={1} value={form.map_y} invalid={!!errors.map_y} onChange={(e) => set('map_y', e.target.value)} placeholder="예: 60"/>)}
          </Field>
          <Field label="발생 시각 (KST)" required error={errors.occurred_at} className="sm:col-span-2">
            {(p) => (<TextInput {...p} type="datetime-local" value={form.occurred_local} invalid={!!errors.occurred_at} onChange={(e) => set('occurred_local', e.target.value)}/>)}
          </Field>
          <Field label="상세 설명" required error={errors.description} hint={`${form.description.length} / ${DESCRIPTION_MAX}자 · 실제 군사정보를 입력하지 마세요.`} className="sm:col-span-2">
            {(p) => (<TextArea {...p} rows={4} maxLength={DESCRIPTION_MAX} value={form.description} invalid={!!errors.description} onChange={(e) => set('description', e.target.value)} placeholder="[가상 훈련] 상황 내용을 입력하세요."/>)}
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-secondary">
              <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden/>
              지도를 클릭해 좌표 선택
            </p>
            <span className="font-mono text-2xs text-ink-muted">{hasPoint ? `X ${x} · Y ${y}` : '좌표 미지정'}</span>
          </div>
          <TacticalMap compact events={others} pickMode picked={hasPoint ? { x, y } : null} highlightSector={form.sector || pointSector} onPick={(px, py, sec) => {
            setForm((f) => ({ ...f, map_x: String(px), map_y: String(py), sector: sec ?? f.sector }));
            setErrors((e) => ({ ...e, map_x: undefined, map_y: undefined, sector: sec ? undefined : e.sector }));
        }}/>
          <p className="text-2xs text-ink-muted">
            지도 클릭 시 해당 좌표가 속한 구역이 자동 선택됩니다. 다른 사건은 흐린 마커로 표시됩니다.
          </p>
          {mismatch && (<p className="rounded-md border border-warn/40 bg-warn-muted px-3 py-2 text-xs text-warn" role="status">
              좌표 ({x}, {y})는 {pointSector} 구역에 위치합니다. 선택한 구역({form.sector})과 다릅니다 — 의도한 값인지 확인해 주세요.
            </p>)}
          {submitError && (<p className="rounded-md border border-danger/40 bg-danger-muted px-3 py-2 text-xs text-danger" role="alert">
              {submitError}
            </p>)}
        </div>
      </form>
    </Modal>);
}
