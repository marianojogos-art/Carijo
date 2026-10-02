// Shared by the browser and Edge Function. Contains no student data.
const string = {type:'string'};
const object = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ASSESSMENT_SCHEMA = object({
  title:string,instructions:string,teacherNotes:string,accessibility:string,
  questions:{type:'array',minItems:1,maxItems:30,items:object({
    type:{type:'string',enum:['multiple_choice','open','task']},prompt:string,
    options:{type:'array',maxItems:5,items:string},correctIndex:{type:'integer'},
    expectedAnswer:string,skill:string,difficulty:{type:'string',enum:['easy','medium','hard']},
    points:{type:'number'},rubric:{type:'array',items:object({criterion:string,points:{type:'number'},description:string})}
  })}
});
export function validateAssessment(raw) {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim() || !Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 30) throw new Error('Instrumento incompleto ou quantidade inválida.');
  for (const key of ['title','instructions','teacherNotes','accessibility']) if(typeof raw[key] !== 'string' || raw[key].length > 12000) throw new Error('Texto da avaliação inválido.');
  const questions = raw.questions.map((q,index) => {
    if(!['multiple_choice','open','task'].includes(q.type) || typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length>10000 || !Number.isFinite(q.points) || q.points<=0 || q.points>100) throw new Error(`Revise a questão ${index+1}: enunciado ou pontuação inválida.`);
    if(!Array.isArray(q.options) || q.options.some(x=>typeof x!=='string' || !x.trim()) || q.options.length>5) throw new Error(`Alternativas inválidas na questão ${index+1}.`);
    if(q.type==='multiple_choice' && (q.options.length<2 || !Number.isInteger(q.correctIndex) || q.correctIndex<0 || q.correctIndex>=q.options.length || new Set(q.options.map(x=>x.trim().toLowerCase())).size!==q.options.length)) throw new Error(`Gabarito inválido na questão ${index+1}.`);
    if(q.type!=='multiple_choice' && (q.correctIndex!==-1 || q.options.length)) throw new Error(`Questão aberta ${index+1} não deve ter alternativa correta.`);
    if(typeof q.expectedAnswer!=='string' || typeof q.skill!=='string' || !['easy','medium','hard'].includes(q.difficulty) || !Array.isArray(q.rubric)) throw new Error(`Critérios incompletos na questão ${index+1}.`);
    if(q.rubric.some(r=>typeof r.criterion!=='string'||typeof r.description!=='string'||!Number.isFinite(r.points)||r.points<0)) throw new Error(`Rubrica inválida na questão ${index+1}.`);
    if(q.type!=='multiple_choice' && (!q.rubric.length || Math.abs(q.rubric.reduce((sum,r)=>sum+r.points,0)-q.points)>0.01)) throw new Error(`A rubrica da questão ${index+1} precisa somar ${q.points} pontos.`);
    return {...q,id:`q${index+1}`};
  });
  return {...raw,questions};
}
export function gradeAssessment(assessment, responses, maximum=10, diagnostic=false) {
  const details=assessment.questions.map((q,i)=>{
    const answer=responses[q.id]; let awarded=null;
    if(q.type==='multiple_choice' && Number.isInteger(answer) && answer>=0 && answer<q.options.length) awarded=answer===q.correctIndex?q.points:0;
    if(q.type==='multiple_choice' && answer==='blank') awarded=0;
    if(q.type!=='multiple_choice' && typeof answer==='number' && Number.isFinite(answer) && answer>=0 && answer<=q.points) awarded=answer;
    return {id:q.id,question:i+1,awarded,possible:q.points,pending:awarded===null};
  });
  const total=details.reduce((s,x)=>s+x.possible,0), earned=details.reduce((s,x)=>s+(x.awarded||0),0), pending=details.some(x=>x.pending);
  return {details,total,earned,pending,score:diagnostic||pending?null:Number((earned/total*maximum).toFixed(2))};
}
export function assessmentStudentHtml(a, escape) {
  return `<h2>${escape(a.title)}</h2><p>Nome: _____________________________________ Turma: __________</p><p>${escape(a.instructions)}</p>${a.questions.map((q,i)=>`<section class="assessment-question"><h3>Questão ${i+1} · ${q.points} pontos</h3><p>${escape(q.prompt).replace(/\n/g,'<br>')}</p>${q.type==='multiple_choice'?`<ol type="A">${q.options.map(x=>`<li>${escape(x)}</li>`).join('')}</ol>`:'<p>____________________________________________________________________</p><p>____________________________________________________________________</p><p>____________________________________________________________________</p>'}</section>`).join('')}<p>${escape(a.accessibility)}</p>`;
}
