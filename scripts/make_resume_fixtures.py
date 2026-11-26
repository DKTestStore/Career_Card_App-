"""Generates fictional résumé files (DOCX, PDF, TXT) for the upload / parse tests.
DOCX is written with python-docx (Word-style bullets & headings); PDF is converted by LibreOffice."""
import os, subprocess, shutil
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_TAB_ALIGNMENT

D = os.path.join(os.path.dirname(__file__), 'fixtures')
os.makedirs(D, exist_ok=True)

R = {
  'name': 'Kavya Raman', 'label': 'Data Analyst',
  'contact': 'Chennai, Tamil Nadu | kavya.raman@example.com | +91 98765 43210 | linkedin.com/in/kavya-raman-demo | github.com/kavyar-demo',
  'summary': 'Data analyst with 3 years of experience turning messy operational data into dashboards and decisions. Comfortable with SQL, Python and Power BI, and with presenting findings to non-technical stakeholders.',
  'work': [
    ('Data Analyst', 'Quickbasket Retail Pvt Ltd', 'Bengaluru', 'Jun 2023', 'Present', [
      'Built a Power BI sales dashboard used by 40 store managers, cutting weekly reporting time by 6 hours.',
      'Wrote SQL and Python (Pandas) pipelines that clean 2M+ order rows a day and feed the forecasting model.',
      'Ran A/B tests on checkout changes with the product team; the winning variant lifted conversion by 3.2%.',
    ]),
    ('Junior Analyst Intern', 'Northstar Logistics', 'Chennai', 'Jan 2022', 'May 2023', [
      'Automated a daily Excel report with Python, saving the operations team 5 hours a week.',
      'Analysed delivery delays across 12 hubs and presented findings to regional leads.',
    ]),
  ],
  'education': [('B.Tech in Information Technology', 'Anna University, Chennai', '2018', '2022', 'CGPA: 8.4/10')],
  'skills': [('Languages', 'SQL, Python, R programming'), ('Tools', 'Power BI, Tableau, Excel, Jupyter, Git'), ('Methods', 'Data visualization, Statistics, A/B testing, Forecasting')],
  'projects': [('Retail Demand Forecast', 'Python, Pandas, scikit-learn', ['Forecast weekly demand for 300 SKUs with a gradient boosting model (MAPE 11%).'])],
  'certs': ['Google Data Analytics Certificate - Coursera (2022)', 'Microsoft Power BI Data Analyst - Microsoft (2023)'],
}

def build_docx(path):
    doc = Document()
    st = doc.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(10.5)
    t = doc.add_paragraph(); r = t.add_run(R['name']); r.bold = True; r.font.size = Pt(22); r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x68)
    doc.add_paragraph(R['label'])
    doc.add_paragraph(R['contact'])
    def heading(x): doc.add_heading(x, level=1)
    heading('Summary'); doc.add_paragraph(R['summary'])
    heading('Work Experience')
    for (pos, org, loc, s, e, bullets) in R['work']:
        p = doc.add_paragraph(); p.paragraph_format.tab_stops.add_tab_stop(Pt(470), WD_TAB_ALIGNMENT.RIGHT)
        rr = p.add_run(f'{pos} | {org}, {loc}'); rr.bold = True; p.add_run(f'\t{s} – {e}')
        for b in bullets: doc.add_paragraph(b, style='List Bullet')
    heading('Education')
    for (deg, inst, s, e, sc) in R['education']:
        p = doc.add_paragraph(); p.add_run(deg).bold = True
        doc.add_paragraph(f'{inst} | {s} – {e} | {sc}')
    heading('Skills')
    for (k, v) in R['skills']:
        p = doc.add_paragraph(); p.add_run(f'{k}: ').bold = True; p.add_run(v)
    heading('Projects')
    for (n, tech, bullets) in R['projects']:
        p = doc.add_paragraph(); p.add_run(n).bold = True; p.add_run(f' | {tech}')
        for b in bullets: doc.add_paragraph(b, style='List Bullet')
    heading('Certifications')
    for c in R['certs']: doc.add_paragraph(c, style='List Bullet')
    doc.core_properties.title = 'Kavya Raman resume (fictional test fixture)'
    doc.save(path)

def build_txt(path):
    L = [R['name'], R['label'], R['contact'], '', 'SUMMARY', R['summary'], '', 'EXPERIENCE']
    for (pos, org, loc, s, e, bullets) in R['work']:
        L += [f'{pos}, {org} — {loc}    {s} - {e}'] + [f'- {b}' for b in bullets] + ['']
    L += ['EDUCATION'] + [f'{d}, {i}  {s}-{e}  {sc}' for (d, i, s, e, sc) in R['education']] + ['', 'SKILLS'] + [f'{k}: {v}' for (k, v) in R['skills']]
    open(path, 'w').write('\n'.join(L) + '\n')

docx_path = os.path.join(D, 'resume-kavya.docx')
build_docx(docx_path)
build_txt(os.path.join(D, 'resume-kavya.txt'))
# PDF via LibreOffice (headless) from the same DOCX — a realistic "Word → PDF" resume.
out = os.path.join(D, '_lo'); os.makedirs(out, exist_ok=True)
subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', out, docx_path], check=True, capture_output=True, timeout=120)
shutil.move(os.path.join(out, 'resume-kavya.pdf'), os.path.join(D, 'resume-kavya.pdf'))
shutil.rmtree(out, ignore_errors=True)
print('fixtures ok:', sorted(f for f in os.listdir(D) if f.startswith('resume-')))
