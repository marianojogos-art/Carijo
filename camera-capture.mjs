// Local stability gate: a valid barcode and repeatable marks, not just a rectangle.
export function createCaptureGate(){
 let prior=null,count=0,since=0;
 return {reset(){prior=null;count=0;since=0;},observe(scan,width,height,now){
  if(!scan||!width||!height){this.reset();return false;}
  const xs=scan.corners.map(p=>p[0]),ys=scan.corners.map(p=>p[1]);
  if((Math.max(...xs)-Math.min(...xs))/width<.25||(Math.max(...ys)-Math.min(...ys))/height<.16){this.reset();return false;}
  const signature=JSON.stringify([scan.bits,scan.student,scan.answers.map(r=>[r.id,r.state,r.answer])]);
  const stable=prior&&prior.signature===signature&&scan.corners.every((p,i)=>Math.hypot((p[0]-prior.corners[i][0])/width,(p[1]-prior.corners[i][1])/height)<.018);
  if(!stable){count=1;since=now;}else count++;
  prior={signature,corners:scan.corners.map(p=>[...p])};
  return count>=3&&now-since>=700;
 }};
}

// Identified sheets are accepted once per camera session. Anonymous sheets need
// a visible removal before another copy can be accepted.
export function createContinuousCapture(){
 const gate=createCaptureGate(),seen=new Set();let last=null,acceptedAt=-Infinity,missingSince=null,removed=false;
 const identity=scan=>JSON.stringify([scan.student,scan.bits]);
 return {
  reset(){gate.reset();seen.clear();last=null;acceptedAt=-Infinity;missingSince=null;removed=false;},
  missing(now){gate.reset();if(missingSince===null)missingSince=now;if(now-missingSince>=900)removed=true;},
  observe(scan,width,height,now){
   const key=identity(scan);missingSince=null;
   if(now-acceptedAt<2200){gate.reset();return 'showing';}
   if(scan.student>0&&seen.has(key)||scan.student===0&&key===last&&!removed){gate.reset();return 'already-read';}
   return gate.observe(scan,width,height,now)?'ready':'steady';
  },
  accept(scan,now){const key=identity(scan);last=key;acceptedAt=now;removed=false;missingSince=null;if(scan.student>0)seen.add(key);gate.reset();}
 };
}
