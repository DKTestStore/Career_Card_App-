import { lazy, Suspense, useRef, useState } from 'react';
import type { ResumeContent } from '../lib/types';
import { Modal } from './Modal';
import { useToast } from './Toast';
import type { ParseReport } from '../lib/import/parse';

export const UPLOAD_ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export interface UploadedResume { fileName: string; kind: string; content: ResumeContent; report: ParseReport; text: string }

/** Reads + parses a PDF / DOCX / TXT résumé. The heavy parsers load on first use. */
export async function readResumeFile(file: File): Promise<UploadedResume> {
  const [{ extractFile }, { parseResume }] = await Promise.all([import('../lib/import/extract'), import('../lib/import/parse')]);
  const ex = await extractFile(file);
  const { content, report } = parseResume(ex.lines);
  return { fileName: file.name, kind: ex.kind, content, report, text: ex.text };
}

// The review dialog is its own chunk so the résumé list stays light.
const ReviewUpload = lazy(() => import('./UploadReview'));

/** "Upload resume" button flow: pick file → parse → review & edit → save as a new resume. */
export function useUploadResume() {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [data, setData] = useState<UploadedResume | null>(null);
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(f.name);
    try { setData(await readResumeFile(f)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not read that file.'); }
    finally { setBusy(null); if (ref.current) ref.current.value = ''; }
  };
  const input = <input ref={ref} type="file" accept={UPLOAD_ACCEPT} hidden data-testid="upload-resume-input" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload resume file (PDF, Word or text)" />;
  const el = <>
    {busy && <Modal title="Reading your resume" onClose={() => {}}><div className="upl-busy" role="status"><span className="spinner" aria-hidden="true" /> Extracting text from <b>{busy}</b>… This stays on your device.</div></Modal>}
    {data && <Suspense fallback={null}><ReviewUpload data={data} onClose={() => setData(null)} /></Suspense>}
  </>;
  return { pick: () => ref.current?.click(), input, el };
}

