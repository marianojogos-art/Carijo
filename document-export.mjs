import { zipStore } from './sge-workbook.mjs';
export const xmlEscape = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
export function exportFilename(meta, extension) {
  const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ['carijo', meta.type === 'quarter' ? 'planejamento-trimestral' : meta.type === 'activity' ? 'atividade-avaliacao' : 'planejamento-quinzenal', meta.className, meta.subject, meta.period].map(slug).filter(Boolean).join('-') + '.' + extension;
}
export function blocksFromElement(root) {
  function runs(node, format = {}) {
    if (node.nodeType === 3) return [{ text: node.textContent, ...format }];
    if (node.tagName === 'BR') return [{ text: '\n', ...format }];
    const tags = { STRONG: 'bold', B: 'bold', EM: 'italic', I: 'italic', U: 'underline' };
    const next = tags[node.tagName] ? { ...format, [tags[node.tagName]]: true } : format;
    return [...node.childNodes].flatMap(child => runs(child, next));
  }
  function walk(node) {
    if (node.nodeType === 3) return node.textContent.trim() ? [{ kind: 'p', runs: runs(node) }] : [];
    if (node.tagName === 'TABLE') return [{ kind: 'table', rows: [...node.rows].map(row => [...row.cells].map(cell => walk(cell))) }];
    if (/^H[1-6]$/.test(node.tagName)) return [{ kind: 'heading', level: Number(node.tagName[1]), runs: runs(node) }];
    if (node.tagName === 'UL' || node.tagName === 'OL') return [...node.children].flatMap((child, i) => [{ kind: 'list', marker: node.tagName === 'OL' ? `${i + 1}. ` : '• ', runs: runs(child) }]);
    if (['P', 'BLOCKQUOTE', 'SMALL'].includes(node.tagName)) return [{ kind: 'p', runs: runs(node) }];
    return [...node.childNodes].flatMap(walk);
  }
  return walk(root);
}
function runXml(run) {
  const props = `${run.bold ? '<w:b/>' : ''}${run.italic ? '<w:i/>' : ''}${run.underline ? '<w:u w:val="single"/>' : ''}${run.size ? `<w:sz w:val="${run.size}"/>` : ''}`;
  return String(run.text || '').split('\n').map((line, i) => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join('');
}
function blockXml(block) {
  if (block.kind === 'table') {
    const cols = Math.max(1, ...block.rows.map(row => row.length));
    return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(edge => `<w:${edge} w:val="single" w:sz="4" w:color="B6BDB2"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${Array.from({length:cols}, () => '<w:gridCol w:w="2400"/>').join('')}</w:tblGrid>${block.rows.map(row => `<w:tr>${row.map(cell => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${cell.map(blockXml).join('') || '<w:p/>'}<w:p/></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
  }
  const heading = block.kind === 'heading';
  const size = heading ? (block.level <= 2 ? 34 : 27) : 22;
  return `<w:p><w:pPr>${heading ? '<w:keepNext/>' : ''}<w:widowControl/><w:spacing w:after="140" w:line="300" w:lineRule="auto"/>${block.kind === 'list' ? '<w:ind w:left="360"/>' : ''}</w:pPr>${block.marker ? runXml({text:block.marker}) : ''}${(block.runs || []).map(run => runXml({...run, size, bold:heading || run.bold})).join('')}</w:p>`;
}
export function buildDocx(blocks, title = 'Carijó') {
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const document = `${declaration}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.map(blockXml).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1021" w:right="1021" w:bottom="1247" w:left="1021" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zipStore([
    {name:'[Content_Types].xml', data:`${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`},
    {name:'_rels/.rels', data:`${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`},
    {name:'word/document.xml', data:document},
    {name:'word/_rels/document.xml.rels', data:`${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'word/styles.xml', data:`${declaration}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`},
    {name:'docProps/core.xml', data:`${declaration}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>Carijó</dc:creator></cp:coreProperties>`}
  ]);
}
export const PRINT_CSS = `@page{size:A4 portrait;margin:18mm 18mm 22mm}html,body{margin:0;padding:0;background:white;color:#202820;font-family:Arial,sans-serif;font-size:11pt;line-height:1.55}*{box-sizing:border-box}h1,h2,h3,h4{font-family:Georgia,serif;color:#38533b;break-after:avoid-page;page-break-after:avoid}h2{font-size:23pt}h3{font-size:16pt;margin-top:7mm}p,li{orphans:3;widows:3;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:5mm 0}td,th{border:1px solid #a8b4a7;padding:3mm;overflow-wrap:anywhere}tr{break-inside:avoid-page}thead{display:table-header-group}.doc-cover{padding-bottom:7mm;border-bottom:1px solid #a8b4a7}.doc-cover small{font-size:9pt}.generated-plan-intro{margin:6mm 0;border-bottom:1px solid #d9dfd4;padding-bottom:4mm}.generated-plan-intro small,.generated-plan-intro span{display:block}.generated-plan-intro small{font-size:15pt;font-weight:bold}.generated-plan-intro span{font-size:9pt;color:#626b62}blockquote{margin-left:0;border-left:2px solid #a8b4a7;padding-left:4mm}article,section,.generated-plan-copy,.generated-plan-body{height:auto;overflow:visible;break-inside:auto} @media screen{body{max-width:174mm;margin:20px auto;padding:20px}}`;
export function printHtml(html, title) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${xmlEscape(title)}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;
}
