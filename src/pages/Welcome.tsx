import { useState, type FormEvent } from 'react';
import { Logo } from '../components/Layout';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

const FEATURES = [
  { icon: 'templates', title: 'Resume builder', text: 'Three templates and five colour themes, with a live A4 preview and PDF, text or JSON export.' },
  { icon: 'board', title: 'Application tracker', text: 'A Kanban board from Wishlist to Offer, linked to the resume version you actually sent.' },
  { icon: 'shield', title: 'Private by design', text: 'Your data stays on this device. No account, no tracking, no server copy — unless you export a backup.' },
  { icon: 'offline', title: 'Works offline', text: 'Install Hire Ready from your browser and keep working without a network connection.' },
];

export function WelcomePage() {
  const { signInAsGuest, firstName: saved } = useAuth();
  const [name, setName] = useState(saved);
  const start = (e?: FormEvent) => {
    e?.preventDefault();
    signInAsGuest(name);
    navigate('/', true);
  };

  return (
    <div className="gate welcome">
      <a href="#welcome-main" className="skip-link">Skip to content</a>
      <header className="gate-top">
        <span className="brand brand-on-light">
          <Logo />
          <span><b>Hire Ready</b><small>Resume Studio</small></span>
        </span>
      </header>

      <main id="welcome-main" className="welcome-main" tabIndex={-1}>
        <section className="welcome-hero">
          <p className="eyebrow">Phase 1 · free on this device</p>
          <h1>Build a sharp resume.<br />Track every application.</h1>
          <p className="lede">Hire Ready is a lightweight studio for your job hunt — templates, a live preview, and a tracker that remembers what you sent. Everything stays private in this browser.</p>

          <form className="welcome-cta" onSubmit={start}>
            <label className="field">
              <span>First name <em>(optional)</em></span>
              <input
                name="firstName"
                autoComplete="given-name"
                placeholder="e.g. Priya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                aria-describedby="name-hint"
              />
            </label>
            <p id="name-hint" className="hint">Used only to personalise the greeting on this device.</p>
            <button type="submit" className="btn btn-primary btn-lg" data-testid="get-started">Get started</button>
            <button type="button" className="btn btn-outline btn-lg btn-google" disabled aria-describedby="google-soon">
              <GoogleMark />
              Continue with Google
              <span className="soon-tag" id="google-soon">Coming soon</span>
            </button>
          </form>
        </section>

        <ul className="welcome-features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="feat-ico" aria-hidden="true"><Icon name={f.icon} size={20} /></span>
              <div>
                <b>{f.title}</b>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="gate-foot">
        <p>No account required. You can install this app and use it offline.</p>
      </footer>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8A4.1 4.1 0 0 1 12 13.3v2.2h3.2c1.9-1.7 3-4.2 3-6.3z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-3.2-2.2c-.8.6-1.9 1-2.8 1-2.2 0-4-1.5-4.7-3.5H1v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M4.3 11.1A5.4 5.4 0 0 1 4 9c0-.7.1-1.4.3-2.1V4.6H1A9 9 0 0 0 0 9c0 1.5.4 2.8 1 4.1l3.3-2z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.4L15 2.4A9 9 0 0 0 1 4.6l3.3 2.3C5 5 6.8 3.6 9 3.6z" />
    </svg>
  );
}
