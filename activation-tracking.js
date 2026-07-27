(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const ACTIVATION = ROOT.CommerceRadarActivationPlan;
  const KEYS = {
    checkins: 'tehkne-commerce-radar-v72-activation-checkins',
    changes: 'tehkne-commerce-radar-v72-offer-changes',
    settings: 'tehkne-commerce-radar-v72-tracking-settings',
  };
  const DEFAULTS = { alertLeadDays: 0, requireEvidence: true, dailyTargetMode: 'linear', keepDays: 365 };
  const CHANGE_FIELDS = {
    title: 'Título ou gancho', price: 'Preço', image: 'Imagem ou criativo', audience: 'Público', offer: 'Oferta',
    description: 'Descrição', shipping: 'Frete ou prazo', channel: 'Canal ou posicionamento', other: 'Outro',
  };
  const METRIC_KEYS = ['views', 'clicks', 'orders', 'revenue', 'spend', 'productCost', 'fees', 'shipping'];
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1400) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function parseMoney(value) {
    if (ACTIVATION?.parseMoney) return ACTIVATION.parseMoney(value);
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
    let text = safe(value, 80).replace(/R\$/gi, '').replace(/\s/g, '');
    const comma = text.lastIndexOf(','); const dot = text.lastIndexOf('.');
    if (comma > dot) text = text.replace(/\./g, '').replace(',', '.');
    else if (dot > comma && comma >= 0) text = text.replace(/,/g, '');
    else if (comma >= 0) text = text.replace(',', '.');
    const parsed = Number(text.replace(/[^0-9+\-.]/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function addDays(value, days) {
    if (ACTIVATION?.addDays) return ACTIVATION.addDays(value, days);
    const date = new Date(`${String(value || today()).slice(0, 10)}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function checkins() { return read(KEYS.checkins, []); }
  function changes() { return read(KEYS.changes, []); }
  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function saveSettings(patch = {}) { const next = { ...settings(), ...patch }; write(KEYS.settings, next); return next; }
  function plans() { return ACTIVATION?.plans?.() || read('tehkne-commerce-radar-v71-activation-plans', []); }

  function normalizeMetrics(raw = {}) {
    return {
      views: Math.max(0, Math.round(num(raw.views))), clicks: Math.max(0, Math.round(num(raw.clicks))), orders: Math.max(0, Math.round(num(raw.orders))),
      revenue: parseMoney(raw.revenue), spend: parseMoney(raw.spend), productCost: parseMoney(raw.productCost), fees: parseMoney(raw.fees), shipping: parseMoney(raw.shipping),
    };
  }

  function derivedMetrics(raw = {}) {
    const metrics = normalizeMetrics(raw);
    const totalCosts = metrics.spend + metrics.productCost + metrics.fees + metrics.shipping;
    const netProfit = metrics.revenue - totalCosts;
    return {
      ...metrics, totalCosts, netProfit,
      ctr: metrics.views > 0 ? metrics.clicks / metrics.views * 100 : 0,
      conversion: metrics.clicks > 0 ? metrics.orders / metrics.clicks * 100 : 0,
      cpa: metrics.orders > 0 ? metrics.spend / metrics.orders : null,
      roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : null,
      netMargin: metrics.revenue > 0 ? netProfit / metrics.revenue * 100 : 0,
    };
  }

  function planCheckins(planId) { return checkins().filter((row) => row.planId === planId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)); }

  function accumulatedMetrics(planId) {
    const total = Object.fromEntries(METRIC_KEYS.map((key) => [key, 0]));
    for (const row of planCheckins(planId)) for (const key of METRIC_KEYS) total[key] += num(row.metrics?.[key]);
    return derivedMetrics(total);
  }

  function dayNumber(plan, date) {
    const start = new Date(`${plan.startDate}T12:00:00`); const current = new Date(`${String(date).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 1;
    return Math.max(1, Math.min(7, Math.floor((current - start) / 86400000) + 1));
  }

  function targetForDay(plan, day) {
    const ratio = Math.max(1, Math.min(7, Number(day || 1))) / 7;
    return {
      views: Math.round(num(plan.criteria?.minViews) * ratio), clicks: Math.round(num(plan.criteria?.minClicks) * ratio),
      orders: num(plan.criteria?.minOrders) * ratio, spend: num(plan.criteria?.maxSpend) * ratio,
    };
  }

  function saveCheckin(planId, input = {}) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    if (!['active', 'decided'].includes(plan.status)) throw new Error('Ative o plano antes de registrar check-ins.');
    const date = String(input.date || today()).slice(0, 10);
    if (date < plan.startDate || date > addDays(plan.endDate, 30)) throw new Error('A data do check-in está fora do período permitido.');
    const evidence = safe(input.evidence, 1600);
    if (settings().requireEvidence && evidence.length < 8) throw new Error('Registre uma evidência objetiva com pelo menos 8 caracteres.');
    const row = {
      id: safe(input.id, 160) || `activation-checkin-${uid()}`, planId, date, day: dayNumber(plan, date),
      metrics: normalizeMetrics(input.metrics || input), evidence, blockers: safe(input.blockers, 1200), confidence: Math.max(1, Math.min(5, Math.round(num(input.confidence, 3)))),
      offerSnapshot: safe(input.offerSnapshot, 1200), createdAt: input.createdAt || nowIso(), updatedAt: nowIso(), signature: 'Tehkné Solutions',
    };
    const rows = checkins();
    const same = rows.find((item) => item.planId === planId && item.date === date);
    if (same && !input.id) row.id = same.id, row.createdAt = same.createdAt;
    write(KEYS.checkins, [row, ...rows.filter((item) => item.id !== row.id)].slice(0, 2500));
    const cumulative = accumulatedMetrics(planId);
    if (ACTIVATION?.recordMetrics) ACTIVATION.recordMetrics(planId, cumulative);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-activation-checkin', { detail: row }));
    return row;
  }

  function recordOfferChange(planId, input = {}) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    const field = CHANGE_FIELDS[input.field] ? input.field : 'other';
    const before = safe(input.before, 1200); const after = safe(input.after, 1200); const hypothesis = safe(input.hypothesis, 1400);
    if (!before || !after || before === after) throw new Error('Informe valores anterior e posterior diferentes.');
    if (hypothesis.length < 12) throw new Error('Descreva a hipótese da mudança com pelo menos 12 caracteres.');
    const changedAt = input.changedAt || nowIso();
    const row = { id: `offer-change-${uid()}`, planId, field, fieldLabel: CHANGE_FIELDS[field], before, after, hypothesis, changedAt, day: dayNumber(plan, changedAt.slice(0, 10)), signature: 'Tehkné Solutions' };
    write(KEYS.changes, [row, ...changes()].slice(0, 1500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-offer-change', { detail: row }));
    return row;
  }

  function compareChange(change, rows = planCheckins(change.planId)) {
    const beforeRows = rows.filter((row) => row.createdAt <= change.changedAt || `${row.date}T23:59:59` <= change.changedAt);
    const afterRows = rows.filter((row) => row.createdAt > change.changedAt || `${row.date}T00:00:00` > change.changedAt);
    const before = beforeRows.at(-1); const after = afterRows[0];
    if (!before || !after) return { status: 'pending', before: before || null, after: after || null, deltas: null };
    const a = derivedMetrics(before.metrics); const b = derivedMetrics(after.metrics);
    return { status: 'comparable', before, after, deltas: {
      views: b.views - a.views, clicks: b.clicks - a.clicks, orders: b.orders - a.orders, revenue: b.revenue - a.revenue, spend: b.spend - a.spend,
      ctr: b.ctr - a.ctr, conversion: b.conversion - a.conversion, netProfit: b.netProfit - a.netProfit, netMargin: b.netMargin - a.netMargin,
    } };
  }

  function planAlerts(plan, reference = today()) {
    const rows = planCheckins(plan.id); const alerts = [];
    if (plan.status !== 'active') return alerts;
    const elapsed = dayNumber(plan, reference); const cumulative = accumulatedMetrics(plan.id); const target = targetForDay(plan, elapsed);
    for (const task of plan.tasks || []) {
      if (task.dueDate < reference && task.status !== 'completed') alerts.push({ type: 'task_overdue', severity: 'critical', day: task.day, message: `Dia ${task.day} está atrasado: ${task.title}.` });
    }
    const expectedDates = Array.from({ length: elapsed }, (_, index) => addDays(plan.startDate, index)).filter((date) => date <= reference);
    const recorded = new Set(rows.map((row) => row.date));
    const missing = expectedDates.filter((date) => !recorded.has(date));
    if (missing.length) alerts.push({ type: 'missing_checkin', severity: missing.length > 1 ? 'critical' : 'warning', message: `${missing.length} check-in(s) diário(s) ainda não registrado(s).` });
    if (target.views > 0 && cumulative.views < target.views * 0.6) alerts.push({ type: 'views_behind', severity: 'warning', message: `Visualizações estão abaixo de 60% da meta acumulada do dia ${elapsed}.` });
    if (target.clicks > 0 && cumulative.clicks < target.clicks * 0.6) alerts.push({ type: 'clicks_behind', severity: 'warning', message: `Cliques estão abaixo de 60% da meta acumulada do dia ${elapsed}.` });
    if (num(plan.criteria?.maxSpend) > 0 && cumulative.spend > target.spend * 1.25 && cumulative.orders < target.orders) alerts.push({ type: 'spend_pace', severity: 'critical', message: 'O investimento está acima do ritmo planejado sem pedidos proporcionais.' });
    return alerts;
  }

  function dailyStatus(plan, reference = today()) {
    const day = dayNumber(plan, reference); const cumulative = accumulatedMetrics(plan.id); const target = targetForDay(plan, day); const rows = planCheckins(plan.id);
    return { day, cumulative, target, checkins: rows, todayCheckin: rows.find((row) => row.date === reference) || null, alerts: planAlerts(plan, reference) };
  }

  function trackingReport(planId, reference = today()) {
    const plan = plans().find((row) => row.id === planId); if (!plan) throw new Error('Plano não encontrado.');
    const status = dailyStatus(plan, reference);
    const planChanges = changes().filter((row) => row.planId === planId).map((row) => ({ ...row, comparison: compareChange(row) }));
    return { plan, ...status, changes: planChanges };
  }

  function trackingMarkdown(planId) {
    const report = trackingReport(planId);
    return [
      '# Commerce Radar — Acompanhamento diário do plano', '', `Produto: ${report.plan.product}`, `Canal: ${report.plan.channel}`, `Dia atual: ${report.day}/7`, '',
      '## Acumulado', '', `- Visualizações: ${report.cumulative.views} / ${report.target.views}`, `- Cliques: ${report.cumulative.clicks} / ${report.target.clicks}`,
      `- Pedidos: ${report.cumulative.orders} / ${PCT.format(report.target.orders)}`, `- Receita: ${BRL.format(report.cumulative.revenue)}`, `- Investimento: ${BRL.format(report.cumulative.spend)}`,
      `- Lucro preliminar: ${BRL.format(report.cumulative.netProfit)}`, `- Margem preliminar: ${PCT.format(report.cumulative.netMargin)}%`, '',
      '## Check-ins', '', ...report.checkins.map((row) => `- ${row.date}: ${row.metrics.views} views, ${row.metrics.clicks} cliques, ${row.metrics.orders} pedido(s). Evidência: ${row.evidence}`), '',
      '## Alertas', '', ...(report.alerts.length ? report.alerts.map((row) => `- ${row.message}`) : ['- Nenhum alerta ativo.']), '',
      '## Mudanças na oferta', '', ...(report.changes.length ? report.changes.map((row) => `- ${row.changedAt}: ${row.fieldLabel} — “${row.before}” → “${row.after}”. Hipótese: ${row.hypothesis}. Comparação: ${row.comparison.status}.`) : ['- Nenhuma mudança registrada.']), '',
      'Tehkné Solutions',
    ].join('\n');
  }

  function toast(message, error = false) {
    let node = $('activationTrackingToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'activationTrackingToast'; document.body.append(node); }
    if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function activePlan() { const id = $('trackingPlanSelect')?.value; return plans().find((row) => row.id === id) || plans().find((row) => row.status === 'active') || null; }

  function renderSummary(plan) {
    const node = $('trackingSummary'); if (!node) return;
    if (!plan) { node.innerHTML = ''; return; }
    const status = dailyStatus(plan);
    node.innerHTML = [
      ['Dia atual', `${status.day}/7`, plan.status], ['Visualizações', `${status.cumulative.views}/${status.target.views}`, 'real/meta acumulada'],
      ['Cliques', `${status.cumulative.clicks}/${status.target.clicks}`, 'real/meta acumulada'], ['Alertas', status.alerts.length, status.alerts.some((row) => row.severity === 'critical') ? 'há críticos' : 'em acompanhamento'],
    ].map(([label, value, note]) => `<article class="card trackingMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
  }

  function renderCheckin(plan) {
    const node = $('trackingCheckin'); if (!node) return;
    if (!plan) { node.innerHTML = '<div class="card empty"><p>Ative um plano para iniciar os check-ins diários.</p></div>'; return; }
    const current = planCheckins(plan.id).find((row) => row.date === today());
    const m = current?.metrics || {};
    node.innerHTML = `<article class="card"><span class="eyebrow">CHECK-IN DO DIA</span><h3>${esc(plan.product)}</h3><div class="trackingFormGrid"><label class="field"><span>Data</span><input id="trackingDate" type="date" value="${esc(current?.date || today())}"></label>${[['views','Visualizações'],['clicks','Cliques'],['orders','Pedidos']].map(([key,label]) => `<label class="field"><span>${label}</span><input id="tracking-${key}" type="number" min="0" value="${num(m[key])}"></label>`).join('')}${[['revenue','Receita'],['spend','Mídia'],['productCost','Custo dos produtos'],['fees','Taxas'],['shipping','Frete']].map(([key,label]) => `<label class="field"><span>${label}</span><input id="tracking-${key}" inputmode="decimal" value="${num(m[key]) ? esc(BRL.format(num(m[key]))) : ''}" placeholder="R$ 0,00"></label>`).join('')}<label class="field"><span>Confiança do registro</span><select id="trackingConfidence">${[1,2,3,4,5].map((value) => `<option value="${value}" ${num(current?.confidence,3)===value?'selected':''}>${value}/5</option>`).join('')}</select></label><label class="field wide"><span>Evidência objetiva</span><textarea id="trackingEvidence" rows="2" placeholder="Ex.: print do painel, link do anúncio ou relatório do canal">${esc(current?.evidence || '')}</textarea></label><label class="field wide"><span>Bloqueios ou contexto</span><textarea id="trackingBlockers" rows="2">${esc(current?.blockers || '')}</textarea></label><label class="field wide"><span>Snapshot da oferta atual</span><textarea id="trackingOfferSnapshot" rows="2" placeholder="Preço, título, criativo, público e condições atuais">${esc(current?.offerSnapshot || '')}</textarea></label></div><button class="btn primary" id="trackingSaveCheckin">Salvar check-in</button></article>`;
    $('trackingSaveCheckin').onclick = () => { try { saveCheckin(plan.id, { id: current?.id, date: $('trackingDate').value, views: $('tracking-views').value, clicks: $('tracking-clicks').value, orders: $('tracking-orders').value, revenue: $('tracking-revenue').value, spend: $('tracking-spend').value, productCost: $('tracking-productCost').value, fees: $('tracking-fees').value, shipping: $('tracking-shipping').value, confidence: $('trackingConfidence').value, evidence: $('trackingEvidence').value, blockers: $('trackingBlockers').value, offerSnapshot: $('trackingOfferSnapshot').value }); renderAll(); toast('Check-in diário salvo e acumulado atualizado.'); } catch (error) { toast(error.message, true); } };
  }

  function renderAlerts(plan) {
    const node = $('trackingAlerts'); if (!node) return;
    const rows = plan ? planAlerts(plan) : [];
    node.innerHTML = `<article class="card"><span class="eyebrow">ALERTAS</span><h3>Ritmo do plano</h3>${rows.length ? rows.map((row) => `<div class="trackingAlert ${row.severity}">${esc(row.message)}</div>`).join('') : '<p class="muted">Nenhum atraso ou desvio relevante identificado.</p>'}</article>`;
  }

  function renderChanges(plan) {
    const node = $('trackingChanges'); if (!node) return;
    if (!plan) { node.innerHTML = ''; return; }
    const rows = changes().filter((row) => row.planId === plan.id);
    node.innerHTML = `<article class="card"><span class="eyebrow">MUDANÇAS NA OFERTA</span><h3>Preserve o antes e depois</h3><div class="trackingFormGrid"><label class="field"><span>Elemento alterado</span><select id="trackingChangeField">${Object.entries(CHANGE_FIELDS).map(([id,label]) => `<option value="${id}">${esc(label)}</option>`).join('')}</select></label><label class="field"><span>Data e hora</span><input id="trackingChangeAt" type="datetime-local" value="${nowIso().slice(0,16)}"></label><label class="field wide"><span>Antes</span><textarea id="trackingChangeBefore" rows="2"></textarea></label><label class="field wide"><span>Depois</span><textarea id="trackingChangeAfter" rows="2"></textarea></label><label class="field wide"><span>Hipótese</span><textarea id="trackingChangeHypothesis" rows="2" placeholder="Qual resultado esta mudança pretende melhorar?"></textarea></label></div><button class="btn" id="trackingSaveChange">Registrar mudança</button><div class="trackingChangeList">${rows.map((row) => { const comparison = compareChange(row); return `<div><b>${esc(row.fieldLabel)}</b><span>${esc(row.before)} → ${esc(row.after)}</span><small>${comparison.status === 'comparable' ? `CTR ${comparison.deltas.ctr >= 0 ? '+' : ''}${PCT.format(comparison.deltas.ctr)} p.p. · Conversão ${comparison.deltas.conversion >= 0 ? '+' : ''}${PCT.format(comparison.deltas.conversion)} p.p. · Lucro ${BRL.format(comparison.deltas.netProfit)}` : 'Aguardando check-in posterior para comparar'}</small></div>`; }).join('')}</div></article>`;
    $('trackingSaveChange').onclick = () => { try { recordOfferChange(plan.id, { field: $('trackingChangeField').value, changedAt: new Date($('trackingChangeAt').value).toISOString(), before: $('trackingChangeBefore').value, after: $('trackingChangeAfter').value, hypothesis: $('trackingChangeHypothesis').value }); renderChanges(plan); toast('Mudança registrada sem apagar o estado anterior.'); } catch (error) { toast(error.message, true); } };
  }

  function renderHistory(plan) {
    const node = $('trackingHistory'); if (!node) return;
    if (!plan) { node.innerHTML = ''; return; }
    const rows = planCheckins(plan.id);
    node.innerHTML = `<article class="card"><div class="sectionHead"><div><span class="eyebrow">SÉRIE DIÁRIA</span><h3>Metas versus realizado</h3></div><button class="btn" id="trackingExport">Exportar acompanhamento</button></div><div class="trackingTable"><div class="head"><span>Data</span><span>Views</span><span>Cliques</span><span>Pedidos</span><span>Receita</span><span>Investimento</span><span>Lucro</span></div>${rows.map((row) => { const m = derivedMetrics(row.metrics); return `<div><span>${esc(row.date)}</span><span>${m.views}</span><span>${m.clicks}</span><span>${m.orders}</span><span>${BRL.format(m.revenue)}</span><span>${BRL.format(m.spend)}</span><span>${BRL.format(m.netProfit)}</span></div>`; }).join('')}</div></article>`;
    $('trackingExport').onclick = () => { const url = URL.createObjectURL(new Blob([trackingMarkdown(plan.id)], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-acompanhamento-${safe(plan.productKey || plan.product,120).replace(/\s+/g,'-')}.md`; anchor.click(); URL.revokeObjectURL(url); };
  }

  function renderAll() {
    const select = $('trackingPlanSelect'); if (!select) return;
    const rows = plans().filter((row) => ['active','decided'].includes(row.status)); const selected = select.value;
    select.innerHTML = rows.length ? rows.map((row) => `<option value="${esc(row.id)}" ${row.id === selected ? 'selected' : ''}>${esc(row.product)} · ${esc(row.status)}</option>`).join('') : '<option value="">Nenhum plano ativo</option>';
    const plan = activePlan(); renderSummary(plan); renderCheckin(plan); renderAlerts(plan); renderChanges(plan); renderHistory(plan);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'activationTracking'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'activationTrackingNav'));
    if ($('title')) $('title').textContent = 'Acompanhe metas, atrasos e otimizações diariamente';
    document.querySelector('.side')?.classList.remove('open'); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.activationCheckins = KEYS.checkins; keys.activationChanges = KEYS.changes; keys.activationTrackingSettings = KEYS.settings; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { checkins: [], changes: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1; const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 260) clearInterval(timer); return; } clearInterval(timer);
      const previous = backup.onclick;
      backup.onclick = () => { if (typeof previous === 'function') previous(); };
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { checkins: Array.isArray(payload.activationCheckins) ? payload.activationCheckins : [], changes: Array.isArray(payload.activationChanges) ? payload.activationChanges : [], settings: payload.activationTrackingSettings && typeof payload.activationTrackingSettings === 'object' ? payload.activationTrackingSettings : {} }; } catch { pending = { checkins: [], changes: [], settings: {} }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.checkins, [...new Map([...checkins(), ...pending.checkins].map((item) => [item.id, item])).values()].slice(0,2500)); write(KEYS.changes, [...new Map([...changes(), ...pending.changes].map((item) => [item.id, item])).values()].slice(0,1500)); write(KEYS.settings, { ...settings(), ...pending.settings }); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.checkins, pending.checkins); write(KEYS.changes, pending.changes); write(KEYS.settings, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const activationNav = $('activationNav'); const activationView = $('activationPlan');
    if (!activationNav || !activationView || $('activationTrackingNav')) return false;
    activationNav.insertAdjacentHTML('afterend', '<button class="nav" id="activationTrackingNav"><span>Acompanhamento diário</span><b id="activationTrackingNavCount"></b></button>');
    activationView.insertAdjacentHTML('afterend', `<section class="view" id="activationTracking"><div class="sectionHead"><div><span class="eyebrow">ACOMPANHAMENTO DIÁRIO</span><h2>Metas, check-ins e otimizações</h2><p class="muted">Registre o resultado de cada dia, preserve mudanças e compare o que melhorou ou piorou.</p></div><label class="field"><span>Plano</span><select id="trackingPlanSelect"></select></label></div><div class="trackingSummary" id="trackingSummary"></div><div class="trackingLayout"><main><div id="trackingCheckin"></div><div id="trackingHistory"></div></main><aside><div id="trackingAlerts"></div><div id="trackingChanges"></div></aside></div><div id="activationTrackingToast" class="v021Toast"></div></section>`);
    $('activationTrackingNav').onclick = showView; $('trackingPlanSelect').onchange = renderAll;
    extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-activation-updated', renderAll); ROOT.addEventListener?.('commerce-radar-activation-checkin', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || event.key === 'tehkne-commerce-radar-v71-activation-plans') renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1100) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarActivationTracking = { KEYS, DEFAULTS, CHANGE_FIELDS, parseMoney, checkins, changes, settings, saveSettings, normalizeMetrics, derivedMetrics, planCheckins, accumulatedMetrics, dayNumber, targetForDay, saveCheckin, recordOfferChange, compareChange, planAlerts, dailyStatus, trackingReport, trackingMarkdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();