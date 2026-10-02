import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import {ASSESSMENT_SCHEMA,validateAssessment} from '../assessment-model.mjs';

const source = readFileSync(new URL('../supabase/functions/generate-plan-public/index.ts', import.meta.url), 'utf8');
const code = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''));
let handler;
let pending = false;
let calls = 0;
let release;
let block = false;
let structured = false;
const updates = [];
const query = {
  update(value) { updates.push(value); if (value.error_code !== 'lease_expired') pending = false; return this; },
  eq() { return this; }, lt() { return Promise.resolve({error:null}); },
  lte() {return this;}, order(){return this;}, limit(){return this;}, maybeSingle(){return Promise.resolve({data:null,error:null});},
  insert() { return this; }, select() { return this; },
  single() { if (pending) return Promise.resolve({error:{code:'23505'}}); pending = true; return Promise.resolve({data:{id:'event'},error:null}); },
  then(resolve) { resolve({error:null}); },
};
const context = vm.createContext({
  Response, Request, AbortController, DOMException, setTimeout, clearTimeout, console, ASSESSMENT_SCHEMA,validateAssessment,
  Deno: { env: {get:key => ({SUPABASE_URL:'https://test.invalid',OPENAI_API_KEY:'test-only',SUPABASE_SERVICE_ROLE_KEY:'test-only',OPENAI_MODEL:'configured-model'})[key]}, serve:fn => { handler = fn; } },
  createClient: () => ({ from: () => query, auth: { getUser: async () => ({data:{user:null}}) } }),
  improvePlan: async (_prompt, draft,_model,_key,meter) => {meter({input_tokens:20,output_tokens:10});return {plan:`Melhorado: ${draft}`,inputTokens:20,outputTokens:10};},
  fetch: async (_url,options) => { calls++; if (block) await new Promise(resolve => { release = resolve; }); if(structured){assert.equal(JSON.parse(options.body).text.format.strict,true);return Response.json({status:'completed',output_text:JSON.stringify({title:'Prova',instructions:'Leia',teacherNotes:'Gabarito separado',accessibility:'Leitura mediada',questions:[{type:'multiple_choice',prompt:'Dois mais dois?',options:['3','4'],correctIndex:1,expectedAnswer:'4',skill:'Adição',difficulty:'easy',points:1,rubric:[]}]}),usage:{input_tokens:30,output_tokens:15}});} return Response.json({status:'completed',output_text:'Documento completo',usage:{input_tokens:30,output_tokens:15}}); },
});
vm.runInContext(code, context);
const sessionId = 'a6e9b01c-77ca-4c88-9b0d-407320d14ff4';
const request = (body, origin='https://gaviao.carijo.workers.dev') => new Request('https://test.invalid', {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await handler(request({prompt:'x',sessionId}))).status, 400);
assert.equal((await handler(request({prompt:'x'.repeat(100),sessionId},'https://untrusted.invalid'))).status, 403);
assert.equal(calls, 0, 'Pedidos inválidos não chamam IA');
const plan = await handler(request({prompt:'Pedido pedagógico sem dados pessoais. '.repeat(5),sessionId,requestType:'plan'}));
assert.equal(plan.status, 200, 'Visitante sem JWT deve poder gerar');
const result = await plan.json();
assert.equal(result.plan, 'Melhorado: Documento completo');
assert.equal(result.usage.access, 'free');
assert.equal(result.usage.inputTokens, 50);
assert.equal(result.usage.estimatedCostUsd, null, 'Preço ausente não deve virar custo zero');
assert.equal(result.usage.limit, undefined);
block = true;
const first = handler(request({prompt:'Pedido pedagógico sem dados pessoais. '.repeat(5),sessionId,requestType:'activity'}));
while (!release) await new Promise(resolve => setTimeout(resolve, 0));
const second = await handler(request({prompt:'Pedido pedagógico sem dados pessoais. '.repeat(5),sessionId,requestType:'activity'}));
assert.equal(second.status, 409, 'Uma geração pendente bloqueia somente a concorrência da sessão');
release();
assert.equal((await first).status, 200);
assert.ok(updates.some(item => item.status === 'succeeded'));
block=false;structured=true;
const assessment=await handler(request({prompt:'Avaliação de matemática sem dados pessoais. '.repeat(5),sessionId,requestType:'activity',outputFormat:'assessment'}));assert.equal(assessment.status,200);const document=await assessment.json();assert.equal(document.assessment.questions[0].correctIndex,1);assert.equal(document.usage.inputTokens,30);assert.equal(updates.at(-1).output_format,undefined);assert.equal(updates.at(-1).usage_complete,true);
console.log('Geração livre: visitante, validação, custos e concorrência testados com IA simulada.');
