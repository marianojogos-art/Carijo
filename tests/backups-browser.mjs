import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer(async(req,res)=>{
  try {
    const route=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,route==='/'?'index.html':'.'+route);
    if(!file.startsWith(root)||!['.html','.js','.mjs','.css','.json','.webp'].includes(path.extname(file)))throw new Error('not found');
    const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'};
    res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin);await page.waitForFunction(()=>typeof window.openDataModal==='function');
  await page.evaluate(()=>openDataModal());
  const payload={version:1,classes:[{id:1,name:'Turma sintética',subject:'Teste',lessons:2,schedule:[]}],skills:['TEST'],planType:'quarter',documents:Array.from({length:230},(_,index)=>({id:`local-browser-${index}`,class_id:1,title:`Teste ${index}`,plan_type:'quarter',document_html:`<p>${'Conteúdo sintético. '.repeat(300)}</p><img src=x onerror="window.backupXSS=true">`,plan_data:{versions:[{id:`v-${index}`,html:`<p>${'Versão sintética. '.repeat(300)}</p>`,text:'Teste'}]}}))};
  const bytes=Buffer.from(JSON.stringify(payload));assert(bytes.length>2*1024*1024);
  const upload=buffer=>page.locator('#importData').setInputFiles({name:'backup-sintetico.json',mimeType:'application/json',buffer});
  await upload(bytes);await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('Restauração concluída'));
  const result=await page.evaluate(()=>({documents:JSON.parse(localStorage.getItem('carijo-device-documents-v1')),xss:window.backupXSS||false}));
  assert.equal(result.documents.length,230);assert.equal(result.xss,false);assert(!result.documents[0].document_html.includes('<img'));assert.equal(result.documents[229].plan_data.versions.length,1);
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportData').click();const download=await downloadPromise;
  const exported=await readFile(await download.path());assert.equal(JSON.parse(exported).documents.length,230);
  await upload(exported);await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('230 já existente'));
  await upload(Buffer.from(JSON.stringify({...payload,documents:[payload.documents[0],{plan_type:'quarter',document_html:42}]})));
  await page.waitForFunction(()=>document.querySelector('#backupStatus').getAttribute('role')==='alert');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('carijo-device-documents-v1')).length),230);
  await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='carijo-professor-data-v1')throw new DOMException('Synthetic quota','QuotaExceededError');return window.originalSet.call(this,key,value);};});
  await upload(Buffer.from(JSON.stringify({...payload,documents:[{...payload.documents[0],id:'local-new',document_html:'<p>Novo</p>'}]})));
  await page.waitForFunction(()=>document.querySelector('#backupStatus').textContent.includes('desfeita'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('carijo-device-documents-v1')).length),230);
  assert.deepEqual(errors,[]);
  console.log('Backup no Chromium: página real, upload/exportação >2 MiB com 230 documentos, versões, sanitização HTML, reimportação, erro completo e rollback de quota; rede externa bloqueada.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
