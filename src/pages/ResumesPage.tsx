import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { ResumeGrid, useImportResume, useNewResume } from '../components/ResumeGrid';
import { Icon } from '../components/Icon';

export function ResumesPage() {
  const { resumes } = useStore();
  const nr = useNewResume();
  const imp = useImportResume();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? resumes.filter((r) => `${r.name} ${r.content.basics.name} ${r.content.basics.label}`.toLowerCase().includes(s)) : resumes;
  }, [q, resumes]);
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Resumes</h1><p className="muted">Create, duplicate and tailor resumes. Everything autosaves on this device.</p></div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline" onClick={imp.pick}><Icon name="upload" size={16} /> Import JSON Resume</button>
          <button type="button" className="btn btn-primary" onClick={nr.open}><Icon name="plus" size={16} /> New resume</button>
        </div>
      </div>
      {resumes.length > 0 && (
        <label className="search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search resumes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search resumes" />
        </label>
      )}
      {resumes.length === 0 ? (
        <div className="empty card">
          <Icon name="file" size={32} />
          <h3>No resumes yet</h3>
          <p className="muted">Start blank or pick a sample profile.</p>
          <button type="button" className="btn btn-primary" onClick={nr.open}><Icon name="plus" size={16} /> Create resume</button>
        </div>
      ) : list.length === 0 ? <p className="muted">No resumes match “{q}”.</p> : <ResumeGrid resumes={list} />}
      {nr.el}{imp.input}
    </div>
  );
}
