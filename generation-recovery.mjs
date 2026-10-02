const storage='carijo-pending-generation-v1';
export function readPending(){try{return JSON.parse(localStorage.getItem(storage)||'null');}catch{return null;}}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(url,headers,body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal}),data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Não foi possível consultar o pedido.'),{status:response.status});return data;}finally{clearTimeout(timeout);}}
async function poll(ticket,onStatus=()=>{}){
 for(let i=0;i<45;i++){
  const data=await post(ticket.url,{'Content-Type':'application/json'},{action:'status',requestId:ticket.requestId,recoveryKey:ticket.recoveryKey});
  if(data.status==='succeeded')return data.result;
  if(data.status==='failed')throw Object.assign(new Error(data.error||'A geração falhou.'),{terminal:true});
  onStatus('Elaborando e revisando. Você pode voltar a este pedido sem gerar outro.');await wait(4000);
 }
 throw new Error('O pedido ainda está em andamento. Use Recuperar pedido; não é necessário gerar novamente.');
}
export async function request(url,headers,body,resume={}){
 const digest=await hash(JSON.stringify([body.prompt,body.requestType,body.outputFormat||null]));let ticket=readPending();
 if(ticket&&ticket.digest!==digest)throw new Error('Há um pedido recuperável. Abra ou descarte seu comprovante antes de iniciar outro.');
 if(!ticket){ticket={version:1,url,requestId:crypto.randomUUID(),recoveryKey:crypto.randomUUID()+crypto.randomUUID(),digest,resume,createdAt:Date.now()};localStorage.setItem(storage,JSON.stringify(ticket));renderBanner();}
 // The same identity is reused after uncertain delivery, never a new billed request.
 let data;try{data=await post(url,headers,{...body,requestId:ticket.requestId,recoveryKey:ticket.recoveryKey});}catch(error){if(error.status)throw error;return await poll(ticket);}
 if(data.plan)return data;if(data.status==='succeeded')return data.result;if(data.status==='failed')throw Object.assign(new Error(data.error),{terminal:true});return await poll(ticket);
}
function complete(){localStorage.removeItem(storage);renderBanner();}
let banner;
function renderBanner(){
 if(!banner)return;const ticket=readPending();banner.hidden=!ticket;if(!ticket)return;
 banner.innerHTML='<h2>Um pedido não precisa pagar pedágio duas vezes.</h2><p>Há um comprovante de geração neste navegador. Consulte o resultado existente antes de iniciar outro pedido. Recuperação disponível por 24 horas após a conclusão.</p><div class="workspace-controls"><button class="primary-button" id="recoverPending">Recuperar pedido</button><button class="secondary-button" id="discardPending">Descartar comprovante local</button></div><p role="status" id="recoveryStatus"></p>';
 banner.querySelector('#discardPending').onclick=()=>{if(confirm('Descartar o comprovante? Isso não cancela uma execução nem devolve custos já realizados. O acesso local ao resultado será perdido.'))complete();};
 banner.querySelector('#recoverPending').onclick=async event=>{const button=event.target;button.disabled=true;const status=banner.querySelector('#recoveryStatus');try{status.textContent='Consultando o pedido existente…';const data=await poll(ticket,text=>status.textContent=text);if(ticket.resume.kind==='activity')await window.CarijoAssessments.recover(data,ticket.resume);else await window.acceptRecoveredPlan(data,ticket.resume.context);complete();toast('Resultado recuperado, sem nova geração.');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
}
if(typeof document!=='undefined'){
 const connection=document.createElement('p');connection.className='connection-status';connection.setAttribute('role','status');document.querySelector('main').prepend(connection);
 const checkConnection=()=>{connection.hidden=navigator.onLine!==false;connection.textContent='Sem conexão: a IA e a sincronização aguardam. Documentos já carregados e correções locais continuam disponíveis.';};checkConnection();window.addEventListener('online',checkConnection);window.addEventListener('offline',checkConnection);
 banner=document.createElement('aside');banner.className='workspace-card recovery-banner';document.querySelector('main').prepend(banner);renderBanner();window.addEventListener('storage',renderBanner);
 window.CarijoRecovery={request,complete,pending:readPending};
}
