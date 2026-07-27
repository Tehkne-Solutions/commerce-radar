(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const EXP = ROOT.CommerceRadarPlaybookVersionExperiments;
  const STRATA = ROOT.CommerceRadarCycleStratification;
  const KEYS = {
    assessments: 'tehkne-commerce-radar-v80-evidence-assessments',
    reviews: 'tehkne-commerce-radar-v80-evidence-reviews',
    snapshots: 'tehkne-commerce-radar-v80-evidence-snapshots',
    settings: 'tehkne-commerce-radar-v80-evidence-settings',
  };
  const DEFAULTS = { targetCompleted: 8, targetPerArm: 3, stabilityWindow: 4, keepSnapshots: 365 };
  const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const safe=(v,m=1200)=>String(v??'').trim().slice(0,m);
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso=()=>new Date().toISOString();
  const today=()=>nowIso().slice(0,10);
  const clamp=v=>Math.max(0,Math.min(100,v));
  const settings=()=>({...DEFAULTS,...read(KEYS.settings,{})});
  const assessments=()=>read(KEYS.assessments,[]);
  const reviews=()=>read(KEYS.reviews,[]);
  const snapshots=()=>read(KEYS.snapshots,[]);
  const experiments=()=>EXP?.experiments?.()||[];
  const assignments=()=>EXP?.assignments?.()||[];

  function evaluation(id){ try{return EXP?.evaluateExperiment?.(id)||null}catch{return null} }
  function sampleScore(ev){
    const cfg=settings(); const completed=num(ev?.completed); const champion=num(ev?.champion?.completed); const challenger=num(ev?.challenger?.completed);
    const total=clamp(completed/Math.max(1,cfg.targetCompleted)*100);
    const arms=clamp(Math.min(champion,challenger)/Math.max(1,cfg.targetPerArm)*100);
    return total*.55+arms*.45;
  }
  function coverageScore(id){ const rep=STRATA?.representativeness?.(id); return clamp(num(rep?.coverage?.percent)); }
  function representationScore(id){ return clamp(num(STRATA?.representativeness?.(id)?.score)); }
  function stabilityScore(ev){
    const c=ev?.champion?.comparisons||[]; const d=ev?.challenger?.comparisons||[];
    const values=[...c,...d].map(r=>num(r?.deltas?.profit ?? r?.target?.metrics?.netProfit)).filter(Number.isFinite);
    if(values.length<2)return values.length?45:20;
    const mean=values.reduce((a,b)=>a+b,0)/values.length;
    const variance=values.reduce((s,v)=>s+Math.pow(v-mean,2),0)/values.length;
    const cv=Math.sqrt(variance)/(Math.abs(mean)+50);
    return clamp(100-cv*70);
  }
  function integrityScore(ev){ return ev?.integrity?.valid===false?0:100; }
  function biasPenalty(id,ev){
    const alerts=STRATA?.biasAlerts?.(id)||[];
    let penalty=alerts.reduce((sum,a)=>sum+(a.severity==='critical'?18:10),0);
    const imbalance=Math.abs(num(ev?.champion?.completed)-num(ev?.challenger?.completed));
    if(imbalance>=3)penalty+=15; else if(imbalance===2)penalty+=8;
    if(!ev?.sufficient)penalty+=6;
    return Math.min(45,penalty);
  }
  function level(score){ return score>=85?'Muito alta':score>=70?'Alta':score>=50?'Moderada':score>=30?'Baixa':'Insuficiente'; }
  function recommendation(score,ev){
    if(ev?.integrity?.valid===false)return 'Revisar integridade antes de qualquer decisão.';
    if(score<30)return 'Coletar mais ciclos comparáveis e reduzir vieses.';
    if(score<50)return 'Ampliar amostra e completar estratos ausentes.';
    if(score<70)return 'Usar como sinal operacional, sem decisão definitiva.';
    if(score<85)return 'Evidência adequada para revisão humana estruturada.';
    return 'Evidência forte para decisão humana, preservando limitações observacionais.';
  }
  function assess(id,persist=true){
    const exp=experiments().find(x=>x.id===id); if(!exp)throw new Error('Experimento não encontrado.');
    const ev=evaluation(id)||{champion:{completed:0,comparisons:[]},challenger:{completed:0,comparisons:[]},completed:0,sufficient:false,integrity:{valid:true},winner:'insufficient'};
    const components={ sample:sampleScore(ev), coverage:coverageScore(id), representation:representationScore(id), stability:stabilityScore(ev), integrity:integrityScore(ev) };
    const penalty=biasPenalty(id,ev);
    const score=clamp(components.sample*.28+components.coverage*.20+components.representation*.22+components.stability*.20+components.integrity*.10-penalty);
    const row={id:`evidence-${id}`,experimentId:id,playbookId:exp.playbookId,playbookTitle:exp.playbookTitle||id,score,level:level(score),components,penalty,winner:ev.winner||'insufficient',sufficient:Boolean(ev.sufficient),recommendation:recommendation(score,ev),assessedAt:nowIso(),signature:'Tehkné Solutions'};
    if(persist)write(KEYS.assessments,[row,...assessments().filter(x=>x.experimentId!==id)].slice(0,1000));
    return row;
  }
  function review(id,note='',confirmation=''){
    const evidence=assess(id); const text=safe(note,1800);
    if(text.length<20)throw new Error('Registre uma revisão com pelo menos 20 caracteres.');
    if(safe(confirmation,40).toLocaleUpperCase('pt-BR')!=='REVISAR')throw new Error('Digite REVISAR para confirmar.');
    const row={id:`evidence-review-${uid()}`,experimentId:id,evidenceScore:evidence.score,evidenceLevel:evidence.level,note:text,reviewedAt:nowIso(),signature:'Tehkné Solutions'};
    write(KEYS.reviews,[row,...reviews()].slice(0,1500)); return row;
  }
  function report(){ const rows=experiments().map(x=>assess(x.id)); return {rows,average:rows.length?rows.reduce((s,x)=>s+x.score,0)/rows.length:0,high:rows.filter(x=>x.score>=70).length,low:rows.filter(x=>x.score<50).length}; }
  function captureSnapshot(reference=today()){
    const data=report(); const row={id:`evidence-snapshot-${reference}`,date:reference,average:data.average,rows:data.rows.map(x=>({experimentId:x.experimentId,score:x.score,level:x.level,penalty:x.penalty,winner:x.winner})),capturedAt:nowIso(),signature:'Tehkné Solutions'};
    write(KEYS.snapshots,[row,...snapshots().filter(x=>x.date!==reference)].slice(0,Math.max(30,num(settings().keepSnapshots,365)))); return row;
  }
  function markdown(){
    const data=report(); const lines=['# Commerce Radar — Qualidade e confiança da evidência','',`Confiança média: ${data.average.toFixed(1)}`,''];
    data.rows.forEach(x=>lines.push(`## ${x.playbookTitle}`,'',`- Nível: ${x.level} (${x.score.toFixed(1)})`,`- Amostra: ${x.components.sample.toFixed(1)}`,`- Cobertura: ${x.components.coverage.toFixed(1)}`,`- Representatividade: ${x.components.representation.toFixed(1)}`,`- Estabilidade: ${x.components.stability.toFixed(1)}`,`- Integridade: ${x.components.integrity.toFixed(1)}`,`- Penalidade por viés: ${x.penalty.toFixed(1)}`,`- Orientação: ${x.recommendation}`,''));
    lines.push('## Limitações','','- O índice é operacional e explicável; não representa probabilidade estatística nem causalidade.','- Decisões de promoção, manutenção e encerramento continuam humanas.','','Tehkné Solutions'); return lines.join('\n');
  }
  function extendCloud(){const apply=()=>{const k=ROOT.CommerceRadarCloud?.dataKeys;if(!k)return false;k.evidenceAssessments=KEYS.assessments;k.evidenceReviews=KEYS.reviews;k.evidenceSnapshots=KEYS.snapshots;k.evidenceSettings=KEYS.settings;return true};if(!apply())ROOT.addEventListener?.('commerce-radar-cloud-ready',apply,{once:true})}
  function inject(){
    if(typeof document==='undefined')return false; const nav=document.getElementById('cycleStratificationNav'); const view=document.getElementById('cycleStratification'); if(!nav||!view||document.getElementById('evidenceConfidenceNav'))return false;
    nav.insertAdjacentHTML('afterend','<button class="nav" id="evidenceConfidenceNav"><span>Confiança da evidência</span><b id="evidenceConfidenceNavCount"></b></button>');
    view.insertAdjacentHTML('afterend','<section class="view" id="evidenceConfidence"><div class="sectionHead"><div><span class="eyebrow">QUALIDADE EXPLICÁVEL</span><h2>Confiança da evidência</h2><p class="muted">Entenda a força operacional de cada conclusão por amostra, cobertura, representatividade, estabilidade, integridade e vieses.</p></div><div class="actions"><button class="btn" id="evidenceCapture">Capturar</button><button class="btn" id="evidenceExport">Exportar relatório</button></div></div><div class="evidenceSummary" id="evidenceSummary"></div><div id="evidenceList"></div></section>');
    const render=()=>{const data=report();document.getElementById('evidenceSummary').innerHTML=[['Média',data.average.toFixed(0),'pontos'],['Alta',data.high,'experimentos'],['Baixa',data.low,'exigem coleta']].map(x=>`<article class="card evidenceMetric"><small>${x[0]}</small><b>${x[1]}</b><span>${x[2]}</span></article>`).join('');document.getElementById('evidenceList').innerHTML=data.rows.map(x=>`<article class="card evidenceCard"><div class="evidenceHead"><div><h3>${x.playbookTitle}</h3><p>${x.recommendation}</p></div><strong>${x.score.toFixed(0)}<small>${x.level}</small></strong></div><div class="evidenceComponents">${Object.entries(x.components).map(([k,v])=>`<div><span>${k}</span><b>${v.toFixed(0)}</b></div>`).join('')}</div>${x.penalty?`<p class="evidencePenalty">Penalidade por viés: ${x.penalty.toFixed(0)}</p>`:''}</article>`).join('')||'<div class="card empty">Nenhum experimento disponível.</div>';document.getElementById('evidenceConfidenceNavCount').textContent=data.low||''};
    document.getElementById('evidenceConfidenceNav').onclick=()=>{document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='evidenceConfidence'));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.id==='evidenceConfidenceNav'));render()};
    document.getElementById('evidenceCapture').onclick=()=>captureSnapshot(); document.getElementById('evidenceExport').onclick=()=>{const u=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`commerce-radar-confianca-evidencia-${today()}.md`;a.click();URL.revokeObjectURL(u)};
    extendCloud(); render(); return true;
  }
  function boot(){if(inject())return;let n=0;const t=setInterval(()=>{n++;if(inject()||n>2000)clearInterval(t)},50)}
  ROOT.CommerceRadarEvidenceConfidence={KEYS,DEFAULTS,settings,assessments,reviews,snapshots,sampleScore,coverageScore,representationScore,stabilityScore,integrityScore,biasPenalty,level,assess,review,report,captureSnapshot,markdown};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()}
})();