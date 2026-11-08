import { useCallback, useState } from 'react';
import { useNavigate } from '@/hooks/useNavigation';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/services/api';
import { eventCode } from '@/utils/format';
import { EventFormModal } from '@/components/events/EventFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
/**
 * 등록/수정/삭제 모달을 여러 페이지에서 재사용하기 위한 훅.
 * 비로그인 사용자가 등록을 시도하면 로그인 페이지로 안내합니다.
 */
export function useEventEditor(opts = {}) {
    const { user } = useAuth();
    const { remove } = useEvents();
    const toast = useToast();
    const navigate = useNavigate();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const openCreate = useCallback(() => {
        if (!user) {
            toast.info('로그인이 필요합니다.', '상황정보 등록은 로그인한 회원만 가능합니다.');
            navigate('/login', { state: { from: window.location.pathname + window.location.search } });
            return;
        }
        setEditing(null);
        setFormOpen(true);
    }, [user, toast, navigate]);
    const openEdit = useCallback((e) => {
        setEditing(e);
        setFormOpen(true);
    }, []);
    const requestDelete = useCallback((e) => setDeleting(e), []);
    const modals = (<>
      <EventFormModal open={formOpen} event={editing} onClose={() => setFormOpen(false)} onSaved={(saved) => {
            setFormOpen(false);
            if (editing)
                toast.success('상황정보를 수정했습니다.', eventCode(saved.event_id));
            else {
                toast.success('새 상황정보를 등록했습니다.', `${eventCode(saved.event_id)} · ${saved.sector} ${saved.event_type}`);
                opts.onCreated?.(saved);
            }
        }}/>
      <ConfirmDialog open={!!deleting} title="상황정보 삭제" confirmLabel="삭제" message={deleting && (<>
              <strong className="text-ink">{eventCode(deleting.event_id)}</strong> ({deleting.sector} · {deleting.event_type}) 을(를) 삭제합니다.
              <br />
              삭제한 데이터는 복구할 수 없습니다.
            </>)} onClose={() => setDeleting(null)} onConfirm={async () => {
            if (!deleting)
                return;
            try {
                await remove(deleting.event_id);
                toast.success('상황정보를 삭제했습니다.', eventCode(deleting.event_id));
                opts.onDeleted?.(deleting.event_id);
                setDeleting(null);
            }
            catch (err) {
                toast.error('삭제하지 못했습니다.', errorMessage(err));
            }
        }}/>
    </>);
    return { openCreate, openEdit, requestDelete, modals };
}
