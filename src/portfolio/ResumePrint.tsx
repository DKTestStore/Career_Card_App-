import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ResumeDoc } from '../templates/ResumeDoc';
import type { PublicPortfolio } from '../lib/portfolio/types';
import { migrateResume } from '../lib/resume';
import { normalizeContent } from '../lib/resume';

/** Renders the linked résumé off-screen and opens the browser's print dialog (Save as PDF). */
export function ResumePrint({ resume, name, onDone }: { resume: NonNullable<PublicPortfolio['resume']>; name: string; onDone: () => void }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${name || 'Resume'} — Resume`;
    const t = window.setTimeout(() => {
      window.print();
      document.title = prev;
      onDone();
    }, 120);
    return () => { clearTimeout(t); document.title = prev; };
  }, [name, onDone]);
  const r = migrateResume({ ...resume, content: normalizeContent(resume.content) });
  return createPortal(<div className="print-root" data-testid="resume-print"><ResumeDoc resume={r} /></div>, document.body);
}
