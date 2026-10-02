import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildWorkbook} from '../sge-workbook.mjs';
import {supervisePlan, improvePlan} from '../supabase/functions/generate-plan/supervisor.ts';
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const skills = JSON.parse(readFileSync(new URL('../data/rmef-2026-habilidades.json', import.meta.url), 'utf8')).skills;
const context = vm.createContext({fixture: skills, state: {planType: 'quarter', skills: new Set()}, getSelectedClass: () => ({name:'6º ano A', subject:'Educação Física'}), $: () => ({value:'2'})});
vm.runInContext(source.slice(0, source.indexOf('const SUBJECT_PROFILES')), context);
vm.runInContext('skillCatalog = fixture', context);
const selectedSource = source.slice(source.indexOf('function selectedSkills()'), source.indexOf('function selectedBiases()'));
vm.runInContext(selectedSource, context);
const official = skills.filter(s => s.grade === 6 && s.subject === 'Educação Física' && s.trimester === 2);
vm.runInContext('mandatoryQuarterSkills().forEach(skill => state.skills.add(skillKey(skill)))', context);
assert.equal(vm.runInContext('selectedSkills().length', context), official.length);
vm.runInContext("skillCatalog.push({id:'custom-test',area:'manual',text:'Complemento docente'}); state.skills.add('custom-test'); previousTrimesters.add(1)", context);
assert.equal(vm.runInContext('selectedSkills().length', context), official.length + 1);
assert.ok(vm.runInContext('skillsForSelectedClass().some(s => s.trimester === 1)', context));
assert.equal(vm.runInContext('skillsForSelectedClass().some(s => s.trimester === 3)', context), false);
vm.runInContext('state.skills.clear()', context);
assert.equal(vm.runInContext('selectedSkills().length', context), 0, 'O professor pode retirar habilidades sem reinclusão automática');
assert.equal(vm.runInContext("skillCodeLabel({id:'manual',text:'Complemento'})", context), 'Sem código BNCC');

// The XLSX writer stores literal strings, including formula-like content.
const bytes = buildWorkbook([{name:'Planejamento Trimestral', rows:[['ID','Turma','Conteúdo do Período'],['PTR-71-2','71','=não executar & <texto>']], widths:[20,10,60]}]);
const xml = new TextDecoder().decode(bytes);
assert.match(xml, /Planejamento Trimestral/);
assert.match(xml, /=não executar &amp; &lt;texto&gt;/);
assert.ok(!xml.includes('<f>'));

const savedFetch = globalThis.fetch;
try {
  let body;
  globalThis.fetch = async (_url, init) => { body = JSON.parse(init.body); return Response.json({status:'completed', output:[{content:[{type:'output_text',text:'Necessita ajustes: atividade não contempla a habilidade.'}]}],usage:{input_tokens:25,output_tokens:12}}); };
  const review = await supervisePlan('12 semanas e habilidade sem BNCC','Planejamento de teste','configured-model','test-key');
  assert.equal(review.status,'reviewed');
  assert.equal(review.inputTokens,25);
  assert.equal(body.model,'configured-model');
  assert.match(body.instructions,/12 semanas fixas/);
  assert.equal(JSON.parse(body.input).planejamento,'Planejamento de teste');
  globalThis.fetch = async () => Response.json({status:'incomplete',output_text:'Texto cortado',usage:{input_tokens:10,output_tokens:8}});
  assert.equal((await supervisePlan('pedido','plano','model','key')).status,'unavailable');
  globalThis.fetch = async () => Response.json({}, {status:429});
  await assert.rejects(supervisePlan('pedido','plano','model','key'));
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return Response.json({status:'completed', output_text:calls.length === 1 ? 'Corrigir cobertura das habilidades.' : 'Planejamento final melhorado', usage:{input_tokens:30,output_tokens:15}});
  };
  const final = await improvePlan('Pedido original', 'Rascunho', 'model', 'key');
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].input).parecerPedagogico, 'Corrigir cobertura das habilidades.');
  assert.equal(JSON.parse(calls[1].input).pedidoOriginal, 'Pedido original');
  assert.equal(final.plan, 'Planejamento final melhorado');
  assert.equal(final.inputTokens, 60);
  assert.equal(final.outputTokens, 30);
  assert.equal(final.text, undefined, 'O parecer interno não é entregue ao cliente');
  globalThis.fetch = async () => Response.json({status:'incomplete',output_text:'Cortado'});
  await assert.rejects(improvePlan('Pedido','Rascunho','model','key'), /revisão pedagógica/);
  let stage = 0;
  globalThis.fetch = async () => Response.json(++stage === 1 ? {status:'completed',output_text:'Corrigir'} : {status:'incomplete',output_text:'Final cortado'});
  await assert.rejects(improvePlan('Pedido','Rascunho','model','key'), /integralmente/);
} finally {globalThis.fetch = savedFetch;}
console.log(`Currículo: ${official.length} habilidades oficiais incluídas; retomadas e complementos verificados. Exportação XLSX e supervisor testados sem chamar IA.`);
