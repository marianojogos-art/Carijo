// Dependencies are downloaded only when requested; student images stay in the browser.
const scripts=new Map();
export function loadScript(url){if(scripts.has(url))return scripts.get(url);const pending=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>{scripts.delete(url);script.remove();reject(new Error('Não foi possível carregar o leitor. Confira sua conexão.'));};document.head.append(script);});scripts.set(url,pending);return pending;}
export async function rosterFromWorkbook(file){
 if(file.size>10e6)throw new Error('Use planilha de até 10 MB.');
 await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
 const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false}),found=[];
 for(const name of book.SheetNames.filter(x=>/^Notas T/i.test(x))){const rows=window.XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:false,defval:''}),header=rows.findIndex(r=>String(r[0]).trim()==='Matrícula'&&String(r[1]).trim()==='Estudante');if(header<0)continue;for(const row of rows.slice(header+1)){const registration=String(row[0]||'').trim(),student=String(row[1]||'').trim();if(registration&&student)found.push({registration,name:student});}}
 if(!found.length)throw new Error('Não encontrei estudantes em abas Notas T… com colunas Matrícula e Estudante.');
 const unique=new Map();for(const s of found){if(unique.has(s.registration)&&unique.get(s.registration).name!==s.name)throw new Error('Há uma matrícula com nomes diferentes na planilha. Corrija o arquivo antes de importar.');unique.set(s.registration,s);}return [...unique.values()];
}
export async function recognizeLocalText(canvas,logger){
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
 let worker;
 try{worker=await window.Tesseract.createWorker('por',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger,cacheMethod:'none'});const result=await worker.recognize(canvas);return result.data.text||'';}finally{await worker?.terminate();}
}
