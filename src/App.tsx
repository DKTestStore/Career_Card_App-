import { Layout } from './components/Layout';
import { usePath } from './lib/router';
import { useStore } from './lib/store';
import { Dashboard } from './pages/Dashboard';
import { ResumesPage } from './pages/ResumesPage';
import { Editor } from './pages/Editor';
import { Tracker } from './pages/Tracker';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const path = usePath();
  const { ready } = useStore();
  const m = /^\/resumes\/([^/]+)/.exec(path);
  const section = m ? 'resumes' : path.startsWith('/resumes') ? 'resumes' : path.startsWith('/tracker') ? 'tracker' : path.startsWith('/settings') ? 'settings' : 'home';

  let page;
  if (!ready) page = <div className="loading" role="status">Loading your workspace…</div>;
  else if (m) page = <Editor id={decodeURIComponent(m[1])} />;
  else if (section === 'resumes') page = <ResumesPage />;
  else if (section === 'tracker') page = <Tracker />;
  else if (section === 'settings') page = <SettingsPage />;
  else page = <Dashboard />;

  return <Layout section={section} fullBleed={!!m}>{page}</Layout>;
}
