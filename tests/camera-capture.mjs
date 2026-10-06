import assert from 'node:assert/strict';
import {createCaptureGate,createContinuousCapture} from '../camera-capture.mjs';
import {sheetLayout,answerSheetSvg,scanSheet,encodeCard,SHEET} from '../omr.mjs';
import {readPng,cropImage} from './png-image.mjs';
const a={id:'camera-test',title:'Gabarito',questions:[{id:'q1',type:'multiple_choice',options:['A','B'],correctIndex:1}]};
const layout=sheetLayout(a);
assert(layout.height<500);assert(layout.height<SHEET.height);
assert(answerSheetSvg(a).includes('width="160mm"'));assert(answerSheetSvg(a).includes(`viewBox="0 0 800 ${layout.height}"`));
assert(sheetLayout({...a,questions:Array.from({length:30},()=>a.questions[0])}).height<=1100);
function synthetic(source,assessment=a){const image={width:800,height:source.height,data:new Uint8ClampedArray(800*source.height*4).fill(255)};
 function black(x,y,w,h){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){const p=((y+dy)*800+x+dx)*4;image.data[p]=image.data[p+1]=image.data[p+2]=0;}}
 for(const[x,y]of source.corners)black(x-16,y-16,32,32);
 encodeCard(assessment,0,source===SHEET?2:3).forEach((bit,i)=>{if(bit)black(208+(i%48)*8,150+Math.floor(i/48)*16,6,10);});assessment.questions.forEach((q,i)=>black(324,214+i*SHEET.rowStep,12,12));return image;
}
const compact=synthetic(layout),read=scanSheet(compact,a);
const shaded={...compact,data:new Uint8ClampedArray(compact.data)};
for(let y=0;y<shaded.height;y++)for(let x=0;x<shaded.width;x++){const p=(y*shaded.width+x)*4,light=(compact.data[p]===0?75:190)+Math.round(x/shaded.width*45);shaded.data[p]=light;shaded.data[p+1]=light-10;shaded.data[p+2]=light-22;}
assert.equal(scanSheet(shaded,a).answers[0].answer,1,'Faint ink, warm light and a paper shadow must not block recognition');
if(process.argv[2]){
 const photo=cropImage(readPng(process.argv[2]),129,194,638,359),probe={id:'photo-regression',questions:Array.from({length:10},(_,i)=>({id:'q'+i,type:'multiple_choice',options:['A','B','C','D']}))};
 assert.throws(()=>scanSheet(photo,probe),/não corresponde à avaliação/,'The local photograph code must be decoded and validated before rejecting the intentionally different assessment');
 console.log('Captura real: código validado; avaliação diferente corretamente bloqueada.');
}
assert.equal(read.answers[0].answer,1);assert.equal(read.layoutHeight,layout.height);
assert.equal(scanSheet(synthetic(SHEET),a).answers[0].answer,1,'Legacy sheets remain readable');
const thirty={...a,questions:Array.from({length:30},(_,i)=>({...a.questions[0],id:`q${i+1}`}))};
for(const shape of [SHEET,sheetLayout(thirty)]){const result=scanSheet(synthetic(shape,thirty),thirty);assert.equal(result.layoutHeight,shape.height,'Barcode distinguishes close layouts');assert(result.answers.every(q=>q.answer===1),'All 30 rows must use the correct geometry');}
const rotated={width:compact.height,height:compact.width,data:new Uint8ClampedArray(compact.data.length)};
for(let y=0;y<compact.height;y++)for(let x=0;x<compact.width;x++){const from=(y*compact.width+x)*4,to=(x*rotated.width+compact.height-1-y)*4;rotated.data.set(compact.data.subarray(from,from+4),to);}
assert.equal(scanSheet(rotated,a).answers[0].answer,1,'Automatic reading handles sideways sheets');
function cameraFrame(source,width,height,left,top,scale=1){
 const frame={width,height,data:new Uint8ClampedArray(width*height*4).fill(255)};
 for(let y=0;y<Math.round(source.height*scale);y++)for(let x=0;x<Math.round(source.width*scale);x++){
  const sourcePixel=(Math.floor(y/scale)*source.width+Math.floor(x/scale))*4,target=((top+y)*width+left+x)*4;
  frame.data.set(source.data.subarray(sourcePixel,sourcePixel+4),target);
 }
 return frame;
}
for(const frame of [cameraFrame(compact,1800,1200,50,80),cameraFrame(compact,1280,720,150,80,.5),cameraFrame(rotated,1800,1200,50,80)]){
 const result=scanSheet(frame,a);assert.equal(result.answers[0].answer,1,'Offset sheets must be read even when all four marks share a camera quadrant');
}
assert.throws(()=>scanSheet(compact,{...a,id:'wrong-assessment'}),/não corresponde à avaliação/,'Wrong keys must remain blocked with a useful message');
const exposureGate=createCaptureGate();exposureGate.observe(read,800,layout.height,0);
exposureGate.observe({...read,answers:[{id:'q1',answer:null,state:'uncertain'}]},800,layout.height,350);
assert.equal(exposureGate.observe(read,800,layout.height,700),true,'Exposure variations in an answer must not prevent capture of a stable, valid sheet');
const gate=createCaptureGate();assert.equal(gate.observe(read,800,layout.height,0),false);assert.equal(gate.observe(read,800,layout.height,350),false);assert.equal(gate.observe(read,800,layout.height,700),true);
gate.reset();gate.observe(read,800,layout.height,0);assert.equal(gate.observe({...read,corners:read.corners.map(([x,y])=>[x+40,y])},800,layout.height,700),false,'Motion restarts stability');
gate.observe(null,800,layout.height,1000);assert.equal(gate.observe(read,800,layout.height,1400),false,'Losing the sheet resets detection');
assert.equal(createCaptureGate().observe({...read,corners:[[1,1],[10,1],[10,10],[1,10]]},800,1100,2000),false,'Tiny sheets must not auto-capture');
const continuous=createContinuousCapture(),named={...read,student:1};
for(const t of [0,350])assert.equal(continuous.observe(named,800,layout.height,t),'steady');
assert.equal(continuous.observe(named,800,layout.height,700),'ready');continuous.accept(named,700);
assert.equal(continuous.observe(named,800,layout.height,1000),'showing');
continuous.missing(3000);continuous.missing(4000);
assert.equal(continuous.observe({...named,answers:[]},800,layout.height,4100),'already-read');
const next={...read,student:2};for(const t of [4200,4550])assert.equal(continuous.observe(next,800,layout.height,t),'steady');
assert.equal(continuous.observe(next,800,layout.height,4900),'ready');continuous.accept(next,4900);
continuous.reset();const anonymous={...read,student:0};continuous.accept(anonymous,0);
assert.equal(continuous.observe(anonymous,800,layout.height,3000),'already-read');
continuous.missing(3100);continuous.missing(4100);
for(const t of [4200,4550])assert.equal(continuous.observe(anonymous,800,layout.height,t),'steady');
assert.equal(continuous.observe(anonymous,800,layout.height,4900),'ready');
console.log('Câmera: estabilidade, leitura contínua, próxima folha e proteção contra duplicações verificadas.');
