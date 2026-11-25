import type { ReactNode } from 'react';
import { linkClick } from '../lib/router';
import { useStore } from '../lib/store';
import { Icon } from './Icon';
import { todayStr } from '../lib/util';
import { AccountMenu } from './AccountMenu';

const NAV = [
  { key: 'home', href: '/', label: 'Dashboard', short: 'Home', icon: 'home' },
  { key: 'resumes', href: '/resumes', label: 'Resumes', short: 'Resumes', icon: 'file' },
  { key: 'tracker', href: '/tracker', label: 'Applications', short: 'Tracker', icon: 'board' },
  { key: 'settings', href: '/settings', label: 'Data & settings', short: 'Settings', icon: 'settings' },
];

export function Logo() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" /><path d="m9 14 2 2 4-4" /></svg>
    </span>
  );
}

export function Layout({ section, children, fullBleed }: { section: string; children: ReactNode; fullBleed?: boolean }) {
  const { resumes, applications } = useStore();
  const today = todayStr();
  const overdue = applications.filter((a) => a.followUp && a.followUp < today && a.status !== 'offer' && a.status !== 'rejected').length;
  const badge = (k: string) => (k === 'resumes' && resumes.length ? { n: resumes.length, tone: 'soft' } : k === 'tracker' && overdue ? { n: overdue, tone: 'coral' } : null);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className="sidebar" aria-label="Primary">
        <a href="/" onClick={linkClick} className="brand">
          <Logo />
          <span><b>Hire Ready</b><small>Resume Studio</small></span>
        </a>
        <div className="nav-label">Workspace</div>
        <nav>
          {NAV.map((n) => {
            const b = badge(n.key);
            return (
              <a key={n.key} href={n.href} onClick={linkClick} className={`nav-item${section === n.key ? ' active' : ''}`} aria-current={section === n.key ? 'page' : undefined}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
                {b && <span className={`nav-badge ${b.tone}`} aria-label={n.key === 'tracker' ? `${b.n} overdue follow-ups` : `${b.n} resumes`}>{b.n}</span>}
              </a>
            );
          })}
        </nav>
        <div className="side-card">
          <b>Private by design</b>
          <p>Stored only in this browser. Export a backup from Data &amp; settings any time.</p>
        </div>
        <AccountMenu variant="sidebar" />
      </aside>

      <header className="mobile-top">
        <a href="/" onClick={linkClick} className="brand brand-dark"><Logo /><b>Hire Ready</b></a>
        <AccountMenu variant="header" />
      </header>

      <main id="main" className={`main${fullBleed ? ' full' : ''}`} tabIndex={-1}>{children}</main>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {NAV.map((n) => {
          const b = badge(n.key);
          return (
            <a key={n.key} href={n.href} onClick={linkClick} className={section === n.key ? 'active' : ''} aria-current={section === n.key ? 'page' : undefined}>
              <span className="bn-icon"><Icon name={n.icon} size={20} />{b && b.tone === 'coral' && <i className="bn-dot" />}</span>
              <span>{n.short}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
