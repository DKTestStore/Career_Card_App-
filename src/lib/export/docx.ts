/**
 * Word (.docx) export, generated client-side with a tiny hand-written OOXML
 * writer + fflate zip (lazy-loaded). Single-column, real headings and real
 * bulleted lists so ATS parsers and Word's navigation pane read it cleanly.
 * Colours, fonts, header alignment and section order follow the template.
 */
import type { Resume } from '../types';
import { buildModel, fileName, saveBlob, type DocModel, type DocSection } from './model';

// eslint-disable-next-line no-control-regex -- strip XML-illegal control characters
const esc = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = (h: string) => h.replace('#', '').toUpperCase();

const FONTS = { sans: 'Calibri', serif: 'Cambria', mono: 'Consolas' } as const;
const BODY_FONT = { sans: 'Calibri', serif: 'Georgia', mono: 'Calibri' } as const;
// A4, 0.75" margins (twips). Right tab stop for dates at the text edge.
const PAGE = { w: 11906, h: 16838, m: 1080 };
const TAB = PAGE.w - 2 * PAGE.m;

interface Run { t: string; b?: boolean; i?: boolean; color?: string; size?: number; caps?: boolean; font?: string }
const run = (r: Run) => {
  const pr = [r.font ? `<w:rFonts w:ascii="${r.font}" w:hAnsi="${r.font}" w:cs="${r.font}"/>` : '', r.b ? '<w:b/>' : r.b === false ? '<w:b w:val="0"/>' : '', r.i ? '<w:i/>' : '', r.caps ? '<w:caps/>' : '',
    r.color ? `<w:color w:val="${r.color}"/>` : '', r.size ? `<w:sz w:val="${r.size}"/><w:szCs w:val="${r.size}"/>` : ''].join('');
  return r.t.split('\t').map((part, i) => `${i ? '<w:r><w:tab/></w:r>' : ''}${part ? `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>` : ''}`).join('');
};
const p = (runs: Run[], opts: { style?: string; align?: 'center' | 'right'; after?: number; before?: number; tab?: boolean; bullet?: boolean; keepNext?: boolean; border?: string; shade?: string } = {}) => {
  const pr = [opts.style ? `<w:pStyle w:val="${opts.style}"/>` : '', opts.keepNext ? '<w:keepNext/>' : '', opts.bullet ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' : '',
    opts.border ?? '', opts.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.shade}"/>` : '',
    opts.tab ? `<w:tabs><w:tab w:val="right" w:pos="${TAB}"/></w:tabs>` : '',
    opts.after !== undefined || opts.before !== undefined ? `<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 0}"/>` : '',
    opts.align ? `<w:jc w:val="${opts.align}"/>` : ''].join('');
  return `<w:p>${pr ? `<w:pPr>${pr}</w:pPr>` : ''}${runs.map(run).join('')}</w:p>`;
};

export function buildDocumentXml(m: DocModel): string {
  const s = m.style, accent = hex(s.accent), soft = hex(s.soft);
  const center = s.align === 'center' ? 'center' as const : s.align === 'right' ? 'right' as const : undefined;
  const body: string[] = [];
  // Header block (Word keeps it in the body, not the page header, so ATS parsers see it).
  body.push(p([{ t: m.name }], { style: 'Title', align: center, border: s.band || s.stripe || s.header === 'ruled' ? `<w:pBdr><w:top w:val="single" w:sz="${s.band ? 48 : 24}" w:space="6" w:color="${accent}"/></w:pBdr>`
    : s.header === 'frame' ? `<w:pBdr>${['top', 'left', 'right'].map((x) => `<w:${x} w:val="single" w:sz="12" w:space="4" w:color="${accent}"/>`).join('')}</w:pBdr>` : undefined,
    shade: s.header === 'tinted' ? soft : undefined }));
  if (m.label) body.push(p([{ t: m.label }], { style: 'Subtitle', align: center }));
  if (m.contacts.length) body.push(p([{ t: m.contacts.join('  |  ') }], { style: 'Contact', align: center }));
  const headBorder = s.head === 'rule' || s.head === 'leader' || s.head === 'double' || s.head === 'underline' || s.head === 'tab'
    ? `<w:pBdr>${s.head === 'double' ? `<w:top w:val="single" w:sz="6" w:space="1" w:color="${accent}"/>` : ''}<w:bottom w:val="single" w:sz="${s.head === 'underline' || s.head === 'tab' ? 12 : 6}" w:space="1" w:color="${accent}"/></w:pBdr>`
    : s.head === 'dotted' ? `<w:pBdr><w:bottom w:val="dotted" w:sz="8" w:space="1" w:color="${accent}"/></w:pBdr>`
    : s.head === 'overline' ? `<w:pBdr><w:top w:val="single" w:sz="18" w:space="3" w:color="${accent}"/></w:pBdr>`
    : s.head === 'bar' || s.head === 'square' ? `<w:pBdr><w:left w:val="single" w:sz="${s.head === 'square' ? 36 : 24}" w:space="6" w:color="${accent}"/></w:pBdr>` : '';
  const headShade = s.head === 'box' ? accent : s.head === 'pill' || s.head === 'slab' ? soft : undefined;
  let secNo = 0;
  const sec = (x: DocSection) => {
    body.push(p([{ t: s.head === 'mono' ? `// ${x.title}` : s.head === 'number' ? `${String(++secNo).padStart(2, '0')}  ${x.title}` : x.title, color: s.head === 'box' ? 'FFFFFF' : undefined }], { style: 'Heading1', border: headBorder, shade: headShade, align: s.head === 'double' ? 'center' : undefined }));
    if (x.text) body.push(p([{ t: x.text }], { after: 80 }));
    for (const e of x.entries ?? []) {
      body.push(p([{ t: e.title, b: true }, ...(e.dates ? [{ t: `\t${e.dates}`, color: '6E6A7C', size: 19, b: false }] : [])], { style: 'Heading2', tab: true, keepNext: true }));
      if (e.sub) body.push(p([{ t: e.sub, i: true, color: s.mono ? '444444' : accent }], { after: 40, keepNext: e.bullets.length > 0 }));
      if (e.para) body.push(p([{ t: e.para }], { after: 40 }));
      for (const b of e.bullets) body.push(p([{ t: b }], { style: 'ListBullet', bullet: true }));
      for (const mt of e.meta ?? []) body.push(p([{ t: mt, color: '6E6A7C', size: 19 }], { after: 40 }));
      body.push(p([], { after: 60 }));
    }
    for (const pr of x.pairs ?? []) body.push(p([...(pr.label ? [{ t: `${pr.label}: `, b: true }] : []), { t: pr.text }], { after: 40 }));
  };
  m.sections.forEach(sec);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/><w:pgMar w:top="${PAGE.m}" w:right="${PAGE.m}" w:bottom="${PAGE.m}" w:left="${PAGE.m}" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function stylesXml(m: DocModel): string {
  const s = m.style, accent = hex(s.accent);
  const head = FONTS[s.headFont], bodyF = BODY_FONT[s.font];
  const sz = s.compact ? 20 : 21;
  const sp = s.compact ? 40 : s.airy ? 100 : 60;
  const titleColor = accent;
  const caps = s.head !== 'rule' && s.head !== 'bar' && s.head !== 'underline' && s.head !== 'mono' ? '<w:caps/>' : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${bodyF}" w:hAnsi="${bodyF}" w:cs="${bodyF}" w:eastAsia="${bodyF}"/><w:color w:val="373442"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="${sp}" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:rFonts w:ascii="${head}" w:hAnsi="${head}" w:cs="${head}"/><w:b/><w:color w:val="${titleColor}"/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:caps/><w:spacing w:val="10"/><w:color w:val="373442"/><w:sz w:val="21"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:color w:val="6E6A7C"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${s.airy ? 300 : 220}" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="${head}" w:hAnsi="${head}" w:cs="${head}"/><w:b/>${caps}<w:spacing w:val="${caps ? 12 : 0}"/><w:color w:val="${s.head === 'double' ? '1C1A26' : accent}"/><w:sz w:val="${caps ? 22 : 25}"/><w:szCs w:val="${caps ? 22 : 25}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="40" w:after="20"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1C1A26"/><w:sz w:val="${sz + 1}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr><w:spacing w:after="30"/><w:ind w:left="360" w:hanging="240"/></w:pPr></w:style>
</w:styles>`;
}

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

export async function resumeDocxBlob(r: Pick<Resume, 'name' | 'template' | 'accent' | 'customColor' | 'font' | 'content'>): Promise<{ blob: Blob; name: string }> {
  const { zipSync, strToU8 } = await import('fflate');
  const m = buildModel(r);
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    'word/_rels/document.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`),
    'word/document.xml': strToU8(buildDocumentXml(m)),
    'word/styles.xml': strToU8(stylesXml(m)),
    'word/numbering.xml': strToU8(NUMBERING),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(`${m.name} — Résumé`)}</dc:title><dc:creator>${esc(m.name)}</dc:creator><cp:keywords>resume</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`),
    'docProps/app.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Hire Ready</Application></Properties>`),
  };
  const zip = zipSync(files, { level: 6 });
  return { blob: new Blob([zip as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), name: fileName(m, 'docx') };
}

export async function downloadResumeDocx(r: Parameters<typeof resumeDocxBlob>[0]) {
  const { blob, name } = await resumeDocxBlob(r);
  saveBlob(name, blob);
  return name;
}
