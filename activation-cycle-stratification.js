(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const EXP = ROOT.CommerceRadarPlaybookVersionExperiments;
  const ALLOCATION = ROOT.CommerceRadarAllocationGovernance;
  const KEYS = {
    strata: 'tehkne-commerce-radar-v79-experiment-strata',
    history: 'tehkne-commerce-radar-v79-strata-history',
    recommendations: 'tehkne-commerce-radar-v79-strata-recommendations',
    snapshots: 'tehkne-commerce-radar-v79-strata-snapshots',
    settings: 'tehkne-commerce-radar-v79-strata-settings',
  };
  const DEFAULTS = { minimumPerArm: 1, priceBands: [50, 150, 300, 600], budgetBands: [50, 150, 300, 600], keepSnapshots: 365 };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const safe = (value, max = 180) => String(value ?? '').trim().slice(0, max);
  const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const strata = () => read(KEYS.strata, []);
  const history = () => read(KEYS.history, []);
  const recommendations = () => read(KEYS.recommendations, []);
  const snapshots = () => read(KEYS.snapshots, []);
  const assignments = () => EXP?.assignments?.() || [];
  const experiments = () => EXP?.experiments?.() || [];
  const plans = () => read(ROOT.CommerceRadarActivationPlan?.KEYS?.plans || 'tehkne-commerce-radar-v71-activation-plans', []);

  function band(value, limits, prefix) {
    const amount = num(value);
    const sorted = [...limits].sort((a,b) => a-b);
    let lower = 0;
    for (const upper of sorted) {
      if (amount <= upper) return `${prefix}:${lower}-${upper}`;
      lower = upper + 0.01;
    }
    return `${prefix}:${lower}+`;
  }

  function evidenceBand(plan = {}) {
    const score = num(plan.source?.score || plan.score);
    if (score >= 80) return 'evidence:high';
    if (score >= 60) return 'evidence:medium';
    if (score > 0) return 'evidence:low';
    return 'evidence:unknown';
  }

  function deriveStratum(assignment, plan = {}, metadata = {}) {
    const cfg = settings();
    const product = safe(metadata.product || assignment.product || plan.product || 'sem-produto').toLocaleLowerCase('pt-BR');
    const category = safe(metadata.category || plan.category || plan.source?.category || 'não informada').toLocaleLowerCase('pt-BR');
    const channel = safe(metadata.channel || assignment.channel || plan.channel || 'não informado').toLocaleLowerCase('pt-BR');
    const region = safe(metadata.region || plan.region || 'não informada').toLocaleLowerCase('pt-BR');
    const price = num(metadata.price ?? plan.price ?? plan.unitPrice);
    const budget = num(metadata.budget ?? plan.budget ?? plan.criteria?.maxSpend);
    const dimensions = { product, category, channel, region, priceBand: band(price, cfg.priceBands, 'price'), budgetBand: band(budget, cfg.budgetBands, 'budget'), evidence: evidenceBand(plan) };
    const key = Object.values(dimensions).join('|');
    return { key, dimensions };
  }

  function classifyAssignment(assignmentId, metadata = {}, actor = 'Operação') {
    const assignment = assignments().find(row => row.id === assignmentId);
    if (!assignment) throw new Error('Alocação não encontrada.');
    const plan = plans().find(row => row.id === assignment.planId) || {};
    const derived = deriveStratum(assignment, plan, metadata);
    const previous = strata().find(row => row.assignmentId === assignmentId);
    const row = { id: previous?.id || `stratum-${uid()}`, assignmentId, experimentId: assignment.versionExperimentId, arm: assignment.versionExperimentArm, planId: assignment.planId, product: assignment.product || plan.product || '', channel: assignment.channel || plan.channel || '', stratumKey: derived.key, dimensions: derived.dimensions, source: Object.keys(metadata).length ? 'reviewed' : 'automatic', updatedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.strata, [row, ...strata().filter(item => item.assignmentId !== assignmentId)].slice(0, 3000));
    if (previous && previous.stratumKey !== row.stratumKey) {
      const event = { id: `strata-history-${uid()}`, assignmentId, experimentId: row.experimentId, previousKey: previous.stratumKey, nextKey: row.stratumKey, reason: safe(metadata.reason || 'Reclassificação operacional documentada.', 800), actor: safe(actor, 120), changedAt: nowIso(), signature: 'Tehkné Solutions' };
      write(KEYS.history, [event, ...history()].slice(0, 3000));
    }
    return row;
  }

  function ensureClassified(experimentId) {
    return assignments().filter(row => row.versionExperimentId === experimentId).map(row => strata().find(item => item.assignmentId === row.id) || classifyAssignment(row.id));
  }

  function matrix(experimentId) {
    const rows = ensureClassified(experimentId);
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.stratumKey)) map.set(row.stratumKey, { key: row.stratumKey, dimensions: row.dimensions, champion: 0, challenger: 0, total: 0 });
      const item = map.get(row.stratumKey);
      if (row.arm === 'champion') item.champion += 1;
      if (row.arm === 'challenger') item.challenger += 1;
      item.total += 1;
    }
    return [...map.values()].sort((a,b) => a.key.localeCompare(b.key));
  }

  function coverage(experimentId) {
    const rows = matrix(experimentId);
    const minimum = Math.max(1, num(settings().minimumPerArm));
    const complete = rows.filter(row => row.champion >= minimum && row.challenger >= minimum).length;
    const missingChampion = rows.filter(row => row.champion < minimum).length;
    const missingChallenger = rows.filter(row => row.challenger < minimum).length;
    const percent = rows.length ? complete / rows.length * 100 : 0;
    return { strata: rows.length, complete, missingChampion, missingChallenger, percent, rows };
  }

  function biasAlerts(experimentId) {
    const report = coverage(experimentId);
    const alerts = [];
    if (!report.strata) alerts.push({ id:'no_strata', severity:'warning', label:'Ainda não há ciclos estratificados.' });
    if (report.missingChampion) alerts.push({ id:'missing_champion', severity:'warning', label:`${report.missingChampion} estrato(s) sem cobertura suficiente do champion.` });
    if (report.missingChallenger) alerts.push({ id:'missing_challenger', severity:'warning', label:`${report.missingChallenger} estrato(s) sem cobertura suficiente do challenger.` });
    const channels = new Map();
    for (const row of ensureClassified(experimentId)) {
      const channel = row.dimensions.channel;
      const item = channels.get(channel) || { champion:0, challenger:0 };
      item[row.arm] += 1; channels.set(channel,item);
    }
    if ([...channels.values()].some(row => !row.champion || !row.challenger)) alerts.push({ id:'channel_concentration', severity:'warning', label:'Há canal representado em apenas um dos braços.' });
    return alerts;
  }

  function representativeness(experimentId) {
    const report = coverage(experimentId);
    const alerts = biasAlerts(experimentId);
    const total = report.rows.reduce((sum,row)=>sum+row.total,0);
    const diversity = Math.min(100, report.strata * 20);
    const sample = Math.min(100, total * 12.5);
    const score = Math.max(0, Math.min(100, report.percent * 0.5 + diversity * 0.25 + sample * 0.25 - alerts.length * 8));
    const label = score >= 85 ? 'Excelente' : score >= 70 ? 'Boa' : score >= 50 ? 'Moderada' : score >= 30 ? 'Baixa' : 'Insuficiente';
    return { score, label, coverage: report, alerts };
  }

  function recommend(experimentId) {
    const rows = matrix(experimentId);
    let recommendation;
    if (!rows.length) recommendation = { arm: ALLOCATION?.recommendedArm?.(experimentId) || 'champion', stratumKey: '', dimensions: {}, reason: 'Iniciar a primeira cobertura estratificada.' };
    else {
      const ranked = rows.map(row => ({ ...row, deficit: Math.abs(row.champion-row.challenger), arm: row.champion <= row.challenger ? 'champion' : 'challenger', under: Math.min(row.champion,row.challenger) })).sort((a,b)=>b.deficit-a.deficit || a.under-b.under || a.total-b.total);
      const best = ranked[0];
      recommendation = { arm: best.arm, stratumKey: best.key, dimensions: best.dimensions, reason: `Reduzir diferença de ${Math.abs(best.champion-best.challenger)} ciclo(s) neste estrato.` };
    }
    const row = { id:`strata-recommendation-${uid()}`, experimentId, ...recommendation, createdAt:nowIso(), signature:'Tehkné Solutions' };
    write(KEYS.recommendations, [row, ...recommendations()].slice(0,1000));
    return row;
  }

  function captureSnapshot(reference = today()) {
    const row = { id:`strata-snapshot-${reference}`, date:reference, rows:experiments().map(exp => { const rep=representativeness(exp.id); const rec=recommend(exp.id); return { experimentId:exp.id, playbookId:exp.playbookId, coverage:rep.coverage.percent, representativeness:rep.score, label:rep.label, alerts:rep.alerts.length, recommendedArm:rec.arm, recommendedStratum:rec.stratumKey }; }), capturedAt:nowIso(), signature:'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...snapshots().filter(item=>item.date!==reference)].slice(0,settings().keepSnapshots));
    return row;
  }

  function markdown() {
    const lines=['# Commerce Radar — Estratificação dos ciclos',''];
    for (const exp of experiments()) {
      const rep=representativeness(exp.id); const rec=recommend(exp.id);
      lines.push(`## ${exp.playbookTitle || exp.id}`,'',`- Cobertura: ${rep.coverage.percent.toFixed(1)}%`,`- Representatividade: ${rep.label} (${rep.score.toFixed(1)})`,`- Estratos completos: ${rep.coverage.complete}/${rep.coverage.strata}`,`- Próximo braço recomendado: ${rec.arm}`,`- Estrato recomendado: ${rec.stratumKey || 'primeiro estrato'}`,'');
      rep.alerts.forEach(alert=>lines.push(`- Alerta: ${alert.label}`));
      lines.push('');
    }
    lines.push('## Limitações','','- A estratificação reduz vieses observacionais, mas não substitui randomização estatística.','- Promoção, manutenção e encerramento continuam sendo decisões humanas.','','Tehkné Solutions');
    return lines.join('\n');
  }

  function extendCloud(){ const apply=()=>{ const keys=ROOT.CommerceRadarCloud?.dataKeys; if(!keys)return false; keys.experimentStrata=KEYS.strata; keys.strataHistory=KEYS.history; keys.strataRecommendations=KEYS.recommendations; keys.strataSnapshots=KEYS.snapshots; keys.strataSettings=KEYS.settings; return true; }; if(!apply())ROOT.addEventListener?.('commerce-radar-cloud-ready',apply,{once:true}); }
  function inject(){ if(typeof document==='undefined')return false; const nav=document.getElementById('allocationGovernanceNav') || document.getElementById('playbookVersionExperimentNav'); const view=document.getElementById('allocationGovernance') || document.getElementById('playbookVersionExperiments'); if(!nav||!view||document.getElementById('cycleStratificationNav'))return false; nav.insertAdjacentHTML('afterend','<button class="nav" id="cycleStratificationNav"><span>Estratificação dos ciclos</span><b id="cycleStratificationNavCount"></b></button>'); view.insertAdjacentHTML('afterend','<section class="view" id="cycleStratification"><div class="sectionHead"><div><span class="eyebrow">COMPARAÇÃO HOMOGÊNEA</span><h2>Estratificação dos ciclos</h2><p class="muted">Equilibre produto, categoria, canal, região, preço, orçamento e maturidade da evidência entre champion e challenger.</p></div><div class="actions"><button class="btn" id="strataCapture">Capturar</button><button class="btn" id="strataExport">Exportar relatório</button></div></div><div class="strataSummary" id="strataSummary"></div><div id="strataList"></div></section>');
    const render=()=>{ const list=document.getElementById('strataList'); const summary=document.getElementById('strataSummary'); const reports=experiments().map(exp=>({exp,rep:representativeness(exp.id),rec:recommend(exp.id)})); summary.innerHTML=reports.map(x=>`<article class="card strataMetric"><small>${x.exp.playbookTitle||'Experimento'}</small><b>${x.rep.coverage.percent.toFixed(0)}%</b><span>${x.rep.label}</span></article>`).join(''); list.innerHTML=reports.map(x=>`<article class="card strataCard"><h3>${x.exp.playbookTitle||x.exp.id}</h3><p>Próximo: <b>${x.rec.arm}</b> · ${x.rec.stratumKey||'primeiro estrato'}</p><div class="strataMatrix">${x.rep.coverage.rows.map(r=>`<div><span>${r.dimensions.category} · ${r.dimensions.channel}</span><b>C ${r.champion} × D ${r.challenger}</b></div>`).join('')||'<p class="muted">Sem ciclos classificados.</p>'}</div>${x.rep.alerts.map(a=>`<p class="strataAlert">${a.label}</p>`).join('')}</article>`).join(''); document.getElementById('cycleStratificationNavCount').textContent=reports.filter(x=>x.rep.alerts.length).length||''; };
    document.getElementById('cycleStratificationNav').onclick=()=>{ document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='cycleStratification')); document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.id==='cycleStratificationNav')); render(); };
    document.getElementById('strataCapture').onclick=()=>captureSnapshot(); document.getElementById('strataExport').onclick=()=>{ const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'})); const a=document.createElement('a'); a.href=url;a.download=`commerce-radar-estratificacao-${today()}.md`;a.click();URL.revokeObjectURL(url);}; extendCloud(); render(); return true; }
  function boot(){ if(inject())return; let tries=0; const timer=setInterval(()=>{tries++;if(inject()||tries>2000)clearInterval(timer)},50); }
  ROOT.CommerceRadarCycleStratification={KEYS,DEFAULTS,settings,strata,history,recommendations,snapshots,deriveStratum,classifyAssignment,ensureClassified,matrix,coverage,biasAlerts,representativeness,recommend,captureSnapshot,markdown};
  if(typeof document!=='undefined'){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot(); }
})();