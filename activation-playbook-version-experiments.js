(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const VERSIONS = ROOT.CommerceRadarPlaybookVersions;
  const PLAYBOOKS = ROOT.CommerceRadarPlaybooks;
  const ACTIVATION = ROOT.CommerceRadarActivationPlan;
  const PERFORMANCE = ROOT.CommerceRadarPlaybookPerformance;
  const RETRO = ROOT.CommerceRadarCycleRetrospective;
  const KEYS = {
    experiments: 'tehkne-commerce-radar-v77-playbook-version-experiments',
    assignments: 'tehkne-commerce-radar-v77-playbook-version-assignments',
    decisions: 'tehkne-commerce-radar-v77-playbook-version-decisions',
    snapshots: 'tehkne-commerce-radar-v77-playbook-version-experiment-snapshots',
    settings: 'tehkne-commerce-radar-v77-playbook-version-experiment-settings',
  };
  const DEFAULTS = { minimumCompleted: 4, minimumPerArm: 2, winnerGap: 15, profitGap: 50, keepSnapshots: 365 };
  const STATUS = { draft: 'Rascunho', running: 'Em teste', paused: 'Pausado', completed: 'Concluído', promoted: 'Challenger promovido', rejected: 'Champion mantido', blocked: 'Revisão necessária' };
  const ARM = { champion: 'Champion', challenger: 'Challenger' };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 2200) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function experiments() { return read(KEYS.experiments, []); }
  function assignments() { return read(KEYS.assignments, []); }
  function decisions() { return read(KEYS.decisions, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function playbooks() { return PLAYBOOKS?.playbooks?.() || read('tehkne-commerce-radar-v74-learning-playbooks', []); }
  function versions() { return VERSIONS?.versions?.() || read('tehkne-commerce-radar-v76-playbook-versions', []); }
  function candidates() { return VERSIONS?.candidates?.() || read('tehkne-commerce-radar-v76-playbook-version-candidates', []); }
  function cycles(reference = today()) { return RETRO?.cycleSummaries?.(undefined, undefined, undefined, reference) || []; }
  function plansKey() { return ACTIVATION?.KEYS?.plans || 'tehkne-commerce-radar-v71-activation-plans'; }
  function applicationsKey() { return PLAYBOOKS?.KEYS?.applications || 'tehkne-commerce-radar-v74-playbook-applications'; }
  function applications() { return PLAYBOOKS?.applications?.() || read(applicationsKey(), []); }

  function hash(value) { return VERSIONS?.hashSnapshot?.(value) || JSON.stringify(value || {}).length.toString(16); }
  function activeVersion(playbookId) { return VERSIONS?.activeVersion?.(playbookId) || versions().find((row) => row.playbookId === playbookId && row.state === 'active') || null; }
  function activeCandidate(playbookId) { return candidates().find((row) => row.playbookId === playbookId && row.status === 'draft') || null; }

  function createExperiment(playbookId, input = {}) {
    const playbook = playbooks().find((row) => row.id === playbookId);
    if (!playbook || playbook.status !== 'published') throw new Error('Selecione um playbook publicado.');
    VERSIONS?.ensureBaseline?.(playbook);
    const champion = activeVersion(playbookId);
    const challenger = activeCandidate(playbookId);
    if (!champion) throw new Error('A versão champion não está disponível.');
    if (!challenger) throw new Error('Crie uma variante candidata antes de iniciar o experimento.');
    const validation = VERSIONS?.validateCandidate?.(challenger) || { valid: true, errors: [] };
    if (!validation.valid) throw new Error(validation.errors[0]);
    const hypothesis = safe(input.hypothesis || challenger.hypothesis, 1600);
    if (hypothesis.length < 20) throw new Error('Registre uma hipótese com pelo menos 20 caracteres.');
    const existing = experiments().find((row) => row.playbookId === playbookId && ['draft', 'running', 'paused', 'blocked'].includes(row.status));
    if (existing) return existing;
    const row = {
      id: `playbook-version-experiment-${uid()}`,
      playbookId,
      playbookTitle: playbook.title,
      status: 'draft',
      hypothesis,
      champion: { versionId: champion.id, label: champion.label, snapshot: clone(champion.snapshot), snapshotHash: champion.snapshotHash || hash(champion.snapshot) },
      challenger: { candidateId: challenger.id, label: challenger.proposedLabel, snapshot: clone(challenger.snapshot), snapshotHash: hash(challenger.snapshot), baseVersionId: challenger.baseVersionId },
      minimumCompleted: Math.max(2, num(input.minimumCompleted, settings().minimumCompleted)),
      minimumPerArm: Math.max(1, num(input.minimumPerArm, settings().minimumPerArm)),
      winnerGap: Math.max(1, num(input.winnerGap, settings().winnerGap)),
      profitGap: Math.max(0, num(input.profitGap, settings().profitGap)),
      createdAt: nowIso(), startedAt: '', completedAt: '', signature: 'Tehkné Solutions',
    };
    write(KEYS.experiments, [row, ...experiments()].slice(0, 500));
    return row;
  }

  function currentIntegrity(experiment) {
    const champion = activeVersion(experiment.playbookId);
    const candidate = candidates().find((row) => row.id === experiment.challenger.candidateId);
    const championMatches = Boolean(champion && champion.id === experiment.champion.versionId && (champion.snapshotHash || hash(champion.snapshot)) === experiment.champion.snapshotHash);
    const candidateMatches = Boolean(candidate && candidate.status === 'draft' && hash(candidate.snapshot) === experiment.challenger.snapshotHash);
    return { valid: championMatches && candidateMatches, championMatches, candidateMatches, champion, candidate };
  }

  function startExperiment(id) {
    const current = experiments().find((row) => row.id === id);
    if (!current) throw new Error('Experimento não encontrado.');
    if (!['draft', 'paused'].includes(current.status)) throw new Error('O experimento não pode ser iniciado neste estado.');
    const integrity = currentIntegrity(current);
    if (!integrity.valid) throw new Error('Champion ou challenger mudou desde a criação. Revise o experimento.');
    const next = { ...current, status: 'running', startedAt: current.startedAt || nowIso(), updatedAt: nowIso() };
    write(KEYS.experiments, [next, ...experiments().filter((row) => row.id !== id)]);
    return next;
  }

  function pauseExperiment(id) {
    const current = experiments().find((row) => row.id === id);
    if (!current || current.status !== 'running') throw new Error('Somente experimentos em execução podem ser pausados.');
    const next = { ...current, status: 'paused', updatedAt: nowIso() };
    write(KEYS.experiments, [next, ...experiments().filter((row) => row.id !== id)]);
    return next;
  }

  function mergeChecklist(tasks = [], checklist = []) {
    const cleaner = PLAYBOOKS?.cleanChecklist?.(checklist) || checklist || [];
    return tasks.map((task) => {
      const extras = cleaner.filter((item) => Number(item.day) === Number(task.day)).map((item, index) => ({ id: `experiment-${index + 1}-${item.id || uid()}`, label: item.label || String(item), done: false, source: 'playbook-version-experiment' }));
      const existing = new Set((task.checklist || []).map((item) => safe(item.label, 240).toLocaleLowerCase('pt-BR')));
      return { ...task, checklist: [...(task.checklist || []), ...extras.filter((item) => !existing.has(safe(item.label, 240).toLocaleLowerCase('pt-BR')))] };
    });
  }

  function applyArm(experimentId, arm, input = {}) {
    const experiment = experiments().find((row) => row.id === experimentId);
    if (!experiment || experiment.status !== 'running') throw new Error('Inicie o experimento antes de criar ciclos.');
    if (!ARM[arm]) throw new Error('Selecione champion ou challenger.');
    const integrity = currentIntegrity(experiment);
    if (!integrity.valid) throw new Error('A configuração congelada mudou. Pause e revise o experimento.');
    const product = safe(input.product, 160);
    if (!product) throw new Error('Informe o produto do ciclo de teste.');
    const snapshot = clone(experiment[arm].snapshot);
    const channel = safe(input.channel || snapshot.channels?.[0], 80);
    const source = { key: product.toLocaleLowerCase('pt-BR'), product, score: snapshot.sourceSnapshot?.score || 0, confidence: snapshot.confidence || 0, classification: { id: 'version_experiment', label: 'Experimento de versão' }, nextAction: snapshot.strategy?.nextHypothesis || '', channels: [channel] };
    const plan = ACTIVATION?.createPlan?.({
      product, channel, startDate: input.startDate || today(), budget: input.budget,
      minViews: input.minViews ?? snapshot.criteria?.minViews,
      minClicks: input.minClicks ?? snapshot.criteria?.minClicks,
      minOrders: input.minOrders ?? snapshot.criteria?.minOrders,
      minMarginPct: input.minMarginPct ?? snapshot.criteria?.minMarginPct,
      maxSpend: input.maxSpend ?? input.budget ?? snapshot.criteria?.maxSpend,
    }, source);
    if (!plan) throw new Error('Não foi possível criar o ciclo de teste.');
    const versionId = arm === 'champion' ? experiment.champion.versionId : experiment.challenger.candidateId;
    const versionLabel = arm === 'champion' ? experiment.champion.label : experiment.challenger.label;
    const enhanced = {
      ...plan,
      tasks: mergeChecklist(plan.tasks || [], snapshot.checklist || []),
      offerTemplate: clone(snapshot.offer || {}), strategyTemplate: clone(snapshot.strategy || {}),
      playbook: { id: experiment.playbookId, title: experiment.playbookTitle, versionId, versionLabel, experimentId, experimentArm: arm, appliedAt: nowIso() },
      versionExperiment: { id: experiment.id, arm, versionId, versionLabel, frozenHash: experiment[arm].snapshotHash },
      updatedAt: nowIso(),
    };
    const planRows = read(plansKey(), []);
    write(plansKey(), [enhanced, ...planRows.filter((row) => row.id !== enhanced.id)].slice(0, 300));
    const application = {
      id: `playbook-version-assignment-${uid()}`, playbookId: experiment.playbookId, playbookTitle: experiment.playbookTitle,
      planId: enhanced.id, product: enhanced.product, channel: enhanced.channel, sourcePlanId: snapshot.sourcePlanId || '', appliedAt: nowIso(), status: 'draft_created',
      playbookVersionId: versionId, playbookVersionLabel: versionLabel, playbookVersionSource: arm === 'champion' ? 'captured' : 'candidate_shadow',
      versionExperimentId: experiment.id, versionExperimentArm: arm, signature: 'Tehkné Solutions',
    };
    write(KEYS.assignments, [application, ...assignments()].slice(0, 1500));
    write(applicationsKey(), [application, ...applications().filter((row) => row.id !== application.id)].slice(0, 1500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-version-experiment-applied', { detail: application }));
    return { plan: enhanced, application };
  }

  function compareAssignment(assignment, experiment, cycleMap) {
    const playbook = playbooks().find((row) => row.id === experiment.playbookId) || { id: experiment.playbookId, sourcePlanId: assignment.sourcePlanId };
    const comparison = PERFORMANCE?.compareApplication?.(assignment, playbook, cycleMap);
    if (comparison) return { ...comparison, assignment };
    const target = cycleMap.get(assignment.planId);
    const completed = Boolean(target && (target.status === 'decided' || target.decision || ['validated', 'partial', 'discarded'].includes(target.outcome?.id)));
    if (!completed) return { assignment, comparable: false, result: 'pending', target };
    const result = target.outcome?.id === 'validated' && num(target.metrics?.orders) > 0 && num(target.metrics?.netProfit) > 0 ? 'reproduced' : target.outcome?.id === 'discarded' || target.decision?.type === 'abandon' || num(target.metrics?.netProfit) < 0 ? 'failed' : 'partial';
    return { assignment, comparable: true, result, target, deltas: { score: num(target.score), profit: num(target.metrics?.netProfit) } };
  }

  function armMetrics(rows) {
    const comparable = rows.filter((row) => row.comparable);
    const reproduced = comparable.filter((row) => row.result === 'reproduced').length;
    const failed = comparable.filter((row) => row.result === 'failed').length;
    const profitable = comparable.filter((row) => num(row.target?.metrics?.netProfit) > 0).length;
    const avg = (field) => comparable.length ? comparable.reduce((sum, row) => sum + num(row.deltas?.[field]), 0) / comparable.length : 0;
    return { assignments: rows.length, completed: comparable.length, pending: rows.length - comparable.length, reproduced, failed, replicationRate: comparable.length ? reproduced / comparable.length * 100 : 0, profitableRate: comparable.length ? profitable / comparable.length * 100 : 0, avgScoreDelta: avg('score'), avgProfitDelta: avg('profit'), comparisons: comparable };
  }

  function evaluateExperiment(id, reference = today(), rawAssignments = assignments(), rawCycles = cycles(reference)) {
    const experiment = experiments().find((row) => row.id === id);
    if (!experiment) throw new Error('Experimento não encontrado.');
    const cycleMap = new Map(rawCycles.map((cycle) => [cycle.planId, cycle]));
    const rows = rawAssignments.filter((row) => row.versionExperimentId === id).map((row) => compareAssignment(row, experiment, cycleMap));
    const champion = armMetrics(rows.filter((row) => row.assignment.versionExperimentArm === 'champion'));
    const challenger = armMetrics(rows.filter((row) => row.assignment.versionExperimentArm === 'challenger'));
    const completed = champion.completed + challenger.completed;
    const sufficient = completed >= experiment.minimumCompleted && champion.completed >= experiment.minimumPerArm && challenger.completed >= experiment.minimumPerArm;
    const integrity = currentIntegrity(experiment);
    let winner = 'insufficient';
    if (sufficient) {
      const replicationDelta = challenger.replicationRate - champion.replicationRate;
      const profitDelta = challenger.avgProfitDelta - champion.avgProfitDelta;
      if (replicationDelta >= experiment.winnerGap && profitDelta >= -experiment.profitGap) winner = 'challenger';
      else if (profitDelta >= experiment.profitGap && replicationDelta >= -10) winner = 'challenger';
      else if (replicationDelta <= -experiment.winnerGap || profitDelta <= -experiment.profitGap) winner = 'champion';
      else winner = 'tie';
    }
    if (!integrity.valid) winner = 'blocked';
    return { experiment, champion, challenger, completed, sufficient, winner, integrity, replicationDelta: challenger.replicationRate - champion.replicationRate, profitDelta: challenger.avgProfitDelta - champion.avgProfitDelta };
  }

  function completeExperiment(id) {
    const evaluation = evaluateExperiment(id);
    if (!evaluation.sufficient) throw new Error('A amostra mínima ainda não foi atingida.');
    if (!evaluation.integrity.valid) throw new Error('Champion ou challenger mudou; revise o experimento.');
    const current = evaluation.experiment;
    const next = { ...current, status: 'completed', completedAt: nowIso(), result: { winner: evaluation.winner, completed: evaluation.completed, replicationDelta: evaluation.replicationDelta, profitDelta: evaluation.profitDelta }, updatedAt: nowIso() };
    write(KEYS.experiments, [next, ...experiments().filter((row) => row.id !== id)]);
    return next;
  }

  function promoteChallenger(id, review = '', confirmation = '') {
    const evaluation = evaluateExperiment(id);
    if (!evaluation.sufficient || evaluation.winner !== 'challenger') throw new Error('O challenger ainda não possui evidência suficiente para promoção.');
    if (!evaluation.integrity.valid) throw new Error('A configuração mudou e precisa ser revisada antes da promoção.');
    const note = safe(review, 1800);
    if (note.length < 20) throw new Error('Registre uma decisão com pelo menos 20 caracteres.');
    if (safe(confirmation, 80).toLocaleUpperCase('pt-BR') !== 'PROMOVER') throw new Error('Digite PROMOVER para confirmar.');
    const version = VERSIONS?.publishCandidate?.(evaluation.experiment.challenger.candidateId, note, 'PUBLICAR');
    if (!version) throw new Error('Não foi possível publicar a versão challenger.');
    const decision = { id: `playbook-version-decision-${uid()}`, experimentId: id, playbookId: evaluation.experiment.playbookId, action: 'promote', winner: 'challenger', versionId: version.id, versionLabel: version.label, note, metrics: { champion: evaluation.champion, challenger: evaluation.challenger }, decidedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.decisions, [decision, ...decisions()].slice(0, 1000));
    const next = { ...evaluation.experiment, status: 'promoted', completedAt: nowIso(), decisionId: decision.id, updatedAt: nowIso() };
    write(KEYS.experiments, [next, ...experiments().filter((row) => row.id !== id)]);
    return { experiment: next, version, decision };
  }

  function keepChampion(id, note = '', confirmation = '') {
    const evaluation = evaluateExperiment(id);
    if (!evaluation.sufficient) throw new Error('A amostra mínima ainda não foi atingida.');
    const reason = safe(note, 1800);
    if (reason.length < 20) throw new Error('Registre uma decisão com pelo menos 20 caracteres.');
    if (safe(confirmation, 80).toLocaleUpperCase('pt-BR') !== 'MANTER') throw new Error('Digite MANTER para confirmar.');
    const decision = { id: `playbook-version-decision-${uid()}`, experimentId: id, playbookId: evaluation.experiment.playbookId, action: 'keep', winner: evaluation.winner, versionId: evaluation.experiment.champion.versionId, versionLabel: evaluation.experiment.champion.label, note: reason, metrics: { champion: evaluation.champion, challenger: evaluation.challenger }, decidedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.decisions, [decision, ...decisions()].slice(0, 1000));
    const next = { ...evaluation.experiment, status: 'rejected', completedAt: nowIso(), decisionId: decision.id, updatedAt: nowIso() };
    write(KEYS.experiments, [next, ...experiments().filter((row) => row.id !== id)]);
    return { experiment: next, decision };
  }

  function experimentReport(reference = today()) {
    const rows = experiments().map((experiment) => evaluateExperiment(experiment.id, reference));
    return { reference, rows, running: rows.filter((row) => row.experiment.status === 'running').length, ready: rows.filter((row) => row.sufficient && row.integrity.valid && ['challenger', 'champion', 'tie'].includes(row.winner)).length, blocked: rows.filter((row) => !row.integrity.valid).length, assignments: assignments().length };
  }

  function captureSnapshot(reference = today()) {
    const report = experimentReport(reference);
    const row = { id: `playbook-version-experiment-snapshot-${reference}`, date: reference, rows: report.rows.map((item) => ({ experimentId: item.experiment.id, playbookId: item.experiment.playbookId, status: item.experiment.status, winner: item.winner, completed: item.completed, championReplication: item.champion.replicationRate, challengerReplication: item.challenger.replicationRate, profitDelta: item.profitDelta })), capturedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...snapshots().filter((item) => item.date !== reference)].slice(0, Math.max(30, num(settings().keepSnapshots, 365))));
    return row;
  }

  function markdown() {
    const report = experimentReport();
    return ['# Commerce Radar — Experimentos entre versões', '', `Data: ${report.reference}`, `Experimentos: ${report.rows.length}`, `Ciclos atribuídos: ${report.assignments}`, '', ...report.rows.flatMap((item) => [`## ${item.experiment.playbookTitle}`, '', `- Estado: ${STATUS[item.experiment.status] || item.experiment.status}`, `- Champion: ${item.experiment.champion.label}`, `- Challenger: ${item.experiment.challenger.label}`, `- Hipótese: ${item.experiment.hypothesis}`, `- Ciclos concluídos: ${item.completed}`, `- Reprodução champion: ${PCT.format(item.champion.replicationRate)}%`, `- Reprodução challenger: ${PCT.format(item.challenger.replicationRate)}%`, `- Diferença média de lucro: ${BRL.format(item.profitDelta)}`, `- Resultado: ${item.winner}`, '']), '## Controles', '', '- O challenger roda em modo sombra e não altera a versão principal.', '- Champion e challenger são congelados no início.', '- Promoção exige amostra suficiente, revisão humana e confirmação PROMOVER.', '- Nenhuma promoção ou manutenção ocorre automaticamente.', '', 'Tehkné Solutions'].join('\n');
  }

  function toast(message, error = false) { let node = $('playbookVersionExperimentToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'playbookVersionExperimentToast'; document.body.append(node); } if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800); }

  function renderAll() {
    const report = experimentReport();
    const summary = $('playbookVersionExperimentSummary');
    if (summary) summary.innerHTML = [['Experimentos', report.rows.length, 'registrados'], ['Em teste', report.running, 'modo sombra'], ['Prontos', report.ready, 'com amostra'], ['Bloqueados', report.blocked, 'configuração mudou']].map(([label, value, note]) => `<article class="card pbxMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const available = playbooks().filter((playbook) => playbook.status === 'published' && activeCandidate(playbook.id) && !experiments().some((row) => row.playbookId === playbook.id && ['draft', 'running', 'paused', 'blocked'].includes(row.status)));
    const create = $('pbxCreate');
    if (create) create.innerHTML = available.length ? `<select id="pbxPlaybook">${available.map((row) => `<option value="${esc(row.id)}">${esc(row.title)}</option>`).join('')}</select><textarea id="pbxHypothesis" rows="2" placeholder="Hipótese do teste entre versões"></textarea><button class="btn primary" id="pbxCreateButton">Criar experimento</button>` : '<p class="muted">Crie uma variante candidata para iniciar um novo experimento.</p>';
    if ($('pbxCreateButton')) $('pbxCreateButton').onclick = () => { try { createExperiment($('pbxPlaybook').value, { hypothesis: $('pbxHypothesis').value }); renderAll(); toast('Experimento criado com configurações congeladas.'); } catch (error) { toast(error.message, true); } };
    const list = $('playbookVersionExperimentList');
    if (list) list.innerHTML = report.rows.length ? report.rows.map((item) => `<article class="card pbxCard status-${esc(item.experiment.status)}"><div class="pbxHead"><div><span class="eyebrow">${esc(STATUS[item.experiment.status] || item.experiment.status)}</span><h3>${esc(item.experiment.playbookTitle)}</h3><p>${esc(item.experiment.champion.label)} × ${esc(item.experiment.challenger.label)}</p></div><strong>${item.completed}/${item.experiment.minimumCompleted}</strong></div><p>${esc(item.experiment.hypothesis)}</p><div class="pbxArms"><div><b>Champion</b><span>${item.champion.completed} concluído(s)</span><small>Reprodução ${PCT.format(item.champion.replicationRate)}% · Δ lucro ${BRL.format(item.champion.avgProfitDelta)}</small></div><div><b>Challenger</b><span>${item.challenger.completed} concluído(s)</span><small>Reprodução ${PCT.format(item.challenger.replicationRate)}% · Δ lucro ${BRL.format(item.challenger.avgProfitDelta)}</small></div></div><p class="pbxWinner">Resultado atual: <b>${esc(item.winner)}</b></p><div class="actions">${item.experiment.status === 'draft' || item.experiment.status === 'paused' ? `<button class="btn primary" data-pbx-start="${item.experiment.id}">Iniciar</button>` : ''}${item.experiment.status === 'running' ? `<button class="btn" data-pbx-pause="${item.experiment.id}">Pausar</button><button class="btn" data-pbx-arm="champion" data-pbx-id="${item.experiment.id}">Novo champion</button><button class="btn" data-pbx-arm="challenger" data-pbx-id="${item.experiment.id}">Novo challenger</button>` : ''}</div>${item.experiment.status === 'running' ? `<div class="pbxApply" id="pbxApply-${item.experiment.id}"></div>` : ''}${item.sufficient ? `<div class="pbxDecision"><textarea rows="2" data-pbx-note="${item.experiment.id}" placeholder="Decisão baseada nos resultados"></textarea><input data-pbx-confirm="${item.experiment.id}" placeholder="PROMOVER ou MANTER"><button class="btn primary" data-pbx-promote="${item.experiment.id}" ${item.winner !== 'challenger' || !item.integrity.valid ? 'disabled' : ''}>Promover challenger</button><button class="btn" data-pbx-keep="${item.experiment.id}">Manter champion</button></div>` : ''}</article>`).join('') : '<div class="card empty"><p>Nenhum experimento entre versões.</p></div>';
    document.querySelectorAll('[data-pbx-start]').forEach((button) => { button.onclick = () => { try { startExperiment(button.dataset.pbxStart); renderAll(); toast('Experimento iniciado em modo sombra.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-pbx-pause]').forEach((button) => { button.onclick = () => { try { pauseExperiment(button.dataset.pbxPause); renderAll(); toast('Experimento pausado.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-pbx-arm]').forEach((button) => { button.onclick = () => { const id = button.dataset.pbxId; const arm = button.dataset.pbxArm; const target = $(`pbxApply-${id}`); if (!target) return; target.innerHTML = `<div class="card compact"><b>Novo ciclo ${ARM[arm]}</b><input id="pbxProduct-${id}" placeholder="Produto"><input id="pbxChannel-${id}" placeholder="Canal"><input id="pbxBudget-${id}" placeholder="Orçamento em R$"><button class="btn primary" id="pbxApplyButton-${id}">Criar ciclo</button></div>`; $(`pbxApplyButton-${id}`).onclick = () => { try { applyArm(id, arm, { product: $(`pbxProduct-${id}`).value, channel: $(`pbxChannel-${id}`).value, budget: $(`pbxBudget-${id}`).value }); renderAll(); toast(`Ciclo ${ARM[arm]} criado com métricas zeradas.`); } catch (error) { toast(error.message, true); } }; }; });
    document.querySelectorAll('[data-pbx-promote]').forEach((button) => { button.onclick = () => { const id = button.dataset.pbxPromote; try { promoteChallenger(id, document.querySelector(`[data-pbx-note="${id}"]`)?.value || '', document.querySelector(`[data-pbx-confirm="${id}"]`)?.value || ''); renderAll(); toast('Challenger promovido após evidência e confirmação.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-pbx-keep]').forEach((button) => { button.onclick = () => { const id = button.dataset.pbxKeep; try { keepChampion(id, document.querySelector(`[data-pbx-note="${id}"]`)?.value || '', document.querySelector(`[data-pbx-confirm="${id}"]`)?.value || ''); renderAll(); toast('Champion mantido com decisão registrada.'); } catch (error) { toast(error.message, true); } }; });
    const badge = $('playbookVersionExperimentNavCount'); if (badge) badge.textContent = report.running + report.blocked || '';
  }

  function showView() { document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'playbookVersionExperiments')); document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'playbookVersionExperimentNav')); if ($('title')) $('title').textContent = 'Teste variantes sem alterar o playbook principal'; document.querySelector('.side')?.classList.remove('open'); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' }); }

  function extendCloud() { const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.playbookVersionExperiments = KEYS.experiments; keys.playbookVersionAssignments = KEYS.assignments; keys.playbookVersionDecisions = KEYS.decisions; keys.playbookVersionExperimentSnapshots = KEYS.snapshots; keys.playbookVersionExperimentSettings = KEYS.settings; return true; }; if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true }); }

  function enhanceBackup() {
    let attempts = 0; let pending = { experiments: [], assignments: [], decisions: [], snapshots: [], settings: {} };
    const timer = setInterval(() => { attempts += 1; const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore'); if (!input || !merge || !replace) { if (attempts > 380) clearInterval(timer); return; } clearInterval(timer);
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { experiments: Array.isArray(payload.playbookVersionExperiments) ? payload.playbookVersionExperiments : [], assignments: Array.isArray(payload.playbookVersionAssignments) ? payload.playbookVersionAssignments : [], decisions: Array.isArray(payload.playbookVersionDecisions) ? payload.playbookVersionDecisions : [], snapshots: Array.isArray(payload.playbookVersionExperimentSnapshots) ? payload.playbookVersionExperimentSnapshots : [], settings: payload.playbookVersionExperimentSettings && typeof payload.playbookVersionExperimentSettings === 'object' ? payload.playbookVersionExperimentSettings : {} }; } catch { pending = { experiments: [], assignments: [], decisions: [], snapshots: [], settings: {} }; } }, { capture: true });
      const mergeBy = (left, right) => [...new Map([...left, ...right].map((item) => [item.id, item])).values()];
      merge.addEventListener('click', () => { write(KEYS.experiments, mergeBy(experiments(), pending.experiments)); write(KEYS.assignments, mergeBy(assignments(), pending.assignments)); write(KEYS.decisions, mergeBy(decisions(), pending.decisions)); write(KEYS.snapshots, mergeBy(snapshots(), pending.snapshots)); write(KEYS.settings, { ...settings(), ...pending.settings }); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.experiments, pending.experiments); write(KEYS.assignments, pending.assignments); write(KEYS.decisions, pending.decisions); write(KEYS.snapshots, pending.snapshots); write(KEYS.settings, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const versionNav = $('playbookVersionNav'); const versionView = $('playbookVersioning');
    if (!versionNav || !versionView || $('playbookVersionExperimentNav')) return false;
    versionNav.insertAdjacentHTML('afterend', '<button class="nav" id="playbookVersionExperimentNav"><span>Experimentos entre versões</span><b id="playbookVersionExperimentNavCount"></b></button>');
    versionView.insertAdjacentHTML('afterend', `<section class="view" id="playbookVersionExperiments"><div class="sectionHead"><div><span class="eyebrow">MODO SOMBRA</span><h2>Experimentos controlados entre versões</h2><p class="muted">Compare a versão ativa com uma variante candidata em ciclos reais, sem alterar o playbook principal antes da decisão.</p></div><div class="actions"><button class="btn" id="pbxCapture">Capturar experimento</button><button class="btn" id="pbxExport">Exportar relatório</button></div></div><div class="pbxSummary" id="playbookVersionExperimentSummary"></div><article class="card pbxCreate" id="pbxCreate"></article><div class="pbxList" id="playbookVersionExperimentList"></div><div id="playbookVersionExperimentToast" class="v021Toast"></div></section>`);
    $('playbookVersionExperimentNav').onclick = showView;
    $('pbxCapture').onclick = () => { captureSnapshot(); toast('Snapshot dos experimentos capturado.'); };
    $('pbxExport').onclick = () => { const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-experimentos-versoes-${today()}.md`; anchor.click(); URL.revokeObjectURL(url); };
    extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-activation-updated', renderAll); ROOT.addEventListener?.('commerce-radar-playbook-updated', renderAll); ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || Object.values(VERSIONS?.KEYS || {}).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 2000) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarPlaybookVersionExperiments = { KEYS, DEFAULTS, STATUS, ARM, settings, experiments, assignments, decisions, snapshots, createExperiment, currentIntegrity, startExperiment, pauseExperiment, applyArm, compareAssignment, armMetrics, evaluateExperiment, completeExperiment, promoteChallenger, keepChampion, experimentReport, captureSnapshot, markdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();