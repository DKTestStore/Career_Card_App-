import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { ResumeGrid, useImportResume, useNewResume } from '../components/ResumeGrid';
import { Icon } from '../components/Icon';
import { useUploadResume } from '../components/UploadResume';

export function ResumesPage() {
  const { resumes } = useStore();
  const nr = useNewResume();
  const imp = useImportResume();
  const upl = useUploadResume();
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
          <button type="button" className="btn btn-outline" onClick={imp.pick} title="Import a JSON Resume file"><Icon name="code" size={16} /> <span>JSON</span></button>
          <button type="button" className="btn btn-outline" onClick={upl.pick} data-testid="upload-resume"><Icon name="upload" size={16} /> Upload PDF / Word</button>
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
          <p className="muted">Start blank, pick a sample profile, or upload your current resume (PDF, Word or text).</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-primary" onClick={nr.open}><Icon name="plus" size={16} /> Create resume</button>
            <button type="button" className="btn btn-outline" onClick={upl.pick}><Icon name="upload" size={16} /> Upload PDF / Word</button>
          </div>
        </div>
      ) : list.length === 0 ? <p className="muted">No resumes match “{q}”.</p> : <ResumeGrid resumes={list} />}
      {nr.el}{imp.input}{upl.input}{upl.el}
    </div>
  );
}
