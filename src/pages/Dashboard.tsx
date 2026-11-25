import { useStore } from '../lib/store';
import { linkClick } from '../lib/router';
import { ResumeGrid, useImportResume, useNewResume } from '../components/ResumeGrid';
import { Icon } from '../components/Icon';
import { fmtDate, todayStr } from '../lib/util';
import { STATUS_META } from './trackerMeta';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function Dashboard() {
  const { resumes, versions, applications } = useStore();
  const nr = useNewResume();
  const imp = useImportResume();
  const today = todayStr();
  const active = applications.filter((a) => a.status !== 'rejected' && a.status !== 'offer' && a.status !== 'wishlist');
  const interviews = applications.filter((a) => a.status === 'interview').length;
  const followUps = applications
    .filter((a) => a.followUp && a.status !== 'offer' && a.status !== 'rejected')
    .sort((a, b) => a.followUp.localeCompare(b.followUp))
    .slice(0, 6);
  const firstName = resumes[0]?.content.basics.name.split(' ')[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="muted">
            {resumes.length ? <>You have <b>{resumes.length}</b> resume{resumes.length === 1 ? '' : 's'} and <b>{active.length}</b> active application{active.length === 1 ? '' : 's'}.</> : 'Create your first resume to get started.'}
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline" onClick={imp.pick}><Icon name="upload" size={16} /> Import JSON</button>
          <button type="button" className="btn btn-primary" onClick={nr.open}><Icon name="plus" size={16} /> New resume</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat card"><span className="stat-ico violet"><Icon name="file" /></span><div><small>Resumes</small><b>{resumes.length}</b><em>{versions.length} saved version{versions.length === 1 ? '' : 's'}</em></div></div>
        <div className="stat card"><span className="stat-ico teal"><Icon name="board" /></span><div><small>Active applications</small><b>{active.length}</b><em>{interviews} in interview</em></div></div>
        <div className="stat card"><span className="stat-ico coral"><Icon name="bell" /></span><div><small>Follow-ups due</small><b>{followUps.filter((a) => a.followUp <= today).length}</b><em>today or overdue</em></div></div>
        <div className="stat card"><span className="stat-ico amber"><Icon name="check" /></span><div><small>Offers</small><b>{applications.filter((a) => a.status === 'offer').length}</b><em>of {applications.length} tracked</em></div></div>
      </div>

      <div className="dash-grid">
        <section aria-labelledby="yr">
          <div className="sec-head"><h2 id="yr">Your resumes</h2>{resumes.length > 4 && <a href="/resumes" onClick={linkClick} className="link">View all</a>}</div>
          {resumes.length ? <ResumeGrid resumes={resumes} limit={4} /> : (
            <div className="empty card">
              <Icon name="file" size={32} />
              <h3>No resumes yet</h3>
              <p className="muted">Start blank or from a sample profile — software engineer, fresher student or designer.</p>
              <button type="button" className="btn btn-primary" onClick={nr.open}><Icon name="plus" size={16} /> Create resume</button>
            </div>
          )}
        </section>
        <aside className="dash-side">
          <section className="card pad" aria-labelledby="fu">
            <div className="sec-head"><h2 id="fu">Follow-ups</h2><a href="/tracker" onClick={linkClick} className="link">Tracker</a></div>
            {followUps.length === 0 ? <p className="muted small">No follow-ups scheduled. Add a next follow-up date to an application to see it here.</p> : (
              <ul className="fu-list">
                {followUps.map((a) => {
                  const over = a.followUp < today; const due = a.followUp === today;
                  return (
                    <li key={a.id} className={over ? 'overdue' : due ? 'due' : ''}>
                      <span className="fu-dot" style={{ background: STATUS_META[a.status].color }} />
                      <div><b>{a.role || 'Role'} · {a.company || 'Company'}</b><small>{over ? 'Overdue · ' : due ? 'Due today · ' : ''}{fmtDate(a.followUp)}</small></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="card pad tip-card">
            <h2>Tip</h2>
            <p className="small muted">Save a version before tailoring a resume for a job, then pick that version when you log the application. You’ll always know what you sent.</p>
          </section>
        </aside>
      </div>
      {nr.el}{imp.input}
    </div>
  );
}
