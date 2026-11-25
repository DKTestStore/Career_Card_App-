import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, MAX_VERSIONS } from '../lib/store';
import { linkClick, navigate } from '../lib/router';
import type { AccentId, Resume, ResumeContent, ResumeVersion, TemplateId } from '../lib/types';
import { ResumeDoc } from '../templates/ResumeDoc';
import { EditorForm } from '../components/EditorForm';
import { ResumeThumb } from '../components/ResumeGrid';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ACCENTS, ACCENT_IDS, TEMPLATES } from '../lib/themes';
import { atsChecks, toJsonResume, toPlainText } from '../lib/resume';
import { download, slug, timeAgo } from '../lib/util';

type Tab = 'edit' | 'preview' | 'design';

export function Editor({ id }: { id: string }) {
  const { resumes, updateResume, saveState, lastSaved, saveVersion, versions } = useStore();
  const resume = resumes.find((r) => r.id === id);
  const [tab, setTab] = useState<Tab>('edit');
  const toast = useToast();
  const [exportOpen, setExportOpen] = useState(false);

  const edit = useCallback((fn: (c: ResumeContent) => void) => {
    updateResume(id, (r) => { const c = structuredClone(r.content); fn(c); return { ...r, content: c }; });
  }, [id, updateResume]);

  const myVersions = useMemo(() => versions.filter((v) => v.resumeId === id).sort((a, b) => b.number - a.number), [versions, id]);

  if (!resume) {
    return (
      <div className="page"><div className="empty card">
        <h3>Resume not found</h3><p className="muted">It may have been deleted.</p>
        <a className="btn btn-primary" href="/resumes" onClick={linkClick}>Back to resumes</a>
      </div></div>
    );
  }

  const printPdf = () => {
    const prev = document.title;
    document.title = slug(resume.content.basics.name || resume.name);
    setExportOpen(false);
    setTimeout(() => { window.print(); document.title = prev; }, 50);
  };

  const status = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : lastSaved ? 'Saved' : 'All changes saved';
  const latest = myVersions[0];

  return (
    <div className="editor">
      <div className="ed-top">
        <a href="/resumes" onClick={linkClick} className="icon-btn" aria-label="Back to resumes"><Icon name="left" /></a>
        <div className="ed-title">
          <label htmlFor="resume-name" className="sr-only">Resume name</label>
          <input id="resume-name" className="ed-name" value={resume.name} onChange={(e) => updateResume(id, (r) => ({ ...r, name: e.target.value }))} />
          <span className={`save-ind ${saveState}`} role="status" aria-live="polite">
            <i />{status}{latest ? <span className="hide-sm"> · v{latest.number} of {MAX_VERSIONS}</span> : null}
          </span>
        </div>
        <div className="ed-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={async () => { const v = await saveVersion(id); if (v) toast(`Saved ${v.label}`); }} title="Save a snapshot you can restore later">
            <Icon name="save" size={16} /><span className="hide-sm">Save version</span>
          </button>
          <div className="menu-wrap">
            <button type="button" className="btn btn-primary btn-sm" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((o) => !o)}>
              <Icon name="download" size={16} /><span className="hide-sm">Export</span>
            </button>
            {exportOpen && <ExportMenu onClose={() => setExportOpen(false)} items={[
              { label: 'PDF (print → Save as PDF)', icon: 'printer', run: printPdf },
              { label: 'Plain text (.txt)', icon: 'file', run: () => { download(`${slug(resume.name)}.txt`, toPlainText(resume.content), 'text/plain'); setExportOpen(false); } },
              { label: 'JSON Resume (.json)', icon: 'download', run: () => { download(`${slug(resume.name)}.resume.json`, JSON.stringify(toJsonResume(resume), null, 2)); setExportOpen(false); } },
            ]} />}
          </div>
        </div>
      </div>

      <div className="ed-tabs" role="tablist" aria-label="Editor views">
        {(['edit', 'preview', 'design'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`pane-${t}`} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'edit' ? 'Edit' : t === 'preview' ? 'Preview' : <>Design<span className="hide-sm"> &amp; versions</span></>}
          </button>
        ))}
      </div>

      <div className="ed-cols" data-tab={tab}>
        <section className="ed-panel ed-form" id="pane-edit" role="tabpanel" aria-labelledby="tab-edit" aria-label="Sections">
          <div className="panel-head"><h2>Sections</h2><span className="muted small">Autosaves as you type</span></div>
          <div className="panel-scroll"><EditorForm c={resume.content} edit={edit} /></div>
        </section>
        <section className="ed-panel ed-preview" id="pane-preview" role="tabpanel" aria-labelledby="tab-preview" aria-label="Live preview">
          <div className="panel-head"><h2>Live preview</h2><span className="muted small">{TEMPLATES.find((t) => t.id === resume.template)?.name} · A4</span></div>
          <ScaledPreview resume={resume} />
        </section>
        <section className="ed-panel ed-design" id="pane-design" role="tabpanel" aria-labelledby="tab-design" aria-label="Design and versions">
          <div className="panel-head"><h2>Design &amp; versions</h2></div>
          <div className="panel-scroll"><DesignPanel resume={resume} versions={myVersions} /></div>
        </section>
      </div>

      {createPortal(<div className="print-root"><ResumeDoc resume={resume} /></div>, document.body)}
    </div>
  );
}

function ExportMenu({ items, onClose }: { items: { label: string; icon: string; run: () => void }[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onDoc = (e: MouseEvent) => { if (!ref.current?.parentElement?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="menu" role="menu" ref={ref}
      onKeyDown={(e) => {
        const btns = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length]?.focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
      }}>
      {items.map((it) => <button type="button" role="menuitem" key={it.label} onClick={it.run}><Icon name={it.icon} size={16} />{it.label}</button>)}
    </div>
  );
}

const A4W = 794, A4H = 1123;

function ScaledPreview({ resume }: { resume: Resume }) {
  const wrap = useRef<HTMLDivElement>(null);
  const doc = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [h, setH] = useState(A4H);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (wrap.current) setW(wrap.current.clientWidth);
      if (doc.current) setH(doc.current.offsetHeight);
    });
    if (wrap.current) ro.observe(wrap.current);
    if (doc.current) ro.observe(doc.current);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, (w - 32) / A4W);
  const pages = Math.max(1, Math.ceil((h - 2) / A4H));
  return (
    <div className="preview-scroll" ref={wrap}>
      <div className="preview-stage" style={{ width: A4W * scale, height: h * scale }}>
        <div ref={doc} className="preview-doc" style={{ transform: `scale(${scale})` }}>
          <ResumeDoc resume={resume} />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="page-break" style={{ top: A4H * (i + 1) }} aria-hidden="true"><span>Page {i + 2}</span></div>
          ))}
        </div>
      </div>
      {pages > 1 && <p className="small muted center">{pages} pages — most recruiters prefer 1–2.</p>}
    </div>
  );
}

function DesignPanel({ resume, versions }: { resume: Resume; versions: ResumeVersion[] }) {
  const { updateResume, saveVersion, restoreVersion, deleteVersion } = useStore();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [restoring, setRestoring] = useState<ResumeVersion | null>(null);
  const checks = useMemo(() => atsChecks(resume.content), [resume.content]);
  const setTpl = (t: TemplateId) => updateResume(resume.id, (r) => ({ ...r, template: t }));
  const setAcc = (a: AccentId) => updateResume(resume.id, (r) => ({ ...r, accent: a }));

  return (
    <div className="design">
      <h3 className="block-label" id="tpl-label">Template</h3>
      <div className="tpl-grid" role="radiogroup" aria-labelledby="tpl-label">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={resume.template === t.id} className={`tpl${resume.template === t.id ? ' active' : ''}`}
            onClick={() => setTpl(t.id)} title={t.blurb} data-template={t.id}>
            <ResumeThumb resume={{ ...resume, template: t.id }} scale={0.095} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      <h3 className="block-label" id="acc-label">Colour theme</h3>
      <div className="swatches" role="radiogroup" aria-labelledby="acc-label">
        {ACCENT_IDS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={resume.accent === a} aria-label={ACCENTS[a].name} title={ACCENTS[a].name}
            className={`swatch${resume.accent === a ? ' active' : ''}`} style={{ background: ACCENTS[a].theme }} onClick={() => setAcc(a)} />
        ))}
      </div>

      <div className="checks card-soft">
        <div className="checks-head">
          <h3 className="block-label">Quick ATS checks</h3>
          <span className={`ats-chip ${checks.score >= 75 ? 'good' : checks.score >= 50 ? 'ok' : 'low'}`}>{checks.score}%</span>
        </div>
        <ul>
          {checks.checks.map((c) => (
            <li key={c.label} className={c.ok ? 'ok' : 'no'}>
              <Icon name={c.ok ? 'check' : 'alert'} size={15} />
              <div><b>{c.label}</b>{!c.ok && <small>{c.tip}</small>}</div>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="block-label">Versions <span className="muted">({versions.length}/{MAX_VERSIONS})</span></h3>
      <form className="ver-form" onSubmit={async (e) => { e.preventDefault(); const v = await saveVersion(resume.id, label); setLabel(''); if (v) toast(`Saved ${v.label}`); }}>
        <label htmlFor="ver-label" className="sr-only">Version label</label>
        <input id="ver-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Tailored for Razorpay" />
        <button type="submit" className="btn btn-primary btn-sm"><Icon name="save" size={15} /> Save</button>
      </form>
      {versions.length === 0 ? <p className="small muted">No saved versions yet. Save one before tailoring for a job; you can restore it any time.</p> : (
        <ul className="ver-list">
          {versions.map((v) => (
            <li key={v.id}>
              <div><b>v{v.number} · {v.label}</b><small>{timeAgo(v.createdAt)} · {TEMPLATES.find((t) => t.id === v.snapshot.template)?.name}</small></div>
              <div className="mini-actions">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => setRestoring(v)} aria-label={`Restore version ${v.number}`}><Icon name="history" size={14} /> Restore</button>
                <button type="button" className="icon-btn xs danger" onClick={() => deleteVersion(v.id)} aria-label={`Delete version ${v.number}`}><Icon name="trash" size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {restoring && (
        <ConfirmDialog title={`Restore v${restoring.number}?`} confirmLabel="Restore" danger={false} onClose={() => setRestoring(null)}
          message={<>Your current content will be replaced by “{restoring.label}”. Tip: save a version first if you want to keep the current state.</>}
          onConfirm={async () => { await restoreVersion(restoring.id); toast(`Restored v${restoring.number}`); }} />
      )}
      <p className="small muted" style={{ marginTop: 16 }}>
        <a href="/tracker" onClick={(e) => { e.preventDefault(); navigate('/tracker'); }} className="link">Log an application</a> with this resume to track what you sent.
      </p>
    </div>
  );
}
