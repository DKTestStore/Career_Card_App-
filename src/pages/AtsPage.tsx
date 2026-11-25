import { useDeferredValue, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { linkClick, navigate, useQuery } from '../lib/router';
import { analyze, type FixTarget, type Rewrite } from '../lib/ats/score';
import { matchKeywords, whereToAdd, type JdKeyword } from '../lib/ats/keywords';
import { SAMPLE_JDS } from '../lib/ats/samples';
import type { AtsReport } from '../lib/types';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { nowIso, timeAgo, uid } from '../lib/util';
import { templateById } from '../templates/registry';

export default function AtsPage() {
  const { resumes, atsReports, saveAtsReport, deleteAtsReport, updateResume } = useStore();
  const toast = useToast();
  const q = useQuery();
  const [resumeId, setResumeId] = useState(() => q.get('resume') ?? resumes[0]?.id ?? '');
  const [jdTitle, setJdTitle] = useState('');
  const [jd, setJd] = useState('');
  const [picked, setPicked] = useState<JdKeyword | null>(null);
  const deferredJd = useDeferredValue(jd);
  const resume = resumes.find((r) => r.id === resumeId) ?? resumes[0];

  const kw = useMemo(() => (resume && deferredJd.trim().length > 30 ? matchKeywords(resume, deferredJd) : null), [resume, deferredJd]);
  const result = useMemo(() => resume ? analyze(resume, kw ? { matched: kw.matched, missingCount: kw.missing.length, total: kw.all.length, score01: kw.score01 } : undefined) : null, [resume, kw]);
  const history = atsReports.filter((r) => !resume || r.resumeId === resume.id);

  if (!resumes.length || !resume || !result) {
    return (
      <div className="page"><div className="empty card">
        <Icon name="target" size={32} />
        <h3>Create a resume first</h3>
        <p className="muted">The ATS checker scores one of your resumes against a job description.</p>
        <a className="btn btn-primary" href="/resumes" onClick={linkClick}>Go to resumes</a>
      </div></div>
    );
  }

  const fixLink = (t: FixTarget) => navigate(`/resumes/${resume.id}?section=${t}`);
  const loadSample = (key: string) => { const s = SAMPLE_JDS.find((x) => x.key === key)!; setJd(s.text); setJdTitle(s.title); setPicked(null); };
  const applyRewrite = (rw: Rewrite) => {
    updateResume(resume.id, (r) => {
      const c = structuredClone(r.content);
      const list = rw.section === 'work' ? c.work : c.projects;
      const e = list.find((x) => x.id === rw.entryId);
      if (e && e.highlights[rw.index]?.trim() === rw.original) e.highlights[rw.index] = rw.suggestion;
      return { ...r, content: c };
    });
    toast('Bullet updated');
  };
  const save = async () => {
    const rep: AtsReport = {
      id: uid(), resumeId: resume.id, resumeName: resume.name, jdTitle: jdTitle.trim() || (kw ? 'Untitled job' : 'General check'), jdText: jd,
      score: result.score, breakdown: result.breakdown, matched: kw?.matched ?? [], missing: kw?.missing.map((m) => m.term) ?? [], createdAt: nowIso(),
    };
    await saveAtsReport(rep);
    toast(`Saved ATS report (${rep.score}/100)`);
  };
  const tpl = templateById(resume.template);

  return (
    <div className="page ats-page">
      <div className="page-head">
        <div><h1>ATS Check</h1><p className="muted">Score a resume against a job description. Runs entirely on this device; nothing is uploaded.</p></div>
      </div>

      <div className="ats-grid">
        <section className="card ats-input" aria-label="Job description">
          <div className="field">
            <label htmlFor="ats-resume">Resume</label>
            <select id="ats-resume" value={resume.id} onChange={(e) => { setResumeId(e.target.value); setPicked(null); }}>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <small className="muted">Template: {tpl.name} · <span className={`tag ${tpl.ats ? 'tag-ats' : 'tag-design'}`}>{tpl.ats ? 'ATS-friendly' : 'Design-focused'}</span></small>
          </div>
          <div className="field">
            <span className="field-label">Try a sample job</span>
            <div className="chip-row">
              {SAMPLE_JDS.map((s) => <button key={s.key} type="button" className="chip-btn" data-jd={s.key} onClick={() => loadSample(s.key)}>{s.title}</button>)}
            </div>
          </div>
          <div className="field">
            <label htmlFor="jd-title">Job title (for your history)</label>
            <input id="jd-title" value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} placeholder="e.g. Backend Engineer at Razorpay" />
          </div>
          <div className="field">
            <label htmlFor="jd-text">Job description</label>
            <textarea id="jd-text" rows={12} value={jd} onChange={(e) => { setJd(e.target.value); setPicked(null); }}
              placeholder="Paste the full job description here: responsibilities and requirements." />
            <small className="muted">{jd.trim() ? `${jd.trim().split(/\s+/).length} words` : 'Without a job description you get a general score (no keyword match).'}</small>
          </div>
          <div className="ats-actions">
            <button type="button" className="btn btn-primary" onClick={save} data-testid="save-report"><Icon name="save" size={16} /> Save report</button>
            {jd && <button type="button" className="btn btn-ghost" onClick={() => { setJd(''); setJdTitle(''); }}>Clear</button>}
          </div>
        </section>

        <section className="card ats-result" aria-label="ATS results" aria-live="polite">
          <div className="ats-score-row">
            <Gauge score={result.score} />
            <div className="ats-score-text">
              <h2>{result.hasJd ? 'Job match score' : 'General ATS score'}</h2>
              <p className="muted small">{result.hasJd ? `Matched against “${jdTitle || 'your job description'}”.` : 'General score: paste a job description to add keyword matching (35% of the score).'}</p>
              <a className="btn btn-outline btn-sm" href={`/resumes/${resume.id}`} onClick={linkClick}><Icon name="edit" size={15} /> Open in editor</a>
            </div>
          </div>
          <ul className="bd-list" aria-label="Score breakdown">
            {result.breakdown.map((b) => {
              const pct = b.max ? b.score / b.max : 0;
              return (
                <li key={b.key} data-key={b.key}>
                  <div className="bd-top"><span>{b.label}</span><b>{Math.round(b.score)}/{b.max}</b></div>
                  <div className="bd-bar"><i style={{ width: `${pct * 100}%` }} className={pct >= 0.8 ? 'good' : pct >= 0.5 ? 'ok' : 'low'} /></div>
                  <small className="muted">{b.detail}</small>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {kw && (
        <section className="card ats-kw" aria-label="Keywords">
          <h2>Keywords <span className="muted small">{kw.matched.length} matched · {kw.missing.length} missing</span></h2>
          <div className="kw-cols">
            <div>
              <h3 className="block-label">Matched</h3>
              <div className="kw-chips">{kw.matched.length ? kw.matched.map((k) => <span key={k} className="kw kw-ok"><Icon name="check" size={12} />{k}</span>) : <span className="muted small">None yet</span>}</div>
            </div>
            <div>
              <h3 className="block-label">Missing <span className="muted">(click for where to add)</span></h3>
              <div className="kw-chips">
                {kw.missing.length ? kw.missing.map((k) => (
                  <button type="button" key={k.term} className={`kw kw-miss${picked?.term === k.term ? ' active' : ''}`} aria-pressed={picked?.term === k.term} onClick={() => setPicked(picked?.term === k.term ? null : k)}>
                    <Icon name="plus" size={12} />{k.term}
                  </button>
                )) : <span className="muted small">Nothing missing. Great match!</span>}
              </div>
              {picked && (() => {
                const w = whereToAdd(picked);
                return (
                  <div className="kw-hint" role="note" data-testid="kw-hint">
                    <b>{picked.term}</b>
                    <p>{w.text}</p>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => fixLink(w.section)}>Go to {w.section === 'work' ? 'Experience' : w.section[0].toUpperCase() + w.section.slice(1)} <Icon name="right" size={14} /></button>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      <div className="ats-grid">
        <section className="card" aria-label="Suggestions">
          <h2>Suggestions <span className="muted small">{result.suggestions.length}</span></h2>
          {result.suggestions.length === 0 ? <p className="muted">No issues found.</p> : (
            <ul className="sugg-list">
              {result.suggestions.map((s) => (
                <li key={s.id}>
                  <span className={`sev sev-${s.severity}`}>{s.severity}</span>
                  <span className="sugg-text">{s.text}</span>
                  {s.target && <button type="button" className="btn btn-ghost btn-xs" onClick={() => fixLink(s.target!)}>Fix</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card" aria-label="Bullet rewrites">
          <h2>Bullet rewrites <span className="muted small">{result.rewrites.length}</span></h2>
          {result.rewrites.length === 0 ? <p className="muted">Your bullets look strong.</p> : (
            <ul className="rw-list">
              {result.rewrites.map((rw) => (
                <li key={rw.id}>
                  <small className="muted">{rw.where} · {rw.reason}</small>
                  <p className="rw-old">{rw.original}</p>
                  <p className="rw-new">{rw.suggestion}</p>
                  {rw.canApply ? <button type="button" className="btn btn-soft btn-xs" onClick={() => applyRewrite(rw)}>Apply</button>
                    : <button type="button" className="btn btn-ghost btn-xs" onClick={() => fixLink(rw.section)}>Edit bullet</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-label="Saved reports">
        <h2>History <span className="muted small">{history.length} saved for this resume</span></h2>
        {history.length === 0 ? <p className="muted">Save a report to keep a record and link it to an application in the tracker.</p> : (
          <ul className="hist-list">
            {history.map((h) => (
              <li key={h.id}>
                <span className={`ats-chip ${h.score >= 75 ? 'good' : h.score >= 50 ? 'ok' : 'low'}`}>{h.score}</span>
                <div className="hist-main"><b>{h.jdTitle}</b><small className="muted">{h.resumeName} · {timeAgo(h.createdAt)} · {h.matched.length} matched / {h.missing.length} missing</small></div>
                {h.jdText && <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setJd(h.jdText); setJdTitle(h.jdTitle); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Load</button>}
                <button type="button" className="icon-btn xs danger" aria-label={`Delete report ${h.jdTitle}`} onClick={() => deleteAtsReport(h.id)}><Icon name="trash" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
