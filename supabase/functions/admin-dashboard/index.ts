import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { summarizeUsage } from './admin-metrics.mjs';
const origins=new Set(['https://gaviao.carijo.workers.dev','http://localhost:3000']);
Deno.serve(async req=>{
  const origin=req.headers.get('Origin')||'https://gaviao.carijo.workers.dev';
  const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'null','Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(!origins.has(origin))return Response.json({error:'Origem não autorizada.'},{status:403,headers});
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return Response.json({error:'Método não permitido.'},{status:405,headers});
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return Response.json({error:'Entre com a conta de administrador.'},{status:401,headers});
  const {data:auth,error:authError}=await db.auth.getUser(token);
  if(authError||!auth.user)return Response.json({error:'Sessão inválida. Entre novamente.'},{status:401,headers});
  const {data:membership,error:memberError}=await db.from('carijo_administrators').select('user_id').eq('user_id',auth.user.id).maybeSingle();
  if(memberError||!membership)return Response.json({error:'Esta conta não tem acesso administrativo.'},{status:403,headers});
  try {
    const raw=await req.text();if(raw.length>10000)return Response.json({error:'Pedido muito grande.'},{status:413,headers});
    const body=JSON.parse(raw||'{}');
    if(body.action==='rate') {
      const r=body.rate;
      if(!r || typeof r.model!=='string'||!r.model.trim()||r.model.length>180||![r.input_usd,r.cached_input_usd,r.output_usd].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1000)||!/^https:\/\/(developers|platform)\.openai\.com\//.test(r.source_url||'')||!Number.isFinite(Date.parse(r.valid_from)))throw new Error('Informe modelo, preços por milhão de tokens, data e fonte oficial válidos.');
      const record={model:r.model.trim(),valid_from:new Date(r.valid_from).toISOString(),input_usd:r.input_usd,cached_input_usd:r.cached_input_usd,output_usd:r.output_usd,source_url:r.source_url,updated_by:auth.user.id};
      const {error}=await db.from('carijo_model_rates').upsert(record,{onConflict:'model,valid_from'});if(error)throw new Error('Não foi possível salvar os preços.');
      await db.from('carijo_admin_audit').insert({user_id:auth.user.id,action:'rate_updated',metadata:record});
      return Response.json({ok:true},{headers});
    }
    const start=new Date(body.start),end=new Date(body.end);
    if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start||+end-+start>366*864e5)throw new Error('Selecione um intervalo de até um ano.');
    const all:any[]=[];let truncated=false;
    for(const table of ['generation_events','carijo_generation_runs']) {
      for(let offset=0;offset<50000;offset+=1000){
        const fields='id,user_id,request_type,model,status,input_tokens,output_tokens,estimated_cost_usd,error_code,created_at'+(table==='carijo_generation_runs'?',cached_input_tokens,usage_complete,output_format':'');
        const {data,error}=await db.from(table).select(fields).gte('created_at',start.toISOString()).lt('created_at',end.toISOString()).order('created_at',{ascending:false}).range(offset,offset+999);
        if(error)throw new Error('Não foi possível consultar o consumo.');
        all.push(...(data||[]).map(x=>({...x,source:table})));if((data||[]).length<1000)break;if(offset===49000)truncated=true;
      }
    }
    const summary=summarizeUsage(all,Number(body.usdBrl)||null);
    const users=new Map();
    for(let page=1;page<=10;page++){
      const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)break;
      for(const u of data.users)users.set(u.id,u.email||u.id);if(data.users.length<1000)break;
    }
    summary.users=summary.users.map(x=>({...x,label:x.id==='visitors'?'Visitantes sem conta (não são pessoas identificáveis)':users.get(x.id)||x.id}));
    const {data:rates,error:rateError}=await db.from('carijo_model_rates').select('model,valid_from,input_usd,cached_input_usd,output_usd,source_url').order('valid_from',{ascending:false});
    if(rateError)throw new Error('Não foi possível consultar a configuração de preços.');
    return Response.json({summary,rates,truncated,events:all.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,200).map(x=>({id:x.id,user:x.user_id?users.get(x.user_id)||x.user_id:'Visitante',model:x.model,type:x.output_format||x.request_type,status:x.status,inputTokens:x.input_tokens,outputTokens:x.output_tokens,costUsd:x.estimated_cost_usd,error:x.error_code,createdAt:x.created_at,usageComplete:x.usage_complete,source:x.source})),note:'Custos estimados pelos preços registrados no momento do pedido, não a fatura da OpenAI. Registros antigos ou interrompidos podem ter custo/uso desconhecido. Visitantes não permitem acompanhar uma pessoa entre sessões.'},{headers});
  }catch(error){return Response.json({error:error instanceof Error?error.message:'Falha administrativa.'},{status:400,headers});}
});
