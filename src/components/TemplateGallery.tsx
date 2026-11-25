import { useMemo, useState } from 'react';
import type { Resume } from '../lib/types';
import { CATEGORIES, TEMPLATES } from '../templates/registry';
import { Modal } from './Modal';
import { ResumeThumb } from './ResumeGrid';
import { Icon } from './Icon';

type Tag = 'all' | 'ats' | 'design';

export function TemplateGallery({ resume, onPick, onClose }: { resume: Resume; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<Tag>('all');
  const [cat, setCat] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TEMPLATES.filter((t) =>
      (tag === 'all' || (tag === 'ats') === t.ats) && (!cat || t.category === cat) &&
      (!s || `${t.name} ${t.blurb} ${t.category} ${t.ats ? 'ats friendly' : 'design focused'}`.toLowerCase().includes(s)));
  }, [q, tag, cat]);
  return (
    <Modal title={`Templates (${TEMPLATES.length})`} onClose={onClose} wide>
      <div className="gal-filters">
        <label className="gal-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search templates</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" />
        </label>
        <div className="seg" role="group" aria-label="Filter by tag">
          {([['all', 'All'], ['ats', 'ATS-friendly'], ['design', 'Design-focused']] as [Tag, string][]).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={tag === k} className={tag === k ? 'active' : ''} onClick={() => setTag(k)}>{l}</button>
          ))}
        </div>
        <label className="gal-cat">
          <span className="sr-only">Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <p className="small muted gal-count" aria-live="polite">{list.length} template{list.length === 1 ? '' : 's'}</p>
      <div className="gal-grid" role="radiogroup" aria-label="Templates">
        {list.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={resume.template === t.id} data-template={t.id}
            className={`gal-item${resume.template === t.id ? ' active' : ''}`} onClick={() => { onPick(t.id); onClose(); }}>
            <ResumeThumb resume={{ ...resume, template: t.id }} scale={0.17} />
            <span className="gal-name">{t.name}</span>
            <span className="gal-meta">
              <span className={`tag ${t.ats ? 'tag-ats' : 'tag-design'}`}>{t.ats ? 'ATS-friendly' : 'Design-focused'}</span>
              <span className="muted">{t.category}</span>
            </span>
          </button>
        ))}
        {list.length === 0 && <p className="muted">No templates match. Try another search.</p>}
      </div>
    </Modal>
  );
}
