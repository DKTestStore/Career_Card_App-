"""Verifies a v0.2 (IndexedDB v1) database upgrades cleanly: old/unknown template + accent ids are migrated."""
import os
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('BASE', 'http://localhost:4173')
SEED = """
if (!localStorage.getItem('seeded')) {
  localStorage.setItem('seeded', '1');
  const req = indexedDB.open('hire-ready', 1);
  req.onupgradeneeded = () => { const d = req.result;
    d.createObjectStore('resumes', { keyPath: 'id' });
    d.createObjectStore('versions', { keyPath: 'id' }).createIndex('resumeId', 'resumeId');
    d.createObjectStore('applications', { keyPath: 'id' }); };
  req.onsuccess = () => { const d = req.result; const tx = d.transaction('resumes', 'readwrite');
    const c = { basics: { name: 'Old User', label: 'Engineer', email: 'o@x.io', phone: '+91 99999 99999', url: '', summary: 'Old summary', location: { city: 'Chennai', region: '', countryCode: 'IN' }, profiles: [] }, work: [], education: [], projects: [], skills: [], certificates: [], awards: [] };
    const t = new Date().toISOString();
    tx.objectStore('resumes').put({ id: 'old1', name: 'Old modern', template: 'modern', accent: 'teal', content: c, createdAt: t, updatedAt: t });
    tx.objectStore('resumes').put({ id: 'old2', name: 'Old unknown', template: 'retro-xyz', accent: 'mint', content: c, createdAt: t, updatedAt: t });
    tx.oncomplete = () => d.close(); };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script(SEED)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/')
    pg.get_by_label('First name').fill('Old')
    pg.get_by_test_id('get-started').click()
    pg.goto(BASE + '/resumes/old2')
    expect(pg.get_by_test_id('current-template')).to_have_text('Executive')
    expect(pg.get_by_role('radio', name='Violet')).to_have_attribute('aria-checked', 'true')
    pg.goto(BASE + '/resumes/old1')
    expect(pg.get_by_test_id('current-template')).to_have_text('Modern')
    expect(pg.get_by_role('radio', name='Teal')).to_have_attribute('aria-checked', 'true')
    ver = pg.evaluate("new Promise(r => { const q = indexedDB.open('hire-ready'); q.onsuccess = () => { r([q.result.version, [...q.result.objectStoreNames]]); q.result.close(); }; })")
    print('db', ver, 'errors', errs)
    assert ver[0] == 3 and 'atsReports' in ver[1] and 'portfolios' in ver[1] and not errs
    print('MIGRATION OK')
    b.close()
