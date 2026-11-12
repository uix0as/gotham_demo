import { useEffect, useState } from 'react';
import { useEvents } from '@/context/EventsContext';
import { errorMessage, isApiError } from '@/services/api';
import { displayEventTitle, eventCode } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/Field';

export const ASSESSMENTS = ['관찰', '주의', '위험'];
export const CONFIDENCES = ['낮음', '보통', '높음'];
const EMPTY = { incident_id: '', title: '', assessment: '관찰', confidence: '보통', content: '' };

function validate(form) {
    const errors = {};
    if (!form.incident_id) errors.incident_id = '대상 사건을 선택해 주세요.';
    if (!form.title.trim() || form.title.trim().length > 150) errors.title = '제목을 1~150자로 입력해 주세요.';
    if (form.content.trim().length < 5 || form.content.trim().length > 2000) errors.content = '분석 내용을 5~2000자로 입력해 주세요.';
    return errors;
}

/** 분석 기록 등록·수정 폼. 저장은 실제 API(POST/PATCH /api/analysis-notes)가 성공한 뒤에만 닫힙니다. */
export function NoteFormModal({ open, note, presetIncidentId, onClose, onSaved }) {
    const { events, createNote, updateNote } = useEvents();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!open) return;
        setErrors({});
        setFormError(null);
        setForm(note ? { incident_id: String(note.incident_id), title: note.title, assessment: note.assessment, confidence: note.confidence, content: note.content }
            : { ...EMPTY, incident_id: presetIncidentId ? String(presetIncidentId) : '' });
    }, [open, note, presetIncidentId]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) return;
        setSaving(true);
        setFormError(null);
        const body = { incident_id: Number(form.incident_id), title: form.title.trim(), assessment: form.assessment, confidence: form.confidence, content: form.content.trim() };
        try {
            const saved = note ? await updateNote(note.note_id, body) : await createNote(body);
            onSaved(saved);
        }
        catch (err) {
            if (isApiError(err) && err.details) setErrors(err.details);
            setFormError(errorMessage(err, '저장하지 못했습니다.'));
        }
        finally {
            setSaving(false);
        }
    };
    return <Modal open={open} onClose={onClose} busy={saving} size="lg" title={note ? `분석 기록 수정 · AN-${String(note.note_id).padStart(4, '0')}` : '새 분석 기록'} description="사건 하나에 대한 판단과 근거를 기록합니다. 작성자는 로그인한 회원으로 저장됩니다."
      footer={<><Button variant="ghost" onClick={onClose} disabled={saving}>취소</Button><Button variant="primary" type="submit" form="note-form" loading={saving}>{note ? '변경사항 저장' : '등록'}</Button></>}>
      <form id="note-form" className="gx-form" onSubmit={submit} noValidate>
        {formError && <p className="gx-form-error" role="alert">{formError}</p>}
        <Field label="대상 사건" required error={errors.incident_id}>{(p) => <SelectInput {...p} value={form.incident_id} invalid={!!errors.incident_id} onChange={(e) => set('incident_id', e.target.value)}>
            <option value="">사건 선택</option>
            {events.map((ev) => <option key={ev.event_id} value={ev.event_id}>{eventCode(ev.event_id)} · {ev.sector} · {displayEventTitle(ev.title)}</option>)}
          </SelectInput>}</Field>
        <Field label="제목" required error={errors.title}>{(p) => <TextInput {...p} value={form.title} maxLength={150} invalid={!!errors.title} placeholder="예: A-2 통신 장애와 강풍의 시간 근접" onChange={(e) => set('title', e.target.value)}/>}</Field>
        <div className="gx-form-row">
          <Field label="판단" required>{(p) => <SelectInput {...p} value={form.assessment} onChange={(e) => set('assessment', e.target.value)}>{ASSESSMENTS.map((a) => <option key={a}>{a}</option>)}</SelectInput>}</Field>
          <Field label="신뢰도" required>{(p) => <SelectInput {...p} value={form.confidence} onChange={(e) => set('confidence', e.target.value)}>{CONFIDENCES.map((a) => <option key={a}>{a}</option>)}</SelectInput>}</Field>
        </div>
        <Field label="분석 내용" required error={errors.content} hint={`${form.content.trim().length} / 2000자`}>{(p) => <TextArea {...p} rows={6} value={form.content} invalid={!!errors.content} placeholder="관측 근거, 판단 이유, 권고 조치를 적습니다." onChange={(e) => set('content', e.target.value)}/>}</Field>
      </form>
    </Modal>;
}
