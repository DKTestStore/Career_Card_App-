/**
 * Keyword extraction & matching for the ATS checker. 100% client-side.
 * Loaded lazily with the /ats page so the main bundle stays small.
 */
import type { Resume } from '../types';
import { toPlainText } from '../resume';

export type KwKind = 'tool' | 'skill' | 'soft' | 'cert' | 'edu';
interface Entry { name: string; kind: KwKind; aliases?: string[]; cs?: RegExp }

/** "Canonical|alias1|alias2" compact notation, grouped by kind. */
const RAW: Record<KwKind, string[]> = {
  tool: [
    // languages
    'JavaScript|js|ecmascript', 'TypeScript', 'Python', 'Java', 'C++|cpp', 'C#|csharp', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby', 'Scala',
    'SQL', 'Bash|shell scripting', 'MATLAB', 'Dart', 'Golang', 'HTML|html5', 'CSS|css3', 'Sass|scss', 'GraphQL', 'Solidity', 'Verilog', 'VHDL', 'Assembly|asm',
    // frameworks & platforms
    'React|react.js|reactjs', 'Next.js|nextjs', 'Angular', 'Vue|vue.js|vuejs', 'Svelte', 'Node.js|nodejs', 'Express|express.js', 'Django', 'Flask', 'FastAPI',
    'Spring Boot|spring framework', '.NET|dotnet|asp.net', 'Laravel', 'Rails|ruby on rails', 'React Native', 'Flutter', 'Android', 'iOS', 'Tailwind|tailwindcss', 'Redux',
    'jQuery', 'Bootstrap', 'Vite', 'Webpack', 'Jest', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'PyTest',
    // cloud, devops, data infra
    'AWS|amazon web services', 'Azure', 'GCP|google cloud', 'Docker', 'Kubernetes|k8s', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CI/CD|ci cd|continuous integration',
    'Linux', 'Git', 'Nginx', 'Kafka', 'RabbitMQ', 'Redis', 'PostgreSQL|postgres', 'MySQL', 'MongoDB', 'DynamoDB', 'Elasticsearch', 'Cassandra', 'SQLite', 'Firebase', 'Supabase',
    'Lambda|aws lambda', 'S3', 'EC2', 'Serverless', 'Microservices|microservice', 'REST|rest api|restful|rest apis', 'gRPC', 'WebSockets|websocket', 'OAuth', 'Prometheus', 'Grafana', 'Datadog',
    // data & ml
    'Pandas', 'NumPy', 'scikit-learn|sklearn', 'TensorFlow', 'PyTorch', 'Keras', 'Spark|apache spark|pyspark', 'Hadoop', 'Airflow', 'dbt', 'Snowflake', 'BigQuery', 'Redshift', 'Databricks',
    'Tableau', 'Power BI|powerbi', 'Looker', 'Excel|ms excel|microsoft excel', 'Google Sheets', 'Jupyter', 'R programming|rstudio', 'SAS', 'SPSS', 'LangChain', 'OpenCV', 'Hugging Face',
    // embedded / hardware
    'RTOS', 'FreeRTOS', 'Zephyr', 'ARM|arm cortex|cortex-m', 'STM32', 'ESP32', 'Arduino', 'Raspberry Pi', 'I2C|i²c', 'SPI', 'UART', 'CAN bus|can-bus', 'Modbus', 'MQTT', 'BLE|bluetooth low energy|bluetooth',
    'Wi-Fi|wifi', 'LoRa|lorawan', 'Zigbee', 'Embedded Linux|yocto', 'Bootloader', 'Device drivers|device driver', 'Firmware', 'PCB|pcb design', 'Oscilloscope', 'Logic analyzer', 'JTAG', 'Altium', 'KiCad',
    'OTA|over-the-air', 'Low power|low-power', 'DMA', 'Interrupts|isr',
    // design & product tools
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'After Effects', 'Framer', 'Miro', 'Jira', 'Confluence', 'Notion', 'Trello', 'Asana',
    'Google Analytics|ga4', 'Mixpanel', 'Amplitude', 'Hotjar', 'Salesforce', 'HubSpot', 'SAP', 'Tally', 'QuickBooks', 'AutoCAD', 'SolidWorks', 'Postman',
  ],
  skill: [
    'Machine learning|ml', 'Deep learning', 'NLP|natural language processing', 'Computer vision', 'LLM|large language models|llms', 'Generative AI|genai', 'Data analysis|data analytics',
    'Data visualization|data visualisation', 'Statistics|statistical analysis', 'A/B testing|ab testing|experimentation', 'ETL|elt', 'Data modeling|data modelling', 'Data pipelines|data pipeline',
    'Dashboards|dashboard', 'Forecasting', 'Regression', 'Hypothesis testing', 'KPI|kpis', 'Reporting',
    'System design', 'Distributed systems', 'Scalability', 'Performance optimization|performance tuning', 'Caching', 'Observability', 'Monitoring', 'Security', 'Unit testing|unit tests',
    'Test automation|automated testing', 'Code review|code reviews', 'Debugging', 'API design', 'Backend|back-end', 'Frontend|front-end', 'Full stack|full-stack', 'Mobile development',
    'Cloud', 'DevOps', 'SRE|site reliability', 'Infrastructure as code|iac', 'Containerization', 'Object-oriented|oop|object oriented', 'Data structures', 'Algorithms',
    'Embedded systems|embedded', 'Real-time|real time', 'IoT|internet of things', 'Sensors|sensor', 'Signal processing|dsp', 'Hardware bring-up|board bring-up', 'Power management', 'Wireless',
    'User research', 'Usability testing', 'Wireframing|wireframes', 'Prototyping|prototypes', 'Interaction design', 'Visual design', 'Design systems|design system', 'Information architecture',
    'Accessibility|a11y|wcag', 'User flows|user journeys', 'UX|user experience', 'UI|user interface', 'Responsive design', 'Typography', 'Branding',
    'Product management', 'Product roadmap|roadmap', 'Requirements gathering', 'User stories', 'Go-to-market|gtm', 'OKRs', 'Agile', 'Scrum', 'Kanban', 'Sprint planning',
    'SEO', 'SEM', 'Content strategy', 'Social media', 'Email marketing', 'Copywriting', 'Lead generation', 'CRM', 'Market research', 'Growth',
    'Financial modeling|financial modelling', 'Budgeting', 'Accounting', 'Auditing|audit', 'Taxation|tax', 'Compliance', 'Risk management', 'Valuation', 'Procurement', 'Supply chain', 'Operations',
    'Customer success', 'Sales', 'Business development', 'Recruitment|recruiting|talent acquisition', 'Onboarding', 'Payroll', 'Project management', 'Quality assurance|qa',
  ],
  soft: [
    'Communication|communication skills', 'Leadership', 'Mentoring|mentorship', 'Collaboration|cross-functional', 'Stakeholder management|stakeholders', 'Problem solving|problem-solving',
    'Ownership', 'Teamwork', 'Presentation|presentations', 'Negotiation', 'Time management', 'Attention to detail|detail-oriented', 'Critical thinking', 'Adaptability', 'Storytelling',
  ],
  cert: [
    'AWS Certified|aws certification', 'PMP', 'CSM|certified scrum master', 'CFA', 'CPA', 'Chartered Accountant', 'Google Data Analytics Certificate', 'CCNA', 'CISSP', 'Six Sigma', 'ITIL', 'CKA',
  ],
  edu: [
    "Bachelor's|bachelor|bachelors|b.tech|btech|b.e.|bsc|b.sc", "Master's|masters|m.tech|mtech|msc|m.sc|mba", 'PhD|ph.d|doctorate', 'Computer Science', 'Electronics|ece|electrical engineering',
    'Statistics degree', 'HCI|human-computer interaction', 'Design degree|b.des|m.des',
  ],
};

const DICT: Entry[] = Object.entries(RAW).flatMap(([kind, list]) => list.map((s) => {
  const [name, ...aliases] = s.split('|');
  return { name, kind: kind as KwKind, aliases };
}));
// Case-sensitive specials (too ambiguous in lowercase).
DICT.push({ name: 'Go', kind: 'tool', cs: /(?<![\w.])Go(?![\w-])(?!\s+to\b)/ }, { name: 'C', kind: 'tool', cs: /(?<![\w+#./])C(?![\w+#'’])/ }, { name: 'R', kind: 'tool', cs: /(?<![\w./])R(?![\w'’/&.])/ });

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const rxCache = new Map<string, RegExp>();
function termRx(term: string): RegExp {
  let r = rxCache.get(term);
  if (!r) { r = new RegExp(`(?<![\\w+#.])${esc(term.toLowerCase())}(?![\\w+#])`, 'i'); rxCache.set(term, r); }
  return r;
}
function entryIn(e: Entry, lower: string, raw: string): boolean {
  if (e.cs) return e.cs.test(raw);
  return [e.name, ...(e.aliases ?? [])].some((t) => termRx(t).test(lower));
}

export const STOPWORDS = new Set((
  'a about above across after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each ' +
  'few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over ' +
  'own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why ' +
  'will with would you your yours etc eg ie per via within without across among including include includes us role job position candidate candidates team teams work working ' +
  'company years year experience experienced strong excellent good great ability able must preferred plus nice required requirements responsibilities responsible looking join ' +
  'opportunity using use build building help new across across based well understanding knowledge skills skill related relevant field minimum least degree equivalent day days ' +
  'environment fast paced world class across ensure including familiar familiarity proven track record hands-on hands what you will we are our who').split(/\s+/));

const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '');
const tokens = (t: string) => t.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, ' ').split(/\s+/).map((w) => w.replace(/^[-./]+|[-./]+$/g, '')).filter(Boolean);

export interface JdKeyword { term: string; kind: KwKind | 'term'; weight: number }

/** Dictionary hits + frequent meaningful n-grams from a job description. */
export function extractKeywords(jd: string): JdKeyword[] {
  const lower = jd.toLowerCase();
  const found: JdKeyword[] = DICT.filter((e) => entryIn(e, lower, jd)).map((e) => ({ term: e.name, kind: e.kind, weight: e.kind === 'soft' || e.kind === 'edu' ? 1 : 2 }));
  const covered = new Set(found.flatMap((f) => tokens(f.term).map(stem)));
  DICT.forEach((e) => { if (found.some((f) => f.term === e.name)) (e.aliases ?? []).forEach((a) => tokens(a).forEach((t) => covered.add(stem(t)))); });
  // n-grams (1-2 words) repeated in the JD
  const toks = tokens(jd);
  const counts = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    if (a.length < 4 || STOPWORDS.has(a) || /^\d/.test(a)) continue;
    counts.set(a, (counts.get(a) ?? 0) + 1);
    const b = toks[i + 1];
    if (b && b.length >= 3 && !STOPWORDS.has(b) && !/^\d/.test(b)) counts.set(`${a} ${b}`, (counts.get(`${a} ${b}`) ?? 0) + 1);
  }
  const extra = [...counts.entries()]
    .filter(([t, n]) => n >= 2 && !t.split(' ').every((w) => covered.has(stem(w))))
    .sort((x, y) => y[1] - x[1] || y[0].split(' ').length - x[0].split(' ').length)
    .map(([t]) => t);
  const picked: string[] = [];
  for (const t of extra) {
    if (picked.length >= 8) break;
    if (picked.some((p) => p.includes(t) || t.includes(p))) continue;
    picked.push(t);
  }
  return [...found, ...picked.map((t) => ({ term: t, kind: 'term' as const, weight: 1 }))].slice(0, 40);
}

export interface KeywordResult { matched: string[]; missing: JdKeyword[]; all: JdKeyword[]; score01: number }

export function matchKeywords(resume: Pick<Resume, 'content'>, jd: string): KeywordResult {
  const all = extractKeywords(jd);
  const raw = toPlainText(resume.content);
  const lower = raw.toLowerCase();
  const stemmed = ' ' + tokens(raw).map(stem).join(' ') + ' ';
  const matched: string[] = [];
  const missing: JdKeyword[] = [];
  let got = 0, total = 0;
  for (const k of all) {
    total += k.weight;
    const e = DICT.find((d) => d.name === k.term);
    const ok = e ? entryIn(e, lower, raw) : stemmed.includes(' ' + tokens(k.term).map(stem).join(' ') + ' ');
    if (ok) { matched.push(k.term); got += k.weight; } else missing.push(k);
  }
  return { matched, missing, all, score01: total ? got / total : 0 };
}

export type Target = 'skills' | 'work' | 'summary' | 'certificates' | 'education' | 'projects';
/** Where should a missing keyword go? */
export function whereToAdd(k: JdKeyword): { section: Target; text: string } {
  switch (k.kind) {
    case 'tool': return { section: 'skills', text: `Add "${k.term}" to a Skills group, then mention it in an Experience or Project bullet that shows how you used it.` };
    case 'skill': return { section: 'work', text: `Show "${k.term}" in an Experience bullet with a result (e.g. "Used ${k.term.toLowerCase()} to …, improving … by 20%"). Also list it under Skills.` };
    case 'soft': return { section: 'work', text: `Don't just list "${k.term}". Prove it in a bullet, e.g. "Led …", "Mentored 3 engineers …", "Partnered with … to …".` };
    case 'cert': return { section: 'certificates', text: `If you hold "${k.term}", add it under Certifications with issuer and date.` };
    case 'edu': return { section: 'education', text: `Make sure your degree wording matches "${k.term}" in the Education section.` };
    default: return { section: 'summary', text: `The job post repeats "${k.term}". Use the same phrase in your Summary or a relevant bullet if it honestly applies.` };
  }
}
