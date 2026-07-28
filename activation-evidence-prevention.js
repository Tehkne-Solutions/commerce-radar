(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = { monitors:'tehkne-commerce-radar-v83-evidence-prevention-monitors', checkpoints:'tehkne-commerce-radar-v83-evidence-prevention-checkpoints', events:'tehkne-commerce-radar-v83-evidence-prevention-events', settings:'tehkne-commerce-radar-v83-evidence-prevention-settings', snapshots:'tehkne-commerce-radar-v83-evidence-prevention-snapshots', reports:'tehkne-commerce-radar-v83-evidence-prevention-reports' };
  const DEFAULTS = { observationDays:21, attentionLoss:4, recurrenceLoss:8, keepSnapshots:365 };
  const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))??fallback}catch{return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const nowIso=()=>new Date().toISOString();
  const today=()=>nowIso().slice(0,10);
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const settings=()=>({...DEFAULTS,...read(KEYS.settings,{})});
  const monitors=()=>read(KEYS.monitors,[]);
  const checkpoints=()=>read(KEYS.checkpoints,[]);
  const events=()=>read(KEYS.events,[]);
  const snapshots=()=>read(KEYS.snapshots,[]);
  const assessmentFor=experimentId=>ROOT.CommerceRadarEvidenceConfidence?.assess?.(experimentId,false)||{};
  const scoreFor=experimentId=>Number(assessmentFor(experimentId).score||0);
  const componentsFor=experimentId=>assessmentFor(experimentId).components||{};

  function startMonitoring(experimentId,source={}){
    const samePlan=source.id?monitors().find(row=>row.recoveryPlanId===source.id):null;
    if(samePlan)return samePlan;
    const active=monitors().find(row=>row.experimentId===experimentId&&['monitoring','attention'].includes(row.status));
    if(active)return active;
    const startedAt=nowIso();
    const endsAt=new Date(Date.now()+settings().observationDays*86400000).toISOString();
    const baselineScore=Number(source.verifiedScore??scoreFor(experimentId));
    const row={id:`prevention-monitor-${uid()}`,experimentId,recoveryPlanId:source.id||null,status:'monitoring',baselineScore,startedAt,endsAt,occurrence:monitors().filter(item=>item.experimentId===experimentId).length+1,signature:'Tehkné Solutions'};
    write(KEYS.monitors,[row,...monitors()].slice(0,3000));
    checkpoint(experimentId,{score:baselineScore,componentScores:source.componentScores||componentsFor(experimentId),reason:'monitoring_started'});
    write(KEYS.events,[{id:`prevention-event-${uid()}`,type:'monitoring_started',experimentId,monitorId:row.id,createdAt:startedAt,signature:'Tehkné Solutions'},...events()].slice(0,6000));
    return row;
  }

  function checkpoint(experimentId,input={}){
    const monitor=monitors().find(row=>row.experimentId===experimentId&&['monitoring','attention'].includes(row.status));
    if(!monitor)throw new Error('Não há monitoramento ativo para este experimento.');
    const row={id:`prevention-checkpoint-${uid()}`,monitorId:monitor.id,experimentId,score:Number(input.score??scoreFor(experimentId)),componentScores:input.componentScores||componentsFor(experimentId),reason:String(input.reason||'manual').slice(0,120),capturedAt:nowIso(),signature:'Tehkné Solutions'};
    write(KEYS.checkpoints,[row,...checkpoints()].slice(0,12000));
    return evaluate(monitor.id,row);
  }

  function evaluate(monitorId,latestCheckpoint=null){
    const monitor=monitors().find(row=>row.id===monitorId);
    if(!monitor)throw new Error('Monitoramento não encontrado.');
    const series=checkpoints().filter(row=>row.monitorId===monitorId).sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
    const latest=latestCheckpoint||series.at(-1);
    const loss=monitor.baselineScore-Number(latest?.score??monitor.baselineScore);
    const recent=series.slice(-4);
    const consecutiveDrops=recent.length>=4&&recent.every((row,index,rows)=>index===0||row.score<rows[index-1].score);
    let status='monitoring';
    if(loss>=settings().recurrenceLoss)status='recurrent';
    else if(loss>=settings().attentionLoss||consecutiveDrops)status='attention';
    else if(Date.parse(monitor.endsAt)<=Date.now())status='stable';
    const updated={...monitor,status,lastScore:latest?.score??monitor.baselineScore,loss,evaluatedAt:nowIso(),completedAt:['stable','recurrent'].includes(status)?nowIso():null};
    write(KEYS.monitors,[updated,...monitors().filter(row=>row.id!==monitorId)]);
    if(status!==monitor.status)write(KEYS.events,[{id:`prevention-event-${uid()}`,type:`status_${status}`,experimentId:monitor.experimentId,monitorId,loss,createdAt:nowIso(),signature:'Tehkné Solutions'},...events()].slice(0,6000));
    return{monitor:updated,checkpoint:latest,status,loss,series};
  }

  function history(experimentId=''){return monitors().filter(row=>!experimentId||row.experimentId===experimentId).map(row=>({...row,checkpoints:checkpoints().filter(item=>item.monitorId===row.id)}))}
  function report(){const rows=history();const stable=rows.filter(row=>row.status==='stable').length;const recurrent=rows.filter(row=>row.status==='recurrent').length;const completed=stable+recurrent;return{total:rows.length,monitoring:rows.filter(row=>row.status==='monitoring').length,attention:rows.filter(row=>row.status==='attention').length,stable,recurrent,successRate:completed?Math.round(stable/completed*1000)/10:0,rows}}
  function captureSnapshot(reference=today()){const summary=report();const row={id:`prevention-snapshot-${reference}`,date:reference,summary:{total:summary.total,monitoring:summary.monitoring,attention:summary.attention,stable:summary.stable,recurrent:summary.recurrent,successRate:summary.successRate},monitors:summary.rows.slice(0,100).map(item=>({id:item.id,experimentId:item.experimentId,status:item.status,lastScore:item.lastScore??item.baselineScore,loss:item.loss??0})),capturedAt:nowIso(),signature:'Tehkné Solutions'};write(KEYS.snapshots,[row,...snapshots().filter(item=>item.date!==reference)].slice(0,settings().keepSnapshots));return row}
  function exportMarkdown(){const summary=report();const lines=['# Commerce Radar — Relatório preventivo','',`- Monitoramentos: ${summary.total}`,`- Em observação: ${summary.monitoring}`,`- Atenção: ${summary.attention}`,`- Estáveis: ${summary.stable}`,`- Reincidentes: ${summary.recurrent}`,`- Taxa de estabilidade: ${summary.successRate}%`,''];summary.rows.forEach(row=>lines.push(`## ${row.experimentId}`,'',`- Estado: ${row.status}`,`- Base: ${row.baselineScore}`,`- Último score: ${row.lastScore??row.baselineScore}`,`- Perda: ${row.loss??0}`,`- Ocorrência: ${row.occurrence}`,''));lines.push('## Limitações','','- O módulo apenas observa e recomenda; não altera scores, decisões ou experimentos automaticamente.','','Tehkné Solutions');const markdown=lines.join('\n');write(KEYS.reports,[{id:`prevention-report-${uid()}`,createdAt:nowIso(),markdown,signature:'Tehkné Solutions'},...read(KEYS.reports,[])].slice(0,500));return markdown}
  function extendCloud(){const apply=()=>{const keys=ROOT.CommerceRadarCloud?.dataKeys;if(!keys)return false;keys.evidencePrevention=KEYS.monitors;keys.evidencePreventionEvents=KEYS.events;keys.evidencePreventionSettings=KEYS.settings;keys.evidencePreventionSnapshots=KEYS.snapshots;keys.evidencePreventionReports=KEYS.reports;keys.evidencePreventionCheckpoints=KEYS.checkpoints;return true};if(!apply())ROOT.addEventListener?.('commerce-radar-cloud-ready',apply,{once:true})}
  function patchRecovery(){const recovery=ROOT.CommerceRadarEvidenceRecovery;if(!recovery?.verify||recovery.verify.__preventionPatched)return false;const original=recovery.verify.bind(recovery);const wrapped=(...args)=>{const result=original(...args);if(result?.status==='recovered')startMonitoring(result.experimentId,result);return result};wrapped.__preventionPatched=true;recovery.verify=wrapped;recovery.plans?.().filter(row=>row.status==='recovered').forEach(row=>startMonitoring(row.experimentId,row));return true}
  function inject(){if(typeof document==='undefined')return false;const nav=document.getElementById('evidenceRecoveryNav');const view=document.getElementById('evidenceRecovery');if(!nav||!view||document.getElementById('evidencePreventionNav'))return false;nav.insertAdjacentHTML('afterend','<button class="nav" id="evidencePreventionNav"><span>Prevenção de reincidência</span><b id="evidencePreventionNavCount"></b></button>');view.insertAdjacentHTML('afterend','<section class="view" id="evidencePrevention"><div class="sectionHead"><div><span class="eyebrow">MONITORAMENTO PÓS-RECUPERAÇÃO</span><h2>Prevenção de reincidência</h2><p class="muted">Acompanhe estabilidade, sinais de atenção e novas regressões sem alterar decisões automaticamente.</p></div><div class="actions"><button class="btn" id="preventionCapture">Capturar</button><button class="btn" id="preventionExport">Exportar relatório</button></div></div><div class="preventionSummary" id="preventionSummary"></div><div id="preventionList"></div></section>');const render=()=>{const summary=report();document.getElementById('preventionSummary').innerHTML=[['Monitorando',summary.monitoring],['Atenção',summary.attention],['Estáveis',summary.stable],['Reincidentes',summary.recurrent]].map(item=>`<article class="card"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join('');document.getElementById('preventionList').innerHTML=summary.rows.map(row=>`<article class="card preventionCard"><h3>${row.experimentId}</h3><p><b>${row.status}</b> · base ${row.baselineScore} · atual ${row.lastScore??row.baselineScore}</p><small>${row.startedAt.slice(0,10)} → ${row.endsAt.slice(0,10)} · ocorrência ${row.occurrence}</small></article>`).join('')||'<p class="muted">Nenhuma recuperação em monitoramento.</p>';document.getElementById('evidencePreventionNavCount').textContent=summary.attention+summary.recurrent||''};document.getElementById('evidencePreventionNav').onclick=()=>{document.querySelectorAll('.view').forEach(item=>item.classList.toggle('on',item.id==='evidencePrevention'));document.querySelectorAll('.nav').forEach(item=>item.classList.toggle('on',item.id==='evidencePreventionNav'));render()};document.getElementById('preventionCapture').onclick=()=>{monitors().filter(row=>['monitoring','attention'].includes(row.status)).forEach(row=>checkpoint(row.experimentId));captureSnapshot();render()};document.getElementById('preventionExport').onclick=()=>{const url=URL.createObjectURL(new Blob([exportMarkdown()],{type:'text/markdown;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=`commerce-radar-prevencao-${today()}.md`;anchor.click();URL.revokeObjectURL(url)};render();return true}
  function boot(){let attempts=0;const timer=setInterval(()=>{attempts+=1;patchRecovery();if(inject()||attempts>2000)clearInterval(timer)},50)}
  ROOT.CommerceRadarEvidencePrevention={KEYS,DEFAULTS,settings,monitors,checkpoints,events,snapshots,startMonitoring,checkpoint,evaluate,report,history,captureSnapshot,exportMarkdown};
  extendCloud();
  if(typeof document!=='undefined')document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();