import { openDB, type IDBPDatabase } from 'idb';
import type { Application, AtsReport, Resume, ResumeVersion } from './types';

/**
 * Stage-1 storage: everything stays on this device.
 * IndexedDB (via `idb`) when available, localStorage as a fallback
 * (e.g. some private-browsing modes block IndexedDB).
 */

export interface StoreMap {
  resumes: Resume;
  versions: ResumeVersion;
  applications: Application;
  atsReports: AtsReport;
}
export type StoreName = keyof StoreMap;
const STORES: StoreName[] = ['resumes', 'versions', 'applications', 'atsReports'];

interface Backend {
  kind: 'indexeddb' | 'localstorage' | 'memory';
  getAll<S extends StoreName>(store: S): Promise<StoreMap[S][]>;
  put<S extends StoreName>(store: S, value: StoreMap[S]): Promise<void>;
  delete(store: StoreName, id: string): Promise<void>;
  replaceAll(data: { [S in StoreName]: StoreMap[S][] }): Promise<void>;
}

const DB_NAME = 'hire-ready';

async function idbBackend(): Promise<Backend> {
  const db: IDBPDatabase = await openDB(DB_NAME, 2, {
    upgrade(d) {
      for (const s of STORES) {
        if (!d.objectStoreNames.contains(s)) {
          const os = d.createObjectStore(s, { keyPath: 'id' });
          if (s === 'versions' || s === 'atsReports') os.createIndex('resumeId', 'resumeId');
        }
      }
    },
  });
  return {
    kind: 'indexeddb',
    getAll: (store) => db.getAll(store),
    put: async (store, value) => { await db.put(store, value); },
    delete: (store, id) => db.delete(store, id),
    replaceAll: async (data) => {
      const tx = db.transaction(STORES, 'readwrite');
      for (const s of STORES) {
        const os = tx.objectStore(s);
        await os.clear();
        for (const v of data[s]) await os.put(v);
      }
      await tx.done;
    },
  };
}

function lsBackend(storage: Storage | null): Backend {
  const mem = new Map<string, string>();
  const key = (s: StoreName) => `${DB_NAME}:${s}`;
  const read = <S extends StoreName>(s: S): StoreMap[S][] => {
    try {
      const raw = storage ? storage.getItem(key(s)) : mem.get(key(s));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const write = (s: StoreName, rows: unknown[]) => {
    const raw = JSON.stringify(rows);
    if (storage) storage.setItem(key(s), raw); else mem.set(key(s), raw);
  };
  return {
    kind: storage ? 'localstorage' : 'memory',
    getAll: async (s) => read(s),
    put: async (s, value) => {
      const rows = read(s).filter((r) => r.id !== value.id);
      rows.push(value);
      write(s, rows);
    },
    delete: async (s, id) => write(s, read(s).filter((r) => r.id !== id)),
    replaceAll: async (data) => { for (const s of STORES) write(s, data[s]); },
  };
}

let backendPromise: Promise<Backend> | null = null;

export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('no idb');
        return await idbBackend();
      } catch {
        try {
          const t = '__hr_test__';
          localStorage.setItem(t, '1');
          localStorage.removeItem(t);
          return lsBackend(localStorage);
        } catch {
          return lsBackend(null);
        }
      }
    })();
  }
  return backendPromise;
}
