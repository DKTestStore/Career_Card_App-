import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { STATUSES, type Application, type AppStatus } from '../lib/types';
import { useStore } from '../lib/store';
import { Modal, ConfirmDialog } from './Modal';
import { Field, AutoTextarea } from './fields';
import { STATUS_META } from '../pages/trackerMeta';
import { nowIso, todayStr, uid } from '../lib/util';
import { Icon } from './Icon';
import { useToast } from './Toast';

export function blankApp(status: AppStatus = 'applied'): Application {
  const t = nowIso();
  return { id: uid(), company: '', role: '', location: '', link: '', dateApplied: status === 'wishlist' ? '' : todayStr(), salary: '', resumeId: '', versionId: '',
    status, notes: '', followUp: '', contact: '', order: Date.now(), createdAt: t, updatedAt: t };
}

export function AppForm({ initial, isNew, onClose }: { initial: Application; isNew: boolean; onClose: () => void }) {
  const { resumes, versions, atsReports, upsertApplication, deleteApplication } = useStore();
  const toast = useToast();
  const [a, setA] = useState<Application>(initial);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');
  const set = <K extends keyof Application>(k: K, v: Application[K]) => setA((x) => ({ ...x, [k]: v }));
  const vers = useMemo(() => versions.filter((v) => v.resumeId === a.resumeId).sort((x, y) => y.number - x.number), [versions, a.resumeId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!a.company.trim() || !a.role.trim()) { setErr('Company and role are required.'); return; }
    await upsertApplication({ ...a, company: a.company.trim(), role: a.role.trim() });
    toast(isNew ? 'Application added' : 'Application updated');
    onClose();
  };

  return (
    <Modal title={isNew ? 'New application' : `${a.role || 'Application'} · ${a.company}`} onClose={onClose} wide footer={<>
      {!isNew && <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDel(true)}><Icon name="trash" size={15} /> Delete</button>}
      <span className="spacer" />
      <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button type="submit" form="app-form" className="btn btn-primary">{isNew ? 'Add application' : 'Save changes'}</button>
    </>}>
      <form id="app-form" onSubmit={submit} className="grid2" noValidate>
        {err && <p className="form-err span2" role="alert">{err}</p>}
        <Field label="Company *" value={a.company} onChange={(v) => set('company', v)} />
        <Field label="Role *" value={a.role} onChange={(v) => set('role', v)} />
        <Field label="Location" value={a.location} onChange={(v) => set('location', v)} placeholder="Bengaluru / Remote" />
        <div className="field">
          <label htmlFor="app-status">Status</label>
          <select id="app-status" value={a.status} onChange={(e) => set('status', e.target.value as AppStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
        <Field label="Job link" type="url" className="span2" value={a.link} onChange={(v) => set('link', v)} placeholder="https://…" />
        <Field label="Date applied" type="date" value={a.dateApplied} onChange={(v) => set('dateApplied', v)} />
        <Field label="Next follow-up" type="date" value={a.followUp} onChange={(v) => set('followUp', v)} />
        <Field label="Salary / CTC (optional)" value={a.salary} onChange={(v) => set('salary', v)} placeholder="₹18 LPA" />
        <Field label="Contact" value={a.contact} onChange={(v) => set('contact', v)} placeholder="Recruiter name / email" />
        <div className="field">
          <label htmlFor="app-resume">Resume used</label>
          <select id="app-resume" value={a.resumeId} onChange={(e) => setA((x) => ({ ...x, resumeId: e.target.value, versionId: '' }))}>
            <option value="">— None —</option>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            {a.resumeId && !resumes.some((r) => r.id === a.resumeId) && <option value={a.resumeId}>(deleted resume)</option>}
          </select>
        </div>
        <div className="field">
          <label htmlFor="app-version">Version</label>
          <select id="app-version" value={a.versionId} onChange={(e) => set('versionId', e.target.value)} disabled={!a.resumeId}>
            <option value="">Current (latest edits)</option>
            {vers.map((v) => <option key={v.id} value={v.id}>v{v.number} · {v.label}</option>)}
          </select>
        </div>
        <div className="field span2">
          <label htmlFor="app-ats">ATS report</label>
          <select id="app-ats" value={a.atsReportId ?? ''} onChange={(e) => set('atsReportId', e.target.value || undefined)}>
            <option value="">— None —</option>
            {atsReports.filter((r) => !a.resumeId || r.resumeId === a.resumeId).map((r) => <option key={r.id} value={r.id}>{r.score}/100 · {r.jdTitle} ({r.resumeName})</option>)}
            {a.atsReportId && !atsReports.some((r) => r.id === a.atsReportId) && <option value={a.atsReportId}>(deleted report)</option>}
          </select>
        </div>
        <div className="span2"><AutoTextarea label="Notes" rows={3} value={a.notes} onChange={(v) => set('notes', v)} placeholder="Interview rounds, referral, questions asked…" /></div>
      </form>
      {confirmDel && <ConfirmDialog title="Delete application?" message={<>Remove {a.role} at {a.company} from your tracker?</>} onClose={() => setConfirmDel(false)}
        onConfirm={async () => { await deleteApplication(a.id); toast('Application deleted'); onClose(); }} />}
    </Modal>
  );
}
