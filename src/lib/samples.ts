import type { AccentId, TemplateId } from './types';
import { normalizeContent } from './resume';

export interface Sample { key: string; title: string; blurb: string; template: TemplateId; accent: AccentId; data: object }

export const SAMPLES: Sample[] = [
  {
    key: 'swe', title: 'Software Engineer', blurb: '4+ years, backend & cloud', template: 'executive', accent: 'violet',
    data: {
      basics: {
        name: 'Priya Sharma', label: 'Software Engineer', email: 'priya.sharma@email.com', phone: '+91 98765 43210', url: 'priyasharma.dev',
        summary: 'Software engineer with 4+ years of experience building scalable backend systems and IoT data pipelines. Comfortable across Python, Node.js and cloud infrastructure, with a focus on reliability and measurable performance.',
        location: { city: 'Bengaluru', countryCode: 'India' },
        profiles: [{ network: 'LinkedIn', url: 'linkedin.com/in/priyasharma' }, { network: 'GitHub', url: 'github.com/priyasharma' }],
      },
      work: [
        { name: 'Nimbus Labs', position: 'Software Engineer', location: 'Bengaluru', startDate: '2023-01', endDate: '', highlights: [
          'Designed a telemetry ingest API that processes 2.4M events per day with 99.95% uptime',
          'Reduced p95 API latency by 38% by introducing Redis caching and query batching',
          'Led design reviews and mentored 2 junior engineers on testing and observability',
        ] },
        { name: 'Pixelwave', position: 'Associate Software Engineer', location: 'Pune', startDate: '2021-07', endDate: '2022-12', highlights: [
          'Built REST services in Node.js and Python for a B2B analytics dashboard used by 80+ accounts',
          'Added integration tests that reduced production incidents by 25% quarter over quarter',
        ] },
      ],
      education: [{ institution: 'NIT Trichy', area: 'Computer Science', studyType: 'B.Tech', startDate: '2017-08', endDate: '2021-05', score: 'CGPA 8.7 / 10' }],
      projects: [
        { name: 'HomeSense IoT Hub', description: 'Raspberry Pi + MQTT dashboard aggregating 12 household sensors with alerting and a React UI.', highlights: [], keywords: ['Raspberry Pi', 'MQTT', 'React'] },
        { name: 'TransitDelay', description: 'Real-time delay predictor for city buses using public GTFS feeds and a lightweight Python model.', highlights: [], keywords: ['Python', 'GTFS'] },
      ],
      skills: [
        { name: 'Languages', keywords: ['Python', 'TypeScript', 'Go', 'SQL'] },
        { name: 'Backend & Cloud', keywords: ['Node.js', 'PostgreSQL', 'Redis', 'AWS', 'Docker', 'MQTT'] },
        { name: 'Frontend', keywords: ['React', 'Vite'] },
      ],
      certificates: [{ name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', date: '2023-06' }],
      awards: [{ title: 'Spot Award for Reliability', awarder: 'Nimbus Labs', date: '2024-03', summary: 'Cut on-call pages by 60% in two quarters.' }],
    },
  },
  {
    key: 'fresher', title: 'Fresher / Student', blurb: 'Projects-first, one page', template: 'modern', accent: 'teal',
    data: {
      basics: {
        name: 'Arjun Nair', label: 'Electronics & Communication Engineering Student', email: 'arjun.nair@email.com', phone: '+91 91234 56789', url: '',
        summary: 'Final-year ECE student focused on embedded systems and IoT. Built 4 hardware + firmware projects with STM32, ESP32 and FreeRTOS, and looking for an embedded software internship.',
        location: { city: 'Chennai', countryCode: 'India' },
        profiles: [{ network: 'GitHub', url: 'github.com/arjun-nair' }, { network: 'LinkedIn', url: 'linkedin.com/in/arjunnair' }],
      },
      work: [
        { name: 'Ather Energy', position: 'Embedded Systems Intern', location: 'Bengaluru', startDate: '2025-05', endDate: '2025-07', highlights: [
          'Wrote CAN bus diagnostic scripts in Python that cut manual test time by 40%',
          'Ported a sensor driver to FreeRTOS and validated it on 3 board revisions',
        ] },
      ],
      education: [
        { institution: 'Anna University, CEG', area: 'Electronics & Communication', studyType: 'B.E.', startDate: '2022-08', endDate: '2026-05', score: 'CGPA 8.9 / 10', courses: ['Microcontrollers', 'Digital Signal Processing', 'Embedded C', 'VLSI Design'] },
        { institution: 'Kendriya Vidyalaya, Chennai', area: 'PCM', studyType: 'Class XII', startDate: '', endDate: '2022-05', score: '94%' },
      ],
      projects: [
        { name: 'Smart Irrigation Controller', description: 'ESP32-based controller using soil moisture sensors and weather data.', highlights: ['Reduced water use by 30% across a 2-acre college farm pilot', 'Built an MQTT dashboard for live readings'], keywords: ['ESP32', 'MQTT', 'C'] },
        { name: 'Line-Following Robot', description: 'PID-tuned robot on STM32 for an inter-college contest.', highlights: ['Placed 2nd of 48 teams at TechFest 2024'], keywords: ['STM32', 'PID', 'Embedded C'] },
      ],
      skills: [
        { name: 'Embedded', keywords: ['Embedded C', 'STM32', 'ESP32', 'FreeRTOS', 'UART/SPI/I2C', 'CAN'] },
        { name: 'Tools', keywords: ['Python', 'MATLAB', 'KiCad', 'Git'] },
      ],
      certificates: [{ name: 'Embedded Systems Essentials with Arm', issuer: 'Arm Education / edX', date: '2024-11' }],
      awards: [{ title: 'Smart India Hackathon — Finalist', awarder: 'Govt. of India', date: '2024-12', summary: 'Hardware edition, IoT flood-warning system.' }],
    },
  },
  {
    key: 'designer', title: 'Product Designer', blurb: 'UX/UI with case studies', template: 'elegant', accent: 'coral',
    data: {
      basics: {
        name: 'Meera Iyer', label: 'Product Designer', email: 'meera.iyer@email.com', phone: '+91 99887 76655', url: 'meeraiyer.design',
        summary: 'Product designer with 5 years of experience shaping fintech and health apps. I turn research into simple flows, ship design systems, and measure outcomes with product teams.',
        location: { city: 'Mumbai', countryCode: 'India' },
        profiles: [{ network: 'Dribbble', url: 'dribbble.com/meeraiyer' }, { network: 'LinkedIn', url: 'linkedin.com/in/meeraiyer' }],
      },
      work: [
        { name: 'PaySure', position: 'Senior Product Designer', location: 'Mumbai', startDate: '2022-04', endDate: '', highlights: [
          'Redesigned onboarding, raising KYC completion from 61% to 83%',
          'Built a 120-component design system adopted by 4 squads',
          'Ran 30+ usability sessions per quarter and shared insights with leadership',
        ] },
        { name: 'CareLoop Health', position: 'Product Designer', location: 'Remote', startDate: '2020-06', endDate: '2022-03', highlights: [
          'Designed appointment booking flow that reduced drop-offs by 22%',
          'Introduced accessibility reviews; achieved WCAG 2.1 AA on core screens',
        ] },
      ],
      education: [{ institution: 'National Institute of Design', area: 'Interaction Design', studyType: 'M.Des', startDate: '2018-07', endDate: '2020-05', score: '' }],
      projects: [{ name: 'Open Bus Mumbai', description: 'Volunteer redesign of the city bus app concept; featured on Behance.', highlights: [], keywords: ['Figma', 'Research'] }],
      skills: [
        { name: 'Design', keywords: ['Figma', 'Prototyping', 'Design Systems', 'Interaction Design'] },
        { name: 'Research', keywords: ['Usability Testing', 'Interviews', 'Journey Mapping'] },
        { name: 'Collaboration', keywords: ['Workshops', 'Product Strategy', 'HTML/CSS'] },
      ],
      certificates: [{ name: 'Google UX Design Certificate', issuer: 'Google / Coursera', date: '2021-02' }],
      awards: [{ title: 'Red Dot Design Award — Honourable Mention', awarder: 'Red Dot', date: '2023-09', summary: '' }],
    },
  },
];

export function sampleContent(key: string) {
  const s = SAMPLES.find((x) => x.key === key);
  return s ? normalizeContent(s.data) : null;
}
