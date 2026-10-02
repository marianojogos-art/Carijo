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
