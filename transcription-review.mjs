// This draft and its image live only in memory. The caller transfers reviewed text.
export function createTranscriptionReview({host,recognize,onChange=()=>{},onStart=()=>{},confirmReplace=message=>confirm(message)}){
 host.className='workspace-details transcription-review';
 host.innerHTML=`<summary>Transcrever e conferir respostas escritas</summary>
 <p>Compare a foto com o texto antes de usar na questão. Preserve números, alternativas, erros de escrita e respostas em branco. Não complete o que não conseguir ler: marque [ilegível].</p>
 <p>O reconhecimento acontece neste navegador; a foto não é enviada à IA. O leitor baixa seus arquivos na primeira utilização. Escrita à mão pode exigir transcrição manual.</p>
 <div class="workspace-controls"><label>Imagem da resposta<input id="transcriptPhoto" type="file" accept="image/*"></label><button id="readWrittenText" type="button" class="secondary-button">Reconhecer texto</button><button id="cancelTranscript" type="button" class="secondary-button" disabled>Cancelar leitura</button></div>
 <p id="ocrProgress" role="status" aria-live="polite">Escolha uma imagem ou carregue uma foto no leitor acima.</p>
 <div class="transcription-columns"><div><h3>Imagem para conferência</h3><label>Ampliação da imagem <select id="transcriptZoom"><option value="1">Ajustar à largura</option><option value="1.5">150%</option><option value="2">200%</option><option value="3">300%</option></select></label><div class="transcription-image" tabindex="0" role="region" aria-label="Imagem da resposta; use a rolagem para conferir os detalhes"><canvas id="transcriptCanvas" hidden role="img" aria-label="Foto da resposta em conferência"></canvas><p id="transcriptEmpty">Nenhuma imagem selecionada.</p></div></div>
 <div><label for="writtenTranscript">Texto editável · mantenha a numeração e as quebras de linha</label><textarea id="writtenTranscript" rows="16" spellcheck="false" aria-describedby="transcriptWarnings transcriptPrivacy"></textarea><div class="workspace-controls"><button id="markIllegible" type="button" class="secondary-button">Marcar seleção como [ilegível]</button></div><p id="transcriptWarnings"></p><label class="transcript-approval"><input id="transcriptReviewed" type="checkbox">Conferi o texto com a imagem, inclusive números, respostas em branco e trechos ilegíveis.</label><p id="transcriptReviewState" role="status" aria-live="polite"></p></div></div>
 <p id="transcriptPrivacy">Esta foto e este rascunho ficam apenas nesta tela. Após conferir, use “Usar transcrição revisada” na questão correspondente; só então o texto poderá entrar no rascunho local da correção.</p>`;
 const $=id=>host.querySelector('#'+id),text=$('writtenTranscript'),canvas=$('transcriptCanvas'),review=$('transcriptReviewed');
 let generation=0,controller=null,busy=false,reviewedText=null;
 function report(message,error=false){$('ocrProgress').textContent=message;$('ocrProgress').setAttribute('role',error?'alert':'status');host.setAttribute('data-state',error?'error':busy?'processing':'ready');}
 function sync(){
  const hasPhoto=!canvas.hidden&&canvas.width>0;
  $('readWrittenText').disabled=busy||!hasPhoto;$('cancelTranscript').disabled=!busy;
  text.disabled=busy;review.disabled=busy||!hasPhoto||!text.value.trim()||text.value.length>20000;
  $('markIllegible').disabled=busy||!hasPhoto;$('transcriptZoom').disabled=!hasPhoto;
  host.setAttribute('aria-busy',String(busy));
  $('transcriptReviewState').textContent=text.value.length>20000?'Texto acima de 20.000 caracteres. Separe a resposta por questão antes de usar.':review.checked?'Revisada. Escolha a questão correspondente abaixo.':'Revisão pendente: confira e marque a confirmação acima.';
  onChange();
 }
 function invalidate(){reviewedText=null;review.checked=false;sync();}
 function cancel(){generation++;controller?.abort();controller=null;const wasBusy=busy;busy=false;if(wasBusy)report('Leitura cancelada. O texto anterior foi preservado.');sync();}
 function reset(){cancel();text.value='';canvas.width=0;canvas.hidden=true;$('transcriptEmpty').hidden=false;$('transcriptZoom').value='1';canvas.style.width='100%';$('transcriptWarnings').textContent='';invalidate();report('Contexto alterado. Escolha a imagem da resposta para esta correção.');}
 function setImage(image,width,height){
  cancel();const ratio=Math.min(1,3200/Math.max(width,height));canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);canvas.hidden=false;$('transcriptEmpty').hidden=true;
  text.value='';$('transcriptWarnings').textContent='';$('transcriptZoom').value='1';canvas.style.width='100%';invalidate();report('Imagem pronta. Reconheça o texto ou transcreva manualmente e confira.');
 }
 $('transcriptPhoto').onchange=async event=>{
  const field=event.target,file=field.files[0];if(!file)return;
  if(text.value&&!confirmReplace('Trocar a imagem e descartar este rascunho de transcrição?')){field.value='';return;}
  onStart();cancel();const run=generation;busy=true;sync();report('Abrindo imagem neste dispositivo…');
  try{
   if(file.size>20e6)throw new Error('Use uma imagem de até 20 MB.');
   if(file.type&&!file.type.startsWith('image/'))throw new Error('Escolha uma imagem JPG, PNG ou outro formato aceito pelo navegador.');
   const image=await createImageBitmap(file);try{if(run!==generation)return;setImage(image,image.width,image.height);}finally{image.close();}
  }catch(error){if(run===generation)report(error.message||'Não foi possível abrir a imagem. Tente JPG ou PNG.',true);}
  finally{field.value='';if(run===generation){busy=false;sync();}}
 };
 $('readWrittenText').onclick=async()=>{
  if(busy||canvas.hidden)return;
  if(text.value&&!confirmReplace('Reconhecer novamente e substituir o texto atual? Em caso de erro, o texto será mantido.'))return;
  onStart();cancel();const run=generation;controller=new AbortController();const signal=controller.signal;busy=true;invalidate();report('Preparando leitor local e arquivos de idioma…');
  try{
   const result=await recognize(canvas,progress=>{
    if(run!==generation||signal.aborted)return;
    const percent=Math.round(Math.max(0,Math.min(1,Number(progress.progress)||0))*100);
    report(progress.status==='recognizing text'?`Reconhecendo texto: ${percent}%`:`Preparando leitor e idioma: ${percent}%`);
   },signal);
   if(run!==generation||signal.aborted)return;
   text.value=result.text;
   $('transcriptWarnings').textContent=result.uncertainWords.length?`Leituras de baixa confiança (não são confirmação do que está escrito): ${result.uncertainWords.join(' · ')}. Confira na imagem; substitua por [ilegível] se não conseguir ler.`:result.hasConfidence?'O leitor não sinalizou palavras de baixa confiança. Ainda pode errar ou omitir respostas: confira toda a imagem.':'O leitor não informou confiança por palavra. Confira toda a imagem, inclusive possíveis omissões.';
   report(text.value.trim()?'Leitura concluída. Revise antes de usar na questão; nenhuma pontuação foi atribuída.':'Nenhum texto reconhecido. Tente uma foto mais nítida ou transcreva manualmente. Marque [ilegível] quando necessário.');
  }catch(error){if(run===generation&&!signal.aborted)report('Não foi possível reconhecer o texto. Confira a conexão para carregar o leitor, tente outra foto ou transcreva manualmente. Seu texto anterior foi preservado.',true);}
  finally{if(run===generation){controller=null;busy=false;sync();}}
 };
 text.oninput=invalidate;
 review.onchange=()=>{if(review.disabled)review.checked=false;reviewedText=review.checked?text.value:null;sync();};
 $('markIllegible').onclick=()=>{if(busy||canvas.hidden)return;text.setRangeText('[ilegível]',text.selectionStart,text.selectionEnd,'end');invalidate();text.focus();};
 $('transcriptZoom').onchange=()=>{canvas.style.width=`${Number($('transcriptZoom').value)*100}%`;};
 $('cancelTranscript').onclick=cancel;
 sync();
 return {cancel,reset,setImage,reviewedText:()=>!busy&&review.checked&&reviewedText===text.value&&!review.disabled?text.value:null};
}
