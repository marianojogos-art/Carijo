import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const code=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/generate-plan-public/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
const rows=[];let handler,calls=0,task,release,blocked=false;
function query(table){let filters=[],record,mode='read';return {
 select(){return this;},eq(k,v){filters.push(r=>r[k]===v);return this;},lt(k,v){filters.push(r=>r[k]<v);return this;},lte(){return this;},order(){return this;},limit(){return this;},
 insert(value){record=value;mode='insert';return this;},update(value){record=value;mode='update';return this;},
 async single(){if(rows.some(r=>r.client_request_id===record.client_request_id||r.session_key===record.session_key&&r.status==='pending'))return {error:{code:'23505'}};const row={id:webcrypto.randomUUID(),created_at:new Date().toISOString(),...record};rows.push(row);return {data:row,error:null};},
 async maybeSingle(){return {data:table==='carijo_generation_runs'?rows.find(r=>filters.every(f=>f(r)))||null:null,error:null};},
 then(resolve){if(mode==='update')rows.filter(r=>filters.every(f=>f(r))).forEach(r=>Object.assign(r,record));return Promise.resolve({error:null}).then(resolve);}
 };}
const context=vm.createContext({Response,Request,AbortController,DOMException,TextEncoder,crypto:webcrypto,setTimeout,clearTimeout,console,
 Deno:{env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test',OPENAI_API_KEY:'test',OPENAI_MODEL:'test'})[k]},serve:fn=>handler=fn},
 EdgeRuntime:{waitUntil:p=>task=p},createClient:()=>({from:query,auth:{getUser:async()=>({data:{user:null}})}}),
 improvePlan:async(_prompt,text)=>({plan:'Revisado: '+text}),
 fetch:async()=>{calls++;if(blocked)await new Promise(resolve=>release=resolve);return Response.json({output_text:'Documento completo',status:'completed',usage:{input_tokens:10,output_tokens:20}});}
});vm.runInContext(code,context);
const identity={sessionId:webcrypto.randomUUID(),requestId:webcrypto.randomUUID(),recoveryKey:webcrypto.randomUUID()+webcrypto.randomUUID()};
const req=body=>new Request('https://test.invalid',{method:'POST',headers:{Origin:'https://gaviao.carijo.workers.dev','Content-Type':'application/json'},body:JSON.stringify({...identity,...body})});
const body={requestType:'plan',prompt:'Planejamento de matemática, sem dados pessoais. '.repeat(4)};
blocked=true;assert.equal((await handler(req(body))).status,202);while(!release)await new Promise(r=>setTimeout(r,0));
assert.equal((await (await handler(req({action:'status'}))).json()).status,'pending');
assert.equal((await handler(req({...body,prompt:body.prompt+'alterado'}))).status,409);
await handler(req(body));assert.equal(calls,1,'Reenvio pendente não chama IA novamente');
assert.equal((await handler(req({action:'status',recoveryKey:webcrypto.randomUUID()+webcrypto.randomUUID()}))).status,404);
release();await task;
const result=await (await handler(req({action:'status'}))).json();assert.equal(result.status,'succeeded');assert.equal(result.result.plan,'Revisado: Documento completo');
assert.equal(rows[0].recovery_hash.length,64);assert.notEqual(rows[0].recovery_hash,identity.recoveryKey);assert.equal(rows[0].prompt,undefined);
await handler(req(body));assert.equal(calls,1,'Resultado pronto não é gerado novamente');
rows[0].result_expires_at=new Date(Date.now()-1).toISOString();assert.equal((await handler(req({action:'status'}))).status,410);
console.log('Recuperação: execução em segundo plano, idempotência, isolamento, resultado pronto e expiração testados sem API real.');
