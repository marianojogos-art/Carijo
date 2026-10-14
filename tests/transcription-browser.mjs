// Optional browser integration: use installed playwright-core and Chromium.
// Every image, response and student below is synthetic. All external requests fail.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=fileURLToPath(new URL('../',import.meta.url));
const fixture={id:'synthetic',title:'Teste sintético de transcrição',approved:true,maximum:10,questions:[{id:'q1',type:'open',prompt:'Resposta sintética para conferir.',points:2,expectedAnswer:'Critério sintético',rubric:[{criterion:'Conferência',description:'Teste',points:2}]}]};
const initial={roster:[{registration:'TEST-001',name:'Estudante sintético',machineId:1,groups:['TESTE']}],results:[],drafts:{},readings:[]};
const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/editorial.css"><main></main><script>
window.$=s=>document.querySelector(s);window.escapeHtml=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');window.showScreen=id=>document.getElementById(id).classList.add('active');
localStorage.setItem('carijo-corrections-local-v1',${JSON.stringify(JSON.stringify(initial))});
window.fixture=${JSON.stringify(fixture)};window.mode='success';window.terminated=0;
window.ocrText='01) A\\n02)  1,50 + 002 = 3,50\\n03)\\n04) não sei\\n';
window.Tesseract={createWorker:async(lang,mode,options)=>({recognize:async()=>{options.logger({status:'recognizing text',progress:.42});if(window.mode==='error')throw new Error('Mock error');if(window.mode==='pending')return new Promise(resolve=>window.finishOCR=resolve);return {data:{text:window.mode==='empty'?'':window.ocrText,words:[{text:'002',confidence:35}]}};},terminate:async()=>window.terminated++})};
</script><script type="module">import '/correction-ui.mjs';window.CarijoCorrections.open('synthetic');window.ready=true;</script></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  const route=new URL(req.url,'http://localhost').pathname;
  if(route==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  res.setHeader('Content-Type',route.endsWith('.css')?'text/css':'text/javascript');
  if(route==='/assessment-ui.mjs'){res.end('export const library=()=>[window.fixture];export const printSheets=()=>{};export const printDocument=()=>{};');return;}
  const target=path.resolve(root,'.'+route);if(!target.startsWith(root)||!['.mjs','.css'].includes(path.extname(target)))throw new Error('Not found');
  res.end(await readFile(target));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1365,height:1000}}),page=await context.newPage(),errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(origin);await page.waitForFunction(()=>window.ready);
 const $=s=>page.locator(s),raw=await page.evaluate(()=>window.ocrText);
 await $('#correctionStudent').selectOption('1');await $('.transcription-review > summary').click();
 await $('.question-editor > summary').click();
 // Synthetic PNG generated locally in the browser; no uploaded student photo.
 const png=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=650;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#222';ctx.font='30px monospace';['FOLHA SINTÉTICA — TESTE',...window.ocrText.split('\n')].forEach((line,i)=>ctx.fillText(line,40,60+i*75));return c.toDataURL('image/png').split(',')[1];}),'base64');
 const upload=()=>$('#transcriptPhoto').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
 await upload();await page.waitForFunction(()=>!document.querySelector('#readWrittenText').disabled);
 assert.equal(await $('#correctionStudent').inputValue(),'1');
 assert.equal(await $('[data-transcript]').isDisabled(),true);
 await $('#readWrittenText').click();await page.waitForFunction(()=>document.querySelector('#ocrProgress').textContent.includes('concluída'));
 assert.equal(await $('#writtenTranscript').inputValue(),raw);assert.match(await $('#transcriptWarnings').textContent(),/002/);
 assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('carijo-corrections-local-v1')).drafts).length),1); // empty selection draft only
 assert.equal(await page.evaluate(()=>localStorage.getItem('carijo-corrections-local-v1').includes('1,50')),false,'Unreviewed OCR cannot persist');
 await $('#transcriptReviewed').check();assert.equal(await $('[data-transcript]').isDisabled(),false);
 await $('[data-transcript]').click();await $('.question-editor > summary').click();
 assert.equal(await $('[data-written][data-field=text]').inputValue(),raw);
 assert.equal(await $('[data-criterion]').inputValue(),'','Transcription never assigns points');
 await $('[data-written][data-field=text]').fill(raw+'[ilegível]');
 assert.equal(await $('[data-written-review]').isChecked(),false);assert.equal(await $('[data-criterion]').isDisabled(),true);
 await $('#saveCorrection').click();assert.match(await $('#correctionActionMessage').textContent(),/Confira novamente/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('carijo-corrections-local-v1')).results.length),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('carijo-corrections-local-v1').includes('[ilegível]')),false);
 await $('[data-written-review]').check();await $('.question-editor > summary').click();assert.equal(await $('[data-criterion]').isDisabled(),false);
 // Human edits require a fresh review, and replacement is explicitly cancellable.
 await $('#writtenTranscript').fill('Texto manual 007\n');assert.equal(await $('[data-transcript]').isDisabled(),true);
 page.once('dialog',dialog=>dialog.dismiss());await $('#readWrittenText').click();assert.equal(await $('#writtenTranscript').inputValue(),'Texto manual 007\n');
 await page.evaluate(()=>window.mode='error');page.once('dialog',dialog=>dialog.accept());await $('#readWrittenText').click();
 await page.waitForFunction(()=>document.querySelector('#ocrProgress').getAttribute('role')==='alert');assert.equal(await $('#writtenTranscript').inputValue(),'Texto manual 007\n');
 assert.equal(await $('#writtenTranscript').isDisabled(),false);
 // Invalid replacement image keeps the previous image and edited text.
 page.once('dialog',dialog=>dialog.accept());await $('#transcriptPhoto').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not a PNG')});
 await page.waitForFunction(()=>document.querySelector('#ocrProgress').getAttribute('role')==='alert');
 assert.equal(await $('#writtenTranscript').inputValue(),'Texto manual 007\n');assert.equal(await $('#transcriptCanvas').isVisible(),true);
 // A late recognition must not overwrite another student/context.
 await page.evaluate(()=>window.mode='pending');page.once('dialog',dialog=>dialog.accept());await $('#readWrittenText').click();await page.waitForFunction(()=>typeof window.finishOCR==='function');
 assert.equal(await $('#writtenTranscript').isDisabled(),true);await $('#cancelTranscript').click();assert.equal(await $('#writtenTranscript').isDisabled(),false);
 await page.evaluate(()=>window.finishOCR({data:{text:'STALE',words:[]}}));assert.equal(await $('#writtenTranscript').inputValue(),'Texto manual 007\n');
 page.once('dialog',dialog=>dialog.accept());await $('#readWrittenText').click();
 await $('#correctionStudent').selectOption('');await page.evaluate(()=>window.finishOCR({data:{text:'OUTRO CONTEXTO',words:[]}}));
 assert.equal(await $('#writtenTranscript').inputValue(),'');assert.equal(await $('#transcriptCanvas').isVisible(),false);
 await upload();await page.waitForFunction(()=>!document.querySelector('#readWrittenText').disabled);
 await page.evaluate(()=>window.mode='empty');await $('#readWrittenText').click();await page.waitForFunction(()=>document.querySelector('#ocrProgress').textContent.includes('Nenhum texto'));
 assert.equal(await $('#transcriptReviewed').isDisabled(),true);
 await $('#writtenTranscript').fill('05) dúvida');await $('#writtenTranscript').evaluate(el=>el.setSelectionRange(4,10));await $('#markIllegible').click();assert.equal(await $('#writtenTranscript').inputValue(),'05) [ilegível]');
 await $('#transcriptZoom').selectOption('2');assert.equal(await $('#transcriptCanvas').evaluate(el=>el.style.width),'200%');
 const desktop=await $('.transcription-columns').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(desktop,2);
 if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await $('.transcription-review').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'transcription-desktop.png')});}
 await page.setViewportSize({width:390,height:844});assert.equal(await $('.transcription-columns').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile must not overflow horizontally');
 if(process.env.SCREENSHOT_DIR)await $('.transcription-review').screenshot({path:path.join(process.env.SCREENSHOT_DIR,'transcription-mobile.png')});
 // Even a reader that ignores AbortSignal cannot resurrect an old draft.
 const stale=await page.evaluate(async()=>{
  const {createTranscriptionReview}=await import('/transcription-review.mjs');
  const host=document.createElement('details');document.body.append(host);let resolve;
  const review=createTranscriptionReview({host,recognize:()=>new Promise(done=>resolve=done)});
  const source=document.querySelector('#transcriptCanvas');review.setImage(source,source.width,source.height);
  const pending=host.querySelector('#readWrittenText').onclick();review.reset();
  review.setImage(source,source.width,source.height);const text=host.querySelector('#writtenTranscript');text.value='NOVA FOTO 009';text.oninput();
  resolve({text:'RESULTADO ANTIGO',uncertainWords:[],hasConfidence:false});await pending;
  const result={text:text.value,busy:host.getAttribute('aria-busy')};host.remove();return result;
 });
 assert.deepEqual(stale,{text:'NOVA FOTO 009',busy:'false'});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('Navegador: imagem sintética, revisão/associação, bloqueio de gravação, estados, erro, vazio, cancelamento, troca de contexto, zoom e telas desktop/mobile verificados; zero chamadas externas.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
