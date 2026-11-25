import { useMemo, useState, type DragEvent } from 'react';
import { useStore } from '../lib/store';
import { STATUSES, type Application, type AppStatus } from '../lib/types';
import { STATUS_META } from './trackerMeta';
import { AppForm, blankApp } from '../components/AppForm';
import { Icon } from '../components/Icon';
import { fmtDate, todayStr } from '../lib/util';

type View = 'board' | 'list';

export function Tracker() {
  const { applications, resumes, versions, moveApplication } = useStore();
  const [view, setView] = useState<View>(() => (localStorage.getItem('hr:trackerView') as View) || 'board');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<AppStatus | 'all'>('all');
  const [editing, setEditing] = useState<{ app: Application; isNew: boolean } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ status: AppStatus; before: string | null } | null>(null);
  const today = todayStr();

  const changeView = (v: View) => { setView(v); try { localStorage.setItem('hr:trackerView', v); } catch { /* ignore */ } };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return applications.filter((a) => (filter === 'all' || a.status === filter) &&
      (!s || `${a.company} ${a.role} ${a.location} ${a.contact} ${a.notes}`.toLowerCase().includes(s)));
  }, [applications, q, filter]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<AppStatus, number>;
    applications.forEach((a) => { c[a.status]++; });
    return c;
  }, [applications]);
  const sent = counts.applied + counts.interview + counts.offer + counts.rejected;
  const responded = counts.interview + counts.offer + counts.rejected;
  const responseRate = sent ? Math.round((responded / sent) * 100) : 0;
  const overdueCount = applications.filter((a) => isOverdue(a, today)).length;

  const resumeLabel = (a: Application) => {
    const r = resumes.find((x) => x.id === a.resumeId);
    if (!a.resumeId) return null;
    const v = versions.find((x) => x.id === a.versionId);
    return `${r ? r.name : 'Deleted resume'}${v ? ` · v${v.number}` : ''}`;
  };

  const onDrop = (e: DragEvent, status: AppStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) moveApplication(id, status, over?.status === status ? over.before : null);
    setDragId(null); setOver(null);
  };

  return (
    <div className="page tracker">
      <div className="page-head">
        <div>
          <h1>Applications</h1>
          <p className="muted">Track every application and the resume version you sent.{overdueCount > 0 && <> <b className="coral-text">{overdueCount} follow-up{overdueCount > 1 ? 's' : ''} overdue.</b></>}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setEditing({ app: blankApp(), isNew: true })}><Icon name="plus" size={16} /> New application</button>
        </div>
      </div>

      <div className="tstats" aria-label="Application statistics">
        <div className="tstat total"><small>Total</small><b>{applications.length}</b></div>
        {STATUSES.map((s) => (
          <button type="button" key={s} className={`tstat${filter === s ? ' active' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)} aria-pressed={filter === s} aria-label={`${STATUS_META[s].label}: ${counts[s]}. Filter by ${STATUS_META[s].label}`}>
            <small><i className="dot" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}</small><b>{counts[s]}</b>
          </button>
        ))}
        <div className="tstat rate" title="Interview + Offer + Rejected, divided by everything you actually applied to (excludes Wishlist)">
          <small>Response rate</small><b>{responseRate}%</b>
        </div>
      </div>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search company, role, notes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search applications" />
        </label>
        <div className="field inline">
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select id="status-filter" value={filter} onChange={(e) => setFilter(e.target.value as AppStatus | 'all')}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div className="seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'board'} className={view === 'board' ? 'active' : ''} onClick={() => changeView('board')}><Icon name="board" size={15} /> Board</button>
          <button type="button" aria-pressed={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => changeView('list')}><Icon name="list" size={15} /> List</button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="board">
          {STATUSES.filter((s) => filter === 'all' || s === filter).map((s) => {
            const col = filtered.filter((a) => a.status === s).sort((a, b) => a.order - b.order);
            return (
              <section key={s} className={`col${over?.status === s ? ' drop' : ''}`} aria-label={`${STATUS_META[s].label} column`} data-status={s}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over?.status !== s || (e.target as HTMLElement).classList.contains('col-body')) setOver({ status: s, before: null }); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
                onDrop={(e) => onDrop(e, s)}>
                <header className="col-head">
                  <i className="dot" style={{ background: STATUS_META[s].color }} />
                  <h2>{STATUS_META[s].label}</h2>
                  <span className="count">{col.length}</span>
                </header>
                <div className="col-body">
                  {col.map((a) => (
                    <AppCard key={a.id} a={a} today={today} resumeLabel={resumeLabel(a)} dragging={dragId === a.id}
                      showDropBefore={over?.status === s && over.before === a.id && dragId !== a.id}
                      onOpen={() => setEditing({ app: a, isNew: false })}
                      onMove={(st) => moveApplication(a.id, st)}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move'; setDragId(a.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}
                      onDragOver={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        const before = e.clientY < r.top + r.height / 2 ? a.id : col[col.indexOf(a) + 1]?.id ?? null;
                        if (over?.status !== s || over.before !== before) setOver({ status: s, before });
                      }} />
                  ))}
                  {over?.status === s && over.before === null && dragId && <div className="drop-line" />}
                  <button type="button" className="col-add" onClick={() => setEditing({ app: blankApp(s), isNew: true })} aria-label={`Add application to ${STATUS_META[s].label}`}>
                    <Icon name="plus" size={14} /> Add
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ListView apps={filtered} today={today} resumeLabel={resumeLabel} onOpen={(a) => setEditing({ app: a, isNew: false })} onMove={(a, st) => moveApplication(a.id, st)} />
      )}

      {applications.length === 0 && (
        <div className="empty card" style={{ marginTop: 16 }}>
          <Icon name="board" size={32} />
          <h3>No applications yet</h3>
          <p className="muted">Add the jobs you’re interested in or have applied to. Drag cards between columns as things progress.</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditing({ app: blankApp(), isNew: true })}><Icon name="plus" size={16} /> Add your first application</button>
        </div>
      )}

      {editing && <AppForm initial={editing.app} isNew={editing.isNew} onClose={() => setEditing(null)} />}
    </div>
  );
}

function isOverdue(a: Application, today: string) {
  return !!a.followUp && a.followUp < today && a.status !== 'offer' && a.status !== 'rejected';
}

function FollowBadge({ a, today }: { a: Application; today: string }) {
  if (!a.followUp || a.status === 'offer' || a.status === 'rejected') return null;
  if (a.followUp < today) return <span className="badge overdue"><Icon name="alert" size={12} /> Follow-up overdue · {fmtDate(a.followUp)}</span>;
  if (a.followUp === today) return <span className="badge due"><Icon name="bell" size={12} /> Follow up today</span>;
  return <span className="badge soon"><Icon name="calendar" size={12} /> Follow up {fmtDate(a.followUp)}</span>;
}

function StatusSelect({ a, onMove, id }: { a: Application; onMove: (s: AppStatus) => void; id: string }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">Move {a.role} at {a.company} to</label>
      <select id={id} className="status-select" value={a.status} onChange={(e) => onMove(e.target.value as AppStatus)} onClick={(e) => e.stopPropagation()}>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
    </>
  );
}

function AppCard({ a, today, resumeLabel, onOpen, onMove, onDragStart, onDragEnd, onDragOver, dragging, showDropBefore }: {
  a: Application; today: string; resumeLabel: string | null; onOpen: () => void; onMove: (s: AppStatus) => void;
  onDragStart: (e: DragEvent<HTMLElement>) => void; onDragEnd: () => void; onDragOver: (e: DragEvent<HTMLElement>) => void; dragging: boolean; showDropBefore: boolean;
}) {
  const idx = STATUSES.indexOf(a.status);
  const { atsReports } = useStore();
  const rep = a.atsReportId ? atsReports.find((r) => r.id === a.atsReportId) : undefined;
  return (
    <>
      {showDropBefore && <div className="drop-line" />}
      <article className={`app-card${isOverdue(a, today) ? ' is-overdue' : ''}${dragging ? ' dragging' : ''}`} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} data-app={a.id}>
        <button type="button" className="app-open" onClick={onOpen} aria-label={`Open ${a.role} at ${a.company}`}>
          <b className="app-role">{a.role}</b>
          <span className="app-co">{a.company}{a.location ? ` · ${a.location}` : ''}</span>
        </button>
        <div className="app-meta">
          {resumeLabel && <span className="pill pill-violet" title="Resume used">{resumeLabel}</span>}
          {a.salary && <span className="pill pill-teal">{a.salary}</span>}
          {rep && <span className={`ats-chip ${rep.score >= 75 ? 'good' : rep.score >= 50 ? 'ok' : 'low'}`} title={`ATS report: ${rep.jdTitle}`}>ATS {rep.score}</span>}
          {a.dateApplied && <span className="app-date">{fmtDate(a.dateApplied)}</span>}
        </div>
        <FollowBadge a={a} today={today} />
        <div className="app-move">
          <button type="button" className="icon-btn xs" disabled={idx === 0} onClick={() => onMove(STATUSES[idx - 1])} aria-label={`Move to ${idx > 0 ? STATUS_META[STATUSES[idx - 1]].label : ''}`}><Icon name="left" size={14} /></button>
          <StatusSelect a={a} onMove={onMove} id={`mv-${a.id}`} />
          <button type="button" className="icon-btn xs" disabled={idx === STATUSES.length - 1} onClick={() => onMove(STATUSES[idx + 1])} aria-label={`Move to ${idx < STATUSES.length - 1 ? STATUS_META[STATUSES[idx + 1]].label : ''}`}><Icon name="right" size={14} /></button>
        </div>
      </article>
    </>
  );
}

function ListView({ apps, today, resumeLabel, onOpen, onMove }: {
  apps: Application[]; today: string; resumeLabel: (a: Application) => string | null; onOpen: (a: Application) => void; onMove: (a: Application, s: AppStatus) => void;
}) {
  const [sort, setSort] = useState<'date' | 'company' | 'followUp'>('date');
  const rows = useMemo(() => apps.slice().sort((a, b) =>
    sort === 'company' ? a.company.localeCompare(b.company)
      : sort === 'followUp' ? (a.followUp || '9999').localeCompare(b.followUp || '9999')
        : (b.dateApplied || b.createdAt).localeCompare(a.dateApplied || a.createdAt)), [apps, sort]);
  if (!apps.length) return <p className="muted">No applications match.</p>;
  return (
    <div className="card list-card">
      <div className="list-sort">
        <label htmlFor="sort">Sort by</label>
        <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="date">Date applied (newest)</option>
          <option value="company">Company (A–Z)</option>
          <option value="followUp">Next follow-up</option>
        </select>
      </div>
      <table className="app-table">
        <thead><tr><th scope="col">Role & company</th><th scope="col">Status</th><th scope="col">Applied</th><th scope="col">Follow-up</th><th scope="col">Resume</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className={isOverdue(a, today) ? 'is-overdue' : ''}>
              <td data-label="Role"><b>{a.role}</b><small>{a.company}{a.location ? ` · ${a.location}` : ''}{a.salary ? ` · ${a.salary}` : ''}</small></td>
              <td data-label="Status"><StatusSelect a={a} onMove={(s) => onMove(a, s)} id={`ls-${a.id}`} /></td>
              <td data-label="Applied">{a.dateApplied ? fmtDate(a.dateApplied) : '—'}</td>
              <td data-label="Follow-up">{a.followUp ? (a.status === 'offer' || a.status === 'rejected' ? fmtDate(a.followUp) : <FollowBadge a={a} today={today} />) : '—'}</td>
              <td data-label="Resume">{resumeLabel(a) ?? '—'}</td>
              <td className="ta-r"><button type="button" className="btn btn-ghost btn-xs" onClick={() => onOpen(a)} aria-label={`Edit ${a.role} at ${a.company}`}><Icon name="edit" size={14} /> Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
