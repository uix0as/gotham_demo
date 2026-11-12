import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '@/services/api';
const EventsContext = createContext(null);
const sortLatest = (list) => [...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.event_id - a.event_id);
export function EventsProvider({ children }) {
    const [events, setEvents] = useState([]);
    const [dataset, setDataset] = useState([]);
    const [datasetStatus, setDatasetStatus] = useState('loading');
    const [datasetError, setDatasetError] = useState(null);
    const analysisEvents = useMemo(() => sortLatest([...events, ...dataset]), [events, dataset]);
    const reloadDataset = useCallback(async () => {
        setDatasetStatus('loading');
        setDatasetError(null);
        try {
            setDataset(await api.analysis.list());
            setDatasetStatus('ready');
        }
        catch (e) {
            setDatasetError(errorMessage(e, '외부 분석 데이터를 불러오지 못했습니다.'));
            setDatasetStatus('error');
        }
    }, []);
    useEffect(() => { void reloadDataset(); }, [reloadDataset]);
    const [notes, setNotes] = useState([]);
    const [notesStatus, setNotesStatus] = useState('loading');
    const reloadNotes = useCallback(async () => {
        try {
            setNotes(await api.notes.list());
            setNotesStatus('ready');
        }
        catch {
            setNotesStatus('error');
        }
    }, []);
    const createNote = useCallback(async (input) => {
        const created = await api.notes.create(input);
        await reloadNotes();
        return created;
    }, [reloadNotes]);
    const updateNote = useCallback(async (id, patch) => {
        const updated = await api.notes.update(id, patch);
        await reloadNotes();
        return updated;
    }, [reloadNotes]);
    const removeNote = useCallback(async (id) => {
        await api.notes.remove(id);
        await reloadNotes();
    }, [reloadNotes]);
    const [authorNames, setAuthorNames] = useState(new Map());
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const reload = useCallback(async () => {
        setError(null);
        try {
            const [list, joined] = await Promise.all([api.events.list(), api.events.listWithAuthors()]);
            setEvents(sortLatest(list));
            setAuthorNames(new Map(joined.map((r) => [r.member_id, r.nickname])));
            void reloadNotes();
            setStatus('ready');
        }
        catch (e) {
            setError(errorMessage(e, '상황정보를 불러오지 못했습니다.'));
            setStatus('error');
        }
    }, [reloadNotes]);
    useEffect(() => {
        reload();
    }, [reload]);
    const create = useCallback(async (input) => {
        const created = await api.events.create(input);
        setEvents((prev) => sortLatest([created, ...prev.filter((e) => e.event_id !== created.event_id)]));
        void reload();
        return created;
    }, [reload]);
    const update = useCallback(async (id, patch) => {
        const updated = await api.events.update(id, patch);
        setEvents((prev) => sortLatest(prev.map((e) => (e.event_id === id ? updated : e))));
        void reload();
        return updated;
    }, [reload]);
    const remove = useCallback(async (id) => {
        await api.events.remove(id);
        setEvents((prev) => prev.filter((e) => e.event_id !== id));
        void reload();
    }, [reload]);
    const value = useMemo(() => ({
        events,
        dataset, analysisEvents, datasetStatus, datasetError, reloadDataset,
        getAnalysisById: (id) => analysisEvents.find((e) => e.event_id === id),
        authorNames,
        status,
        error,
        reload,
        create,
        update,
        remove,
        notes, notesStatus, reloadNotes, createNote, updateNote, removeNote,
        getById: (id) => events.find((e) => e.event_id === id),
        authorOf: (memberId) => memberId === 0 ? '외부 관측 데이터' : authorNames.get(memberId) ?? `회원 #${memberId}`,
    }), [events, dataset, analysisEvents, datasetStatus, datasetError, reloadDataset, authorNames, status, error, reload, create, update, remove, notes, notesStatus, reloadNotes, createNote, updateNote, removeNote]);
    return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
export function useEvents() {
    const ctx = useContext(EventsContext);
    if (!ctx)
        throw new Error('useEvents must be used within EventsProvider');
    return ctx;
}
