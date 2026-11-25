import { lazy, Suspense, useEffect } from 'react';
import { Layout } from './components/Layout';
import { usePath, navigate } from './lib/router';
import { useStore } from './lib/store';
import { useAuth } from './lib/auth';
import { Dashboard } from './pages/Dashboard';
import { ResumesPage } from './pages/ResumesPage';
import { Editor } from './pages/Editor';
import { Tracker } from './pages/Tracker';
import { SettingsPage } from './pages/SettingsPage';
import { WelcomePage } from './pages/Welcome';
import { LogoutPage } from './pages/Logout';

// Keyword dictionary + ATS page load on demand to keep the first load light.
const AtsPage = lazy(() => import('./pages/AtsPage'));

function isGate(path: string) {
  return path === '/welcome' || path === '/logout' || path === '/signed-out';
}

export function App() {
  const path = usePath();
  const { ready: storeReady } = useStore();
  const { ready: authReady, signedIn } = useAuth();
  const ready = storeReady && authReady;

  useEffect(() => {
    if (!ready) return;
    if (!signedIn && !isGate(path)) navigate('/welcome', true);
    if (signedIn && path === '/welcome') navigate('/', true);
    // /logout is a signed-out confirmation page; if still signed in, go home.
    if (signedIn && (path === '/logout' || path === '/signed-out')) navigate('/', true);
  }, [ready, signedIn, path]);

  if (!ready) return <div className="loading" role="status">Loading your workspace…</div>;

  if (!signedIn) {
    if (path === '/logout' || path === '/signed-out') return <LogoutPage />;
    return <WelcomePage />;
  }

  const m = /^\/resumes\/([^/]+)/.exec(path);
  const section = m ? 'resumes' : path.startsWith('/resumes') ? 'resumes' : path.startsWith('/ats') ? 'ats' : path.startsWith('/tracker') ? 'tracker' : path.startsWith('/settings') ? 'settings' : 'home';

  let page;
  if (m) page = <Editor id={decodeURIComponent(m[1])} />;
  else if (section === 'resumes') page = <ResumesPage />;
  else if (section === 'ats') page = <Suspense fallback={<div className="loading" role="status">Loading ATS checker…</div>}><AtsPage /></Suspense>;
  else if (section === 'tracker') page = <Tracker />;
  else if (section === 'settings') page = <SettingsPage />;
  else page = <Dashboard />;

  return <Layout section={section} fullBleed={!!m}>{page}</Layout>;
}
