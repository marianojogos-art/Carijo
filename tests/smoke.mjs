import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`IDs duplicados: ${[...new Set(duplicates)].join(", ")}`);

const requiredIds = ["usagePill", "historyPage", "planEditorToolbar", "activityEditorToolbar", "privacyModal", "authButton"];
for (const id of requiredIds) {
  if (!ids.includes(id)) throw new Error(`Elemento obrigatório ausente: #${id}`);
}

for (const marker of ["invokeFreeGeneration(activityPrompt(), \"activity\")", "loadUsageStatus", "sanitizeDocumentHtml", "signInWithPassword"]) {
  if (!js.includes(marker)) throw new Error(`Comportamento obrigatório ausente: ${marker}`);
}

if (!html.includes('id="authModal"')) throw new Error("O histórico sincronizado precisa oferecer acesso opcional.");

for (const marker of ["@media print", "prefers-reduced-motion", "cost-manifesto", "history-card"]) {
  if (!css.includes(marker)) throw new Error(`Estilo obrigatório ausente: ${marker}`);
}

console.log(`Smoke test aprovado: ${ids.length} IDs únicos e recursos críticos presentes.`);
