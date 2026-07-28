(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = { runs:'tehkne-commerce-radar-v87-budget-optimizer-runs', decisions:'tehkne-commerce-radar-v87-budget-optimizer-decisions', reports:'tehkne-commerce-radar-v87-budget-optimizer-reports', snapshots:'tehkne-commerce-radar-v87-budget-optimizer-snapshots' };
  const DEFAULTS = { maxAssetWeight:.45, maxChannelWeight:.65, maxProductWeight:.65, maxSupplierWeight:.65, minInvestment:100 };
  const STRATEGIES = { conservadora:{riskPenalty:1.4,diversificationBonus:.25}, equilibrada:{riskPenalty:.85,diversificationBonus:.15}, otimizada:{riskPenalty:.45,diversificationBonus:.05} };
  const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso=()=>new Date().toISOString();
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const runs=()=>read(KEYS.runs,[]);

  function candidates(){
    const source=ROOT.CommerceRadarPortfolioLab?.candidates?.()||[];
    const simulations=ROOT.CommerceRadarDecisionSimulator?.simulations?.()||[];
    const simulationById=new Map(simulations.map(row=>[row.id,row]));
    const recommendations=ROOT.CommerceRadarAdaptiveLearning?.recommendations?.()||[];
    const recommendationById=new Map(recommendations.map(row=>[row.id,row]));
    return source.map(x=>{
      const simulation=simulationById.get(x.id)||{};
      const recommendation=recommendationById.get(simulation.recommendationId)||{};
      const investment=Number(x.investment??simulation.input?.investment??0);
      return {...x,investment,channel:x.channel&&x.channel!=='Não informado'?x.channel:(simulation.channel||recommendation.channel||'Não informado'),product:x.product&&x.product!=='Não informado'?x.product:(simulation.product||recommendation.product||recommendation.playbookTitle||'Não informado'),supplier:x.supplier||simulation.supplier||recommendation.supplier||'Não informado'};
    }).filter(x=>Number.isFinite(x.returnRate)&&Number.isFinite(x.investment)&&x.investment>0);
  }

  function distribute(rows,budget,cfg){
    const fields=[['channel',cfg.maxChannelWeight],['product',cfg.maxProductWeight],['supplier',cfg.maxSupplierWeight]];
    const allocate=current=>{
      if(!current.length)throw new Error('Nenhuma oportunidade atende ao investimento mínimo.');
      if(current.length*cfg.maxAssetWeight<1-1e-9)throw new Error('Seleção inviável para o limite máximo por oportunidade.');
      const result=current.map(r=>({...r,weight:0,amount:0}));
      const grouped={channel:{},product:{},supplier:{}};
      let remaining=1,guard=0;
      while(remaining>1e-9&&guard++<1000){
        const active=result.filter(r=>{
          if(cfg.maxAssetWeight-r.weight<=1e-9)return false;
          return fields.every(([field,limit])=>limit-(grouped[field][r[field]]||0)>1e-9);
        });
        if(!active.length)break;
        const total=active.reduce((s,r)=>s+Math.max(.000001,r.score),0);
        let used=0;
        active.forEach(r=>{
          const assetRoom=cfg.maxAssetWeight-r.weight;
          const groupRoom=Math.min(...fields.map(([field,limit])=>limit-(grouped[field][r[field]]||0)));
          const share=remaining*Math.max(.000001,r.score)/total;
          const add=Math.max(0,Math.min(assetRoom,groupRoom,share));
          r.weight+=add; used+=add;
          fields.forEach(([field])=>{grouped[field][r[field]]=(grouped[field][r[field]]||0)+add});
        });
        if(used<1e-12)break;
        remaining-=used;
      }
      if(remaining>1e-7)throw new Error('Seleção inviável para os limites de concentração informados.');
      result.forEach(r=>r.amount=Math.round(budget*r.weight*100)/100);
      const delta=Math.round((budget-result.reduce((s,r)=>s+r.amount,0))*100)/100;
      if(Math.abs(delta)>=.01){
        const target=[...result].sort((a,b)=>b.score-a.score).find(r=>{
          const next=(r.amount+delta)/budget;
          if(next<0||next>cfg.maxAssetWeight+1e-9)return false;
          return fields.every(([field,limit])=>result.filter(x=>x[field]===r[field]).reduce((s,x)=>s+x.amount/budget,0)+delta/budget<=limit+1e-9);
        });
        if(!target)throw new Error('Não foi possível reconciliar o orçamento sem violar limites.');
        target.amount=Math.round((target.amount+delta)*100)/100;
      }
      result.forEach(r=>r.weight=r.amount/budget);
      return result;
    };

    let current=[...rows];
    while(true){
      const result=allocate(current);
      const below=result.filter(r=>r.amount+1e-9<cfg.minInvestment);
      if(!below.length)return result;
      const removeIds=new Set(below.map(r=>r.id));
      current=current.filter(r=>!removeIds.has(r.id));
    }
  }

  function optimize(totalBudget,strategyName='otimizada',constraints={}){
    const budget=Math.max(0,Number(totalBudget||0)); if(!budget)throw new Error('Orçamento virtual deve ser maior que zero.');
    const strategy=STRATEGIES[strategyName]; if(!strategy)throw new Error('Estratégia inválida.');
    const cfg={...DEFAULTS,...constraints};
    if(cfg.minInvestment>budget)throw new Error('Investimento mínimo não pode superar o orçamento virtual.');
    const rows=candidates(); if(!rows.length)throw new Error('Nenhuma oportunidade válida disponível.');
    const scored=rows.map(r=>({...r,score:Math.max(.0001,(r.returnRate*100)-(r.risk*strategy.riskPenalty)-(r.downsideRate*15)+strategy.diversificationBonus)}));
    const allocations=distribute(scored,budget,cfg);
    const sumBy=field=>allocations.reduce((m,r)=>(m[r[field]]=(m[r[field]]||0)+r.weight,m),{});
    const breaches=[];
    [['channel',cfg.maxChannelWeight,'Canal'],['product',cfg.maxProductWeight,'Produto'],['supplier',cfg.maxSupplierWeight,'Fornecedor']].forEach(([f,l,label])=>Object.entries(sumBy(f)).forEach(([n,w])=>{if(w>l+1e-8)breaches.push(`${label} ${n} acima do limite.`)}));
    if(breaches.length)throw new Error(`Alocação inválida: ${breaches.join(' ')}`);
    const expectedReturn=allocations.reduce((s,r)=>s+r.amount*r.returnRate,0);
    const weightedRisk=allocations.reduce((s,r)=>s+r.weight*r.risk,0);
    const worstCase=allocations.reduce((s,r)=>s+r.amount*r.downsideRate,0);
    const concentration=allocations.reduce((s,r)=>s+r.weight*r.weight,0);
    const diversification=Math.round(Math.max(0,Math.min(100,(1-concentration)*100)));
    const roi=expectedReturn/budget;
    const efficiency=Math.round(Math.max(0,(roi*100)-weightedRisk*.35+diversification*.2)*10)/10;
    const explanations=allocations.map(r=>`${r.title}: ${Math.round(r.weight*1000)/10}% por retorno esperado de ${Math.round(r.returnRate*1000)/10}% e risco ${r.risk}/100.`);
    const row={id:`budget-optimization-${uid()}`,strategy:strategyName,budget,constraints:cfg,allocations,expectedReturn:Math.round(expectedReturn*100)/100,roi:Math.round(roi*10000)/100,weightedRisk:Math.round(weightedRisk*10)/10,worstCase:Math.round(worstCase*100)/100,diversification,concentration:Math.round(concentration*1000)/1000,efficiency,breaches,explanations,createdAt:nowIso(),signature:'Tehkné Solutions'};
    write(KEYS.runs,[row,...runs()].slice(0,2000)); return row;
  }
  function compare(ids=[]){const rows=runs().filter(r=>!ids.length||ids.includes(r.id)).map(r=>({...r,adjustedValue:Math.round((r.expectedReturn-r.worstCase*r.weightedRisk/100)*100)/100})).sort((a,b)=>b.efficiency-a.efficiency||b.adjustedValue-a.adjustedValue);return{total:rows.length,best:rows[0]||null,rows}}
  function recordDecision(runId,decision,note=''){if(!['approved','deferred','rejected'].includes(decision))throw new Error('Decisão inválida.');const row={id:`budget-decision-${uid()}`,runId,decision,note:String(note).slice(0,500),createdAt:nowIso(),signature:'Tehkné Solutions'};write(KEYS.decisions,[row,...read(KEYS.decisions,[])].slice(0,5000));return row}
  function captureSnapshot(reference=nowIso().slice(0,10)){const c=compare();const row={id:`budget-snapshot-${reference}`,date:reference,total:c.total,bestId:c.best?.id||null,bestEfficiency:c.best?.efficiency||0,capturedAt:nowIso(),signature:'Tehkné Solutions'};write(KEYS.snapshots,[row,...read(KEYS.snapshots,[]).filter(x=>x.date!==reference)].slice(0,180));return row}
  function exportMarkdown(ids=[]){const c=compare(ids);const lines=['# Commerce Radar — Otimizador inteligente de orçamento','',`- Simulações: ${c.total}`,`- Melhor estratégia: ${c.best?.strategy||'não disponível'}`,''];c.rows.forEach((r,i)=>{lines.push(`## ${i+1}. ${r.strategy}`,'',`- Orçamento virtual: ${money(r.budget)}`,`- Retorno esperado: ${money(r.expectedReturn)}`,`- ROI esperado: ${r.roi}%`,`- Risco agregado: ${r.weightedRisk}/100`,`- Pior caso: ${money(r.worstCase)}`,`- Diversificação: ${r.diversification}/100`,`- Eficiência: ${r.efficiency}`,`- Alertas: ${r.breaches.join('; ')||'nenhum'}`,'');r.explanations.forEach(x=>lines.push(`- ${x}`));lines.push('')});lines.push('## Segurança funcional','','- Todas as distribuições são virtuais.','- Nenhum orçamento, campanha, produto ou marketplace real é alterado automaticamente.','','Tehkné Solutions');const md=lines.join('\n');write(KEYS.reports,[{id:`budget-report-${uid()}`,markdown:md,createdAt:nowIso()},...read(KEYS.reports,[])].slice(0,300));return md}
  function extendCloud(){const apply=()=>{const k=ROOT.CommerceRadarCloud?.dataKeys;if(!k)return false;k.budgetOptimizerRuns=KEYS.runs;k.budgetOptimizerDecisions=KEYS.decisions;k.budgetOptimizerReports=KEYS.reports;k.budgetOptimizerSnapshots=KEYS.snapshots;return true};if(!apply())ROOT.addEventListener?.('commerce-radar-cloud-ready',apply,{once:true})}
  function inject(){if(typeof document==='undefined')return false;const nav=document.getElementById('portfolioLabNav'),view=document.getElementById('portfolioLab');if(!nav||!view||document.getElementById('budgetOptimizerNav'))return false;nav.insertAdjacentHTML('afterend','<button class="nav" id="budgetOptimizerNav"><span>Otimizador de orçamento</span><b id="budgetOptimizerNavCount"></b></button>');view.insertAdjacentHTML('afterend','<section class="view" id="budgetOptimizer"><div class="sectionHead"><div><span class="eyebrow">ALOCAÇÃO EXPLICÁVEL</span><h2>Otimizador inteligente de orçamento</h2><p class="muted">Compare estratégias sem executar mudanças reais.</p></div><div class="actions"><button class="btn" id="budgetOptimizerExport">Exportar</button></div></div><div class="budgetOptimizerSummary" id="budgetOptimizerSummary"></div><div id="budgetOptimizerList"></div></section>');const render=()=>{const c=compare();document.getElementById('budgetOptimizerSummary').innerHTML=[['Simulações',c.total],['Melhor eficiência',c.best?.efficiency??'—'],['ROI esperado',`${c.best?.roi||0}%`]].map(x=>`<article class="card"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join('');document.getElementById('budgetOptimizerList').innerHTML=c.rows.map(r=>`<article class="card budgetOptimizerCard"><h3>${r.strategy}</h3><p><b>${money(r.budget)}</b> · retorno ${money(r.expectedReturn)}</p><small>ROI ${r.roi}% · risco ${r.weightedRisk}/100 · eficiência ${r.efficiency}</small></article>`).join('')||'<p class="muted">Crie uma simulação pela API CommerceRadarBudgetOptimizer.optimize().</p>';document.getElementById('budgetOptimizerNavCount').textContent=c.total||''};document.getElementById('budgetOptimizerNav').onclick=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='budgetOptimizer'));document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('on',x.id==='budgetOptimizerNav'));render()};document.getElementById('budgetOptimizerExport').onclick=()=>{const u=URL.createObjectURL(new Blob([exportMarkdown()],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`commerce-radar-otimizacao-${nowIso().slice(0,10)}.md`;a.click();URL.revokeObjectURL(u)};render();return true}
  function boot(){let n=0;const t=setInterval(()=>{n++;if(inject()||n>2000)clearInterval(t)},50)}
  ROOT.CommerceRadarBudgetOptimizer={KEYS,DEFAULTS,STRATEGIES,runs,candidates,optimize,compare,recordDecision,captureSnapshot,exportMarkdown,money};extendCloud();if(typeof document!=='undefined')document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
