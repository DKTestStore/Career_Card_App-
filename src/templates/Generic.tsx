import type { ReactNode } from 'react';
import type { ResumeContent, Skill } from '../lib/types';
import { fmtMonth, fmtRange, initials } from '../lib/util';
import type { GenericConfig, SectionKey } from './registry';

const DEFAULT_ORDER: SectionKey[] = ['summary', 'work', 'projects', 'education', 'skills', 'certificates', 'awards'];
const TITLES: Record<SectionKey, string> = {
  summary: 'Summary', work: 'Experience', projects: 'Projects', education: 'Education', skills: 'Skills', certificates: 'Certifications', awards: 'Achievements',
};

const loc = (c: ResumeContent) => [c.basics.location.city, c.basics.location.region, c.basics.location.countryCode].filter(Boolean).join(', ');
function contacts(c: ResumeContent): string[] {
  const b = c.basics;
  return [loc(c), b.email, b.phone, b.url, ...b.profiles.map((p) => p.url || [p.network, p.username].filter(Boolean).join(': '))].filter(Boolean);
}

export function skillLevel(level?: string): number {
  const l = (level ?? '').toLowerCase().trim();
  const n = parseFloat(l);
  if (!isNaN(n)) return Math.max(10, Math.min(100, n <= 10 ? n * 10 : n));
  if (/expert|master|native/.test(l)) return 95;
  if (/advanced|proficient|fluent/.test(l)) return 85;
  if (/intermediate|working/.test(l)) return 65;
  if (/beginner|basic|novice|learning/.test(l)) return 40;
  return 75;
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="r-sec">
      <h2 className="r-h"><span>{title}</span></h2>
      <div className="r-body">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  const xs = items.filter((x) => x.trim());
  if (!xs.length) return null;
  return <ul className="r-ul">{xs.map((h, i) => <li key={i}>{h}</li>)}</ul>;
}

function has(c: ResumeContent, k: SectionKey): boolean {
  switch (k) {
    case 'summary': return !!c.basics.summary.trim();
    case 'work': return c.work.length > 0;
    case 'projects': return c.projects.length > 0;
    case 'education': return c.education.length > 0;
    case 'skills': return c.skills.length > 0;
    case 'certificates': return c.certificates.length > 0;
    case 'awards': return c.awards.length > 0;
  }
}

function SkillsBlock({ skills, mode }: { skills: Skill[]; mode: GenericConfig['skills'] }) {
  if (mode === 'chips') {
    return <>{skills.map((s) => (
      <div className="g-skill" key={s.id}>
        {s.name && <div className="g-skn">{s.name}</div>}
        <div className="g-chips">{(s.keywords.length ? s.keywords : [s.name]).map((k, i) => <span key={i}>{k}</span>)}</div>
      </div>
    ))}</>;
  }
  if (mode === 'bars') {
    return <>{skills.map((s) => (
      <div className="g-skill g-bar-row" key={s.id}>
        <div className="g-bar-top"><b>{s.name || s.keywords[0]}</b>{s.level && <small>{s.level}</small>}</div>
        <div className="g-bar" role="img" aria-label={`${s.name} ${s.level || ''}`.trim()}><i style={{ width: `${skillLevel(s.level)}%` }} /></div>
        {s.keywords.length > 0 && <div className="g-bar-kw">{s.keywords.join(', ')}</div>}
      </div>
    ))}</>;
  }
  if (mode === 'list') {
    return <ul className="r-ul g-skill-list">{skills.map((s) => <li key={s.id}><b>{s.name}</b>{s.keywords.length ? `: ${s.keywords.join(', ')}` : ''}</li>)}</ul>;
  }
  return <>{skills.map((s) => <p className="r-p" key={s.id}><b>{s.name}{s.keywords.length && s.name ? ': ' : ''}</b>{s.keywords.join(', ')}</p>)}</>;
}

function Section({ k, c, cfg, compact }: { k: SectionKey; c: ResumeContent; cfg: GenericConfig; compact?: boolean }) {
  if (!has(c, k)) return null;
  const title = cfg.labels?.[k] ?? TITLES[k];
  switch (k) {
    case 'summary':
      return <Sec title={title}><p className="r-sum">{c.basics.summary}</p></Sec>;
    case 'work':
      return (
        <Sec title={title}>
          <div className="g-items">
            {c.work.map((w) => (
              <div className="r-item g-item" key={w.id}>
                <div className="r-row">
                  <div className="r-title">{w.position}{w.name && <span className="r-org">{w.position ? ' · ' : ''}{w.name}</span>}{w.location && <span className="r-loc">, {w.location}</span>}</div>
                  <div className="r-dates">{fmtRange(w.startDate, w.endDate)}</div>
                </div>
                {w.summary && <p className="r-p">{w.summary}</p>}
                <Bullets items={w.highlights} />
              </div>
            ))}
          </div>
        </Sec>
      );
    case 'projects':
      return (
        <Sec title={title}>
          <div className="g-items">
            {c.projects.map((p) => (
              <div className="r-item g-item" key={p.id}>
                <div className="r-row">
                  <div className="r-title">{p.name}{p.url && <span className="r-loc"> · {p.url}</span>}</div>
                  <div className="r-dates">{fmtRange(p.startDate, p.endDate, false)}</div>
                </div>
                {p.description && <p className="r-p">{p.description}</p>}
                <Bullets items={p.highlights} />
                {p.keywords.length > 0 && <p className="r-kw">{p.keywords.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </Sec>
      );
    case 'education':
      return (
        <Sec title={title}>
          {c.education.map((e) => compact ? (
            <div className="r-item r-item-tight" key={e.id}>
              <div className="g-edu-deg">{[e.studyType, e.area].filter(Boolean).join(', ')}</div>
              <div>{e.institution}</div>
              <div className="g-dim">{[fmtRange(e.startDate, e.endDate, false), e.score].filter(Boolean).join(' · ')}</div>
            </div>
          ) : (
            <div className="r-item r-item-tight" key={e.id}>
              <div className="r-row">
                <div className="r-title">{[e.studyType, e.area].filter(Boolean).join(', ')}{e.institution && <span className="r-org"> · {e.institution}</span>}</div>
                <div className="r-dates">{fmtRange(e.startDate, e.endDate, false)}</div>
              </div>
              {e.score && <p className="r-p">{e.score}</p>}
              {e.courses.length > 0 && <p className="r-kw">Coursework: {e.courses.join(', ')}</p>}
            </div>
          ))}
        </Sec>
      );
    case 'skills':
      return <Sec title={title}><SkillsBlock skills={c.skills} mode={cfg.skills} /></Sec>;
    case 'certificates':
      return (
        <Sec title={title}>
          {c.certificates.map((x) => compact ? (
            <div className="r-item r-item-tight" key={x.id}><b>{x.name}</b><div className="g-dim">{[x.issuer, fmtMonth(x.date)].filter(Boolean).join(' · ')}</div></div>
          ) : (
            <div className="r-row r-line" key={x.id}><div><b>{x.name}</b>{x.issuer && <span className="r-org"> · {x.issuer}</span>}</div><div className="r-dates">{fmtMonth(x.date)}</div></div>
          ))}
        </Sec>
      );
    case 'awards':
      return (
        <Sec title={title}>
          {c.awards.map((x) => (
            <div className="r-item r-item-tight" key={x.id}>
              <div className="r-row"><div><b>{x.title}</b>{x.awarder && <span className="r-org"> · {x.awarder}</span>}</div><div className="r-dates">{fmtMonth(x.date)}</div></div>
              {x.summary && <p className="r-p">{x.summary}</p>}
            </div>
          ))}
        </Sec>
      );
  }
}

function Header({ c, cfg, inSide }: { c: ResumeContent; cfg: GenericConfig; inSide?: boolean }) {
  const b = c.basics;
  const cs = contacts(c);
  const name = b.name || 'Your Name';
  if (inSide) {
    return (
      <header className="g-head g-head-side">
        {(cfg.header === 'initials' || cfg.sideStyle === 'dark') && <div className="g-mono-ini">{initials(b.name)}</div>}
        <div className="g-name">{name}</div>
        {b.label && <div className="g-label">{b.label}</div>}
      </header>
    );
  }
  if (cfg.header === 'split') {
    return (
      <header className="g-head g-head-split">
        <div><div className="g-name">{name}</div>{b.label && <div className="g-label">{b.label}</div>}</div>
        <div className="g-contact-col">{cs.map((x, i) => <div key={i}>{x}</div>)}</div>
      </header>
    );
  }
  return (
    <header className={`g-head g-head-${cfg.header}`}>
      {cfg.header === 'initials' && <div className="g-mono-ini">{initials(b.name)}</div>}
      <div className="g-head-text">
        <div className="g-name">{name}</div>
        {b.label && <div className="g-label">{b.label}</div>}
        {cs.length > 0 && <div className="g-contact">{cs.map((x, i) => <span key={i}>{x}</span>)}</div>}
      </div>
    </header>
  );
}

export function Generic({ c, cfg }: { c: ResumeContent; cfg: GenericConfig }) {
  const order = cfg.order ?? DEFAULT_ORDER;
  if (cfg.layout !== 'sidebar') {
    return (
      <div className="g-wrap">
        <Header c={c} cfg={cfg} />
        <div className="g-main">{order.map((k) => <Section key={k} k={k} c={c} cfg={cfg} />)}</div>
      </div>
    );
  }
  // Sidebar layouts: skills / education / certifications move to the side.
  const sideKeys: SectionKey[] = ['skills', 'education', 'certificates'];
  const mainKeys = order.filter((k) => !sideKeys.includes(k));
  const headerInSide = cfg.sideStyle === 'dark' || cfg.header === 'initials';
  const cs = contacts(c);
  const side = (
    <aside className="g-side">
      {headerInSide && <Header c={c} cfg={cfg} inSide />}
      {(headerInSide || cfg.header !== 'band') && cs.length > 0 && (
        <section className="r-sec g-contact-sec">
          <h2 className="r-h"><span>Contact</span></h2>
          <div className="r-body">{cs.map((x, i) => <div className="g-ci" key={i}>{x}</div>)}</div>
        </section>
      )}
      {sideKeys.filter((k) => order.includes(k)).map((k) => <Section key={k} k={k} c={c} cfg={cfg} compact />)}
    </aside>
  );
  return (
    <div className="g-wrap">
      {!headerInSide && <Header c={c} cfg={{ ...cfg, header: cfg.header === 'band' ? 'band' : 'left' }} />}
      <div className="g-body">
        {cfg.side !== 'right' && side}
        <div className="g-main">{mainKeys.map((k) => <Section key={k} k={k} c={c} cfg={cfg} />)}</div>
        {cfg.side === 'right' && side}
      </div>
    </div>
  );
}
