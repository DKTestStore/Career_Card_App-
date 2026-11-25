import { useRef, useState } from 'react';
import type { Resume } from '../lib/types';
import { useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { ResumeDoc } from '../templates/ResumeDoc';
import { accentById, resolveAccent } from '../lib/themes';
import { templateById } from '../templates/registry';
import { analyze } from '../lib/ats/score';
import { download, readFileText, slug, timeAgo } from '../lib/util';
import { fromJsonResume, isBackup, newResume, toJsonResume } from '../lib/resume';
import { SAMPLES, sampleContent } from '../lib/samples';
import { ConfirmDialog, Modal } from './Modal';
import { Icon } from './Icon';
import { useToast } from './Toast';

export function ResumeThumb({ resume, scale = 0.2 }: { resume: Resume; scale?: number }) {
  return (
    <div className="thumb" style={{ width: 794 * scale, height: 1123 * scale }} aria-hidden="true">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794, height: 1123, overflow: 'hidden' }} inert>
        <ResumeDoc resume={resume} />
      </div>
    </div>
  );
}

export function useNewResume() {
  const [open, setOpen] = useState(false);
  const el = open ? <NewResumeModal onClose={() => setOpen(false)} /> : null;
  return { open: () => setOpen(true), el };
}

function NewResumeModal({ onClose }: { onClose: () => void }) {
  const { addResume } = useStore();
  const [name, setName] = useState('');
  const create = async (key: string | null) => {
    const s = SAMPLES.find((x) => x.key === key);
    const content = key ? sampleContent(key) ?? undefined : undefined;
    const r = newResume(name.trim() || (s ? `${s.title} — Sample` : 'Untitled resume'), content, s?.template, s?.accent);
    await addResume(r);
    onClose();
    navigate(`/resumes/${r.id}`);
  };
  return (
    <Modal title="Create a resume" onClose={onClose} wide>
      <label className="field">
        <span>Resume name (optional)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backend roles — 2026" />
      </label>
      <div className="start-grid">
        <button type="button" className="start-card" onClick={() => create(null)}>
          <span className="start-ico"><Icon name="plus" size={22} /></span>
          <b>Blank resume</b>
          <small>Start from an empty page</small>
        </button>
        {SAMPLES.map((s) => (
          <button type="button" key={s.key} className="start-card" onClick={() => create(s.key)} data-sample={s.key}>
            <span className="start-ico" style={{ background: accentById(s.accent).soft, color: accentById(s.accent).theme }}><Icon name="file" size={22} /></span>
            <b>{s.title}</b>
            <small>{s.blurb} · {templateById(s.template).name}</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export function useImportResume() {
  const ref = useRef<HTMLInputElement>(null);
  const { addResume } = useStore();
  const toast = useToast();
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await readFileText(f));
      if (isBackup(data)) { toast('That is a full backup — import it from Data & settings.'); return; }
      const r = fromJsonResume(data, f.name.replace(/\.json$/i, ''));
      await addResume(r);
      toast(`Imported “${r.name}”`);
      navigate(`/resumes/${r.id}`);
    } catch {
      toast('Could not read that file. Is it a JSON Resume file?');
    } finally { if (ref.current) ref.current.value = ''; }
  };
  const input = <input ref={ref} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label="Import JSON Resume file" />;
  return { pick: () => ref.current?.click(), input };
}

export function ResumeGrid({ resumes, limit }: { resumes: Resume[]; limit?: number }) {
  const { deleteResume, duplicateResume, updateResume, versions } = useStore();
  const toast = useToast();
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const [deleting, setDeleting] = useState<Resume | null>(null);
  const [newName, setNewName] = useState('');
  const list = limit ? resumes.slice(0, limit) : resumes;

  return (
    <>
      <div className="resume-grid">
        {list.map((r) => {
          const vcount = versions.filter((v) => v.resumeId === r.id).length;
          const ats = analyze(r).score;
          const acc = resolveAccent(r);
          const tpl = templateById(r.template);
          return (
            <article className="card resume-card" key={r.id}>
              <a href={`/resumes/${r.id}`} className="rc-thumb" onClick={(e) => { e.preventDefault(); navigate(`/resumes/${r.id}`); }} aria-label={`Open ${r.name}`}>
                <ResumeThumb resume={r} scale={0.16} />
              </a>
              <div className="rc-body">
                <h3 className="rc-title">{r.name}</h3>
                <p className="muted small">{r.content.basics.label || 'No headline yet'}</p>
                <div className="pills">
                  <span className="pill pill-violet">{tpl.name}</span>
                  <span className="pill"><i className="dot" style={{ background: acc.theme }} />{acc.name}</span>
                </div>
                <p className="small muted">{vcount} version{vcount === 1 ? '' : 's'} · Edited {timeAgo(r.updatedAt)}</p>
                <div className="rc-foot">
                  <a href={`/ats?resume=${r.id}`} onClick={(e) => { e.preventDefault(); navigate(`/ats?resume=${r.id}`); }} className={`ats-chip ${ats >= 75 ? 'good' : ats >= 50 ? 'ok' : 'low'}`} title="General ATS score (no job description). Click to check against a job.">ATS {ats}</a>
                  <div className="rc-actions">
                    <button type="button" className="icon-btn" aria-label={`Rename ${r.name}`} title="Rename" onClick={() => { setNewName(r.name); setRenaming(r); }}><Icon name="edit" size={16} /></button>
                    <button type="button" className="icon-btn" aria-label={`Duplicate ${r.name}`} title="Duplicate" onClick={async () => { await duplicateResume(r.id); toast('Resume duplicated'); }}><Icon name="copy" size={16} /></button>
                    <button type="button" className="icon-btn" aria-label={`Export ${r.name} as JSON Resume`} title="Export JSON Resume" onClick={() => download(`${slug(r.name)}.resume.json`, JSON.stringify(toJsonResume(r), null, 2))}><Icon name="download" size={16} /></button>
                    <button type="button" className="icon-btn danger" aria-label={`Delete ${r.name}`} title="Delete" onClick={() => setDeleting(r)}><Icon name="trash" size={16} /></button>
                  </div>
                </div>
                <a className="btn btn-outline btn-sm rc-open" href={`/resumes/${r.id}`} onClick={(e) => { e.preventDefault(); navigate(`/resumes/${r.id}`); }}><Icon name="edit" size={15} /> Edit</a>
              </div>
            </article>
          );
        })}
      </div>

      {renaming && (
        <Modal title="Rename resume" onClose={() => setRenaming(null)} footer={<>
          <button type="button" className="btn btn-ghost" onClick={() => setRenaming(null)}>Cancel</button>
          <button type="submit" form="rename-form" className="btn btn-primary">Save</button>
        </>}>
          <form id="rename-form" onSubmit={(e) => { e.preventDefault(); const n = newName.trim(); if (n) updateResume(renaming.id, (x) => ({ ...x, name: n })); setRenaming(null); }}>
            <label className="field"><span>Name</span><input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required /></label>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog title="Delete resume?" onClose={() => setDeleting(null)}
          message={<>“{deleting.name}” and all its saved versions will be permanently deleted from this device.</>}
          onConfirm={async () => { await deleteResume(deleting.id); toast('Resume deleted'); }} />
      )}
    </>
  );
}
