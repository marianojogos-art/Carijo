export function summarizeUsage(events, usdBrl=null) {
  const summary={requests:events.length,succeeded:0,failed:0,pending:0,inputTokens:0,outputTokens:0,cachedTokens:0,knownCostUsd:0,unknownCost:0,partialUsage:0,users:[],models:[],days:[]};
  const users=new Map(),models=new Map(),days=new Map();
  for(const event of events) {
    const keys=[['users',event.user_id||'visitors',users],['models',event.model||'unknown',models],['days',new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(event.created_at)),days]];
    const cost=event.estimated_cost_usd===null||event.estimated_cost_usd===undefined?null:Number(event.estimated_cost_usd);
    for(const target of [summary,...keys.map(([,id,map])=>{if(!map.has(id))map.set(id,{id,requests:0,succeeded:0,failed:0,pending:0,inputTokens:0,outputTokens:0,cachedTokens:0,knownCostUsd:0,unknownCost:0,partialUsage:0});return map.get(id);})]) {
      if(target!==summary)target.requests++;
      if(['succeeded','failed','pending'].includes(event.status))target[event.status]++;
      target.inputTokens+=Number(event.input_tokens)||0;target.outputTokens+=Number(event.output_tokens)||0;target.cachedTokens+=Number(event.cached_input_tokens)||0;
      if(cost===null||!Number.isFinite(cost))target.unknownCost++;else target.knownCostUsd+=cost;
      if(event.usage_complete===false || event.status==='failed' && event.input_tokens===null)target.partialUsage++;
    }
  }
  for(const [key,map] of [['users',users],['models',models],['days',days]]) summary[key]=[...map.values()].sort((a,b)=>key==='days'?a.id.localeCompare(b.id):b.requests-a.requests);
  summary.knownCostBrl=Number.isFinite(usdBrl)&&usdBrl>0?summary.knownCostUsd*usdBrl:null;
  return summary;
}
