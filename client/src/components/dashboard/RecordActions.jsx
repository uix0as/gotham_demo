import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Ellipsis, Pencil, Trash2 } from 'lucide-react';
export function RecordActions({ event, editable, onView, onEdit, onDelete }) {
    const [position, setPosition] = useState(null);
    const trigger = useRef(null);
    const menu = useRef(null);
    useEffect(() => {
        if (!position)
            return;
        menu.current?.querySelector('button')?.focus();
        const close = (event) => {
            if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target))
                setPosition(null);
        };
        const key = (event) => {
            if (event.key === 'Escape') {
                setPosition(null);
                trigger.current?.focus();
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const controls = [...(menu.current?.querySelectorAll('button') || [])];
                const current = controls.indexOf(document.activeElement);
                controls[(current + (event.key === 'ArrowDown' ? 1 : controls.length - 1)) % controls.length]?.focus();
            }
        };
        const scroll = () => setPosition(null);
        document.addEventListener('pointerdown', close);
        document.addEventListener('keydown', key);
        window.addEventListener('scroll', scroll, true);
        window.addEventListener('resize', scroll);
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', scroll); };
    }, [position]);
    const choose = (action) => {
        setPosition(null);
        // 메뉴 항목은 사라지므로 새 모달은 남아 있는 트리거에 포커스를 돌려줍니다.
        trigger.current?.focus({ preventScroll: true });
        action();
    };
    return <><button ref={trigger} className="console-icon record-actions-trigger" aria-label={`${event.title} 관리 메뉴`} aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
            if (position) {
                setPosition(null);
                return;
            }
            const box = trigger.current.getBoundingClientRect();
            setPosition({ top: Math.min(box.bottom + 5, window.innerHeight - (editable ? 142 : 58)), left: Math.max(12, box.right - 166) });
        }}><Ellipsis size={18}/></button>{position && createPortal(<div ref={menu} className="record-actions-menu" role="menu" aria-label="상황정보 관리" style={position}><button role="menuitem" onClick={() => choose(onView)}><ArrowUpRight size={15}/>상세 보기</button>{editable && <><button role="menuitem" onClick={() => choose(onEdit)}><Pencil size={15}/>수정하기</button><button className="is-danger" role="menuitem" onClick={() => choose(onDelete)}><Trash2 size={15}/>삭제하기</button></>}</div>, document.body)}</>;
}
