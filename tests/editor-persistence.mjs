import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
let records = [], inserts = 0, updates = 0;
const writes = [];
const target = { innerHTML: '<p>Primeiro</p>', innerText: 'Primeiro', querySelector: () => ({ textContent: 'Plano' }) };
const ctx = vm.createContext({
  crypto: webcrypto, document: { querySelector: selector => selector === '#planDocument' ? target : null, addEventListener() {} },
  window: {}, currentUser: { id: 'owner' }, currentPlanId: null,
  state: { classes: [], planType: 'quarter' },
  getSelectedClass: () => ({id: 1, name: '6º', subject: 'Arte'}),
  currentPlanSnapshot: () => ({planType: 'quarter', period: '1', documentText: target.innerText}),
  sanitizeDocumentHtml: value => value, readDeviceDocuments: () => structuredClone(records), DEVICE_DOCUMENTS_KEY: 'docs',
  localStorage: { setItem: (_, value) => { records = JSON.parse(value); } },
  hasHistoryAccount: () => true, toast() {},
  supabaseClient: { from() { return {
    insert(payload) { inserts++; return query(payload); }, update(payload) { updates++; return query(payload); }
  }; } }
});
function query(payload) {
  return { eq() { return this; }, select() { return this; }, async single() {
    await new Promise(resolve => setTimeout(resolve, 10));
    writes.push(structuredClone(payload)); return { data: {id: 'cloud-1'}, error: null };
  } };
}
vm.runInContext(fs.readFileSync(new URL('../document-editor.js', import.meta.url), 'utf8'), ctx);
ctx.window.CarijoEditor.generated('plan');
target.innerHTML = '<p>Último</p>'; target.innerText = 'Último';
await ctx.window.CarijoEditor.save('plan');
assert.equal(inserts, 1, 'Parallel autosaves must not insert duplicate cloud records');
assert.equal(updates, 1);
assert.equal(records[0].document_html, '<p>Último</p>', 'Slow cloud response cannot replace latest local edit');
assert.equal(writes.at(-1).plan_data.documentText, 'Último');
assert.equal(records[0].plan_data.cloudId, 'cloud-1');
assert.equal(records[0].plan_data.versions.length, 2);
ctx.currentUser = {id: 'different-owner'};
target.innerHTML = '<p>Outro usuário</p>'; target.innerText = 'Outro usuário';
await ctx.window.CarijoEditor.save('plan');
assert.equal(writes.length, 2, 'Never transfer another account’s document silently');
console.log('Editor persistence: serialized inserts, latest local recovery, metadata, checkpoints and account isolation passed.');
