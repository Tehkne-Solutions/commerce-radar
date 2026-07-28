(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    plans: 'tehkne-commerce-radar-v88-assisted-plans',
    events: 'tehkne-commerce-radar-v88-assisted-plan-events',
    snapshots: 'tehkne-commerce-radar-v88-assisted-plan-snapshots',
    reports: 'tehkne-commerce-radar-v88-assisted-plan-reports'
  };
  const PHASES = ['preparacao','validacao','lancamento','acompanhamento'];
  const STATUS = ['pending','approved','deferred','blocked','completed'];
  const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso=()=>new Date().toISOString();
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const plans=()=>read(KEYS.plans,[]);
  const optimizer=()=>ROOT.CommerceRadarBudgetOptimizer;
  const sourceRuns=()=>optimizer()?.runs?.()||[];
  const optimizerDecisions=()=>read(optimizer()?.KEYS?.decisions||'tehkne-commerce-radar-v87-budget-optimizer-decisions',[]);

  function buildTasks(run){
    const tasks=[];
    run.allocations.forEach((a,index)=>{
      const base=`${run.id}:${a.id}`;
      const priority=Math.round((Number(a.returnRate||0)*100)-(Number(a.risk||0)*.35)+(Number(a.weight||0)*25));
      tasks.push(
        {id:`task-${base}-prepare`,allocationId:a.id,phase:'preparacao',title:`Preparar ${a.title}`,status:'pending',priority,owner:'Não definido',dueOffsetDays:index+1,dependsOn:[],evidence:['Oferta validada','Canal confirmado'],completionCriteria:`Dados e premissas de ${a.title} revisados manualmente.`},
        {id:`task-${base}-validate`,allocationId:a.id,phase:'validacao',title:`Validar ${a.title}`,status:'pending',priority:priority-2,owner:'Não definido',dueOffsetDays:index+2,dependsOn:[`task-${base}-prepare`],evidence:['Margem revisada','Risco aceito'],completionCriteria:`Retorno, risco e orçamento de ${money(a.amount)} aprovados por responsável.`},
        {id:`task-${base}-launch`,allocationId:a.id,phase:'lancamento',title:`Autorizar lançamento de ${a.title}`,status:'pending',priority:priority-4,owner:'Não definido',dueOffsetDays:index+3,dependsOn:[`task-${base}-validate`],evidence:['Aprovação humana registrada'],completionCriteria:'Autorização documentada; nenhuma execução automática realizada.'},
        {id:`task-${base}-monitor`,allocationId:a.id,phase:'acompanhamento',title:`Acompanhar ${a.title}`,status:'pending',priority:priority-6,owner:'Não definido',dueOffsetDays:index+10,dependsOn:[`task-${base}-launch`],evidence:['Indicadores registrados','Desvios revisados'],completionCriteria:'Resultados iniciais comparados com a simulação.'}
      );
    });
    return tasks.sort((a,b)=>b.priority-a.priority||PHASES.indexOf(a.phase)-PHASES.indexOf(b.phase)||a.id.localeCompare(b.id));
  }

  function effectiveDecision(runId){return optimizerDecisions().find(x=>x.runId===runId)||null}
  function createPlan(runId){
    const runs=sourceRuns();
    const run=runId===undefined||runId===null||runId===''?runs[0]:runs.find(x=>x.id===runId);
    if(!run)throw new Error('Otimização de orçamento não encontrada.');
    const decision=effectiveDecision(run.id);
    if(decision?.decision!=='approved')throw new Error('A otimização precisa estar aprovada antes de gerar o plano operacional.');
    if(run.breaches?.length)throw new Error('A otimização possui violações e não pode gerar plano operacional.');
    const tasks=buildTasks(run);const createdAt=nowIso();
    const row={id:`assisted-plan-${uid()}`,runId:run.id,optimizerDecisionId:decision.id,strategy:run.strategy,budget:run.budget,constraints:run.constraints,allocations:run.allocations.map(a=>({id:a.id,title:a.title,amount:a.amount,weight:a.weight,channel:a.channel,product:a.product,supplier:a.supplier})),tasks,createdAt,updatedAt:createdAt,signature:'Tehkné Solutions',safety:'assistido-sem-execucao-automatica'};
    write(KEYS.plans,[row,...plans()].slice(0,1000));
    return row;
  }

  function dependencyState(plan,task){return task.dependsOn.map(id=>plan.tasks.find(x=>x.id===id)).filter(Boolean)}
  function dependents(plan,taskId){return plan.tasks.filter(x=>x.dependsOn.includes(taskId))}
  function updateTask(planId,taskId,status,note='',owner){
    if(!STATUS.includes(status))throw new Error('Status inválido.');
    const all=plans();const plan=all.find(x=>x.id===planId);if(!plan)throw new Error('Plano não encontrado.');
    const task=plan.tasks.find(x=>x.id===taskId);if(!task)throw new Error('Tarefa não encontrada.');
    const deps=dependencyState(plan,task);
    if(['approved','completed'].includes(status)&&deps.some(x=>x.status!=='completed'))throw new Error('Dependências ainda não foram concluídas.');
    if(status==='completed'&&task.status!=='approved')throw new Error('A tarefa precisa ser aprovada antes da conclusão.');
    if(task.status==='completed'&&status!=='completed'&&dependents(plan,task.id).some(x=>['approved','completed'].includes(x.status)))throw new Error('Não é possível reabrir uma tarefa com dependentes aprovados ou concluídos.');
    const changedAt=nowIso();task.status=status;task.note=String(note).slice(0,500);if(owner)task.owner=String(owner).slice(0,120);task.updatedAt=changedAt;plan.updatedAt=changedAt;
    write(KEYS.plans,all);
    const event={id:`assisted-event-${uid()}`,planId,taskId,status,note:task.note,owner:task.owner,createdAt:changedAt,signature:'Tehkné Solutions'};
    write(KEYS.events,[event,...read(KEYS.events,[])].slice(0,10000));return task;
  }
  function summary(planId){const plan=plans().find(x=>x.id===planId)||plans()[0];if(!plan)return{total:0};const counts=STATUS.reduce((m,s)=>(m[s]=plan.tasks.filter(t=>t.status===s).length,m),{});return{planId:plan.id,total:plan.tasks.length,...counts,progress:plan.tasks.length?Math.round((counts.completed/plan.tasks.length)*100):0,budget:plan.budget}}
  function captureSnapshot(reference=nowIso().slice(0,10)){const rows=plans().map(p=>summary(p.id));const row={id:`assisted-snapshot-${reference}`,date:reference,totalPlans:rows.length,totalTasks:rows.reduce((s,x)=>s+x.total,0),completed:rows.reduce((s,x)=>s+x.completed,0),capturedAt:nowIso(),signature:'Tehkné Solutions'};write(KEYS.snapshots,[row,...read(KEYS.snapshots,[]).filter(x=>x.date!==reference)].slice(0,180));return row}
  function exportMarkdown(planId){const plan=plans().find(x=>x.id===planId)||plans()[0];if(!plan)throw new Error('Plano não encontrado.');const lines=['# Commerce Radar — Plano operacional de execução assistida','',`- Orçamento virtual: ${money(plan.budget)}`,`- Estratégia: ${plan.strategy}`,`- Progresso: ${summary(plan.id).progress}%`,''];PHASES.forEach(phase=>{lines.push(`## ${phase}`,'');plan.tasks.filter(t=>t.phase===phase).forEach(t=>lines.push(`- [${t.status==='completed'?'x':' '}] ${t.title} — ${t.status} — responsável: ${t.owner}`));lines.push('')});lines.push('## Segurança funcional','','- O plano apenas organiza tarefas e aprovações humanas.','- Nenhuma campanha, compra, anúncio, integração ou alteração em marketplace é executada automaticamente.','','Tehkné Solutions');const md=lines.join('\n');write(KEYS.reports,[{id:`assisted-report-${uid()}`,planId:plan.id,markdown:md,createdAt:nowIso()},...read(KEYS.reports,[])].slice(0,300));return md}
  function extendCloud(){const apply=()=>{const k=ROOT.CommerceRadarCloud?.dataKeys;if(!k)return false;k.assistedExecutionPlans=KEYS.plans;k.assistedExecutionEvents=KEYS.events;k.assistedExecutionSnapshots=KEYS.snapshots;k.assistedExecutionReports=KEYS.reports;return true};if(!apply())ROOT.addEventListener?.('commerce-radar-cloud-ready',apply,{once:true})}
  ROOT.CommerceRadarAssistedExecutionPlan={KEYS,PHASES,STATUS,plans,buildTasks,effectiveDecision,createPlan,updateTask,summary,captureSnapshot,exportMarkdown,money};extendCloud();
})();