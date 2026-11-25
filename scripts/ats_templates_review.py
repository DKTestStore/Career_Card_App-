"""ATS + templates + colours review. Usage: npm run build && npx vite preview --port 4173 & python3 scripts/ats_templates_review.py"""
import os, re, subprocess, sys, json
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = os.path.join(os.path.dirname(__file__), '..', 'screenshots-review')
TPL_DIR = os.path.join(OUT, 'templates')
os.makedirs(TPL_DIR, exist_ok=True)
errors, problems = [], []

def shot(page, name, full=False):
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(OUT, name), full_page=full)
    print('shot', name)

def sign_in(page):
    page.goto(BASE + '/')
    page.get_by_label('First name').fill('Priya')
    page.get_by_test_id('get-started').click()
    expect(page.get_by_role('heading', name='Priya')).to_be_visible()

def new_sample(page, key):
    page.goto(BASE + '/resumes')
    page.get_by_role('button', name='New resume').first.click()
    page.locator(f'[data-sample="{key}"]').click()
    expect(page.locator('#resume-name')).to_be_visible()
    return page.url.rsplit('/', 1)[1]

def pick_template(page, tid):
    page.get_by_test_id('browse-templates').click()
    page.locator(f'.gal-grid button[data-template="{tid}"]').click()
    expect(page.locator('.ed-preview .rdoc')).to_have_attribute('data-tpl', tid)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    sign_in(page)
    designer = new_sample(page, 'designer')
    swe = new_sample(page, 'swe')

    # ---------- ATS flow ----------
    page.goto(f'{BASE}/ats?resume={swe}')
    expect(page.get_by_role('heading', name='ATS Check')).to_be_visible()
    general = int(page.get_by_test_id('ats-score').inner_text())
    assert 0 <= general <= 100
    page.locator('[data-jd="backend"]').click()
    expect(page.get_by_role('region', name='Keywords')).to_be_visible()
    score = int(page.get_by_test_id('ats-score').inner_text())
    matched = page.locator('.kw-ok').count()
    missing = page.locator('.kw-miss').count()
    print('ATS general', general, 'with JD', score, 'matched', matched, 'missing', missing)
    assert matched >= 5, 'expected keyword matches'
    assert page.locator('.bd-list li').count() == 8
    if missing:
        page.locator('.kw-miss').first.click()
        expect(page.get_by_test_id('kw-hint')).to_be_visible()
    page.set_viewport_size({'width': 1440, 'height': 1250})
    shot(page, '20-desktop-ats-results.png')
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.get_by_test_id('save-report').click()
    expect(page.locator('.hist-list li')).to_have_count(1)
    expect(page.get_by_text('Saved ATS report')).to_be_visible()
    page.wait_for_timeout(300)
    page.reload()
    page.locator('[data-jd="analyst"]').wait_for()
    expect(page.locator('.hist-list li')).to_have_count(1)
    # rewrites: apply first applicable
    page.locator('[data-jd="backend"]').click()
    apply = page.get_by_role('button', name='Apply')
    if apply.count():
        before = page.locator('.rw-list li').count()
        apply.first.click()
        expect(page.locator('.rw-list li')).to_have_count(before - 1)
    # Fix link → editor section
    page.locator('.sugg-list li button', has_text='Fix').first.click()
    expect(page).to_have_url(re.compile(r'/resumes/'))
    expect(page.locator('.acc.open').first).to_be_visible()
    print('Fix link landed on', page.url)

    # tracker link to report
    page.goto(BASE + '/tracker')
    page.get_by_role('button', name=re.compile('application', re.I)).first.click()
    page.get_by_label('Company *').fill('Razorpay')
    page.get_by_label('Role *').fill('Backend Engineer')
    page.locator('#app-resume').select_option(swe)
    page.locator('#app-ats').select_option(index=1)
    page.get_by_role('button', name='Add application', exact=True).click()
    expect(page.locator('.app-card .ats-chip').first).to_contain_text('ATS')

    # ---------- templates: gallery ----------
    page.goto(f'{BASE}/resumes/{swe}')
    page.get_by_test_id('browse-templates').click()
    n_all = page.locator('.gal-grid .gal-item').count()
    print('templates in gallery', n_all)
    assert n_all >= 23
    page.get_by_role('button', name='ATS-friendly', exact=True).click()
    n_ats = page.locator('.gal-grid .gal-item').count()
    page.get_by_role('button', name='All', exact=True).click()
    page.get_by_placeholder('Search templates…').fill('student')
    n_search = page.locator('.gal-grid .gal-item').count()
    page.get_by_placeholder('Search templates…').fill('')
    print('ats-friendly', n_ats, 'search student', n_search)
    assert 0 < n_ats < n_all and n_search >= 1
    page.wait_for_timeout(500)
    shot(page, '21-desktop-template-gallery.png')
    page.keyboard.press('Escape')

    ids = page.evaluate("""async () => (await import('/src/templates/registry.ts').catch(() => null)) ? [] : []""") if False else None
    page.get_by_test_id('browse-templates').click()
    ids = page.locator('.gal-grid .gal-item').evaluate_all('els => els.map(e => e.dataset.template)')
    page.keyboard.press('Escape')

    # ---------- all templates: render, overflow, print ----------
    for tid in ids:
        pick_template(page, tid)
        page.emulate_media(media='print')
        page.wait_for_timeout(150)
        res = page.evaluate("""() => {
          const d = document.querySelector('.print-root .rdoc'); const r = d.getBoundingClientRect();
          let bad = [];
          d.querySelectorAll('*').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > r.right + 1 || b.left < r.left - 1)) bad.push(el.className || el.tagName); });
          const txt = d.innerText;
          return { sw: d.scrollWidth, h: d.scrollHeight, bad: bad.slice(0, 5), hasName: txt.includes('Arjun') || txt.length > 200,
                   secs: d.querySelectorAll('.r-sec, .ex-h, .el-h').length, txtLen: txt.length };
        }""")
        page.locator('.print-root .rdoc').screenshot(path=os.path.join(TPL_DIR, f'{tid}.png'))
        page.emulate_media(media='screen')
        if res['sw'] > 794 or res['bad']:
            problems.append(f'{tid}: overflow {res}')
        print(f"{tid:20s} width={res['sw']} height={res['h']} sections={res['secs']} chars={res['txtLen']} bad={res['bad']}")

    # PDF check on a sample of templates
    for tid in ['minimal', 'infographic', 'banner', 'harvard', 'corporate']:
        pick_template(page, tid)
        page.emulate_media(media='print')
        pdf = os.path.join(TPL_DIR, f'{tid}.pdf')
        page.pdf(path=pdf, prefer_css_page_size=True, print_background=True)
        page.emulate_media(media='screen')
        info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
        size = re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', info).groups()
        pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
        print(f'PDF {tid}: {pages} page(s), {size}')
        if abs(float(size[0]) - 595.3) > 2 or pages > 2:
            problems.append(f'PDF {tid}: {pages} pages size {size}')

    # ---------- colours ----------
    pick_template(page, 'banner')
    page.get_by_role('radio', name='Navy').click()
    theme = page.locator('.ed-preview .rdoc').evaluate("e => e.style.getPropertyValue('--theme')")
    assert theme.upper() == '#1F3A68', theme
    for name in ['Emerald', 'Rose', 'Amber', 'Gold', 'Burgundy', 'Sky']:
        page.get_by_role('radio', name=name).click()
    page.get_by_label('Custom colour').fill('#ffd400')
    expect(page.get_by_test_id('contrast-note')).to_be_visible()
    custom_theme = page.locator('.ed-preview .rdoc').evaluate("e => e.style.getPropertyValue('--theme')")
    page.locator('#font-pick').select_option('classic')
    page.wait_for_timeout(800)
    page.reload()
    expect(page.get_by_test_id('contrast-note')).to_be_visible()
    assert page.locator('#font-pick').input_value() == 'classic'
    assert page.locator('.ed-preview .rdoc').evaluate("e => e.style.getPropertyValue('--theme')") == custom_theme
    expect(page.get_by_test_id('current-template')).to_have_text('Creative Banner')
    print('custom colour persisted', custom_theme)
    shot(page, '22-desktop-editor-custom-colour.png')

    # ---------- mobile ATS ----------
    m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    mp = m.new_page()
    mp.on('pageerror', lambda e: errors.append(str(e)))
    sign_in(mp)
    sid = new_sample(mp, 'swe')
    mp.goto(f'{BASE}/ats?resume={sid}')
    mp.locator('[data-jd="backend"]').click()
    expect(mp.locator('.kw-ok').first).to_be_visible()
    sw = mp.evaluate('document.documentElement.scrollWidth')
    if sw > 390: problems.append(f'mobile ATS horizontal overflow {sw}')
    mp.locator('.kw-miss').first.click()
    mp.locator('.ats-result').scroll_into_view_if_needed()
    shot(mp, '23-mobile-ats.png')
    shot(mp, '24-mobile-ats-full.png', full=True)
    mp.goto(f'{BASE}/resumes/{sid}')
    mp.get_by_role('tab', name=re.compile('Design')).click()
    mp.get_by_test_id('browse-templates').click()
    mp.wait_for_timeout(500)
    shot(mp, '25-mobile-template-gallery.png')
    browser.close()

# contact sheet
from PIL import Image, ImageDraw, ImageFont
files = [os.path.join(TPL_DIR, f'{t}.png') for t in ids]
cols = 6
tw, th = 794 // 3, 1123 // 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 20) + 20, rows * (th + 46) + 20), '#EEEAF6')
draw = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').crop((0, 0, 794, 1123)).resize((tw, th), Image.LANCZOS)
    x = 20 + (i % cols) * (tw + 20); y = 20 + (i // cols) * (th + 46)
    sheet.paste(im, (x, y))
    draw.text((x, y + th + 8), os.path.basename(f)[:-4], fill='#16122A', font=font)
sheet.save(os.path.join(OUT, '26-all-templates-contact-sheet.png'))
print('contact sheet saved', len(files))

print('ERRORS', errors)
print('PROBLEMS', problems)
sys.exit(1 if errors or problems else 0)
