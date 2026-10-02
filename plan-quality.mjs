const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[*_#]/g,'').replace(/\s+/g,' ').trim();
// Evidence checks, not a substitute for semantic or classroom judgement.
export function checkPlan(text,context={}){
 const plain=normalize(text),items=[];
 const add=(id,label,ok,detail)=>items.push({id,label,status:ok?'observed':'review',detail});
 for(const [id,label,pattern] of [['objectives','Objetivos',/objetivos?/],['contents','Conteúdos',/conteudos?/],['method','Metodologia',/metodologia/],['resources','Recursos didáticos',/recursos( didaticos)?/],['assessment','Avaliação',/avaliacao/],['references','Referências',/referencias/]])add(id,label,pattern.test(plain),'Confira o desenvolvimento desta seção, não apenas o título.');
 const skills=context.skillRecords||context.skills||[];
 skills.forEach((skill,index)=>{
  const phrase=normalize(typeof skill==='string'?skill:skill.text),codes=(phrase+' '+(skill.code||'')).match(/ef\d{2}[a-z]{2}\d{2}/g)||[];
  const words=[...new Set(phrase.split(/[^a-z]+/).filter(w=>w.length>5))];
  const overlap=words.filter(w=>plain.includes(w)).length/Math.max(1,words.length);
  add('skill-'+index,'Habilidade '+(index+1),phrase.length>20&&plain.includes(phrase)||overlap>=.65,'Evidência textual '+(codes.length?'('+codes.join(', ').toUpperCase()+')':'sem código BNCC')+'. Código isolado não comprova que a habilidade foi trabalhada. '+phrase.slice(0,180));
 });
 if(context.planType==='quarter'){
  add('load','Carga de referência: 12 semanas',/12\s*semanas/.test(plain),'Carga prevista: '+context.lessons+' aulas. Verifique se a progressão cabe nesse tempo.');
  add('weekly','Organização trimestral fluida',!/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?semana\s*\d/im.test(text),'O trimestre não deve ser apresentado semana por semana.');
 }else{
  const numbers=new Set();for(const m of String(text).matchAll(/(?:aula|encontro)s?\s*(\d+)(?:\s*(?:a|até|[-–])\s*(\d+))?/gi)){const from=+m[1],to=+(m[2]||m[1]);if(to>=from&&to-from<100)for(let n=from;n<=to;n++)numbers.add(n);}
  const bandCount=context.meetings?.bandMeetings,expected=Number(context.meetings?context.meetings.simple+bandCount:context.lessons);
  add('lessons','Sequência de aulas / encontros',expected>0&&numbers.size===expected,`Esperados ${expected||'a conferir'} encontros; ${numbers.size} identificados por seus títulos. Aulas-faixa podem exigir conferência manual da contagem.`);
  add('dates','Sem datas inventadas nas aulas',!/(?:aula|encontro)\s*\d+[^\n]{0,70}\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/.test(text),'O intervalo informado pode aparecer na identificação; datas por aula não devem ser inventadas.');
 }
 items.push({id:'human',label:'Coerência, inclusão e realidade da turma',status:'human',detail:'Somente o professor pode conferir viabilidade, segurança, recursos disponíveis e necessidades dos estudantes. Referências não são verificadas bibliograficamente por esta conferência.'});
 return {version:1,checkedAt:new Date().toISOString(),items,reviewCount:items.filter(x=>x.status==='review').length};
}
