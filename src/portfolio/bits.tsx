import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { compressImage } from '../lib/portfolio/image';
import { useToast } from '../components/Toast';
import { PortfolioView } from './PortfolioView';
import type { PublicPortfolio } from '../lib/portfolio/types';

export function Switch({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; disabled?: boolean }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={`switch${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}><i /></button>
  );
}

/** A button that opens a file picker and returns compressed image data URLs. */
export function ImagePick({ onPick, multiple, className, children, label, testId }:
  { onPick: (urls: string[]) => void; multiple?: boolean; className?: string; children: ReactNode; label: string; testId?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()} disabled={busy} aria-label={label}>{busy ? 'Processing…' : children}</button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple={multiple} hidden data-testid={testId}
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, 8);
          e.target.value = '';
          if (!files.length) return;
          setBusy(true);
          try {
            const out: string[] = [];
            for (const f of files) out.push(await compressImage(f));
            onPick(out);
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Could not read that image.');
          } finally { setBusy(false); }
        }} />
    </>
  );
}

/** The public page rendered at a fixed width and scaled down to fit its container. */
export function ScaledSite({ p, url, frame = true }: { p: PublicPortfolio; url: string; frame?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const doc = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [h, setH] = useState(900);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (wrap.current) setW(wrap.current.clientWidth);
      if (doc.current) setH(doc.current.offsetHeight);
    });
    if (wrap.current) ro.observe(wrap.current);
    if (doc.current) ro.observe(doc.current);
    return () => ro.disconnect();
  }, []);
  const inner = Math.max(280, w - (frame ? 32 : 0));
  // Narrow panes (phones) show the mobile layout at 1:1; wider panes show the desktop page scaled down.
  const base = inner < 440 ? inner : Math.max(inner, 1000);
  const scale = inner / base;
  return (
    <div className="site-stage" ref={wrap}>
      <div className={frame ? 'browser' : ''} style={{ width: inner }}>
        {frame && <div className="browser-bar" aria-hidden="true"><i /><i /><i /><span>{url.replace(/^https?:\/\//, '')}</span></div>}
        <div className="browser-body" style={{ height: h * scale }}>
          <div ref={doc} style={{ width: base, transform: `scale(${scale})`, transformOrigin: 'top left' }} inert>
            <PortfolioView p={p} url={url} preview onDownloadResume={p.resume ? () => {} : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}
