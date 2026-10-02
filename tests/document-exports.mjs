import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildDocx, exportFilename, printHtml, PRINT_CSS } from '../document-export.mjs';
import { buildWorkbook } from '../sge-workbook.mjs';
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), files = {};
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18,true), nameSize = view.getUint16(offset + 26,true), extra = view.getUint16(offset + 28,true);
    const start = offset + 30 + nameSize + extra;
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameSize));
    files[name] = new TextDecoder().decode(bytes.slice(start,start + size)); offset = start + size;
  }
  assert.equal(view.getUint32(offset,true), 0x02014b50, 'ZIP central directory');
  return files;
}
const doc = unzip(buildDocx([
  {kind:'heading',level:2,runs:[{text:'Educação Física'}]},
  {kind:'p',runs:[{text:'Texto editado & revisado',bold:true},{text:'\nOutra linha',italic:true}]},
  {kind:'list',marker:'1. ',runs:[{text:'Atividade'}]},
  {kind:'table',rows:[[[{kind:'p',runs:[{text:'Célula <segura>'}]}]]]},
  {kind:'p',runs:[{text:'Última aula completa'}]}
], 'Plano & edição'));
assert(doc['word/document.xml'].includes('Última aula completa'));
assert(doc['word/document.xml'].includes('Célula &lt;segura&gt;'));
assert(doc['word/document.xml'].includes('<w:tbl>'));
assert(doc['word/document.xml'].includes('w:bottom="1247"'));
assert(doc['word/document.xml'].includes('<w:sz w:val="34"/>'));
assert(doc['word/styles.xml'].includes('pt-BR'));
assert(doc['docProps/core.xml'].includes('Plano &amp; edição'));
assert(doc['_rels/.rels'].includes('word/document.xml'));
assert.equal(exportFilename({type:'quarter',className:'6º ano',subject:'Educação Física',period:'2º trimestre'},'docx'),'carijo-planejamento-trimestral-6-ano-educacao-fisica-2-trimestre.docx');
assert(PRINT_CSS.includes('margin:18mm 18mm 22mm'));
assert(PRINT_CSS.includes('break-inside:auto'));
assert(printHtml('<p>Fim</p>','Plano <teste>').includes('<title>Plano &lt;teste&gt;</title>'));

let captured;
const elements = Object.fromEntries(['sgeClass','sgeConfirmed','sgeStart','sgeEnd','sgeLessons','sgeFeedback','sgeQuarter'].map(id=>['#'+id,{value:'',checked:false,textContent:''}]));
elements['#sgeClass'].value='071'; elements['#sgeStart'].value='2026-10-01'; elements['#sgeEnd'].value='2026-10-15'; elements['#sgeLessons'].value='6'; elements['#sgeQuarter'].value='2';
const inputs = ['Objetivo','Conteúdo','Método','Recurso','Avaliação'].map(value=>({value}));
const ids = Array.from({length:5},()=>({value:''}));
const code = fs.readFileSync(new URL('../sge-ui.js',import.meta.url),'utf8').replace("const { buildWorkbook } = await import('./sge-workbook.mjs');",'const buildWorkbook = captureWorkbook;');
const ctx = vm.createContext({$: selector=>elements[selector], $$:selector=>selector==='[data-sge-field]'?inputs:ids, document:{addEventListener(){},createElement(){return{click(){}}}},generatedContext:{planType:'fortnight',skills:['Habilidade (EF67EF16)']},Blob,URL:{createObjectURL(){return'blob:test'},revokeObjectURL(){}},setTimeout(){},captureWorkbook(sheets){captured=sheets;return buildWorkbook(sheets);}});
vm.runInContext(code,ctx);
await ctx.downloadSgeWorkbook();
assert(elements['#sgeFeedback'].textContent.includes('confirme a revisão'));
elements['#sgeConfirmed'].checked=true;
await ctx.downloadSgeWorkbook();
let rows = captured[0].rows;
assert.equal(captured[0].name,'Planejamento Quinzenal');
assert.equal(rows[1][1],'071', 'Preserve identifier leading zero');
assert.equal(rows[1][4],6);
assert.equal(rows[1][10],'Habilidade (EF67EF16)');
assert.equal(rows[1][12],'', 'BNCC is not an SGE identifier');
assert.equal(rows[1][17],'Revisar');
assert.equal(rows[0].length,rows[1].length);
const xlsx=unzip(buildWorkbook(captured));
assert(xlsx['xl/worksheets/sheet1.xml'].includes('071'));
ids[0].value='EF67EF16';
await ctx.downloadSgeWorkbook();
assert(elements['#sgeFeedback'].textContent.includes('não códigos BNCC'));
ctx.generatedContext.planType='quarter';
await ctx.downloadSgeWorkbook();
assert.equal(captured[0].name,'Planejamento Trimestral');
assert.equal(captured[0].rows[0].length,9);
console.log('Exports: DOCX package, editable content, table, margins, filenames, printable isolation and SGE schema/confirmation/identifiers passed.');
