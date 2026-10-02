// Local optical mark recognition. No network, names, grades or images leave here.
export const SHEET={width:800,height:1100,corners:[[40,40],[760,40],[760,1060],[40,1060]],rowY:220,rowStep:26,optionX:250,optionStep:80};
export function sheetLayout(a){const count=a.questions.filter(q=>q.type==='multiple_choice').length;const bottom=Math.max(330,SHEET.rowY+Math.max(0,count-1)*SHEET.rowStep+80);return {...SHEET,height:bottom+40,corners:[[40,40],[760,40],[760,bottom],[40,bottom]]};}
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function fingerprint(a){let hash=2166136261;for(const c of JSON.stringify([a.id,a.questions]))hash=Math.imul(hash^c.charCodeAt(0),16777619);return hash>>>0;}
export function registrationFingerprint(value){let hash=2166136261;for(const c of String(value??''))hash=Math.imul(hash^c.charCodeAt(0),16777619);return hash>>>0;}
function crc(bytes){let value=0;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value&128)?((value<<1)^7)&255:(value<<1)&255;}return value;}
export function encodeCard(a,student,layoutVersion=3){if(![2,3].includes(layoutVersion))throw new Error('Modelo de folha inválido.');const hash=fingerprint(a),id=typeof student==='object'?student.machineId:student,registration=registrationFingerprint(typeof student==='object'?student.registration:'');const bytes=[hash>>>24,(hash>>>16)&255,(hash>>>8)&255,hash&255,id>>>8,id&255,registration>>>24,(registration>>>16)&255,(registration>>>8)&255,registration&255,layoutVersion];bytes.push(crc(bytes));return bytes.flatMap(byte=>Array.from({length:8},(_,i)=>(byte>>(7-i))&1));}
export function decodeCard(bits,a,registration){if(bits.length!==96)throw new Error('Código de folha inválido.');const bytes=Array.from({length:12},(_,i)=>bits.slice(i*8,i*8+8).reduce((sum,bit)=>(sum<<1)|bit,0));if(bytes[11]!==crc(bytes.slice(0,11))||![2,3].includes(bytes[10]))throw new Error('Código ilegível. Refaça a foto com melhor luz e sem cortes.');const hash=((bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3])>>>0;if(hash!==fingerprint(a))throw new Error('Esta folha não corresponde à avaliação e ao gabarito atuais. Selecione a avaliação correta.');const identity=((bytes[6]<<24)|(bytes[7]<<16)|(bytes[8]<<8)|bytes[9])>>>0;if(registration!==undefined&&identity!==registrationFingerprint(registration))throw new Error('A matrícula desta folha não corresponde ao cadastro. Restaure o cadastro original ou imprima uma nova folha.');return(bytes[4]<<8)|bytes[5];}
export function answerSheetSvg(a,student={machineId:0,name:'',registration:''}){
  const questions=a.questions.filter(q=>q.type==='multiple_choice');if(!questions.length)throw new Error('A avaliação não tem questões de múltipla escolha.');
  const bits=encodeCard(a,student);
  const layout=sheetLayout(a);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${layout.height}" width="160mm" height="${layout.height*.2}mm"><rect width="800" height="${layout.height}" fill="white"/>${layout.corners.map(([x,y])=>`<rect x="${x-16}" y="${y-16}" width="32" height="32" fill="black"/>`).join('')}<g fill="black" font-family="Arial"><text x="80" y="80" font-size="22">${esc(a.title.slice(0,60))}</text><text x="80" y="110" font-size="16">${esc(student.name||'Nome: _______________________________________')}</text><text x="80" y="135" font-size="14">Matrícula: ${esc(student.registration||'__________')} · Folha ${student.machineId}</text><text x="80" y="195" font-size="13">Preencha o círculo inteiro com caneta preta. Uma resposta por questão.</text>${questions.map((q,i)=>`<text x="110" y="${SHEET.rowY+i*SHEET.rowStep+5}" font-size="14">${a.questions.indexOf(q)+1}</text>${q.options.map((_,j)=>`<circle cx="${SHEET.optionX+j*SHEET.optionStep}" cy="${SHEET.rowY+i*SHEET.rowStep}" r="10" fill="white" stroke="black" stroke-width="1.5"/><text x="${SHEET.optionX+j*SHEET.optionStep+17}" y="${SHEET.rowY+i*SHEET.rowStep+5}" font-size="12">${String.fromCharCode(65+j)}</text>`).join('')}`).join('')}<text x="80" y="${layout.height-74}" font-size="12">Mantenha as quatro marcas e o código visíveis. Não dobre esta área.</text></g>${bits.map((bit,i)=>`<rect x="${208+(i%48)*8}" y="${150+Math.floor(i/48)*16}" width="6" height="10" fill="${bit?'black':'white'}"/>`).join('')}</svg>`;
}
export function homography(source,destination){
  const rows=[];source.forEach(([x,y],i)=>{const[u,v]=destination[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
  for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;[rows[i],rows[pivot]]=[rows[pivot],rows[i]];const scale=rows[i][i];if(Math.abs(scale)<1e-10)throw new Error('Marcas de alinhamento inválidas.');for(let k=i;k<9;k++)rows[i][k]/=scale;for(let j=0;j<8;j++)if(j!==i){const f=rows[j][i];for(let k=i;k<9;k++)rows[j][k]-=f*rows[i][k];}}
  const h=rows.map(x=>x[8]);return(x,y)=>{const d=h[6]*x+h[7]*y+1;return[(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];};
}
export function grayscale(image){const out=new Uint8Array(image.width*image.height);for(let i=0;i<out.length;i++)out[i]=Math.round(image.data[i*4]*.299+image.data[i*4+1]*.587+image.data[i*4+2]*.114);return out;}
function threshold(gray){const hist=new Uint32Array(256);for(const x of gray)hist[x]++;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let weight=0,partial=0,best=-1,cut=128;for(let i=0;i<255;i++){weight+=hist[i];partial+=i*hist[i];if(!weight||weight===gray.length)continue;const score=weight*(gray.length-weight)*(partial/weight-(sum-partial)/(gray.length-weight))**2;if(score>best){best=score;cut=i;}}return Math.min(200,cut+10);}
function markers(gray,width,height,cut){
  const seen=new Uint8Array(gray.length),stack=new Int32Array(gray.length),candidates=[];
  for(let i=0;i<gray.length;i++){
    if(seen[i]||gray[i]>=cut)continue;let size=1,head=0;stack[0]=i;seen[i]=1;let count=0,minX=width,maxX=0,minY=height,maxY=0;
    while(head<size){const p=stack[head++],x=p%width,y=Math.floor(p/width);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const next of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1])if(next>=0&&!seen[next]&&gray[next]<cut){seen[next]=1;stack[size++]=next;}}
    const w=maxX-minX+1,h=maxY-minY+1;
    if(w>Math.max(5,width*.008)&&w<width*.15&&h>Math.max(5,height*.008)&&h<height*.15&&w/h>.55&&w/h<1.8&&count/(w*h)>.75)candidates.push({point:[(minX+maxX)/2,(minY+maxY)/2],area:count});
  }
  const points=[[0,0],[width,0],[width,height],[0,height]].map(([cx,cy])=>candidates.filter(c=>(c.point[0]<width/2)===(cx===0)&&(c.point[1]<height/2)===(cy===0)).sort((a,b)=>b.area-a.area)[0]?.point);
  if(points.some(x=>!x))throw new Error('Não encontrei as quatro marcas. Fotografe a folha inteira ou marque os cantos manualmente.');
  return points;
}
function scanLayout(image,a,gray,cut,corners,layout){
  const map=homography(layout.corners,corners);
  const density=(x,y,r=4)=>{let black=0,count=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r){const[u,v]=map(x+dx,y+dy);const px=Math.round(u),py=Math.round(v);if(px<0||py<0||px>=image.width||py>=image.height)throw new Error('Folha cortada na imagem.');black+=gray[py*image.width+px]<cut?1:0;count++;}return black/count;};
  const bits=Array.from({length:96},(_,i)=>density(211+(i%48)*8,155+Math.floor(i/48)*16,1)>.5?1:0),student=decodeCard(bits,a);
  const layoutVersion=bits.slice(80,88).reduce((value,bit)=>(value<<1)|bit,0);
  if(layoutVersion!==(layout===SHEET?2:3))throw new Error('O código desta folha exige outro modelo de alinhamento.');
  const answers=a.questions.filter(q=>q.type==='multiple_choice').map((q,i)=>{
    const scores=q.options.map((_,j)=>density(SHEET.optionX+j*SHEET.optionStep,SHEET.rowY+i*SHEET.rowStep,5));
    const filled=scores.map((value,index)=>({value,index})).filter(x=>x.value>.55);
    const uncertain=scores.some(x=>x>.15&&x<=.55);
    return {id:q.id,scores,answer:filled.length===1&&!uncertain?filled[0].index:null,state:filled.length>1?'multiple':uncertain?'uncertain':filled.length===0?'blank':'read'};
  });
  return{student,corners,answers,bits,layoutHeight:layout.height};
}
export function scanSheet(image,a,manualCorners=null){
  const gray=grayscale(image),cut=threshold(gray),corners=manualCorners||markers(gray,image.width,image.height,cut);
  let failure;
  // Recognize compact sheets and sheets printed before this update, in any rotation.
  for(const layout of [sheetLayout(a),SHEET])for(let turn=0;turn<(manualCorners?1:4);turn++){
    try{return scanLayout(image,a,gray,cut,corners.map((_,i)=>corners[(i+turn)%4]),layout);}catch(error){failure=error;}
  }
  throw failure||new Error('Não foi possível ler a folha.');
}
