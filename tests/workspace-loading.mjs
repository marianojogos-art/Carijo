import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {validateAssessment,assessmentStudentHtml,gradeAssessment} from '../assessment-model.mjs';
import {answerSheetSvg,scanSheet,fingerprint} from '../omr.mjs';
import {printHtml} from '../document-export.mjs';
import {buildWorkbook} from '../sge-workbook.mjs';
import {planSource,sourcePrompt} from '../assessment-source.mjs';
const nodes=new Map(),memory=new Map();
class Element {
 constructor(){this.value='';this.textContent='';this.listeners={};this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};}
 set innerHTML(html){this.html=html;this.innerText=html.replace(/<[^>]*>/g,'');for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set('#'+match[1],new Element());}
 get innerHTML(){return this.html||'';}
 querySelector(s){return nodes.get(s)||new Element();}querySelectorAll(){return [];}
 append(){}prepend(){}before(){}after(){}replaceChildren(){}scrollIntoView(){}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}dispatchEvent(event){this.listeners[event.type]?.forEach(fn=>fn(event));}
 getContext(){return {}}remove(){}showModal(){}close(){}
}
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set('#'+match[1],new Element());nodes.set('main',new Element());nodes.set('.steps',new Element());nodes.set('#activityBuilder .generate-row',new Element());
const document={querySelector:s=>nodes.get(s),createElement:()=>new Element(),head:new Element(),body:new Element(),addEventListener(){}};
nodes.set('#activityBuilder .form-flow',new Element());nodes.set('.result-actions',new Element());
let saved=0;
let sourceRecords=[];
const assessment={title:'Avaliação de adição',instructions:'Leia.',teacherNotes:'Uso do professor',accessibility:'Leitura mediada',questions:[{type:'multiple_choice',prompt:'2 + 2?',options:['3','4'],correctIndex:1,expectedAnswer:'4',skill:'Adição',difficulty:'easy',points:1,rubric:[]}]};
const context=vm.createContext({document,window:{addEventListener(){},dispatchEvent(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},crypto:webcrypto,Event,structuredClone,console,setTimeout,clearTimeout,MutationObserver:class{observe(){}},validateAssessment,assessmentStudentHtml,gradeAssessment,answerSheetSvg,scanSheet,fingerprint,printHtml,buildWorkbook,rosterFromWorkbook(){},recognizeLocalText(){},escapeHtml:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),$:s=>nodes.get(s),toast(){},state:{classes:[{id:1,name:'5º A',subject:'Matemática'}]},currentActivityText:'',generationInProgress:false,activityPrompt:()=> 'Pedido curricular',confirmGeneration:async()=>true,invokeFreeGeneration:async(_prompt,type,options)=>{assert.equal(type,'activity');assert.equal(options.outputFormat,'assessment');return {data:{assessment,usage:{}},error:null};},notifyGenerationUsage(){},supabaseClient:{auth:{onAuthStateChange(){}}},SUPABASE_URL:'https://test.invalid',showScreen(){}});
context.window.CarijoEditor={generated(){saved++;}};
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
console.log('Inicialização dos espaços de avaliação, correção e administração e geração estruturada verificadas com DOM simulado.');
