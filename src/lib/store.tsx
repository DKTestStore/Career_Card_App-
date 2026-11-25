import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBackend } from './db';
import type { Application, AppStatus, Backup, Resume, ResumeVersion } from './types';
import { nowIso, uid } from './util';

export const MAX_VERSIONS = 50;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Store {
  ready: boolean;
  storageKind: string;
  resumes: Resume[];
  versions: ResumeVersion[];
  applications: Application[];
  saveState: SaveState;
  lastSaved: string | null;
  addResume(r: Resume): Promise<void>;
  updateResume(id: string, fn: (r: Resume) => Resume): void;
  deleteResume(id: string): Promise<void>;
  duplicateResume(id: string): Promise<Resume | null>;
  saveVersion(resumeId: string, label?: string): Promise<ResumeVersion | null>;
  restoreVersion(versionId: string): Promise<void>;
  deleteVersion(versionId: string): Promise<void>;
  upsertApplication(a: Application): Promise<void>;
  deleteApplication(id: string): Promise<void>;
  moveApplication(id: string, status: AppStatus, beforeId?: string | null): Promise<void>;
  exportBackup(): Backup;
  importBackup(b: Backup, mode: 'merge' | 'replace'): Promise<void>;
  clearAll(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageKind, setKind] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [applications, setApps] = useState<Application[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const resumesRef = useRef(resumes);
  const versionsRef = useRef(versions);
  const appsRef = useRef(applications);
  useEffect(() => { resumesRef.current = resumes; }, [resumes]);
  useEffect(() => { versionsRef.current = versions; }, [versions]);
  useEffect(() => { appsRef.current = applications; }, [applications]);

  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    let alive = true;
    (async () => {
      const db = await getBackend();
      const [r, v, a] = await Promise.all([db.getAll('resumes'), db.getAll('versions'), db.getAll('applications')]);
      if (!alive) return;
      r.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
      resumesRef.current = r; versionsRef.current = v; appsRef.current = a;
      setResumes(r); setVersions(v); setApps(a); setKind(db.kind); setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback(async (work: () => Promise<void>) => {
    setSaveState('saving');
    try {
      await work();
      setSaveState('saved');
      setLastSaved(nowIso());
    } catch (e) {
      console.error(e);
      setSaveState('error');
    }
  }, []);

  const flushResume = useCallback((id: string) => {
    const r = resumesRef.current.find((x) => x.id === id);
    if (!r) return Promise.resolve();
    return persist(async () => { const db = await getBackend(); await db.put('resumes', r); });
  }, [persist]);

  // Flush pending debounced writes before the page is hidden/closed.
  useEffect(() => {
    const t = timers.current;
    const flushAll = () => {
      for (const [id, h] of t) { clearTimeout(h); flushResume(id); }
      t.clear();
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flushAll(); };
    window.addEventListener('pagehide', flushAll);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('pagehide', flushAll); document.removeEventListener('visibilitychange', onVis); };
  }, [flushResume]);

  const setR = (next: Resume[]) => { resumesRef.current = next; setResumes(next); };
  const setV = (next: ResumeVersion[]) => { versionsRef.current = next; setVersions(next); };
  const setA = (next: Application[]) => { appsRef.current = next; setApps(next); };

  const addResume = useCallback(async (r: Resume) => {
    setR([r, ...resumesRef.current]);
    await persist(async () => { const db = await getBackend(); await db.put('resumes', r); });
  }, [persist]);

  const updateResume = useCallback((id: string, fn: (r: Resume) => Resume) => {
    const next = resumesRef.current.map((r) => (r.id === id ? { ...fn(r), updatedAt: nowIso() } : r));
    setR(next);
    setSaveState('saving');
    const t = timers.current;
    const prev = t.get(id);
    if (prev) clearTimeout(prev);
    t.set(id, window.setTimeout(() => { t.delete(id); flushResume(id); }, 400));
  }, [flushResume]);

  const deleteResume = useCallback(async (id: string) => {
    const t = timers.current.get(id); if (t) { clearTimeout(t); timers.current.delete(id); }
    const dropV = versionsRef.current.filter((v) => v.resumeId === id);
    setR(resumesRef.current.filter((r) => r.id !== id));
    setV(versionsRef.current.filter((v) => v.resumeId !== id));
    await persist(async () => {
      const db = await getBackend();
      await db.delete('resumes', id);
      for (const v of dropV) await db.delete('versions', v.id);
    });
  }, [persist]);

  const duplicateResume = useCallback(async (id: string) => {
    const src = resumesRef.current.find((r) => r.id === id);
    if (!src) return null;
    const t = nowIso();
    const copy: Resume = { ...structuredClone(src), id: uid(), name: `${src.name} (copy)`, createdAt: t, updatedAt: t };
    await addResume(copy);
    return copy;
  }, [addResume]);

  const saveVersion = useCallback(async (resumeId: string, label?: string) => {
    const r = resumesRef.current.find((x) => x.id === resumeId);
    if (!r) return null;
    const mine = versionsRef.current.filter((v) => v.resumeId === resumeId).sort((a, b) => a.number - b.number);
    const number = (mine.at(-1)?.number ?? 0) + 1;
    const v: ResumeVersion = {
      id: uid(), resumeId, number, label: label?.trim() || `Version ${number}`, createdAt: nowIso(),
      snapshot: structuredClone({ name: r.name, template: r.template, accent: r.accent, content: r.content }),
    };
    const overflow = mine.length + 1 - MAX_VERSIONS;
    const drop = overflow > 0 ? mine.slice(0, overflow) : [];
    setV([...versionsRef.current.filter((x) => !drop.includes(x)), v]);
    await persist(async () => {
      const db = await getBackend();
      await db.put('versions', v);
      for (const d of drop) await db.delete('versions', d.id);
      await db.put('resumes', r);
    });
    return v;
  }, [persist]);

  const restoreVersion = useCallback(async (versionId: string) => {
    const v = versionsRef.current.find((x) => x.id === versionId);
    if (!v) return;
    updateResume(v.resumeId, (r) => ({ ...r, ...structuredClone(v.snapshot) }));
    await flushResume(v.resumeId);
  }, [updateResume, flushResume]);

  const deleteVersion = useCallback(async (versionId: string) => {
    setV(versionsRef.current.filter((v) => v.id !== versionId));
    await persist(async () => { const db = await getBackend(); await db.delete('versions', versionId); });
  }, [persist]);

  const upsertApplication = useCallback(async (a: Application) => {
    const exists = appsRef.current.some((x) => x.id === a.id);
    const next = { ...a, updatedAt: nowIso() };
    setA(exists ? appsRef.current.map((x) => (x.id === a.id ? next : x)) : [...appsRef.current, next]);
    await persist(async () => { const db = await getBackend(); await db.put('applications', next); });
  }, [persist]);

  const deleteApplication = useCallback(async (id: string) => {
    setA(appsRef.current.filter((x) => x.id !== id));
    await persist(async () => { const db = await getBackend(); await db.delete('applications', id); });
  }, [persist]);

  const moveApplication = useCallback(async (id: string, status: AppStatus, beforeId?: string | null) => {
    const app = appsRef.current.find((x) => x.id === id);
    if (!app) return;
    const col = appsRef.current.filter((x) => x.status === status && x.id !== id).sort((a, b) => a.order - b.order);
    let idx = beforeId ? col.findIndex((x) => x.id === beforeId) : -1;
    if (idx < 0) idx = col.length;
    const moved: Application = { ...app, status, updatedAt: nowIso() };
    if (status !== 'wishlist' && !moved.dateApplied && app.status === 'wishlist') moved.dateApplied = nowIso().slice(0, 10);
    col.splice(idx, 0, moved);
    const changed: Application[] = col.map((x, i) => (x.order === i && x.id !== id ? x : { ...x, order: i }));
    const byId = new Map(changed.map((x) => [x.id, x]));
    setA(appsRef.current.map((x) => byId.get(x.id) ?? x));
    await persist(async () => {
      const db = await getBackend();
      for (const x of changed) await db.put('applications', x);
    });
  }, [persist]);

  const exportBackup = useCallback((): Backup => ({
    app: 'hire-ready', schema: 1, exportedAt: nowIso(),
    resumes: resumesRef.current, versions: versionsRef.current, applications: appsRef.current,
  }), []);

  const importBackup = useCallback(async (b: Backup, mode: 'merge' | 'replace') => {
    const merge = <T extends { id: string }>(cur: T[], inc: T[]) => {
      if (mode === 'replace') return inc;
      const m = new Map(cur.map((x) => [x.id, x]));
      for (const x of inc) m.set(x.id, x);
      return [...m.values()];
    };
    const r = merge(resumesRef.current, b.resumes ?? []).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
    const v = merge(versionsRef.current, b.versions ?? []);
    const a = merge(appsRef.current, b.applications ?? []);
    setR(r); setV(v); setA(a);
    await persist(async () => { const db = await getBackend(); await db.replaceAll({ resumes: r, versions: v, applications: a }); });
  }, [persist]);

  const clearAll = useCallback(async () => {
    setR([]); setV([]); setA([]);
    await persist(async () => { const db = await getBackend(); await db.replaceAll({ resumes: [], versions: [], applications: [] }); });
  }, [persist]);

  const value = useMemo<Store>(() => ({
    ready, storageKind, resumes, versions, applications, saveState, lastSaved,
    addResume, updateResume, deleteResume, duplicateResume, saveVersion, restoreVersion, deleteVersion,
    upsertApplication, deleteApplication, moveApplication, exportBackup, importBackup, clearAll,
  }), [ready, storageKind, resumes, versions, applications, saveState, lastSaved, addResume, updateResume, deleteResume, duplicateResume,
    saveVersion, restoreVersion, deleteVersion, upsertApplication, deleteApplication, moveApplication, exportBackup, importBackup, clearAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
