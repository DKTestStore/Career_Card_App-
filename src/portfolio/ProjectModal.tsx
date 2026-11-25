import { useState, type KeyboardEvent } from 'react';
import { Modal } from '../components/Modal';
import { Field, AutoTextarea } from '../components/fields';
import { Icon } from '../components/Icon';
import type { PProject } from '../lib/portfolio/types';
import { ImagePick, Switch } from './bits';

export function ProjectModal({ project, onSave, onClose, isNew }: { project: PProject; onSave: (p: PProject) => void; onClose: () => void; isNew?: boolean }) {
  const [p, setP] = useState<PProject>(project);
  const [tag, setTag] = useState('');
  const set = (patch: Partial<PProject>) => setP((x) => ({ ...x, ...patch }));
  const addTag = () => {
    const parts = tag.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length) set({ tags: Array.from(new Set([...p.tags, ...parts])).slice(0, 12) });
    setTag('');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tag && p.tags.length) set({ tags: p.tags.slice(0, -1) });
  };
  const valid = p.title.trim().length > 0;

  return (
    <Modal title={isNew ? 'Add project' : 'Edit project'} onClose={onClose} wide footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => { onSave({ ...p, title: p.title.trim() }); onClose(); }} data-testid="save-project">
        <Icon name="check" size={16} />Save project
      </button>
    </>}>
      <div className="grid2">
        <Field label="Title" value={p.title} onChange={(v) => set({ title: v })} placeholder="e.g. HomeSense IoT Hub" />
        <Field label="Your role" value={p.role} onChange={(v) => set({ role: v })} placeholder="e.g. Lead engineer" />
      </div>
      <div className="field">
        <label htmlFor="tag-input">Tech tags</label>
        <div className="tag-box">
          {p.tags.map((t) => (
            <span className="tag-chip" key={t}>{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => set({ tags: p.tags.filter((x) => x !== t) })}><Icon name="x" size={12} /></button></span>
          ))}
          <input id="tag-input" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={onTagKey} onBlur={addTag} placeholder={p.tags.length ? 'Add tag' : 'React, MQTT, Python…'} />
        </div>
        <small className="hint">Press Enter or comma to add</small>
      </div>
      <AutoTextarea label="Description" value={p.description} onChange={(v) => set({ description: v })} rows={3} placeholder="What it does, your part, and one number that shows impact." />
      <div className="field">
        <span>Cover image</span>
        <div className="cover-row">
          <div className="cover-prev">{p.cover ? <img src={p.cover} alt="Cover preview" /> : <span className="muted small">No cover yet — a colour band is used.</span>}</div>
          <div className="cover-actions">
            <ImagePick className="drop" label="Upload cover image" testId="cover-input" onPick={([u]) => set({ cover: u })}>
              <Icon name="upload" size={18} /><b>{p.cover ? 'Replace cover' : 'Upload cover'}</b><small>PNG, JPG or WebP · resized to 1600 px</small>
            </ImagePick>
            {p.cover && <button type="button" className="btn btn-ghost btn-xs" onClick={() => set({ cover: '' })}>Remove cover</button>}
          </div>
        </div>
      </div>
      <div className="field">
        <span>Gallery</span>
        <div className="gal-row">
          {p.gallery.map((g, i) => (
            <div className="gal-thumb" key={i}>
              <img src={g} alt={`Screenshot ${i + 1}`} />
              <button type="button" className="gal-x" aria-label={`Remove screenshot ${i + 1}`} onClick={() => set({ gallery: p.gallery.filter((_, j) => j !== i) })}><Icon name="x" size={12} /></button>
            </div>
          ))}
          {p.gallery.length < 6 && (
            <ImagePick className="gal-add" multiple label="Add screenshots" onPick={(us) => set({ gallery: [...p.gallery, ...us].slice(0, 6) })}><Icon name="plus" size={18} /></ImagePick>
          )}
        </div>
      </div>
      <div className="grid2">
        <Field label="GitHub" value={p.github} onChange={(v) => set({ github: v })} placeholder="github.com/you/project" />
        <Field label="Live demo" value={p.demo} onChange={(v) => set({ demo: v })} placeholder="project.example.com" />
      </div>
      <div className="setting-row">
        <div><b>Featured project</b><small>Pinned at the top of your public page</small></div>
        <Switch checked={p.featured} onChange={(v) => set({ featured: v })} label="Featured project" />
      </div>
    </Modal>
  );
}
