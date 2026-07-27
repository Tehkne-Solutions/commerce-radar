(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const ACTIVATION = ROOT.CommerceRadarActivationPlan;
  const TRACKING = ROOT.CommerceRadarActivationTracking;
  const KEYS = {
    retrospectives: 'tehkne-commerce-radar-v73-cycle-retrospectives',
    snapshots: 'tehkne-commerce-radar-v73-cycle-comparison-snapshots',
    settings: 'tehkne-commerce-radar-v73-retrospective-settings',
  };
  const DEFAULTS = { includeActive: false, minimumCycles: 2, keepSnapshots: 365 };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1800) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, num(value)));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function plans() { return ACTIVATION?.plans?.() || read('tehkne-commerce-radar-v71-activation-plans', []); }
  function checkins() { return TRACKING?.checkins?.() || read('tehkne-commerce-radar-v72-activation-checkins', []); }
  function changes() { return TRACKING?.changes?.() || read('tehkne-commerce-radar-v72-offer-changes', []); }
  function retrospectives() { return read(KEYS.retrospectives, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function saveSettings(patch = {}) { const next = { ...settings(), ...patch }; write(KEYS.settings, next); return next; }

  function derivedMetrics(raw = {}) {
    if (TRACKING?.derivedMetrics) return TRACKING.derivedMetrics(raw);
    const metrics = {
      views: Math.max(0, num(raw.views)), clicks: Math.max(0, num(raw.clicks)), orders: Math.max(0, num(raw.orders)),
      revenue: Math.max(0, num(raw.revenue)), spend: Math.max(0, num(raw.spend)), productCost: Math.max(0, num(raw.productCost)),
      fees: Math.max(0, num(raw.fees)), shipping: Math.max(0, num(raw.shipping)),
    };
    const totalCosts = metrics.spend + metrics.productCost + metrics.fees + metrics.shipping;
    const netProfit = metrics.revenue - totalCosts;
    return { ...metrics, totalCosts, netProfit, ctr: metrics.views ? metrics.clicks / metrics.views * 100 : 0, conversion: metrics.clicks ? metrics.orders / metrics.clicks * 100 : 0, cpa: metrics.orders ? metrics.spend / metrics.orders : null, roas: metrics.spend ? metrics.revenue / metrics.spend : null, netMargin: metrics.revenue ? netProfit / metrics.revenue * 100 : 0 };
  }

  function planCheckins(planId, rawCheckins = checkins()) { return rawCheckins.filter((row) => row.planId === planId).sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt))); }
  function accumulated(planId, rawCheckins = checkins()) {
    if (TRACKING?.accumulatedMetrics && rawCheckins === checkins()) return TRACKING.accumulatedMetrics(planId);
    const total = { views: 0, clicks: 0, orders: 0, revenue: 0, spend: 0, productCost: 0, fees: 0, shipping: 0 };
    for (const row of planCheckins(planId, rawCheckins)) for (const key of Object.keys(total)) total[key] += num(row.metrics?.[key]);
    return derivedMetrics(total);
  }

  function completedTasks(plan) {
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const completed = tasks.filter((task) => task.status === 'completed').length;
    return { completed, total: tasks.length, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
  }

  function comparableChanges(planId, rawChanges = changes(), rawCheckins = checkins()) {
    return rawChanges.filter((row) => row.planId === planId).map((row) => {
      const comparison = TRACKING?.compareChange ? TRACKING.compareChange(row, planCheckins(planId, rawCheckins)) : { status: 'pending', deltas: null };
      return { ...row, comparison };
    });
  }

  function outcome(metrics, plan) {
    const decision = plan.decision?.type || '';
    const profitable = metrics.orders > 0 && metrics.netProfit > 0;
    if (decision === 'continue' && profitable) return { id: 'validated', label: 'Validado' };
    if (decision === 'abandon' || (metrics.orders === 0 && plan.status === 'decided')) return { id: 'discarded', label: 'Descartado' };
    if (decision === 'adjust' || metrics.orders > 0) return { id: 'partial', label: 'Parcial' };
    return { id: 'inconclusive', label: 'Inconclusivo' };
  }

  function cycleScore(plan, metrics, checkinRows, taskProgress) {
    const criteria = plan.criteria || {};
    const viewsRatio = num(criteria.minViews) > 0 ? Math.min(1, metrics.views / num(criteria.minViews)) : (metrics.views > 0 ? 1 : 0);
    const clicksRatio = num(criteria.minClicks) > 0 ? Math.min(1, metrics.clicks / num(criteria.minClicks)) : (metrics.clicks > 0 ? 1 : 0);
    const ordersRatio = num(criteria.minOrders) > 0 ? Math.min(1, metrics.orders / num(criteria.minOrders)) : (metrics.orders > 0 ? 1 : 0);
    const marginTarget = num(criteria.minMarginPct, 10);
    const marginRatio = metrics.orders > 0 && marginTarget > 0 ? Math.min(1, Math.max(0, metrics.netMargin) / marginTarget) : (metrics.netProfit > 0 ? 1 : 0);
    const evidenceDays = Math.min(1, checkinRows.filter((row) => safe(row.evidence).length >= 8).length / 7);
    const engagement = ((viewsRatio + clicksRatio) / 2) * 20;
    const validation = ordersRatio * 30;
    const economics = ((metrics.netProfit > 0 ? 0.5 : 0) + marginRatio * 0.5) * 25;
    const execution = ((taskProgress.percent / 100) * 0.6 + evidenceDays * 0.4) * 15;
    const decision = plan.decision ? 10 : 0;
    const score = Math.round(engagement + validation + economics + execution + decision);
    return { score: clamp(score), components: { engagement: Math.round(engagement), validation: Math.round(validation), economics: Math.round(economics), execution: Math.round(execution), decision } };
  }

  function summarizeCycle(plan, rawCheckins = checkins(), rawChanges = changes()) {
    const rows = planCheckins(plan.id, rawCheckins);
    const metrics = accumulated(plan.id, rawCheckins);
    const taskProgress = completedTasks(plan);
    const changeRows = comparableChanges(plan.id, rawChanges, rawCheckins);
    const comparable = changeRows.filter((row) => row.comparison.status === 'comparable');
    const positiveChanges = comparable.filter((row) => num(row.comparison.deltas?.orders) > 0 || num(row.comparison.deltas?.netProfit) > 0);
    const scoring = cycleScore(plan, metrics, rows, taskProgress);
    return {
      planId: plan.id, product: plan.product, productKey: plan.productKey || plan.product?.toLocaleLowerCase('pt-BR'), channel: plan.channel || 'Não informado',
      status: plan.status, startDate: plan.startDate, endDate: plan.endDate, decision: plan.decision || null, outcome: outcome(metrics, plan),
      metrics, checkinCount: rows.length, taskProgress, changes: changeRows.length, comparableChanges: comparable.length, positiveChanges: positiveChanges.length,
      score: scoring.score, scoreComponents: scoring.components, retrospective: retrospectives().find((row) => row.planId === plan.id) || null,
    };
  }

  function eligiblePlans(rawPlans = plans(), reference = today(), config = settings()) {
    return rawPlans.filter((plan) => plan.status === 'decided' || (config.includeActive && plan.status === 'active') || (plan.endDate && plan.endDate < reference));
  }

  function cycleSummaries(rawPlans = plans(), rawCheckins = checkins(), rawChanges = changes(), reference = today(), config = settings()) {
    return eligiblePlans(rawPlans, reference, config).map((plan) => summarizeCycle(plan, rawCheckins, rawChanges)).sort((a, b) => b.score - a.score || b.metrics.netProfit - a.metrics.netProfit || String(b.endDate).localeCompare(String(a.endDate)));
  }

  function aggregateGroups(rows, field) {
    const groups = new Map();
    for (const row of rows) {
      const key = safe(row[field], 160) || 'Não informado';
      const current = groups.get(key) || { key, cycles: 0, orders: 0, revenue: 0, profit: 0, scoreTotal: 0, validated: 0, partial: 0, discarded: 0 };
      current.cycles += 1; current.orders += row.metrics.orders; current.revenue += row.metrics.revenue; current.profit += row.metrics.netProfit; current.scoreTotal += row.score;
      current[row.outcome.id] = num(current[row.outcome.id]) + 1; groups.set(key, current);
    }
    return [...groups.values()].map((row) => ({ ...row, avgScore: Math.round(row.scoreTotal / row.cycles), margin: row.revenue > 0 ? row.profit / row.revenue * 100 : 0, validationRate: row.cycles ? row.validated / row.cycles * 100 : 0 })).sort((a, b) => b.avgScore - a.avgScore || b.profit - a.profit);
  }

  function optimizationPatterns(rows, rawChanges = changes(), rawCheckins = checkins()) {
    const allowed = new Set(rows.map((row) => row.planId));
    const groups = new Map();
    for (const change of rawChanges.filter((row) => allowed.has(row.planId))) {
      const comparison = TRACKING?.compareChange ? TRACKING.compareChange(change, planCheckins(change.planId, rawCheckins)) : { status: 'pending' };
      if (comparison.status !== 'comparable') continue;
      const key = change.fieldLabel || change.field || 'Outro';
      const current = groups.get(key) || { field: key, comparisons: 0, positive: 0, ordersDelta: 0, profitDelta: 0, ctrDelta: 0, conversionDelta: 0 };
      current.comparisons += 1; current.ordersDelta += num(comparison.deltas.orders); current.profitDelta += num(comparison.deltas.netProfit); current.ctrDelta += num(comparison.deltas.ctr); current.conversionDelta += num(comparison.deltas.conversion);
      if (num(comparison.deltas.orders) > 0 || num(comparison.deltas.netProfit) > 0) current.positive += 1;
      groups.set(key, current);
    }
    return [...groups.values()].map((row) => ({ ...row, positiveRate: row.comparisons ? row.positive / row.comparisons * 100 : 0, avgOrdersDelta: row.ordersDelta / row.comparisons, avgProfitDelta: row.profitDelta / row.comparisons, avgCtrDelta: row.ctrDelta / row.comparisons, avgConversionDelta: row.conversionDelta / row.comparisons })).sort((a, b) => b.positiveRate - a.positiveRate || b.avgProfitDelta - a.avgProfitDelta);
  }

  function comparisonReport(reference = today()) {
    const cycles = cycleSummaries(plans(), checkins(), changes(), reference, settings());
    const byProduct = aggregateGroups(cycles, 'product');
    const byChannel = aggregateGroups(cycles, 'channel');
    const patterns = optimizationPatterns(cycles);
    const insights = [];
    if (byProduct[0]) insights.push(`Produto com melhor score médio: ${byProduct[0].key} (${byProduct[0].avgScore}).`);
    if (byChannel[0]) insights.push(`Canal com melhor score médio: ${byChannel[0].key} (${byChannel[0].avgScore}).`);
    if (patterns[0]) insights.push(`Otimização com melhor histórico observado: ${patterns[0].field} (${PCT.format(patterns[0].positiveRate)}% de comparações positivas).`);
    const weak = [...byChannel].sort((a, b) => a.avgScore - b.avgScore || a.profit - b.profit)[0];
    if (weak && byChannel.length > 1) insights.push(`Canal que exige revisão: ${weak.key} (score médio ${weak.avgScore}).`);
    return { reference, cycles, byProduct, byChannel, patterns, insights };
  }

  function saveRetrospective(planId, input = {}) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    const worked = safe(input.worked, 1800); const failed = safe(input.failed, 1800); const nextHypothesis = safe(input.nextHypothesis, 1800); const note = safe(input.note, 1800);
    if (worked.length < 12) throw new Error('Registre o que funcionou com pelo menos 12 caracteres.');
    if (failed.length < 12) throw new Error('Registre o que não funcionou com pelo menos 12 caracteres.');
    if (nextHypothesis.length < 12) throw new Error('Registre a próxima hipótese com pelo menos 12 caracteres.');
    const existing = retrospectives().find((row) => row.planId === planId);
    const row = { id: existing?.id || `cycle-retrospective-${uid()}`, planId, product: plan.product, channel: plan.channel, worked, failed, nextHypothesis, note, tags: Array.isArray(input.tags) ? input.tags.map((tag) => safe(tag, 80)).filter(Boolean).slice(0, 12) : [], createdAt: existing?.createdAt || nowIso(), updatedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.retrospectives, [row, ...retrospectives().filter((item) => item.planId !== planId)].slice(0, 500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-retrospective-updated', { detail: row }));
    return row;
  }

  function captureComparison(reference = today()) {
    const report = comparisonReport(reference);
    const snapshot = { id: `cycle-comparison-${reference}`, date: reference, cycles: report.cycles.map((row, index) => ({ position: index + 1, planId: row.planId, product: row.product, channel: row.channel, score: row.score, outcome: row.outcome.id, orders: row.metrics.orders, profit: row.metrics.netProfit, margin: row.metrics.netMargin })), topProducts: report.byProduct.slice(0, 10), topChannels: report.byChannel.slice(0, 10), capturedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [snapshot, ...snapshots().filter((row) => row.date !== reference)].slice(0, Math.max(30, num(settings().keepSnapshots, 365))));
    return snapshot;
  }

  function retrospectiveMarkdown() {
    const report = comparisonReport();
    return ['# Commerce Radar — Retrospectiva e comparação entre ciclos', '', `Data: ${report.reference}`, `Ciclos comparados: ${report.cycles.length}`, '', '## Ranking de ciclos', '', ...report.cycles.map((row, index) => `${index + 1}. ${row.product} · ${row.channel} · score ${row.score} · ${row.outcome.label} · ${row.metrics.orders} pedido(s) · ${BRL.format(row.metrics.netProfit)} de lucro preliminar.`), '', '## Comparação por produto', '', ...report.byProduct.map((row) => `- ${row.key}: ${row.cycles} ciclo(s), score médio ${row.avgScore}, ${row.orders} pedido(s), margem ${PCT.format(row.margin)}%, lucro ${BRL.format(row.profit)}.`), '', '## Comparação por canal', '', ...report.byChannel.map((row) => `- ${row.key}: ${row.cycles} ciclo(s), score médio ${row.avgScore}, taxa de validação ${PCT.format(row.validationRate)}%, lucro ${BRL.format(row.profit)}.`), '', '## Padrões de otimização', '', ...(report.patterns.length ? report.patterns.map((row) => `- ${row.field}: ${row.comparisons} comparação(ões), ${PCT.format(row.positiveRate)}% positivas, variação média de lucro ${BRL.format(row.avgProfitDelta)}.`) : ['- Ainda não existem comparações suficientes.']), '', '## Aprendizados registrados', '', ...retrospectives().map((row) => `### ${row.product} · ${row.channel}\n\n- Funcionou: ${row.worked}\n- Não funcionou: ${row.failed}\n- Próxima hipótese: ${row.nextHypothesis}`), '', '## Limitações', '', '- Comparações observacionais não comprovam causalidade.', '- Ciclos com públicos, preços, períodos e investimentos diferentes podem não ser diretamente equivalentes.', '- Lucro e margem são preliminares até auditoria financeira.', '', 'Tehkné Solutions'].join('\n');
  }

  function toast(message, error = false) { let node = $('cycleRetrospectiveToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'cycleRetrospectiveToast'; document.body.append(node); } if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800); }

  function renderSummary(report) {
    const node = $('cycleSummary'); if (!node) return;
    const validated = report.cycles.filter((row) => row.outcome.id === 'validated').length;
    node.innerHTML = [['Ciclos comparados', report.cycles.length, 'concluídos ou elegíveis'], ['Produtos', report.byProduct.length, 'hipóteses comparadas'], ['Canais', report.byChannel.length, 'origens avaliadas'], ['Validados', validated, 'com pedidos e lucro']].map(([label, value, note]) => `<article class="card cycleMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
  }

  function renderRankings(report) {
    const node = $('cycleRankings'); if (!node) return;
    node.innerHTML = `<article class="card"><div class="sectionHead"><div><span class="eyebrow">CICLOS</span><h3>Ranking comparável</h3></div><button class="btn" id="cycleCapture">Capturar comparação</button></div>${report.cycles.length ? `<div class="cycleTable"><div class="head"><span>#</span><span>Produto</span><span>Canal</span><span>Score</span><span>Pedidos</span><span>Lucro</span><span>Resultado</span></div>${report.cycles.map((row, index) => `<div><b>${index + 1}</b><span>${esc(row.product)}</span><span>${esc(row.channel)}</span><strong>${row.score}</strong><span>${row.metrics.orders}</span><span>${BRL.format(row.metrics.netProfit)}</span><span>${esc(row.outcome.label)}</span></div>`).join('')}</div>` : '<p class="muted">Conclua ciclos para iniciar a comparação.</p>'}</article>`;
    $('cycleCapture').onclick = () => { captureComparison(); toast('Comparação do dia capturada.'); };
  }

  function renderGroups(report) {
    const node = $('cycleGroups'); if (!node) return;
    const group = (title, rows) => `<article class="card"><span class="eyebrow">${title.toUpperCase()}</span><h3>Comparação consolidada</h3><div class="cycleGroupList">${rows.length ? rows.map((row) => `<div><b>${esc(row.key)}</b><span>Score ${row.avgScore} · ${row.cycles} ciclo(s) · ${row.orders} pedido(s)</span><small>Lucro ${BRL.format(row.profit)} · Margem ${PCT.format(row.margin)}%</small></div>`).join('') : '<p class="muted">Sem dados suficientes.</p>'}</div></article>`;
    node.innerHTML = group('Produtos', report.byProduct) + group('Canais', report.byChannel);
  }

  function renderPatterns(report) {
    const node = $('cyclePatterns'); if (!node) return;
    node.innerHTML = `<article class="card"><span class="eyebrow">OTIMIZAÇÕES</span><h3>Padrões observados</h3><div class="cyclePatternList">${report.patterns.length ? report.patterns.map((row) => `<div><b>${esc(row.field)}</b><span>${row.comparisons} comparação(ões) · ${PCT.format(row.positiveRate)}% positivas</span><small>Pedidos ${row.avgOrdersDelta >= 0 ? '+' : ''}${PCT.format(row.avgOrdersDelta)} · Lucro médio ${BRL.format(row.avgProfitDelta)}</small></div>`).join('') : '<p class="muted">Registre mudanças com check-ins antes e depois para formar padrões.</p>'}</div><div class="cycleInsights">${report.insights.map((item) => `<p>${esc(item)}</p>`).join('')}</div></article>`;
  }

  function renderRetrospectiveForm(report) {
    const node = $('cycleRetrospectiveForm'); if (!node) return;
    const selectedId = $('cyclePlanSelect')?.value || report.cycles[0]?.planId || '';
    const selected = report.cycles.find((row) => row.planId === selectedId) || report.cycles[0];
    const current = selected?.retrospective || {};
    node.innerHTML = `<article class="card"><span class="eyebrow">APRENDIZADO HUMANO</span><h3>Registrar retrospectiva</h3><label class="field"><span>Ciclo</span><select id="cyclePlanSelect">${report.cycles.map((row) => `<option value="${esc(row.planId)}" ${row.planId === selected?.planId ? 'selected' : ''}>${esc(row.product)} · ${esc(row.channel)}</option>`).join('')}</select></label>${selected ? `<label class="field"><span>O que funcionou</span><textarea id="cycleWorked" rows="3">${esc(current.worked || '')}</textarea></label><label class="field"><span>O que não funcionou</span><textarea id="cycleFailed" rows="3">${esc(current.failed || '')}</textarea></label><label class="field"><span>Próxima hipótese</span><textarea id="cycleNextHypothesis" rows="3">${esc(current.nextHypothesis || '')}</textarea></label><label class="field"><span>Observação adicional</span><textarea id="cycleNote" rows="2">${esc(current.note || '')}</textarea></label><button class="btn primary" id="cycleSaveRetrospective">Salvar retrospectiva</button>` : '<p class="muted">Nenhum ciclo elegível.</p>'}</article>`;
    $('cyclePlanSelect')?.addEventListener('change', () => renderRetrospectiveForm(comparisonReport()));
    $('cycleSaveRetrospective')?.addEventListener('click', () => { try { saveRetrospective(selected.planId, { worked: $('cycleWorked').value, failed: $('cycleFailed').value, nextHypothesis: $('cycleNextHypothesis').value, note: $('cycleNote').value }); renderAll(); toast('Retrospectiva registrada.'); } catch (error) { toast(error.message, true); } });
  }

  function renderAll() { const report = comparisonReport(); renderSummary(report); renderRankings(report); renderGroups(report); renderPatterns(report); renderRetrospectiveForm(report); const badge = $('cycleRetrospectiveNavCount'); if (badge) badge.textContent = report.cycles.filter((row) => !row.retrospective).length || ''; }
  function showView() { document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'cycleRetrospective')); document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'cycleRetrospectiveNav')); if ($('title')) $('title').textContent = 'Compare ciclos e transforme resultados em aprendizado'; document.querySelector('.side')?.classList.remove('open'); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' }); }

  function extendCloud() { const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.cycleRetrospectives = KEYS.retrospectives; keys.cycleComparisonSnapshots = KEYS.snapshots; keys.cycleRetrospectiveSettings = KEYS.settings; return true; }; if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true }); }

  function enhanceBackup() {
    let attempts = 0; let pending = { retrospectives: [], snapshots: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1; const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!input || !merge || !replace) { if (attempts > 280) clearInterval(timer); return; } clearInterval(timer);
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { retrospectives: Array.isArray(payload.cycleRetrospectives) ? payload.cycleRetrospectives : [], snapshots: Array.isArray(payload.cycleComparisonSnapshots) ? payload.cycleComparisonSnapshots : [], settings: payload.cycleRetrospectiveSettings && typeof payload.cycleRetrospectiveSettings === 'object' ? payload.cycleRetrospectiveSettings : {} }; } catch { pending = { retrospectives: [], snapshots: [], settings: {} }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.retrospectives, [...new Map([...retrospectives(), ...pending.retrospectives].map((item) => [item.id, item])).values()].slice(0, 500)); write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 365)); write(KEYS.settings, { ...settings(), ...pending.settings }); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.retrospectives, pending.retrospectives); write(KEYS.snapshots, pending.snapshots); write(KEYS.settings, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const trackingNav = $('activationTrackingNav'); const trackingView = $('activationTracking');
    if (!trackingNav || !trackingView || $('cycleRetrospectiveNav')) return false;
    trackingNav.insertAdjacentHTML('afterend', '<button class="nav" id="cycleRetrospectiveNav"><span>Retrospectiva de ciclos</span><b id="cycleRetrospectiveNavCount"></b></button>');
    trackingView.insertAdjacentHTML('afterend', `<section class="view" id="cycleRetrospective"><div class="sectionHead"><div><span class="eyebrow">APRENDIZADO OPERACIONAL</span><h2>Retrospectiva e comparação entre ciclos</h2><p class="muted">Compare produtos, canais e otimizações usando resultados reais, sem transformar correlação em causalidade.</p></div><div class="actions"><button class="btn" id="cycleExport">Exportar relatório</button></div></div><div class="cycleSummary" id="cycleSummary"></div><div class="cycleLayout"><main><div id="cycleRankings"></div><div class="cycleGroups" id="cycleGroups"></div></main><aside><div id="cyclePatterns"></div><div id="cycleRetrospectiveForm"></div></aside></div><div id="cycleRetrospectiveToast" class="v021Toast"></div></section>`);
    $('cycleRetrospectiveNav').onclick = showView;
    $('cycleExport').onclick = () => { const url = URL.createObjectURL(new Blob([retrospectiveMarkdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-retrospectiva-${today()}.md`; anchor.click(); URL.revokeObjectURL(url); };
    extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-activation-updated', renderAll); ROOT.addEventListener?.('commerce-radar-activation-checkin', renderAll); ROOT.addEventListener?.('commerce-radar-offer-change', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || ['tehkne-commerce-radar-v71-activation-plans', 'tehkne-commerce-radar-v72-activation-checkins', 'tehkne-commerce-radar-v72-offer-changes'].includes(event.key)) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1200) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarCycleRetrospective = { KEYS, DEFAULTS, plans, checkins, changes, retrospectives, snapshots, settings, saveSettings, derivedMetrics, planCheckins, accumulated, completedTasks, comparableChanges, outcome, cycleScore, summarizeCycle, eligiblePlans, cycleSummaries, aggregateGroups, optimizationPatterns, comparisonReport, saveRetrospective, captureComparison, retrospectiveMarkdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();