import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { setImmediate } from 'node:timers/promises';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function confirmGeneration()');
const end = source.indexOf('function authRedirectUrl()', start);
assert.ok(start > 0 && end > start);
const messages = [];
const nodes = new Map();
const context = vm.createContext({
  $: selector => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '' });
    return nodes.get(selector);
  },
  toast: message => messages.push(message),
  showModalElement: () => {}, hideModalElement: () => {},
  loadUsageStatus: async () => {},
});
vm.runInContext(`let generationInProgress = false; let resolveGenerationConfirmation = null; let usageState = { remaining: 3, limit: 8 }; ${source.slice(start, end)}`, context);
const run = code => vm.runInContext(code, context);
const first = run('confirmGeneration()');
await setImmediate();
assert.equal(await run('confirmGeneration()'), false, 'Duplo clique não deve abrir outro pedido');
run('finishGenerationConfirmation(false)');
assert.equal(await first, false, 'Cancelar não autoriza a geração');
assert.equal(run('generationInProgress'), false);
const second = run('confirmGeneration()');
await setImmediate();
run('finishGenerationConfirmation(true)');
assert.equal(await second, true);
assert.equal(run('generationInProgress'), true, 'A trava permanece durante a requisição');
run('generationInProgress = false; usageState = { remaining: 0, limit: 8 }');
const free = run('confirmGeneration()');
await setImmediate();
run('finishGenerationConfirmation(true)');
assert.equal(await free, true, 'A cota antiga não deve bloquear acesso livre');
run('generationInProgress = false');
run('usageState = null');
const unknown = run('confirmGeneration()');
await setImmediate();
assert.match(nodes.get('#generationConfirmationUsage').textContent, /gratuito e não exige conta/);
run('finishGenerationConfirmation(false)');
await unknown;
assert.ok(source.includes('() => generatePlanWithAI(false)'), 'Evento de clique não pode virar initialGeneration');
console.log('Confirmação de geração: cancelamento, aprovação, concorrência e cota verificados sem consumir API.');
