import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { PortfolioView } from './PortfolioView';
import { ResumePrint } from './ResumePrint';
import { fetchPortfolio, viewWithPassword } from '../lib/portfolio/api';
import { normalizeView } from '../lib/portfolio/model';
import type { PublicPortfolio } from '../lib/portfolio/types';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Layout';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; p: PublicPortfolio }
  | { kind: 'password'; name: string; wrong?: boolean; busy?: boolean }
  | { kind: 'private' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

function setMeta(title: string, desc: string) {
  document.title = title;
  let m = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  m.content = desc;
}

export default function PublicPage({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let on = true;
    fetchPortfolio(slug).then((r) => {
      if (!on) return;
      if (r.ok) setState({ kind: 'ok', p: normalizeView(r.data) });
      else if (r.status === 401) setState({ kind: 'password', name: String(r.body?.name ?? '') });
      else if (r.status === 403) setState({ kind: 'private' });
      else if (r.status === 404) setState({ kind: 'missing' });
      else setState({ kind: 'error', message: r.error });
    });
    return () => { on = false; };
  }, [slug]);

  useEffect(() => {
    if (state.kind === 'ok') {
      const a = state.p.data.about;
      setMeta(`${a.name}${a.headline ? ` — ${a.headline}` : ''}`, (a.bio || a.headline || '').slice(0, 200));
    } else if (state.kind !== 'loading') setMeta('Portfolio · Hire Ready', 'A portfolio made with Hire Ready.');
  }, [state]);

  const unlock = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get('password') || '');
    if (state.kind !== 'password') return;
    setState({ ...state, busy: true, wrong: false });
    const r = await viewWithPassword(slug, pw);
    if (r.ok) setState({ kind: 'ok', p: normalizeView(r.data) });
    else if (r.status === 401) setState({ kind: 'password', name: state.name, wrong: true });
    else setState({ kind: 'error', message: r.error });
  };
  const done = useCallback(() => setPrinting(false), []);

  if (state.kind === 'loading') return <div className="loading" role="status">Loading portfolio…</div>;
  if (state.kind === 'ok') {
    const p = state.p;
    return (
      <>
        <PortfolioView p={p} url={`${location.origin}/p/${p.slug}`} onDownloadResume={p.resume ? () => setPrinting(true) : undefined} />
        {printing && p.resume && <ResumePrint resume={p.resume} name={p.data.about.name} onDone={done} />}
      </>
    );
  }
  const gate = (icon: string, title: string, body: string, extra?: ReactNode) => (
    <div className="pf-gate">
      <div className="card">
        <span className="pf-gate-ico"><Icon name={icon} size={22} /></span>
        <h1>{title}</h1>
        <p className="muted">{body}</p>
        {extra}
        <a className="link" href="/welcome" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}><Logo />Made with Hire Ready</a>
      </div>
    </div>
  );
  if (state.kind === 'password') {
    return gate('lock', state.name ? `${state.name}’s portfolio` : 'Protected portfolio', 'This portfolio is password-protected. Enter the password you were given.', (
      <form onSubmit={unlock}>
        <div className="field"><label htmlFor="pf-pw">Password</label><input id="pf-pw" name="password" type="password" autoComplete="current-password" required autoFocus /></div>
        {state.wrong && <p className="form-err" role="alert">That password is not right.</p>}
        <button className="btn btn-primary" type="submit" disabled={state.busy}>{state.busy ? 'Checking…' : 'View portfolio'}</button>
      </form>
    ));
  }
  if (state.kind === 'private') return gate('lock', 'This portfolio is private', 'The owner has made this page private for now.');
  if (state.kind === 'missing') return gate('globe', 'Portfolio not found', `There is no published portfolio at /p/${slug}. It may have been unpublished or renamed.`);
  return gate('alert', 'Could not load portfolio', state.message, <button className="btn btn-outline" onClick={() => location.reload()}>Try again</button>);
}
