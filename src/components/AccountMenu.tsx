import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/util';
import { SignOutDialog } from './SignOutDialog';

export function AccountMenu({ variant }: { variant: 'sidebar' | 'header' }) {
  const { firstName } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = firstName || 'Guest';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <div className={`account-menu ${variant}`} ref={wrap}>
        <button
          type="button"
          className={variant === 'sidebar' ? 'account-chip' : 'icon-btn account-header-btn'}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-label={variant === 'header' ? `Account menu, ${label}` : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="avatar" aria-hidden="true">{initials(firstName || 'Guest')}</span>
          {variant === 'sidebar' && (
            <span className="account-meta">
              <b>{label}</b>
              <small>Guest · this device</small>
            </span>
          )}
        </button>
        {open && (
          <div className="account-dropdown" role="menu" id={menuId}>
            <button type="button" role="menuitem" data-testid="sign-out" onClick={() => { setOpen(false); setSigningOut(true); }}>
              <Icon name="logout" size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
      {signingOut && <SignOutDialog onClose={() => setSigningOut(false)} />}
    </>
  );
}
