"""Smoke test + review screenshots. Usage: npm run build && npx vite preview --port 4173 & python3 scripts/review.py"""
import datetime, os, sys, re
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = os.path.join(os.path.dirname(__file__), '..', 'screenshots-review')
os.makedirs(OUT, exist_ok=True)
errors = []

def shot(page, name, full=False):
    page.wait_for_timeout(350)
    page.screenshot(path=os.path.join(OUT, name), full_page=full)
    print('shot', name)

def d(days):
    return (datetime.date.today() + datetime.timedelta(days=days)).isoformat()

with sync_playwright() as p:
    exe = os.environ.get('CHROME', '/usr/bin/google-chrome')
    browser = p.chromium.launch(executable_path=exe, headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)

    # --- welcome / first visit ---
    page.goto(BASE + '/')
    expect(page.get_by_role('heading', name='Build a sharp resume')).to_be_visible()
    expect(page.get_by_role('button', name='Continue with Google')).to_be_disabled()
    expect(page.get_by_text('Coming soon')).to_be_visible()
    shot(page, '12-desktop-welcome.png')
    page.get_by_label('First name').fill('Priya')
    page.get_by_test_id('get-started').click()
    expect(page.get_by_role('heading', name='Good')).to_be_visible()
    expect(page.get_by_role('heading', name='Priya')).to_be_visible()
    page.reload()
    expect(page.get_by_role('heading', name='Good')).to_be_visible()
    expect(page.locator('.welcome-hero')).to_have_count(0)
    expect(page.get_by_text('No resumes yet')).to_be_visible()

    # --- create resumes from samples ---
    for key in ['designer', 'fresher', 'swe']:
        page.goto(BASE + '/')
        page.get_by_role('button', name='New resume').click()
        page.locator(f'[data-sample="{key}"]').click()
        expect(page.locator('#resume-name')).to_be_visible()
    # we're in the SWE editor now
    url = page.url
    # --- edit ---
    page.get_by_label('Headline').fill('Senior Software Engineer')
    expect(page.locator('.ed-preview .rdoc')).to_contain_text('Senior Software Engineer')
    page.locator('#acc-work').click()
    page.get_by_role('button', name='Add experience').click()
    page.get_by_label('Job title').last.fill('Intern')
    page.get_by_label('Company').last.fill('Acme Robotics')
    expect(page.locator('.ed-preview .rdoc')).to_contain_text('Acme Robotics')
    # remove it again
    page.get_by_role('button', name='Remove Intern').click()
    expect(page.locator('.ed-preview .rdoc')).not_to_contain_text('Acme Robotics')
    page.locator('#acc-work').click()
    # --- template + colour ---
    page.locator('[data-template="elegant"]').click()
    expect(page.locator('.ed-preview .rdoc')).to_have_class('rdoc rdoc-elegant')
    page.get_by_role('radio', name='Teal').click()
    page.locator('[data-template="executive"]').click()
    page.get_by_role('radio', name='Violet').click()
    expect(page.locator('.ed-preview .rdoc')).to_have_class('rdoc rdoc-executive')
    # --- save version ---
    page.get_by_label('Version label').fill('Master')
    page.locator('.ver-form button[type=submit]').click()
    expect(page.locator('.ver-list')).to_contain_text('v1 · Master')
    expect(page.locator('.save-ind')).to_contain_text('Saved')
    page.locator('#acc-work').click()
    shot(page, '02-desktop-editor.png')
    page.locator('#acc-work').click()

    # export menu + text export
    page.get_by_role('button', name='Export').click()
    with page.expect_download() as dl:
        page.get_by_role('menuitem', name='Plain text (.txt)').click()
    txt = open(dl.value.path()).read()
    assert 'SENIOR' not in txt and 'Senior Software Engineer' in txt, 'plain text export'
    page.get_by_role('button', name='Export').click()
    with page.expect_download() as dl:
        page.get_by_role('menuitem', name='JSON Resume (.json)').click()
    json_resume_path = dl.value.path()
    assert '"basics"' in open(json_resume_path).read()

    # print media emulation: only resume visible
    page.emulate_media(media='print')
    assert page.locator('.print-root').is_visible() and not page.locator('.shell').is_visible(), 'print css'
    page.pdf(path=os.path.join(OUT, 'resume-export-sample.pdf'), prefer_css_page_size=True, print_background=True)
    page.emulate_media(media='screen')

    # --- reload persists ---
    page.wait_for_timeout(700)
    page.reload()
    expect(page.get_by_label('Headline')).to_have_value('Senior Software Engineer')
    expect(page.locator('.ver-list')).to_contain_text('Master')

    # --- tracker ---
    page.goto(BASE + '/tracker')
    apps = [
        ('Razorpay', 'Backend Engineer', 'applied', d(-2), '₹32 LPA'),
        ('Atlassian', 'Software Engineer', 'interview', d(3), ''),
        ('Google', 'SWE, Cloud', 'rejected', '', ''),
        ('Freshworks', 'Backend Engineer', 'applied', d(5), ''),
        ('Zoho', 'Member Technical Staff', 'wishlist', '', ''),
        ('Microsoft', 'Software Engineer II', 'offer', '', '₹45 LPA'),
        ('Swiggy', 'SDE-2', 'applied', d(0), ''),
    ]
    for co, role, st, fu, sal in apps:
        page.get_by_role('button', name='New application').click()
        page.get_by_label('Company *').fill(co)
        page.get_by_label('Role *').fill(role)
        page.get_by_label('Status', exact=True).select_option(st)
        page.get_by_label('Location', exact=True).fill('Bengaluru')
        if fu: page.get_by_label('Next follow-up').fill(fu)
        if sal: page.get_by_label('Salary / CTC (optional)').fill(sal)
        page.get_by_label('Resume used').select_option(label='Software Engineer — Sample')
        if co == 'Razorpay': page.get_by_label('Version', exact=True).select_option(index=1)
        page.get_by_role('button', name='Add application', exact=True).click()
        expect(page.locator('dialog[open]')).to_have_count(0)
    expect(page.locator('.col[data-status="applied"] .app-card')).to_have_count(3)
    expect(page.locator('.app-card.is-overdue')).to_have_count(1)
    # drag Freshworks from Applied to Interview
    src = page.locator('.app-card', has_text='Freshworks')
    page.locator('.app-card', has_text='Freshworks').drag_to(page.locator('.col[data-status="interview"] .col-add'))
    expect(page.locator('.col[data-status="interview"]')).to_contain_text('Freshworks')
    # move via select (mobile-style control)
    page.locator('.app-card', has_text='Zoho').hover()
    page.get_by_label('Move Member Technical Staff at Zoho to').select_option('applied')
    expect(page.locator('.col[data-status="applied"]')).to_contain_text('Zoho')
    page.mouse.move(0, 0)
    stats = page.locator('.tstat.rate').inner_text()
    print('stats', stats.replace('\n', ' '))
    shot(page, '03-desktop-tracker-kanban.png')
    # list view + filter
    page.get_by_role('button', name='List', exact=True).click()
    page.get_by_label('Filter by status').select_option('applied')
    expect(page.locator('.app-table tbody tr')).to_have_count(3)
    page.get_by_label('Filter by status').select_option('all')
    page.get_by_label('Search applications').fill('micro')
    expect(page.locator('.app-table tbody tr')).to_have_count(1)
    page.get_by_label('Search applications').fill('')
    shot(page, '04-desktop-tracker-list.png')
    page.get_by_role('button', name='Board', exact=True).click()
    page.reload()
    expect(page.locator('.col[data-status="interview"]')).to_contain_text('Freshworks')
    expect(page.locator('.col[data-status="applied"]')).to_contain_text('Zoho')

    # --- dashboard ---
    page.goto(BASE + '/')
    expect(page.locator('.resume-card')).to_have_count(3)
    shot(page, '01-desktop-dashboard.png')
    # duplicate + rename + delete
    page.get_by_role('button', name='Duplicate Product Designer — Sample').click()
    expect(page.locator('.resume-card')).to_have_count(4)
    page.get_by_role('button', name='Rename Product Designer — Sample (copy)').click()
    page.locator('#rename-form input').fill('Designer copy')
    page.get_by_role('button', name='Save', exact=True).click()
    page.get_by_role('button', name='Delete Designer copy').click()
    page.locator('dialog[open]').get_by_role('button', name='Delete').click()
    expect(page.locator('.resume-card')).to_have_count(3)

    # --- JSON Resume import ---
    page.locator('input[type=file][aria-label="Import JSON Resume file"]').set_input_files(json_resume_path)
    expect(page.locator('#resume-name')).to_have_value('Software Engineer — Sample')
    expect(page.get_by_label('Headline')).to_have_value('Senior Software Engineer')
    page.goto(BASE + '/resumes')
    expect(page.locator('.resume-card')).to_have_count(4)
    # --- full backup round trip ---
    page.goto(BASE + '/settings')
    with page.expect_download() as dl:
        page.get_by_role('button', name='Export backup').click()
    backup_path = dl.value.path()
    page.get_by_role('button', name='Delete all data on this device').click()
    page.locator('dialog[open]').get_by_role('button', name='Delete all').click()
    expect(page.locator('.toast')).to_have_text('All data deleted')
    page.goto(BASE + '/resumes')
    expect(page.get_by_text('No resumes yet')).to_be_visible()
    page.goto(BASE + '/settings')
    page.locator('input[type=file][aria-label="Import backup file"]').set_input_files(backup_path)
    page.get_by_role('button', name='Replace all').click()
    expect(page.locator('.toast')).to_have_text('Data replaced from backup')
    page.goto(BASE + '/tracker')
    expect(page.locator('.app-card')).to_have_count(7)
    page.goto(BASE + '/resumes')
    expect(page.locator('.resume-card')).to_have_count(4)
    # delete the imported copy again via confirm dialog
    page.get_by_role('button', name='Delete Software Engineer — Sample').first.click()
    page.locator('dialog[open]').get_by_role('button', name='Delete').click()
    expect(page.locator('.resume-card')).to_have_count(3)

    # --- mobile ---
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(url)
    expect(page.locator('.bottom-nav')).to_be_visible()
    shot(page, '05-mobile-editor.png')
    page.get_by_role('tab', name='Preview').click()
    shot(page, '06-mobile-editor-preview.png')
    page.get_by_role('tab', name='Design').click()
    shot(page, '07-mobile-editor-design.png')
    page.goto(BASE + '/tracker')
    shot(page, '08-mobile-tracker.png')
    page.get_by_label('Move Backend Engineer at Razorpay to').select_option('interview')
    expect(page.locator('.col[data-status="interview"]')).to_contain_text('Razorpay')
    page.get_by_role('button', name='List', exact=True).click()
    shot(page, '09-mobile-tracker-list.png')
    page.get_by_role('button', name='Board', exact=True).click()
    page.goto(BASE + '/')
    shot(page, '10-mobile-dashboard.png')
    page.set_viewport_size({'width': 360, 'height': 740})
    page.goto(BASE + '/tracker')
    w = page.evaluate('document.documentElement.scrollWidth')
    assert w <= 360, f'horizontal overflow at 360px: {w}'
    page.goto(url)
    w = page.evaluate('document.documentElement.scrollWidth')
    assert w <= 360, f'horizontal overflow editor 360px: {w}'
    page.goto(BASE + '/')
    w = page.evaluate('document.documentElement.scrollWidth')
    assert w <= 360, f'horizontal overflow dash 360px: {w}'
    # modal on mobile
    page.goto(BASE + '/tracker')
    page.get_by_role('button', name='New application').click()
    shot(page, '11-mobile-new-application.png')

    # service worker registered?
    sw = page.evaluate('navigator.serviceWorker.getRegistrations().then(r => r.length)')
    print('service workers', sw)
    # --- sign out, keep data ---
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.goto(BASE + '/')
    resume_count = page.locator('.resume-card').count()
    assert resume_count >= 1, f'expected resumes before sign-out, got {resume_count}'
    page.locator('.account-menu.sidebar .account-chip').click()
    page.get_by_test_id('sign-out').click()
    expect(page.get_by_role('heading', name='Sign out?')).to_be_visible()
    shot(page, '13-desktop-sign-out-dialog.png')
    page.get_by_test_id('confirm-sign-out').click()
    expect(page.get_by_role('heading', name="You're signed out")).to_be_visible()
    shot(page, '14-desktop-signed-out.png')
    page.get_by_test_id('sign-back-in').click()
    expect(page.get_by_role('heading', name='Good')).to_be_visible()
    expect(page.locator('.resume-card')).to_have_count(resume_count)
    print('sign out keep-data: resumes intact', resume_count)

    # --- sign out, erase data ---
    page.locator('.account-menu.sidebar .account-chip').click()
    page.get_by_test_id('sign-out').click()
    page.get_by_label('Sign out and erase data from this device').click()
    page.get_by_test_id('confirm-sign-out').click()
    page.locator('dialog[open]').get_by_role('button', name='Sign out and erase').click()
    expect(page.get_by_role('heading', name="You're signed out")).to_be_visible()
    page.get_by_test_id('sign-back-in').click()
    expect(page.get_by_text('No resumes yet')).to_be_visible()
    print('sign out erase: data cleared')

    # --- mobile welcome / sign-out (fresh context so we get the welcome page) ---
    ctx2 = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    m = ctx2.new_page()
    m.goto(BASE + '/')
    expect(m.get_by_role('heading', name='Build a sharp resume')).to_be_visible()
    shot(m, '15-mobile-welcome.png')
    w = m.evaluate('document.documentElement.scrollWidth')
    assert w <= 390, f'welcome overflow 390px: {w}'
    m.get_by_label('First name').fill('Priya')
    m.get_by_test_id('get-started').click()
    expect(m.get_by_role('heading', name='Good')).to_be_visible()
    m.locator('.account-menu.header .account-header-btn').click()
    m.get_by_test_id('sign-out').click()
    expect(m.get_by_role('heading', name='Sign out?')).to_be_visible()
    shot(m, '16-mobile-sign-out-dialog.png')
    m.get_by_test_id('confirm-sign-out').click()
    expect(m.get_by_role('heading', name="You're signed out")).to_be_visible()
    shot(m, '17-mobile-signed-out.png')
    w = m.evaluate('document.documentElement.scrollWidth')
    assert w <= 390, f'signed-out overflow 390px: {w}'
    m.get_by_test_id('back-to-welcome').click()
    expect(m.get_by_role('heading', name='Build a sharp resume')).to_be_visible()
    ctx2.close()

    browser.close()


real = [e for e in errors if 'favicon' not in e]
print('console/page errors:', real)
print('ALL SMOKE TESTS PASSED')
