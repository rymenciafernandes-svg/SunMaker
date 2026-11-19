import {calculateProduct} from './commerce';
// Cálculos puros, independentes do Supabase e sem estimar vendas inexistentes.
export const numeric = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null;
export function breakEven(fixed, variablePercent, ticket) {
  const f=numeric(fixed), v=numeric(variablePercent), t=numeric(ticket);
  if(f===null||f<0||v===null||v<0||v>=100) return null;
  const contribution=1-v/100;
  const revenue=f/contribution;
  const units=t!==null&&t>0?Math.ceil(revenue/t):null;
  return { revenue, contributionPercent:contribution*100, units, ticket:t>0?t:null };
}
export function scenario(baseRevenue, fixed, variablePercent, changePercent) {
  const r=numeric(baseRevenue), f=numeric(fixed), v=numeric(variablePercent), change=numeric(changePercent);
  if([r,f,v,change].some(n=>n===null)||r<0||f<0||v<0||v>=100||change< -100||change>1000) return null;
  const revenue=r*(1+change/100), variableCost=revenue*v/100, contribution=revenue-variableCost;
  return {revenue,variableCost,contribution,fixedCost:f,result:contribution-f,margin:revenue>0?(contribution-f)/revenue*100:null};
}
export function diagnose(products, mode, target) {
  const analyzed=(products||[]).map(p=>calculateProduct(p,mode));
  const valid=analyzed.filter(p=>p.valid), incomplete=analyzed.length-valid.length;
  const loss=valid.filter(p=>p.profit<0), below=valid.filter(p=>p.profit>=0&&p.marginPct<target), onTarget=valid.filter(p=>p.marginPct>=target);
  const weighted=valid.reduce((s,p)=>s+p.price*Math.max(0,p.stock),0);
  const weightedMargin=weighted>0?valid.reduce((s,p)=>s+p.profit*Math.max(0,p.stock),0)/weighted*100:null;
  const avgMargin=valid.length?valid.reduce((s,p)=>s+p.marginPct,0)/valid.length:null;
  const coverage=analyzed.length?valid.length/analyzed.length:0;
  const compliance=valid.length?onTarget.length/valid.length:0;
  const noLoss=valid.length?1-loss.length/valid.length:0;
  const score=analyzed.length?Math.round(100*(0.2*coverage+0.55*compliance+0.25*noLoss)):null;
  const opportunities=below.map(p=>({...p, suggested:p.cost/(1-target/100)})).filter(p=>Number.isFinite(p.suggested));
  const riskCapital=valid.filter(p=>p.marginPct<target).reduce((s,p)=>s+p.stockCost,0);
  return {count:analyzed.length,valid:valid.length,incomplete,loss:loss.length,below:below.length,onTarget:onTarget.length,score,avgMargin,weightedMargin,riskCapital,opportunities,lossProducts:loss};
}
