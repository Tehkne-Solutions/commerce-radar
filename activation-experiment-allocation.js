(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const EXP = ROOT.CommerceRadarPlaybookVersionExperiments;
  const KEYS = {
    policies: 'tehkne-commerce-radar-v78-allocation-policies',
    exceptions: 'tehkne-commerce-radar-v78-allocation-exceptions',
    events: 'tehkne-commerce-radar-v78-allocation-events',
    snapshots: 'tehkne-commerce-radar-v78-allocation-snapshots',
    settings: 'tehkne-commerce-radar-v78-allocation-settings',
  };
  const DEFAULTS = { targetChampionPct: 50, maxImbalance: 1, minimumDays: 7, maximumDays: 30, inactivityDays: 5, keepSnapshots: 365 };
  const $ = id => typeof document !== 'undefined' ? document.getElementById(id) : null;
  const safe = (v, max = 1800) => String(v ?? '').trim().slice(0, max);
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const daysBetween = (a, b) => Math.max(0, Math.floor((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000));
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const policies = () => read(KEYS.policies, []);
  const exceptions = () => read(KEYS.exceptions, []);
  const events = () => read(KEYS.events, []);
  const snapshots = () => read(KEYS.snapshots, []);
  const experiments = () => EXP?.experiments?.() || [];
  const assignments = () => EXP?.assignments?.() || [];

  function policyFor(experimentId) {
    const stored = policies().find(row => row.experimentId === experimentId);
    const cfg = settings();
    return { experimentId, targetChampionPct: cfg.targetChampionPct, maxImbalance: cfg.maxImbalance, minimumDays: cfg.minimumDays, maximumDays: cfg.maximumDays, inactivityDays: cfg.inactivityDays, ...(stored || {}) };
  }
  function savePolicy(experimentId, patch = {}) {
    const current = policyFor(experimentId);
    const next = {
      ...current,
      targetChampionPct: Math.min(90, Math.max(10, num(patch.targetChampionPct, current.targetChampionPct))),
      maxImbalance: Math.max(0, Math.round(num(patch.maxImbalance, current.maxImbalance))),
      minimumDays: Math.max(1, Math.round(num(patch.minimumDays, current.minimumDays))),
      maximumDays: Math.max(1, Math.round(num(patch.maximumDays, current.maximumDays))),
      inactivityDays: Math.max(1, Math.round(num(patch.inactivityDays, current.inactivityDays))),
      stopIfChampionWins: patch.stopIfChampionWins ?? current.stopIfChampionWins ?? true,
      stopIfChallengerWins: patch.stopIfChallengerWins ?? current.stopIfChallengerWins ?? false,
      updatedAt: nowIso(), signature: 'Tehkné Solutions',
    };
    if (next.maximumDays < next.minimumDays) next.maximumDays = next.minimumDays;
    write(KEYS.policies, [next, ...policies().filter(row => row.experimentId !== experimentId)].slice(0, 500));
    record('policy_updated', experimentId, next);
    return next;
  }
  function armCounts(experimentId, rows = assignments()) {
    const scoped = rows.filter(row => row.versionExperimentId === experimentId);
    const champion = scoped.filter(row => row.versionExperimentArm === 'champion').length;
    const challenger = scoped.filter(row => row.versionExperimentArm === 'challenger').length;
    return { champion, challenger, total: champion + challenger, difference: champion - challenger };
  }
  function recommendedArm(experimentId, rows = assignments()) {
    const policy = policyFor(experimentId);
    const counts = armCounts(experimentId, rows);
    if (!counts.total) return policy.targetChampionPct >= 50 ? 'champion' : 'challenger';
    const championTarget = (counts.total + 1) * policy.targetChampionPct / 100;
    return counts.champion < championTarget ? 'champion' : 'challenger';
  }
  function activeException(experimentId, arm, reference = today()) {
    return exceptions().find(row => row.experimentId === experimentId && row.arm === arm && row.status === 'approved' && (!row.expiresAt || row.expiresAt >= reference));
  }
  function allocationCheck(experimentId, arm, rows = assignments(), reference = today()) {
    const experiment = experiments().find(row => row.id === experimentId);
    if (!experiment) return { allowed: false, reason: 'Experimento não encontrado.' };
    if (experiment.status !== 'running') return { allowed: false, reason: 'O experimento precisa estar em execução.' };
    const policy = policyFor(experimentId);
    const counts = armCounts(experimentId, rows);
    const projected = { champion: counts.champion + (arm === 'champion' ? 1 : 0), challenger: counts.challenger + (arm === 'challenger' ? 1 : 0) };
    const imbalance = Math.abs(projected.champion - projected.challenger);
    const recommendation = recommendedArm(experimentId, rows);
    const exception = activeException(experimentId, arm, reference);
    if (imbalance > policy.maxImbalance && arm !== recommendation && !exception) return { allowed: false, reason: `A alocação ficaria desequilibrada. Próximo braço recomendado: ${recommendation}.`, counts, projected, recommendation, imbalance };
    return { allowed: true, counts, projected, recommendation, imbalance, exception: exception || null };
  }
  function requestException(experimentId, arm, reason = '', expiresAt = '') {
    const note = safe(reason);
    if (note.length < 20) throw new Error('Justifique a exceção com pelo menos 20 caracteres.');
    const row = { id: `allocation-exception-${uid()}`, experimentId, arm, reason: note, expiresAt: safe(expiresAt, 10), status: 'approved', approvedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.exceptions, [row, ...exceptions()].slice(0, 1000));
    record('exception_approved', experimentId, row);
    return row;
  }
  function governedApply(experimentId, arm, input = {}) {
    const check = allocationCheck(experimentId, arm);
    if (!check.allowed) throw new Error(check.reason);
    const result = EXP.applyArm(experimentId, arm, input);
    record('cycle_allocated', experimentId, { arm, planId: result.plan?.id || '', assignmentId: result.application?.id || '', projected: check.projected, exceptionId: check.exception?.id || '' });
    return result;
  }
  function stopSignals(experimentId, reference = today()) {
    const experiment = experiments().find(row => row.id === experimentId);
    if (!experiment) return [];
    const policy = policyFor(experimentId);
    const evaluation = EXP.evaluateExperiment(experimentId, reference);
    const start = (experiment.startedAt || experiment.createdAt || `${reference}T00:00:00Z`).slice(0, 10);
    const elapsed = daysBetween(start, reference);
    const scoped = assignments().filter(row => row.versionExperimentId === experimentId).sort((a, b) => String(b.appliedAt).localeCompare(String(a.appliedAt)));
    const last = scoped[0]?.appliedAt?.slice(0, 10) || start;
    const inactive = daysBetween(last, reference);
    const signals = [];
    if (elapsed < policy.minimumDays) signals.push({ level: 'info', id: 'minimum_duration', text: `Duração mínima ainda não cumprida: ${elapsed}/${policy.minimumDays} dias.` });
    if (elapsed >= policy.maximumDays) signals.push({ level: 'critical', id: 'maximum_duration', text: `Duração máxima de ${policy.maximumDays} dias atingida.` });
    if (inactive >= policy.inactivityDays) signals.push({ level: 'warning', id: 'inactivity', text: `Nenhum novo ciclo há ${inactive} dias.` });
    const counts = armCounts(experimentId);
    if (Math.abs(counts.difference) > policy.maxImbalance) signals.push({ level: 'critical', id: 'imbalance', text: `Amostra desequilibrada: champion ${counts.champion}, challenger ${counts.challenger}.` });
    if (evaluation.sufficient && evaluation.winner === 'champion' && policy.stopIfChampionWins) signals.push({ level: 'warning', id: 'champion_wins', text: 'Champion está superior com amostra suficiente; avaliar parada.' });
    if (evaluation.sufficient && evaluation.winner === 'challenger' && policy.stopIfChallengerWins) signals.push({ level: 'warning', id: 'challenger_wins', text: 'Challenger está superior com amostra suficiente; avaliar conclusão.' });
    if (!evaluation.integrity.valid) signals.push({ level: 'critical', id: 'integrity', text: 'Configuração congelada mudou; novas alocações devem ser interrompidas.' });
    return signals;
  }
  function governanceReport(reference = today()) {
    const rows = experiments().map(experiment => { const counts = armCounts(experiment.id); const recommendation = recommendedArm(experiment.id); const signals = stopSignals(experiment.id, reference); return { experiment, policy: policyFor(experiment.id), counts, recommendation, signals, blocked: signals.some(row => row.level === 'critical') }; });
    return { reference, rows, running: rows.filter(row => row.experiment.status === 'running').length, imbalanced: rows.filter(row => row.signals.some(signal => signal.id === 'imbalance')).length, blocked: rows.filter(row => row.blocked).length, exceptions: exceptions().filter(row => row.status === 'approved').length };
  }
  function record(type, experimentId, detail = {}) { const row = { id: `allocation-event-${uid()}`, type, experimentId, detail, at: nowIso(), signature: 'Tehkné Solutions' }; write(KEYS.events, [row, ...events()].slice(0, 2000)); return row; }
  function captureSnapshot(reference = today()) { const report = governanceReport(reference); const row = { id: `allocation-snapshot-${reference}`, date: reference, rows: report.rows.map(item => ({ experimentId: item.experiment.id, champion: item.counts.champion, challenger: item.counts.challenger, recommendation: item.recommendation, signals: item.signals.map(signal => signal.id) })), capturedAt: nowIso(), signature: 'Tehkné Solutions' }; write(KEYS.snapshots, [row, ...snapshots().filter(item => item.date !== reference)].slice(0, settings().keepSnapshots)); return row; }
  function markdown() { const report = governanceReport(); return ['# Commerce Radar — Governança da alocação', '', `Data: ${report.reference}`, `Experimentos em execução: ${report.running}`, `Amostras desequilibradas: ${report.imbalanced}`, '', ...report.rows.flatMap(item => [`## ${item.experiment.playbookTitle}`, '', `- Alocação: champion ${item.counts.champion} × challenger ${item.counts.challenger}`, `- Próximo braço recomendado: ${item.recommendation}`, `- Duração mínima: ${item.policy.minimumDays} dias`, `- Duração máxima: ${item.policy.maximumDays} dias`, `- Alertas: ${item.signals.length ? item.signals.map(row => row.text).join(' | ') : 'nenhum'}`, '']), '## Limites', '', '- Balanceamento reduz viés de alocação, mas não substitui randomização estatística.', '- Critérios de parada geram alertas e nunca encerram o experimento automaticamente.', '- Exceções exigem justificativa e permanecem auditáveis.', '', 'Tehkné Solutions'].join('\n'); }

  function toast(message, error = false) { let node = $('allocationToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'allocationToast'; document.body.append(node); } if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800); }
  function renderAll() {
    const report = governanceReport();
    const summary = $('allocationSummary');
    if (summary) summary.innerHTML = [['Experimentos', report.rows.length], ['Em execução', report.running], ['Desequilibrados', report.imbalanced], ['Exceções', report.exceptions]].map(([label, value]) => `<article class="card alMetric"><small>${label}</small><b>${value}</b></article>`).join('');
    const list = $('allocationList');
    if (list) list.innerHTML = report.rows.length ? report.rows.map(item => `<article class="card alCard"><div><span class="eyebrow">${item.blocked ? 'ATENÇÃO' : 'ALOCAÇÃO'}</span><h3>${safe(item.experiment.playbookTitle, 180)}</h3><p>Champion ${item.counts.champion} × Challenger ${item.counts.challenger} · próximo: <b>${item.recommendation}</b></p></div><div class="alSignals">${item.signals.map(signal => `<span class="${signal.level}">${signal.text}</span>`).join('') || '<span>Sem alertas.</span>'}</div><div class="actions">${item.experiment.status === 'running' ? `<button class="btn" data-al-arm="champion" data-al-id="${item.experiment.id}">Criar champion</button><button class="btn" data-al-arm="challenger" data-al-id="${item.experiment.id}">Criar challenger</button>` : ''}<button class="btn" data-al-policy="${item.experiment.id}">Configurar</button></div><div id="alForm-${item.experiment.id}"></div></article>`).join('') : '<div class="card empty">Nenhum experimento disponível.</div>';
    document.querySelectorAll('[data-al-arm]').forEach(button => button.onclick = () => { const id = button.dataset.alId; const arm = button.dataset.alArm; const target = $(`alForm-${id}`); target.innerHTML = `<input id="alProduct-${id}" placeholder="Produto"><input id="alChannel-${id}" placeholder="Canal"><input id="alBudget-${id}" placeholder="Orçamento em R$"><textarea id="alException-${id}" placeholder="Justificativa opcional para exceção"></textarea><button class="btn primary" id="alApply-${id}">Criar ciclo ${arm}</button>`; $(`alApply-${id}`).onclick = () => { try { const check = allocationCheck(id, arm); if (!check.allowed && safe($(`alException-${id}`).value).length >= 20) requestException(id, arm, $(`alException-${id}`).value); governedApply(id, arm, { product: $(`alProduct-${id}`).value, channel: $(`alChannel-${id}`).value, budget: $(`alBudget-${id}`).value }); renderAll(); toast('Ciclo alocado com governança registrada.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-al-policy]').forEach(button => button.onclick = () => { const id = button.dataset.alPolicy; const policy = policyFor(id); const target = $(`alForm-${id}`); target.innerHTML = `<input id="alBalance-${id}" type="number" min="0" value="${policy.maxImbalance}"><input id="alMinDays-${id}" type="number" min="1" value="${policy.minimumDays}"><input id="alMaxDays-${id}" type="number" min="1" value="${policy.maximumDays}"><input id="alInactive-${id}" type="number" min="1" value="${policy.inactivityDays}"><button class="btn primary" id="alSave-${id}">Salvar política</button>`; $(`alSave-${id}`).onclick = () => { savePolicy(id, { maxImbalance: $(`alBalance-${id}`).value, minimumDays: $(`alMinDays-${id}`).value, maximumDays: $(`alMaxDays-${id}`).value, inactivityDays: $(`alInactive-${id}`).value }); renderAll(); toast('Política de alocação atualizada.'); }; });
    const badge = $('allocationNavCount'); if (badge) badge.textContent = report.blocked || '';
  }
  function showView() { document.querySelectorAll('.view').forEach(view => view.classList.toggle('on', view.id === 'allocationGovernance')); document.querySelectorAll('.nav').forEach(nav => nav.classList.toggle('on', nav.id === 'allocationNav')); if ($('title')) $('title').textContent = 'Governança da alocação dos ciclos'; renderAll(); }
  function extendCloud() { const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.allocationPolicies = KEYS.policies; keys.allocationExceptions = KEYS.exceptions; keys.allocationEvents = KEYS.events; keys.allocationSnapshots = KEYS.snapshots; keys.allocationSettings = KEYS.settings; return true; }; if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true }); }
  function inject() { if (typeof document === 'undefined') return false; const nav = $('playbookVersionExperimentNav'); const view = $('playbookVersionExperiments'); if (!nav || !view || $('allocationNav')) return false; nav.insertAdjacentHTML('afterend', '<button class="nav" id="allocationNav"><span>Governança da alocação</span><b id="allocationNavCount"></b></button>'); view.insertAdjacentHTML('afterend', '<section class="view" id="allocationGovernance"><div class="sectionHead"><div><span class="eyebrow">ALOCAÇÃO CONTROLADA</span><h2>Governança da alocação dos ciclos</h2><p class="muted">Equilibre champion e challenger, controle duração e registre exceções sem encerrar experimentos automaticamente.</p></div><div class="actions"><button class="btn" id="allocationCapture">Capturar</button><button class="btn" id="allocationExport">Exportar relatório</button></div></div><div class="alSummary" id="allocationSummary"></div><div class="alList" id="allocationList"></div><div id="allocationToast" class="v021Toast"></div></section>'); $('allocationNav').onclick = showView; $('allocationCapture').onclick = () => { captureSnapshot(); toast('Snapshot de alocação capturado.'); }; $('allocationExport').onclick = () => { const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-governanca-alocacao-${today()}.md`; anchor.click(); URL.revokeObjectURL(url); }; extendCloud(); renderAll(); ROOT.addEventListener?.('commerce-radar-playbook-version-experiment-applied', renderAll); return true; }
  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 2000) clearInterval(timer); }, 50); }
  ROOT.CommerceRadarAllocationGovernance = { KEYS, DEFAULTS, settings, policies, exceptions, events, snapshots, policyFor, savePolicy, armCounts, recommendedArm, allocationCheck, requestException, governedApply, stopSignals, governanceReport, captureSnapshot, markdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();