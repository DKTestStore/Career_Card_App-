import { useCallback, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { linkClick } from '../lib/router';
import { localView, publicUrl } from '../lib/portfolio/model';
import { PortfolioView } from './PortfolioView';
import { ResumePrint } from './ResumePrint';

/** Full-page preview of the local (unpublished) portfolio. */
export default function LocalPreview() {
  const { portfolio: p, resumes } = useStore();
  const [printing, setPrinting] = useState(false);
  const resume = resumes.find((r) => r.id === p?.resumeId);
  const view = useMemo(() => (p ? localView(p, resume) : null), [p, resume]);
  const done = useCallback(() => setPrinting(false), []);
  if (!view) return <div className="loading"><a href="/portfolio" onClick={linkClick}>Create a portfolio first</a></div>;
  return (
    <>
      <div className="pf-local-banner" role="note">Preview — this is how visitors will see your page{p?.publish.hidePhone ? ' (phone hidden)' : ''}. <a href="/portfolio" onClick={linkClick}>Back to builder</a></div>
      <PortfolioView p={view} url={publicUrl(view.slug)} onDownloadResume={view.resume ? () => setPrinting(true) : undefined} />
      {printing && view.resume && <ResumePrint resume={view.resume} name={view.data.about.name} onDone={done} />}
    </>
  );
}
