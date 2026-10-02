export function rubricScore(question,values){
 if(!Array.isArray(values)||values.length!==question.rubric.length)return null;
 if(values.some((v,i)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>question.rubric[i].points))return null;
 return Math.round(values.reduce((a,b)=>a+b,0)*100)/100;
}
export function suggestedFeedback(question,values){
 return question.rubric.map((r,i)=>`${r.criterion}: ${values[i]===null||values[i]===undefined?'a conferir':values[i]===r.points?'critério atendido':values[i]===0?'requer retomada':'parcialmente atendido'}.`).join(' ');
}
