import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as backup from '../backup-data.mjs';

const classA = {id:1,name:'Turma sintética A',subject:'Teste',lessons:2,schedule:['Seg 08:00'],notes:'Fixture sem dados pessoais'};
const documentA = index => ({id:`local-synthetic-${index}`,class_id:1,class_name:classA.name,subject:'Teste',plan_type:['quarter','fortnight','activity'][index%3],title:`Documento sintético ${index}`,period_label:'Teste',created_at:'2026-10-15T00:00:00.000Z',updated_at:'2026-10-15T00:00:00.000Z',document_html:`<p>${'Conteúdo de teste. '.repeat(400)}</p>`,plan_data:{documentText:'Texto sintético',generationContext:{skills:['TEST']},versions:[{id:`version-${index}`,html:`<p>${'Versão sintética. '.repeat(400)}</p>`,text:'Versão sintética',at:'2026-10-15T00:00:00.000Z'}],...(index%3===2?{assessment:{title:'Instrumento sintético',questions:[]}}:{})}});
const payload = {version:1,classes:[classA],skills:['TEST'],planType:'quarter',documents:Array.from({length:240},(_,index)=>documentA(index))};
const serialized = JSON.stringify(payload);
assert(new Blob([serialized]).size>2*1024*1024);assert(new Blob([serialized]).size<backup.MAX_BACKUP_BYTES);
const original = JSON.stringify(payload);
const empty = {classes:[],documents:[],skills:[],planType:'fortnight',sanitize:value=>value};
const restored = backup.prepareRestore(payload,empty);
assert.equal(restored.documents.length,240);assert.equal(restored.counts.added,240);assert.equal(JSON.stringify(payload),original,'Validation and preparation cannot mutate the source');
assert.deepEqual(restored.documents[239].plan_data.versions,payload.documents[239].plan_data.versions);
assert.deepEqual(restored.documents[239].plan_data.assessment,payload.documents[239].plan_data.assessment);
const repeated = backup.prepareRestore(payload,{...restored,sanitize:value=>value});
assert.equal(repeated.counts.added,0);assert.equal(repeated.counts.duplicates,240);assert.equal(repeated.documents.length,240);
const roundtrip = backup.prepareRestore(JSON.parse(JSON.stringify({version:1,...restored})),empty);
assert.equal(roundtrip.documents.length,240);assert.deepEqual(roundtrip.documents,restored.documents);
const collision = backup.prepareRestore({version:1,classes:[{...classA,name:'Outra turma sintética'}],documents:[{...documentA(0),document_html:'<p>Outra versão</p>'}]},{...restored,sanitize:value=>value});
assert.equal(collision.classes.length,2);assert.equal(collision.documents.length,241);assert.equal(collision.documents[0].class_id,2);assert.notEqual(collision.documents[0].id,restored.documents[0].id);assert.equal(collision.counts.conflicts,1);
const twice = backup.prepareRestore({version:1,classes:[classA],documents:[documentA(0),documentA(0)]},empty);
assert.equal(twice.counts.added,1);assert.equal(twice.counts.duplicates,1);
const legacy = {classes:[classA],documents:[{plan_type:'quarter',document_html:'<p>Sem identidade antiga</p>'}]};
const legacyFirst = backup.prepareRestore(legacy,empty);assert.equal(backup.prepareRestore(legacy,legacyFirst).counts.added,0);
for(const invalid of [null,[],{...payload,version:99},{...payload,documents:{}},{...payload,classes:[classA,classA]},{...payload,skills:[5]},{...payload,documents:[...payload.documents,{plan_type:'quarter',document_html:4}]},{...payload,documents:[{...documentA(1),created_at:'not a date'}]},{...payload,documents:[{...documentA(1),plan_data:{versions:[{html:42}]}}]}]) assert.throws(()=>backup.prepareRestore(invalid,empty));
assert.throws(()=>backup.prepareRestore({...payload,ownerId:'other'},{...empty,ownerId:'owner'}),/outra conta/);
const sanitized = backup.prepareRestore({classes:[classA],documents:[{...documentA(1),document_html:'<bad>',plan_data:{cloudId:'remote-id',cloudOwner:'owner',versions:[{html:'<bad>'}]}}]},{...empty,sanitize:value=>value.replaceAll('<bad>','SAFE')});
assert.equal(sanitized.documents[0].document_html,'SAFE');assert.equal(sanitized.documents[0].plan_data.versions[0].html,'SAFE');assert.equal(sanitized.documents[0].plan_data.cloudId,null);

// Exercise the actual app handlers with isolated in-memory storage and DOM.
const nodes=new Map(),storage=new Map(),downloads=[];let writeNumber=0,failWrite=()=>false;
const document={addEventListener(){},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',disabled:false,hidden:true,attributes:{},setAttribute(key,value){this.attributes[key]=value;}});return nodes.get(selector);},querySelectorAll(){return [];}};
const localStorage={getItem:key=>storage.get(key)??null,setItem(key,value){writeNumber++;if(failWrite(key,writeNumber))throw new Error('Synthetic storage failure');storage.set(key,value);},removeItem(key){storage.delete(key);}};
const context=vm.createContext({window:{},document,localStorage,crypto:webcrypto,Blob,console,location:{protocol:'http:',origin:'http://localhost',pathname:'/'},tools:backup,downloads,structuredClone});
vm.runInContext(fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),context);
const run=code=>vm.runInContext(code,context);
run(`loadBackupTools=async()=>tools;sanitizeDocumentHtml=value=>value;renderManualStart=()=>{};renderSchedule=()=>{};renderSkills=()=>{};updateStorageStatus=()=>{};downloadBackup=(payload,name)=>downloads.push({payload:structuredClone(payload),name});`);
const settingsKey='carijo-professor-data-v1',documentsKey='carijo-device-documents-v1';
const stateSnapshot=()=>run('JSON.stringify({classes:state.classes,skills:[...state.skills],planType:state.planType})');
async function importFile(data,options={}){
 const value=typeof data==='string'?data:JSON.stringify(data);
 context.event={target:{value:'backup.json',files:[{size:new Blob([value]).size,text:async()=>value,...options}]}};
 await run('importLocalData(event)');assert.equal(context.event.target.value,'');assert.equal(context.event.target.disabled,false);
}
await importFile(payload);assert.equal(JSON.parse(storage.get(documentsKey)).length,240);assert.match(nodes.get('#backupStatus').textContent,/240 adicionado/);
await run('exportLocalData()');assert.equal(downloads.at(-1).payload.documents.length,240);assert(new Blob([JSON.stringify(downloads.at(-1).payload)]).size>2*1024*1024);
const exported=downloads.at(-1).payload;
storage.clear();run('state.classes=[];state.skills=new Set();state.planType="fortnight";');
await importFile(exported);assert.deepEqual(JSON.parse(storage.get(documentsKey)),exported.documents);
await importFile(exported);assert.match(nodes.get('#backupStatus').textContent,/0 adicionado\(s\), 240 já existente/);
const beforeState=stateSnapshot(),beforeStorage=new Map(storage);
for(const invalid of ['{bad JSON',JSON.stringify({...payload,documents:[...payload.documents,{document_html:7}]})]){
 await importFile(invalid);assert.deepEqual(storage,beforeStorage);assert.equal(stateSnapshot(),beforeState);assert.equal(nodes.get('#backupStatus').attributes.role,'alert');
}
let readOversize=false;await importFile('',{size:backup.MAX_BACKUP_BYTES+1,text:async()=>{readOversize=true;return serialized;}});assert.equal(readOversize,false);assert.match(nodes.get('#backupStatus').textContent,/20 MiB/);
for(const failAt of [1,2]){
 writeNumber=0;failWrite=(_key,count)=>count===failAt;
 await importFile({...payload,classes:[{...classA,name:'Nova turma'}],documents:[{...documentA(500),document_html:'Novo texto'}]});
 assert.deepEqual(storage,beforeStorage,`Write ${failAt} failure must roll back all keys`);assert.equal(stateSnapshot(),beforeState);assert.match(nodes.get('#backupStatus').textContent,/desfeita/);
}
failWrite=()=>false;
// A browser that stops accepting rollback writes must surface recovery, not success.
writeNumber=0;failWrite=(_key,count)=>count>=2;
await importFile({...payload,documents:[documentA(600)]});
assert.equal(stateSnapshot(),beforeState);assert.equal(nodes.get('#downloadBackupRecovery').hidden,false);
run('downloadBackupRecovery()');assert.deepEqual(downloads.at(-1).payload,{settings:beforeStorage.get(settingsKey),documents:beforeStorage.get(documentsKey)});
failWrite=()=>false;storage.clear();for(const [key,value] of beforeStorage)storage.set(key,value);
const fresh=new Map();let attempts=0;
assert.throws(()=>backup.commitRestore({getItem:key=>fresh.get(key)??null,setItem(key,value){if(++attempts===2)throw new Error('quota');fresh.set(key,value);},removeItem:key=>fresh.delete(key)},'settings','documents',{},[]),/desfeita/);
assert.equal(fresh.size,0,'Rollback restores absent keys, too');
// Export must report corrupt local data, never silently download an empty history.
storage.set(documentsKey,'{broken');const downloadCount=downloads.length;await run('exportLocalData()');assert.equal(downloads.length,downloadCount);assert.match(nodes.get('#backupStatus').textContent,/ilegível/);storage.set(documentsKey,beforeStorage.get(documentsKey));
// Account changes while the file is read cannot overwrite another user's data.
let finish;context.event={target:{value:'file',files:[{size:100,text:()=>new Promise(resolve=>finish=resolve)}]}};
const pending=run('importLocalData(event)');await new Promise(resolve=>setImmediate(resolve));run('currentUser={id:"another"}');finish(serialized);await pending;assert.deepEqual(storage,beforeStorage);assert.match(nodes.get('#backupStatus').textContent,/conta mudou/);run('currentUser=null');
console.log('Backups: roundtrip de 240 documentos >2 MiB, versões, duplicatas, conflitos, invalidação completa, quotas/rollback, conta e exportação sem perda verificados.');
