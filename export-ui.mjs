import { blocksFromElement, buildDocx, exportFilename, printHtml } from './document-export.mjs';
function snapshot(kind) {
  const source = document.querySelector(kind === 'plan' ? '#planDocument' : '#activityAIText');
  if (!source?.innerText.trim()) throw new Error('Gere ou abra um documento antes de exportar.');
  const record = window.CarijoEditor?.metadata(kind);
  const meta = {type: record?.plan_type || (kind === 'activity' ? 'activity' : state.planType), className:record?.class_name, subject:record?.subject, period:record?.period_label};
  const html = (kind === 'activity' ? `<h2>${escapeHtml(document.querySelector('#activityOutputTitle').textContent)}</h2>` : '') + sanitizeDocumentHtml(source.innerHTML);
  return {html, meta, title:record?.title || 'Carijó'};
}
async function word(kind, button) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    const {html, meta, title} = snapshot(kind);
    const root = document.createElement('div'); root.innerHTML = html;
    const bytes = buildDocx(blocksFromElement(root), title);
    const url = URL.createObjectURL(new Blob([bytes], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = exportFilename(meta, 'docx');
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('Word editável baixado com o texto atual do documento.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; }
}
function preview(kind) {
  try {
    const {html, meta} = snapshot(kind);
    const filename = exportFilename(meta, 'pdf');
    const dialog = document.createElement('dialog'); dialog.className = 'export-preview-dialog';
    dialog.innerHTML = `<header><div><small>REVISÃO ANTES DA IMPRESSÃO</small><h2>Seu documento, fora da burocracia visual</h2></div><button type="button" class="preview-close" aria-label="Fechar visualização">✕</button></header><p>A4, margens laterais de 18 mm e inferior de 22 mm. Na janela de impressão, escolha “Salvar como PDF”, escala 100% e desative cabeçalhos e rodapés do navegador. Confira as quebras na prévia de impressão.</p><iframe title="Visualização do documento para impressão"></iframe><footer><span></span><button type="button" class="primary-button preview-print">Imprimir / Salvar PDF</button></footer>`;
    dialog.querySelector('footer span').textContent = filename;
    const close = () => { dialog.close(); dialog.remove(); };
    dialog.querySelector('.preview-close').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const frame = dialog.querySelector('iframe'), button = dialog.querySelector('.preview-print');
    button.disabled = true;
    frame.onload = () => { button.disabled = false; };
    frame.srcdoc = printHtml(html, filename.replace(/\.pdf$/, ''));
    button.onclick = async () => {
      await frame.contentDocument.fonts?.ready;
      const previous = document.title;
      document.title = filename.replace(/\.pdf$/, '');
      const restore = () => { document.title = previous; };
      frame.contentWindow.addEventListener('afterprint', restore, {once:true});
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } finally { restore(); }
    };
    document.body.append(dialog); dialog.showModal();
  } catch (error) { toast(error.message || 'Não foi possível abrir a impressão.'); }
}
window.CarijoExport = {preview};
for (const [kind, selector] of [['plan','#printPlan'], ['activity','#printActivity']]) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary-button';
  button.textContent = 'Baixar Word'; button.id = kind === 'plan' ? 'downloadPlanWord' : 'downloadActivityWord';
  button.onclick = () => word(kind, button);
  document.querySelector(selector).before(button);
}
