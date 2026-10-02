import {checkPlan} from './plan-quality.mjs';
const panel=document.createElement('details');panel.className='workspace-details quality-panel';panel.id='qualityPanel';
document.querySelector('#planDocument').before(panel);
function refresh(){
 if(!generatedContext||document.querySelector('#planDocument').classList.contains('hidden')){panel.hidden=true;return;}
 panel.hidden=false;const report=checkPlan(document.querySelector('#planDocument').innerText||document.querySelector('#planDocument').textContent,generatedContext);
 generatedContext.qualityReport=report;
 panel.innerHTML=`<summary>Conferência final · ${report.reviewCount?report.reviewCount+' itens para revisar':'estrutura observada'}</summary><p>Uma lista de conferência, não um diploma para a máquina. Verifique o que cabe na sua turma.</p><ul class="quality-list">${report.items.map(x=>`<li><strong>${x.status==='observed'?'✓':x.status==='human'?'Professor':'Conferir'} · ${escapeHtml(x.label)}</strong><p>${escapeHtml(x.detail)}</p></li>`).join('')}</ul>`;
}
let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refresh,500);}).observe(document.querySelector('#planDocument'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
window.CarijoQuality={refresh,check:checkPlan};
