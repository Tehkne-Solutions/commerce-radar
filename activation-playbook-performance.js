(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PLAYBOOKS = ROOT.CommerceRadarPlaybooks;
  const RETRO = ROOT.CommerceRadarCycleRetrospective;
  const KEYS = {
    settings: 'tehkne-commerce-radar-v75-playbook-performance-settings',
    snapshots: 'tehkne-commerce-radar-v75-playbook-performance-snapshots',
    reviews: 'tehkne-commerce-radar-v75-playbook-performance-reviews',
  };
  const DEFAULTS = { minimumCompleted: 2, effectiveRate: 70, degradedRate: 40, staleDays: 120, keepSnapshots: 365 };
  const STATUS = {
    effective: 'Eficaz', review: 'Revisar', degraded: 'Degradado', stale: 'Desatualizado', insufficient: 'Amostra insuficiente', unused: 'Nunca aplicado',
  };
  const ACTIONS = { keep: 'Manter', revise: 'Revisar', test_again: 'Testar novamente', archive: 'Arquivar' };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1800) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function saveSettings(patch = {}) { const next = { ...settings(), ...patch }; write(KEYS.settings, next); return next; }
  function snapshots() { return read(KEYS.snapshots, []); }
  function reviews() { return read(KEYS.reviews, []); }
  function playbooks() { return PLAYBOOKS?.playbooks?.() || read('tehkne-commerce-radar-v74-learning-playbooks', []); }
  function applications() { return PLAYBOOKS?.applications?.() || read('tehkne-commerce-radar-v74-playbook-applications', []); }
  function cycles(reference = today()) { return RETRO?.cycleSummaries?.(undefined, undefined, undefined, reference) || []; }

  function daysBetween(from, to = today()) {
    const start = new Date(`${String(from || '').slice(0, 10)}T12:00:00`);
    const end = new Date(`${String(to || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.floor((end - start) / 86400000);
  }

  function completedCycle(cycle) {
    return Boolean(cycle && (cycle.status === 'decided' || cycle.decision || ['validated', 'partial', 'discarded'].includes(cycle.outcome?.id)));
  }

  function compareApplication(application, playbook, cycleMap) {
    const source = cycleMap.get(application.sourcePlanId || playbook?.sourcePlanId);
    const target = cycleMap.get(application.planId);
    const comparable = completedCycle(source) && completedCycle(target);
    if (!source || !target) return { application, playbook, source, target, comparable: false, result: 'pending', reason: 'O ciclo de origem ou o novo ciclo ainda não está disponível.' };
    if (!comparable) return { application, playbook, source, target, comparable: false, result: 'pending', reason: 'O novo ciclo ainda não possui decisão ou resultado conclusivo.' };
    const deltas = {
      score: num(target.score) - num(source.score),
      orders: num(target.metrics?.orders) - num(source.metrics?.orders),
      revenue: num(target.metrics?.revenue) - num(source.metrics?.revenue),
      profit: num(target.metrics?.netProfit) - num(source.metrics?.netProfit),
      margin: num(target.metrics?.netMargin) - num(source.metrics?.netMargin),
      ctr: num(target.metrics?.ctr) - num(source.metrics?.ctr),
      conversion: num(target.metrics?.conversion) - num(source.metrics?.conversion),
    };
    let result = 'partial';
    if (target.outcome?.id === 'validated' && num(target.metrics?.orders) > 0 && num(target.metrics?.netProfit) > 0) result = 'reproduced';
    else if (target.outcome?.id === 'discarded' || num(target.metrics?.netProfit) < 0 || target.decision?.type === 'abandon') result = 'failed';
    return { application, playbook, source, target, comparable: true, result, deltas, reason: result === 'reproduced' ? 'O novo ciclo registrou pedidos e lucro preliminar positivo.' : result === 'failed' ? 'O novo ciclo foi descartado ou terminou com prejuízo preliminar.' : 'O novo ciclo apresentou evidência parcial, sem reprodução completa do resultado.' };
  }

  function classifyPerformance(summary, config = settings(), reference = today()) {
    if (!summary.applications) return { id: 'unused', label: STATUS.unused, action: 'Testar o playbook em um novo ciclo antes de avaliar seu desempenho.' };
    const lastAge = daysBetween(summary.lastAppliedAt, reference);
    if (lastAge !== null && lastAge > num(config.staleDays, 120)) return { id: 'stale', label: STATUS.stale, action: 'Revisar público, oferta, canal e evidências antes de reutilizar.' };
    if (summary.completed < num(config.minimumCompleted, 2)) return { id: 'insufficient', label: STATUS.insufficient, action: `Concluir pelo menos ${num(config.minimumCompleted, 2)} aplicações comparáveis.` };
    const recentFailures = summary.comparisons.slice(0, 2).filter((row) => row.result === 'failed').length;
    if (summary.replicationRate < num(config.degradedRate, 40) || summary.avgScoreDelta <= -20 || recentFailures >= 2) return { id: 'degraded', label: STATUS.degraded, action: 'Suspender novas aplicações e revisar ou arquivar o modelo.' };
    if (summary.replicationRate >= num(config.effectiveRate, 70) && summary.avgScoreDelta >= -10 && summary.profitableRate >= 70) return { id: 'effective', label: STATUS.effective, action: 'Manter publicado e continuar acompanhando novas aplicações.' };
    return { id: 'review', label: STATUS.review, action: 'Revisar oferta, checklist e segmentação antes do próximo ciclo.' };
  }

  function summarizePlaybook(playbook, rawApplications = applications(), rawCycles = cycles(), config = settings(), reference = today()) {
    const cycleMap = new Map(rawCycles.map((cycle) => [cycle.planId, cycle]));
    const rows = rawApplications.filter((row) => row.playbookId === playbook.id).map((row) => compareApplication(row, playbook, cycleMap)).sort((a, b) => String(b.application?.appliedAt).localeCompare(String(a.application?.appliedAt)));
    const comparable = rows.filter((row) => row.comparable);
    const reproduced = comparable.filter((row) => row.result === 'reproduced').length;
    const partial = comparable.filter((row) => row.result === 'partial').length;
    const failed = comparable.filter((row) => row.result === 'failed').length;
    const profitable = comparable.filter((row) => num(row.target?.metrics?.netProfit) > 0).length;
    const average = (field) => comparable.length ? comparable.reduce((sum, row) => sum + num(row.deltas?.[field]), 0) / comparable.length : 0;
    const summary = {
      playbookId: playbook.id, title: playbook.title, status: playbook.status, sourcePlanId: playbook.sourcePlanId,
      applications: rows.length, completed: comparable.length, pending: rows.length - comparable.length, reproduced, partial, failed,
      replicationRate: comparable.length ? reproduced / comparable.length * 100 : 0,
      profitableRate: comparable.length ? profitable / comparable.length * 100 : 0,
      avgScoreDelta: average('score'), avgOrdersDelta: average('orders'), avgProfitDelta: average('profit'), avgMarginDelta: average('margin'),
      lastAppliedAt: rows[0]?.application?.appliedAt || '', comparisons: comparable,
      source: cycleMap.get(playbook.sourcePlanId) || null,
      latestReview: reviews().find((row) => row.playbookId === playbook.id) || null,
    };
    summary.classification = classifyPerformance(summary, config, reference);
    return summary;
  }

  function performanceReport(reference = today(), rawPlaybooks = playbooks(), rawApplications = applications(), rawCycles = cycles(reference), config = settings()) {
    const rows = rawPlaybooks.filter((row) => row.status !== 'draft').map((row) => summarizePlaybook(row, rawApplications, rawCycles, config, reference)).sort((a, b) => {
      const order = { degraded: 0, stale: 1, review: 2, insufficient: 3, unused: 4, effective: 5 };
      return (order[a.classification.id] ?? 9) - (order[b.classification.id] ?? 9) || b.completed - a.completed;
    });
    return {
      reference, rows,
      effective: rows.filter((row) => row.classification.id === 'effective').length,
      attention: rows.filter((row) => ['review', 'degraded', 'stale'].includes(row.classification.id)).length,
      comparable: rows.reduce((sum, row) => sum + row.completed, 0),
      applications: rows.reduce((sum, row) => sum + row.applications, 0),
    };
  }

  function recordReview(playbookId, action, note = '') {
    if (!ACTIONS[action]) throw new Error('Selecione manter, revisar, testar novamente ou arquivar.');
    const playbook = playbooks().find((row) => row.id === playbookId);
    if (!playbook) throw new Error('Playbook não encontrado.');
    const justification = safe(note, 1800);
    if (justification.length < 20) throw new Error('Registre uma justificativa com pelo menos 20 caracteres.');
    const performance = summarizePlaybook(playbook);
    const row = {
      id: `playbook-review-${uid()}`, playbookId, playbookTitle: playbook.title, action, actionLabel: ACTIONS[action], note: justification,
      classification: performance.classification.id, metrics: { completed: performance.completed, replicationRate: performance.replicationRate, avgScoreDelta: performance.avgScoreDelta, avgProfitDelta: performance.avgProfitDelta },
      reviewedAt: nowIso(), signature: 'Tehkné Solutions',
    };
    write(KEYS.reviews, [row, ...reviews()].slice(0, 1000));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-performance-reviewed', { detail: row }));
    return row;
  }

  function executeArchive(playbookId, confirmation = '') {
    const review = reviews().find((row) => row.playbookId === playbookId && row.action === 'archive');
    if (!review) throw new Error('Registre primeiro a decisão de arquivar com justificativa.');
    if (safe(confirmation, 120).toLocaleLowerCase('pt-BR') !== 'arquivar') throw new Error('Digite ARQUIVAR para confirmar a ação.');
    const archived = PLAYBOOKS?.archivePlaybook?.(playbookId);
    if (!archived) throw new Error('Não foi possível arquivar o playbook.');
    const row = { id: `playbook-archive-${uid()}`, playbookId, reviewId: review.id, archivedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.reviews, [row, ...reviews()].slice(0, 1000));
    return archived;
  }

  function capturePerformance(reference = today()) {
    const report = performanceReport(reference);
    const snapshot = {
      id: `playbook-performance-${reference}`, date: reference,
      rows: report.rows.map((row) => ({ playbookId: row.playbookId, title: row.title, classification: row.classification.id, applications: row.applications, completed: row.completed, replicationRate: row.replicationRate, avgScoreDelta: row.avgScoreDelta, avgProfitDelta: row.avgProfitDelta })),
      capturedAt: nowIso(), signature: 'Tehkné Solutions',
    };
    write(KEYS.snapshots, [snapshot, ...snapshots().filter((row) => row.date !== reference)].slice(0, Math.max(30, num(settings().keepSnapshots, 365))));
    return snapshot;
  }

  function performanceMarkdown() {
    const report = performanceReport();
    return [
      '# Commerce Radar — Desempenho dos playbooks', '', `Data: ${report.reference}`, `Playbooks avaliados: ${report.rows.length}`, `Aplicações comparáveis: ${report.comparable}`, '',
      '## Resumo', '', `- Eficazes: ${report.effective}`, `- Exigem atenção: ${report.attention}`, `- Aplicações registradas: ${report.applications}`, '',
      '## Playbooks', '', ...report.rows.flatMap((row) => [
        `### ${row.title}`, '', `- Situação: ${row.classification.label}`, `- Aplicações: ${row.applications}`, `- Concluídas: ${row.completed}`, `- Taxa de reprodução: ${PCT.format(row.replicationRate)}%`, `- Ciclos lucrativos: ${PCT.format(row.profitableRate)}%`, `- Variação média de score: ${PCT.format(row.avgScoreDelta)}`, `- Variação média de lucro: ${BRL.format(row.avgProfitDelta)}`, `- Próxima ação: ${row.classification.action}`, row.latestReview ? `- Última decisão: ${row.latestReview.actionLabel || row.latestReview.action}` : '- Última decisão: não registrada', '',
      ]),
      '## Limitações', '', '- Comparações observacionais não comprovam causalidade.', '- Produtos, canais, públicos, preços e períodos diferentes podem não ser diretamente equivalentes.', '- Lucro e margem permanecem preliminares até auditoria financeira.', '- Nenhum playbook é arquivado automaticamente.', '', 'Tehkné Solutions',
    ].join('\n');
  }

  function toast(message, error = false) {
    let node = $('playbookPerformanceToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'playbookPerformanceToast'; document.body.append(node); }
    if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function renderAll() {
    const report = performanceReport();
    const summary = $('playbookPerformanceSummary');
    if (summary) summary.innerHTML = [['Playbooks', report.rows.length, 'publicados ou arquivados'], ['Aplicações', report.applications, 'ciclos criados'], ['Comparáveis', report.comparable, 'ciclos concluídos'], ['Exigem atenção', report.attention, 'revisar ou arquivar']].map(([label, value, note]) => `<article class="card pbpMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const list = $('playbookPerformanceList');
    if (list) list.innerHTML = report.rows.length ? report.rows.map((row) => `<article class="card pbpCard status-${esc(row.classification.id)}"><div class="pbpHead"><div><span class="eyebrow">${esc(row.classification.label)}</span><h3>${esc(row.title)}</h3><p>${row.completed} aplicação(ões) comparável(is) · ${row.pending} pendente(s)</p></div><strong>${PCT.format(row.replicationRate)}%</strong></div><div class="pbpStats"><span><b>${row.reproduced}</b>Reproduzidos</span><span><b>${row.partial}</b>Parciais</span><span><b>${row.failed}</b>Falhas</span><span><b>${BRL.format(row.avgProfitDelta)}</b>Δ lucro médio</span></div><p class="pbpAction">${esc(row.classification.action)}</p>${row.comparisons.length ? `<details><summary>Comparar aplicações</summary><div class="pbpComparisons">${row.comparisons.map((item) => `<div><b>${esc(item.target?.product || item.application.product)}</b><span>${esc(item.target?.channel || item.application.channel)} · ${esc(item.result)}</span><small>Score ${item.deltas.score >= 0 ? '+' : ''}${PCT.format(item.deltas.score)} · lucro ${BRL.format(item.deltas.profit)} · pedidos ${item.deltas.orders >= 0 ? '+' : ''}${item.deltas.orders}</small></div>`).join('')}</div></details>` : ''}<div class="pbpReview"><select data-pbp-action="${row.playbookId}"><option value="">Registrar decisão</option>${Object.entries(ACTIONS).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select><textarea rows="2" data-pbp-note="${row.playbookId}" placeholder="Justifique com resultados observados"></textarea><button class="btn" data-pbp-save="${row.playbookId}">Salvar decisão</button></div>${row.latestReview?.action === 'archive' && row.status !== 'archived' ? `<div class="pbpArchive"><input data-pbp-confirm="${row.playbookId}" placeholder="Digite ARQUIVAR"><button class="btn" data-pbp-archive="${row.playbookId}">Arquivar agora</button></div>` : ''}</article>`).join('') : '<div class="card empty"><p>Nenhum playbook publicado ou arquivado.</p></div>';
    document.querySelectorAll('[data-pbp-save]').forEach((button) => { button.onclick = () => { const id = button.dataset.pbpSave; try { recordReview(id, document.querySelector(`[data-pbp-action="${id}"]`)?.value, document.querySelector(`[data-pbp-note="${id}"]`)?.value || ''); renderAll(); toast('Decisão de desempenho registrada.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-pbp-archive]').forEach((button) => { button.onclick = () => { const id = button.dataset.pbpArchive; try { executeArchive(id, document.querySelector(`[data-pbp-confirm="${id}"]`)?.value || ''); renderAll(); toast('Playbook arquivado após confirmação explícita.'); } catch (error) { toast(error.message, true); } }; });
    const badge = $('playbookPerformanceNavCount'); if (badge) badge.textContent = report.attention || '';
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'playbookPerformance'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'playbookPerformanceNav'));
    if ($('title')) $('title').textContent = 'Compare a eficácia real dos playbooks';
    document.querySelector('.side')?.classList.remove('open'); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.playbookPerformanceSettings = KEYS.settings; keys.playbookPerformanceSnapshots = KEYS.snapshots; keys.playbookPerformanceReviews = KEYS.reviews; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, snapshots: [], reviews: [] };
    const timer = setInterval(() => {
      attempts += 1; const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!input || !merge || !replace) { if (attempts > 320) clearInterval(timer); return; } clearInterval(timer);
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { settings: payload.playbookPerformanceSettings && typeof payload.playbookPerformanceSettings === 'object' ? payload.playbookPerformanceSettings : {}, snapshots: Array.isArray(payload.playbookPerformanceSnapshots) ? payload.playbookPerformanceSnapshots : [], reviews: Array.isArray(payload.playbookPerformanceReviews) ? payload.playbookPerformanceReviews : [] }; } catch { pending = { settings: {}, snapshots: [], reviews: [] }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.settings, { ...settings(), ...pending.settings }); write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 365)); write(KEYS.reviews, [...new Map([...reviews(), ...pending.reviews].map((item) => [item.id, item])).values()].slice(0, 1000)); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.snapshots, pending.snapshots); write(KEYS.reviews, pending.reviews); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const playbookNav = $('playbookNav'); const playbookView = $('playbookLibrary');
    if (!playbookNav || !playbookView || $('playbookPerformanceNav')) return false;
    playbookNav.insertAdjacentHTML('afterend', '<button class="nav" id="playbookPerformanceNav"><span>Desempenho dos playbooks</span><b id="playbookPerformanceNavCount"></b></button>');
    playbookView.insertAdjacentHTML('afterend', `<section class="view" id="playbookPerformance"><div class="sectionHead"><div><span class="eyebrow">REPRODUÇÃO DE RESULTADOS</span><h2>Desempenho dos playbooks</h2><p class="muted">Compare novos ciclos com suas origens e revise modelos que perderam eficácia, sem atribuir causalidade automática.</p></div><div class="actions"><button class="btn" id="pbpCapture">Capturar desempenho</button><button class="btn" id="pbpExport">Exportar relatório</button></div></div><div class="pbpSummary" id="playbookPerformanceSummary"></div><div id="playbookPerformanceList" class="pbpList"></div><div id="playbookPerformanceToast" class="v021Toast"></div></section>`);
    $('playbookPerformanceNav').onclick = showView;
    $('pbpCapture').onclick = () => { capturePerformance(); toast('Snapshot de desempenho capturado.'); };
    $('pbpExport').onclick = () => { const url = URL.createObjectURL(new Blob([performanceMarkdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-desempenho-playbooks-${today()}.md`; anchor.click(); URL.revokeObjectURL(url); };
    extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-playbook-applied', renderAll); ROOT.addEventListener?.('commerce-radar-playbook-updated', renderAll); ROOT.addEventListener?.('commerce-radar-activation-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || Object.values(PLAYBOOKS?.KEYS || {}).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1600) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarPlaybookPerformance = { KEYS, DEFAULTS, STATUS, ACTIONS, settings, saveSettings, snapshots, reviews, daysBetween, completedCycle, compareApplication, classifyPerformance, summarizePlaybook, performanceReport, recordReview, executeArchive, capturePerformance, performanceMarkdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();