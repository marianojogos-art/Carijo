import assert from 'node:assert/strict';
import {createCaptureGate} from '../camera-capture.mjs';
import {sheetLayout,answerSheetSvg,scanSheet,encodeCard,SHEET} from '../omr.mjs';
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
assert.equal(read.answers[0].answer,1);assert.equal(read.layoutHeight,layout.height);
assert.equal(scanSheet(synthetic(SHEET),a).answers[0].answer,1,'Legacy sheets remain readable');
const thirty={...a,questions:Array.from({length:30},(_,i)=>({...a.questions[0],id:`q${i+1}`}))};
for(const shape of [SHEET,sheetLayout(thirty)]){const result=scanSheet(synthetic(shape,thirty),thirty);assert.equal(result.layoutHeight,shape.height,'Barcode distinguishes close layouts');assert(result.answers.every(q=>q.answer===1),'All 30 rows must use the correct geometry');}
const rotated={width:compact.height,height:compact.width,data:new Uint8ClampedArray(compact.data.length)};
for(let y=0;y<compact.height;y++)for(let x=0;x<compact.width;x++){const from=(y*compact.width+x)*4,to=(x*rotated.width+compact.height-1-y)*4;rotated.data.set(compact.data.subarray(from,from+4),to);}
assert.equal(scanSheet(rotated,a).answers[0].answer,1,'Automatic reading handles sideways sheets');
const gate=createCaptureGate();assert.equal(gate.observe(read,800,layout.height,0),false);assert.equal(gate.observe(read,800,layout.height,350),false);assert.equal(gate.observe(read,800,layout.height,700),true);
gate.reset();gate.observe(read,800,layout.height,0);assert.equal(gate.observe({...read,corners:read.corners.map(([x,y])=>[x+40,y])},800,layout.height,700),false,'Motion restarts stability');
gate.observe(null,800,layout.height,1000);assert.equal(gate.observe(read,800,layout.height,1400),false,'Losing the sheet resets detection');
assert.equal(createCaptureGate().observe({...read,corners:[[1,1],[10,1],[10,10],[1,10]]},800,1100,2000),false,'Tiny sheets must not auto-capture');
console.log('Câmera: folha compacta, legado, rotação, estabilidade, movimento e perda de enquadramento verificados.');
