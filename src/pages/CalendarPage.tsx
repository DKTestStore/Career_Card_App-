import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { EVENT_CATEGORIES, type EventCategory, type PlannerEvent } from '../lib/types';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { download, nowIso, todayStr, uid } from '../lib/util';
import { linkClick } from '../lib/router';
import './calendar.css';

/* ---------- Personal planner (0.6.0) ----------
 * Local-only events + tasks (IndexedDB 'events' store), plus read-only items
 * derived from the Applications tracker (applied dates and follow-ups). */

type View = 'month' | 'week' | 'agenda';

export const CAT_META: Record<EventCategory, { label: string; color: string; icon: string }> = {
  interview: { label: 'Interview', color: '#5B3DF5', icon: 'user' },
  deadline: { label: 'Application deadline', color: '#E5484D', icon: 'alert' },
  'follow-up': { label: 'Follow-up', color: '#D97706', icon: 'bell' },
  study: { label: 'Study / prep', color: '#0F9D9A', icon: 'file' },
  personal: { label: 'Personal', color: '#DB2777', icon: 'star' },
  other: { label: 'Other', color: '#64748B', icon: 'calendar' },
};
const SWATCHES = ['', '#5B3DF5', '#2563EB', '#0F9D9A', '#16A34A', '#D97706', '#E5484D', '#DB2777', '#64748B'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Item {
  key: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  kind: 'event' | 'task';
  done: boolean;
  source: 'planner' | 'tracker';
  ev?: PlannerEvent;
  sub?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const fmtDay = (k: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => parse(k).toLocaleDateString(undefined, opts);
const fmtTime = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
const sortItems = (a: Item, b: Item) => a.date.localeCompare(b.date) || (a.allDay === b.allDay ? a.time.localeCompare(b.time) : a.allDay ? -1 : 1) || a.title.localeCompare(b.title);

function blankEvent(date: string, kind: 'event' | 'task' = 'event'): PlannerEvent {
  const t = nowIso();
  return { id: uid(), title: '', kind, date, allDay: kind === 'task', time: kind === 'task' ? '' : '10:00', endTime: '', category: kind === 'task' ? 'deadline' : 'interview', color: '', notes: '', done: false, createdAt: t, updatedAt: t };
}

/* ---------- .ics export ---------- */
function icsEscape(s: string) { return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
function fold(line: string) {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
  out.push(s);
  return out.join('\r\n');
}
export function toIcs(events: PlannerEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hire Ready//Planner 0.6.0//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Hire Ready planner'];
  for (const e of events) {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@hire-ready`, `DTSTAMP:${stamp}`);
    if (e.allDay || !e.time) {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${keyOf(addDays(parse(e.date), 1)).replace(/-/g, '')}`);
    } else {
      const st = e.time.replace(':', '') + '00';
      lines.push(`DTSTART:${d}T${st}`);
      const end = e.endTime && e.endTime > e.time ? e.endTime : `${pad(Math.min(23, Number(e.time.slice(0, 2)) + 1))}:${e.time.slice(3, 5)}`;
      lines.push(`DTEND:${d}T${end.replace(':', '')}00`);
    }
    lines.push(fold(`SUMMARY:${icsEscape((e.kind === 'task' ? (e.done ? '✓ ' : '☐ ') : '') + (e.title || 'Untitled'))}`));
    lines.push(`CATEGORIES:${icsEscape(CAT_META[e.category]?.label ?? 'Other')}`);
    if (e.notes) lines.push(fold(`DESCRIPTION:${icsEscape(e.notes)}`));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export default function CalendarPage() {
  const { events, applications, upsertEvent, deleteEvent } = useStore();
  const toast = useToast();
  const today = todayStr();
  const [view, setView] = useState<View>(() => (localStorage.getItem('hr:calView') as View) || 'month');
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [showTracker, setShowTracker] = useState(() => localStorage.getItem('hr:calTracker') !== '0');
  const [filter, setFilter] = useState<EventCategory | 'all'>('all');
  const [editing, setEditing] = useState<{ ev: PlannerEvent; isNew: boolean } | null>(null);

  const changeView = (v: View) => { setView(v); try { localStorage.setItem('hr:calView', v); } catch { /* ignore */ } };
  const toggleTracker = () => { const n = !showTracker; setShowTracker(n); try { localStorage.setItem('hr:calTracker', n ? '1' : '0'); } catch { /* ignore */ } };

  const items = useMemo<Item[]>(() => {
    const out: Item[] = events.map((e) => ({
      key: e.id, title: e.title || 'Untitled', date: e.date, time: e.allDay ? '' : e.time, endTime: e.allDay ? '' : e.endTime, allDay: e.allDay || !e.time,
      color: e.color || CAT_META[e.category]?.color || CAT_META.other.color, category: e.category, kind: e.kind, done: e.done, source: 'planner', ev: e,
    }));
    if (showTracker) {
      for (const a of applications) {
        const who = [a.role, a.company].filter(Boolean).join(' · ') || 'Application';
        if (a.dateApplied) out.push({ key: `ta-${a.id}`, title: `Applied: ${who}`, date: a.dateApplied.slice(0, 10), time: '', endTime: '', allDay: true, color: '#94A3B8', category: 'deadline', kind: 'event', done: true, source: 'tracker', sub: 'From Applications' });
        if (a.followUp) {
          const interview = a.status === 'interview';
          out.push({ key: `tf-${a.id}`, title: `${interview ? 'Interview' : 'Follow up'}: ${who}`, date: a.followUp.slice(0, 10), time: '', endTime: '', allDay: true,
            color: interview ? CAT_META.interview.color : CAT_META['follow-up'].color, category: interview ? 'interview' : 'follow-up', kind: 'task', done: a.status === 'offer' || a.status === 'rejected', source: 'tracker', sub: 'From Applications' });
        }
      }
    }
    return out.filter((i) => filter === 'all' || i.category === filter).sort(sortItems);
  }, [events, applications, showTracker, filter]);

  const byDay = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) { const l = m.get(i.date); if (l) l.push(i); else m.set(i.date, [i]); }
    return m;
  }, [items]);

  const cur = parse(cursor);
  const openNew = (date: string, kind: 'event' | 'task' = 'event') => setEditing({ ev: blankEvent(date, kind), isNew: true });
  const openItem = (i: Item) => { if (i.ev) setEditing({ ev: structuredClone(i.ev), isNew: false }); };
  const toggleDone = (i: Item) => { if (i.ev) upsertEvent({ ...i.ev, done: !i.ev.done }); };

  const step = (dir: number) => {
    if (view === 'month') setCursor(keyOf(new Date(cur.getFullYear(), cur.getMonth() + dir, 1)));
    else if (view === 'week') setCursor(keyOf(addDays(cur, dir * 7)));
    else setCursor(keyOf(addDays(cur, dir * 30)));
  };
  const goToday = () => { setCursor(today); setSelected(today); };

  const title = view === 'month'
    ? cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : view === 'week'
      ? (() => { const s = startOfWeek(cur); const e = addDays(s, 6); return `${s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`; })()
      : `From ${fmtDay(cursor, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const exportIcs = () => {
    if (!events.length) { toast('Add an event first — tracker items are not exported.'); return; }
    download(`hire-ready-planner-${today}.ics`, toIcs(events), 'text/calendar');
    toast(`Exported ${events.length} item${events.length === 1 ? '' : 's'} (.ics)`);
  };

  // Side lists
  const overdue = items.filter((i) => i.kind === 'task' && !i.done && i.date < today);
  const todays = byDay.get(today) ?? [];
  const weekEnd = keyOf(addDays(parse(today), 7));
  const upcoming = items.filter((i) => i.date > today && i.date <= weekEnd);

  const chip = (i: Item, compact?: boolean) => (
    <button key={i.key} type="button" className={`cal-chip${i.done ? ' done' : ''}${i.source === 'tracker' ? ' trk' : ''}`} style={{ ['--c' as string]: i.color }}
      onClick={(e) => { e.stopPropagation(); if (i.source === 'tracker') return; openItem(i); }}
      title={`${i.title}${i.time ? ' · ' + fmtTime(i.time) : ''}${i.sub ? ' · ' + i.sub : ''}`}>
      {!compact && i.time && <span className="cal-chip-t">{fmtTime(i.time)}</span>}
      <span className="cal-chip-x">{i.title}</span>
    </button>
  );

  const row = (i: Item, showDate?: boolean) => (
    <li key={i.key} className={`cal-row${i.done ? ' done' : ''}`} style={{ ['--c' as string]: i.color }}>
      {i.kind === 'task' && i.source === 'planner'
        ? <input type="checkbox" className="cal-done" checked={i.done} onChange={() => toggleDone(i)} aria-label={`Mark ${i.title} ${i.done ? 'not done' : 'done'}`} />
        : <span className="cal-dot" aria-hidden="true" />}
      <button type="button" className="cal-row-main" onClick={() => (i.source === 'tracker' ? undefined : openItem(i))} disabled={i.source === 'tracker'}>
        <b>{i.title}</b>
        <small>
          {[showDate ? fmtDay(i.date) : '', i.allDay ? 'All day' : fmtTime(i.time) + (i.endTime ? ` – ${fmtTime(i.endTime)}` : ''), CAT_META[i.category]?.label, i.sub].filter(Boolean).join(' · ')}
        </small>
      </button>
      {i.source === 'tracker' && <a className="icon-btn xs" href="/tracker" onClick={linkClick} aria-label="Open in Applications"><Icon name="external" size={14} /></a>}
    </li>
  );

  /* ---------- views ---------- */
  let body;
  if (view === 'month') {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const start = startOfWeek(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const trimmed = days[35].getMonth() !== cur.getMonth() ? days.slice(0, 35) : days;
    body = (
      <div className="cal-month" role="grid" aria-label={title}>
        {DOW.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
        {trimmed.map((d) => {
          const k = keyOf(d);
          const list = byDay.get(k) ?? [];
          const out = d.getMonth() !== cur.getMonth();
          return (
            <div key={k} role="gridcell" tabIndex={0} aria-selected={k === selected}
              className={`cal-cell${out ? ' out' : ''}${k === today ? ' today' : ''}${k === selected ? ' sel' : ''}`}
              onClick={() => setSelected(k)} onDoubleClick={() => openNew(k)}
              onKeyDown={(e) => { if (e.key === 'Enter') { if (selected === k) openNew(k); else setSelected(k); } }}
              aria-label={`${fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' })}, ${list.length} item${list.length === 1 ? '' : 's'}`}>
              <span className="cal-num">{d.getDate()}</span>
              <div className="cal-chips">
                {list.slice(0, 3).map((i) => chip(i, true))}
                {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
              </div>
              <div className="cal-dots" aria-hidden="true">{list.slice(0, 4).map((i) => <i key={i.key} style={{ background: i.color }} />)}</div>
            </div>
          );
        })}
      </div>
    );
  } else if (view === 'week') {
    const s = startOfWeek(cur);
    body = (
      <div className="cal-week">
        {Array.from({ length: 7 }, (_, n) => {
          const k = keyOf(addDays(s, n));
          const list = byDay.get(k) ?? [];
          return (
            <section key={k} className={`cal-wday${k === today ? ' today' : ''}`} aria-label={fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' })}>
              <header>
                <span><b>{fmtDay(k, { weekday: 'short' })}</b> {parse(k).getDate()}</span>
                <button type="button" className="icon-btn xs" aria-label={`Add on ${fmtDay(k)}`} onClick={() => openNew(k)}><Icon name="plus" size={14} /></button>
              </header>
              {list.length ? <ul className="cal-list">{list.map((i) => row(i))}</ul> : <p className="cal-empty">Free</p>}
            </section>
          );
        })}
      </div>
    );
  } else {
    const end = keyOf(addDays(cur, 60));
    const days = [...byDay.keys()].filter((k) => k >= cursor && k <= end).sort();
    body = (
      <div className="cal-agenda">
        {days.length === 0 && <div className="empty card"><Icon name="calendar" size={28} /><p>Nothing planned in the next 60 days.</p><button type="button" className="btn btn-primary" onClick={() => openNew(cursor)}><Icon name="plus" size={16} />Add an event</button></div>}
        {days.map((k) => (
          <section key={k} className={`cal-ag-day${k === today ? ' today' : ''}`}>
            <h3><span className="cal-ag-num">{parse(k).getDate()}</span><span>{fmtDay(k, { weekday: 'long' })}<small>{fmtDay(k, { month: 'long', year: 'numeric' })}</small></span></h3>
            <ul className="cal-list">{byDay.get(k)!.map((i) => row(i))}</ul>
          </section>
        ))}
      </div>
    );
  }

  const selList = byDay.get(selected) ?? [];

  return (
    <div className="page cal-page">
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="muted">Plan interviews, deadlines, follow-ups and study time. Saved on this device only.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline" onClick={exportIcs}><Icon name="download" size={16} />Export .ics</button>
          <button type="button" className="btn btn-outline" onClick={() => openNew(selected, 'task')}><Icon name="check" size={16} />New task</button>
          <button type="button" className="btn btn-primary" onClick={() => openNew(selected)} data-testid="cal-new"><Icon name="plus" size={16} />New event</button>
        </div>
      </div>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" size={16} /></button>
          <button type="button" className="btn btn-outline btn-sm" onClick={goToday}>Today</button>
          <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next"><Icon name="right" size={16} /></button>
          <h2 className="cal-title" aria-live="polite">{title}</h2>
        </div>
        <div className="seg" role="tablist" aria-label="Calendar view">
          {(['month', 'week', 'agenda'] as View[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => changeView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="cal-filters">
        <select aria-label="Filter by category" value={filter} onChange={(e) => setFilter(e.target.value as EventCategory | 'all')}>
          <option value="all">All categories</option>
          {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_META[c].label}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={showTracker} onChange={toggleTracker} />Show Applications dates</label>
        <div className="cal-legend" aria-hidden="true">{EVENT_CATEGORIES.map((c) => <span key={c}><i style={{ background: CAT_META[c].color }} />{CAT_META[c].label}</span>)}</div>
      </div>

      <div className={`cal-layout cal-v-${view}`}>
        <div className="cal-main card">{body}</div>
        <aside className="cal-side">
          {view === 'month' && (
            <section className="card cal-panel cal-selday">
              <header><h3>{selected === today ? 'Today' : fmtDay(selected, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                <button type="button" className="icon-btn xs" aria-label="Add on this day" onClick={() => openNew(selected)}><Icon name="plus" size={14} /></button></header>
              {selList.length ? <ul className="cal-list">{selList.map((i) => row(i))}</ul> : <p className="cal-empty">Nothing planned. Double-click a day (or tap +) to add.</p>}
            </section>
          )}
          {overdue.length > 0 && (
            <section className="card cal-panel cal-overdue">
              <header><h3>Overdue tasks</h3><span className="pill">{overdue.length}</span></header>
              <ul className="cal-list">{overdue.slice(0, 8).map((i) => row(i, true))}</ul>
            </section>
          )}
          {!(view === 'month' && selected === today) && (
            <section className="card cal-panel">
              <header><h3>Today</h3><span className="muted small">{fmtDay(today)}</span></header>
              {todays.length ? <ul className="cal-list">{todays.map((i) => row(i))}</ul> : <p className="cal-empty">A clear day.</p>}
            </section>
          )}
          <section className="card cal-panel">
            <header><h3>Next 7 days</h3></header>
            {upcoming.length ? <ul className="cal-list">{upcoming.slice(0, 12).map((i) => row(i, true))}</ul> : <p className="cal-empty">Nothing coming up.</p>}
          </section>
        </aside>
      </div>

      {editing && (
        <EventForm ev={editing.ev} isNew={editing.isNew} onClose={() => setEditing(null)}
          onSave={async (e) => { await upsertEvent(e); setEditing(null); setSelected(e.date); toast(editing.isNew ? 'Added to your calendar' : 'Saved'); }}
          onDelete={async () => { await deleteEvent(editing.ev.id); setEditing(null); toast('Deleted'); }} />
      )}
    </div>
  );
}

function EventForm({ ev, isNew, onClose, onSave, onDelete }: { ev: PlannerEvent; isNew: boolean; onClose: () => void; onSave: (e: PlannerEvent) => void; onDelete: () => void }) {
  const [e, setE] = useState(ev);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = <K extends keyof PlannerEvent>(k: K, v: PlannerEvent[K]) => setE((x) => ({ ...x, [k]: v }));
  const valid = e.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
  const submit = () => { if (valid) onSave({ ...e, title: e.title.trim(), endTime: e.allDay ? '' : e.endTime, time: e.allDay ? '' : e.time }); };
  return (
    <Modal title={isNew ? (e.kind === 'task' ? 'New task' : 'New event') : (e.kind === 'task' ? 'Edit task' : 'Edit event')} onClose={onClose}
      footer={
        <>
          {!isNew && (confirmDel
            ? <button type="button" className="btn btn-danger" onClick={onDelete}>Confirm delete</button>
            : <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(true)}><Icon name="trash" size={15} />Delete</button>)}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={submit} data-testid="cal-save">{isNew ? 'Add' : 'Save'}</button>
        </>
      }>
      <form className="cal-form" onSubmit={(x) => { x.preventDefault(); submit(); }}>
        <div className="seg cal-kind" role="radiogroup" aria-label="Type">
          {(['event', 'task'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={e.kind === k} className={e.kind === k ? 'active' : ''} onClick={() => set('kind', k)}>
              <Icon name={k === 'task' ? 'check' : 'calendar'} size={14} />{k === 'task' ? 'Task' : 'Event'}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="cal-title">Title</label>
          <input id="cal-title" autoFocus value={e.title} onChange={(x) => set('title', x.target.value)} placeholder={e.kind === 'task' ? 'Submit application to Acme' : 'Technical interview — Acme'} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="cal-date">Date</label>
            <input id="cal-date" type="date" value={e.date} onChange={(x) => set('date', x.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cal-cat">Category</label>
            <select id="cal-cat" value={e.category} onChange={(x) => set('category', x.target.value as EventCategory)}>
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_META[c].label}</option>)}
            </select>
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={e.allDay} onChange={(x) => set('allDay', x.target.checked)} />All day</label>
        {!e.allDay && (
          <div className="grid2">
            <div className="field"><label htmlFor="cal-start">Start</label><input id="cal-start" type="time" value={e.time} onChange={(x) => set('time', x.target.value)} /></div>
            <div className="field"><label htmlFor="cal-end">End (optional)</label><input id="cal-end" type="time" value={e.endTime} onChange={(x) => set('endTime', x.target.value)} /></div>
          </div>
        )}
        <div className="field">
          <span className="lbl" id="cal-color-l">Colour</span>
          <div className="cal-swatches" role="radiogroup" aria-labelledby="cal-color-l">
            {SWATCHES.map((c) => (
              <button key={c || 'auto'} type="button" role="radio" aria-checked={e.color === c} aria-label={c ? c : 'Category colour'}
                className={`cal-sw${e.color === c ? ' on' : ''}${c ? '' : ' auto'}`} style={{ background: c || CAT_META[e.category].color }} onClick={() => set('color', c)}>
                {!c && <span>A</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="cal-notes">Notes</label>
          <textarea id="cal-notes" rows={3} value={e.notes} onChange={(x) => set('notes', x.target.value)} placeholder="Interviewer, meeting link, what to prepare…" />
        </div>
        <label className="check"><input type="checkbox" checked={e.done} onChange={(x) => set('done', x.target.checked)} />{e.kind === 'task' ? 'Done' : 'Completed / attended'}</label>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
