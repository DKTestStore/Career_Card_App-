import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Field({ label, value, onChange, type = 'text', placeholder, className, hint, autoComplete }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string; hint?: string; autoComplete?: string }) {
  const id = useId();
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete ?? 'off'} onChange={(e) => onChange(e.target.value)} />
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

export function AutoTextarea({ value, onChange, label, placeholder, rows = 2, onKeyDown, hideLabel, id: idProp }:
  { value: string; onChange: (v: string) => void; label: string; placeholder?: string; rows?: number; hideLabel?: boolean; id?: string;
    onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const gen = useId();
  const id = idProp ?? gen;
  useEffect(() => {
    const t = ref.current; if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{label}</label>
      <textarea ref={ref} id={id} rows={rows} value={value} placeholder={placeholder} onKeyDown={onKeyDown} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** Comma separated list input that keeps the raw text while typing. */
export function ListInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const id = useId();
  const [text, setText] = useState(value.join(', '));
  useEffect(() => {
    if (parseList(text).join('\u0000') !== value.join('\u0000')) setText(value.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={text} placeholder={placeholder} onChange={(e) => { setText(e.target.value); onChange(parseList(e.target.value)); }} />
      <small className="hint">Separate with commas</small>
    </div>
  );
}

export function MonthField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="month" value={/^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="YYYY-MM" />
    </div>
  );
}

export function BulletList({ items, onChange, label = 'Bullet points', placeholder = 'Start with an action verb and add a number, e.g. “Reduced load time by 40%…”' }:
  { items: string[]; onChange: (v: string[]) => void; label?: string; placeholder?: string }) {
  const base = useId();
  const focusIdx = useRef<number | null>(null);
  useEffect(() => {
    if (focusIdx.current !== null) {
      document.getElementById(`${base}-${focusIdx.current}`)?.focus();
      focusIdx.current = null;
    }
  });
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= items.length) return;
    const c = items.slice(); [c[i], c[j]] = [c[j], c[i]]; onChange(c);
  };
  return (
    <fieldset className="bullets">
      <legend>{label}</legend>
      {items.map((b, i) => (
        <div className="bullet" key={i}>
          <AutoTextarea id={`${base}-${i}`} label={`${label} ${i + 1}`} hideLabel value={b} rows={1} placeholder={placeholder} onChange={(v) => set(i, v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const c = items.slice(); c.splice(i + 1, 0, ''); focusIdx.current = i + 1; onChange(c);
              } else if (e.key === 'Backspace' && b === '' && items.length > 0) {
                e.preventDefault();
                focusIdx.current = Math.max(0, i - 1); onChange(items.filter((_, j) => j !== i));
              }
            }} />
          <div className="mini-actions">
            <button type="button" className="icon-btn xs" onClick={() => swap(i, i - 1)} disabled={i === 0} aria-label={`Move bullet ${i + 1} up`}><Icon name="up" size={14} /></button>
            <button type="button" className="icon-btn xs" onClick={() => swap(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move bullet ${i + 1} down`}><Icon name="down" size={14} /></button>
            <button type="button" className="icon-btn xs danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove bullet ${i + 1}`}><Icon name="x" size={14} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="add-link" onClick={() => { focusIdx.current = items.length; onChange([...items, '']); }}><Icon name="plus" size={15} /> Add bullet</button>
    </fieldset>
  );
}

export function EntryCard({ title, subtitle, index, count, onMove, onRemove, children, defaultOpen }:
  { title: string; subtitle?: string; index: number; count: number; onMove: (to: number) => void; onRemove: () => void; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const bodyId = useId();
  return (
    <div className={`entry${open ? ' open' : ''}`}>
      <div className="entry-head">
        <button type="button" className="entry-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <b>{title}</b>{subtitle && <small>{subtitle}</small>}
        </button>
        <div className="mini-actions">
          <button type="button" className="icon-btn xs" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move ${title} up`}><Icon name="up" size={14} /></button>
          <button type="button" className="icon-btn xs" onClick={() => onMove(index + 1)} disabled={index === count - 1} aria-label={`Move ${title} down`}><Icon name="down" size={14} /></button>
          <button type="button" className="icon-btn xs danger" onClick={onRemove} aria-label={`Remove ${title}`}><Icon name="trash" size={14} /></button>
        </div>
      </div>
      {open && <div className="entry-body" id={bodyId}>{children}</div>}
    </div>
  );
}
