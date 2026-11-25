import { useCallback, useState } from 'react';
import { useStore } from '../store';
import * as api from './api';
import { byteSize, fmtBytes, MAX_PUBLISH_BYTES, publishPayload, slugError } from './model';
import type { Portfolio } from './types';

export function usePublish() {
  const { portfolio, resumes, putPortfolio } = useStore();
  const [busy, setBusy] = useState(false);

  const publish = useCallback(async (opts: { password?: string; override?: Portfolio } = {}): Promise<string | null> => {
    const p = opts.override ?? portfolio;
    if (!p) return 'Create a portfolio first.';
    const err = slugError(p.slug);
    if (err) return err;
    if (!p.data.about.name.trim()) return 'Add your name in About before publishing.';
    const resume = resumes.find((r) => r.id === p.resumeId);
    const payload = publishPayload(p, resume);
    const size = byteSize(payload);
    if (size > MAX_PUBLISH_BYTES) return `Your portfolio is ${fmtBytes(size)}; the limit is 2 MB. Remove or replace a few images.`;
    if (p.publish.visibility === 'password' && !opts.password && !p.publish.passwordSet) return 'Set a password first.';
    setBusy(true);
    try {
      const r = await api.publish({
        slug: p.slug, previousSlug: p.publish.publishedSlug || undefined, token: p.publish.token, visibility: p.publish.visibility,
        password: opts.password, hidePhone: p.publish.hidePhone, theme: payload.theme, accent: payload.accent, data: payload.data, resume: payload.resume,
      });
      if (!r.ok) return r.error;
      await putPortfolio({
        ...p,
        publish: {
          ...p.publish, publishedSlug: r.data.slug, publishedAt: r.data.publishedAt, lastPublishedAt: r.data.updatedAt, dirty: false,
          passwordSet: p.publish.visibility === 'password' ? true : p.publish.passwordSet,
        },
      });
      return null;
    } finally {
      setBusy(false);
    }
  }, [portfolio, resumes, putPortfolio]);

  const unpublish = useCallback(async (): Promise<string | null> => {
    const p = portfolio;
    if (!p?.publish.publishedSlug) return null;
    setBusy(true);
    try {
      const r = await api.unpublish(p.publish.publishedSlug, p.publish.token);
      if (!r.ok) return r.error;
      await putPortfolio({ ...p, publish: { ...p.publish, publishedSlug: '', publishedAt: '', lastPublishedAt: '', dirty: false } });
      return null;
    } finally {
      setBusy(false);
    }
  }, [portfolio, putPortfolio]);

  return { publish, unpublish, busy };
}
