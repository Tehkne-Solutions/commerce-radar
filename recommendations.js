(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    custom: 'tehkne-commerce-radar-v2-custom-opportunities',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    settings: 'tehkne-commerce-radar-v6-recommendation-settings',
    snapshots: 'tehkne-commerce-radar-v6-recommendation-snapshots',
    decisions: 'tehkne-commerce-radar-v6-recommendation-decisions',
  };

  const DEFAULTS = {
    weights: { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 },
    minimumConfidence: 35,
    showInsufficient: true,
  };
  const STAGE_SCORE = { idea: 10, research: 28, content: 45, conversion: 68, validated: 100, discarded: 0 };
  const QUALITY_WEIGHT = { real: 1, partial: 0.72, estimated: 0.48, incomplete: 0.25 };
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, num(value)));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

  function read(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; }
    catch { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function normalizeKey(value) {
    return safe(value, 160).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function isoDate(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
  }
  function ageDays(value, reference = today()) {
    const start = Date.parse(value || '');
    const end = Date.parse(reference || '');
    if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity;
    return Math.max(0, Math.floor((end - start) / 86400000));
  }
  function recencyScore(value, reference = today()) {
    const age = ageDays(value, reference);
    if (!Number.isFinite(age)) return 0;
    if (age <= 7) return 100;
    if (age <= 30) return 100 - ((age - 7) / 23) * 20;
    if (age <= 90) return 80 - ((age - 30) / 60) * 30;
    if (age <= 180) return 50 - ((age - 90) / 90) * 30;
    if (age <= 365) return 20 - ((age - 180) / 185) * 20;
    return 0;
  }
  function latestDate(rows = [], fields = ['updatedAt', 'updated', 'createdAt', 'created']) {
    const dates = rows.flatMap((row) => fields.map((field) => isoDate(row?.[field]))).filter(Boolean).sort().reverse();
    return dates[0] || '';
  }
  function settings() {
    const saved = read(KEYS.settings, {});
    return { ...DEFAULTS, ...saved, weights: { ...DEFAULTS.weights, ...(saved.weights || {}) } };
  }
  function snapshots() { return read(KEYS.snapshots, []); }
  function decisions() { return read(KEYS.decisions, []); }

  function fallbackAuditResult(raw = {}) {
    const gross = Math.max(0, num(raw.grossRevenue));
    const netSales = Math.max(0, gross - Math.max(0, num(raw.discounts)) - Math.max(0, num(raw.refunds)));
    const netShipping = Math.max(0, num(raw.shippingCost) - num(raw.shippingSubsidy));
    const totalCosts = ['productCost', 'marketplaceFees', 'paymentFees', 'taxes', 'advertising', 'packaging', 'otherCosts'].reduce((sum, key) => sum + Math.max(0, num(raw[key])), netShipping);
    const netProfit = netSales - totalCosts;
    return { audit: raw, netSales, totalCosts, netProfit, netMargin: netSales > 0 ? (netProfit / netSales) * 100 : 0, status: netProfit < 0 ? 'loss' : netSales && netProfit / netSales < 0.1 ? 'attention' : 'profit' };
  }

  function scoreTests(rows = [], reference = today()) {
    if (!rows.length) return { available: false, score: 0, orders: 0, revenue: 0, investment: 0, conversion: 0, roi: 0, stage: 'none', latestAt: '' };
    const stage = rows.reduce((best, row) => (STAGE_SCORE[row.stage] ?? 0) > (STAGE_SCORE[best] ?? 0) ? row.stage : best, 'idea');
    const orders = rows.reduce((sum, row) => sum + Math.max(0, num(row.orders)), 0);
    const revenue = rows.reduce((sum, row) => sum + Math.max(0, num(row.revenue)), 0);
    const investment = rows.reduce((sum, row) => sum + Math.max(0, num(row.investment)), 0);
    const clicks = rows.reduce((sum, row) => sum + Math.max(0, num(row.clicks)), 0);
    const conversion = clicks > 0 ? orders / clicks : 0;
    const roi = investment > 0 ? revenue / investment : orders > 0 ? 2 : 0;
    const orderScore = Math.min(100, orders * 16);
    const conversionScore = Math.min(100, (conversion / 0.05) * 100);
    const efficiencyScore = Math.min(100, roi * 40);
    const latestAt = latestDate(rows);
    const temporal = recencyScore(latestAt, reference);
    let score = (STAGE_SCORE[stage] || 0) * 0.35 + orderScore * 0.25 + conversionScore * 0.15 + efficiencyScore * 0.15 + temporal * 0.10;
    if (rows.some((row) => row.stage === 'discarded') && !rows.some((row) => row.stage === 'validated')) score = Math.min(score, 20);
    return { available: true, score: Math.round(clamp(score)), orders, revenue, investment, conversion, roi, stage, latestAt };
  }

  function scoreEconomics(rows = [], analyses = [], reference = today()) {
    if (rows.length) {
      let totalWeight = 0;
      let weightedMargin = 0;
      let weightedProfit = 0;
      let weightedScore = 0;
      let losses = 0;
      let latestAt = '';
      for (const row of rows) {
        const result = ROOT.CommerceRadarFinancial?.computeAudit?.(row) || fallbackAuditResult(row);
        const quality = QUALITY_WEIGHT[row.quality] ?? 0.25;
        const date = isoDate(row.periodEnd || row.updatedAt || row.createdAt);
        const recency = Math.max(0.25, recencyScore(date, reference) / 100);
        const weight = quality * recency;
        const marginScore = clamp((result.netMargin + 5) * 2.5);
        const profitabilityScore = result.netProfit > 0 ? Math.min(100, 55 + Math.log10(result.netProfit + 1) * 12) : Math.max(0, 40 + result.netMargin * 2);
        weightedScore += (marginScore * 0.7 + profitabilityScore * 0.3) * weight;
        weightedMargin += result.netMargin * weight;
        weightedProfit += result.netProfit * weight;
        totalWeight += weight;
        if (result.netProfit < 0) losses += 1;
        if (date > latestAt) latestAt = date;
      }
      return {
        available: true,
        source: 'audit',
        score: Math.round(clamp(weightedScore / Math.max(totalWeight, 0.01))),
        netMargin: weightedMargin / Math.max(totalWeight, 0.01),
        netProfit: weightedProfit / Math.max(totalWeight, 0.01),
        losses,
        quality: Math.round((totalWeight / rows.length) * 100),
        latestAt,
      };
    }
    if (analyses.length) {
      const latest = [...analyses].sort((a, b) => String(b.created || b.createdAt || '').localeCompare(String(a.created || a.createdAt || '')))[0];
      const margin = num(latest.margin);
      return { available: true, source: 'analysis', score: Math.round(clamp(margin * 1.6)), netMargin: margin, netProfit: num(latest.profit), losses: margin < 0 ? 1 : 0, quality: 35, latestAt: isoDate(latest.created || latest.createdAt) };
    }
    return { available: false, source: 'none', score: 0, netMargin: 0, netProfit: 0, losses: 0, quality: 0, latestAt: '' };
  }

  function scoreReadiness(analyses = [], opportunities = [], plans = [], trend = null) {
    const analysisScore = analyses.length ? Math.max(...analyses.map((row) => clamp(row.score))) : 0;
    const opportunityScore = opportunities.length ? Math.max(...opportunities.map((row) => clamp(row.score))) : 0;
    const base = Math.max(analysisScore, opportunityScore);
    const requiredCapital = opportunities.length ? Math.min(...opportunities.map((row) => Math.max(0, num(row.capital))).filter((value) => value >= 0)) : 0;
    const latestPlan = [...plans].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0];
    const availableCash = latestPlan ? Math.max(0, num(latestPlan.openingCash)) : 0;
    const capitalFit = requiredCapital <= 0 ? 100 : latestPlan ? clamp((availableCash / requiredCapital) * 100) : 35;
    const risk = trend ? clamp(((6 - num(trend.risk, 3)) / 5) * 100) : analyses.length ? clamp(((6 - num(analyses[0].risk, 3)) / 5) * 100) : 50;
    const score = base ? base * 0.55 + capitalFit * 0.25 + risk * 0.20 : capitalFit * 0.45 + risk * 0.55;
    return { available: Boolean(base || opportunities.length || latestPlan), score: Math.round(clamp(score)), analysisScore: base, requiredCapital, availableCash, capitalFit, risk };
  }

  function scoreTemporal(trend, testResult, economics, reference = today()) {
    const parts = [];
    if (trend) {
      const activeRatio = trend.signals ? trend.activeSignals / trend.signals : 0;
      parts.push({ value: trend.allExpired ? 0 : recencyScore(trend.freshestAt, reference) * 0.65 + activeRatio * 100 * 0.35, weight: 0.55 });
    }
    if (testResult.available) parts.push({ value: recencyScore(testResult.latestAt, reference), weight: 0.25 });
    if (economics.available) parts.push({ value: recencyScore(economics.latestAt, reference), weight: 0.20 });
    if (!parts.length) return { available: false, score: 0 };
    const total = parts.reduce((sum, item) => sum + item.weight, 0);
    return { available: true, score: Math.round(clamp(parts.reduce((sum, item) => sum + item.value * item.weight, 0) / total)) };
  }

  function evidenceScore({ trend, testResult, economics, analyses, opportunities }) {
    const domains = [Boolean(trend), testResult.available, economics.available, analyses.length > 0, opportunities.length > 0];
    const coverage = domains.filter(Boolean).length / domains.length;
    const sourceStrength = trend ? Math.min(100, trend.sources * 28 + trend.activeSignals * 8) : 0;
    const auditStrength = economics.available ? economics.quality : 0;
    const score = coverage * 60 + sourceStrength * 0.25 + auditStrength * 0.15;
    return { score: Math.round(clamp(score)), coverage: Math.round(coverage * 100), domains: domains.filter(Boolean).length };
  }

  function classify(score, confidence, flags = {}) {
    if (confidence < 30) return { id: 'insufficient', label: 'Coletar dados' };
    if (flags.loss || flags.discarded) return score >= 65 ? { id: 'review', label: 'Revisar antes de avançar' } : { id: 'pause', label: 'Pausar' };
    if (score >= 80 && confidence >= 65) return { id: 'prioritize', label: 'Priorizar' };
    if (score >= 64) return { id: 'test', label: 'Testar agora' };
    if (score >= 48) return { id: 'monitor', label: 'Monitorar' };
    return { id: 'pause', label: 'Pausar' };
  }

  function buildRecommendation(candidate, config = DEFAULTS, reference = today()) {
    const weights = { ...DEFAULTS.weights, ...(config.weights || {}) };
    const trend = candidate.trend || null;
    const testResult = scoreTests(candidate.tests, reference);
    const economics = scoreEconomics(candidate.audits, candidate.analyses, reference);
    const readiness = scoreReadiness(candidate.analyses, candidate.opportunities, candidate.plans, trend);
    const temporal = scoreTemporal(trend, testResult, economics, reference);
    const evidence = evidenceScore({ trend, testResult, economics, analyses: candidate.analyses, opportunities: candidate.opportunities });
    const components = {
      market: trend?.score || 0,
      validation: testResult.score,
      economics: economics.score,
      readiness: readiness.score,
      temporal: temporal.score,
      evidence: evidence.score,
    };
    const weightTotal = Object.values(weights).reduce((sum, value) => sum + Math.max(0, num(value)), 0) || 100;
    let score = Object.entries(components).reduce((sum, [key, value]) => sum + value * (Math.max(0, num(weights[key])) / weightTotal), 0);
    const penalties = [];
    if (trend?.contradiction) { score -= 8; penalties.push('Fontes relevantes apresentam sinais contraditórios.'); }
    if (trend?.allExpired) { score -= 12; penalties.push('Todas as evidências de tendência estão vencidas.'); }
    if (testResult.stage === 'discarded') { score -= 18; penalties.push('O teste mais avançado foi descartado.'); }
    if (economics.losses > 0) { score -= Math.min(18, 8 + economics.losses * 3); penalties.push('Há auditoria com prejuízo registrado.'); }
    score = Math.round(clamp(score));
    const confidence = Math.round(clamp(evidence.score * 0.65 + temporal.score * 0.20 + (economics.available ? economics.quality : 0) * 0.15));
    const classification = classify(score, confidence, { loss: economics.losses > 0, discarded: testResult.stage === 'discarded' });
    const positives = [];
    if (trend?.score >= 68) positives.push(`Sinal de mercado ${trend.status.toLocaleLowerCase('pt-BR')} com ${trend.sources} fonte(s).`);
    if (testResult.orders > 0) positives.push(`${testResult.orders} pedido(s) registrado(s) em testes.`);
    if (testResult.stage === 'validated') positives.push('Existe teste marcado como validado.');
    if (economics.netMargin >= 15) positives.push(`Margem líquida observada de ${PCT.format(economics.netMargin)}%.`);
    if (readiness.capitalFit >= 100 && readiness.requiredCapital > 0) positives.push('O caixa informado cobre o capital inicial da oportunidade.');
    if (temporal.score >= 75) positives.push('As principais evidências são recentes.');
    const gaps = [];
    if (!trend) gaps.push('Cadastrar sinais de mercado com fonte e validade.');
    else if (trend.allExpired) gaps.push('Atualizar as fontes vencidas.');
    if (!testResult.available) gaps.push('Executar um teste mensurável.');
    else if (!testResult.orders) gaps.push('Confirmar conversão ou pedidos no teste.');
    if (!economics.available) gaps.push('Registrar custos e margem real.');
    else if (economics.source === 'analysis') gaps.push('Substituir margem estimada por auditoria financeira.');
    if (!candidate.opportunities.length && !candidate.analyses.length) gaps.push('Definir oferta, canal e capital necessário.');
    let nextAction = 'Comparar com outras oportunidades.';
    if (!trend || trend.allExpired) nextAction = 'Atualizar ou cadastrar evidências de mercado.';
    else if (!testResult.available) nextAction = 'Criar um teste pequeno com métricas de clique e pedido.';
    else if (!testResult.orders) nextAction = 'Ajustar oferta e buscar a primeira conversão mensurável.';
    else if (!economics.available || economics.source === 'analysis') nextAction = 'Auditar custo, taxas, frete e margem líquida.';
    else if (economics.losses) nextAction = 'Corrigir a economia unitária antes de investir novamente.';
    else if (classification.id === 'prioritize') nextAction = 'Preparar uma rodada controlada de lançamento.';
    const dates = [trend?.freshestAt, testResult.latestAt, economics.latestAt].filter(Boolean).sort().reverse();
    return {
      key: candidate.key,
      product: candidate.name,
      score,
      confidence,
      classification,
      components,
      weights,
      trend,
      testResult,
      economics,
      readiness,
      temporal,
      evidence,
      positives,
      penalties,
      gaps,
      nextAction,
      latestEvidenceAt: dates[0] || '',
      channels: [...new Set([...candidate.tests.map((row) => row.channel), ...candidate.audits.map((row) => row.channel), ...candidate.opportunities.map((row) => row.channel), ...candidate.analyses.flatMap((row) => (row.channels || []).slice(0, 1).map((item) => item.name))].filter(Boolean))],
    };
  }

  function buildCandidates(input = {}, reference = today()) {
    const trendsApi = ROOT.CommerceRadarTrends;
    const trendAggregates = trendsApi?.aggregateSignals ? trendsApi.aggregateSignals(input.signals || [], reference) : [];
    const candidates = new Map();
    const ensure = (name) => {
      const key = normalizeKey(name);
      if (!key) return null;
      if (!candidates.has(key)) candidates.set(key, { key, name: safe(name, 140), trend: null, tests: [], audits: [], analyses: [], opportunities: [], plans: input.plans || [] });
      return candidates.get(key);
    };
    for (const trend of trendAggregates) { const row = ensure(trend.topic); if (row) row.trend = trend; }
    for (const test of input.tests || []) { const row = ensure(test.product); if (row) row.tests.push(test); }
    for (const audit of input.audits || []) { const row = ensure(audit.product); if (row) row.audits.push(audit); }
    for (const analysis of input.analyses || []) { const row = ensure(analysis.product); if (row) row.analyses.push(analysis); }
    for (const opportunity of input.opportunities || []) { const row = ensure(opportunity.name); if (row) row.opportunities.push(opportunity); }
    return [...candidates.values()];
  }

  function buildRanking(input = {}, reference = today(), config = DEFAULTS) {
    return buildCandidates(input, reference).map((candidate) => buildRecommendation(candidate, config, reference)).sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.product.localeCompare(b.product));
  }

  function loadInput() {
    return {
      signals: read(KEYS.signals, []), tests: read(KEYS.tests, []), audits: read(KEYS.audits, []), analyses: read(KEYS.analyses, []), opportunities: read(KEYS.custom, []), plans: read(KEYS.plans, []),
    };
  }

  function previousSnapshot(reference = today()) {
    return snapshots().filter((item) => item.date < reference).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }

  function applyDeltas(ranking, reference = today()) {
    const previous = previousSnapshot(reference);
    const prior = new Map((previous?.ranking || []).map((item) => [item.key, item]));
    return ranking.map((item) => ({ ...item, delta: prior.has(item.key) ? item.score - num(prior.get(item.key).score) : null }));
  }

  function captureSnapshot(reference = today(), force = false) {
    const ranking = buildRanking(loadInput(), reference, settings()).map((item) => ({ key: item.key, product: item.product, score: item.score, confidence: item.confidence, classification: item.classification.id, latestEvidenceAt: item.latestEvidenceAt }));
    const row = { id: `recommendation-${reference}`, date: reference, ranking, createdAt: new Date().toISOString() };
    const current = snapshots();
    if (!force && current.some((item) => item.date === reference)) return current.find((item) => item.date === reference);
    write(KEYS.snapshots, [row, ...current.filter((item) => item.date !== reference)].slice(0, 180));
    return row;
  }

  function saveDecision(key, decision, note = '') {
    const row = { id: key, key, decision: safe(decision, 40), note: safe(note, 600), updatedAt: new Date().toISOString() };
    write(KEYS.decisions, [row, ...decisions().filter((item) => item.key !== key)].slice(0, 300));
    return row;
  }

  function createTest(recommendation) {
    const rows = read(KEYS.tests, []);
    const channel = recommendation.channels[0] || 'Shopee';
    const row = { id: `recommendation-test-${uid()}`, product: recommendation.product, channel, stage: 'research', investment: 0, revenue: 0, views: 0, clicks: 0, orders: 0, next: recommendation.nextAction, notes: `Criado pela recomendação explicável. Score ${recommendation.score}/100; confiança ${recommendation.confidence}%.`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    write(KEYS.tests, [row, ...rows]);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-recommendation-action', { detail: { type: 'test', product: recommendation.product } }));
    return row;
  }

  function toast(message, error = false) {
    let node = $('recommendationToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'recommendationToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3600);
  }

  function currentRanking() { return applyDeltas(buildRanking(loadInput(), today(), settings())); }

  function renderSummary(rows) {
    const node = $('recommendationSummary'); if (!node) return;
    const prioritized = rows.filter((item) => item.classification.id === 'prioritize').length;
    const test = rows.filter((item) => item.classification.id === 'test').length;
    const stale = rows.filter((item) => item.trend?.allExpired || (item.latestEvidenceAt && recencyScore(item.latestEvidenceAt) < 40)).length;
    const gaps = rows.filter((item) => item.confidence < settings().minimumConfidence).length;
    node.innerHTML = [['Priorizar', prioritized, 'evidência forte'], ['Testar agora', test, 'próxima validação'], ['Desatualizadas', stale, 'perderam peso'], ['Dados insuficientes', gaps, 'precisam de evidência']].map(([label, value, note]) => `<article class="card recommendationMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const count = $('recommendationsNavCount'); if (count) count.textContent = prioritized + test ? String(prioritized + test) : '';
  }

  function filteredRanking(rows) {
    const query = normalizeKey($('recommendationSearch')?.value || '');
    const status = $('recommendationStatus')?.value || 'all';
    const confidence = num($('recommendationConfidence')?.value, 0);
    return rows.filter((item) => (!query || normalizeKey(`${item.product} ${item.positives.join(' ')} ${item.penalties.join(' ')}`).includes(query)) && (status === 'all' || item.classification.id === status) && item.confidence >= confidence);
  }

  function bar(label, value) { return `<div><span>${label}</span><i><em style="width:${clamp(value)}%"></em></i><b>${Math.round(value)}</b></div>`; }

  function renderRanking() {
    const all = currentRanking(); renderSummary(all);
    const rows = filteredRanking(all);
    const node = $('recommendationGrid'); if (!node) return;
    if (!rows.length) { node.innerHTML = '<div class="card empty"><h3>Nenhuma recomendação encontrada</h3><p class="muted">Adicione fontes, testes ou auditorias e ajuste os filtros.</p></div>'; return; }
    const decisionMap = new Map(decisions().map((item) => [item.key, item]));
    node.innerHTML = rows.map((item, index) => {
      const decision = decisionMap.get(item.key);
      const cls = item.classification.id;
      const delta = item.delta === null ? 'novo' : item.delta > 0 ? `+${item.delta}` : String(item.delta);
      return `<article class="card recommendationCard status-${cls}">
        <div class="recommendationHead"><div><span class="recommendationRank">#${index + 1}</span><span class="recommendationStatus">${esc(item.classification.label)}</span><h3>${esc(item.product)}</h3><p>${item.channels.length ? esc(item.channels.join(' · ')) : 'Canal ainda não confirmado'} · evidência mais recente ${item.latestEvidenceAt ? esc(item.latestEvidenceAt) : 'não informada'}</p></div><div class="recommendationScore"><b>${item.score}</b><small>/100</small><span class="delta ${item.delta > 0 ? 'up' : item.delta < 0 ? 'down' : ''}">${esc(delta)}</span></div></div>
        <div class="recommendationConfidence"><span>Confiança da recomendação</span><b>${item.confidence}%</b><i><em style="width:${item.confidence}%"></em></i></div>
        <div class="recommendationBars">${bar('Mercado', item.components.market)}${bar('Validação', item.components.validation)}${bar('Economia', item.components.economics)}${bar('Prontidão', item.components.readiness)}${bar('Atualidade', item.components.temporal)}${bar('Evidência', item.components.evidence)}</div>
        <div class="recommendationReasons"><div><b>Por que pode avançar</b>${(item.positives.length ? item.positives : ['Ainda não há evidência positiva suficiente.']).map((text) => `<p class="positive">${esc(text)}</p>`).join('')}</div><div><b>Riscos e lacunas</b>${[...item.penalties, ...item.gaps].slice(0, 5).map((text) => `<p class="warning">${esc(text)}</p>`).join('') || '<p>Nenhuma lacuna crítica identificada.</p>'}</div></div>
        <div class="recommendationNext"><span>Próxima ação recomendada</span><b>${esc(item.nextAction)}</b></div>
        ${decision ? `<div class="recommendationDecision"><span>Decisão registrada: <b>${esc(decision.decision)}</b></span><p>${esc(decision.note)}</p></div>` : ''}
        <details><summary>Ver dados que sustentam a recomendação</summary><div class="recommendationEvidence">
          <p><b>Tendência:</b> ${item.trend ? `${item.trend.score}/100 · ${item.trend.activeSignals}/${item.trend.signals} sinais ativos · ${item.trend.sources} fontes` : 'não disponível'}</p>
          <p><b>Teste:</b> ${item.testResult.available ? `${item.testResult.stage} · ${item.testResult.orders} pedidos · conversão ${PCT.format(item.testResult.conversion * 100)}%` : 'não disponível'}</p>
          <p><b>Economia:</b> ${item.economics.available ? `${item.economics.source === 'audit' ? 'auditoria' : 'estimativa'} · margem ${PCT.format(item.economics.netMargin)}% · ${BRL.format(item.economics.netProfit)}` : 'não disponível'}</p>
          <p><b>Capital:</b> ${item.readiness.requiredCapital > 0 ? `${BRL.format(item.readiness.requiredCapital)} necessário · ${item.readiness.availableCash ? `${BRL.format(item.readiness.availableCash)} informado` : 'caixa não informado'}` : 'modelo sem capital inicial definido'}</p>
        </div></details>
        <div class="actions"><button class="btn primary" data-recommend-test="${esc(item.key)}">Criar teste</button><button class="btn" data-recommend-decision="${esc(item.key)}" data-value="priorizar">Marcar prioridade</button><button class="btn" data-recommend-decision="${esc(item.key)}" data-value="monitorar">Monitorar</button><button class="btn danger" data-recommend-decision="${esc(item.key)}" data-value="pausar">Pausar</button></div>
      </article>`;
    }).join('');
    node.querySelectorAll('[data-recommend-test]').forEach((button) => { button.onclick = () => { const item = all.find((row) => row.key === button.dataset.recommendTest); if (!item) return; createTest(item); toast('Teste criado no funil de experimentos.'); renderRanking(); }; });
    node.querySelectorAll('[data-recommend-decision]').forEach((button) => { button.onclick = () => { const note = prompt('Observação da decisão (opcional):', decisionMap.get(button.dataset.recommendDecision)?.note || '') ?? ''; saveDecision(button.dataset.recommendDecision, button.dataset.value, note); toast('Decisão registrada.'); renderRanking(); }; });
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'recommendations'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'recommendationsNav'));
    if ($('title')) $('title').textContent = 'Priorize produtos com evidências';
    document.querySelector('.side')?.classList.remove('open');
    captureSnapshot(); renderRanking(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function exportRanking() {
    const rows = currentRanking();
    const header = ['posicao', 'produto', 'score', 'confianca_pct', 'recomendacao', 'variacao', 'mercado', 'validacao', 'economia', 'prontidao', 'atualidade', 'evidencia', 'proxima_acao', 'evidencia_mais_recente'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [header, ...rows.map((item, index) => [index + 1, item.product, item.score, item.confidence, item.classification.label, item.delta ?? '', item.components.market, item.components.validation, item.components.economics, item.components.readiness, item.components.temporal, item.components.evidence, item.nextAction, item.latestEvidenceAt])].map((row) => row.map(quote).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-recomendacoes-${today()}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.recommendationSettings = KEYS.settings; keys.recommendationSnapshots = KEYS.snapshots; keys.recommendationDecisions = KEYS.decisions; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, snapshots: [], decisions: [] };
    const timer = setInterval(() => {
      attempts += 1; const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 200) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {}; const payload = { version: '0.6.0', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.recommendationSettings = settings(); payload.recommendationSnapshots = snapshots(); payload.recommendationDecisions = decisions();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { settings: payload.recommendationSettings && typeof payload.recommendationSettings === 'object' ? payload.recommendationSettings : {}, snapshots: Array.isArray(payload.recommendationSnapshots) ? payload.recommendationSnapshots : [], decisions: Array.isArray(payload.recommendationDecisions) ? payload.recommendationDecisions : [] }; } catch { pending = { settings: {}, snapshots: [], decisions: [] }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.settings, { ...settings(), ...pending.settings }); write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id || item.date, item])).values()].slice(0, 180)); write(KEYS.decisions, [...new Map([...decisions(), ...pending.decisions].map((item) => [item.key || item.id, item])).values()].slice(0, 300)); renderRanking(); });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.snapshots, pending.snapshots); write(KEYS.decisions, pending.decisions); renderRanking(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const trendNav = $('trendNav'); const trendView = $('trendRadar');
    if (!trendNav || !trendView || $('recommendationsNav')) return false;
    trendNav.insertAdjacentHTML('afterend', '<button class="nav" id="recommendationsNav"><span>Recomendações</span><b id="recommendationsNavCount"></b></button>');
    trendView.insertAdjacentHTML('afterend', `<section class="view" id="recommendations"><div class="sectionHead"><div><span class="eyebrow">DECISÃO EXPLICÁVEL</span><h2>Recomendações e ranking temporal</h2><p class="muted">Cruze fontes, testes, margem e capacidade. Dados ausentes ou vencidos reduzem a recomendação.</p></div><div class="actions"><button class="btn" id="recommendationSnapshot">Capturar ranking</button><button class="btn primary" id="recommendationExport">Exportar CSV</button></div></div><div class="recommendationSummary" id="recommendationSummary"></div><div class="card recommendationFilters"><label class="field wide"><span>Buscar produto</span><input id="recommendationSearch" placeholder="Produto, evidência ou risco"></label><label class="field"><span>Recomendação</span><select id="recommendationStatus"><option value="all">Todas</option><option value="prioritize">Priorizar</option><option value="test">Testar agora</option><option value="monitor">Monitorar</option><option value="review">Revisar</option><option value="pause">Pausar</option><option value="insufficient">Coletar dados</option></select></label><label class="field"><span>Confiança mínima</span><select id="recommendationConfidence"><option value="0">Qualquer</option><option value="35">35%</option><option value="50">50%</option><option value="65">65%</option><option value="80">80%</option></select></label></div><div class="recommendationGrid" id="recommendationGrid"></div><div id="recommendationToast" class="v021Toast"></div></section>`);
    $('recommendationsNav').onclick = showView;
    for (const id of ['recommendationSearch', 'recommendationStatus', 'recommendationConfidence']) $(id).addEventListener(id === 'recommendationSearch' ? 'input' : 'change', renderRanking);
    $('recommendationSnapshot').onclick = () => { captureSnapshot(today(), true); toast('Ranking temporal capturado.'); renderRanking(); };
    $('recommendationExport').onclick = exportRanking;
    extendCloud(); enhanceBackup(); captureSnapshot(); renderRanking();
    ROOT.addEventListener?.('commerce-radar-recommendation-action', renderRanking);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) renderRanking(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 300) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarRecommendations = { KEYS, DEFAULTS, normalizeKey, recencyScore, scoreTests, scoreEconomics, scoreReadiness, scoreTemporal, evidenceScore, classify, buildCandidates, buildRecommendation, buildRanking, captureSnapshot, saveDecision };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();