// Dependencies are downloaded only when requested; student images stay in the browser.
const scripts=new Map();
export function loadScript(url){if(scripts.has(url))return scripts.get(url);const pending=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>{scripts.delete(url);script.remove();reject(new Error('Não foi possível carregar o leitor. Confira sua conexão.'));};document.head.append(script);});scripts.set(url,pending);return pending;}
export async function rosterFromWorkbook(file,selectedSheet=null){
 if(file.size>10e6)throw new Error('Use planilha de até 10 MB.');
 if(!window.XLSX)await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
 const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false}),found=[];
 const sheets=book.SheetNames.filter(x=>/^Notas T/i.test(x)),sheet=selectedSheet||sheets[0];
 if(!sheets.includes(sheet))throw new Error('Selecione uma aba de notas válida.');
 let turma='';for(const name of [sheet]){const rows=window.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''}),header=rows.findIndex(r=>String(r[0]).trim()==='Matrícula'&&String(r[1]).trim()==='Estudante');turma=String(rows[0]?.[1]||name.replace(/^Notas T/i,'')).trim();if(header<0)continue;for(const row of rows.slice(header+1)){const registration=String(row[0]||'').trim(),student=String(row[1]||'').trim();if(registration&&student)found.push({registration,name:student});}}
 if(!found.length)throw new Error('Não encontrei estudantes em abas Notas T… com colunas Matrícula e Estudante.');
 const unique=new Map();for(const s of found){if(unique.has(s.registration)&&unique.get(s.registration).name!==s.name)throw new Error('Há uma matrícula com nomes diferentes na planilha. Corrija o arquivo antes de importar.');unique.set(s.registration,s);}return {students:[...unique.values()],sheets,selectedSheet:sheet,turma};
}
export async function recognizeLocalText(canvas,logger,signal){
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 let worker,onAbort;
 try{if(signal?.aborted)throw new Error('Leitura cancelada.');worker=await window.Tesseract.createWorker('por',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger,cacheMethod:'none'});if(signal?.aborted)throw new Error('Leitura cancelada.');const cancelled=new Promise((_,reject)=>{onAbort=()=>reject(new Error('Leitura cancelada.'));signal?.addEventListener('abort',onAbort,{once:true});});const result=await Promise.race([worker.recognize(canvas),cancelled]);return result.data.text||'';}finally{if(onAbort)signal?.removeEventListener('abort',onAbort);await worker?.terminate();}
}
