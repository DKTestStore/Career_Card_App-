import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { linkClick, navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { localView, publicUrl, THEMES, themeDefaultAccent } from '../lib/portfolio/model';
import type { PortfolioTheme } from '../lib/portfolio/types';
import { ScaledSite } from './bits';
import './builder.css';

export default function ThemesPage() {
  const { portfolio: p, resumes, updatePortfolio } = useStore();
  const resume = resumes.find((r) => r.id === p?.resumeId);
  const base = useMemo(() => (p ? localView(p, resume) : null), [p, resume]);
  if (!p || !base) return <div className="page narrow"><div className="empty card"><h3>No portfolio yet</h3><a className="btn btn-primary" href="/portfolio" onClick={linkClick}>Create portfolio</a></div></div>;
  const use = (t: PortfolioTheme) => {
    updatePortfolio((x) => ({ ...x, theme: t, accent: x.accent.toLowerCase() === themeDefaultAccent(x.theme).toLowerCase() ? themeDefaultAccent(t) : x.accent }), true);
    navigate('/portfolio');
  };
  return (
    <div className="page themes-page">
      <div className="page-head">
        <div>
          <a className="link back-link" href="/portfolio" onClick={linkClick}><Icon name="left" size={14} />Portfolio builder</a>
          <h1>Portfolio themes</h1>
          <p className="muted">Four looks for your public page. Content stays the same; typography, colour and layout change.</p>
        </div>
      </div>
      <div className="theme-gallery">
        {THEMES.map((t) => {
          const accent = p.theme === t.id ? p.accent : themeDefaultAccent(t.id);
          return (
            <article key={t.id} className={`card theme-big${p.theme === t.id ? ' active' : ''}`} data-theme-card={t.id}>
              <div className="theme-big-prev"><ScaledSite p={{ ...base, theme: t.id, accent }} url={publicUrl(p.slug)} frame={false} /></div>
              <div className="theme-big-foot">
                <div><b>{t.name}</b><p className="muted small">{t.blurb}</p></div>
                {p.theme === t.id ? <span className="pill pill-violet">In use</span> : <button type="button" className="btn btn-soft btn-sm" onClick={() => use(t.id)}>Use theme</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
