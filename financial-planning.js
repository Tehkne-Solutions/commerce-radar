(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CLOSE = ROOT.CommerceRadarPeriodClose;
  const KEYS = {
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    payouts: 'tehkne-commerce-radar-v44-payout-controls',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    tests: 'tehkne-commerce-radar-v2-tests',
    custom: 'tehkne-commerce-radar-v2-custom-opportunities',
    launch: 'tehkne-commerce-radar-v2-launch-plans',
    imports: 'tehkne-commerce-radar-v4-imports',
    profiles: 'tehkne-commerce-radar-v42-financial-profiles',
    reconciliations: 'tehkne-commerce-radar-v43-reconciliation-batches',
    closings: 'tehkne-commerce-radar-v44-period-closings',
  };
  const CHANNELS = [
    'Mercado Livre', 'Shopee', 'Shopify', 'WooCommerce', 'TikTok Shop',
    'Instagram + WhatsApp', 'Loja própria', 'Outro canal',
  ];
  const SCENARIOS = [
    { id: 'conservative', name: 'Conservador', revenueFactor: 0.8, costFactor: 1.05 },
    { id: 'likely', name: 'Provável', revenueFactor: 1, costFactor: 1 },
    { id: 'optimistic', name: 'Otimista', revenueFactor: 1.25, costFactor: 0.97 },
  ];
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const byId = (id) => typeof document !== 'undefined' ? document.getElementById(id) : null;
  const safe = (value, max = 500) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const money = (value) => Math.max(0, num(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, num(value)));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = () => `${today().slice(0, 7)}-01`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[char]);

  function read(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function isoDate(value) {
    const text = safe(value, 32);
    if (!text) return '';
    const time = Date.parse(text);
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
  }
  function daysBetween(start, end) {
    const first = Date.parse(start || '');
    const last = Date.parse(end || '');
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return 30;
    return Math.max(1, Math.round((last - first) / 86400000) + 1);
  }
  function normalizePlan(raw = {}) {
    return {
      id: safe(raw.id, 120) || uid(),
      name: safe(raw.name, 140) || 'Plano financeiro',
      periodStart: isoDate(raw.periodStart) || firstDayOfMonth(),
      periodEnd: isoDate(raw.periodEnd) || today(),
      channel: safe(raw.channel, 80) || 'all',
      months: clamp(raw.months || 6, 1, 24),
      openingCash: money(raw.openingCash),
      fixedCosts: money(raw.fixedCosts),
      targetRevenue: money(raw.targetRevenue),
      payoutDelayDays: clamp(raw.payoutDelayDays || 14, 0, 120),
      inventoryDays: clamp(raw.inventoryDays || 30, 0, 180),
      reserveMonths: clamp(raw.reserveMonths || 1, 0, 12),
      safetyPct: clamp(raw.safetyPct || 5, 0, 100),
      conservativePct: clamp(raw.conservativePct || 80, 10, 200),
      optimisticPct: clamp(raw.optimisticPct || 125, 10, 300),
      monthlyGrowthPct: clamp(raw.monthlyGrowthPct || 0, -50, 100),
      notes: safe(raw.notes, 2000),
      snapshot: raw.snapshot && typeof raw.snapshot === 'object' ? raw.snapshot : null,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function rawAudits() { return read(KEYS.audits, []); }
  function rawPayouts() { return read(KEYS.payouts, []); }
  function plans() { return read(KEYS.plans, []).map(normalizePlan); }

  function summarizeBaseline(audits = [], payouts = [], start = '', end = '', channel = 'all') {
    if (!CLOSE?.summarizePeriod) {
      return { auditCount: 0, netSales: 0, totalCosts: 0, netProfit: 0, orders: 0, avgTicket: 0 };
    }
    const summary = CLOSE.summarizePeriod(audits, payouts, start, end, channel);
    const filtered = (summary.auditResults || []).map((item) => item.audit || {});
    const productCost = filtered.reduce((sum, item) => sum + money(item.productCost), 0);
    const advertising = filtered.reduce((sum, item) => sum + money(item.advertising), 0);
    const variableCosts = filtered.reduce((sum, item) => {
      const netShipping = Math.max(0, money(item.shippingCost) - money(item.shippingSubsidy));
      return sum + money(item.productCost) + money(item.marketplaceFees) + money(item.paymentFees) +
        netShipping + money(item.taxes) + money(item.advertising) + money(item.packaging) + money(item.otherCosts);
    }, 0);
    const periodDays = daysBetween(start, end);
    const monthlyFactor = 30 / periodDays;
    return {
      ...summary,
      periodDays,
      productCost,
      advertising,
      variableCosts,
      monthlyRevenue: summary.netSales * monthlyFactor,
      monthlyOrders: summary.orders * monthlyFactor,
      monthlyProductCost: productCost * monthlyFactor,
      monthlyAdvertising: advertising * monthlyFactor,
      monthlyVariableCosts: variableCosts * monthlyFactor,
      variableCostRatio: summary.netSales > 0 ? variableCosts / summary.netSales : 0,
      productCostRatio: summary.netSales > 0 ? productCost / summary.netSales : 0,
      advertisingRatio: summary.netSales > 0 ? advertising / summary.netSales : 0,
      contributionMarginRatio: summary.netSales > 0 ? Math.max(0, (summary.netSales - variableCosts) / summary.netSales) : 0,
    };
  }

  function breakEvenRevenue(fixedCosts, contributionMarginRatio) {
    const margin = num(contributionMarginRatio);
    if (margin <= 0) return Infinity;
    return money(fixedCosts) / margin;
  }

  function capitalRequirement(input = {}, baseline = {}) {
    const monthlyRevenue = money(input.monthlyRevenue);
    const productRatio = clamp(baseline.productCostRatio, 0, 2);
    const variableRatio = clamp(baseline.variableCostRatio, 0, 3);
    const inventoryCapital = (monthlyRevenue * productRatio / 30) * clamp(input.inventoryDays, 0, 180);
    const nonProductVariableRatio = Math.max(0, variableRatio - productRatio);
    const settlementGap = (monthlyRevenue * nonProductVariableRatio / 30) * clamp(input.payoutDelayDays, 0, 120);
    const fixedReserve = money(input.fixedCosts) * clamp(input.reserveMonths, 0, 12);
    const safetyReserve = monthlyRevenue * clamp(input.safetyPct, 0, 100) / 100;
    const total = inventoryCapital + settlementGap + fixedReserve + safetyReserve;
    return { inventoryCapital, settlementGap, fixedReserve, safetyReserve, total };
  }

  function scheduleReceipts(revenues = [], lagDays = 0) {
    const lag = clamp(lagDays, 0, 365);
    const wholeMonths = Math.floor(lag / 30);
    const fraction = (lag % 30) / 30;
    const output = Array(revenues.length + wholeMonths + 2).fill(0);
    revenues.forEach((revenue, index) => {
      const value = money(revenue);
      output[index + wholeMonths] += value * (1 - fraction);
      output[index + wholeMonths + 1] += value * fraction;
    });
    return output.slice(0, revenues.length);
  }

  function projectScenario(planInput = {}, baselineInput = {}, scenarioInput = {}) {
    const plan = normalizePlan(planInput);
    const baseline = { ...baselineInput };
    const scenario = {
      id: safe(scenarioInput.id, 40) || 'likely',
      name: safe(scenarioInput.name, 60) || 'Provável',
      revenueFactor: Math.max(0, num(scenarioInput.revenueFactor, 1)),
      costFactor: Math.max(0, num(scenarioInput.costFactor, 1)),
    };
    const baseRevenue = plan.targetRevenue > 0 ? plan.targetRevenue : money(baseline.monthlyRevenue);
    const growth = plan.monthlyGrowthPct / 100;
    const revenues = Array.from({ length: plan.months }, (_, index) =>
      baseRevenue * scenario.revenueFactor * Math.pow(1 + growth, index));
    const receipts = scheduleReceipts(revenues, plan.payoutDelayDays);
    const variableRatio = clamp(baseline.variableCostRatio, 0, 3) * scenario.costFactor;
    const monthlyRows = [];
    let cash = plan.openingCash;
    let minCash = cash;
    let totalRevenue = 0;
    let totalReceipts = 0;
    let totalOutflows = 0;
    let totalProfit = 0;
    revenues.forEach((revenue, index) => {
      const variableCosts = revenue * variableRatio;
      const outflows = variableCosts + plan.fixedCosts;
      const openingCash = cash;
      const receipt = receipts[index] || 0;
      const netCashFlow = receipt - outflows;
      cash += netCashFlow;
      minCash = Math.min(minCash, cash);
      totalRevenue += revenue;
      totalReceipts += receipt;
      totalOutflows += outflows;
      totalProfit += revenue - outflows;
      monthlyRows.push({
        month: index + 1, openingCash, revenue, receipts: receipt, variableCosts,
        fixedCosts: plan.fixedCosts, outflows, netCashFlow, closingCash: cash,
      });
    });
    const contributionMarginRatio = Math.max(0, 1 - variableRatio);
    const breakEven = breakEvenRevenue(plan.fixedCosts, contributionMarginRatio);
    const monthlyRevenue = revenues[0] || 0;
    const capital = capitalRequirement({
      monthlyRevenue, fixedCosts: plan.fixedCosts, payoutDelayDays: plan.payoutDelayDays,
      inventoryDays: plan.inventoryDays, reserveMonths: plan.reserveMonths, safetyPct: plan.safetyPct,
    }, { ...baseline, variableCostRatio: variableRatio });
    const cashShortfall = Math.max(0, -minCash);
    return {
      scenario, plan, baseline, revenues, receipts, monthlyRows,
      variableCostRatio: variableRatio,
      contributionMarginRatio,
      breakEvenRevenue: breakEven,
      capitalRequirement: capital,
      cashShortfall,
      requiredOpeningCash: Math.max(capital.total, cashShortfall),
      totalRevenue, totalReceipts, totalOutflows, totalProfit,
      endingCash: cash,
      netMargin: totalRevenue > 0 ? totalProfit / totalRevenue * 100 : 0,
      goalAttainment: plan.targetRevenue > 0 ? monthlyRevenue / plan.targetRevenue * 100 : 0,
    };
  }

  function scenarioDefinitions(plan = {}) {
    const normalized = normalizePlan(plan);
    return [
      { ...SCENARIOS[0], revenueFactor: normalized.conservativePct / 100 },
      SCENARIOS[1],
      { ...SCENARIOS[2], revenueFactor: normalized.optimisticPct / 100 },
    ];
  }

  function projectAll(plan, baseline) {
    return scenarioDefinitions(plan).map((scenario) => projectScenario(plan, baseline, scenario));
  }

  function currentPlanFromForm() {
    return normalizePlan({
      id: byId('fpPlanId')?.value,
      name: byId('fpPlanName')?.value,
      periodStart: byId('fpStart')?.value,
      periodEnd: byId('fpEnd')?.value,
      channel: byId('fpChannel')?.value,
      months: byId('fpMonths')?.value,
      openingCash: byId('fpOpeningCash')?.value,
      fixedCosts: byId('fpFixedCosts')?.value,
      targetRevenue: byId('fpTargetRevenue')?.value,
      payoutDelayDays: byId('fpPayoutDelay')?.value,
      inventoryDays: byId('fpInventoryDays')?.value,
      reserveMonths: byId('fpReserveMonths')?.value,
      safetyPct: byId('fpSafetyPct')?.value,
      conservativePct: byId('fpConservativePct')?.value,
      optimisticPct: byId('fpOptimisticPct')?.value,
      monthlyGrowthPct: byId('fpGrowthPct')?.value,
      notes: byId('fpNotes')?.value,
    });
  }

  function baselineFor(plan) {
    return summarizeBaseline(rawAudits(), rawPayouts(), plan.periodStart, plan.periodEnd, plan.channel);
  }

  function renderBaseline(plan, baseline) {
    const target = byId('fpBaseline');
    if (!target) return;
    const be = breakEvenRevenue(plan.fixedCosts, baseline.contributionMarginRatio);
    target.innerHTML = `
      <article class="card fpMetric"><small>Receita mensal observada</small><b>${BRL.format(baseline.monthlyRevenue || 0)}</b><span>${NUMBER.format(baseline.monthlyOrders || 0)} pedido(s)/mês</span></article>
      <article class="card fpMetric"><small>Margem de contribuição</small><b>${(baseline.contributionMarginRatio * 100).toFixed(1)}%</b><span>Após custos variáveis</span></article>
      <article class="card fpMetric"><small>Ponto de equilíbrio</small><b>${Number.isFinite(be) ? BRL.format(be) : 'Não calculável'}</b><span>Com os custos fixos informados</span></article>
      <article class="card fpMetric"><small>Confiança dos dados</small><b>${num(baseline.dataConfidence).toFixed(0)}%</b><span>${baseline.auditCount || 0} auditoria(s)</span></article>`;
  }

  function renderScenarios(results) {
    const target = byId('fpScenarios');
    if (!target) return;
    target.innerHTML = results.map((result) => {
      const className = result.endingCash < 0 || result.totalProfit < 0 ? 'danger' : result.netMargin < 10 ? 'warning' : 'success';
      return `<article class="card fpScenario ${className}">
        <div class="fpScenarioHead"><div><span class="eyebrow">${escapeHtml(result.scenario.name)}</span><h3>${BRL.format(result.revenues[0] || 0)}/mês</h3></div><span class="fpPill">${result.netMargin.toFixed(1)}% margem</span></div>
        <dl><div><dt>Lucro projetado</dt><dd>${BRL.format(result.totalProfit)}</dd></div><div><dt>Caixa final</dt><dd>${BRL.format(result.endingCash)}</dd></div><div><dt>Capital recomendado</dt><dd>${BRL.format(result.requiredOpeningCash)}</dd></div><div><dt>Ponto de equilíbrio</dt><dd>${Number.isFinite(result.breakEvenRevenue) ? BRL.format(result.breakEvenRevenue) : '—'}</dd></div></dl>
      </article>`;
    }).join('');
  }

  function renderCapital(result) {
    const target = byId('fpCapital');
    if (!target) return;
    const c = result.capitalRequirement;
    target.innerHTML = `<div class="fpCapitalGrid">
      <span>Estoque <b>${BRL.format(c.inventoryCapital)}</b></span>
      <span>Intervalo de repasse <b>${BRL.format(c.settlementGap)}</b></span>
      <span>Reserva fixa <b>${BRL.format(c.fixedReserve)}</b></span>
      <span>Margem de segurança <b>${BRL.format(c.safetyReserve)}</b></span>
    </div><div class="fpCapitalTotal"><small>Capital de giro recomendado</small><strong>${BRL.format(result.requiredOpeningCash)}</strong></div>`;
  }

  function renderCashflow(result) {
    const target = byId('fpCashflow');
    if (!target) return;
    target.innerHTML = `<div class="fpTableWrap"><table class="fpTable"><thead><tr><th>Mês</th><th>Caixa inicial</th><th>Vendas</th><th>Recebimentos</th><th>Saídas</th><th>Fluxo</th><th>Caixa final</th></tr></thead><tbody>${result.monthlyRows.map((row) => `<tr><td>${row.month}</td><td>${BRL.format(row.openingCash)}</td><td>${BRL.format(row.revenue)}</td><td>${BRL.format(row.receipts)}</td><td>${BRL.format(row.outflows)}</td><td class="${row.netCashFlow < 0 ? 'negative' : 'positive'}">${BRL.format(row.netCashFlow)}</td><td class="${row.closingCash < 0 ? 'negative' : ''}">${BRL.format(row.closingCash)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderAlerts(plan, baseline, likely) {
    const target = byId('fpAlerts');
    if (!target) return;
    const items = [];
    if (!baseline.auditCount) items.push('Não há auditorias no período; as projeções dependem dos valores informados e ficam menos confiáveis.');
    if (baseline.contributionMarginRatio <= 0) items.push('A margem de contribuição não cobre custos fixos. Reveja preço, produto, taxas e mídia.');
    if (likely.revenues[0] < likely.breakEvenRevenue) items.push(`A receita provável está abaixo do ponto de equilíbrio em ${BRL.format(likely.breakEvenRevenue - likely.revenues[0])}.`);
    if (likely.cashShortfall > 0) items.push(`O fluxo de caixa fica negativo em até ${BRL.format(likely.cashShortfall)} sem capital adicional.`);
    if (plan.payoutDelayDays > 30) items.push('O prazo de repasse supera 30 dias e aumenta significativamente a necessidade de capital de giro.');
    if (baseline.dataConfidence < 50 && baseline.auditCount) items.push('Menos da metade da base está marcada como dado real.');
    if (!items.length) items.push('O cenário provável não apresenta bloqueios estruturais com as premissas atuais.');
    target.innerHTML = `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function calculateAndRender() {
    const plan = currentPlanFromForm();
    const baseline = baselineFor(plan);
    const results = projectAll(plan, baseline);
    const likely = results.find((item) => item.scenario.id === 'likely') || results[1];
    renderBaseline(plan, baseline);
    renderScenarios(results);
    renderCapital(likely);
    renderCashflow(likely);
    renderAlerts(plan, baseline, likely);
    return { plan, baseline, results };
  }

  function fillChannels() {
    const select = byId('fpChannel');
    if (!select) return;
    const channels = [...new Set([...CHANNELS, ...rawAudits().map((item) => item.channel)].filter(Boolean))];
    const current = select.value || 'all';
    select.innerHTML = '<option value="all">Todos os canais</option>' + channels.map((item) => `<option>${escapeHtml(item)}</option>`).join('');
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function fillForm(raw = null) {
    const plan = normalizePlan(raw || {});
    byId('fpPlanId').value = raw ? plan.id : '';
    byId('fpPlanName').value = raw ? plan.name : 'Plano de caixa';
    byId('fpStart').value = plan.periodStart;
    byId('fpEnd').value = plan.periodEnd;
    fillChannels();
    byId('fpChannel').value = plan.channel;
    byId('fpMonths').value = plan.months;
    byId('fpOpeningCash').value = plan.openingCash;
    byId('fpFixedCosts').value = plan.fixedCosts;
    byId('fpTargetRevenue').value = plan.targetRevenue;
    byId('fpPayoutDelay').value = plan.payoutDelayDays;
    byId('fpInventoryDays').value = plan.inventoryDays;
    byId('fpReserveMonths').value = plan.reserveMonths;
    byId('fpSafetyPct').value = plan.safetyPct;
    byId('fpConservativePct').value = plan.conservativePct;
    byId('fpOptimisticPct').value = plan.optimisticPct;
    byId('fpGrowthPct').value = plan.monthlyGrowthPct;
    byId('fpNotes').value = plan.notes;
    calculateAndRender();
  }

  function snapshotPlan(plan, baseline, results) {
    return {
      plan: { ...plan, snapshot: null },
      baseline: {
        auditCount: baseline.auditCount, dataConfidence: baseline.dataConfidence,
        monthlyRevenue: baseline.monthlyRevenue, monthlyOrders: baseline.monthlyOrders,
        variableCostRatio: baseline.variableCostRatio,
        contributionMarginRatio: baseline.contributionMarginRatio,
      },
      scenarios: results.map((item) => ({
        id: item.scenario.id, name: item.scenario.name, monthlyRevenue: item.revenues[0] || 0,
        totalRevenue: item.totalRevenue, totalProfit: item.totalProfit, endingCash: item.endingCash,
        netMargin: item.netMargin, breakEvenRevenue: item.breakEvenRevenue,
        requiredOpeningCash: item.requiredOpeningCash, monthlyRows: item.monthlyRows,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  function savePlan() {
    const calculated = calculateAndRender();
    const current = calculated.plan;
    const existing = plans().find((item) => item.id === current.id);
    const plan = normalizePlan({
      ...existing, ...current, id: current.id || undefined,
      snapshot: snapshotPlan(current, calculated.baseline, calculated.results),
    });
    const rows = plans().filter((item) => item.id !== plan.id);
    rows.push(plan);
    write(KEYS.plans, rows);
    byId('fpPlanId').value = plan.id;
    renderSaved();
    toast('Plano financeiro salvo com os cenários atuais.');
  }

  function deletePlan(id) {
    if (!confirm('Excluir este plano financeiro?')) return;
    write(KEYS.plans, plans().filter((item) => item.id !== id));
    renderSaved();
  }

  function reportMarkdown(plan, baseline, results) {
    const likely = results.find((item) => item.scenario.id === 'likely') || results[1];
    return `# ${plan.name}\n\n**Período-base:** ${plan.periodStart} a ${plan.periodEnd}\n**Canal:** ${plan.channel === 'all' ? 'Todos os canais' : plan.channel}\n**Horizonte:** ${plan.months} meses\n**Gerado em:** ${new Date().toLocaleString('pt-BR')}\n\n## Base observada\n\n- Receita mensal: ${BRL.format(baseline.monthlyRevenue || 0)}\n- Pedidos mensais: ${NUMBER.format(baseline.monthlyOrders || 0)}\n- Margem de contribuição: ${(baseline.contributionMarginRatio * 100).toFixed(1)}%\n- Confiança dos dados: ${num(baseline.dataConfidence).toFixed(0)}%\n\n## Cenários\n\n${results.map((item) => `### ${item.scenario.name}\n- Receita inicial mensal: ${BRL.format(item.revenues[0] || 0)}\n- Lucro no horizonte: ${BRL.format(item.totalProfit)}\n- Margem projetada: ${item.netMargin.toFixed(1)}%\n- Caixa final: ${BRL.format(item.endingCash)}\n- Capital recomendado: ${BRL.format(item.requiredOpeningCash)}\n- Ponto de equilíbrio: ${Number.isFinite(item.breakEvenRevenue) ? BRL.format(item.breakEvenRevenue) : 'não calculável'}`).join('\n\n')}\n\n## Capital de giro — cenário provável\n\n- Estoque: ${BRL.format(likely.capitalRequirement.inventoryCapital)}\n- Intervalo de repasse: ${BRL.format(likely.capitalRequirement.settlementGap)}\n- Reserva fixa: ${BRL.format(likely.capitalRequirement.fixedReserve)}\n- Segurança: ${BRL.format(likely.capitalRequirement.safetyReserve)}\n- Total recomendado: ${BRL.format(likely.requiredOpeningCash)}\n\n## Observações\n\n${plan.notes || 'Nenhuma observação registrada.'}\n\n---\n\nTehkné Solutions\n`;
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportCurrent() {
    const { plan, baseline, results } = calculateAndRender();
    download(`${plan.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'plano-financeiro'}.md`, reportMarkdown(plan, baseline, results), 'text/markdown;charset=utf-8');
  }

  function renderSaved() {
    const target = byId('fpSaved');
    if (!target) return;
    const rows = plans().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!rows.length) {
      target.innerHTML = '<div class="empty compact"><p class="muted">Nenhum plano salvo.</p></div>';
      return;
    }
    target.innerHTML = rows.map((plan) => {
      const likely = plan.snapshot?.scenarios?.find((item) => item.id === 'likely') || {};
      return `<article class="fpSavedItem"><div><b>${escapeHtml(plan.name)}</b><small>${plan.periodStart} a ${plan.periodEnd} · ${plan.months} meses</small></div><strong>${BRL.format(num(likely.requiredOpeningCash))}</strong><div class="actions"><button class="btn small" data-fp-open="${escapeHtml(plan.id)}">Abrir</button><button class="btn small dangerGhost" data-fp-delete="${escapeHtml(plan.id)}">Excluir</button></div></article>`;
    }).join('');
    target.querySelectorAll('[data-fp-open]').forEach((button) => button.onclick = () => fillForm(plans().find((item) => item.id === button.dataset.fpOpen)));
    target.querySelectorAll('[data-fp-delete]').forEach((button) => button.onclick = () => deletePlan(button.dataset.fpDelete));
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'financialPlanning'));
    document.querySelectorAll('.nav').forEach((item) => item.classList.toggle('on', item.id === 'financialPlanningNav'));
    const title = byId('title');
    if (title) title.textContent = 'Projete metas e caixa antes de investir';
    document.querySelector('.side')?.classList.remove('open');
    calculateAndRender();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function toast(message, error = false) {
    let element = byId('fpToast');
    if (!element) {
      element = document.createElement('div');
      element.id = 'fpToast';
      document.body.append(element);
    }
    element.className = `v021Toast show${error ? ' error' : ''}`;
    element.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 3600);
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.financialPlans = KEYS.plans;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function mergeById(first, second) {
    return [...new Map([...first, ...second].map((item) => [item.id || JSON.stringify(item).slice(0, 120), item])).values()];
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = [];
    const timer = setInterval(() => {
      attempts += 1;
      const backup = byId('backup');
      const input = byId('restoreFile');
      const merge = byId('mergeRestore');
      const replace = byId('replaceRestore');
      if (!backup || !input || !merge || !replace) {
        if (attempts > 160) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      backup.onclick = () => {
        const payload = {
          version: '0.4.5', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions',
          analyses: read(KEYS.analyses, []), tests: read(KEYS.tests, []),
          customOpportunities: read(KEYS.custom, []), launchPlans: read(KEYS.launch, []),
          importBatches: read(KEYS.imports, []), financialAudits: read(KEYS.audits, []),
          financialProfiles: read(KEYS.profiles, []), reconciliationBatches: read(KEYS.reconciliations, []),
          payoutControls: read(KEYS.payouts, []), periodClosings: read(KEYS.closings, []),
          financialPlans: plans(),
        };
        download(`commerce-radar-backup-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json');
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = Array.isArray(payload.financialPlans) ? payload.financialPlans.map(normalizePlan) : [];
        } catch { pending = []; }
      }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.plans, mergeById(plans(), pending)); renderSaved(); });
      replace.addEventListener('click', () => { write(KEYS.plans, pending); renderSaved(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const method = nav?.querySelector('[data-view="method"]');
    const methodView = byId('method');
    if (!nav || !method || !methodView || byId('financialPlanningNav')) return false;
    method.insertAdjacentHTML('beforebegin', '<button class="nav" id="financialPlanningNav"><span>Metas e caixa</span></button>');
    methodView.insertAdjacentHTML('beforebegin', `<section class="view" id="financialPlanning">
      <div class="sectionHead"><div><span class="eyebrow">PLANEJAMENTO FINANCEIRO</span><h2>Metas, orçamento e projeção de caixa</h2><p class="muted">Use o histórico real para estimar ponto de equilíbrio, capital necessário e três cenários antes de ampliar a operação.</p></div><div class="actions"><button class="btn" id="fpExport">Exportar plano</button><button class="btn primary" id="fpSave">Salvar plano</button></div></div>
      <input id="fpPlanId" type="hidden">
      <div class="card fpForm"><div class="grid">
        <label class="field wide"><span>Nome do plano</span><input id="fpPlanName" maxlength="140"></label>
        <label class="field"><span>Base — início</span><input id="fpStart" type="date"></label><label class="field"><span>Base — fim</span><input id="fpEnd" type="date"></label>
        <label class="field"><span>Canal</span><select id="fpChannel"><option value="all">Todos os canais</option></select></label><label class="field"><span>Horizonte (meses)</span><input id="fpMonths" type="number" min="1" max="24" value="6"></label>
        <label class="field"><span>Caixa inicial (R$)</span><input id="fpOpeningCash" type="number" min="0" step="0.01"></label><label class="field"><span>Custos fixos/mês (R$)</span><input id="fpFixedCosts" type="number" min="0" step="0.01"></label>
        <label class="field"><span>Meta de receita/mês (R$)</span><input id="fpTargetRevenue" type="number" min="0" step="0.01"></label><label class="field"><span>Prazo de repasse (dias)</span><input id="fpPayoutDelay" type="number" min="0" max="120" value="14"></label>
        <label class="field"><span>Cobertura de estoque (dias)</span><input id="fpInventoryDays" type="number" min="0" max="180" value="30"></label><label class="field"><span>Reserva de custos fixos (meses)</span><input id="fpReserveMonths" type="number" min="0" max="12" step="0.5" value="1"></label>
        <label class="field"><span>Segurança sobre receita (%)</span><input id="fpSafetyPct" type="number" min="0" max="100" step="0.1" value="5"></label><label class="field"><span>Crescimento mensal (%)</span><input id="fpGrowthPct" type="number" min="-50" max="100" step="0.1" value="0"></label>
        <label class="field"><span>Conservador (% da meta)</span><input id="fpConservativePct" type="number" min="10" max="200" value="80"></label><label class="field"><span>Otimista (% da meta)</span><input id="fpOptimisticPct" type="number" min="10" max="300" value="125"></label>
        <label class="field wide"><span>Observações</span><textarea id="fpNotes" rows="3" maxlength="2000"></textarea></label>
      </div><div class="actions end"><button class="btn primary" id="fpCalculate">Atualizar projeção</button><button class="btn" id="fpNew">Novo plano</button></div></div>
      <div class="fpMetrics" id="fpBaseline"></div>
      <div class="fpScenarioGrid" id="fpScenarios"></div>
      <div class="fpLayout"><div class="fpMain">
        <article class="card"><div class="sectionHead"><div><span class="eyebrow">FLUXO PROVÁVEL</span><h3>Projeção mensal de caixa</h3></div></div><div id="fpCashflow"></div></article>
        <article class="card"><div class="sectionHead"><div><span class="eyebrow">CAPITAL DE GIRO</span><h3>Composição do capital necessário</h3></div></div><div id="fpCapital"></div></article>
      </div><aside class="fpAside"><article class="card"><span class="eyebrow">RISCOS</span><h3>Alertas da projeção</h3><div id="fpAlerts"></div></article><article class="card"><span class="eyebrow">PLANOS</span><h3>Projeções salvas</h3><div id="fpSaved"></div></article></aside></div>
    </section>`);
    byId('financialPlanningNav').onclick = showView;
    byId('fpCalculate').onclick = calculateAndRender;
    byId('fpSave').onclick = savePlan;
    byId('fpExport').onclick = exportCurrent;
    byId('fpNew').onclick = () => fillForm();
    for (const id of ['fpStart','fpEnd','fpChannel','fpMonths','fpOpeningCash','fpFixedCosts','fpTargetRevenue','fpPayoutDelay','fpInventoryDays','fpReserveMonths','fpSafetyPct','fpGrowthPct','fpConservativePct','fpOptimisticPct']) {
      byId(id).addEventListener('change', calculateAndRender);
    }
    fillForm();
    renderSaved();
    extendCloud();
    enhanceBackup();
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 180) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarFinancialPlanning = {
    normalizePlan, summarizeBaseline, breakEvenRevenue, capitalRequirement,
    scheduleReceipts, projectScenario, scenarioDefinitions, projectAll,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();
