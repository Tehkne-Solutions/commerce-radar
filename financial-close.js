(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    profiles: 'tehkne-commerce-radar-v42-financial-profiles',
    reconciliations: 'tehkne-commerce-radar-v43-reconciliation-batches',
    payouts: 'tehkne-commerce-radar-v44-payout-controls',
    closings: 'tehkne-commerce-radar-v44-period-closings',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    tests: 'tehkne-commerce-radar-v2-tests',
    custom: 'tehkne-commerce-radar-v2-custom-opportunities',
    launch: 'tehkne-commerce-radar-v2-launch-plans',
    imports: 'tehkne-commerce-radar-v4-imports',
  };
  const CHANNELS = [
    'Mercado Livre',
    'Shopee',
    'Shopify',
    'WooCommerce',
    'TikTok Shop',
    'Instagram + WhatsApp',
    'Loja própria',
    'Outro canal',
  ];
  const PAYOUT_STATUS = {
    pending: 'Pendente',
    partial: 'Recebido parcialmente',
    received: 'Recebido',
    disputed: 'Em contestação',
  };
  const CLOSE_STATUS = {
    open: 'Em aberto',
    review: 'Em revisão',
    closed: 'Fechado',
  };

  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

  const byId = (id) =>
    typeof document !== 'undefined' ? document.getElementById(id) : null;
  const safe = (value, max = 500) => String(value ?? '').trim().slice(0, max);
  const number = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;
  const money = (value) => Math.max(0, number(value));
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const isoDate = (value) => {
    const text = safe(value, 32);
    if (!text) return '';
    const time = Date.parse(text);
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = () => `${today().slice(0, 7)}-01`;
  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    })[char]);

  function read(key, fallback = []) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeAudit(raw = {}) {
    return {
      id: safe(raw.id, 120) || uid(),
      product: safe(raw.product, 160) || 'Produto sem nome',
      sku: safe(raw.sku, 100),
      channel: safe(raw.channel, 80) || 'Outro canal',
      periodStart: isoDate(raw.periodStart),
      periodEnd: isoDate(raw.periodEnd),
      createdAt: raw.createdAt || new Date().toISOString(),
      orders: money(raw.orders),
      units: money(raw.units),
      grossRevenue: money(raw.grossRevenue),
      discounts: money(raw.discounts),
      refunds: money(raw.refunds),
      productCost: money(raw.productCost),
      marketplaceFees: money(raw.marketplaceFees),
      paymentFees: money(raw.paymentFees),
      shippingCost: money(raw.shippingCost),
      shippingSubsidy: money(raw.shippingSubsidy),
      taxes: money(raw.taxes),
      advertising: money(raw.advertising),
      packaging: money(raw.packaging),
      otherCosts: money(raw.otherCosts),
      quality: safe(raw.quality, 20) || 'incomplete',
    };
  }

  function computeAudit(raw = {}) {
    const audit = normalizeAudit(raw);
    const netSales = Math.max(
      0,
      audit.grossRevenue - audit.discounts - audit.refunds,
    );
    const netShipping = Math.max(
      0,
      audit.shippingCost - audit.shippingSubsidy,
    );
    const totalCosts =
      audit.productCost +
      audit.marketplaceFees +
      audit.paymentFees +
      netShipping +
      audit.taxes +
      audit.advertising +
      audit.packaging +
      audit.otherCosts;
    const netProfit = netSales - totalCosts;
    return {
      audit,
      netSales,
      netShipping,
      totalCosts,
      netProfit,
      netMargin: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      avgTicket: audit.orders > 0 ? netSales / audit.orders : 0,
    };
  }

  function normalizePayout(raw = {}) {
    const expectedAmount = money(raw.expectedAmount);
    const reportedAmount = money(raw.reportedAmount);
    const receivedAmount = money(raw.receivedAmount);
    let status = ['pending', 'partial', 'received', 'disputed'].includes(raw.status)
      ? raw.status
      : 'pending';
    const target = reportedAmount > 0 ? reportedAmount : expectedAmount;
    if (status !== 'disputed') {
      if (target > 0 && receivedAmount >= target - 0.01) status = 'received';
      else if (receivedAmount > 0) status = 'partial';
      else status = 'pending';
    }
    return {
      id: safe(raw.id, 120) || uid(),
      sourceId: safe(raw.sourceId, 180),
      reference: safe(raw.reference, 160) || 'Repasse sem referência',
      channel: safe(raw.channel, 80) || 'Outro canal',
      periodStart: isoDate(raw.periodStart),
      periodEnd: isoDate(raw.periodEnd),
      expectedAmount,
      reportedAmount,
      receivedAmount,
      dueDate: isoDate(raw.dueDate),
      status,
      notes: safe(raw.notes, 1500),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function computePayout(raw = {}, referenceDate = today()) {
    const payout = normalizePayout(raw);
    const targetAmount =
      payout.reportedAmount > 0 ? payout.reportedAmount : payout.expectedAmount;
    const pendingAmount = Math.max(0, targetAmount - payout.receivedAmount);
    const expectedVariance =
      payout.reportedAmount > 0
        ? payout.reportedAmount - payout.expectedAmount
        : 0;
    const overdue =
      Boolean(payout.dueDate) &&
      payout.dueDate < referenceDate &&
      pendingAmount > 0 &&
      payout.status !== 'disputed';
    return {
      payout,
      targetAmount,
      pendingAmount,
      expectedVariance,
      overdue,
    };
  }

  function normalizeClosing(raw = {}) {
    return {
      id: safe(raw.id, 120) || uid(),
      name: safe(raw.name, 140) || 'Fechamento sem nome',
      periodStart: isoDate(raw.periodStart),
      periodEnd: isoDate(raw.periodEnd),
      channel: safe(raw.channel, 80) || 'all',
      status: ['open', 'review', 'closed'].includes(raw.status)
        ? raw.status
        : 'open',
      notes: safe(raw.notes, 2000),
      snapshot:
        raw.snapshot && typeof raw.snapshot === 'object' ? raw.snapshot : null,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function dateRange(item = {}) {
    const start =
      isoDate(item.periodStart) ||
      isoDate(item.date) ||
      isoDate(item.createdAt) ||
      '';
    const end = isoDate(item.periodEnd) || start;
    return { start, end };
  }

  function overlaps(item, start, end) {
    const range = dateRange(item);
    if (!range.start && !range.end) return true;
    if (start && range.end && range.end < start) return false;
    if (end && range.start && range.start > end) return false;
    return true;
  }

  function channelMatches(item, channel) {
    return !channel || channel === 'all' || safe(item.channel, 80) === channel;
  }

  function summarizePeriod(
    rawAudits = [],
    rawPayouts = [],
    start = '',
    end = '',
    channel = 'all',
  ) {
    const auditResults = rawAudits
      .map(computeAudit)
      .filter(({ audit }) => overlaps(audit, start, end) && channelMatches(audit, channel));
    const payoutResults = rawPayouts
      .map((item) => computePayout(item))
      .filter(({ payout }) => overlaps(payout, start, end) && channelMatches(payout, channel));

    const summary = auditResults.reduce(
      (total, result) => {
        total.auditCount += 1;
        total.orders += result.audit.orders;
        total.units += result.audit.units;
        total.grossRevenue += result.audit.grossRevenue;
        total.netSales += result.netSales;
        total.totalCosts += result.totalCosts;
        total.netProfit += result.netProfit;
        if (result.audit.quality === 'real') total.realAudits += 1;
        return total;
      },
      {
        auditCount: 0,
        realAudits: 0,
        orders: 0,
        units: 0,
        grossRevenue: 0,
        netSales: 0,
        totalCosts: 0,
        netProfit: 0,
      },
    );

    Object.assign(summary, {
      netMargin: summary.netSales > 0 ? (summary.netProfit / summary.netSales) * 100 : 0,
      avgTicket: summary.orders > 0 ? summary.netSales / summary.orders : 0,
      dataConfidence:
        summary.auditCount > 0 ? (summary.realAudits / summary.auditCount) * 100 : 0,
      expectedPayout: payoutResults.reduce(
        (sum, item) => sum + item.payout.expectedAmount,
        0,
      ),
      reportedPayout: payoutResults.reduce(
        (sum, item) => sum + item.payout.reportedAmount,
        0,
      ),
      receivedPayout: payoutResults.reduce(
        (sum, item) => sum + item.payout.receivedAmount,
        0,
      ),
      pendingPayout: payoutResults.reduce(
        (sum, item) => sum + item.pendingAmount,
        0,
      ),
      payoutVariance: payoutResults.reduce(
        (sum, item) => sum + item.expectedVariance,
        0,
      ),
      overduePayouts: payoutResults.filter((item) => item.overdue).length,
      disputedPayouts: payoutResults.filter(
        (item) => item.payout.status === 'disputed',
      ).length,
      auditResults,
      payoutResults,
    });
    return summary;
  }

  function groupByChannel(rawAudits = [], rawPayouts = [], start = '', end = '') {
    const channels = new Set();
    for (const audit of rawAudits) {
      if (overlaps(audit, start, end)) channels.add(safe(audit.channel, 80) || 'Outro canal');
    }
    for (const payout of rawPayouts) {
      if (overlaps(payout, start, end)) channels.add(safe(payout.channel, 80) || 'Outro canal');
    }
    return [...channels]
      .map((channel) => ({
        channel,
        ...summarizePeriod(rawAudits, rawPayouts, start, end, channel),
      }))
      .sort((a, b) => b.netProfit - a.netProfit);
  }

  function monthKey(item = {}) {
    const range = dateRange(item);
    return (range.end || range.start || '').slice(0, 7);
  }

  function monthlyTrend(rawAudits = [], start = '', end = '', channel = 'all') {
    const groups = new Map();
    for (const raw of rawAudits) {
      const audit = normalizeAudit(raw);
      if (!overlaps(audit, start, end) || !channelMatches(audit, channel)) continue;
      const month = monthKey(audit);
      if (!month) continue;
      const result = computeAudit(audit);
      const current = groups.get(month) || {
        month,
        grossRevenue: 0,
        netSales: 0,
        netProfit: 0,
        orders: 0,
      };
      current.grossRevenue += audit.grossRevenue;
      current.netSales += result.netSales;
      current.netProfit += result.netProfit;
      current.orders += audit.orders;
      groups.set(month, current);
    }
    return [...groups.values()]
      .map((item) => ({
        ...item,
        netMargin: item.netSales > 0 ? (item.netProfit / item.netSales) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  function pickNumber(source, keys) {
    if (!source || typeof source !== 'object') return 0;
    for (const key of keys) {
      if (Number.isFinite(Number(source[key])) && Number(source[key]) !== 0) {
        return Number(source[key]);
      }
    }
    return 0;
  }

  function sumOrders(orders, keys) {
    return (Array.isArray(orders) ? orders : []).reduce(
      (sum, order) => sum + pickNumber(order, keys),
      0,
    );
  }

  function batchSummary(batch = {}) {
    const totals = batch.totals && typeof batch.totals === 'object' ? batch.totals : {};
    const orders = Array.isArray(batch.orders) ? batch.orders : [];
    const expectedAmount =
      pickNumber(totals, ['expectedPayout', 'expectedAmount']) ||
      sumOrders(orders, ['expectedPayout', 'expectedAmount']);
    let reportedAmount =
      pickNumber(totals, [
        'reportedPayout',
        'informedPayout',
        'payout',
        'receivedPayout',
      ]) ||
      sumOrders(orders, [
        'reportedPayout',
        'informedPayout',
        'payout',
        'receivedPayout',
      ]);
    const variance =
      pickNumber(totals, ['payoutVariance', 'variance']) ||
      sumOrders(orders, ['payoutVariance', 'variance']);
    if (!reportedAmount && expectedAmount && variance) {
      reportedAmount = expectedAmount + variance;
    }
    const dates = orders
      .flatMap((order) => [isoDate(order.date), isoDate(order.periodStart), isoDate(order.periodEnd)])
      .filter(Boolean)
      .sort();
    return {
      sourceId: `reconciliation:${safe(batch.id, 120) || safe(batch.fingerprint, 120) || uid()}`,
      reference: safe(batch.filename, 160) || safe(batch.name, 160) || 'Lote reconciliado',
      channel:
        safe(batch.channel, 80) ||
        safe(batch.platform, 80) ||
        safe(orders[0]?.channel, 80) ||
        'Outro canal',
      periodStart: dates[0] || isoDate(batch.importedAt),
      periodEnd: dates[dates.length - 1] || isoDate(batch.importedAt),
      expectedAmount: Math.max(0, expectedAmount),
      reportedAmount: Math.max(0, reportedAmount),
      variance: variance || reportedAmount - expectedAmount,
      orderCount: orders.length || money(totals.orders),
    };
  }

  function payoutCandidates(rawBatches = [], rawPayouts = []) {
    const existing = new Set(
      rawPayouts.map((item) => normalizePayout(item).sourceId).filter(Boolean),
    );
    return rawBatches
      .map(batchSummary)
      .filter(
        (item) =>
          !existing.has(item.sourceId) &&
          (item.expectedAmount > 0 || item.reportedAmount > 0),
      )
      .map((item) =>
        normalizePayout({
          ...item,
          status: 'pending',
          notes: `Controle gerado a partir de ${item.orderCount} pedido(s) reconciliado(s). Revise a data prevista e registre os recebimentos.`,
        }),
      );
  }

  function audits() {
    return read(KEYS.audits, []).map(normalizeAudit);
  }

  function payouts() {
    return read(KEYS.payouts, []).map(normalizePayout);
  }

  function closings() {
    return read(KEYS.closings, []).map(normalizeClosing);
  }

  function reconciliations() {
    return read(KEYS.reconciliations, []);
  }

  function currentFilters() {
    return {
      start: byId('periodCloseStart')?.value || '',
      end: byId('periodCloseEnd')?.value || '',
      channel: byId('periodCloseChannel')?.value || 'all',
    };
  }

  function currentSummary() {
    const filters = currentFilters();
    return summarizePeriod(
      audits(),
      payouts(),
      filters.start,
      filters.end,
      filters.channel,
    );
  }

  function showView() {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll('.view')
      .forEach((view) => view.classList.toggle('on', view.id === 'periodClose'));
    document
      .querySelectorAll('.nav')
      .forEach((item) => item.classList.toggle('on', item.id === 'periodCloseNav'));
    const title = byId('title');
    if (title) title.textContent = 'Feche o período com números rastreáveis';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function toast(message, error = false) {
    let element = byId('periodCloseToast');
    if (!element && typeof document !== 'undefined') {
      element = document.createElement('div');
      element.id = 'periodCloseToast';
      document.body.append(element);
    }
    if (!element) return;
    element.className = `v021Toast show${error ? ' error' : ''}`;
    element.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 3600);
  }

  function renderSummary() {
    const container = byId('periodCloseSummary');
    if (!container) return;
    const summary = currentSummary();
    const profitClass = summary.netProfit < 0 ? 'danger' : summary.netMargin < 10 ? 'warning' : 'success';
    container.innerHTML = `
      <article class="card closeMetric"><small>Receita líquida</small><b>${BRL.format(summary.netSales)}</b><span>${NUMBER.format(summary.orders)} pedido(s)</span></article>
      <article class="card closeMetric ${profitClass}"><small>Lucro líquido</small><b>${BRL.format(summary.netProfit)}</b><span>${summary.netMargin.toFixed(1)}% de margem</span></article>
      <article class="card closeMetric"><small>Custos totais</small><b>${BRL.format(summary.totalCosts)}</b><span>Ticket médio ${BRL.format(summary.avgTicket)}</span></article>
      <article class="card closeMetric ${summary.pendingPayout > 0 ? 'warning' : 'success'}"><small>Repasses pendentes</small><b>${BRL.format(summary.pendingPayout)}</b><span>${summary.overduePayouts} em atraso · ${summary.disputedPayouts} contestado(s)</span></article>
    `;
    const navCount = byId('periodCloseNavCount');
    if (navCount) navCount.textContent = String(summary.overduePayouts || '');
  }

  function renderChannels() {
    const container = byId('periodCloseChannels');
    if (!container) return;
    const { start, end } = currentFilters();
    const rows = groupByChannel(audits(), payouts(), start, end);
    if (!rows.length) {
      container.innerHTML = '<div class="empty compact"><p class="muted">Nenhuma auditoria no período selecionado.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="closeTableWrap"><table class="closeTable">
        <thead><tr><th>Canal</th><th>Receita líquida</th><th>Lucro</th><th>Margem</th><th>Pedidos</th><th>Pendente</th></tr></thead>
        <tbody>${rows
          .map(
            (row) => `<tr>
              <td><b>${escapeHtml(row.channel)}</b></td>
              <td>${BRL.format(row.netSales)}</td>
              <td class="${row.netProfit < 0 ? 'negative' : 'positive'}">${BRL.format(row.netProfit)}</td>
              <td>${row.netMargin.toFixed(1)}%</td>
              <td>${NUMBER.format(row.orders)}</td>
              <td>${BRL.format(row.pendingPayout)}</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table></div>
    `;
  }

  function renderTrend() {
    const container = byId('periodCloseTrend');
    if (!container) return;
    const { start, end, channel } = currentFilters();
    const rows = monthlyTrend(audits(), start, end, channel);
    if (!rows.length) {
      container.innerHTML = '<div class="empty compact"><p class="muted">Ainda não há meses suficientes para exibir a evolução.</p></div>';
      return;
    }
    const maxRevenue = Math.max(...rows.map((item) => item.netSales), 1);
    container.innerHTML = rows
      .map(
        (item) => `<article class="trendRow">
          <div><b>${escapeHtml(item.month)}</b><small>${BRL.format(item.netSales)} · ${NUMBER.format(item.orders)} pedido(s)</small></div>
          <div class="trendTrack"><span style="width:${Math.max(3, (item.netSales / maxRevenue) * 100).toFixed(2)}%"></span></div>
          <strong class="${item.netProfit < 0 ? 'negative' : 'positive'}">${item.netMargin.toFixed(1)}%</strong>
        </article>`,
      )
      .join('');
  }

  function filteredPayouts() {
    const { start, end, channel } = currentFilters();
    return payouts()
      .map((item) => computePayout(item))
      .filter(({ payout }) => overlaps(payout, start, end) && channelMatches(payout, channel))
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return (a.payout.dueDate || '9999').localeCompare(b.payout.dueDate || '9999');
      });
  }

  function renderPayouts() {
    const container = byId('periodClosePayouts');
    if (!container) return;
    const rows = filteredPayouts();
    if (!rows.length) {
      container.innerHTML = '<div class="empty compact"><p class="muted">Nenhum repasse controlado no período. Importe os lotes reconciliados ou registre um repasse.</p></div>';
      return;
    }
    container.innerHTML = rows
      .map(({ payout, pendingAmount, expectedVariance, overdue }) => `
        <article class="card payoutCard ${overdue ? 'overdue' : ''}">
          <div class="payoutHead">
            <div><span class="closeBadge ${payout.status}">${PAYOUT_STATUS[payout.status]}</span><h3>${escapeHtml(payout.reference)}</h3><p>${escapeHtml(payout.channel)} · ${payout.periodStart || 'sem início'} a ${payout.periodEnd || 'sem fim'}</p></div>
            <div class="payoutAmount"><small>Falta receber</small><b>${BRL.format(pendingAmount)}</b>${overdue ? '<em>Em atraso</em>' : ''}</div>
          </div>
          <div class="payoutNumbers">
            <span>Esperado <b>${BRL.format(payout.expectedAmount)}</b></span>
            <span>Informado <b>${BRL.format(payout.reportedAmount)}</b></span>
            <span>Recebido <b>${BRL.format(payout.receivedAmount)}</b></span>
            <span>Diferença <b class="${expectedVariance < 0 ? 'negative' : expectedVariance > 0 ? 'warningText' : ''}">${BRL.format(expectedVariance)}</b></span>
          </div>
          <div class="actions"><button class="btn small" data-edit-payout="${escapeHtml(payout.id)}">Editar</button><button class="btn small" data-receive-payout="${escapeHtml(payout.id)}">Registrar recebimento</button><button class="btn small dangerGhost" data-delete-payout="${escapeHtml(payout.id)}">Excluir</button></div>
        </article>`,
      )
      .join('');
    container.querySelectorAll('[data-edit-payout]').forEach((button) => {
      button.onclick = () => openPayout(payouts().find((item) => item.id === button.dataset.editPayout));
    });
    container.querySelectorAll('[data-receive-payout]').forEach((button) => {
      const payout = payouts().find((item) => item.id === button.dataset.receivePayout);
      if (!payout) return;
      button.onclick = () => {
        const computed = computePayout(payout);
        openPayout({
          ...payout,
          receivedAmount: computed.targetAmount,
          status: 'received',
        });
      };
    });
    container.querySelectorAll('[data-delete-payout]').forEach((button) => {
      button.onclick = () => {
        if (!confirm('Excluir este controle de repasse?')) return;
        write(
          KEYS.payouts,
          payouts().filter((item) => item.id !== button.dataset.deletePayout),
        );
        renderAll();
      };
    });
  }

  function renderClosings() {
    const container = byId('periodCloseSaved');
    if (!container) return;
    const rows = closings().sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    if (!rows.length) {
      container.innerHTML = '<div class="empty compact"><p class="muted">Nenhum fechamento salvo.</p></div>';
      return;
    }
    container.innerHTML = rows
      .map((closing) => {
        const snapshot = closing.snapshot || {};
        return `<article class="savedClose">
          <div><span class="closeBadge ${closing.status}">${CLOSE_STATUS[closing.status]}</span><b>${escapeHtml(closing.name)}</b><small>${closing.periodStart || '—'} a ${closing.periodEnd || '—'} · ${closing.channel === 'all' ? 'Todos os canais' : escapeHtml(closing.channel)}</small></div>
          <strong class="${number(snapshot.netProfit) < 0 ? 'negative' : 'positive'}">${BRL.format(number(snapshot.netProfit))}</strong>
          <div class="actions"><button class="btn small" data-export-close="${escapeHtml(closing.id)}">Relatório</button><button class="btn small" data-edit-close="${escapeHtml(closing.id)}">Editar</button></div>
        </article>`;
      })
      .join('');
    container.querySelectorAll('[data-export-close]').forEach((button) => {
      button.onclick = () => exportClosing(button.dataset.exportClose);
    });
    container.querySelectorAll('[data-edit-close]').forEach((button) => {
      button.onclick = () => openClosing(closings().find((item) => item.id === button.dataset.editClose));
    });
  }

  function renderQuality() {
    const container = byId('periodCloseQuality');
    if (!container) return;
    const summary = currentSummary();
    const candidates = payoutCandidates(reconciliations(), payouts());
    const issues = [];
    if (!summary.auditCount) issues.push('Nenhuma auditoria cobre o período.');
    if (summary.dataConfidence < 50 && summary.auditCount) {
      issues.push('Menos da metade das auditorias está marcada como dado real.');
    }
    if (candidates.length) {
      issues.push(`${candidates.length} lote(s) reconciliado(s) ainda não virou(aram) controle de repasse.`);
    }
    if (summary.payoutVariance < -0.01) {
      issues.push(`O repasse informado está ${BRL.format(Math.abs(summary.payoutVariance))} abaixo do esperado.`);
    }
    if (!issues.length) issues.push('Nenhuma pendência estrutural encontrada para o período.');
    container.innerHTML = `
      <div class="qualityScore"><b>${summary.dataConfidence.toFixed(0)}%</b><span>das auditorias com dados reais</span></div>
      <ul>${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    `;
  }

  function renderAll() {
    if (!byId('periodClose')) return;
    renderSummary();
    renderChannels();
    renderTrend();
    renderPayouts();
    renderClosings();
    renderQuality();
  }

  function fillChannelSelects() {
    const auditChannels = audits().map((item) => item.channel);
    const payoutChannels = payouts().map((item) => item.channel);
    const options = [...new Set([...CHANNELS, ...auditChannels, ...payoutChannels].filter(Boolean))];
    for (const id of ['periodCloseChannel', 'pcPayoutChannel', 'pcClosingChannel']) {
      const select = byId(id);
      if (!select) continue;
      const current = select.value;
      const allOption = id === 'periodCloseChannel' || id === 'pcClosingChannel'
        ? '<option value="all">Todos os canais</option>'
        : '';
      select.innerHTML =
        allOption +
        options.map((item) => `<option>${escapeHtml(item)}</option>`).join('');
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    }
  }

  function openPayout(raw = null) {
    const payout = normalizePayout(raw || {});
    byId('pcPayoutTitle').textContent = raw ? 'Editar repasse' : 'Novo repasse';
    byId('pcPayoutId').value = raw ? payout.id : '';
    byId('pcPayoutSourceId').value = payout.sourceId;
    byId('pcPayoutReference').value = raw ? payout.reference : '';
    byId('pcPayoutChannel').value = payout.channel;
    byId('pcPayoutStart').value = payout.periodStart;
    byId('pcPayoutEnd').value = payout.periodEnd;
    byId('pcPayoutExpected').value = payout.expectedAmount;
    byId('pcPayoutReported').value = payout.reportedAmount;
    byId('pcPayoutReceived').value = payout.receivedAmount;
    byId('pcPayoutDue').value = payout.dueDate;
    byId('pcPayoutStatus').value = payout.status;
    byId('pcPayoutNotes').value = payout.notes;
    byId('periodPayoutModal').classList.add('open');
  }

  function savePayout(event) {
    event.preventDefault();
    const id = byId('pcPayoutId').value;
    const existing = payouts().find((item) => item.id === id);
    const payout = normalizePayout({
      ...existing,
      id: id || undefined,
      sourceId: byId('pcPayoutSourceId').value,
      reference: byId('pcPayoutReference').value,
      channel: byId('pcPayoutChannel').value,
      periodStart: byId('pcPayoutStart').value,
      periodEnd: byId('pcPayoutEnd').value,
      expectedAmount: byId('pcPayoutExpected').value,
      reportedAmount: byId('pcPayoutReported').value,
      receivedAmount: byId('pcPayoutReceived').value,
      dueDate: byId('pcPayoutDue').value,
      status: byId('pcPayoutStatus').value,
      notes: byId('pcPayoutNotes').value,
    });
    const rows = payouts().filter((item) => item.id !== payout.id);
    rows.push(payout);
    write(KEYS.payouts, rows);
    byId('periodPayoutModal').classList.remove('open');
    renderAll();
    toast('Controle de repasse salvo.');
  }

  function importCandidates() {
    const candidates = payoutCandidates(reconciliations(), payouts());
    if (!candidates.length) return toast('Nenhum lote novo com repasse foi encontrado.', true);
    write(KEYS.payouts, [...payouts(), ...candidates]);
    fillChannelSelects();
    renderAll();
    toast(`${candidates.length} controle(s) de repasse criado(s).`);
  }

  function openClosing(raw = null) {
    const filters = currentFilters();
    const closing = normalizeClosing(
      raw || {
        name: `Fechamento ${filters.start || 'início'} a ${filters.end || 'fim'}`,
        periodStart: filters.start,
        periodEnd: filters.end,
        channel: filters.channel,
        status: 'review',
      },
    );
    byId('pcClosingTitle').textContent = raw ? 'Editar fechamento' : 'Salvar fechamento';
    byId('pcClosingId').value = raw ? closing.id : '';
    byId('pcClosingName').value = closing.name;
    byId('pcClosingStart').value = closing.periodStart;
    byId('pcClosingEnd').value = closing.periodEnd;
    byId('pcClosingChannel').value = closing.channel;
    byId('pcClosingStatus').value = closing.status;
    byId('pcClosingNotes').value = closing.notes;
    byId('periodClosingModal').classList.add('open');
  }

  function saveClosing(event) {
    event.preventDefault();
    const id = byId('pcClosingId').value;
    const existing = closings().find((item) => item.id === id);
    const status = byId('pcClosingStatus').value;
    const start = byId('pcClosingStart').value;
    const end = byId('pcClosingEnd').value;
    const channel = byId('pcClosingChannel').value;
    const snapshot =
      existing?.status === 'closed' && status === 'closed' && existing.snapshot
        ? existing.snapshot
        : summarizePeriod(audits(), payouts(), start, end, channel);
    const closing = normalizeClosing({
      ...existing,
      id: id || undefined,
      name: byId('pcClosingName').value,
      periodStart: start,
      periodEnd: end,
      channel,
      status,
      notes: byId('pcClosingNotes').value,
      snapshot: {
        auditCount: snapshot.auditCount,
        orders: snapshot.orders,
        grossRevenue: snapshot.grossRevenue,
        netSales: snapshot.netSales,
        totalCosts: snapshot.totalCosts,
        netProfit: snapshot.netProfit,
        netMargin: snapshot.netMargin,
        expectedPayout: snapshot.expectedPayout,
        reportedPayout: snapshot.reportedPayout,
        receivedPayout: snapshot.receivedPayout,
        pendingPayout: snapshot.pendingPayout,
        payoutVariance: snapshot.payoutVariance,
        overduePayouts: snapshot.overduePayouts,
        dataConfidence: snapshot.dataConfidence,
      },
    });
    const rows = closings().filter((item) => item.id !== closing.id);
    rows.push(closing);
    write(KEYS.closings, rows);
    byId('periodClosingModal').classList.remove('open');
    renderAll();
    toast('Fechamento salvo com snapshot do período.');
  }

  function reportMarkdown(name, start, end, channel, summary, channelRows, payoutRows, notes = '') {
    return `# ${name}

**Período:** ${start || 'não informado'} a ${end || 'não informado'}
**Canal:** ${channel === 'all' ? 'Todos os canais' : channel}
**Gerado em:** ${new Date().toLocaleString('pt-BR')}

## Resultado consolidado

- Receita bruta: ${BRL.format(summary.grossRevenue)}
- Receita líquida: ${BRL.format(summary.netSales)}
- Custos totais: ${BRL.format(summary.totalCosts)}
- Lucro líquido: ${BRL.format(summary.netProfit)}
- Margem líquida: ${summary.netMargin.toFixed(1)}%
- Pedidos: ${NUMBER.format(summary.orders)}
- Ticket médio: ${BRL.format(summary.avgTicket)}
- Repasses esperados: ${BRL.format(summary.expectedPayout)}
- Repasses informados: ${BRL.format(summary.reportedPayout)}
- Repasses recebidos: ${BRL.format(summary.receivedPayout)}
- Repasses pendentes: ${BRL.format(summary.pendingPayout)}
- Divergência de repasse: ${BRL.format(summary.payoutVariance)}
- Repasses em atraso: ${summary.overduePayouts}
- Confiança dos dados: ${summary.dataConfidence.toFixed(0)}%

## Comparação entre canais

${channelRows.length ? channelRows.map((row) => `- ${row.channel}: receita líquida ${BRL.format(row.netSales)}, lucro ${BRL.format(row.netProfit)}, margem ${row.netMargin.toFixed(1)}%, pendente ${BRL.format(row.pendingPayout)}.`).join('\n') : '- Sem dados por canal.'}

## Repasses e divergências

${payoutRows.length ? payoutRows.map(({ payout, pendingAmount, expectedVariance, overdue }) => `- ${payout.reference} (${payout.channel}): esperado ${BRL.format(payout.expectedAmount)}, informado ${BRL.format(payout.reportedAmount)}, recebido ${BRL.format(payout.receivedAmount)}, pendente ${BRL.format(pendingAmount)}, diferença ${BRL.format(expectedVariance)}${overdue ? ', em atraso' : ''}.`).join('\n') : '- Nenhum repasse controlado.'}

## Observações

${notes || 'Sem observações.'}

---
Tehkné Solutions
`;
  }

  function download(filename, content, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrent() {
    const filters = currentFilters();
    const summary = currentSummary();
    const channelRows = groupByChannel(audits(), payouts(), filters.start, filters.end);
    const payoutRows = filteredPayouts();
    const markdown = reportMarkdown(
      'Fechamento financeiro',
      filters.start,
      filters.end,
      filters.channel,
      summary,
      channelRows,
      payoutRows,
    );
    download(`fechamento-${filters.start || 'inicio'}-${filters.end || 'fim'}.md`, markdown, 'text/markdown;charset=utf-8');
  }

  function exportClosing(id) {
    const closing = closings().find((item) => item.id === id);
    if (!closing) return;
    const summary = closing.snapshot || summarizePeriod(
      audits(),
      payouts(),
      closing.periodStart,
      closing.periodEnd,
      closing.channel,
    );
    const channelRows = groupByChannel(audits(), payouts(), closing.periodStart, closing.periodEnd);
    const payoutRows = payouts()
      .map((item) => computePayout(item))
      .filter(({ payout }) => overlaps(payout, closing.periodStart, closing.periodEnd) && channelMatches(payout, closing.channel));
    const markdown = reportMarkdown(
      closing.name,
      closing.periodStart,
      closing.periodEnd,
      closing.channel,
      summary,
      channelRows,
      payoutRows,
      closing.notes,
    );
    download(`${closing.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.md`, markdown, 'text/markdown;charset=utf-8');
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      Object.assign(keys, {
        reconciliationBatches: KEYS.reconciliations,
        payoutControls: KEYS.payouts,
        periodClosings: KEYS.closings,
      });
      return true;
    };
    if (apply()) return;
    ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function mergeById(first, second) {
    return [
      ...new Map(
        [...first, ...second].map((item) => [
          item.id || item.sourceId || JSON.stringify(item).slice(0, 120),
          item,
        ]),
      ).values(),
    ];
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { payouts: [], closings: [] };
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
          version: '0.4.4',
          exportedAt: new Date().toISOString(),
          signature: 'Tehkné Solutions',
          analyses: read(KEYS.analyses, []),
          tests: read(KEYS.tests, []),
          customOpportunities: read(KEYS.custom, []),
          launchPlans: read(KEYS.launch, []),
          importBatches: read(KEYS.imports, []),
          financialAudits: read(KEYS.audits, []),
          financialProfiles: read(KEYS.profiles, []),
          reconciliationBatches: read(KEYS.reconciliations, []),
          payoutControls: payouts(),
          periodClosings: closings(),
        };
        download(
          `commerce-radar-backup-${today()}.json`,
          JSON.stringify(payload, null, 2),
          'application/json',
        );
      };
      input.addEventListener(
        'change',
        async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const payload = JSON.parse(await file.text());
            pending = {
              payouts: Array.isArray(payload.payoutControls)
                ? payload.payoutControls.map(normalizePayout)
                : [],
              closings: Array.isArray(payload.periodClosings)
                ? payload.periodClosings.map(normalizeClosing)
                : [],
            };
          } catch {
            pending = { payouts: [], closings: [] };
          }
        },
        { capture: true },
      );
      merge.addEventListener('click', () => {
        write(KEYS.payouts, mergeById(payouts(), pending.payouts));
        write(KEYS.closings, mergeById(closings(), pending.closings));
        renderAll();
      });
      replace.addEventListener('click', () => {
        write(KEYS.payouts, pending.payouts);
        write(KEYS.closings, pending.closings);
        renderAll();
      });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const method = nav?.querySelector('[data-view="method"]');
    const methodView = byId('method');
    if (!nav || !method || !methodView || byId('periodCloseNav')) return false;

    method.insertAdjacentHTML(
      'beforebegin',
      '<button class="nav" id="periodCloseNav"><span>Fechamento financeiro</span><b id="periodCloseNavCount"></b></button>',
    );
    methodView.insertAdjacentHTML(
      'beforebegin',
      `<section class="view" id="periodClose">
        <div class="sectionHead"><div><span class="eyebrow">FECHAMENTO POR PERÍODO</span><h2>Fechamento financeiro</h2><p class="muted">Compare canais, acompanhe a margem e controle repasses pendentes com dados auditáveis.</p></div><div class="actions"><button class="btn" id="periodCloseExport">Exportar relatório</button><button class="btn primary" id="periodCloseSave">Salvar fechamento</button></div></div>
        <div class="card closeFilters">
          <label class="field"><span>Início</span><input id="periodCloseStart" type="date"></label>
          <label class="field"><span>Fim</span><input id="periodCloseEnd" type="date"></label>
          <label class="field"><span>Canal</span><select id="periodCloseChannel"><option value="all">Todos os canais</option></select></label>
          <div class="actions"><button class="btn primary" id="periodCloseApply">Atualizar painel</button><button class="btn" id="periodCloseImportPayouts">Importar repasses dos lotes</button><button class="btn" id="periodCloseNewPayout">Novo repasse</button></div>
        </div>
        <div class="closeSummary" id="periodCloseSummary"></div>
        <div class="closeGrid">
          <div class="closeMain">
            <article class="card"><div class="sectionHead"><div><span class="eyebrow">COMPARAÇÃO</span><h3>Resultado por canal</h3></div></div><div id="periodCloseChannels"></div></article>
            <article class="card"><div class="sectionHead"><div><span class="eyebrow">TENDÊNCIA</span><h3>Evolução da margem</h3></div></div><div id="periodCloseTrend"></div></article>
            <article class="card"><div class="sectionHead"><div><span class="eyebrow">CAIXA</span><h3>Divergências e repasses</h3></div><button class="btn small" id="periodCloseNewPayoutInline">Registrar repasse</button></div><div id="periodClosePayouts"></div></article>
          </div>
          <aside class="closeAside">
            <article class="card"><div class="sectionHead"><div><span class="eyebrow">SNAPSHOTS</span><h3>Fechamentos salvos</h3></div></div><div id="periodCloseSaved"></div></article>
            <article class="card"><span class="eyebrow">QUALIDADE</span><h3>Cobertura e pendências</h3><div id="periodCloseQuality"></div></article>
          </aside>
        </div>
      </section>`,
    );

    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="modal" id="periodPayoutModal"><div class="card modalBox closeModal"><div class="modalHead"><div><span class="eyebrow">CONTROLE DE CAIXA</span><h2 id="pcPayoutTitle">Novo repasse</h2></div><button class="btn small" id="pcPayoutClose" type="button">Fechar</button></div><form id="pcPayoutForm"><input id="pcPayoutId" type="hidden"><input id="pcPayoutSourceId" type="hidden"><div class="grid"><label class="field wide"><span>Referência</span><input id="pcPayoutReference" required maxlength="160"></label><label class="field"><span>Canal</span><select id="pcPayoutChannel"></select></label><label class="field"><span>Status</span><select id="pcPayoutStatus"><option value="pending">Pendente</option><option value="partial">Recebido parcialmente</option><option value="received">Recebido</option><option value="disputed">Em contestação</option></select></label><label class="field"><span>Início</span><input id="pcPayoutStart" type="date"></label><label class="field"><span>Fim</span><input id="pcPayoutEnd" type="date"></label><label class="field"><span>Vencimento</span><input id="pcPayoutDue" type="date"></label><label class="field"><span>Esperado (R$)</span><input id="pcPayoutExpected" type="number" min="0" step="0.01"></label><label class="field"><span>Informado pelo canal (R$)</span><input id="pcPayoutReported" type="number" min="0" step="0.01"></label><label class="field"><span>Recebido (R$)</span><input id="pcPayoutReceived" type="number" min="0" step="0.01"></label><label class="field wide"><span>Observações</span><textarea id="pcPayoutNotes" rows="4" maxlength="1500"></textarea></label></div><div class="actions end"><button class="btn primary" type="submit">Salvar repasse</button></div></form></div></div>
      <div class="modal" id="periodClosingModal"><div class="card modalBox closeModal"><div class="modalHead"><div><span class="eyebrow">SNAPSHOT DO PERÍODO</span><h2 id="pcClosingTitle">Salvar fechamento</h2></div><button class="btn small" id="pcClosingClose" type="button">Fechar</button></div><form id="pcClosingForm"><input id="pcClosingId" type="hidden"><div class="grid"><label class="field wide"><span>Nome</span><input id="pcClosingName" required maxlength="140"></label><label class="field"><span>Início</span><input id="pcClosingStart" type="date" required></label><label class="field"><span>Fim</span><input id="pcClosingEnd" type="date" required></label><label class="field"><span>Canal</span><select id="pcClosingChannel"></select></label><label class="field"><span>Status</span><select id="pcClosingStatus"><option value="open">Em aberto</option><option value="review">Em revisão</option><option value="closed">Fechado</option></select></label><label class="field wide"><span>Observações</span><textarea id="pcClosingNotes" rows="5" maxlength="2000"></textarea></label></div><div class="actions end"><button class="btn primary" type="submit">Salvar fechamento</button></div></form></div></div>`,
    );

    byId('periodCloseNav').onclick = showView;
    byId('periodCloseStart').value = firstDayOfMonth();
    byId('periodCloseEnd').value = today();
    byId('periodCloseApply').onclick = renderAll;
    byId('periodCloseExport').onclick = exportCurrent;
    byId('periodCloseSave').onclick = () => openClosing();
    byId('periodCloseNewPayout').onclick = () => openPayout();
    byId('periodCloseNewPayoutInline').onclick = () => openPayout();
    byId('periodCloseImportPayouts').onclick = importCandidates;
    byId('pcPayoutClose').onclick = () => byId('periodPayoutModal').classList.remove('open');
    byId('pcClosingClose').onclick = () => byId('periodClosingModal').classList.remove('open');
    byId('pcPayoutForm').addEventListener('submit', savePayout);
    byId('pcClosingForm').addEventListener('submit', saveClosing);
    for (const id of ['periodCloseStart', 'periodCloseEnd', 'periodCloseChannel']) {
      byId(id).addEventListener('change', renderAll);
    }

    fillChannelSelects();
    renderAll();
    extendCloud();
    enhanceBackup();
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 180) clearInterval(timer);
    }, 50);
  }

  ROOT.CommerceRadarPeriodClose = {
    normalizeAudit,
    computeAudit,
    normalizePayout,
    computePayout,
    normalizeClosing,
    overlaps,
    summarizePeriod,
    groupByChannel,
    monthlyTrend,
    batchSummary,
    payoutCandidates,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})();