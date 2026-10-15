// Disposable browser; no user session, external services or paid AI calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);
    if(!file.startsWith(root)||!types[path.extname(file)])throw Error('Not found');
    res.setHeader('Content-Type',types[path.extname(file)]);res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const assessment={id:'synthetic-one',title:'Avaliação sintética',instructions:'Leia.',teacherNotes:'Teste',accessibility:'Leitura mediada',questions:[{id:'q1',type:'multiple_choice',prompt:'2 + 2?',options:['3','4'],correctIndex:1,expectedAnswer:'4',skill:'Adição',difficulty:'easy',points:1,rubric:[]}]};
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
    if(route.request().url().startsWith(origin+'/'))return route.continue();
    const body=route.request().url().includes('supabase-js')?'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};':'';
    return route.fulfill({status:200,contentType:'text/javascript',body});
  });
  await page.goto(origin);await page.locator('#openAssessmentLibrary').waitFor({state:'attached'});

  const cards=await page.locator('.home-action').evaluateAll(nodes=>nodes.map(node=>{
    const style=getComputedStyle(node),icon=getComputedStyle(node.querySelector('.home-action-icon'));
    return {background:style.backgroundColor,border:style.borderColor,icon:icon.backgroundColor};
  }));
  assert.equal(cards.length,4);for(const card of cards)assert.deepEqual(card,cards[0]);

  await page.locator('#authButton').click();await page.locator('#privacyButton').click();
  await page.waitForFunction(()=>document.activeElement.closest('#privacyModal'));
  assert.equal(await page.locator('#dataModal').getAttribute('inert'),'');
  // Shift+Tab wraps within the upper modal rather than jumping behind it.
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.matches('#privacyModal .primary-button')),true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.matches('#privacyModal .modal-close')),true);
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.locator('.modal.open').evaluateAll(nodes=>nodes.map(node=>node.id)),['dataModal']);
  assert.equal(await page.locator('#dataModal').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#privacyButton').evaluate(node=>node===document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#authButton').evaluate(node=>node===document.activeElement),true);

  // A native dialog must keep control of Escape, even above a custom modal.
  await page.locator('#authButton').click();
  await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='syntheticDialog';dialog.innerHTML='<button>Fechar</button>';document.body.append(dialog);dialog.showModal();});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#syntheticDialog').getAttribute('open'),null);
  assert.equal(await page.locator('#dataModal').getAttribute('aria-hidden'),'false');
  await page.keyboard.press('Escape');

  // Closing a lower modal must neither steal focus nor strand the upper modal.
  await page.locator('#authButton').click();await page.locator('#privacyButton').click();
  await page.waitForFunction(()=>document.activeElement.closest('#privacyModal'));
  await page.evaluate(()=>closeDataModal());
  assert.equal(await page.evaluate(()=>document.activeElement.closest('#privacyModal')!==null),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.modal.open').count(),0);
  assert.equal(await page.locator('#authButton').evaluate(node=>node===document.activeElement),true);

  await page.locator('#homeDocuments').click();
  assert.equal(await page.locator('.step[aria-current="page"]').getAttribute('id'),'historyNavButton');
  assert.equal(await page.locator('.step.complete').count(),0);

  // Verify both pointer and keyboard states meet WCAG AA text contrast.
  const admin=page.locator('.admin-nav');await admin.hover();
  async function contrast(){return admin.evaluate(node=>{
    const s=getComputedStyle(node),rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
    const luminance=value=>rgb(value).map(x=>x/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
    const a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  });}
  assert((await contrast())>=4.5);await page.mouse.move(800,40);await page.keyboard.press('Tab');await admin.focus();assert((await contrast())>=4.5);

  await page.evaluate(()=>showScreen('upload'));
  await page.locator('[data-start=activity]').click();
  await page.locator('#quickSubject').selectOption({label:'Matemática'});
  await page.locator('#quickGrade').selectOption('5');
  await page.locator('#quickLessons').fill('2');await page.locator('#quickContinue').click();
  const library=page.locator('#assessmentLibrary'),open=page.locator('#openAssessmentLibrary');
  await library.locator('..').locator('..').locator('summary').click();
  assert(await library.isDisabled());assert(await open.isDisabled());
  assert((await page.locator('#assessmentLibraryHelp').textContent()).includes('Gere uma avaliação'));
  await page.evaluate(a=>window.CarijoAssessments.restoreLibrary([a]),assessment);
  assert(!(await open.isDisabled()));assert.equal(await library.inputValue(),assessment.id);
  await open.click();assert(await page.locator('#activityOutput').isVisible());
  // A refresh keeps the selected item; removing it updates actions immediately.
  const second={...assessment,id:'synthetic-two',title:'Outra avaliação sintética'};
  await page.evaluate(records=>window.CarijoAssessments.restoreLibrary(records),[assessment,second]);
  await library.selectOption(second.id);
  await page.evaluate(()=>window.dispatchEvent(new Event('carijo-assessments-changed')));
  assert.equal(await library.inputValue(),second.id);
  // Stale selection (e.g. a concurrent removal) provides actionable feedback.
  await page.evaluate(()=>localStorage.removeItem('carijo-assessments-v1'));
  await open.click();assert(await open.isDisabled());
  assert((await page.locator('#assessmentLibraryHelp').textContent()).includes('não está mais disponível'));
  await page.evaluate(a=>window.CarijoAssessments.restoreLibrary([a]),assessment);
  await page.evaluate(()=>{localStorage.removeItem('carijo-assessments-v1');window.dispatchEvent(new StorageEvent('storage',{key:'carijo-assessments-v1'}));});
  assert(await open.isDisabled());

  await page.evaluate(()=>showScreen('upload'));await page.mouse.move(800,40);
  if(process.env.SCREENSHOT_DIR){await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'interface-desktop.png')});}
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.mobile-menu').click();await page.locator('#historyNavButton').click();
  assert.equal(await page.locator('#historyNavButton').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('.mobile-menu').getAttribute('aria-expanded'),'false');
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'interface-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('Interface: cartões uniformes; modais sobrepostos, foco, Tab/Escape e diálogo nativo; histórico ativo; contraste AA; biblioteca vazia, preenchida e desatualizada; menu móvel. Sem serviços externos.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
