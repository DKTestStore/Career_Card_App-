import { useEffect, useState, type CSSProperties, type FormEvent, type ReactElement } from 'react';
import type { PublicPortfolio, SectionKey } from '../lib/portfolio/types';
import { Icon } from '../components/Icon';
import { initials } from '../lib/util';
import { qrSvg } from '../lib/portfolio/qr';
import './portfolio.css';

interface Props {
  p: PublicPortfolio;
  /** Absolute public URL (for the QR code). */
  url?: string;
  onDownloadResume?: () => void;
  /** Builder preview: links don't navigate away. */
  preview?: boolean;
}

const has = (s?: string) => Boolean(s && s.trim());
const href = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : `https://${u}`);
const short = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

export function Avatar({ name, photo, size }: { name: string; photo?: string; size: number }) {
  return photo
    ? <img className="pf-face" src={photo} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <span className="pf-face pf-initials" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">{initials(name || '?')}</span>;
}

function Qr({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { let on = true; qrSvg(url).then((s) => on && setSvg(s)); return () => { on = false; }; }, [url]);
  return <div className="pf-qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function PortfolioView({ p, url, onDownloadResume, preview }: Props) {
  const d = p.data;
  const a = d.about;
  const c = d.contact;
  const visible = (k: SectionKey) => d.sections.find((s) => s.key === k)?.visible !== false;
  const order = d.sections.map((s) => s.key);
  const style = { '--pf-accent': p.accent } as CSSProperties;
  const email = c.email || a.email;
  const featured = [...d.projects].sort((x, y) => Number(y.featured) - Number(x.featured));
  const [sent, setSent] = useState(false);
  const linkProps = preview ? { tabIndex: -1, onClick: (e: { preventDefault(): void }) => e.preventDefault() } : { target: '_blank', rel: 'noopener noreferrer' };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (preview || !email) return;
    const f = new FormData(e.currentTarget);
    const subject = `Portfolio enquiry from ${String(f.get('name') || 'a visitor')}`;
    const body = `${String(f.get('message') || '')}\n\n— ${String(f.get('name') || '')} ${String(f.get('from') || '')}`.trim();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const sections: Partial<Record<SectionKey, ReactElement | null>> = {
    projects: d.projects.length ? (
      <section className="pf-sec" id="work" key="projects" aria-labelledby="pf-h-work">
        <h2 id="pf-h-work">{p.theme === 'academic' ? 'Projects' : 'Featured work'}</h2>
        <div className="pf-projects">
          {featured.map((x) => (
            <article className="pf-card" key={x.id} data-testid="pf-project">
              <div className="pf-cover">
                {x.cover ? <img src={x.cover} alt="" loading="lazy" /> : <span className="pf-cover-ph" aria-hidden="true">{x.tags.slice(0, 3).join(' · ') || x.title}</span>}
                {x.featured && <span className="pf-tag-feat">Featured</span>}
              </div>
              <div className="pf-card-body">
                <h3>{x.title || 'Untitled project'}</h3>
                {has(x.role) && <p className="pf-role">{x.role}</p>}
                {has(x.description) && <p className="pf-desc">{x.description}</p>}
                {x.tags.length > 0 && <ul className="pf-chips" aria-label="Technologies">{x.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
                {x.gallery.length > 0 && (
                  <div className="pf-mini-gal">{x.gallery.slice(0, 4).map((g, i) => <img key={i} src={g} alt={`${x.title} screenshot ${i + 1}`} loading="lazy" />)}</div>
                )}
                {(has(x.github) || has(x.demo)) && (
                  <div className="pf-links">
                    {has(x.github) && <a href={href(x.github)} {...linkProps}><Icon name="code" size={15} />Code</a>}
                    {has(x.demo) && <a href={href(x.demo)} {...linkProps}><Icon name="external" size={15} />Live demo</a>}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    ) : null,
    skills: d.skills.length ? (
      <section className="pf-sec" key="skills" aria-labelledby="pf-h-skills">
        <h2 id="pf-h-skills">Skills</h2>
        <ul className="pf-skills">{d.skills.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>
    ) : null,
    experience: d.experience.length ? (
      <section className="pf-sec" id="experience" key="experience" aria-labelledby="pf-h-exp">
        <h2 id="pf-h-exp">Experience</h2>
        <ol className="pf-tl">
          {d.experience.map((x) => (
            <li key={x.id}>
              <div className="pf-tl-head"><b>{x.title}</b>{has(x.company) && <span> · {x.company}</span>}<em>{[x.start, x.end].filter(Boolean).join(' – ')}</em></div>
              {has(x.summary) && <p>{x.summary}</p>}
            </li>
          ))}
        </ol>
      </section>
    ) : null,
    education: d.education.length ? (
      <section className="pf-sec" key="education" aria-labelledby="pf-h-edu">
        <h2 id="pf-h-edu">Education</h2>
        <ol className="pf-tl">
          {d.education.map((x) => (
            <li key={x.id}>
              <div className="pf-tl-head"><b>{x.degree || x.school}</b>{has(x.degree) && has(x.school) && <span> · {x.school}</span>}<em>{[x.start, x.end].filter(Boolean).join(' – ')}</em></div>
              {has(x.detail) && <p>{x.detail}</p>}
            </li>
          ))}
        </ol>
      </section>
    ) : null,
    certifications: d.certifications.length ? (
      <section className="pf-sec" key="certifications" aria-labelledby="pf-h-cert">
        <h2 id="pf-h-cert">Certifications</h2>
        <ul className="pf-certs">
          {d.certifications.map((x) => (
            <li key={x.id}>
              <Icon name="award" size={18} />
              <div><b>{has(x.url) ? <a href={href(x.url)} {...linkProps}>{x.name}</a> : x.name}</b><small>{[x.issuer, x.date].filter(Boolean).join(' · ')}</small></div>
            </li>
          ))}
        </ul>
      </section>
    ) : null,
    gallery: d.gallery.length ? (
      <section className="pf-sec" key="gallery" aria-labelledby="pf-h-gal">
        <h2 id="pf-h-gal">Gallery</h2>
        <div className="pf-gallery">
          {d.gallery.map((g) => <figure key={g.id}><img src={g.src} alt={g.caption || 'Gallery image'} loading="lazy" />{has(g.caption) && <figcaption>{g.caption}</figcaption>}</figure>)}
        </div>
      </section>
    ) : null,
    testimonials: d.testimonials.length ? (
      <section className="pf-sec" key="testimonials" aria-labelledby="pf-h-tst">
        <h2 id="pf-h-tst">What people say</h2>
        <div className="pf-quotes">
          {d.testimonials.map((t) => <blockquote key={t.id}><p>“{t.quote}”</p><footer><b>{t.name}</b>{has(t.role) && <span> · {t.role}</span>}</footer></blockquote>)}
        </div>
      </section>
    ) : null,
    contact: (
      <section className="pf-sec pf-contact" id="contact" key="contact" aria-labelledby="pf-h-contact">
        <h2 id="pf-h-contact">Contact</h2>
        <div className="pf-contact-grid">
          {c.showForm && has(email) && (
            sent ? <p className="pf-sent">Your email app should have opened with the message. Thanks for reaching out!</p> : (
              <form className="pf-form" onSubmit={submit}>
                <label><span className="sr-only">Your name</span><input name="name" placeholder="Your name" required autoComplete="name" /></label>
                <label><span className="sr-only">Your email</span><input name="from" type="email" placeholder="Email" autoComplete="email" /></label>
                <label className="pf-span2"><span className="sr-only">Message</span><textarea name="message" placeholder="A short message…" rows={3} required /></label>
                <button className="pf-btn pf-btn-primary" type="submit">Send message</button>
                <small className="pf-form-note">Opens your email app — nothing is stored by Hire Ready.</small>
              </form>
            )
          )}
          <div className="pf-contact-side">
            <ul className="pf-contact-links">
              {has(email) && <li><a href={`mailto:${email}`} {...(preview ? linkProps : {})}><Icon name="mail" size={16} />{email}</a></li>}
              {has(c.phone) && <li><a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} {...(preview ? linkProps : {})}><Icon name="phone" size={16} />{c.phone}</a></li>}
              {has(c.linkedin) && <li><a href={href(c.linkedin)} {...linkProps}><Icon name="link" size={16} />LinkedIn</a></li>}
              {has(c.github) && <li><a href={href(c.github)} {...linkProps}><Icon name="code" size={16} />GitHub</a></li>}
              {has(c.twitter) && <li><a href={href(c.twitter)} {...linkProps}><Icon name="link" size={16} />X / Twitter</a></li>}
              {has(c.website) && <li><a href={href(c.website)} {...linkProps}><Icon name="globe" size={16} />{short(c.website)}</a></li>}
            </ul>
            {url && <div className="pf-qr-box"><Qr url={url} /><small>{short(url)}</small></div>}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className={`pf pf-${p.theme}`} style={style} data-theme={p.theme}>
      <header className="pf-nav">
        <a className="pf-brand" href="#top" {...(preview ? linkProps : {})}><Avatar name={a.name} photo={a.photo} size={32} /><b>{a.name || 'Your name'}</b></a>
        <nav className="pf-nav-links" aria-label="Portfolio sections">
          {visible('projects') && d.projects.length > 0 && <a href="#work" {...(preview ? linkProps : {})}>Work</a>}
          {visible('experience') && d.experience.length > 0 && <a href="#experience" {...(preview ? linkProps : {})}>Experience</a>}
          {visible('contact') && <a href="#contact" {...(preview ? linkProps : {})}>Contact</a>}
        </nav>
        <div className="pf-nav-cta">
          {onDownloadResume && <button type="button" className="pf-btn pf-btn-outline" onClick={onDownloadResume} tabIndex={preview ? -1 : undefined}><Icon name="download" size={15} />Résumé</button>}
          {visible('contact') && <a className="pf-btn pf-btn-primary" href="#contact" {...(preview ? linkProps : {})}>Contact</a>}
        </div>
      </header>
      <main id="top">
        {visible('about') && (
          <section className="pf-hero" aria-label="About">
            <div className="pf-hero-text">
              {has(a.openTo) && <p className="pf-eyebrow">{a.openTo}</p>}
              <h1>{a.name || 'Your name'}</h1>
              {has(a.headline) && <p className="pf-headline">{a.headline}</p>}
              {has(a.bio) && <p className="pf-bio">{a.bio}</p>}
              <ul className="pf-meta">
                {has(a.location) && <li><Icon name="pin" size={14} />{a.location}</li>}
                {has(email) && <li><Icon name="mail" size={14} />{email}</li>}
                {has(a.phone) && <li><Icon name="phone" size={14} />{a.phone}</li>}
                {has(a.website) && <li><Icon name="link" size={14} />{short(a.website)}</li>}
              </ul>
              <div className="pf-cta">
                {onDownloadResume && <button type="button" className="pf-btn pf-btn-primary" onClick={onDownloadResume} data-testid="pf-download-resume" tabIndex={preview ? -1 : undefined}><Icon name="download" size={16} />Download résumé</button>}
                {visible('contact') && <a className="pf-btn pf-btn-outline" href="#contact" {...(preview ? linkProps : {})}><Icon name="mail" size={16} />Contact me</a>}
              </div>
            </div>
            <div className="pf-hero-photo"><Avatar name={a.name} photo={a.photo} size={150} /></div>
          </section>
        )}
        {order.filter((k) => k !== 'about' && visible(k)).map((k) => sections[k] ?? null)}
      </main>
      <footer className="pf-foot">
        <span>Made with <a href="/welcome" {...(preview ? linkProps : {})}>Hire Ready</a></span>
        <span>© {new Date().getFullYear()} {a.name}</span>
      </footer>
    </div>
  );
}
