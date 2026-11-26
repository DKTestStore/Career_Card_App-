import { useState } from 'react';
import type { Resume, ResumeContent } from '../lib/types';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { newResume } from '../lib/resume';
import { fmtRange } from '../lib/util';
import { TEMPLATES } from '../templates/registry';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useToast } from './Toast';
import type { UploadedResume } from './UploadResume';

const ATS_FIRST = [...TEMPLATES].sort((a, b) => Number(b.ats) - Number(a.ats));

export default function ReviewUpload({ data, onClose }: { data: UploadedResume; onClose: () => void }) {
  const { addResume } = useStore();
  const toast = useToast();
  const [c, setC] = useState<ResumeContent>(() => structuredClone(data.content));
  const [name, setName] = useState(() => `${data.content.basics.name || data.fileName.replace(/\.[^.]+$/, '')} — Uploaded`);
  const [template, setTemplate] = useState('modern');
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const edit = (fn: (x: ResumeContent) => void) => setC((prev) => { const x = structuredClone(prev); fn(x); return x; });
  const b = c.basics;
  const toggle = (id: string) => setSkip((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async (then: 'edit' | 'ats') => {
    const content: ResumeContent = {
      ...c,
      work: c.work.filter((x) => !skip.has(x.id)), education: c.education.filter((x) => !skip.has(x.id)), projects: c.projects.filter((x) => !skip.has(x.id)),
      skills: c.skills.filter((x) => !skip.has(x.id) && x.keywords.length), certificates: c.certificates.filter((x) => !skip.has(x.id)), awards: c.awards.filter((x) => !skip.has(x.id)),
    };
    const r: Resume = newResume(name.trim() || 'Uploaded resume', content, template, 'violet');
    await addResume(r);
    toast(`Saved “${r.name}”`);
    onClose();
    navigate(then === 'ats' ? `/ats?resume=${r.id}` : `/resumes/${r.id}`);
  };
  const counts = [['Experience', c.work.length], ['Education', c.education.length], ['Projects', c.projects.length], ['Skill groups', c.skills.length], ['Certifications', c.certificates.length], ['Achievements', c.awards.length]] as const;

  return (
    <Modal title="Review your uploaded resume" onClose={onClose} wide footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button type="button" className="btn btn-outline" onClick={() => save('ats')} data-testid="upload-save-ats"><Icon name="target" size={16} />Save &amp; check ATS</button>
      <button type="button" className="btn btn-primary" onClick={() => save('edit')} data-testid="upload-save"><Icon name="save" size={16} />Save as new resume</button>
    </>}>
      <div className="upl" data-testid="upload-review">
        <p className="muted small upl-intro"><Icon name="shield" size={14} /> Parsed on this device from <b>{data.fileName}</b> ({data.kind.toUpperCase()}). Check the fields below; you can fine-tune everything in the editor after saving.</p>
        <div className="upl-found">
          {counts.map(([k, n]) => <span key={k} className={`tag ${n ? 'tag-ats' : ''}`}>{k}: {n}</span>)}
        </div>
        {data.report.warnings.length > 0 && <ul className="upl-warn">{data.report.warnings.map((w) => <li key={w}><Icon name="alert" size={14} />{w}</li>)}</ul>}

        <div className="upl-grid">
          <label className="field"><span>Resume name</span><input value={name} onChange={(e) => setName(e.target.value)} data-testid="upl-name" /></label>
          <label className="field"><span>Template</span>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {ATS_FIRST.map((t) => <option key={t.id} value={t.id}>{t.name}{t.ats ? ' (ATS-friendly)' : ''}</option>)}
            </select>
          </label>
          <label className="field"><span>Full name</span><input value={b.name} onChange={(e) => edit((x) => { x.basics.name = e.target.value; })} data-testid="upl-fullname" /></label>
          <label className="field"><span>Headline</span><input value={b.label} onChange={(e) => edit((x) => { x.basics.label = e.target.value; })} /></label>
          <label className="field"><span>Email</span><input value={b.email} onChange={(e) => edit((x) => { x.basics.email = e.target.value; })} data-testid="upl-email" /></label>
          <label className="field"><span>Phone</span><input value={b.phone} onChange={(e) => edit((x) => { x.basics.phone = e.target.value; })} /></label>
          <label className="field"><span>City</span><input value={b.location.city ?? ''} onChange={(e) => edit((x) => { x.basics.location.city = e.target.value; })} /></label>
          <label className="field"><span>Country / region</span><input value={b.location.countryCode ?? ''} onChange={(e) => edit((x) => { x.basics.location.countryCode = e.target.value; })} /></label>
        </div>
        {b.profiles.length > 0 && <p className="small muted">Links: {b.profiles.map((p) => p.url).join(' · ')}{b.url ? ` · ${b.url}` : ''}</p>}
        <label className="field"><span>Summary</span><textarea rows={3} value={b.summary} onChange={(e) => edit((x) => { x.basics.summary = e.target.value; })} /></label>

        {c.work.length > 0 && <fieldset className="upl-sec"><legend>Experience</legend>
          {c.work.map((w, i) => (
            <div className={`upl-entry${skip.has(w.id) ? ' off' : ''}`} key={w.id} data-testid="upl-work">
              <label className="check"><input type="checkbox" checked={!skip.has(w.id)} onChange={() => toggle(w.id)} /><span className="sr-only">Include</span></label>
              <input aria-label="Job title" value={w.position} placeholder="Job title" onChange={(e) => edit((x) => { x.work[i].position = e.target.value; })} />
              <input aria-label="Company" value={w.name} placeholder="Company" onChange={(e) => edit((x) => { x.work[i].name = e.target.value; })} />
              <small className="muted">{fmtRange(w.startDate, w.endDate) || 'no dates'} · {w.highlights.length} bullet{w.highlights.length === 1 ? '' : 's'}</small>
            </div>
          ))}
        </fieldset>}
        {c.education.length > 0 && <fieldset className="upl-sec"><legend>Education</legend>
          {c.education.map((e, i) => (
            <div className={`upl-entry${skip.has(e.id) ? ' off' : ''}`} key={e.id}>
              <label className="check"><input type="checkbox" checked={!skip.has(e.id)} onChange={() => toggle(e.id)} /><span className="sr-only">Include</span></label>
              <input aria-label="Degree" value={[e.studyType, e.area].filter(Boolean).join(', ')} placeholder="Degree" onChange={(ev) => edit((x) => { x.education[i].studyType = ev.target.value; x.education[i].area = ''; })} />
              <input aria-label="Institution" value={e.institution} placeholder="Institution" onChange={(ev) => edit((x) => { x.education[i].institution = ev.target.value; })} />
              <small className="muted">{[fmtRange(e.startDate, e.endDate, false), e.score].filter(Boolean).join(' · ') || '—'}</small>
            </div>
          ))}
        </fieldset>}
        {c.projects.length > 0 && <fieldset className="upl-sec"><legend>Projects</legend>
          {c.projects.map((p, i) => (
            <div className={`upl-entry upl-entry-1${skip.has(p.id) ? ' off' : ''}`} key={p.id}>
              <label className="check"><input type="checkbox" checked={!skip.has(p.id)} onChange={() => toggle(p.id)} /><span className="sr-only">Include</span></label>
              <input aria-label="Project name" value={p.name} onChange={(e) => edit((x) => { x.projects[i].name = e.target.value; })} />
              <small className="muted">{p.highlights.length} bullets{p.keywords.length ? ` · ${p.keywords.slice(0, 4).join(', ')}` : ''}</small>
            </div>
          ))}
        </fieldset>}
        {c.skills.length > 0 && <fieldset className="upl-sec"><legend>Skills</legend>
          {c.skills.map((s, i) => (
            <div className="upl-skill" key={s.id}>
              <input aria-label="Skill group" value={s.name} onChange={(e) => edit((x) => { x.skills[i].name = e.target.value; })} />
              <input aria-label={`${s.name} keywords`} value={s.keywords.join(', ')} onChange={(e) => edit((x) => { x.skills[i].keywords = e.target.value.split(',').map((k) => k.trim()).filter(Boolean); })} />
            </div>
          ))}
        </fieldset>}
        {(c.certificates.length > 0 || c.awards.length > 0) && <p className="small muted">Also found: {[...c.certificates.map((x) => x.name), ...c.awards.map((x) => x.title)].slice(0, 6).join(' · ')}{c.certificates.length + c.awards.length > 6 ? '…' : ''}</p>}
        {data.report.ignored.length > 0 && <p className="small muted">Skipped sections: {data.report.ignored.join(', ')}</p>}
        <details className="upl-raw"><summary>Show extracted text</summary><pre>{data.text}</pre></details>
      </div>
    </Modal>
  );
}
