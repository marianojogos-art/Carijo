/* Fields and worksheet names follow Assistente SGE 2.0 workbook-template.mjs. */
const SGE_FIELDS = ['Objetivos', 'Conteúdos', 'Metodologia', 'Recursos Didáticos', 'Avaliação'];
function renderSupervisorReport() {
  $('#supervisorPanel').classList.toggle('hidden', !supervisorReport);
  $('#supervisorText').innerHTML = supervisorReport ? generatedTextToHtml(supervisorReport.text || 'Parecer indisponível.') : '';
}
function openSgeExport() {
  if (!generatedContext) { toast('Gere ou abra um planejamento antes de exportar.'); return; }
  const quarter = generatedContext.planType === 'quarter';
  const fields = Object.fromEntries([...SGE_FIELDS, 'Referências'].map(name => [name, []]));
  let current = 'Metodologia';
  const normalized = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\d+[.)]\s*/, '').replace(/[:*#]/g, '').trim().toLowerCase();
  const body = $('.generated-plan-body', $('#planDocument')) || $('#planDocument');
  for (const child of body.children) {
    const match = Object.keys(fields).find(name => normalized(name) === normalized(child.textContent));
    if (/^H[1-6]$/.test(child.tagName) && match) { current = match; continue; }
    fields[current].push(child.innerText);
  }
  if (fields['Referências'].length) fields.Metodologia.push('Referências:\n' + fields['Referências'].join('\n'));
  const entries = quarter ? [['Conteúdo do Período', body.innerText]] : SGE_FIELDS.map(name => [name, fields[name].join('\n\n')]);
  $('#sgeClass').value = '';
  $('#sgeFields').innerHTML = (quarter ? `<label>Trimestre<select id="sgeQuarter">${[1,2,3].map(n => `<option value="${n}" ${n === generatedContext.quarter ? 'selected' : ''}>${n}º Trimestre</option>`).join('')}</select></label>` : `<label>Data inicial<input id="sgeStart" type="date" value="${escapeAttr(generatedContext.start || '')}"></label><label>Data final<input id="sgeEnd" type="date" value="${escapeAttr(generatedContext.end || '')}"></label><label>Nº de aulas<input id="sgeLessons" type="number" min="1" value="${Number(generatedContext.lessons) || 1}"></label>`) + entries.map(([name, value], index) => `<label>${name}<textarea data-sge-field="${index}">${escapeHtml(value)}</textarea></label>`).join('');
  $('#sgeFeedback').textContent = 'Informe o número real da turma no SGE. Ele não é deduzido do ano escolar.';
  showModalElement($('#sgeModal'));
}
async function downloadSgeWorkbook() {
  try {
    const turma = $('#sgeClass').value.trim();
    if (!/^\d+$/.test(turma)) throw new Error('Informe o número da turma no SGE.');
    const values = $$('[data-sge-field]').map(input => input.value.trim());
    if (values.some(value => !value)) throw new Error('Preencha todos os campos pedagógicos antes de exportar.');
    const quarter = generatedContext.planType === 'quarter';
    const brDate = value => value.split('-').reverse().join('/');
    let headers, row;
    if (quarter) {
      headers = ['ID', 'Turma', 'Período', 'Data Inicial', 'Data Final', 'Data limite', 'Conteúdo do Período', 'Ação', 'Status', 'Situação no SGE'];
      row = [`PTR-${turma}-${$('#sgeQuarter').value}`, turma, `${$('#sgeQuarter').value}º Trimestre`, '', '', '', values[0], 'Criar', 'Revisar', ''];
    } else {
      const start = $('#sgeStart').value, end = $('#sgeEnd').value;
      if (!start || !end || end < start) throw new Error('Informe um intervalo válido.');
      const lessons = Number($('#sgeLessons').value);
      if (!Number.isInteger(lessons) || lessons < 1) throw new Error('Informe uma quantidade inteira de aulas.');
      headers = ['ID', 'Turma', 'Data Inicial', 'Data Final', 'Nº de aulas', ...SGE_FIELDS, 'Habilidades', 'Ação', 'Status', 'Situação no SGE', 'Sequência no SGE'];
      row = [`PLA-${turma}-${start.replaceAll('-', '')}`, turma, brDate(start), brDate(end), lessons, ...values, (generatedContext.skills || []).join('\n'), 'Criar', 'Revisar', '', ''];
    }
    if (row.some(value => String(value).length > 32767)) throw new Error('Um campo excede 32.767 caracteres. Resuma esse campo para exportar.');
    const { buildWorkbook } = await import('./sge-workbook.mjs');
    const name = quarter ? 'Planejamento Trimestral' : 'Planejamento Quinzenal';
    const bytes = buildWorkbook([{name, rows: [headers, row], widths: headers.map((_, i) => i < 5 ? 20 : 48)}]);
    const url = URL.createObjectURL(new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Carijo_Assistente_SGE_${turma}_${quarter ? 'trimestral' : 'quinzenal'}.xlsx`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#sgeFeedback').textContent = 'Importe a aba na planilha usada pelo Assistente SGE, confira e marque como Pronto quando revisada. Se o registro já existir, altere a ação para Atualizar e informe sua sequência no SGE.';
  } catch (error) { $('#sgeFeedback').textContent = error.message; }
}
document.addEventListener('DOMContentLoaded', () => {
  $('#exportSge').addEventListener('click', openSgeExport);
  $('#downloadSge').addEventListener('click', downloadSgeWorkbook);
  $$('[data-close-sge]').forEach(button => button.addEventListener('click', () => hideModalElement($('#sgeModal'))));
  $('#planDocument').addEventListener('input', () => {
    if (supervisorReport) { supervisorReport = {status: 'stale', text: 'O documento foi editado depois da análise. O parecer anterior não valida esta versão.'}; renderSupervisorReport(); }
  });
});
