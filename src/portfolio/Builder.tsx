import { useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { linkClick, navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { AutoTextarea, EntryCard, Field, ListInput } from '../components/fields';
import { importFromResume, localView, newPortfolio, PORTFOLIO_ACCENTS, publicUrl, SECTION_LABELS, THEMES, themeDefaultAccent } from '../lib/portfolio/model';
import type { Portfolio, PortfolioData, PortfolioTheme, PProject, SectionKey } from '../lib/portfolio/types';
import { usePublish } from '../lib/portfolio/usePublish';
import { move, timeAgo, uid } from '../lib/util';
import { Avatar } from './PortfolioView';
import { ImagePick, ScaledSite, Switch } from './bits';
import { ProjectModal } from './ProjectModal';
import './builder.css';

type Tab = 'sections' | 'preview' | 'design';

export default function Builder() {
  const { portfolio } = useStore();
  if (!portfolio) return <StartScreen />;
  return <BuilderInner p={portfolio} />;
}

function StartScreen() {
  const { resumes, putPortfolio } = useStore();
  const [rid, setRid] = useState(resumes[0]?.id ?? '');
  const create = async (fromResume: boolean) => {
    const r = resumes.find((x) => x.id === rid);
    let p = newPortfolio('');
    if (fromResume && r) p = importFromResume(p, r);
    await putPortfolio(p);
  };
  return (
    <div className="page narrow">
      <div className="page-head"><div><h1>My Portfolio</h1><p className="muted">A public page for your projects, skills and experience — with a link and QR code to share.</p></div></div>
      <div className="card pad start-pf">
        <span className="start-ico"><Icon name="globe" size={22} /></span>
        <h2>Create your portfolio</h2>
        <p className="muted">Start from a résumé to pull in your experience, projects and skills, or start blank. Everything stays on this device until you publish.</p>
        {resumes.length > 0 && (
          <div className="field">
            <label htmlFor="start-resume">Résumé to import</label>
            <select id="start-resume" value={rid} onChange={(e) => setRid(e.target.value)}>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        <div className="btn-row">
          {resumes.length > 0 && <button type="button" className="btn btn-primary" onClick={() => create(true)} data-testid="pf-start-resume"><Icon name="download" size={16} />Start from résumé</button>}
          <button type="button" className={`btn ${resumes.length ? 'btn-outline' : 'btn-primary'}`} onClick={() => create(false)} data-testid="pf-start-blank"><Icon name="plus" size={16} />Start blank</button>
        </div>
      </div>
    </div>
  );
}

function BuilderInner({ p }: { p: Portfolio }) {
  const { resumes, updatePortfolio, saveState, lastSaved } = useStore();
  const [tab, setTab] = useState<Tab>('sections');
  const resume = resumes.find((r) => r.id === p.resumeId);
  const view = useMemo(() => localView(p, resume), [p, resume]);
  const url = publicUrl(p.slug);
  const live = Boolean(p.publish.publishedSlug);
  const status = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : lastSaved ? 'Saved' : 'All changes saved';

  return (
    <div className="editor pf-builder">
      <div className="ed-top">
        <a href="/" onClick={linkClick} className="icon-btn" aria-label="Back to dashboard"><Icon name="left" /></a>
        <div className="ed-title">
          <h1 className="pf-title">{p.data.about.name || 'My'} <span className="hide-sm">— Portfolio</span></h1>
          <span className={`save-ind ${saveState}`} role="status" aria-live="polite"><i />{status}</span>
          <span className={`pill ${live ? (p.publish.dirty ? 'pill-amber' : 'pill-teal') : ''}`} data-testid="pf-status">
            {live ? (p.publish.dirty ? 'Unpublished changes' : p.publish.visibility === 'public' ? 'Live' : p.publish.visibility === 'password' ? 'Live · password' : 'Private') : 'Draft'}
          </span>
        </div>
        <div className="ed-actions">
          <a className="btn btn-outline btn-sm" href="/portfolio/preview" onClick={linkClick}><Icon name="eye" size={16} /><span className="hide-sm">Preview</span></a>
          <a className="btn btn-primary btn-sm pf-share-btn" href="/portfolio/publish" onClick={linkClick} data-testid="pf-share"><Icon name="share" size={16} /><span>Share</span></a>
        </div>
      </div>

      <div className="ed-tabs" role="tablist" aria-label="Portfolio builder views">
        {(['sections', 'preview', 'design'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" id={`pftab-${t}`} aria-selected={tab === t} aria-controls={`pfpane-${t}`} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'sections' ? 'Sections' : t === 'preview' ? 'Preview' : 'Design'}
          </button>
        ))}
      </div>

      <div className="ed-cols pf-cols" data-tab={tab === 'sections' ? 'edit' : tab}>
        <section className="ed-panel ed-form" id="pfpane-sections" role="tabpanel" aria-labelledby="pftab-sections" aria-label="Sections">
          <div className="panel-head"><h2>Sections</h2><span className="muted small">Autosaves as you type</span></div>
          <div className="panel-scroll"><Sections p={p} update={updatePortfolio} /></div>
        </section>
        <section className="ed-panel ed-preview" id="pfpane-preview" role="tabpanel" aria-labelledby="pftab-preview" aria-label="Live preview">
          <div className="panel-head"><h2>Live preview</h2><span className="muted small">{THEMES.find((t) => t.id === p.theme)?.name} · {url.replace(/^https?:\/\//, '')}</span></div>
          <div className="panel-scroll pf-preview-scroll" data-testid="pf-preview"><ScaledSite p={view} url={url} /></div>
        </section>
        <section className="ed-panel ed-design" id="pfpane-design" role="tabpanel" aria-labelledby="pftab-design" aria-label="Design and publish">
          <div className="panel-head"><h2>Design &amp; publish</h2></div>
          <div className="panel-scroll"><DesignPanel p={p} /></div>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Sections ---------------- */

type Update = (fn: (p: Portfolio) => Portfolio) => void;

function Sections({ p, update }: { p: Portfolio; update: Update }) {
  const [open, setOpen] = useState<SectionKey | null>('about');
  const edit = (fn: (d: PortfolioData) => void) => update((x) => { const d = structuredClone(x.data); fn(d); return { ...x, data: d }; });
  const d = p.data;
  const counts: Partial<Record<SectionKey, number>> = {
    projects: d.projects.length, skills: d.skills.length, experience: d.experience.length, education: d.education.length,
    certifications: d.certifications.length, gallery: d.gallery.length, testimonials: d.testimonials.length,
  };
  const bodies: Record<SectionKey, ReactNode> = {
    about: <AboutForm p={p} edit={edit} />,
    projects: <ProjectsForm p={p} edit={edit} />,
    skills: <ListInput label="Skills" value={d.skills} onChange={(v) => edit((x) => { x.skills = v; })} placeholder="Python, TypeScript, MQTT…" />,
    experience: <ExperienceForm p={p} edit={edit} />,
    education: <EducationForm p={p} edit={edit} />,
    certifications: <CertsForm p={p} edit={edit} />,
    gallery: <GalleryForm p={p} edit={edit} />,
    testimonials: <TestimonialsForm p={p} edit={edit} />,
    contact: <ContactForm p={p} edit={edit} />,
  };
  return (
    <div className="ed-form-inner">
      {d.sections.map((s, i) => {
        const isOpen = open === s.key;
        return (
          <div className={`acc${isOpen ? ' open' : ''}${s.visible ? '' : ' hidden-sec'}`} key={s.key} data-section={s.key}>
            <div className="acc-h pf-acc-h">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.key)}>
                <Icon name={SEC_ICONS[s.key]} size={17} />{SECTION_LABELS[s.key]}
                {counts[s.key] !== undefined && <span className="acc-count">{counts[s.key]}</span>}
                {!s.visible && <span className="acc-count">Hidden</span>}
                <span className="acc-chev"><Icon name="chevron" size={16} /></span>
              </button>
              <div className="mini-actions">
                {s.key !== 'about' && <>
                  <button type="button" className="icon-btn xs" disabled={i <= 1} aria-label={`Move ${SECTION_LABELS[s.key]} up`} onClick={() => edit((x) => { x.sections = move(x.sections, i, i - 1); })}><Icon name="up" size={14} /></button>
                  <button type="button" className="icon-btn xs" disabled={i === d.sections.length - 1} aria-label={`Move ${SECTION_LABELS[s.key]} down`} onClick={() => edit((x) => { x.sections = move(x.sections, i, i + 1); })}><Icon name="down" size={14} /></button>
                </>}
                <button type="button" className="icon-btn xs" aria-pressed={!s.visible} aria-label={`${s.visible ? 'Hide' : 'Show'} ${SECTION_LABELS[s.key]} on the public page`} title={s.visible ? 'Shown on public page' : 'Hidden from public page'}
                  onClick={() => edit((x) => { x.sections = x.sections.map((y) => (y.key === s.key ? { ...y, visible: !y.visible } : y)); })}>
                  <Icon name={s.visible ? 'eye' : 'eyeOff'} size={14} />
                </button>
              </div>
            </div>
            {isOpen && <div className="acc-p">{bodies[s.key]}</div>}
          </div>
        );
      })}
    </div>
  );
}

const SEC_ICONS: Record<SectionKey, string> = {
  about: 'user', projects: 'templates', skills: 'target', experience: 'board', education: 'file', certifications: 'award', gallery: 'image', testimonials: 'quote', contact: 'mail',
};

type Edit = (fn: (d: PortfolioData) => void) => void;

function AboutForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const a = p.data.about;
  const set = (k: keyof PortfolioData['about']) => (v: string) => edit((d) => { d.about[k] = v; });
  return (
    <>
      <div className="photo-row">
        <Avatar name={a.name} photo={a.photo} size={56} />
        <ImagePick className="btn btn-outline btn-sm" label="Change photo" testId="photo-input" onPick={([u]) => edit((d) => { d.about.photo = u; })}><Icon name="image" size={15} />{a.photo ? 'Change photo' : 'Add photo'}</ImagePick>
        {a.photo && <button type="button" className="btn btn-ghost btn-xs" onClick={() => edit((d) => { d.about.photo = ''; })}>Remove</button>}
      </div>
      <Field label="Name" value={a.name} onChange={set('name')} autoComplete="name" />
      <Field label="Headline" value={a.headline} onChange={set('headline')} placeholder="Software Engineer · Backend & IoT" />
      <Field label="Open to (eyebrow)" value={a.openTo} onChange={set('openTo')} placeholder="Open to roles in Bengaluru & remote" />
      <AutoTextarea label="Short bio" value={a.bio} onChange={set('bio')} rows={3} />
      <div className="grid2">
        <Field label="Location" value={a.location} onChange={set('location')} />
        <Field label="Website" value={a.website} onChange={set('website')} />
      </div>
    </>
  );
}

function ProjectsForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const [editing, setEditing] = useState<{ project: PProject; isNew: boolean } | null>(null);
  const [del, setDel] = useState<PProject | null>(null);
  const list = p.data.projects;
  const save = (x: PProject) => edit((d) => {
    const i = d.projects.findIndex((y) => y.id === x.id);
    if (i >= 0) d.projects[i] = x; else d.projects.push(x);
  });
  return (
    <>
      {list.map((x, i) => (
        <div className="proj-row" key={x.id} data-testid="proj-row">
          <div className="proj-thumb">{x.cover ? <img src={x.cover} alt="" /> : <Icon name="image" size={16} />}</div>
          <button type="button" className="proj-main" onClick={() => setEditing({ project: x, isNew: false })}>
            <b>{x.title || 'Untitled'}</b><small>{[x.role, x.featured ? 'Featured' : ''].filter(Boolean).join(' · ') || 'Add details'}</small>
          </button>
          {x.featured && <Icon name="star" size={15} className="star" />}
          <div className="mini-actions">
            <button type="button" className="icon-btn xs" disabled={i === 0} aria-label={`Move ${x.title} up`} onClick={() => edit((d) => { d.projects = move(d.projects, i, i - 1); })}><Icon name="up" size={14} /></button>
            <button type="button" className="icon-btn xs" aria-label={`Edit ${x.title}`} onClick={() => setEditing({ project: x, isNew: false })}><Icon name="edit" size={14} /></button>
            <button type="button" className="icon-btn xs danger" aria-label={`Remove ${x.title}`} onClick={() => setDel(x)}><Icon name="trash" size={14} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-soft" data-testid="add-project" onClick={() => setEditing({ isNew: true, project: { id: uid(), title: '', role: '', tags: [], description: '', cover: '', gallery: [], github: '', demo: '', featured: list.length < 2 } })}>
        <Icon name="plus" size={16} />Add project
      </button>
      {editing && <ProjectModal project={editing.project} isNew={editing.isNew} onSave={save} onClose={() => setEditing(null)} />}
      {del && <ConfirmDialog title="Remove project?" message={`“${del.title || 'Untitled'}” will be removed from your portfolio.`} confirmLabel="Remove" onConfirm={() => edit((d) => { d.projects = d.projects.filter((y) => y.id !== del.id); })} onClose={() => setDel(null)} />}
    </>
  );
}

function ExperienceForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const list = p.data.experience;
  return (
    <>
      {list.length === 0 && <p className="muted small">Use <b>Import from résumé</b> in the right panel, or add roles here.</p>}
      {list.map((x, i) => (
        <EntryCard key={x.id} defaultOpen={!x.title && !x.company} title={x.title || 'New role'} subtitle={[x.company, [x.start, x.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')} index={i} count={list.length}
          onMove={(to) => edit((d) => { d.experience = move(d.experience, i, to); })} onRemove={() => edit((d) => { d.experience.splice(i, 1); })}>
          <div className="grid2">
            <Field label="Title" value={x.title} onChange={(v) => edit((d) => { d.experience[i].title = v; })} />
            <Field label="Company" value={x.company} onChange={(v) => edit((d) => { d.experience[i].company = v; })} />
            <Field label="From" value={x.start} onChange={(v) => edit((d) => { d.experience[i].start = v; })} placeholder="Jan 2023" />
            <Field label="To" value={x.end} onChange={(v) => edit((d) => { d.experience[i].end = v; })} placeholder="Present" />
          </div>
          <AutoTextarea label="Summary" value={x.summary} onChange={(v) => edit((d) => { d.experience[i].summary = v; })} />
        </EntryCard>
      ))}
      <button type="button" className="add-link" onClick={() => edit((d) => { d.experience.push({ id: uid(), title: '', company: '', start: '', end: '', summary: '' }); })}><Icon name="plus" size={15} />Add role</button>
    </>
  );
}

function EducationForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const list = p.data.education;
  return (
    <>
      {list.map((x, i) => (
        <EntryCard key={x.id} defaultOpen={!x.degree && !x.school} title={x.degree || x.school || 'New entry'} subtitle={x.school} index={i} count={list.length}
          onMove={(to) => edit((d) => { d.education = move(d.education, i, to); })} onRemove={() => edit((d) => { d.education.splice(i, 1); })}>
          <Field label="School" value={x.school} onChange={(v) => edit((d) => { d.education[i].school = v; })} />
          <Field label="Degree" value={x.degree} onChange={(v) => edit((d) => { d.education[i].degree = v; })} />
          <div className="grid2">
            <Field label="From" value={x.start} onChange={(v) => edit((d) => { d.education[i].start = v; })} />
            <Field label="To" value={x.end} onChange={(v) => edit((d) => { d.education[i].end = v; })} />
          </div>
          <Field label="Detail" value={x.detail} onChange={(v) => edit((d) => { d.education[i].detail = v; })} placeholder="CGPA 8.7 / 10" />
        </EntryCard>
      ))}
      <button type="button" className="add-link" onClick={() => edit((d) => { d.education.push({ id: uid(), school: '', degree: '', start: '', end: '', detail: '' }); })}><Icon name="plus" size={15} />Add education</button>
    </>
  );
}

function CertsForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const list = p.data.certifications;
  return (
    <>
      {list.map((x, i) => (
        <EntryCard key={x.id} defaultOpen={!x.name} title={x.name || 'New certification'} subtitle={[x.issuer, x.date].filter(Boolean).join(' · ')} index={i} count={list.length}
          onMove={(to) => edit((d) => { d.certifications = move(d.certifications, i, to); })} onRemove={() => edit((d) => { d.certifications.splice(i, 1); })}>
          <Field label="Name" value={x.name} onChange={(v) => edit((d) => { d.certifications[i].name = v; })} />
          <div className="grid2">
            <Field label="Issuer" value={x.issuer} onChange={(v) => edit((d) => { d.certifications[i].issuer = v; })} />
            <Field label="Date" value={x.date} onChange={(v) => edit((d) => { d.certifications[i].date = v; })} />
          </div>
          <Field label="Credential URL" value={x.url} onChange={(v) => edit((d) => { d.certifications[i].url = v; })} />
        </EntryCard>
      ))}
      <button type="button" className="add-link" onClick={() => edit((d) => { d.certifications.push({ id: uid(), name: '', issuer: '', date: '', url: '' }); })}><Icon name="plus" size={15} />Add certification</button>
    </>
  );
}

function GalleryForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const list = p.data.gallery;
  return (
    <>
      <div className="gal-edit">
        {list.map((g, i) => (
          <div className="gal-edit-item" key={g.id}>
            <img src={g.src} alt={g.caption || `Gallery image ${i + 1}`} />
            <label className="sr-only" htmlFor={`cap-${g.id}`}>Caption for image {i + 1}</label>
            <input id={`cap-${g.id}`} value={g.caption} placeholder="Caption" onChange={(e) => edit((d) => { d.gallery[i].caption = e.target.value; })} />
            <button type="button" className="gal-x" aria-label={`Remove image ${i + 1}`} onClick={() => edit((d) => { d.gallery.splice(i, 1); })}><Icon name="x" size={12} /></button>
          </div>
        ))}
      </div>
      {list.length < 12 && (
        <ImagePick className="btn btn-soft" multiple label="Add images to gallery" testId="gallery-input" onPick={(us) => edit((d) => { d.gallery.push(...us.map((src) => ({ id: uid(), src, caption: '' }))); d.gallery = d.gallery.slice(0, 12); })}>
          <Icon name="plus" size={16} />Add images
        </ImagePick>
      )}
      <p className="hint">Images are resized to 1600 px and compressed on this device.</p>
    </>
  );
}

function TestimonialsForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const list = p.data.testimonials;
  return (
    <>
      {list.map((x, i) => (
        <EntryCard key={x.id} defaultOpen={!x.name && !x.quote} title={x.name || 'New testimonial'} subtitle={x.role} index={i} count={list.length}
          onMove={(to) => edit((d) => { d.testimonials = move(d.testimonials, i, to); })} onRemove={() => edit((d) => { d.testimonials.splice(i, 1); })}>
          <AutoTextarea label="Quote" value={x.quote} onChange={(v) => edit((d) => { d.testimonials[i].quote = v; })} rows={3} />
          <div className="grid2">
            <Field label="Name" value={x.name} onChange={(v) => edit((d) => { d.testimonials[i].name = v; })} />
            <Field label="Role" value={x.role} onChange={(v) => edit((d) => { d.testimonials[i].role = v; })} placeholder="Manager, Nimbus Labs" />
          </div>
        </EntryCard>
      ))}
      <button type="button" className="add-link" onClick={() => edit((d) => { d.testimonials.push({ id: uid(), quote: '', name: '', role: '' }); })}><Icon name="plus" size={15} />Add testimonial</button>
    </>
  );
}

function ContactForm({ p, edit }: { p: Portfolio; edit: Edit }) {
  const c = p.data.contact;
  const set = (k: 'email' | 'phone' | 'linkedin' | 'github' | 'website' | 'twitter') => (v: string) => edit((d) => { d.contact[k] = v; if (k === 'email') d.about.email = v; if (k === 'phone') d.about.phone = v; });
  return (
    <>
      <div className="grid2">
        <Field label="Email" value={c.email} onChange={set('email')} type="email" />
        <Field label="Phone" value={c.phone} onChange={set('phone')} type="tel" hint={p.publish.hidePhone ? 'Hidden on the public page (Share settings)' : undefined} />
        <Field label="LinkedIn" value={c.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/you" />
        <Field label="GitHub" value={c.github} onChange={set('github')} placeholder="github.com/you" />
        <Field label="Website" value={c.website} onChange={set('website')} />
        <Field label="X / Twitter" value={c.twitter} onChange={set('twitter')} />
      </div>
      <label className="check"><input type="checkbox" checked={c.showForm} onChange={(e) => edit((d) => { d.contact.showForm = e.target.checked; })} />Show a contact form (opens the visitor’s email app)</label>
    </>
  );
}

/* ---------------- Design & publish ---------------- */

function DesignPanel({ p }: { p: Portfolio }) {
  const { resumes, updatePortfolio } = useStore();
  const toast = useToast();
  const { publish, unpublish, busy } = usePublish();
  const [rid, setRid] = useState(p.resumeId || resumes[0]?.id || '');
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const live = Boolean(p.publish.publishedSlug);
  const setTheme = (t: PortfolioTheme) => updatePortfolio((x) => ({ ...x, theme: t, accent: x.accent.toLowerCase() === themeDefaultAccent(x.theme).toLowerCase() ? themeDefaultAccent(t) : x.accent }), true);
  const doImport = () => {
    const r = resumes.find((x) => x.id === rid);
    if (!r) return;
    updatePortfolio((x) => importFromResume(x, r));
    toast(`Imported from “${r.name}”`);
  };
  const toggleLive = async (on: boolean) => {
    if (!on) { setConfirmOff(true); return; }
    if (p.publish.visibility === 'password' && !p.publish.passwordSet) { navigate('/portfolio/publish'); return; }
    const err = await publish();
    toast(err ?? 'Your portfolio is live');
  };

  return (
    <div className="design">
      <h3 className="block-label">Portfolio theme</h3>
      <div className="theme-grid" role="radiogroup" aria-label="Portfolio theme">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={p.theme === t.id} className={`theme-card${p.theme === t.id ? ' active' : ''}`} onClick={() => setTheme(t.id)} data-theme-id={t.id}>
            <ThemeThumb theme={t.id} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
      <a className="btn btn-outline btn-sm full-w" href="/portfolio/themes" onClick={linkClick}><Icon name="templates" size={15} />Browse all themes</a>

      <h3 className="block-label" style={{ marginTop: 18 }}>Accent colour</h3>
      <div className="swatches" role="radiogroup" aria-label="Accent colour">
        {PORTFOLIO_ACCENTS.map((a) => (
          <button key={a.hex} type="button" role="radio" aria-checked={p.accent.toLowerCase() === a.hex.toLowerCase()} aria-label={a.name} title={a.name}
            className={`swatch${p.accent.toLowerCase() === a.hex.toLowerCase() ? ' active' : ''}`} style={{ background: a.hex }} onClick={() => updatePortfolio((x) => ({ ...x, accent: a.hex }), true)} />
        ))}
        <label className="swatch swatch-custom" title="Custom colour">
          <span className="sr-only">Custom accent colour</span>
          <input type="color" value={p.accent} onChange={(e) => updatePortfolio((x) => ({ ...x, accent: e.target.value }))} />
        </label>
      </div>

      <h3 className="block-label">Import</h3>
      {resumes.length ? (
        <div className="card-soft import-box">
          <div className="field">
            <label htmlFor="import-resume">From résumé</label>
            <select id="import-resume" value={rid} onChange={(e) => setRid(e.target.value)}>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setConfirmImport(true)} data-testid="import-resume"><Icon name="download" size={15} />Import from résumé</button>
          <small className="hint">Fills About, Projects, Skills, Experience, Education, Certifications and Contact. Photos, gallery and testimonials are kept.</small>
        </div>
      ) : <p className="muted small">Create a résumé first to import from it.</p>}

      <h3 className="block-label" style={{ marginTop: 18 }}>Publish</h3>
      <div className="card-soft publish-box">
        <div className="setting-row">
          <div><b>Live on the web</b><small>{live ? (p.publish.visibility === 'private' ? 'Address reserved · page is private' : 'Anyone with the link can view') : 'Only you can see it on this device'}</small></div>
          <Switch checked={live} disabled={busy} onChange={toggleLive} label="Live on the web" id="pf-live" />
        </div>
        {live && <a className="link pf-url" href={`/p/${p.publish.publishedSlug}`} target="_blank" rel="noopener">{location.host}/p/{p.publish.publishedSlug}</a>}
        {live && p.publish.dirty && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={async () => toast((await publish()) ?? 'Changes published')} data-testid="publish-changes">
            <Icon name="upload" size={15} />Publish changes
          </button>
        )}
        {live && p.publish.lastPublishedAt && <small className="hint">Last published {timeAgo(p.publish.lastPublishedAt)}</small>}
        <a className="btn btn-outline btn-sm" href="/portfolio/publish" onClick={linkClick}><Icon name="settings" size={15} />Share &amp; settings</a>
      </div>

      {confirmImport && <ConfirmDialog title="Import from résumé?" danger={false} confirmLabel="Import"
        message="This replaces About, Projects, Skills, Experience, Education, Certifications and Contact with the résumé’s content. Project images, the gallery and testimonials are kept."
        onConfirm={doImport} onClose={() => setConfirmImport(false)} />}
      {confirmOff && <ConfirmDialog title="Unpublish portfolio?" confirmLabel="Unpublish"
        message="The public link will stop working and the copy on the server is deleted. Your portfolio stays on this device."
        onConfirm={async () => { const err = await unpublish(); toast(err ?? 'Portfolio unpublished'); }} onClose={() => setConfirmOff(false)} />}
    </div>
  );
}

export function ThemeThumb({ theme }: { theme: PortfolioTheme }) {
  return (
    <span className={`theme-thumb tt-${theme}`} aria-hidden="true">
      <i className="tt-bar" /><i className="tt-title" /><i className="tt-line" /><i className="tt-card a" /><i className="tt-card b" />
    </span>
  );
}
