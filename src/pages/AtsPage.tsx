import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { linkClick, navigate, useQuery } from '../lib/router';
import { analyze, type FixTarget, type Rewrite } from '../lib/ats/score';
import { matchKeywords, skillsGroupFor, whereToAdd, type JdKeyword, type KwGroup, type KwHit } from '../lib/ats/keywords';
import { SAMPLE_JDS } from '../lib/ats/samples';
import type { AtsReport, Resume } from '../lib/types';
import { readResumeFile, UPLOAD_ACCEPT, type UploadedResume } from '../components/UploadResume';
import { newResume } from '../lib/resume';
import { Gauge } from '../components/Gauge';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { nowIso, timeAgo, uid } from '../lib/util';
import { templateById } from '../templates/registry';

export default function AtsPage() {
  const { resumes, atsReports, saveAtsReport, deleteAtsReport, updateResume, addResume } = useStore();
  const toast = useToast();
  const q = useQuery();
  const [resumeId, setResumeId] = useState(() => q.get('resume') ?? resumes[0]?.id ?? '');
  const [source, setSource] = useState<'saved' | 'upload'>(() => (resumes.length ? 'saved' : 'upload'));
  const [uploaded, setUploaded] = useState<UploadedResume | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [jdTitle, setJdTitle] = useState('');
  const [jd, setJd] = useState('');
  const [picked, setPicked] = useState<JdKeyword | null>(null);
  const [group, setGroup] = useState<KwGroup | 'all'>('all');
  const deferredJd = useDeferredValue(jd);
  const deferredTitle = useDeferredValue(jdTitle);
  const saved = resumes.find((r) => r.id === resumeId) ?? resumes[0];
  const uploadedResume = useMemo<Resume | null>(() => (uploaded ? { ...newResume(uploaded.fileName, uploaded.content, 'minimal'), id: 'uploaded' } : null), [uploaded]);
  const resume = source === 'upload' ? uploadedResume : saved;
  const isUpload = source === 'upload';

  const kw = useMemo(() => (resume && deferredJd.trim().length > 30 ? matchKeywords(resume, deferredJd, deferredTitle) : null), [resume, deferredJd, deferredTitle]);
  const result = useMemo(() => resume ? analyze(resume, kw ? { matched: kw.matched, missingCount: kw.missing.length, total: kw.all.length, score01: kw.score01 } : undefined) : null, [resume, kw]);
  const history = atsReports.filter((r) => !resume || r.resumeId === resume.id);

  const onFile = async (f?: File) => {
    if (!f) return;
    setReading(true);
    try { const u = await readResumeFile(f); setUploaded(u); setSource('upload'); setPicked(null); toast(`Read ${f.name}`); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not read that file.'); }
    finally { setReading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const fileInput = <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} hidden data-testid="ats-upload-input" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload a resume file to check" />;
  const sourcePicker = (
    <div className="field">
      <span className="field-label">Resume to check</span>
      <div className="seg" role="radiogroup" aria-label="Resume source">
        <button type="button" role="radio" aria-checked={!isUpload} className={!isUpload ? 'active' : ''} disabled={!resumes.length} onClick={() => setSource('saved')}>Saved resume</button>
        <button type="button" role="radio" aria-checked={isUpload} className={isUpload ? 'active' : ''} onClick={() => { if (uploaded) setSource('upload'); else fileRef.current?.click(); /* switch only after a file is read, so the input isn't remounted mid-pick */ }} data-testid="ats-source-upload">Upload a file</button>
      </div>
    </div>
  );

  if (!resume || !result) {
    return (
      <div className="page ats-page">
        <div className="page-head"><div><h1>ATS Check</h1><p className="muted">Match a resume against a job description. Runs entirely on this device; nothing is uploaded.</p></div></div>
        <div className="empty card">
          <Icon name="target" size={32} />
          <h3>{isUpload ? 'Upload your resume to check it' : 'Create a resume first'}</h3>
          <p className="muted">Upload a PDF, Word (.docx) or text resume and paste a job description to see your match rate and missing keywords.</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={reading} data-testid="ats-upload"><Icon name="upload" size={16} />{reading ? 'Reading…' : 'Upload PDF / Word'}</button>
            {resumes.length > 0 ? <button type="button" className="btn btn-outline" onClick={() => setSource('saved')}>Use a saved resume</button>
              : <a className="btn btn-outline" href="/resumes" onClick={linkClick}>Build a resume</a>}
          </div>
          {fileInput}
        </div>
      </div>
    );
  }

  const fixLink = (t: FixTarget) => { if (isUpload) { toast('Save the uploaded file as a resume to edit it.'); return; } navigate(`/resumes/${resume.id}?section=${t}`); };
  const saveUpload = async () => {
    if (!uploaded) return;
    const r = newResume(`${uploaded.content.basics.name || uploaded.fileName.replace(/\.[^.]+$/, '')} — Uploaded`, structuredClone(uploaded.content), 'modern');
    await addResume(r);
    setResumeId(r.id); setSource('saved'); setUploaded(null);
    toast(`Saved “${r.name}”. You can now apply fixes.`);
  };
  const addToSkills = (hits: Pick<KwHit, 'term' | 'kind'>[]) => {
    if (isUpload) { toast('Save the uploaded file as a resume to add keywords.'); return; }
    if (!hits.length) return;
    updateResume(resume.id, (r) => {
      const c = structuredClone(r.content);
      for (const h of hits) {
        const name = skillsGroupFor(h, c.skills.map((g) => g.name));
        let g = c.skills.find((x) => x.name === name);
        if (!g) { g = { id: uid(), name, level: '', keywords: [] }; c.skills.push(g); }
        if (!g.keywords.some((k) => k.toLowerCase() === h.term.toLowerCase())) g.keywords.push(h.term);
      }
      return { ...r, content: c };
    });
    toast(hits.length === 1 ? `Added “${hits[0].term}” to Skills` : `Added ${hits.length} keywords to Skills`);
  };
  const loadSample = (key: string) => { const s = SAMPLE_JDS.find((x) => x.key === key)!; setJd(s.text); setJdTitle(s.title); setPicked(null); };
  const applyRewrite = (rw: Rewrite) => {
    if (isUpload) { toast('Save the uploaded file as a resume to apply rewrites.'); return; }
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
    if (isUpload) { toast('Save the uploaded file as a resume first to keep reports.'); return; }
    const rep: AtsReport = {
      id: uid(), resumeId: resume.id, resumeName: resume.name, jdTitle: jdTitle.trim() || (kw ? 'Untitled job' : 'General check'), jdText: jd,
      score: result.score, breakdown: result.breakdown, matched: kw?.matched ?? [], missing: kw?.missing.map((m) => m.term) ?? [], createdAt: nowIso(),
    };
    await saveAtsReport(rep);
    toast(`Saved ATS report (${rep.score}/100)`);
  };
  const tpl = templateById(resume.template);
  const missingHard = kw?.hits.filter((h) => !h.matched && h.group === 'hard' && h.priority !== 'low') ?? [];

  return (
    <div className="page ats-page">
      <div className="page-head">
        <div><h1>ATS Check</h1><p className="muted">Score a resume against a job description. Runs entirely on this device; nothing is uploaded.</p></div>
      </div>

      <div className="ats-grid">
        <section className="card ats-input" aria-label="Job description">
          {sourcePicker}
          {isUpload ? (
            <div className="ats-upl" data-testid="ats-uploaded">
              <Icon name="file" size={18} />
              <div><b>{uploaded?.fileName}</b><small className="muted">{uploaded?.kind.toUpperCase()} · {uploaded?.content.basics.name || 'name not found'} · parsed on this device</small></div>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => fileRef.current?.click()}>Replace</button>
              <button type="button" className="btn btn-soft btn-xs" onClick={saveUpload} data-testid="ats-save-upload">Save as resume</button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="ats-resume">Resume</label>
              <select id="ats-resume" value={resume.id} onChange={(e) => { setResumeId(e.target.value); setPicked(null); }}>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <small className="muted">Template: {tpl.name} · <span className={`tag ${tpl.ats ? 'tag-ats' : 'tag-design'}`}>{tpl.ats ? 'ATS-friendly' : 'Design-focused'}</span></small>
            </div>
          )}
          {fileInput}
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
              {isUpload ? <button type="button" className="btn btn-outline btn-sm" onClick={saveUpload}><Icon name="save" size={15} /> Save as resume to edit</button>
                : <a className="btn btn-outline btn-sm" href={`/resumes/${resume.id}`} onClick={linkClick}><Icon name="edit" size={15} /> Open in editor</a>}
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

      {kw && <MatchReport kw={kw} group={group} setGroup={setGroup} picked={picked} setPicked={setPicked} canEdit={!isUpload}
        onAdd={addToSkills} onFix={fixLink} missingHard={missingHard} />}

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

const GROUP_LABEL: Record<KwGroup, string> = { hard: 'Hard skills', soft: 'Soft skills', other: 'Other keywords' };
const WHERE_LABEL: Record<string, string> = { summary: 'Summary', skills: 'Skills', experience: 'Experience', projects: 'Projects', education: 'Education' };

function MatchReport({ kw, group, setGroup, picked, setPicked, canEdit, onAdd, onFix, missingHard }: {
  kw: ReturnType<typeof matchKeywords>; group: KwGroup | 'all'; setGroup: (g: KwGroup | 'all') => void; picked: JdKeyword | null; setPicked: (k: JdKeyword | null) => void;
  canEdit: boolean; onAdd: (h: KwHit[]) => void; onFix: (t: FixTarget) => void; missingHard: KwHit[];
}) {
  const rate = Math.round(kw.score01 * 100);
  const stats = (['hard', 'soft', 'other'] as KwGroup[]).map((g) => {
    const xs = kw.hits.filter((h) => h.group === g);
    return { g, total: xs.length, got: xs.filter((h) => h.matched).length };
  });
  const rows = kw.hits.filter((h) => group === 'all' || h.group === group);
  const pickedHit = picked ? kw.hits.find((h) => h.term === picked.term) : null;
  const tips = kw.hits.filter((h) => h.matched && h.wording);
  const buried = kw.hits.filter((h) => h.matched && h.group === 'hard' && h.where.length === 1 && h.where[0] === 'skills' && h.priority === 'high');
  return (
    <section className="card ats-kw" aria-label="Keywords">
      <div className="mr-head">
        <div className={`mr-rate ${rate >= 70 ? 'good' : rate >= 50 ? 'ok' : 'low'}`} data-testid="match-rate"><b>{rate}%</b><span>match rate</span></div>
        <div className="mr-stats">
          <h2>Keyword match <span className="muted small">{kw.matched.length} matched · {kw.missing.length} missing</span></h2>
          <div className="mr-groups">
            {stats.map((x) => (
              <div key={x.g} className="mr-g" data-group={x.g}>
                <div className="bd-top"><span>{GROUP_LABEL[x.g]}</span><b>{x.got}/{x.total}</b></div>
                <div className="bd-bar"><i style={{ width: `${x.total ? (x.got / x.total) * 100 : 0}%` }} className={x.total && x.got / x.total >= 0.7 ? 'good' : x.total && x.got / x.total >= 0.5 ? 'ok' : 'low'} /></div>
              </div>
            ))}
          </div>
          {kw.title && (
            <p className={`mr-title ${kw.title.found ? 'ok' : 'miss'}`} data-testid="title-match">
              <Icon name={kw.title.found ? 'check' : 'alert'} size={14} />
              {kw.title.found ? <>Job title <b>“{kw.title.jd}”</b> appears in your headline or experience.</>
                : <>Job title <b>“{kw.title.jd}”</b> is not in your resume{kw.title.closest ? <> (closest: “{kw.title.closest}”)</> : null}. If it honestly fits, use the exact title in your headline.</>}
            </p>
          )}
          <p className="muted small">Aim for 70%+. High-priority keywords appear several times or in the must-have part of the posting and count three times as much as low ones.</p>
        </div>
      </div>

      <div className="mr-toolbar">
        <div className="seg seg-sm" role="tablist" aria-label="Keyword groups">
          {(['all', 'hard', 'soft', 'other'] as const).map((g) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)} data-kw-group={g}>
              {g === 'all' ? `All (${kw.hits.length})` : `${GROUP_LABEL[g].replace(' keywords', '')} (${kw.hits.filter((h) => h.group === g).length})`}
            </button>
          ))}
        </div>
        {canEdit && missingHard.length > 0 && (
          <button type="button" className="btn btn-soft btn-sm" onClick={() => onAdd(missingHard)} data-testid="add-all-missing">
            <Icon name="plus" size={14} />Add {missingHard.length} missing hard skill{missingHard.length === 1 ? '' : 's'} to Skills
          </button>
        )}
      </div>
      {canEdit && missingHard.length > 0 && <p className="muted small mr-honest">Only add skills you genuinely have. Then prove the important ones in an Experience or Project bullet.</p>}

      <div className="kw-table" role="table" aria-label="Keyword comparison">
        <div className="kw-tr kw-th" role="row">
          <span role="columnheader">Keyword</span><span role="columnheader">Priority</span><span role="columnheader">Job post</span><span role="columnheader">Resume</span><span role="columnheader">Where</span><span role="columnheader"><span className="sr-only">Action</span></span>
        </div>
        {rows.map((h) => (
          <div key={h.term} className={`kw-tr ${h.matched ? 'is-ok' : 'is-miss'}`} role="row" data-kw={h.term} data-group={h.group}>
            <span role="cell" className="kw-term">
              {h.matched ? <span className="kw kw-ok"><Icon name="check" size={12} />{h.term}</span>
                : <button type="button" className={`kw kw-miss${picked?.term === h.term ? ' active' : ''}`} aria-pressed={picked?.term === h.term} onClick={() => setPicked(picked?.term === h.term ? null : { term: h.term, kind: h.kind, weight: 1 })}><Icon name="plus" size={12} />{h.term}</button>}
              <small className="kw-kind">{GROUP_LABEL[h.group].replace(' keywords', '')}</small>
            </span>
            <span role="cell"><span className={`prio prio-${h.priority}`}>{h.priority}</span></span>
            <span role="cell" className="kw-n" aria-label={`${h.jdCount} in job post`}><span className="kw-lbl">Job </span>{h.jdCount}×</span>
            <span role="cell" className={`kw-n ${h.resumeCount ? '' : 'zero'}`} aria-label={`${h.resumeCount} in resume`}><span className="kw-lbl">Resume </span>{h.resumeCount}×</span>
            <span role="cell" className="kw-where">
              {h.where.map((w) => <span key={w} className="where">{WHERE_LABEL[w]}</span>)}
              {h.wording && <span className="where warn" title={`The job says "${h.wording.jd}", you wrote "${h.wording.resume}"`}>as “{h.wording.resume}”</span>}
            </span>
            <span role="cell" className="kw-act">
              {!h.matched && (h.group !== 'other' || h.kind === 'cert') && canEdit && (
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => onAdd([h])} data-testid="add-kw">Add to skills</button>
              )}
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="muted small">No keywords in this group.</p>}
      </div>

      {picked && pickedHit && (() => {
        const w = whereToAdd(picked);
        return (
          <div className="kw-hint" role="note" data-testid="kw-hint">
            <b>{picked.term}</b> <small className="muted">{pickedHit.priority} priority · {pickedHit.jdCount}× in the job post</small>
            <p>{w.text}</p>
            <div className="kw-hint-act">
              <button type="button" className="btn btn-soft btn-sm" onClick={() => onFix(w.section)}>Go to {w.section === 'work' ? 'Experience' : w.section[0].toUpperCase() + w.section.slice(1)} <Icon name="right" size={14} /></button>
              {canEdit && pickedHit.group !== 'other' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onAdd([pickedHit]); setPicked(null); }}>Add to skills</button>}
            </div>
          </div>
        );
      })()}

      {(tips.length > 0 || buried.length > 0) && (
        <ul className="mr-tips" aria-label="Wording tips">
          {tips.map((h) => <li key={h.term}><Icon name="alert" size={14} />The job says <b>“{h.wording!.jd}”</b> but your resume says <b>“{h.wording!.resume}”</b>. Use the job’s wording (or both, e.g. “{h.wording!.jd} ({h.wording!.resume})”) so exact-match filters find it.</li>)}
          {buried.slice(0, 4).map((h) => <li key={`b-${h.term}`}><Icon name="list" size={14} /><b>{h.term}</b> is only listed under Skills. Back it up with an Experience or Project bullet that shows a result.</li>)}
        </ul>
      )}
    </section>
  );
}
