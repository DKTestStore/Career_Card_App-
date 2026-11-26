"""My Portfolio end-to-end test + review screenshots.

Local:  npm run build && npm run serve:local &   then   python3 scripts/portfolio_e2e.py
Live:   BASE=https://career-card-app.vercel.app SLUG_PREFIX=e2e- python3 scripts/portfolio_e2e.py   (cleans up after itself)
"""
import json, os, re, sys, time, urllib.request
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE', 'http://localhost:4174').rstrip('/')
PREFIX = os.environ.get('SLUG_PREFIX', '')
SHOTS = os.environ.get('SHOTS', '1') == '1'
OUT = os.path.join(os.path.dirname(__file__), '..', 'screenshots-review')
FIX = os.path.join(os.path.dirname(__file__), 'fixtures')
os.makedirs(OUT, exist_ok=True)
errors = []
SLUG = f'{PREFIX}priya-sharma'
ARJUN = f'{PREFIX}arjun-nair'


def shot(page, name, full=False):
    if not SHOTS:
        return
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, name), full_page=full)
    print('  shot', name)


def api(method, body=None, query=''):
    req = urllib.request.Request(f'{BASE}/api/portfolio{query}', method=method, data=json.dumps(body).encode() if body else None, headers={'content-type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


def watch(page):
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    page.on('console', lambda m: errors.append(f'console: {m.text}') if m.type == 'error' and 'favicon' not in m.text and 'status of 40' not in m.text else None)


def sign_in(page, name):
    page.goto(BASE + '/welcome')
    page.get_by_label('First name').fill(name)
    page.get_by_test_id('get-started').click()
    expect(page.get_by_role('heading', name=name)).to_be_visible()


def new_sample(page, key):
    page.goto(BASE + '/resumes')
    page.get_by_role('button', name='New resume').first.click()
    page.locator(f'[data-sample="{key}"]').click()
    expect(page.locator('#resume-name')).to_be_visible()


def set_slug(page, slug):
    page.goto(BASE + '/portfolio/publish')
    page.locator('#pf-slug').fill(slug)
    expect(page.get_by_test_id('slug-status')).to_contain_text(re.compile('Available|Yours'), timeout=10000)


def publish(page):
    page.get_by_test_id('publish').click()
    expect(page.locator('.toast')).to_contain_text(re.compile('live|published'), timeout=15000)


def natural_width(page, sel):
    return page.eval_on_selector(sel, 'img => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.src = img.src; })')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), headless=True)

    # ---------------- Owner (Priya) builds a portfolio ----------------
    owner = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
    page = owner.new_page(); watch(page)
    sign_in(page, 'Priya')
    expect(page.get_by_role('link', name='My Portfolio')).to_be_visible()
    new_sample(page, 'swe')
    page.get_by_role('link', name='My Portfolio').click()
    expect(page.get_by_role('heading', name='Create your portfolio')).to_be_visible()
    page.get_by_test_id('pf-start-resume').click()
    prev = page.get_by_test_id('pf-preview')
    expect(prev.get_by_role('heading', name='Priya Sharma', level=1)).to_be_visible()
    expect(prev.locator('[data-testid=pf-project]')).to_have_count(2)
    expect(prev.get_by_text('Nimbus Labs')).to_be_visible()
    expect(prev.get_by_text('AWS Certified Developer – Associate')).to_be_visible()
    print('import from resume: ok')

    page.get_by_test_id('photo-input').set_input_files(os.path.join(FIX, 'avatar-priya.png'))
    expect(page.locator('.photo-row img.pf-face')).to_have_attribute('src', re.compile(r'^data:image/(webp|jpeg)'))
    page.get_by_label('Open to (eyebrow)').fill('Open to roles in Bengaluru & remote')

    # Edit HomeSense: role, tag, large cover (must be resized), gallery screenshot
    page.locator('[data-section=projects] .acc-h > button').click()
    page.get_by_role('button', name='Edit HomeSense IoT Hub').click()
    dlg = page.get_by_role('dialog', name='Edit project')
    dlg.get_by_label('Your role').fill('Lead engineer')
    dlg.locator('#tag-input').fill('Python'); dlg.locator('#tag-input').press('Enter')
    dlg.get_by_test_id('cover-input').set_input_files(os.path.join(FIX, 'cover-homesense.png'))
    expect(dlg.locator('.cover-prev img')).to_have_attribute('src', re.compile(r'^data:image/webp'))
    w = natural_width(page, 'dialog .cover-prev img')
    assert w == 1600, f'cover should be resized to 1600px, got {w}'
    dlg.locator('.gal-row input[type=file]').set_input_files([os.path.join(FIX, 'shot-1.png'), os.path.join(FIX, 'shot-2.png')])
    expect(dlg.locator('.gal-thumb')).to_have_count(2)
    dlg.get_by_label('GitHub').fill('github.com/priyasharma/homesense')
    dlg.get_by_label('Live demo').fill('homesense.priya.dev')
    shot(page, 'pf-02-desktop-project-editor.png')
    dlg.get_by_test_id('save-project').click()
    print('edit project with image (resized to 1600px webp): ok')

    page.get_by_role('button', name='Edit TransitDelay').click()
    dlg = page.get_by_role('dialog', name='Edit project')
    dlg.get_by_label('Your role').fill('Sole developer')
    dlg.get_by_test_id('cover-input').set_input_files(os.path.join(FIX, 'cover-transit.png'))
    expect(dlg.locator('.cover-prev img')).to_be_visible()
    dlg.get_by_test_id('save-project').click()

    page.get_by_test_id('add-project').click()
    dlg = page.get_by_role('dialog', name='Add project')
    dlg.get_by_label('Title').fill('Telemetry ingest API')
    dlg.get_by_label('Your role').fill('Backend engineer · Nimbus Labs')
    for t in ['Node.js', 'Redis', 'PostgreSQL']:
        dlg.locator('#tag-input').fill(t); dlg.locator('#tag-input').press('Enter')
    dlg.get_by_label('Description').fill('Ingests 2.4M device events a day; cut p95 latency by 38% with batched writes and Redis streams.')
    dlg.get_by_label('GitHub').fill('github.com/priyasharma/telemetry-api')
    dlg.get_by_test_id('save-project').click()
    expect(page.get_by_test_id('proj-row')).to_have_count(3)
    expect(prev.locator('[data-testid=pf-project]')).to_have_count(3)
    print('add project: ok')

    page.locator('[data-section=gallery] .acc-h > button').click()
    page.get_by_test_id('gallery-input').set_input_files([os.path.join(FIX, 'shot-3.png')])
    expect(page.locator('.gal-edit-item')).to_have_count(1)
    page.locator('[data-section=testimonials] .acc-h > button').click()
    page.get_by_role('button', name='Add testimonial').click()
    page.get_by_label('Quote').fill('Priya turned a flaky sensor pipeline into something the whole team trusts.')
    page.locator('[data-section=testimonials]').get_by_label('Name').fill('Ananya Rao')
    page.locator('[data-section=testimonials]').get_by_label('Role').fill('Engineering Manager, Nimbus Labs')
    page.locator('[data-section=about] .acc-h > button').click()

    NEW_THEMES = ['editorial', 'midnight', 'brutalist', 'pastel']
    for t in ['developer', 'creative', 'academic', *NEW_THEMES, 'minimal']:
        page.locator(f'[data-theme-id={t}]').click()
        expect(prev.locator(f'.pf[data-theme={t}]')).to_be_visible()
        if t in NEW_THEMES:
            page.wait_for_timeout(400)
            prev.screenshot(path=os.path.join(OUT, f'pf-10-desktop-theme-{t}.png'))
    print('switch themes (8): ok')
    page.wait_for_timeout(600)
    shot(page, 'pf-01-desktop-builder.png')

    # ---------------- Publish ----------------
    set_slug(page, SLUG)
    publish(page)
    expect(page.get_by_test_id('pub-state')).to_have_text('Live')
    st, body = api('GET', query=f'?slug={SLUG}')
    assert st == 200 and body['data']['about']['name'] == 'Priya Sharma', (st, body)
    assert not body['data']['about'].get('phone') and not body['data']['contact'].get('phone'), 'phone should be hidden server-side'
    assert body['resume'] and body['resume']['content']['basics']['phone'] == '', 'resume phone should be hidden'
    print('publish: ok (phone hidden server-side)')
    shot(page, 'pf-04-desktop-publish-share.png')

    # ---------------- A visitor (fresh browser context) ----------------
    visitor = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
    v = visitor.new_page(); watch(v)
    v.goto(f'{BASE}/p/{SLUG}')
    expect(v.get_by_role('heading', name='Priya Sharma', level=1)).to_be_visible(timeout=15000)
    expect(v.locator('[data-testid=pf-project]')).to_have_count(3)
    expect(v.locator('.pf-cover img').first).to_have_attribute('src', re.compile(r'^data:image/webp'))
    assert '98765' not in v.content(), 'phone visible to visitor'
    expect(v.locator('.pf-qr svg')).to_be_visible()
    expect(v.get_by_text('Priya turned a flaky sensor pipeline')).to_be_visible()
    v.evaluate('window.print = () => {}')
    v.get_by_test_id('pf-download-resume').click()
    expect(v.locator('[data-testid=resume-print] .rdoc')).to_have_count(1)
    html = urllib.request.urlopen(f'{BASE}/p/{SLUG}').read().decode()
    assert 'og:title" content="Priya Sharma' in html and '<title>Priya Sharma' in html, 'OG/title tags missing'
    print('fresh-context view + resume print + OG tags: ok')
    shot(v, 'pf-03-desktop-public-portfolio.png')
    shot(v, 'pf-03b-desktop-public-portfolio-full.png', full=True)

    mob = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m = mob.new_page(); watch(m)
    m.goto(f'{BASE}/p/{SLUG}')
    expect(m.get_by_role('heading', name='Priya Sharma', level=1)).to_be_visible(timeout=15000)
    sw = m.evaluate('document.documentElement.scrollWidth')
    assert sw <= 390, f'mobile public page overflows: {sw}'
    shot(m, 'pf-06-mobile-public-portfolio.png')
    shot(m, 'pf-06b-mobile-public-portfolio-full.png', full=True)

    # ---------------- Someone else cannot take the slug ----------------
    other = browser.new_context(viewport={'width': 1440, 'height': 900})
    o = other.new_page(); watch(o)
    sign_in(o, 'Rahul')
    o.goto(BASE + '/portfolio')
    o.get_by_test_id('pf-start-blank').click()
    o.get_by_label('Name', exact=True).fill('Rahul Test')
    o.goto(BASE + '/portfolio/publish')
    o.locator('#pf-slug').fill(SLUG)
    expect(o.get_by_test_id('slug-status')).to_have_text('Taken', timeout=10000)
    expect(o.get_by_test_id('publish')).to_be_disabled()
    st, body = api('POST', {'action': 'publish', 'slug': SLUG, 'token': 'f' * 64, 'data': {'about': {'name': 'Mallory'}}})
    assert st == 409, (st, body)
    print('slug taken by another token rejected: ok')
    other.close()

    # ---------------- Password ----------------
    page.goto(BASE + '/portfolio/publish')
    page.get_by_role('radio', name=re.compile('^Password')).check()
    page.locator('#pf-pw').fill('recruiter-2026')
    publish(page)
    v.reload()
    expect(v.get_by_role('heading', name=re.compile('Priya Sharma’s portfolio'))).to_be_visible(timeout=15000)
    assert 'Nimbus' not in v.content()
    v.get_by_label('Password').fill('wrong-one')
    v.get_by_role('button', name='View portfolio').click()
    expect(v.get_by_role('alert')).to_have_text('That password is not right.')
    v.get_by_label('Password').fill('recruiter-2026')
    v.get_by_role('button', name='View portfolio').click()
    expect(v.get_by_role('heading', name='Priya Sharma', level=1)).to_be_visible()
    st, _ = api('GET', query=f'?slug={SLUG}')
    assert st == 401
    print('password protection: ok')

    # ---------------- Private ----------------
    page.get_by_role('radio', name=re.compile('^Private')).check()
    publish(page)
    v.reload()
    expect(v.get_by_role('heading', name='This portfolio is private')).to_be_visible(timeout=15000)
    st, _ = api('GET', query=f'?slug={SLUG}')
    assert st == 403
    print('private: ok')

    page.get_by_role('radio', name=re.compile('^Public')).check()
    publish(page)
    v.reload()
    expect(v.get_by_role('heading', name='Priya Sharma', level=1)).to_be_visible(timeout=15000)

    # ---------------- A new theme is accepted server-side and renders publicly ----------------
    page.goto(BASE + '/portfolio')
    page.locator('[data-theme-id=midnight]').click()
    expect(page.get_by_test_id('pf-preview').locator('.pf[data-theme=midnight]')).to_be_visible()
    page.wait_for_timeout(1500)  # builder autosave is debounced
    page.goto(BASE + '/portfolio/publish')
    publish(page)
    st, body = api('GET', query=f'?slug={SLUG}')
    assert st == 200 and body['theme'] == 'midnight', (st, body.get('theme'))
    v.reload()
    expect(v.locator('.pf[data-theme=midnight]')).to_be_visible(timeout=15000)
    shot(v, 'pf-11-desktop-public-midnight.png')
    m.reload()
    expect(m.locator('.pf[data-theme=midnight]')).to_be_visible(timeout=15000)
    assert m.evaluate('document.documentElement.scrollWidth') <= 390, 'midnight overflows on mobile'
    shot(m, 'pf-11b-mobile-public-midnight.png')
    print('new theme published + rendered (desktop/mobile): ok')
    page.goto(BASE + '/portfolio')
    page.locator('[data-theme-id=minimal]').click()
    expect(page.get_by_test_id('pf-preview').locator('.pf[data-theme=minimal]')).to_be_visible()
    page.wait_for_timeout(1500)
    page.goto(BASE + '/portfolio/publish')
    publish(page)

    # ---------------- Persistence ----------------
    page.goto(BASE + '/portfolio')
    page.reload()
    expect(page.get_by_test_id('pf-preview').locator('[data-testid=pf-project]')).to_have_count(3)
    expect(page.get_by_test_id('pf-preview').locator('.pf-gallery img')).to_have_count(1)
    expect(page.get_by_test_id('pf-status')).to_have_text('Live')
    expect(page.get_by_label('Name', exact=True)).to_have_value('Priya Sharma')
    print('persistence after reload: ok')

    page.goto(BASE + '/portfolio/themes')
    expect(page.locator('[data-theme-card]')).to_have_count(8)
    shot(page, 'pf-05-desktop-theme-gallery.png')

    # ---------------- Mobile builder ----------------
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(BASE + '/portfolio')
    expect(page.get_by_role('tab', name='Sections')).to_be_visible()
    sw = page.evaluate('document.documentElement.scrollWidth')
    assert sw <= 390, f'mobile builder overflows: {sw}'
    shot(page, 'pf-07-mobile-builder.png')
    page.get_by_role('tab', name='Preview').click()
    expect(page.locator('#pfpane-preview .pf')).to_be_visible()
    shot(page, 'pf-07b-mobile-builder-preview.png')
    page.get_by_role('tab', name='Design').click()
    shot(page, 'pf-07c-mobile-builder-design.png')
    page.set_viewport_size({'width': 1440, 'height': 900})

    # ---------------- ECE student variant (Academic theme) ----------------
    stu = browser.new_context(viewport={'width': 1440, 'height': 900})
    s = stu.new_page(); watch(s)
    sign_in(s, 'Arjun')
    new_sample(s, 'fresher')
    s.goto(BASE + '/portfolio')
    s.get_by_test_id('pf-start-resume').click()
    s.locator('[data-theme-id=academic]').click()
    set_slug(s, ARJUN)
    publish(s)
    sv = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2).new_page()
    sv.goto(f'{BASE}/p/{ARJUN}')
    expect(sv.locator('.pf[data-theme=academic]')).to_be_visible(timeout=15000)
    expect(sv.get_by_text('Smart Irrigation Controller')).to_be_visible()
    shot(sv, 'pf-08-desktop-public-academic-ece.png')
    s.goto(BASE + '/portfolio/publish')
    s.get_by_test_id('unpublish').click()
    s.get_by_role('dialog').get_by_role('button', name='Unpublish').click()
    expect(s.locator('.toast')).to_contain_text('unpublished', timeout=15000)

    # ---------------- Unpublish ----------------
    page.goto(BASE + '/portfolio/publish')
    page.get_by_test_id('unpublish').click()
    page.get_by_role('dialog').get_by_role('button', name='Unpublish').click()
    expect(page.locator('.toast')).to_contain_text('unpublished', timeout=15000)
    expect(page.get_by_test_id('pub-state')).to_have_text('Not published')
    v.reload()
    expect(v.get_by_role('heading', name='Portfolio not found')).to_be_visible(timeout=15000)
    for slug in (SLUG, ARJUN):
        st, _ = api('GET', query=f'?slug={slug}')
        assert st == 404, (slug, st)
    print('unpublish (both test portfolios removed): ok')

    browser.close()

bad = [e for e in errors if 'Failed to load resource' not in e]
if bad:
    print('ERRORS:'); [print(' ', e) for e in bad]; sys.exit(1)
print('ALL PORTFOLIO CHECKS PASSED')
