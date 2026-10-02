import { summarizeUsage } from './admin-metrics.mjs';
const money=value=>value===null||value===undefined?'Não disponível':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(Number(value));
const e=value=>escapeHtml(value);
const page=document.createElement('section');page.className='screen';page.id='adminDashboard';
page.innerHTML=`<div class="professional-workspace"><button class="back-link" id="adminBack">← Início</button><div class="eyebrow">ADMINISTRAÇÃO · ACESSO RESTRITO</div><h1>O custo da inteligência<br><em>não é metafórico.</em></h1><p>Acompanhe usuários identificados, visitantes, tokens, falhas e custos estimados. Não são valores da fatura do provedor.</p><div class="workspace-controls"><label>De<input id="adminStart" type="date"></label><label>Até (inclusive)<input id="adminEnd" type="date"></label><label>Câmbio USD → BRL (informado)<input id="adminExchange" type="number" min="0.01" step="0.01" placeholder="Opcional"></label><button id="adminRefresh" class="primary-button">Atualizar</button><button id="adminCsv" class="secondary-button" disabled>Baixar resumo CSV</button></div><p id="adminMessage" role="status"></p><div id="adminContent"></div><details class="workspace-details"><summary>Configurar preços da API</summary><p>Valores em dólares por milhão de tokens. Confira a tabela do modelo na sua conta. Não adivinhamos preços nem transformamos custo desconhecido em zero. A alteração vale para novas gerações; registros anteriores não são reescritos.</p><div class="field-grid"><label>Modelo<input id="rateModel" placeholder="Nome exato do modelo"></label><label>Válido a partir de<input id="rateDate" type="datetime-local"></label><label>Entrada<input id="rateInput" type="number" min="0" step="0.0001"></label><label>Entrada em cache<input id="rateCached" type="number" min="0" step="0.0001"></label><label>Saída<input id="rateOutput" type="number" min="0" step="0.0001"></label><label>Fonte oficial<input id="rateSource" type="url" value="https://developers.openai.com/api/docs/pricing"></label></div><button id="rateSave" class="primary-button">Salvar preços</button><div id="rateList"></div></details></div>`;
document.querySelector('main').append(page);
const nav=document.createElement('button');nav.type='button';nav.className='secondary-button admin-nav';nav.textContent='Administração';document.querySelector('.steps').append(nav);
let lastReport=null;
const today=new Date(), earlier=new Date(today);earlier.setDate(earlier.getDate()-30);
const localDate=date=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
$('#adminStart').value=localDate(earlier);$('#adminEnd').value=localDate(today);$('#rateDate').value=localDate(today)+'T00:00';
async function call(body){
  const session=(await supabaseClient.auth.getSession()).data.session;
  if(!session)throw new Error('Entre com a conta de administrador. A geração de documentos continua livre.');
  const response=await fetch(`${SUPABASE_URL}/functions/v1/admin-dashboard`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível consultar o painel.');
  const latest=(await supabaseClient.auth.getSession()).data.session;if(latest?.user?.id!==session.user.id)throw new Error('A conta mudou durante a consulta. Atualize o painel.');return data;
}
function table(headers,rows){return `<div class="workspace-table-scroll"><table class="workspace-table"><thead><tr>${headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${e(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
async function refresh(){
  const button=$('#adminRefresh');button.disabled=true;$('#adminMessage').textContent='Consultando o consumo…';
  try{
    const end=new Date($('#adminEnd').value+'T00:00:00-03:00');end.setUTCDate(end.getUTCDate()+1);
    const data=await call({start:$('#adminStart').value+'T00:00:00-03:00',end:end.toISOString(),usdBrl:Number($('#adminExchange').value)||null});
    lastReport=data;$('#adminCsv').disabled=false;const s=data.summary;
    $('#adminMessage').textContent=data.note+(data.truncated?' Atenção: intervalo excede o limite de consulta; reduza-o para obter totais completos.':'');
    $('#adminContent').innerHTML=`<div class="metric-grid">${[['Pedidos',s.requests],['Concluídos',s.succeeded],['Falhas',s.failed],['Em andamento',s.pending],['Entrada / saída',`${s.inputTokens} / ${s.outputTokens}`],['Custo conhecido (estimado)',money(s.knownCostUsd)],['Pedidos sem custo conhecido',s.unknownCost],['Uso incompleto',s.partialUsage]].map(([label,value])=>`<article class="metric-card"><small>${e(label)}</small><strong>${e(value)}</strong></article>`).join('')}</div>${s.knownCostBrl!==null?`<p>Conversão pelo câmbio informado: R$ ${s.knownCostBrl.toFixed(2)}. Não inclui tributos nem tarifas.</p>`:''}<h2>Consumo por usuário</h2>${table(['Usuário','Pedidos','Falhas','Entrada','Saída','Custo conhecido','Sem preço'],s.users.map(x=>[x.label,x.requests,x.failed,x.inputTokens,x.outputTokens,money(x.knownCostUsd),x.unknownCost]))}<h2>Modelos</h2>${table(['Modelo','Pedidos','Tokens em cache','Custo conhecido'],s.models.map(x=>[x.id,x.requests,x.cachedTokens,money(x.knownCostUsd)]))}<details class="workspace-details"><summary>Evolução diária</summary>${table(['Dia','Pedidos','Falhas','Custo conhecido'],s.days.map(x=>[x.id,x.requests,x.failed,money(x.knownCostUsd)]))}</details><details class="workspace-details"><summary>Últimos 200 pedidos do intervalo</summary>${table(['Quando','Usuário','Tipo / modelo','Estado','Tokens','Custo conhecido','Falha'],data.events.map(x=>[new Date(x.createdAt).toLocaleString('pt-BR'),x.user,`${x.type} / ${x.model}`,x.status,x.inputTokens===null?'Desconhecidos':`${x.inputTokens} / ${x.outputTokens}`,money(x.costUsd),x.error||'']))}</details>`;
    $('#rateList').innerHTML=table(['Modelo','Vigência','Entrada','Cache','Saída'],data.rates.map(x=>[x.model,new Date(x.valid_from).toLocaleString('pt-BR'),x.input_usd,x.cached_input_usd,x.output_usd]));
  }catch(error){lastReport=null;$('#adminCsv').disabled=true;$('#adminContent').replaceChildren();$('#rateList').replaceChildren();$('#adminMessage').textContent=error.message;}
  finally{button.disabled=false;}
}
nav.onclick=()=>{showScreen('adminDashboard');refresh();};$('#adminBack').onclick=()=>showScreen('upload');$('#adminRefresh').onclick=refresh;
$('#rateSave').onclick=async()=>{
  $('#rateSave').disabled=true;
  try{if(['#rateModel','#rateDate','#rateInput','#rateCached','#rateOutput','#rateSource'].some(id=>!$(id).value.trim()))throw new Error('Preencha todos os preços. Informe zero explicitamente quando aplicável.');await call({action:'rate',rate:{model:$('#rateModel').value.trim(),valid_from:new Date($('#rateDate').value).toISOString(),input_usd:Number($('#rateInput').value),cached_input_usd:Number($('#rateCached').value),output_usd:Number($('#rateOutput').value),source_url:$('#rateSource').value.trim()}});toast('Preços registrados. Novas gerações usarão esta configuração.');await refresh();}catch(error){$('#adminMessage').textContent=error.message;}finally{$('#rateSave').disabled=false;}
};
$('#adminCsv').onclick=()=>{
  if(!lastReport)return;
  const rows=[['Usuário','Pedidos','Falhas','Tokens entrada','Tokens saída','Custo estimado USD conhecido','Pedidos com custo desconhecido'],...lastReport.summary.users.map(x=>[x.label,x.requests,x.failed,x.inputTokens,x.outputTokens,x.knownCostUsd,x.unknownCost])];
  const cell=value=>'"'+String(value).replace(/^[=+@-]/,'\t$&').replace(/"/g,'""')+'"';
  const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`carijo-consumo-${$('#adminStart').value}-${$('#adminEnd').value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
};
// Clear sensitive figures promptly when the session ends or changes account.
let adminIdentity=null;
supabaseClient?.auth.onAuthStateChange((_event,session)=>{const id=session?.user?.id||null;if(id!==adminIdentity){lastReport=null;$('#adminContent').replaceChildren();$('#rateList').replaceChildren();$('#adminCsv').disabled=true;$('#adminMessage').textContent='Atualize o painel após entrar com uma conta autorizada.';}adminIdentity=id;});
