export function usageAlerts(summary,settings={}){
 const alerts=[],threshold=Number(settings.failureRate)||20,min=Number(settings.minRequests)||5;
 if(summary.requests>=min&&summary.failed/summary.requests*100>=threshold)alerts.push({id:'failures',text:`Falhas em ${(summary.failed/summary.requests*100).toFixed(1)}% dos pedidos do intervalo.`});
 if(summary.unknownCost>0)alerts.push({id:'unknown',text:`${summary.unknownCost} pedidos sem custo conhecido. Isso não significa custo zero.`});
 if(summary.partialUsage>0)alerts.push({id:'partial',text:`${summary.partialUsage} pedidos com medição incompleta de uso.`});
 if(Number(settings.costUsd)>0&&summary.knownCostUsd>=Number(settings.costUsd))alerts.push({id:'cost',text:`Custo conhecido estimado atingiu US$ ${Number(summary.knownCostUsd).toFixed(2)} no intervalo.`});
 return alerts;
}
