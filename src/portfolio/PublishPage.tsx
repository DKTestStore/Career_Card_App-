import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { linkClick } from '../lib/router';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { byteSize, fmtBytes, MAX_PUBLISH_BYTES, publishPayload, publicUrl, slugError, slugify } from '../lib/portfolio/model';
import { checkSlug } from '../lib/portfolio/api';
import { qrPngDataUrl, qrSvg } from '../lib/portfolio/qr';
import { usePublish } from '../lib/portfolio/usePublish';
import type { Visibility } from '../lib/portfolio/types';
import { timeAgo } from '../lib/util';
import { Switch } from './bits';
import './builder.css';

const VIS: { id: Visibility; label: string; body: string }[] = [
  { id: 'public', label: 'Public', body: 'Anyone with the link can view this page. Search engines may index it.' },
  { id: 'private', label: 'Private', body: 'The link shows “This portfolio is private”. Your content is removed from the server; the address stays reserved.' },
  { id: 'password', label: 'Password', body: 'Visitors must enter a password you set. Good for sharing with one recruiter first.' },
];

export default function PublishPage() {
  const { portfolio: p, resumes, updatePortfolio } = useStore();
  const toast = useToast();
  const { publish, unpublish, busy } = usePublish();
  const [password, setPassword] = useState('');
  const [slugState, setSlugState] = useState<{ slug: string; ok: boolean; msg: string } | null>(null);
  const [qr, setQr] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);

  const slug = p?.slug ?? '';
  const token = p?.publish.token ?? '';
  useEffect(() => {
    if (!slug) return;
    const err = slugError(slug);
    if (err) { setSlugState({ slug, ok: false, msg: err }); return; }
    let on = true;
    const t = window.setTimeout(async () => {
      const r = await checkSlug(slug, token);
      if (!on) return;
      if (!r.ok) setSlugState({ slug, ok: true, msg: r.status === 0 ? 'Offline — availability will be checked when you publish' : 'Could not check right now' });
      else setSlugState({ slug, ok: r.data.available, msg: r.data.available ? (r.data.mine ? 'Yours' : 'Available') : r.data.reason || 'Taken' });
    }, 400);
    return () => { on = false; clearTimeout(t); };
  }, [slug, token]);

  const url = p ? publicUrl(p.publish.publishedSlug || p.slug) : '';
  useEffect(() => { if (url) qrSvg(url).then(setQr); }, [url]);
  const resume = resumes.find((r) => r.id === p?.resumeId);
  const size = useMemo(() => (p ? byteSize(publishPayload(p, resume)) : 0), [p, resume]);

  if (!p) {
    return <div className="page narrow"><div className="empty card"><h3>No portfolio yet</h3><a className="btn btn-primary" href="/portfolio" onClick={linkClick}>Create portfolio</a></div></div>;
  }
  const live = Boolean(p.publish.publishedSlug);
  const set = (patch: Partial<typeof p.publish>) => updatePortfolio((x) => ({ ...x, publish: { ...x.publish, ...patch } }), true);
  const needsPw = p.publish.visibility === 'password' && !p.publish.passwordSet && password.length < 4;
  const doPublish = async () => {
    const err = await publish({ password: p.publish.visibility === 'password' && password ? password : undefined });
    if (!err) setPassword('');
    toast(err ?? (live ? 'Changes published' : 'Your portfolio is live'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); }
  };
  const downloadQr = async () => {
    const a = document.createElement('a');
    a.href = await qrPngDataUrl(url);
    a.download = `${p.publish.publishedSlug || p.slug}-qr.png`;
    a.click();
  };

  return (
    <div className="page publish-page">
      <div className="page-head">
        <div>
          <a className="link back-link" href="/portfolio" onClick={linkClick}><Icon name="left" size={14} />Portfolio builder</a>
          <h1>Publish &amp; share</h1>
          <p className="muted">Choose who can see your portfolio, then share the link or QR code.</p>
        </div>
        <div className="head-actions">
          {live && p.publish.visibility !== 'private' && <a className="btn btn-outline" href={`/p/${p.publish.publishedSlug}`} target="_blank" rel="noopener"><Icon name="eye" size={16} />View live page</a>}
          <button type="button" className="btn btn-primary" onClick={doPublish} disabled={busy || needsPw || (slugState?.slug === p.slug && !slugState.ok)} data-testid="publish">
            <Icon name="upload" size={16} />{busy ? 'Publishing…' : live ? 'Publish changes' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="publish-grid">
        <div className="card pad pub-main">
          <h2 className="pub-h">Address</h2>
          <div className="field">
            <label htmlFor="pf-slug">Custom link</label>
            <div className="slug-box">
              <span>{location.host}/p/</span>
              <input id="pf-slug" value={p.slug} onChange={(e) => updatePortfolio((x) => ({ ...x, slug: slugify(e.target.value.replace(/\s/g, '-')).slice(0, 40) || e.target.value.toLowerCase() }))} spellCheck={false} autoComplete="off" />
              {slugState && slugState.slug === p.slug && <em className={slugState.ok ? 'ok' : 'bad'} data-testid="slug-status"><Icon name={slugState.ok ? 'check' : 'alert'} size={13} />{slugState.msg}</em>}
            </div>
            {live && p.slug !== p.publish.publishedSlug && <small className="hint">Publishing moves your page from /p/{p.publish.publishedSlug} to /p/{p.slug}. The old link stops working.</small>}
          </div>

          <h2 className="pub-h">Visibility</h2>
          <div className="vis-list" role="radiogroup" aria-label="Visibility">
            {VIS.map((v) => (
              <label key={v.id} className={`choice${p.publish.visibility === v.id ? ' active' : ''}`}>
                <input type="radio" name="vis" value={v.id} checked={p.publish.visibility === v.id} onChange={() => set({ visibility: v.id })} />
                <span><b>{v.label}</b><small>{v.body}</small></span>
              </label>
            ))}
          </div>
          {p.publish.visibility === 'password' && (
            <div className="field pw-field">
              <label htmlFor="pf-pw">{p.publish.passwordSet ? 'New password (leave blank to keep the current one)' : 'Password'}</label>
              <input id="pf-pw" type="password" value={password} minLength={4} maxLength={128} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
              <small className="hint">Stored on the server only as a salted hash. Share it with the people you trust.</small>
            </div>
          )}

          <div className="setting-row boxed">
            <div><b>Hide phone number</b><small>Show email and links, but keep your phone off the public page and résumé download.</small></div>
            <Switch checked={p.publish.hidePhone} onChange={(v) => set({ hidePhone: v })} label="Hide phone number" id="hide-phone" />
          </div>

          <h2 className="pub-h">Résumé download</h2>
          <div className="field">
            <label htmlFor="pf-resume">Résumé behind the “Download résumé” button</label>
            <select id="pf-resume" value={p.resumeId} onChange={(e) => updatePortfolio((x) => ({ ...x, resumeId: e.target.value }))}>
              <option value="">None</option>
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <label className="check"><input type="checkbox" checked={p.publish.showResume} onChange={(e) => set({ showResume: e.target.checked })} />Show the download button on the public page (visitors get a print-ready PDF)</label>
        </div>

        <div className="pub-side">
          <div className="card pad">
            <h2 className="pub-h">Share</h2>
            <div className="share-url" data-testid="share-url">{url}</div>
            <button type="button" className="btn btn-soft btn-sm full-w" onClick={copy}><Icon name="copy" size={15} />Copy link</button>
            <div className="qr-row">
              <div className="qr-img" role="img" aria-label="QR code for your portfolio link" dangerouslySetInnerHTML={{ __html: qr }} />
              <div>
                <b>QR code</b>
                <p className="muted small">Print it on a visiting card or show it after a talk.</p>
                <button type="button" className="btn btn-outline btn-xs" onClick={downloadQr}><Icon name="download" size={13} />Download PNG</button>
              </div>
            </div>
            {!live && <p className="hint">Publish to make this link work.</p>}
          </div>

          <div className="card pad">
            <h2 className="pub-h">Status</h2>
            <dl className="pub-kv">
              <dt>State</dt><dd data-testid="pub-state">{live ? (p.publish.visibility === 'public' ? 'Live' : p.publish.visibility === 'password' ? 'Live · password' : 'Private') : 'Not published'}{live && p.publish.dirty ? ' · unpublished changes' : ''}</dd>
              {live && <><dt>Published</dt><dd>{timeAgo(p.publish.publishedAt)}</dd><dt>Last update</dt><dd>{timeAgo(p.publish.lastPublishedAt)}</dd></>}
              <dt>Size</dt><dd className={size > MAX_PUBLISH_BYTES ? 'danger-text' : ''}>{fmtBytes(size)} of 2 MB</dd>
            </dl>
            <div className="meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (size / MAX_PUBLISH_BYTES) * 100)}%` }} /></div>
            {live && <button type="button" className="btn btn-outline btn-sm danger-text" onClick={() => setConfirmOff(true)} disabled={busy} data-testid="unpublish"><Icon name="trash" size={15} />Unpublish</button>}
            <div className="teaser"><b>Views</b> — visitor counts are coming in a later release. Hire Ready does not track visitors today.</div>
          </div>

          <div className="card pad small muted pub-privacy">
            <b className="ink">Your edit key</b>
            <p>Only this browser can update or unpublish this page — it holds a private edit key (the server keeps a hash). Export a backup from Data &amp; settings to keep it, and unpublish before erasing data on this device.</p>
          </div>
        </div>
      </div>
      {confirmOff && <ConfirmDialog title="Unpublish portfolio?" confirmLabel="Unpublish"
        message="The public link will stop working and the copy on the server is deleted. Your portfolio stays on this device."
        onConfirm={async () => { const err = await unpublish(); toast(err ?? 'Portfolio unpublished'); }} onClose={() => setConfirmOff(false)} />}
    </div>
  );
}
