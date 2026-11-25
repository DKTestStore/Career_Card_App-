import type { CSSProperties, ReactNode } from 'react';
import type { Resume, ResumeContent } from '../lib/types';
import { FONTS, resolveAccent } from '../lib/themes';
import { fmtMonth, fmtRange, initials } from '../lib/util';
import { templateById, type GenericConfig } from './registry';
import { Generic } from './Generic';
import './resume.css';
import './generic.css';

type Props = { resume: Pick<Resume, 'template' | 'accent' | 'content' | 'customColor' | 'font'>; id?: string };

export function ResumeDoc({ resume, id }: Props) {
  const a = resolveAccent(resume);
  const f = FONTS.find((x) => x.id === resume.font);
  const style = {
    '--theme': a.theme, '--sidebar': a.sidebar, '--theme-soft': a.soft,
    ...(f?.head ? { '--r-head': f.head, '--r-body': f.body } : {}),
  } as CSSProperties;
  const c = resume.content;
  const def = templateById(resume.template);
  const cfg: GenericConfig | undefined = def.config;
  const cls = cfg ? genericClasses(cfg) : `rdoc-${def.id}`;
  return (
    <article id={id} className={`rdoc ${cls}`} style={style} aria-label="Resume preview" data-tpl={def.id}>
      {cfg ? <Generic c={c} cfg={cfg} /> : def.id === 'executive' ? <Executive c={c} /> : def.id === 'elegant' ? <Elegant c={c} /> : <Modern c={c} />}
    </article>
  );
}

function genericClasses(cfg: GenericConfig): string {
  const sideDark = cfg.layout === 'sidebar' && cfg.sideStyle === 'dark';
  return [
    'rdoc-generic', `g-l-${cfg.layout}`, `g-hd-${cfg.header}`, `g-h-${cfg.head}`, `g-f-${cfg.font}`, `g-d-${cfg.density}`,
    cfg.layout === 'sidebar' ? `g-side-${cfg.side ?? 'left'} g-ss-${cfg.sideStyle ?? 'tint'}` : '',
    sideDark ? 'g-dark' : '', cfg.mono ? 'g-mono' : '', cfg.timeline ? 'g-timeline' : '',
  ].filter(Boolean).join(' ');
}

const loc = (c: ResumeContent) => [c.basics.location.city, c.basics.location.region, c.basics.location.countryCode].filter(Boolean).join(', ');

function contactItems(c: ResumeContent): string[] {
  const b = c.basics;
  return [loc(c), b.email, b.phone, b.url, ...b.profiles.map((p) => p.url || [p.network, p.username].filter(Boolean).join(': '))].filter(Boolean);
}

function Sec({ title, children, show = true }: { title: string; children: ReactNode; show?: boolean }) {
  if (!show) return null;
  return <section className="r-sec"><h2 className="r-h">{title}</h2>{children}</section>;
}

function Bullets({ items }: { items: string[] }) {
  const xs = items.filter((x) => x.trim());
  if (!xs.length) return null;
  return <ul className="r-ul">{xs.map((h, i) => <li key={i}>{h}</li>)}</ul>;
}

function MainSections({ c, skillsInMain = false, eduInMain = true }: { c: ResumeContent; skillsInMain?: boolean; eduInMain?: boolean }) {
  return (
    <>
      <Sec title="Professional Summary" show={!!c.basics.summary.trim()}><p className="r-sum">{c.basics.summary}</p></Sec>
      <Sec title="Experience" show={c.work.length > 0}>
        {c.work.map((w) => (
          <div className="r-item" key={w.id}>
            <div className="r-row">
              <div className="r-title">{w.position}{w.name && <span className="r-org">{w.position ? ' · ' : ''}{w.name}</span>}{w.location && <span className="r-loc">, {w.location}</span>}</div>
              <div className="r-dates">{fmtRange(w.startDate, w.endDate)}</div>
            </div>
            {w.summary && <p className="r-p">{w.summary}</p>}
            <Bullets items={w.highlights} />
          </div>
        ))}
      </Sec>
      <Sec title="Projects" show={c.projects.length > 0}>
        {c.projects.map((p) => (
          <div className="r-item" key={p.id}>
            <div className="r-row">
              <div className="r-title">{p.name}{p.url && <span className="r-loc"> · {p.url}</span>}</div>
              <div className="r-dates">{fmtRange(p.startDate, p.endDate, false)}</div>
            </div>
            {p.description && <p className="r-p">{p.description}</p>}
            <Bullets items={p.highlights} />
            {p.keywords.length > 0 && <p className="r-kw">{p.keywords.join(' · ')}</p>}
          </div>
        ))}
      </Sec>
      {eduInMain && <EducationBlock c={c} />}
      {skillsInMain && <Sec title="Skills" show={c.skills.length > 0}>
        {c.skills.map((s) => <p className="r-p" key={s.id}><b>{s.name}{s.keywords.length ? ': ' : ''}</b>{s.keywords.join(', ')}</p>)}
      </Sec>}
      <Sec title="Certifications" show={c.certificates.length > 0}>
        {c.certificates.map((x) => (
          <div className="r-row r-line" key={x.id}><div><b>{x.name}</b>{x.issuer && <span className="r-org"> · {x.issuer}</span>}</div><div className="r-dates">{fmtMonth(x.date)}</div></div>
        ))}
      </Sec>
      <Sec title="Achievements" show={c.awards.length > 0}>
        {c.awards.map((x) => (
          <div className="r-item r-item-tight" key={x.id}>
            <div className="r-row"><div><b>{x.title}</b>{x.awarder && <span className="r-org"> · {x.awarder}</span>}</div><div className="r-dates">{fmtMonth(x.date)}</div></div>
            {x.summary && <p className="r-p">{x.summary}</p>}
          </div>
        ))}
      </Sec>
    </>
  );
}

function EducationBlock({ c, compact = false }: { c: ResumeContent; compact?: boolean }) {
  return (
    <Sec title="Education" show={c.education.length > 0}>
      {c.education.map((e) => (
        <div className="r-item r-item-tight" key={e.id}>
          {compact ? (
            <>
              <div className="r-edu-deg">{[e.studyType, e.area].filter(Boolean).join(', ')}</div>
              <div>{e.institution}</div>
              <div className="r-muted">{[fmtRange(e.startDate, e.endDate, false), e.score].filter(Boolean).join(' · ')}</div>
            </>
          ) : (
            <>
              <div className="r-row">
                <div className="r-title">{[e.studyType, e.area].filter(Boolean).join(', ')}{e.institution && <span className="r-org"> · {e.institution}</span>}</div>
                <div className="r-dates">{fmtRange(e.startDate, e.endDate, false)}</div>
              </div>
              {e.score && <p className="r-p">{e.score}</p>}
            </>
          )}
          {e.courses.length > 0 && <p className="r-kw">Coursework: {e.courses.join(', ')}</p>}
        </div>
      ))}
    </Sec>
  );
}

function Executive({ c }: { c: ResumeContent }) {
  const b = c.basics;
  return (
    <div className="ex">
      <aside className="ex-side">
        <div className="ex-mono">{initials(b.name)}</div>
        <div className="ex-name">{b.name || 'Your Name'}</div>
        {b.label && <div className="ex-role">{b.label}</div>}
        <h3 className="ex-h">Contact</h3>
        {contactItems(c).map((x, i) => <div className="ex-ci" key={i}>{x}</div>)}
        {c.skills.length > 0 && <>
          <h3 className="ex-h">Skills</h3>
          {c.skills.map((s) => (
            <div key={s.id} className="ex-skill">
              {s.name && c.skills.length > 1 && <div className="ex-skn">{s.name}</div>}
              <div className="ex-pills">{(s.keywords.length ? s.keywords : [s.name]).map((k, i) => <span key={i}>{k}</span>)}</div>
            </div>
          ))}
        </>}
        {c.education.length > 0 && <>
          <h3 className="ex-h">Education</h3>
          {c.education.map((e) => (
            <div className="ex-ci ex-edu" key={e.id}>
              <b>{[e.studyType, e.area].filter(Boolean).join(', ')}</b>
              <div>{e.institution}</div>
              <div className="ex-dim">{[fmtRange(e.startDate, e.endDate, false), e.score].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
        </>}
      </aside>
      <div className="ex-main"><MainSections c={c} eduInMain={false} /></div>
    </div>
  );
}

function Elegant({ c }: { c: ResumeContent }) {
  const b = c.basics;
  return (
    <div className="el">
      <header className="el-head">
        <div className="el-name">{b.name || 'Your Name'}</div>
        {b.label && <div className="el-role">{b.label}</div>}
        <div className="el-rule" />
      </header>
      <div className="el-body">
        <aside className="el-side">
          <h3 className="el-h">Contact</h3>
          {contactItems(c).map((x, i) => <div className="el-ci" key={i}>{x}</div>)}
          {c.skills.length > 0 && <>
            <h3 className="el-h">Skills</h3>
            {c.skills.map((s) => (
              <div className="el-ci" key={s.id}>{s.name && <b>{s.name}</b>}<div>{s.keywords.join(', ')}</div></div>
            ))}
          </>}
          <EducationBlock c={c} compact />
        </aside>
        <div className="el-main"><MainSections c={c} eduInMain={false} /></div>
      </div>
    </div>
  );
}

function Modern({ c }: { c: ResumeContent }) {
  const b = c.basics;
  return (
    <div className="mo">
      <div className="mo-accent" />
      <header className="mo-head">
        <div className="mo-name">{b.name || 'Your Name'}</div>
        {b.label && <div className="mo-title">{b.label}</div>}
        <div className="mo-contact">{contactItems(c).join('  ·  ')}</div>
      </header>
      <MainSections c={c} skillsInMain />
    </div>
  );
}
