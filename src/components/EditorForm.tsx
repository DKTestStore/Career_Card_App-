import { useState, type ReactNode } from 'react';
import type { ResumeContent } from '../lib/types';
import { AutoTextarea, BulletList, EntryCard, Field, ListInput, MonthField } from './fields';
import { Icon } from './Icon';
import { fmtRange, move, uid } from '../lib/util';

type Edit = (fn: (c: ResumeContent) => void) => void;

type Key = 'basics' | 'summary' | 'work' | 'education' | 'projects' | 'skills' | 'certificates' | 'awards';

function Section({ k, label, count, open, toggle, children }: { k: Key; label: string; count?: number; open: boolean; toggle: (k: Key) => void; children: ReactNode }) {
  return (
    <section className={`acc${open ? ' open' : ''}`} aria-labelledby={`acc-${k}`}>
      <h3 className="acc-h">
        <button type="button" id={`acc-${k}`} aria-expanded={open} aria-controls={`acc-p-${k}`} onClick={() => toggle(k)}>
          <span>{label}</span>
          {count !== undefined && <span className="acc-count">{count}</span>}
          <Icon name="chevron" size={16} className="acc-chev" />
        </button>
      </h3>
      {open && <div className="acc-p" id={`acc-p-${k}`}>{children}</div>}
    </section>
  );
}

export function EditorForm({ c, edit }: { c: ResumeContent; edit: Edit }) {
  const [open, setOpen] = useState<Set<Key>>(new Set(['basics']));
  const toggle = (k: Key) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [fresh, setFresh] = useState<string | null>(null);
  const b = c.basics;

  /** Generic helpers for list sections */
  function listOps<K extends 'work' | 'education' | 'projects' | 'skills' | 'certificates' | 'awards'>(key: K) {
    return {
      move: (i: number, to: number) => edit((d) => { (d[key] as unknown[]) = move(d[key] as unknown[], i, to); }),
      remove: (i: number) => edit((d) => { (d[key] as unknown[]).splice(i, 1); }),
      set: (i: number, fn: (x: ResumeContent[K][number]) => void) => edit((d) => { fn((d[key] as ResumeContent[K][number][])[i]); }),
    };
  }
  const add = (key: Key, item: { id: string }) => { setFresh(item.id); edit((d) => { (d[key as 'work'] as unknown[]).push(item); }); setOpen((s) => new Set(s).add(key)); };

  const W = listOps('work'), E = listOps('education'), P = listOps('projects'), S = listOps('skills'), C = listOps('certificates'), A = listOps('awards');

  return (
    <div className="ed-form-inner">
      <Section k="basics" label="Contact" open={open.has('basics')} toggle={toggle}>
        <div className="grid2">
          <Field label="Full name" value={b.name} onChange={(v) => edit((d) => { d.basics.name = v; })} autoComplete="name" />
          <Field label="Headline" value={b.label} onChange={(v) => edit((d) => { d.basics.label = v; })} placeholder="e.g. Software Engineer" />
          <Field label="Email" type="email" value={b.email} onChange={(v) => edit((d) => { d.basics.email = v; })} autoComplete="email" />
          <Field label="Phone" type="tel" value={b.phone} onChange={(v) => edit((d) => { d.basics.phone = v; })} autoComplete="tel" />
          <Field label="City" value={b.location.city ?? ''} onChange={(v) => edit((d) => { d.basics.location.city = v; })} />
          <Field label="Country / region" value={b.location.countryCode ?? ''} onChange={(v) => edit((d) => { d.basics.location.countryCode = v; })} />
          <Field label="Website" className="span2" value={b.url} onChange={(v) => edit((d) => { d.basics.url = v; })} placeholder="yourname.dev" />
        </div>
        <fieldset className="bullets">
          <legend>Profiles (LinkedIn, GitHub, portfolio…)</legend>
          {b.profiles.map((p, i) => (
            <div className="profile-row" key={p.id}>
              <Field label="Network" value={p.network} onChange={(v) => edit((d) => { d.basics.profiles[i].network = v; })} placeholder="LinkedIn" />
              <Field label="URL" value={p.url} onChange={(v) => edit((d) => { d.basics.profiles[i].url = v; })} placeholder="linkedin.com/in/you" />
              <button type="button" className="icon-btn xs danger" onClick={() => edit((d) => { d.basics.profiles.splice(i, 1); })} aria-label={`Remove ${p.network || 'profile'}`}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <button type="button" className="add-link" onClick={() => edit((d) => { d.basics.profiles.push({ id: uid(), network: '', url: '' }); })}><Icon name="plus" size={15} /> Add profile</button>
        </fieldset>
      </Section>

      <Section k="summary" label="Professional summary" open={open.has('summary')} toggle={toggle}>
        <AutoTextarea label="Summary" rows={4} value={b.summary} onChange={(v) => edit((d) => { d.basics.summary = v; })} placeholder="2–4 sentences: who you are, your strengths, and what you’re looking for." />
        <small className="hint">{b.summary.trim().split(/\s+/).filter(Boolean).length} words</small>
      </Section>

      <Section k="work" label="Experience" count={c.work.length} open={open.has('work')} toggle={toggle}>
        {c.work.map((w, i) => (
          <EntryCard key={w.id} index={i} count={c.work.length} defaultOpen={fresh === w.id || (i === 0 && c.work.length === 1)}
            title={w.position || w.name || 'New role'} subtitle={[w.name, fmtRange(w.startDate, w.endDate)].filter(Boolean).join(' · ')}
            onMove={(to) => W.move(i, to)} onRemove={() => W.remove(i)}>
            <div className="grid2">
              <Field label="Job title" value={w.position} onChange={(v) => W.set(i, (x) => { x.position = v; })} />
              <Field label="Company" value={w.name} onChange={(v) => W.set(i, (x) => { x.name = v; })} />
              <Field label="Location" value={w.location ?? ''} onChange={(v) => W.set(i, (x) => { x.location = v; })} />
              <div />
              <MonthField label="Start" value={w.startDate} onChange={(v) => W.set(i, (x) => { x.startDate = v; })} />
              <div>
                <MonthField label="End" value={w.endDate} disabled={!w.endDate} onChange={(v) => W.set(i, (x) => { x.endDate = v; })} />
                <label className="check"><input type="checkbox" checked={!w.endDate} onChange={(e) => W.set(i, (x) => { x.endDate = e.target.checked ? '' : new Date().toISOString().slice(0, 7); })} /> I currently work here</label>
              </div>
            </div>
            <BulletList items={w.highlights} onChange={(v) => W.set(i, (x) => { x.highlights = v; })} label="Achievements & responsibilities" />
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('work', { id: uid(), name: '', position: '', location: '', startDate: '', endDate: '', highlights: [''] } as never)}><Icon name="plus" size={15} /> Add experience</button>
      </Section>

      <Section k="education" label="Education" count={c.education.length} open={open.has('education')} toggle={toggle}>
        {c.education.map((e, i) => (
          <EntryCard key={e.id} index={i} count={c.education.length} defaultOpen={fresh === e.id}
            title={e.institution || 'New education'} subtitle={[e.studyType, e.area].filter(Boolean).join(', ')}
            onMove={(to) => E.move(i, to)} onRemove={() => E.remove(i)}>
            <div className="grid2">
              <Field label="Institution" className="span2" value={e.institution} onChange={(v) => E.set(i, (x) => { x.institution = v; })} />
              <Field label="Degree" value={e.studyType} onChange={(v) => E.set(i, (x) => { x.studyType = v; })} placeholder="B.Tech" />
              <Field label="Field of study" value={e.area} onChange={(v) => E.set(i, (x) => { x.area = v; })} placeholder="Computer Science" />
              <MonthField label="Start" value={e.startDate} onChange={(v) => E.set(i, (x) => { x.startDate = v; })} />
              <MonthField label="End (or expected)" value={e.endDate} onChange={(v) => E.set(i, (x) => { x.endDate = v; })} />
              <Field label="Score / CGPA" value={e.score} onChange={(v) => E.set(i, (x) => { x.score = v; })} placeholder="CGPA 8.7 / 10" />
            </div>
            <ListInput label="Relevant coursework" value={e.courses} onChange={(v) => E.set(i, (x) => { x.courses = v; })} />
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('education', { id: uid(), institution: '', area: '', studyType: '', startDate: '', endDate: '', score: '', courses: [] } as never)}><Icon name="plus" size={15} /> Add education</button>
      </Section>

      <Section k="projects" label="Projects" count={c.projects.length} open={open.has('projects')} toggle={toggle}>
        {c.projects.map((p, i) => (
          <EntryCard key={p.id} index={i} count={c.projects.length} defaultOpen={fresh === p.id} title={p.name || 'New project'} subtitle={p.keywords.join(', ')}
            onMove={(to) => P.move(i, to)} onRemove={() => P.remove(i)}>
            <div className="grid2">
              <Field label="Project name" value={p.name} onChange={(v) => P.set(i, (x) => { x.name = v; })} />
              <Field label="Link" value={p.url ?? ''} onChange={(v) => P.set(i, (x) => { x.url = v; })} placeholder="github.com/you/project" />
            </div>
            <AutoTextarea label="Short description" value={p.description} onChange={(v) => P.set(i, (x) => { x.description = v; })} />
            <BulletList items={p.highlights} onChange={(v) => P.set(i, (x) => { x.highlights = v; })} label="Highlights" />
            <ListInput label="Tech / keywords" value={p.keywords} onChange={(v) => P.set(i, (x) => { x.keywords = v; })} />
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('projects', { id: uid(), name: '', description: '', url: '', highlights: [], keywords: [] } as never)}><Icon name="plus" size={15} /> Add project</button>
      </Section>

      <Section k="skills" label="Skills" count={c.skills.length} open={open.has('skills')} toggle={toggle}>
        {c.skills.map((s, i) => (
          <EntryCard key={s.id} index={i} count={c.skills.length} defaultOpen={fresh === s.id} title={s.name || 'Skill group'} subtitle={s.keywords.slice(0, 4).join(', ')}
            onMove={(to) => S.move(i, to)} onRemove={() => S.remove(i)}>
            <Field label="Group name" value={s.name} onChange={(v) => S.set(i, (x) => { x.name = v; })} placeholder="Languages" />
            <ListInput label="Skills" value={s.keywords} onChange={(v) => S.set(i, (x) => { x.keywords = v; })} placeholder="Python, TypeScript, SQL" />
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('skills', { id: uid(), name: '', keywords: [] } as never)}><Icon name="plus" size={15} /> Add skill group</button>
      </Section>

      <Section k="certificates" label="Certifications" count={c.certificates.length} open={open.has('certificates')} toggle={toggle}>
        {c.certificates.map((x0, i) => (
          <EntryCard key={x0.id} index={i} count={c.certificates.length} defaultOpen={fresh === x0.id} title={x0.name || 'New certification'} subtitle={x0.issuer}
            onMove={(to) => C.move(i, to)} onRemove={() => C.remove(i)}>
            <div className="grid2">
              <Field label="Certification" className="span2" value={x0.name} onChange={(v) => C.set(i, (x) => { x.name = v; })} />
              <Field label="Issuer" value={x0.issuer} onChange={(v) => C.set(i, (x) => { x.issuer = v; })} />
              <MonthField label="Date" value={x0.date} onChange={(v) => C.set(i, (x) => { x.date = v; })} />
            </div>
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('certificates', { id: uid(), name: '', issuer: '', date: '' } as never)}><Icon name="plus" size={15} /> Add certification</button>
      </Section>

      <Section k="awards" label="Achievements" count={c.awards.length} open={open.has('awards')} toggle={toggle}>
        {c.awards.map((x0, i) => (
          <EntryCard key={x0.id} index={i} count={c.awards.length} defaultOpen={fresh === x0.id} title={x0.title || 'New achievement'} subtitle={x0.awarder}
            onMove={(to) => A.move(i, to)} onRemove={() => A.remove(i)}>
            <div className="grid2">
              <Field label="Title" className="span2" value={x0.title} onChange={(v) => A.set(i, (x) => { x.title = v; })} />
              <Field label="Awarded by" value={x0.awarder} onChange={(v) => A.set(i, (x) => { x.awarder = v; })} />
              <MonthField label="Date" value={x0.date} onChange={(v) => A.set(i, (x) => { x.date = v; })} />
            </div>
            <AutoTextarea label="Details (optional)" value={x0.summary} onChange={(v) => A.set(i, (x) => { x.summary = v; })} />
          </EntryCard>
        ))}
        <button type="button" className="btn btn-soft btn-sm" onClick={() => add('awards', { id: uid(), title: '', awarder: '', date: '', summary: '' } as never)}><Icon name="plus" size={15} /> Add achievement</button>
      </Section>
    </div>
  );
}
