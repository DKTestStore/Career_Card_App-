import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';

const EVT = 'hr:navigate';

export function navigate(to: string, replace = false) {
  if (to === location.pathname + location.search) return;
  if (replace) history.replaceState(null, '', to); else history.pushState(null, '', to);
  window.dispatchEvent(new Event(EVT));
  window.scrollTo(0, 0);
}

export function usePath(): string {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    window.addEventListener('popstate', on);
    window.addEventListener(EVT, on);
    return () => { window.removeEventListener('popstate', on); window.removeEventListener(EVT, on); };
  }, []);
  return path;
}

/** Click handler for <a href> so links stay real links (open in new tab etc.) */
export function linkClick(e: MouseEvent<HTMLAnchorElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = e.currentTarget.getAttribute('href');
  if (!href || !href.startsWith('/')) return;
  e.preventDefault();
  navigate(href);
}

/** Reactive URLSearchParams for the current location. */
export function useQuery(): URLSearchParams {
  const [q, setQ] = useState(location.search);
  useEffect(() => {
    const on = () => setQ(location.search);
    window.addEventListener('popstate', on);
    window.addEventListener(EVT, on);
    return () => { window.removeEventListener('popstate', on); window.removeEventListener(EVT, on); };
  }, []);
  return new URLSearchParams(q);
}
