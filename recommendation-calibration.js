(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const RECOMMEND = ROOT.CommerceRadarRecommendations;
  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    opportunities: 'tehkne-commerce-radar-v2-custom-opportunities',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    recommendationSettings: 'tehkne-commerce-radar-v6-recommendation-settings',
    settings: 'tehkne-commerce-radar-v61-calibration-settings',
    predictions: 'tehkne-commerce-radar-v61-calibration-predictions',
    runs: 'tehkne-commerce-radar-v61-calibration-runs',
  };
  const DEFAULTS = {
    horizonDays: 21,
    minimumSample: 8,
    minimumOrders: 3,
    minimumNetMargin: 8,
    positiveScoreThreshold: 64,
    maximumWeightChangePct: 15,
  };
  const COMPONENT_LABELS = {
    market: 'Mercado',
    validation: 'Validação',
    economics: 'Economia',
    readiness: 'Prontidão',
    temporal: 'Atualidade',
    evidence: 'Evidência',
  };
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, num(value)));
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function isoDate(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
  }
  function addDays(value, days) {
    const time = Date.parse(value || '');
    if (!Number.isFinite(time)) return '';
    return new Date(time + Number(days || 0) * 86400000).toISOString().slice(0, 10);
  }
  function daysBetween(start, end = today()) {
    const first = Date.parse(start || '');
    const last = Date.parse(end || '');
    if (!Number.isFinite(first) || !Number.isFinite(last)) return Infinity;
    return Math.floor((last - first) / 86400000);
  }
  function weekStart(value) {
    const date = new Date(`${isoDate(value)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date.toISOString().slice(0, 10);
  }
  function normalizeKey(value) {
    if (RECOMMEND?.normalizeKey) return RECOMMEND.normalizeKey(value);
    return safe(value, 160).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function recommendationSettings() {
    const defaults = RECOMMEND?.DEFAULTS || { weights: { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 } };
    const saved = read(KEYS.recommendationSettings, {});
    return { ...defaults, ...saved, weights: { ...defaults.weights, ...(saved.weights || {}) } };
  }
  function predictions() { return read(KEYS.predictions, []); }
  function runs() { return read(KEYS.runs, []); }
  function input() {
    return {
      signals: read(KEYS.signals, []),
      tests: read(KEYS.tests, []),
      audits: read(KEYS.audits, []),
      analyses: read(KEYS.analyses, []),
      opportunities: read(KEYS.opportunities, []),
      plans: read(KEYS.plans, []),
    };
  }

  function capturePrediction(reference = today(), force = false, sourceInput = input()) {
    if (!RECOMMEND?.buildRanking) return null;
    const ranking = RECOMMEND.buildRanking(sourceInput, reference, recommendationSettings()).map((item) => ({
      key: item.key,
      product: item.product,
      score: item.score,
      confidence: item.confidence,
      classification: item.classification.id,
      components: { ...item.components },
      weights: { ...item.weights },
      latestEvidenceAt: item.latestEvidenceAt,
    }));
    const row = {
      id: `calibration-prediction-${reference}`,
      date: reference,
      weekStart: weekStart(reference),
      ranking,
      createdAt: new Date().toISOString(),
    };
    const current = predictions();
    if (!force && current.some((item) => item.date === reference)) return current.find((item) => item.date === reference);
    write(KEYS.predictions, [row, ...current.filter((item) => item.date !== reference)].slice(0, 365));
    return row;
  }

  function eventDate(row = {}, kind = '') {
    if (kind === 'audit') return isoDate(row.periodEnd || row.updatedAt || row.createdAt);
    return isoDate(row.updatedAt || row.updated || row.createdAt || row.created);
  }
  function fallbackAudit(raw = {}) {
    const gross = Math.max(0, num(raw.grossRevenue));
    const netSales = Math.max(0, gross - Math.max(0, num(raw.discounts)) - Math.max(0, num(raw.refunds)));
    const netShipping = Math.max(0, num(raw.shippingCost) - num(raw.shippingSubsidy));
    const costs = ['productCost', 'marketplaceFees', 'paymentFees', 'taxes', 'advertising', 'packaging', 'otherCosts'].reduce((sum, key) => sum + Math.max(0, num(raw[key])), netShipping);
    const netProfit = netSales - costs;
    return { netSales, netProfit, netMargin: netSales > 0 ? (netProfit / netSales) * 100 : 0 };
  }
  function auditResult(row) { return ROOT.CommerceRadarFinancial?.computeAudit?.(row) || fallbackAudit(row); }
  function inWindow(row, kind, start, end) {
    const date = eventDate(row, kind);
    return Boolean(date && date > start && date <= end);
  }

  function observeOutcome(prediction, sourceInput = input(), config = settings(), reference = today()) {
    const end = addDays(prediction.date, config.horizonDays);
    if (!end || reference < end) return { status: 'pending', end };
    const tests = (sourceInput.tests || []).filter((row) => normalizeKey(row.product) === prediction.key && inWindow(row, 'test', prediction.date, end));
    const audits = (sourceInput.audits || []).filter((row) => normalizeKey(row.product) === prediction.key && inWindow(row, 'audit', prediction.date, end));
    const orders = tests.reduce((sum, row) => sum + Math.max(0, num(row.orders)), 0);
    const validated = tests.some((row) => row.stage === 'validated');
    const discarded = tests.some((row) => row.stage === 'discarded') && !validated;
    const results = audits.map(auditResult);
    const netSales = results.reduce((sum, row) => sum + Math.max(0, num(row.netSales)), 0);
    const netProfit = results.reduce((sum, row) => sum + num(row.netProfit), 0);
    const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
    const profitable = results.length > 0 && netProfit > 0 && netMargin >= config.minimumNetMargin;
    const loss = results.length > 0 && netProfit < 0;
    const success = validated || (orders >= config.minimumOrders && profitable);
    const failure = !success && (discarded || loss);
    const status = success ? 'success' : failure ? 'failure' : 'inconclusive';
    return {
      status,
      end,
      tests: tests.length,
      audits: audits.length,
      orders,
      validated,
      discarded,
      netSales,
      netProfit,
      netMargin,
      profitable,
      loss,
    };
  }

  function predictionRows(rawPredictions = predictions()) {
    const selected = new Map();
    const sorted = [...rawPredictions].sort((a, b) => a.date.localeCompare(b.date));
    for (const snapshot of sorted) {
      for (const row of snapshot.ranking || []) {
        const cohort = `${row.key}|${snapshot.weekStart || weekStart(snapshot.date)}`;
        if (!selected.has(cohort)) selected.set(cohort, { ...row, date: snapshot.date, weekStart: snapshot.weekStart || weekStart(snapshot.date), cohort });
      }
    }
    return [...selected.values()];
  }

  function buildCases(rawPredictions = predictions(), sourceInput = input(), config = settings(), reference = today()) {
    return predictionRows(rawPredictions).map((prediction) => {
      const outcome = observeOutcome(prediction, sourceInput, config, reference);
      const predictedPositive = ['prioritize', 'test'].includes(prediction.classification) || num(prediction.score) >= config.positiveScoreThreshold;
      return { ...prediction, predictedPositive, outcome };
    });
  }

  function metrics(cases = []) {
    const conclusive = cases.filter((row) => ['success', 'failure'].includes(row.outcome.status));
    let tp = 0; let fp = 0; let tn = 0; let fn = 0;
    for (const row of conclusive) {
      if (row.predictedPositive && row.outcome.status === 'success') tp += 1;
      else if (row.predictedPositive && row.outcome.status === 'failure') fp += 1;
      else if (!row.predictedPositive && row.outcome.status === 'failure') tn += 1;
      else if (!row.predictedPositive && row.outcome.status === 'success') fn += 1;
    }
    const total = conclusive.length;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const specificity = tn + fp ? tn / (tn + fp) : 0;
    const accuracy = total ? (tp + tn) / total : 0;
    const brier = total ? conclusive.reduce((sum, row) => {
      const probability = clamp(row.score) / 100;
      const actual = row.outcome.status === 'success' ? 1 : 0;
      return sum + Math.pow(probability - actual, 2);
    }, 0) / total : 0;
    return {
      total,
      pending: cases.filter((row) => row.outcome.status === 'pending').length,
      inconclusive: cases.filter((row) => row.outcome.status === 'inconclusive').length,
      success: conclusive.filter((row) => row.outcome.status === 'success').length,
      failure: conclusive.filter((row) => row.outcome.status === 'failure').length,
      tp, fp, tn, fn, precision, recall, specificity, accuracy, brier,
    };
  }

  function normalizeWeights(raw = {}) {
    const keys = Object.keys(COMPONENT_LABELS);
    const values = Object.fromEntries(keys.map((key) => [key, Math.max(0, num(raw[key]))]));
    const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
    const normalized = Object.fromEntries(keys.map((key) => [key, Math.round((values[key] / total) * 100)]));
    const delta = 100 - Object.values(normalized).reduce((sum, value) => sum + value, 0);
    normalized[keys.sort((a, b) => normalized[b] - normalized[a])[0]] += delta;
    return normalized;
  }

  function componentStats(cases = []) {
    const conclusive = cases.filter((row) => ['success', 'failure'].includes(row.outcome.status) && row.components);
    const success = conclusive.filter((row) => row.outcome.status === 'success');
    const failure = conclusive.filter((row) => row.outcome.status === 'failure');
    const avg = (rows, key) => rows.length ? rows.reduce((sum, row) => sum + num(row.components?.[key]), 0) / rows.length : 0;
    return Object.keys(COMPONENT_LABELS).map((key) => {
      const successAverage = avg(success, key);
      const failureAverage = avg(failure, key);
      return { key, label: COMPONENT_LABELS[key], successAverage, failureAverage, lift: successAverage - failureAverage };
    });
  }

  function suggestWeights(cases = [], currentWeights = recommendationSettings().weights, config = settings()) {
    const report = metrics(cases);
    const stats = componentStats(cases);
    const eligible = report.total >= config.minimumSample && report.success >= 2 && report.failure >= 2 && stats.some((item) => item.lift !== 0);
    if (!eligible) return { eligible: false, current: normalizeWeights(currentWeights), suggested: normalizeWeights(currentWeights), stats, reason: `São necessários pelo menos ${config.minimumSample} resultados conclusivos, incluindo 2 sucessos e 2 falhas.` };
    const sampleFactor = Math.min(1, report.total / 30);
    const maxChange = Math.max(1, config.maximumWeightChangePct) / 100;
    const raw = {};
    for (const item of stats) {
      const current = Math.max(1, num(currentWeights[item.key]));
      const adjustment = clamp((item.lift / 100) * 0.65 * sampleFactor, -maxChange, maxChange);
      raw[item.key] = current * (1 + adjustment);
    }
    return { eligible: true, current: normalizeWeights(currentWeights), suggested: normalizeWeights(raw), stats, reason: 'Sugestão baseada na diferença média entre resultados positivos e negativos.' };
  }

  function calibrationReport(rawPredictions = predictions(), sourceInput = input(), config = settings(), reference = today()) {
    const cases = buildCases(rawPredictions, sourceInput, config, reference);
    const resultMetrics = metrics(cases);
    const suggestion = suggestWeights(cases, recommendationSettings().weights, config);
    return { reference, config, cases, metrics: resultMetrics, suggestion };
  }

  function applySuggestedWeights(report = calibrationReport()) {
    if (!report.suggestion.eligible) return null;
    const current = recommendationSettings();
    const run = {
      id: `calibration-${Date.now()}`,
      appliedAt: new Date().toISOString(),
      sample: report.metrics.total,
      metrics: report.metrics,
      previousWeights: { ...current.weights },
      appliedWeights: { ...report.suggestion.suggested },
      signature: 'Tehkné Solutions',
    };
    write(KEYS.recommendationSettings, { ...current, weights: run.appliedWeights, calibratedAt: run.appliedAt });
    write(KEYS.runs, [run, ...runs()].slice(0, 50));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-calibration-applied', { detail: run }));
    return run;
  }

  function revertLastCalibration() {
    const latest = runs()[0];
    if (!latest?.previousWeights) return null;
    const current = recommendationSettings();
    write(KEYS.recommendationSettings, { ...current, weights: normalizeWeights(latest.previousWeights), calibratedAt: '' });
    const reverted = { ...latest, revertedAt: new Date().toISOString() };
    write(KEYS.runs, [reverted, ...runs().slice(1)]);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-calibration-applied', { detail: { reverted: true } }));
    return reverted;
  }

  function toast(message, error = false) {
    let node = $('calibrationToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'calibrationToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function percent(value) { return `${PCT.format(value * 100)}%`; }
  function renderSummary(report) {
    const node = $('calibrationSummary'); if (!node) return;
    node.innerHTML = [
      ['Amostra conclusiva', report.metrics.total, `${report.metrics.pending} aguardando horizonte`],
      ['Acurácia', percent(report.metrics.accuracy), `${report.metrics.tp} acertos positivos`],
      ['Precisão', percent(report.metrics.precision), `${report.metrics.fp} falsos positivos`],
      ['Recall', percent(report.metrics.recall), `${report.metrics.fn} falsos negativos`],
    ].map(([label, value, note]) => `<article class="card calibrationMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
  }

  function renderMatrix(report) {
    const node = $('calibrationMatrix'); if (!node) return;
    const m = report.metrics;
    node.innerHTML = `<div class="calibrationMatrixGrid"><div></div><b>Resultado positivo</b><b>Resultado negativo</b><b>Previu avanço</b><span class="good">${m.tp}<small>verdadeiros positivos</small></span><span class="bad">${m.fp}<small>falsos positivos</small></span><b>Previu cautela</b><span class="bad">${m.fn}<small>falsos negativos</small></span><span class="good">${m.tn}<small>verdadeiros negativos</small></span></div><p class="muted">Brier score: ${m.total ? m.brier.toFixed(3) : '—'} · quanto menor, melhor a calibração probabilística.</p>`;
  }

  function renderWeights(report) {
    const node = $('calibrationWeights'); if (!node) return;
    const suggestion = report.suggestion;
    node.innerHTML = `<div class="calibrationStatus ${suggestion.eligible ? 'ready' : 'waiting'}"><b>${suggestion.eligible ? 'Calibração disponível' : 'Amostra ainda insuficiente'}</b><p>${esc(suggestion.reason)}</p></div><div class="calibrationWeightRows">${suggestion.stats.map((item) => `<div><span>${esc(item.label)}</span><i><em style="width:${clamp(Math.abs(item.lift))}%"></em></i><b>${item.lift >= 0 ? '+' : ''}${item.lift.toFixed(1)}</b><small>${suggestion.current[item.key]}% → ${suggestion.suggested[item.key]}%</small></div>`).join('')}</div><div class="actions"><button class="btn primary" id="calibrationApply" ${suggestion.eligible ? '' : 'disabled'}>Aplicar pesos sugeridos</button><button class="btn" id="calibrationRevert" ${runs().length ? '' : 'disabled'}>Restaurar pesos anteriores</button></div>`;
    $('calibrationApply').onclick = () => {
      if (!confirm('Aplicar os pesos sugeridos ao ranking? A alteração ficará registrada e poderá ser revertida.')) return;
      const run = applySuggestedWeights(report);
      if (!run) return toast('A amostra ainda não permite calibrar.', true);
      toast('Pesos calibrados e registrados.'); renderAll();
    };
    $('calibrationRevert').onclick = () => { const row = revertLastCalibration(); if (!row) return toast('Não existe calibração para restaurar.', true); toast('Pesos anteriores restaurados.'); renderAll(); };
  }

  function renderCases(report) {
    const node = $('calibrationCases'); if (!node) return;
    const rows = [...report.cases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
    node.innerHTML = rows.length ? `<div class="calibrationTable"><div class="head"><span>Previsão</span><span>Produto</span><span>Score</span><span>Decisão</span><span>Resultado</span><span>Evidência posterior</span></div>${rows.map((row) => `<div><span>${esc(row.date)}</span><b>${esc(row.product)}</b><span>${row.score}/100</span><span>${row.predictedPositive ? 'Avançar' : 'Cautela'}</span><span class="outcome-${row.outcome.status}">${({ success: 'Sucesso', failure: 'Falha', pending: 'Pendente', inconclusive: 'Inconclusivo' })[row.outcome.status]}</span><small>${row.outcome.status === 'pending' ? `avaliar após ${row.outcome.end}` : `${row.outcome.orders || 0} pedido(s) · ${BRL.format(row.outcome.netProfit || 0)} · margem ${PCT.format(row.outcome.netMargin || 0)}%`}</small></div>`).join('')}</div>` : '<div class="empty compact"><p class="muted">Capture rankings e registre resultados posteriores para iniciar a calibração.</p></div>';
  }

  function renderHistory() {
    const node = $('calibrationHistory'); if (!node) return;
    const rows = runs().slice(0, 8);
    node.innerHTML = rows.length ? rows.map((row) => `<article class="calibrationRun"><div><b>${new Date(row.appliedAt).toLocaleString('pt-BR')}</b><span>${row.sample} casos · acurácia ${percent(row.metrics.accuracy)}</span></div><small>${Object.keys(COMPONENT_LABELS).map((key) => `${COMPONENT_LABELS[key]} ${row.previousWeights[key]}→${row.appliedWeights[key]}`).join(' · ')}</small>${row.revertedAt ? '<em>Revertida</em>' : ''}</article>`).join('') : '<p class="muted">Nenhuma calibração aplicada.</p>';
  }

  function renderAll() {
    const report = calibrationReport();
    renderSummary(report); renderMatrix(report); renderWeights(report); renderCases(report); renderHistory();
    const count = $('calibrationNavCount'); if (count) count.textContent = report.metrics.fp + report.metrics.fn ? String(report.metrics.fp + report.metrics.fn) : '';
    return report;
  }

  function exportReport() {
    const report = calibrationReport();
    const lines = [
      '# Calibração do ranking — Commerce Radar', '',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Horizonte: ${report.config.horizonDays} dias`,
      `Amostra conclusiva: ${report.metrics.total}`, '',
      '## Desempenho', '',
      `- Acurácia: ${percent(report.metrics.accuracy)}`,
      `- Precisão: ${percent(report.metrics.precision)}`,
      `- Recall: ${percent(report.metrics.recall)}`,
      `- Falsos positivos: ${report.metrics.fp}`,
      `- Falsos negativos: ${report.metrics.fn}`,
      `- Brier score: ${report.metrics.total ? report.metrics.brier.toFixed(3) : 'não disponível'}`, '',
      '## Pesos', '',
      ...report.suggestion.stats.map((item) => `- ${item.label}: ${report.suggestion.current[item.key]}% → ${report.suggestion.suggested[item.key]}% (diferença entre sucessos e falhas: ${item.lift.toFixed(1)})`), '',
      `Situação: ${report.suggestion.eligible ? 'calibração disponível' : report.suggestion.reason}`, '',
      '## Limites', '',
      '- Correlação histórica não prova causalidade.',
      '- Amostras pequenas podem produzir pesos instáveis.',
      '- O ajuste nunca é aplicado automaticamente.',
      '- Resultados inconclusivos não entram na matriz de acertos.', '',
      'Tehkné Solutions',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-calibracao-${today()}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'recommendationCalibration'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'calibrationNav'));
    if ($('title')) $('title').textContent = 'Meça e calibre o ranking';
    document.querySelector('.side')?.classList.remove('open');
    capturePrediction(); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false;
      keys.calibrationSettings = KEYS.settings; keys.calibrationPredictions = KEYS.predictions; keys.calibrationRuns = KEYS.runs;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, predictions: [], runs: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const inputNode = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !inputNode || !merge || !replace) { if (attempts > 240) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {}; const payload = { version: '0.6.1', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.calibrationSettings = settings(); payload.calibrationPredictions = predictions(); payload.calibrationRuns = runs();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      inputNode.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const payload = JSON.parse(await file.text()); pending = { settings: payload.calibrationSettings && typeof payload.calibrationSettings === 'object' ? payload.calibrationSettings : {}, predictions: Array.isArray(payload.calibrationPredictions) ? payload.calibrationPredictions : [], runs: Array.isArray(payload.calibrationRuns) ? payload.calibrationRuns : [] }; }
        catch { pending = { settings: {}, predictions: [], runs: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.settings, { ...settings(), ...pending.settings }); write(KEYS.predictions, [...new Map([...predictions(), ...pending.predictions].map((item) => [item.id || item.date, item])).values()].slice(0, 365)); write(KEYS.runs, [...new Map([...runs(), ...pending.runs].map((item) => [item.id, item])).values()].slice(0, 50)); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.predictions, pending.predictions); write(KEYS.runs, pending.runs); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = $('recommendationsNav'); const view = $('recommendations');
    if (!nav || !view || $('calibrationNav')) return false;
    nav.insertAdjacentHTML('afterend', '<button class="nav" id="calibrationNav"><span>Calibração do ranking</span><b id="calibrationNavCount"></b></button>');
    view.insertAdjacentHTML('afterend', `<section class="view" id="recommendationCalibration"><div class="sectionHead"><div><span class="eyebrow">APRENDIZADO CONTROLADO</span><h2>Calibração com resultados reais</h2><p class="muted">Compare recomendações anteriores com testes, pedidos e margem posterior. Pesos só mudam com ação explícita.</p></div><div class="actions"><button class="btn" id="calibrationCapture">Capturar previsão</button><button class="btn primary" id="calibrationExport">Exportar relatório</button></div></div><div class="calibrationSummary" id="calibrationSummary"></div><div class="calibrationLayout"><main><article class="card"><div class="sectionHead"><div><span class="eyebrow">MATRIZ</span><h3>Acertos e erros</h3></div></div><div id="calibrationMatrix"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">COORTES</span><h3>Previsões e resultados posteriores</h3></div></div><div id="calibrationCases"></div></article></main><aside><article class="card"><div class="sectionHead"><div><span class="eyebrow">PESOS</span><h3>Sugestão supervisionada</h3></div></div><div id="calibrationWeights"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">HISTÓRICO</span><h3>Alterações aplicadas</h3></div></div><div id="calibrationHistory"></div></article><article class="card"><span class="eyebrow">REGRAS</span><h3>Proteções</h3><ul class="calibrationRules"><li>Resultados inconclusivos não contam como acerto nem erro.</li><li>Amostra mínima exige sucessos e falhas.</li><li>Mudança por peso é limitada.</li><li>O ajuste é reversível.</li><li>Nenhum peso muda automaticamente.</li></ul></article></aside></div><div id="calibrationToast" class="v021Toast"></div></section>`);
    $('calibrationNav').onclick = showView;
    $('calibrationCapture').onclick = () => { capturePrediction(today(), true); toast('Previsão completa capturada para calibração.'); renderAll(); };
    $('calibrationExport').onclick = exportReport;
    extendCloud(); enhanceBackup(); capturePrediction(); renderAll();
    ROOT.addEventListener?.('commerce-radar-calibration-applied', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 320) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarRecommendationCalibration = {
    KEYS, DEFAULTS, weekStart, capturePrediction, observeOutcome, predictionRows, buildCases, metrics, componentStats, suggestWeights, calibrationReport, applySuggestedWeights, revertLastCalibration, normalizeWeights,
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();