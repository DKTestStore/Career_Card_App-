import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Icon } from '../components/Icon';
import { ConfirmDialog, Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { download, readFileText, todayStr } from '../lib/util';
import { isBackup } from '../lib/resume';
import type { Backup } from '../lib/types';

export function SettingsPage() {
  const { exportBackup, importBackup, clearAll, resumes, versions, applications, storageKind } = useStore();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [clearing, setClearing] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await readFileText(f));
      if (!isBackup(data)) { toast('That file is not a Hire Ready backup.'); return; }
      setPending(data);
    } catch { toast('Could not read that file.'); } finally { if (file.current) file.current.value = ''; }
  };

  return (
    <div className="page narrow">
      <div className="page-head"><div><h1>Data &amp; settings</h1><p className="muted">Hire Ready has no account and no server. Your data lives only in this browser.</p></div></div>

      <section className="card pad settings-sec">
        <h2>Storage</h2>
        <dl className="kv">
          <div><dt>Stored in</dt><dd>{storageKind === 'indexeddb' ? 'IndexedDB (this browser)' : storageKind === 'localstorage' ? 'localStorage (fallback)' : 'Memory only — data will not persist'}</dd></div>
          <div><dt>Resumes</dt><dd>{resumes.length}</dd></div>
          <div><dt>Saved versions</dt><dd>{versions.length}</dd></div>
          <div><dt>Applications</dt><dd>{applications.length}</dd></div>
        </dl>
        <p className="small muted">Clearing browser data removes everything. Export a backup regularly, or before switching devices.</p>
      </section>

      <section className="card pad settings-sec">
        <h2>Backup</h2>
        <p className="muted small">One JSON file with all resumes, versions and applications.</p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={() => { download(`hire-ready-backup-${todayStr()}.json`, JSON.stringify(exportBackup(), null, 2)); toast('Backup downloaded'); }}>
            <Icon name="download" size={16} /> Export backup
          </button>
          <button type="button" className="btn btn-outline" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Import backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label="Import backup file" />
        </div>
        <p className="small muted">To move a single resume, use the export button on its card (JSON Resume format — works with jsonresume.org themes).</p>
      </section>

      <section className="card pad settings-sec danger-zone">
        <h2>Danger zone</h2>
        <button type="button" className="btn btn-danger" onClick={() => setClearing(true)}><Icon name="trash" size={16} /> Delete all data on this device</button>
      </section>

      <section className="card pad settings-sec">
        <h2>Privacy</h2>
        <p className="small muted">No analytics, no cookies, no tracking. Fonts are bundled with the app. The app works offline once loaded and can be installed from your browser menu (“Install app” / “Add to Home screen”).</p>
      </section>

      {pending && (
        <Modal title="Import backup" onClose={() => setPending(null)} footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button>
          <button type="button" className="btn btn-outline" onClick={async () => { await importBackup(pending, 'merge'); setPending(null); toast('Backup merged'); }}>Merge</button>
          <button type="button" className="btn btn-danger" onClick={async () => { await importBackup(pending, 'replace'); setPending(null); toast('Data replaced from backup'); }}>Replace all</button>
        </>}>
          <p className="muted">This backup has <b>{pending.resumes.length}</b> resumes, <b>{pending.versions?.length ?? 0}</b> versions and <b>{pending.applications.length}</b> applications
            (exported {new Date(pending.exportedAt).toLocaleString()}).</p>
          <p className="muted small"><b>Merge</b> keeps your current data and adds/updates items from the file. <b>Replace all</b> deletes current data first.</p>
        </Modal>
      )}
      {clearing && <ConfirmDialog title="Delete everything?" confirmLabel="Delete all" onClose={() => setClearing(false)}
        message="All resumes, versions and applications on this device will be permanently deleted. Export a backup first if you might need them."
        onConfirm={async () => { await clearAll(); toast('All data deleted'); }} />}
    </div>
  );
}
