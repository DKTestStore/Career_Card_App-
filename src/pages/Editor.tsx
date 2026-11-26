import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore, MAX_VERSIONS } from '../lib/store';
import { linkClick, navigate, useQuery } from '../lib/router';
import type { FontId, Resume, ResumeContent, ResumeVersion } from '../lib/types';
import { ResumeDoc } from '../templates/ResumeDoc';
import { EditorForm, type Key } from '../components/EditorForm';
import { ResumeThumb } from '../components/ResumeGrid';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ACCENT_PRESETS, FONTS, accentById, resolveAccent } from '../lib/themes';
import { toJsonResume, toPlainText } from '../lib/resume';
import { templateById } from '../templates/registry';
import { analyze, type FixTarget } from '../lib/ats/score';
import { TemplateGallery } from '../components/TemplateGallery';
import { Gauge } from '../components/Gauge';
import { download, slug, timeAgo } from '../lib/util';

type Tab = 'edit' | 'preview' | 'design';

export function Editor({ id }: { id: string }) {
  const { resumes, updateResume, saveState, lastSaved, saveVersion, versions } = useStore();
  const resume = resumes.find((r) => r.id === id);
  const [tab, setTab] = useState<Tab>('edit');
  const toast = useToast();
  const [exportOpen, setExportOpen] = useState(false);
  const query = useQuery();
  const sectionParam = query.get('section');
  const [focus, setFocus] = useState<{ key: Key; n: number } | null>(null);
  const goFix = useCallback((t: FixTarget) => {
    if (t === 'design') { setTab('design'); document.getElementById('tpl-label')?.scrollIntoView({ behavior: 'smooth' }); return; }
    setTab('edit');
    setFocus({ key: t as Key, n: Date.now() });
  }, []);
  // /resumes/:id?section=skills (from the ATS page) opens and scrolls to that section.
  useEffect(() => {
    if (!sectionParam) return;
    const keys = ['basics', 'summary', 'work', 'education', 'projects', 'skills', 'certificates', 'awards', 'design'];
    if (keys.includes(sectionParam)) goFix(sectionParam as FixTarget);
    history.replaceState(null, '', location.pathname);
  }, [sectionParam, goFix]);

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

  const exportFile = async (kind: 'pdf' | 'docx') => {
    setExportOpen(false);
    toast(kind === 'pdf' ? 'Preparing PDF…' : 'Preparing Word document…');
    try {
      const name = kind === 'pdf'
        ? await (await import('../lib/export/pdf')).downloadResumePdf(resume)
        : await (await import('../lib/export/docx')).downloadResumeDocx(resume);
      toast(`Downloaded ${name}`);
    } catch (e) {
      console.error(e);
      toast('Export failed. Try Print / Save as PDF instead.');
    }
  };
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
              { label: 'PDF document (.pdf)', icon: 'download', run: () => exportFile('pdf') },
              { label: 'Word document (.docx)', icon: 'file', run: () => exportFile('docx') },
              { label: 'Print / Save as PDF (exact look)', icon: 'printer', run: printPdf },
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
          <div className="panel-scroll"><EditorForm c={resume.content} edit={edit} focus={focus} /></div>
        </section>
        <section className="ed-panel ed-preview" id="pane-preview" role="tabpanel" aria-labelledby="tab-preview" aria-label="Live preview">
          <div className="panel-head"><h2>Live preview</h2><span className="muted small">{templateById(resume.template).name} · A4</span></div>
          <ScaledPreview resume={resume} />
        </section>
        <section className="ed-panel ed-design" id="pane-design" role="tabpanel" aria-labelledby="tab-design" aria-label="Design and versions">
          <div className="panel-head"><h2>Design &amp; versions</h2></div>
          <div className="panel-scroll"><DesignPanel resume={resume} versions={myVersions} onFix={goFix} /></div>
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

function DesignPanel({ resume, versions, onFix }: { resume: Resume; versions: ResumeVersion[]; onFix: (t: FixTarget) => void }) {
  const { updateResume, saveVersion, restoreVersion, deleteVersion } = useStore();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [restoring, setRestoring] = useState<ResumeVersion | null>(null);
  const [gallery, setGallery] = useState(false);
  const ats = useMemo(() => analyze(resume), [resume]);
  const tpl = templateById(resume.template);
  const acc = resolveAccent(resume);
  const set = (patch: Partial<Resume>) => updateResume(resume.id, (r) => ({ ...r, ...patch }));

  return (
    <div className="design">
      <h3 className="block-label" id="tpl-label">Template</h3>
      <div className="tpl-current">
        <button type="button" className="tpl-cur-thumb" onClick={() => setGallery(true)} aria-label="Change template">
          <ResumeThumb resume={resume} scale={0.12} />
        </button>
        <div className="tpl-cur-info">
          <b data-testid="current-template">{tpl.name}</b>
          <span className={`tag ${tpl.ats ? 'tag-ats' : 'tag-design'}`}>{tpl.ats ? 'ATS-friendly' : 'Design-focused'}</span>
          <small className="muted">{tpl.blurb}</small>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setGallery(true)} data-testid="browse-templates">
            <Icon name="templates" size={15} /> Browse all templates
          </button>
        </div>
      </div>
      {gallery && <TemplateGallery resume={resume} onPick={(t) => set({ template: t })} onClose={() => setGallery(false)} />}

      <h3 className="block-label" id="acc-label">Colour theme <span className="muted">· {acc.name}</span></h3>
      <div className="swatches" role="radiogroup" aria-labelledby="acc-label">
        {ACCENT_PRESETS.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={resume.accent === a.id} aria-label={a.name} title={a.name}
            className={`swatch${resume.accent === a.id ? ' active' : ''}`} style={{ background: accentById(a.id).theme }} onClick={() => set({ accent: a.id })} />
        ))}
        <label className={`swatch swatch-custom${resume.accent === 'custom' ? ' active' : ''}`} title="Custom colour"
          style={resume.accent === 'custom' ? { background: acc.theme } : undefined}>
          <span className="sr-only">Custom colour</span>
          <input type="color" aria-label="Custom colour" value={resume.customColor ?? '#5B3DF5'}
            onChange={(e) => set({ accent: 'custom', customColor: e.target.value.toUpperCase() })} />
          {resume.accent !== 'custom' && <Icon name="plus" size={14} />}
        </label>
      </div>
      {resume.accent === 'custom' && acc.darkened && (
        <p className="small muted contrast-note" data-testid="contrast-note">Darkened to {acc.theme} for readable text (WCAG AA). Picked: {acc.base}.</p>
      )}

      <h3 className="block-label"><label htmlFor="font-pick">Font pairing</label></h3>
      <select id="font-pick" className="font-pick" value={resume.font ?? 'auto'} onChange={(e) => set({ font: e.target.value === 'auto' ? undefined : e.target.value as FontId })}>
        {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>

      <div className="checks card-soft ats-mini">
        <div className="checks-head">
          <h3 className="block-label">ATS score</h3>
          <a className="link small" href={`/ats?resume=${resume.id}`} onClick={linkClick}>Check against a job →</a>
        </div>
        <div className="ats-mini-row">
          <Gauge score={ats.score} size={120} />
          <ul className="ats-mini-bd">
            {ats.breakdown.map((b) => (
              <li key={b.key}><span>{b.label}</span><b>{Math.round(b.score)}/{b.max}</b></li>
            ))}
          </ul>
        </div>
        <ul>
          {ats.suggestions.slice(0, 5).map((x) => (
            <li key={x.id} className={x.severity === 'low' ? 'ok' : 'no'}>
              <span className={`sev sev-${x.severity}`}>{x.severity}</span>
              <div>{x.text} {x.target && <button type="button" className="link-btn" onClick={() => onFix(x.target!)}>Fix</button>}</div>
            </li>
          ))}
          {ats.suggestions.length === 0 && <li className="ok"><Icon name="check" size={15} /><div><b>Looks great.</b> Now check it against a real job description.</div></li>}
        </ul>
        <p className="small muted">General score without a job description. Keyword match is added on the ATS page.</p>
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
              <div><b>v{v.number} · {v.label}</b><small>{timeAgo(v.createdAt)} · {templateById(v.snapshot.template).name}</small></div>
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
