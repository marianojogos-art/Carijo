import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {validateAssessment,assessmentStudentHtml,gradeAssessment} from '../assessment-model.mjs';
import {answerSheetSvg,scanSheet,fingerprint} from '../omr.mjs';
import {printHtml} from '../document-export.mjs';
import {buildWorkbook} from '../sge-workbook.mjs';
import {planSource,sourcePrompt} from '../assessment-source.mjs';
import {rubricScore,suggestedFeedback} from '../written-correction.mjs';
import {usageAlerts} from '../admin-alerts.mjs';
import {createContinuousCapture} from '../camera-capture.mjs';
const nodes=new Map(),memory=new Map(),downloads=[];
class Element {
 constructor(){this.value='';this.textContent='';this.listeners={};this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};}
 set innerHTML(html){this.html=html;this.innerText=html.replace(/<[^>]*>/g,'');for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set('#'+match[1],new Element());}
 get innerHTML(){return this.html||'';}
 querySelector(s){return nodes.get(s)||new Element();}querySelectorAll(){return [];}
 append(){}prepend(){}before(){}after(){}replaceChildren(){}scrollIntoView(options){this.lastScroll=options;}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}dispatchEvent(event){this.listeners[event.type]?.forEach(fn=>fn(event));}
 getContext(){return {drawImage(){},getImageData:()=>({}),translate(){},rotate(){},setTransform(){}}}remove(){}showModal(){}close(){}
 set id(value){this.elementId=value;nodes.set('#'+value,this);}get id(){return this.elementId;}
 async play(){}
 click(){if(this.download)downloads.push({name:this.download,href:this.href});this.onclick?.();}
 setAttribute(){}
}
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set('#'+match[1],new Element());nodes.set('main',new Element());nodes.set('.steps',new Element());nodes.set('#activityBuilder .generate-row',new Element());
const document={querySelector:s=>nodes.get(s),createElement:()=>new Element(),head:new Element(),body:new Element(),addEventListener(){}};
nodes.set('#activityBuilder .form-flow',new Element());nodes.set('.result-actions',new Element());
let saved=0;
let sourceRecords=[];
const assessment={title:'Avaliação de adição',instructions:'Leia.',teacherNotes:'Uso do professor',accessibility:'Leitura mediada',questions:[{type:'multiple_choice',prompt:'2 + 2?',options:['3','4'],correctIndex:1,expectedAnswer:'4',skill:'Adição',difficulty:'easy',points:1,rubric:[]}]};
const context=vm.createContext({document,window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},crypto:webcrypto,Event,structuredClone,console,setTimeout,clearTimeout,setInterval:()=>0,rubricScore,suggestedFeedback,usageAlerts,printDocument(){},MutationObserver:class{observe(){}},validateAssessment,assessmentStudentHtml,gradeAssessment,answerSheetSvg,scanSheet,fingerprint,printHtml,buildWorkbook,rosterFromWorkbook(){},recognizeLocalText(){},escapeHtml:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),$:s=>nodes.get(s),toast(){},state:{classes:[{id:1,name:'5º A',subject:'Matemática'}]},currentActivityText:'',generationInProgress:false,activityPrompt:()=> 'Pedido curricular',confirmGeneration:async()=>true,invokeFreeGeneration:async(_prompt,type,options)=>{assert.equal(type,'activity');assert.equal(options.outputFormat,'assessment');return {data:{assessment,usage:{}},error:null};},notifyGenerationUsage(){},supabaseClient:{auth:{onAuthStateChange(){}}},SUPABASE_URL:'https://test.invalid',showScreen(){}});
context.window.CarijoEditor={generated(){saved++;}};context.createContinuousCapture=createContinuousCapture;
Object.assign(context,{planSource,sourcePrompt,readDeviceDocuments:()=>sourceRecords,skillsForActivity:()=>context.window.CarijoAssessments.sourceSkills()||[],skillKey:s=>s.id||s.code,state:{classes:[{id:1,name:'5º A',subject:'Matemática'}],activitySkills:new Set()},openActivityBuilder(){context.window.CarijoAssessments.clearSource();},syncActivityGrade(){nodes.get('#activityGrade').value='5';},renderActivitySkills(){},renderActivityProfileSummary(){}});
for(const name of ['assessment-ui.mjs','correction-ui.mjs','admin-ui.mjs']){
 const source=readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export (function|async function)/g,'$1');
 if(name==='assessment-ui.mjs')vm.runInContext('(()=>{'+source+'})()',context);
 else {context.library=context.window.CarijoAssessments.library;context.printSheets=context.window.CarijoAssessments.printSheets;vm.runInContext('(()=>{'+source+'})()',context);}
}
nodes.get('#assessmentMaximum').value='10';nodes.get('#activityClassSelect').value='1';nodes.get('#activityQuarter').value='2';nodes.get('#activityType').value='formative';
await context.window.CarijoAssessments.generate();assert.equal(saved,1);assert.equal(context.window.CarijoAssessments.current().questions.length,1);assert.equal(context.window.CarijoAssessments.current().approved,false);assert(context.window.CarijoCorrections.open);assert.equal(context.generationInProgress,false);assert(!nodes.get('#activityAIText').innerHTML.includes('Uso do professor'));
const old={...structuredClone(context.window.CarijoAssessments.current()),approved:true};
context.window.CarijoAssessments.restoreVersion(old);
assert.equal(context.window.CarijoAssessments.current().approved,false,'Restored keys require approval');
assert.notEqual(context.window.CarijoAssessments.current().id,old.id,'Old sheets cannot silently become valid');
context.window.CarijoAssessments.restoreVersion(null);
assert.equal(context.window.CarijoAssessments.current(),null,'Legacy text versions must not inherit current key');
context.window.CarijoAssessments.restore(old);
sourceRecords=[{id:'local-source',class_id:1,class_name:'5º A',subject:'Matemática',title:'Frações',plan_type:'quarter',plan_data:{documentText:'Objetivos: comparar frações. Conteúdos: frações em receitas.',versions:[{id:'source-v1'}],generationContext:{quarter:3,duration:45,skillRecords:[{id:'no-code',code:'',text:'Comparar estratégias pessoais.'}],resources:['Materiais impressos'],classroomContext:'Leitura mediada'}}}];
nodes.get('#assessmentSourcePlan').value='local-source';nodes.get('#activityDuration').options=[{value:'45'}];nodes.get('#activityResource').options=[{value:'Materiais impressos'}];
nodes.get('#useAssessmentSource').onclick();assert.equal(nodes.get('#activityQuarter').value,'3');assert.equal(nodes.get('#assessmentContext').value,'Leitura mediada');assert(context.state.activitySkills.has('no-code'));
nodes.get('#assessmentSourceScope').value='Somente frações em receitas';
context.invokeFreeGeneration=async prompt=>{assert(prompt.includes('frações em receitas'));assert(prompt.includes('Somente frações em receitas'));return {data:{assessment,usage:{}}};};
await context.window.CarijoAssessments.generate();
assert.equal(context.window.CarijoAssessments.current().sourcePlan.versionId,'source-v1');assert.equal(context.window.CarijoAssessments.current().sourcePlan.selectedSkills[0].code,'');
context.renderActivityClassOptions=()=>{};
const linked=structuredClone(context.window.CarijoAssessments.current());
context.window.CarijoAssessments.restoreVersion(linked);
assert.equal(context.window.CarijoAssessments.current().sourcePlan.versionId,'source-v1');assert(context.state.activitySkills.has('no-code'));assert.equal(context.window.CarijoAssessments.current().approved,false);
nodes.get('#activityQuarter').dispatchEvent(new Event('change'));assert.equal(context.window.CarijoAssessments.sourceSkills(),null,'Changing the recorte removes stale planning context');
nodes.get('#rosterGroup').value='123';nodes.get('#rosterText').value='001;Maria';nodes.get('#rosterApply').onclick();
nodes.get('#rosterGroup').value='456';nodes.get('#rosterText').value='002;João';nodes.get('#rosterApply').onclick();
assert(nodes.get('#correctionStudent').innerHTML.includes('João'));assert(!nodes.get('#correctionStudent').innerHTML.includes('Maria'));
nodes.get('#correctionGroup').onchange({target:{value:'123'}});assert(nodes.get('#correctionStudent').innerHTML.includes('Maria'));assert(!nodes.get('#correctionStudent').innerHTML.includes('João'));
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).roster.length,2);
const cameraAssessment={...assessment,id:'auto-camera',approved:true,maximum:10};context.window.CarijoAssessments.restore(cameraAssessment);
nodes.get('#correctionAssessment').value='auto-camera';nodes.get('#correctionAssessment').onchange();
const timers=new Map();let timerId=0,time=0,stopped=0;
context.setTimeout=fn=>{timers.set(++timerId,fn);return timerId;};context.clearTimeout=id=>timers.delete(id);
context.Date=class extends Date{static now(){return time;}};
context.navigator={mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}};
context.scanSheet=()=>({student:1,bits:Array(96).fill(0),corners:[[40,40],[760,40],[760,330],[40,330]],answers:[{id:'q1',answer:1,state:'read'}]});context.decodeCard=()=>1;
nodes.get('#correctionVideo').videoWidth=800;nodes.get('#correctionVideo').videoHeight=370;
await nodes.get('#cameraStart').onclick();assert.equal(nodes.get('#cameraViewport').lastScroll.block,'center');
const scannerBeforeFailure=context.scanSheet;context.scanSheet=()=>{throw new Error('Esta folha não corresponde à avaliação e ao gabarito atuais. Selecione a avaliação correta.');};
{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
assert(nodes.get('#cameraStatus').textContent.includes('Selecione a avaliação correta'),'A câmera deve explicar o motivo da falha');
assert.equal(timers.size,1,'Uma falha de reconhecimento não pode interromper a leitura automática');context.scanSheet=scannerBeforeFailure;
for(time=350;time<=1050;time+=350){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
assert.equal(stopped,0,'A leitura mantém a câmera aberta');assert.equal(timers.size,1);
assert(nodes.get('#cameraResultIdentity').textContent.includes('Maria'));assert(nodes.get('#cameraResultScore').textContent.includes('10 / 10'));
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).readings.length,1);
for(time=1400;time<=4200;time+=350){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).readings.length,1,'A mesma folha não se repete');
const firstScanner=context.scanSheet;context.scanSheet=()=>({...firstScanner(),student:0});context.decodeCard=()=>0;
for(time=4550;time<=5250;time+=350){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).readings.length,2,'A próxima folha fica guardada sem apagar a primeira');
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).readings[0].name,'Maria');
assert.equal(stopped,0);context.scanSheet=firstScanner;context.decodeCard=()=>1;
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).results.length,0,'Reading must not silently save a grade');
let resolvePermission;context.navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{resolvePermission=resolve;});
const pendingCamera=nodes.get('#cameraStart').onclick();nodes.get('#cameraStop').onclick();resolvePermission({getTracks:()=>[{stop(){stopped++;}}]});await pendingCamera;
assert.equal(stopped,2,'A late camera permission cannot restart a stopped session');assert.equal(timers.size,0);
assert.equal(nodes.get('#readSheet').disabled,true,'Sem foto, a leitura fica indisponível');
context.createImageBitmap=async()=>({width:800,height:370,close(){}});
const photoField=nodes.get('#correctionPhoto');photoField.files=[{size:1000,type:'image/png'}];photoField.value='photo.png';
await photoField.onchange({target:photoField});
assert.equal(photoField.value,'','A mesma imagem pode ser escolhida novamente');
assert.equal(nodes.get('#cameraResult').classList.contains('hidden'),false,'Foto carregada deve ser lida automaticamente com gabarito aprovado');
assert(nodes.get('#cameraResultIdentity').textContent.includes('Maria'));assert.equal(nodes.get('#readSheet').disabled,false);
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).results.length,0,'Carregar foto não salva notas automaticamente');
context.window.CarijoAssessments.restore({...cameraAssessment,approved:false});nodes.get('#correctionAssessment').value='auto-camera';nodes.get('#correctionAssessment').onchange();
assert.equal(nodes.get('#readSheet').disabled,false,'Uma foto não pode ficar com botão morto quando falta aprovar o gabarito');
assert(nodes.get('#correctionKeyHelp').textContent.includes('confira e aprove'));
nodes.get('#readSheet').onclick();assert(nodes.get('#cameraStatus').textContent.includes('aprove'));
nodes.get('#correctionReviewKey').onclick();nodes.get('#approveAssessment').onchange({target:{checked:true}});
context.window.CarijoCorrections.open('auto-camera');
assert.equal(nodes.get('#cameraResult').classList.contains('hidden'),false,'A foto deve ser relida após revisar, aprovar e retornar à correção');
nodes.get('#rotatePhoto').onclick();assert.equal(nodes.get('#cameraResult').classList.contains('hidden'),true,'Girar invalida a prévia anterior');
let resolveImage;context.createImageBitmap=()=>new Promise(resolve=>resolveImage=resolve);
const pendingPhoto=photoField.onchange({target:photoField});nodes.get('#cameraStop').onclick();let imageClosed=false;resolveImage({width:800,height:370,close(){imageClosed=true;}});await pendingPhoto;
assert.equal(imageClosed,true,'Uma foto atrasada é descartada ao mudar a sessão');
context.confirm=()=>true;nodes.get('#clearScanPhoto').onclick();assert.equal(nodes.get('#correctionCanvas').hidden,true);assert.equal(nodes.get('#readSheet').disabled,true);assert.equal(nodes.get('#scanEmpty').hidden,false);
// Reproduce the user's path: an anonymous sheet has a calculated grade, but
// assigning a student and confirming it must precede exporting that grade.
context.createImageBitmap=async()=>({width:800,height:370,close(){}});
context.scanSheet=()=>({...firstScanner(),student:0});context.decodeCard=()=>0;
await photoField.onchange({target:photoField});
nodes.get('#saveCorrection').onclick();
assert(nodes.get('#correctionActionMessage').textContent.includes('Escolha o estudante'),'An unmet requirement must be reported beside the clicked button');
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).results.length,0);
nodes.get('#exportGrades').onclick();assert(nodes.get('#gradeExportMessage').textContent.includes('Confirmar e guardar correção'));
nodes.get('#reviewStudentSelect').onchange({target:{value:'1'}});
assert(nodes.get('#correctionScore').textContent.includes('10 / 10'),'Assigning an anonymous sheet must preserve its answers');
nodes.get('#saveCorrection').onclick();
const confirmed=JSON.parse(memory.get('carijo-corrections-local-v1')).results;
assert.equal(confirmed.length,1);assert.equal(confirmed[0].name,'Maria');assert.equal(confirmed[0].score,10);
assert(nodes.get('#correctionResults').innerHTML.includes('Maria'));assert(nodes.get('#correctionActionMessage').textContent.includes('confirmada e guardada'));
let feedbackHtml='';context.printDocument=html=>{feedbackHtml=html;};nodes.get('#printCorrectionFeedback').onclick();
assert(feedbackHtml.includes('Questão 1'));assert(feedbackHtml.includes('Resposta do estudante: B'));assert(feedbackHtml.includes('Nota: 10 / 10'));
nodes.get('#gradeTurma').value='123';nodes.get('#gradeId').value='1';nodes.get('#gradeDate').value='';nodes.get('#gradeWeight').value='1';nodes.get('#gradeType').value='Prova';nodes.get('#gradeQuarter').value='1';
nodes.get('#exportGrades').onclick();assert(nodes.get('#gradeExportMessage').textContent.includes('data da avaliação'));
let exportBlob;context.Blob=Blob;context.URL={createObjectURL(blob){exportBlob=blob;return 'blob:test-export';},revokeObjectURL(){}};
nodes.get('#gradeDate').value='2026-10-06';context.confirm=()=>{throw new Error('The explicit download action must not depend on an extra browser confirmation');};
nodes.get('#exportGrades').onclick();assert.equal(downloads.length,1);assert.equal(downloads[0].name,'Carijo_notas_T123_2026-10-06.xlsx');
const exported=new TextDecoder().decode(await exportBlob.arrayBuffer());assert(exported.includes('Maria'));assert(!exported.includes('João'));
assert(nodes.get('#gradeExportMessage').textContent.includes('1 nota(s)'));
await photoField.onchange({target:photoField});nodes.get('#reviewRegistration').value='003';nodes.get('#reviewName').value='Ana';nodes.get('#reviewAddStudent').onclick();
assert(nodes.get('#reviewStudentHelp').textContent.includes('Ana'));assert(nodes.get('#correctionScore').textContent.includes('10 / 10'),'Quick registration must preserve the photographed answers');
const originalWrite=context.localStorage.setItem;context.localStorage.setItem=()=>{throw new Error('QuotaExceededError');};nodes.get('#saveCorrection').onclick();
assert(nodes.get('#correctionActionMessage').textContent.includes('leitura está preservada'));
assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).results.length,1,'A failed write must not create an apparent saved grade');
context.localStorage.setItem=originalWrite;nodes.get('#saveCorrection').onclick();assert.equal(JSON.parse(memory.get('carijo-corrections-local-v1')).results.length,2,'Retry after storage recovery must save the preserved reading');
console.log('Leitura, identificação, confirmação, devolutiva e download da planilha verificados com DOM simulado.');
