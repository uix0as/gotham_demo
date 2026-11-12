import { useCallback, useState } from 'react';
import { useNavigate } from '@/hooks/useNavigation';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
import { NoteFormModal } from '@/components/notes/NoteFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const noteCode = (id) => `AN-${String(id).padStart(4, '0')}`;

/** 분석 기록 등록·수정·삭제 모달 */
export function useNoteEditor(opts = {}) {
    const { user } = useAuth();
    const { removeNote } = useEvents();
    const toast = useToast();
    const navigate = useNavigate();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [preset, setPreset] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const openCreate = useCallback((incidentId) => {
        if (!user) {
            toast.info('로그인이 필요합니다.', '분석 기록은 로그인한 회원만 작성할 수 있습니다.');
            navigate('/login', { state: { from: window.location.pathname + window.location.search } });
            return;
        }
        setEditing(null);
        setPreset(typeof incidentId === 'number' ? incidentId : null);
        setFormOpen(true);
    }, [user, toast, navigate]);
    const openEdit = useCallback((note) => { setEditing(note); setFormOpen(true); }, []);
    const requestDelete = useCallback((note) => setDeleting(note), []);
    const modals = <>
      <NoteFormModal open={formOpen} note={editing} presetIncidentId={preset} onClose={() => setFormOpen(false)} onSaved={(saved) => {
            setFormOpen(false);
            toast.success(editing ? '분석 기록을 수정했습니다.' : '분석 기록을 등록했습니다.', noteCode(saved.note_id));
            opts.onSaved?.(saved);
        }}/>
      <ConfirmDialog open={!!deleting} title="분석 기록 삭제" confirmLabel="삭제" message={deleting && <><strong className="text-ink">{noteCode(deleting.note_id)}</strong> {deleting.title} 을(를) 삭제합니다.<br/>삭제한 데이터는 복구할 수 없습니다.</>}
        onClose={() => setDeleting(null)} onConfirm={async () => {
            try {
                await removeNote(deleting.note_id);
                toast.success('분석 기록을 삭제했습니다.', noteCode(deleting.note_id));
                opts.onDeleted?.(deleting.note_id);
                setDeleting(null);
            }
            catch (err) {
                toast.error('삭제하지 못했습니다.', errorMessage(err));
            }
        }}/>
    </>;
    return { openCreate, openEdit, requestDelete, modals };
}
