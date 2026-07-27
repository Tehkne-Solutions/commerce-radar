(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const RECOMMENDATIONS = ROOT.CommerceRadarRecommendations;
  const ONBOARDING = ROOT.CommerceRadarOnboarding;

  const KEYS = {
    plans: 'tehkne-commerce-radar-v71-activation-plans',
    events: 'tehkne-commerce-radar-v71-activation-events',
    settings: 'tehkne-commerce-radar-v71-activation-settings',
    tests: 'tehkne-commerce-radar-v2-tests',
    onboarding: 'tehkne-commerce-radar-v70-onboarding-state',
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
  };

  const DEFAULT_SETTINGS = {
    minViews: 100,
    minClicks: 10,
    minOrders: 1,
    minMarginPct: 10,
    maxSpend: 0,
  };

  const DECISIONS = {
    continue: 'Continuar',
    adjust: 'Ajustar',
    abandon: 'Abandonar',
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
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
    if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
    let text = safe(value, 80).replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    if (comma > dot) text = text.replace(/\./g, '').replace(',', '.');
    else if (dot > comma && comma >= 0) text = text.replace(/,/g, '');
    else if (comma >= 0) text = text.replace(',', '.');
    const parsed = Number(text.replace(/[^0-9+\-.]/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function addDays(value, days) {
    const date = new Date(`${String(value || today()).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return today();
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function plans() { return read(KEYS.plans, []); }
  function events() { return read(KEYS.events, []); }
  function settings() { return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }; }

  function appendEvent(type, planId, detail = {}) {
    const row = { id: `activation-event-${uid()}`, type, planId, detail, at: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.events, [row, ...events()].slice(0, 1000));
    return row;
  }

  function channelGuidance(channel) {
    const value = safe(channel, 80);
    if (/instagram|whatsapp/i.test(value)) return {
      listing: 'Montar oferta curta, prova visual e roteiro de atendimento.',
      traffic: 'Publicar conteúdo e iniciar conversas rastreáveis.',
      optimization: 'Ajustar gancho, objeções e chamada para ação.',
    };
    if (/loja|woocommerce|shopify/i.test(value)) return {
      listing: 'Publicar página com proposta, preço, frete, checkout e medição.',
      traffic: 'Gerar tráfego controlado para a página.',
      optimization: 'Revisar abandono, clareza da oferta e confiança.',
    };
    if (/afiliado/i.test(value)) return {
      listing: 'Preparar conteúdo, promessa verificável e link rastreável.',
      traffic: 'Distribuir o conteúdo em um público definido.',
      optimization: 'Ajustar formato, retenção e chamada para o link.',
    };
    return {
      listing: 'Preparar título, imagens, descrição, preço, estoque e frete.',
      traffic: 'Publicar no canal e obter impressões ou visitas reais.',
      optimization: 'Ajustar título, imagem principal, preço ou condições.',
    };
  }

  function buildTasks(channel, startDate = today()) {
    const guide = channelGuidance(channel);
    const rows = [
      ['Hipótese e oferta', 'Definir público, problema, promessa, preço e limite de investimento.', ['Registrar hipótese em uma frase.', 'Confirmar preço e custo estimado.', 'Definir o que provará interesse real.']],
      ['Página ou anúncio', guide.listing, ['Concluir material de venda.', 'Conferir rastreamento.', 'Revisar informações de preço e entrega.']],
      ['Lançamento controlado', guide.traffic, ['Ativar a oferta.', 'Registrar origem do tráfego.', 'Não ampliar orçamento antes de medir.']],
      ['Primeira leitura', 'Registrar visualizações, cliques, dúvidas e objeções sem esconder resultados fracos.', ['Atualizar métricas acumuladas.', 'Listar três objeções ou dúvidas.', 'Escolher uma mudança por vez.']],
      ['Otimização', guide.optimization, ['Aplicar somente uma hipótese de melhoria.', 'Preservar o histórico anterior.', 'Buscar pedido real, não apenas interação.']],
      ['Economia unitária', 'Conferir receita, mídia, custo do produto, taxas, frete e margem.', ['Registrar todos os custos conhecidos.', 'Calcular lucro líquido preliminar.', 'Identificar qualquer custo ainda ausente.']],
      ['Decisão', 'Comparar os resultados com os critérios definidos e registrar continuar, ajustar ou abandonar.', ['Revisar evidências dos sete dias.', 'Registrar justificativa da decisão.', 'Definir próxima ação e responsável.']],
    ];
    return rows.map(([title, objective, checklist], index) => ({
      id: `day-${index + 1}`,
      day: index + 1,
      dueDate: addDays(startDate, index),
      title,
      objective,
      checklist: checklist.map((label, itemIndex) => ({ id: `item-${itemIndex + 1}`, label, done: false })),
      status: 'pending',
      evidence: '',
      completedAt: '',
    }));
  }

  function recommendationRows(reference = today()) {
    if (RECOMMENDATIONS?.buildRanking) {
      const onboarding = ONBOARDING?.state?.() || read(KEYS.onboarding, {});
      const first = ONBOARDING?.buildFirstRecommendation?.(reference);
      if (first) return [first];
      const input = {
        signals: read(KEYS.signals, []),
        tests: read(KEYS.tests, []),
        audits: read(KEYS.audits, []),
        analyses: read('tehkne-commerce-radar-v2-analyses', []),
        opportunities: read('tehkne-commerce-radar-v2-custom-opportunities', []),
        plans: read('tehkne-commerce-radar-v45-financial-plans', []),
      };
      const config = read('tehkne-commerce-radar-v6-recommendation-settings', RECOMMENDATIONS.DEFAULTS || {});
      const rows = RECOMMENDATIONS.buildRanking(input, reference, config);
      const starterKey = onboarding.starterProductKey;
      return starterKey ? [...rows.filter((row) => row.key === starterKey), ...rows.filter((row) => row.key !== starterKey)] : rows;
    }
    return [];
  }

  function createPlan(input = {}, recommendation = null) {
    const source = recommendation || recommendationRows()[0];
    const product = safe(input.product || source?.product, 140);
    if (!product) throw new Error('Selecione uma recomendação ou informe um produto.');
    const channel = safe(input.channel || source?.channels?.[0] || ONBOARDING?.state?.().channels?.[0] || 'Shopee', 80);
    const startDate = String(input.startDate || today()).slice(0, 10);
    const onboarding = ONBOARDING?.state?.() || read(KEYS.onboarding, {});
    const weeklyBudget = parseMoney(input.budget || (num(onboarding.workspace?.monthlyBudget) > 0 ? num(onboarding.workspace.monthlyBudget) / 4 : 0));
    const currentSettings = settings();
    const criteria = {
      minViews: Math.max(0, Math.round(num(input.minViews, currentSettings.minViews))),
      minClicks: Math.max(0, Math.round(num(input.minClicks, currentSettings.minClicks))),
      minOrders: Math.max(0, Math.round(num(input.minOrders, currentSettings.minOrders))),
      minMarginPct: Math.max(-100, Math.min(100, num(input.minMarginPct, currentSettings.minMarginPct))),
      maxSpend: parseMoney(input.maxSpend || weeklyBudget || currentSettings.maxSpend),
    };
    const duplicate = plans().find((row) => row.product.toLocaleLowerCase('pt-BR') === product.toLocaleLowerCase('pt-BR') && ['draft', 'active'].includes(row.status));
    if (duplicate) return duplicate;
    const plan = {
      id: `activation-${uid()}`,
      version: '0.7.1',
      product,
      productKey: safe(source?.key || product.toLocaleLowerCase('pt-BR'), 180),
      channel,
      startDate,
      endDate: addDays(startDate, 6),
      budget: weeklyBudget,
      status: 'draft',
      criteria,
      recommendation: source ? {
        score: num(source.score),
        confidence: num(source.confidence),
        classification: source.classification?.id || source.classification || '',
        nextAction: safe(source.nextAction, 500),
        capturedAt: nowIso(),
      } : null,
      tasks: buildTasks(channel, startDate),
      metrics: { views: 0, clicks: 0, orders: 0, revenue: 0, spend: 0, productCost: 0, fees: 0, shipping: 0 },
      evaluation: null,
      decision: null,
      linkedTestId: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.plans, [plan, ...plans()]);
    appendEvent('plan_created', plan.id, { product, channel, criteria, budget: weeklyBudget });
    return plan;
  }

  function replacePlan(plan) {
    write(KEYS.plans, [plan, ...plans().filter((row) => row.id !== plan.id)].slice(0, 300));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-activation-updated', { detail: plan }));
    return plan;
  }

  function createLinkedTest(plan) {
    const rows = read(KEYS.tests, []);
    if (plan.linkedTestId) return rows.find((row) => row.id === plan.linkedTestId) || null;
    const test = {
      id: `activation-test-${uid()}`,
      product: plan.product,
      channel: plan.channel,
      stage: 'research',
      investment: 0,
      revenue: 0,
      views: 0,
      clicks: 0,
      orders: 0,
      next: 'Executar o plano de ativação de sete dias.',
      notes: `Teste criado ao ativar o plano de sete dias. Nenhum resultado foi presumido. Plano ${plan.id}.`,
      activationPlanId: plan.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    write(KEYS.tests, [test, ...rows]);
    return test;
  }

  function activatePlan(planId) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    if (plan.status === 'active') return plan;
    const test = createLinkedTest(plan);
    const next = { ...plan, status: 'active', activatedAt: nowIso(), linkedTestId: test?.id || plan.linkedTestId, updatedAt: nowIso() };
    replacePlan(next);
    appendEvent('plan_activated', planId, { linkedTestId: next.linkedTestId });
    return next;
  }

  function updateTask(planId, day, patch = {}) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    const tasks = plan.tasks.map((task) => {
      if (task.day !== Number(day)) return task;
      const checklist = Array.isArray(patch.checklist) ? patch.checklist : task.checklist;
      const allDone = checklist.length > 0 && checklist.every((item) => item.done);
      const status = patch.status || (allDone ? 'completed' : task.status);
      return { ...task, ...patch, checklist, status, completedAt: status === 'completed' ? (task.completedAt || nowIso()) : '' };
    });
    const next = { ...plan, tasks, updatedAt: nowIso() };
    replacePlan(next);
    appendEvent('task_updated', planId, { day: Number(day), status: tasks.find((task) => task.day === Number(day))?.status });
    return next;
  }

  function calculateMetrics(raw = {}) {
    const metrics = {
      views: Math.max(0, num(raw.views)),
      clicks: Math.max(0, num(raw.clicks)),
      orders: Math.max(0, num(raw.orders)),
      revenue: parseMoney(raw.revenue),
      spend: parseMoney(raw.spend),
      productCost: parseMoney(raw.productCost),
      fees: parseMoney(raw.fees),
      shipping: parseMoney(raw.shipping),
    };
    const totalCosts = metrics.spend + metrics.productCost + metrics.fees + metrics.shipping;
    const netProfit = metrics.revenue - totalCosts;
    return {
      ...metrics,
      totalCosts,
      netProfit,
      ctr: metrics.views > 0 ? (metrics.clicks / metrics.views) * 100 : 0,
      conversion: metrics.clicks > 0 ? (metrics.orders / metrics.clicks) * 100 : 0,
      cpa: metrics.orders > 0 ? metrics.spend / metrics.orders : null,
      roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : null,
      netMargin: metrics.revenue > 0 ? (netProfit / metrics.revenue) * 100 : 0,
    };
  }

  function evaluatePlan(plan, reference = today()) {
    const metrics = calculateMetrics(plan.metrics);
    const criteria = { ...DEFAULT_SETTINGS, ...(plan.criteria || {}) };
    const ended = reference >= plan.endDate || plan.tasks.every((task) => task.status === 'completed');
    const reachedViews = metrics.views >= criteria.minViews;
    const reachedClicks = metrics.clicks >= criteria.minClicks;
    const reachedOrders = metrics.orders >= criteria.minOrders;
    const marginHealthy = metrics.orders > 0 && metrics.netProfit >= 0 && metrics.netMargin >= criteria.minMarginPct;
    const spendExceeded = criteria.maxSpend > 0 && metrics.spend >= criteria.maxSpend;
    let suggestion = 'collect_data';
    const reasons = [];
    if (reachedOrders && marginHealthy) {
      suggestion = 'continue';
      reasons.push('A meta de pedidos foi atingida com margem líquida não negativa e dentro do limite definido.');
    } else if (metrics.orders > 0 && !marginHealthy) {
      suggestion = 'adjust';
      reasons.push('Existem pedidos, mas a economia unitária ainda não atende à margem definida.');
    } else if (reachedClicks || (reachedViews && metrics.clicks > 0)) {
      suggestion = 'adjust';
      reasons.push('Existe sinal de interesse, mas ainda falta conversão suficiente.');
    } else if (ended && ((reachedViews && metrics.clicks === 0) || (reachedClicks && metrics.orders === 0) || (spendExceeded && metrics.orders === 0))) {
      suggestion = 'abandon';
      reasons.push('O período ou limite de investimento terminou sem evidência comercial mínima.');
    } else {
      reasons.push('Ainda não há dados suficientes para uma decisão responsável.');
    }
    if (!ended) reasons.push('O ciclo de sete dias ainda está em andamento.');
    if (metrics.orders === 0) reasons.push('Nenhum pedido real foi registrado.');
    if (metrics.revenue > 0 && metrics.totalCosts === 0) reasons.push('Receita foi informada sem custos; a margem ainda é incompleta.');
    return { suggestion, label: DECISIONS[suggestion] || 'Coletar dados', reasons, ended, metrics, evaluatedAt: nowIso() };
  }

  function recordMetrics(planId, input = {}) {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    const metrics = calculateMetrics(input);
    const evaluation = evaluatePlan({ ...plan, metrics });
    const next = { ...plan, metrics, evaluation, updatedAt: nowIso() };
    replacePlan(next);
    const tests = read(KEYS.tests, []);
    if (next.linkedTestId) {
      write(KEYS.tests, tests.map((test) => test.id === next.linkedTestId ? {
        ...test,
        views: metrics.views,
        clicks: metrics.clicks,
        orders: metrics.orders,
        revenue: metrics.revenue,
        investment: metrics.spend,
        stage: metrics.orders > 0 ? 'conversion' : test.stage,
        updatedAt: nowIso(),
      } : test));
    }
    appendEvent('metrics_recorded', planId, { metrics, suggestion: evaluation.suggestion });
    return next;
  }

  function finalizePlan(planId, decision, note = '') {
    const plan = plans().find((row) => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');
    if (!DECISIONS[decision]) throw new Error('Selecione continuar, ajustar ou abandonar.');
    const justification = safe(note, 1600);
    if (justification.length < 20) throw new Error('Registre uma justificativa com pelo menos 20 caracteres.');
    const evaluation = evaluatePlan(plan);
    const row = { type: decision, label: DECISIONS[decision], note: justification, decidedAt: nowIso(), suggested: evaluation.suggestion, signature: 'Tehkné Solutions' };
    const next = { ...plan, status: 'decided', evaluation, decision: row, updatedAt: nowIso() };
    replacePlan(next);
    appendEvent('plan_decided', planId, row);
    return next;
  }

  function planProgress(plan) {
    const completed = plan.tasks.filter((task) => task.status === 'completed').length;
    return { completed, total: plan.tasks.length, percent: Math.round((completed / Math.max(1, plan.tasks.length)) * 100) };
  }

  function activationMarkdown(plan) {
    const evaluation = evaluatePlan(plan);
    const progress = planProgress(plan);
    return [
      '# Commerce Radar — Plano de ativação de sete dias', '',
      `Produto: ${plan.product}`,
      `Canal: ${plan.channel}`,
      `Período: ${plan.startDate} a ${plan.endDate}`,
      `Status: ${plan.status}`,
      `Progresso: ${progress.completed}/${progress.total}`, '',
      '## Critérios', '',
      `- Visualizações mínimas: ${plan.criteria.minViews}`,
      `- Cliques mínimos: ${plan.criteria.minClicks}`,
      `- Pedidos mínimos: ${plan.criteria.minOrders}`,
      `- Margem líquida mínima: ${PCT.format(plan.criteria.minMarginPct)}%`,
      `- Investimento máximo: ${plan.criteria.maxSpend > 0 ? BRL.format(plan.criteria.maxSpend) : 'não definido'}`, '',
      '## Resultados', '',
      `- Visualizações: ${evaluation.metrics.views}`,
      `- Cliques: ${evaluation.metrics.clicks}`,
      `- Pedidos: ${evaluation.metrics.orders}`,
      `- Receita: ${BRL.format(evaluation.metrics.revenue)}`,
      `- Custos totais: ${BRL.format(evaluation.metrics.totalCosts)}`,
      `- Lucro líquido preliminar: ${BRL.format(evaluation.metrics.netProfit)}`,
      `- Margem líquida preliminar: ${PCT.format(evaluation.metrics.netMargin)}%`, '',
      `## Sugestão do sistema: ${evaluation.label}`, '',
      ...evaluation.reasons.map((reason) => `- ${reason}`), '',
      '## Tarefas', '',
      ...plan.tasks.map((task) => `- [${task.status === 'completed' ? 'x' : ' '}] Dia ${task.day} — ${task.title}: ${task.objective}`), '',
      plan.decision ? `## Decisão humana: ${plan.decision.label}\n\n${plan.decision.note}\n` : '## Decisão humana\n\nAinda não registrada.\n',
      'Tehkné Solutions',
    ].join('\n');
  }

  function toast(message, error = false) {
    let node = $('activationToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'activationToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function downloadPlan(plan) {
    const url = URL.createObjectURL(new Blob([activationMarkdown(plan)], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-plano-7-dias-${plan.productKey.replace(/\s+/g, '-')}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function renderSummary() {
    const node = $('activationSummary');
    if (!node) return;
    const rows = plans();
    const active = rows.filter((row) => row.status === 'active').length;
    const decided = rows.filter((row) => row.status === 'decided').length;
    const pendingTasks = rows.reduce((sum, row) => sum + row.tasks.filter((task) => task.status !== 'completed').length, 0);
    const orders = rows.reduce((sum, row) => sum + num(row.metrics?.orders), 0);
    node.innerHTML = [
      ['Planos ativos', active, 'ciclos em execução'],
      ['Tarefas abertas', pendingTasks, 'entregas pendentes'],
      ['Pedidos registrados', orders, 'dados reais'],
      ['Decisões', decided, 'ciclos encerrados'],
    ].map(([label, value, note]) => `<article class="card activationMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const badge = $('activationNavCount');
    if (badge) badge.textContent = active || '';
  }

  function taskHtml(plan, task) {
    return `<article class="activationDay ${task.status === 'completed' ? 'done' : ''}"><div class="activationDayHead"><span>Dia ${task.day} · ${esc(task.dueDate)}</span><b>${esc(task.title)}</b></div><p>${esc(task.objective)}</p><div class="activationChecklist">${task.checklist.map((item) => `<label><input type="checkbox" data-activation-check="${esc(plan.id)}" data-day="${task.day}" data-item="${esc(item.id)}" ${item.done ? 'checked' : ''}><span>${esc(item.label)}</span></label>`).join('')}</div><label class="field"><span>Evidência ou observação</span><textarea rows="2" data-activation-evidence="${esc(plan.id)}" data-day="${task.day}">${esc(task.evidence)}</textarea></label><button class="btn small" data-complete-day="${esc(plan.id)}" data-day="${task.day}">${task.status === 'completed' ? 'Reabrir dia' : 'Concluir dia'}</button></article>`;
  }

  function renderPlans() {
    const node = $('activationPlans');
    if (!node) return;
    const rows = plans();
    if (!rows.length) {
      node.innerHTML = '<div class="card empty"><h3>Nenhum plano criado</h3><p class="muted">Crie um plano a partir da primeira recomendação ou de outro produto do ranking.</p></div>';
      return;
    }
    node.innerHTML = rows.map((plan) => {
      const progress = planProgress(plan);
      const evaluation = evaluatePlan(plan);
      return `<article class="card activationPlan status-${esc(plan.status)}"><div class="activationPlanHead"><div><span class="eyebrow">${esc(plan.status.toUpperCase())}</span><h3>${esc(plan.product)}</h3><p>${esc(plan.channel)} · ${esc(plan.startDate)} a ${esc(plan.endDate)}</p></div><div class="activationPlanScore"><b>${progress.percent}%</b><span>${progress.completed}/${progress.total} dias</span></div></div><div class="activationCriteria"><span>Meta: ${plan.criteria.minViews} views</span><span>${plan.criteria.minClicks} cliques</span><span>${plan.criteria.minOrders} pedido(s)</span><span>Margem ${PCT.format(plan.criteria.minMarginPct)}%</span><span>${plan.criteria.maxSpend > 0 ? `Máx. ${BRL.format(plan.criteria.maxSpend)}` : 'Sem teto informado'}</span></div>${plan.status === 'draft' ? `<div class="notice">O plano ainda não criou um teste. Ative quando estiver pronto para executar.</div>` : ''}<details ${plan.status === 'active' ? 'open' : ''}><summary>Ver tarefas dos sete dias</summary><div class="activationDays">${plan.tasks.map((task) => taskHtml(plan, task)).join('')}</div></details><div class="activationMetrics"><h4>Métricas acumuladas</h4><div class="activationMetricInputs">${[['views','Visualizações'],['clicks','Cliques'],['orders','Pedidos']].map(([key,label]) => `<label class="field"><span>${label}</span><input type="number" min="0" data-plan-metric="${esc(plan.id)}" data-key="${key}" value="${num(plan.metrics?.[key])}"></label>`).join('')}${[['revenue','Receita'],['spend','Mídia'],['productCost','Custo dos produtos'],['fees','Taxas'],['shipping','Frete']].map(([key,label]) => `<label class="field"><span>${label}</span><input inputmode="decimal" data-plan-metric="${esc(plan.id)}" data-key="${key}" value="${num(plan.metrics?.[key]) ? esc(BRL.format(num(plan.metrics[key]))) : ''}" placeholder="R$ 0,00"></label>`).join('')}</div><button class="btn" data-save-metrics="${esc(plan.id)}">Salvar métricas</button></div><div class="activationEvaluation suggestion-${esc(evaluation.suggestion)}"><span>Sugestão atual</span><b>${esc(evaluation.label)}</b><p>${esc(evaluation.reasons[0])}</p><div><span>CTR ${PCT.format(evaluation.metrics.ctr)}%</span><span>Conversão ${PCT.format(evaluation.metrics.conversion)}%</span><span>Lucro ${BRL.format(evaluation.metrics.netProfit)}</span><span>Margem ${PCT.format(evaluation.metrics.netMargin)}%</span></div></div>${plan.decision ? `<div class="activationDecision"><b>Decisão: ${esc(plan.decision.label)}</b><p>${esc(plan.decision.note)}</p></div>` : `<div class="activationDecisionForm"><select data-decision-select="${esc(plan.id)}"><option value="">Decisão humana</option><option value="continue">Continuar</option><option value="adjust">Ajustar</option><option value="abandon">Abandonar</option></select><textarea data-decision-note="${esc(plan.id)}" rows="2" placeholder="Justifique a decisão com fatos observados"></textarea><button class="btn primary" data-finalize-plan="${esc(plan.id)}">Registrar decisão</button></div>`}<div class="actions">${plan.status === 'draft' ? `<button class="btn primary" data-activate-plan="${esc(plan.id)}">Ativar plano</button>` : ''}<button class="btn" data-export-plan="${esc(plan.id)}">Exportar relatório</button></div></article>`;
    }).join('');
    bindPlanActions();
  }

  function bindPlanActions() {
    document.querySelectorAll('[data-activate-plan]').forEach((button) => { button.onclick = () => { try { activatePlan(button.dataset.activatePlan); renderAll(); toast('Plano ativado e teste criado com métricas zeradas.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-activation-check]').forEach((input) => { input.onchange = () => { const plan = plans().find((row) => row.id === input.dataset.activationCheck); const task = plan?.tasks.find((row) => row.day === Number(input.dataset.day)); if (!task) return; const checklist = task.checklist.map((item) => item.id === input.dataset.item ? { ...item, done: input.checked } : item); updateTask(plan.id, task.day, { checklist }); renderPlans(); }; });
    document.querySelectorAll('[data-complete-day]').forEach((button) => { button.onclick = () => { const plan = plans().find((row) => row.id === button.dataset.completeDay); const task = plan?.tasks.find((row) => row.day === Number(button.dataset.day)); if (!task) return; const evidence = document.querySelector(`[data-activation-evidence="${plan.id}"][data-day="${task.day}"]`)?.value || ''; const complete = task.status !== 'completed'; updateTask(plan.id, task.day, { status: complete ? 'completed' : 'pending', evidence: safe(evidence, 1200) }); renderAll(); }; });
    document.querySelectorAll('[data-save-metrics]').forEach((button) => { button.onclick = () => { try { const planId = button.dataset.saveMetrics; const input = {}; document.querySelectorAll(`[data-plan-metric="${planId}"]`).forEach((field) => { input[field.dataset.key] = field.value; }); recordMetrics(planId, input); renderAll(); toast('Métricas atualizadas.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-finalize-plan]').forEach((button) => { button.onclick = () => { try { const id = button.dataset.finalizePlan; const decision = document.querySelector(`[data-decision-select="${id}"]`)?.value; const note = document.querySelector(`[data-decision-note="${id}"]`)?.value || ''; finalizePlan(id, decision, note); renderAll(); toast('Decisão registrada.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-export-plan]').forEach((button) => { button.onclick = () => { const plan = plans().find((row) => row.id === button.dataset.exportPlan); if (plan) downloadPlan(plan); }; });
  }

  function renderCreateForm() {
    const node = $('activationCreate');
    if (!node) return;
    const rows = recommendationRows();
    const onboarding = ONBOARDING?.state?.() || read(KEYS.onboarding, {});
    node.innerHTML = `<article class="card activationCreateCard"><div class="sectionHead"><div><span class="eyebrow">NOVO CICLO</span><h3>Crie o plano a partir de uma recomendação</h3><p class="muted">As metas são hipóteses editáveis. Resultados só aparecem quando forem registrados.</p></div></div><div class="activationCreateGrid"><label class="field wide"><span>Produto recomendado</span><select id="activationRecommendation">${rows.length ? rows.map((row) => `<option value="${esc(row.key)}">${esc(row.product)} · score ${num(row.score)} · confiança ${num(row.confidence)}%</option>`).join('') : '<option value="">Informe manualmente</option>'}</select></label><label class="field wide"><span>Produto manual</span><input id="activationProduct" placeholder="Use apenas quando não existir recomendação"></label><label class="field"><span>Canal</span><input id="activationChannel" value="${esc(rows[0]?.channels?.[0] || onboarding.channels?.[0] || 'Shopee')}"></label><label class="field"><span>Início</span><input id="activationStart" type="date" value="${today()}"></label><label class="field"><span>Orçamento de 7 dias</span><input id="activationBudget" inputmode="decimal" value="${num(onboarding.workspace?.monthlyBudget) > 0 ? esc(BRL.format(num(onboarding.workspace.monthlyBudget) / 4)) : ''}" placeholder="R$ 0,00"></label><label class="field"><span>Visualizações mínimas</span><input id="activationMinViews" type="number" min="0" value="${settings().minViews}"></label><label class="field"><span>Cliques mínimos</span><input id="activationMinClicks" type="number" min="0" value="${settings().minClicks}"></label><label class="field"><span>Pedidos mínimos</span><input id="activationMinOrders" type="number" min="0" value="${settings().minOrders}"></label><label class="field"><span>Margem líquida mínima</span><input id="activationMinMargin" type="number" min="-100" max="100" step="0.1" value="${settings().minMarginPct}"></label></div><button class="btn primary" id="activationCreateButton">Criar plano de sete dias</button></article>`;
    $('activationRecommendation')?.addEventListener('change', () => { const row = rows.find((item) => item.key === $('activationRecommendation').value); if (row?.channels?.[0]) $('activationChannel').value = row.channels[0]; });
    $('activationCreateButton').onclick = () => { try { const recommendation = rows.find((row) => row.key === $('activationRecommendation').value) || null; createPlan({ product: $('activationProduct').value, channel: $('activationChannel').value, startDate: $('activationStart').value, budget: $('activationBudget').value, minViews: $('activationMinViews').value, minClicks: $('activationMinClicks').value, minOrders: $('activationMinOrders').value, minMarginPct: $('activationMinMargin').value, maxSpend: $('activationBudget').value }, recommendation); renderAll(); toast('Plano de sete dias criado.'); } catch (error) { toast(error.message, true); } };
  }

  function renderAll() { renderSummary(); renderCreateForm(); renderPlans(); }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'activationPlan'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'activationNav'));
    if ($('title')) $('title').textContent = 'Execute a primeira validação em sete dias';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.activationPlans = KEYS.plans;
      keys.activationEvents = KEYS.events;
      keys.activationSettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { plans: [], events: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 240) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.7.1', exportedAt: nowIso(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.activationPlans = plans(); payload.activationEvents = events(); payload.activationSettings = settings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { plans: Array.isArray(payload.activationPlans) ? payload.activationPlans : [], events: Array.isArray(payload.activationEvents) ? payload.activationEvents : [], settings: payload.activationSettings && typeof payload.activationSettings === 'object' ? payload.activationSettings : {} }; } catch { pending = { plans: [], events: [], settings: {} }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.plans, [...new Map([...plans(), ...pending.plans].map((item) => [item.id, item])).values()].slice(0, 300)); write(KEYS.events, [...new Map([...events(), ...pending.events].map((item) => [item.id, item])).values()].slice(0, 1000)); write(KEYS.settings, { ...settings(), ...pending.settings }); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.plans, pending.plans); write(KEYS.events, pending.events); write(KEYS.settings, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const onboardingNav = $('onboardingNav');
    const onboardingView = $('guidedOnboarding');
    if (!onboardingNav || !onboardingView || $('activationNav')) return false;
    onboardingNav.insertAdjacentHTML('afterend', '<button class="nav" id="activationNav"><span>Plano de 7 dias</span><b id="activationNavCount"></b></button>');
    onboardingView.insertAdjacentHTML('afterend', `<section class="view" id="activationPlan"><div class="sectionHead"><div><span class="eyebrow">ATIVAÇÃO OPERACIONAL</span><h2>Valide uma oportunidade em sete dias</h2><p class="muted">Execute tarefas diárias, registre métricas reais e tome uma decisão explícita ao final do ciclo.</p></div></div><div class="activationSummary" id="activationSummary"></div><div id="activationCreate"></div><div class="activationPlans" id="activationPlans"></div><div id="activationToast" class="v021Toast"></div></section>`);
    $('activationNav').onclick = showView;
    extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-onboarding-updated', renderAll);
    ROOT.addEventListener?.('commerce-radar-recommendation-action', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1000) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarActivationPlan = {
    KEYS, DEFAULT_SETTINGS, DECISIONS, parseMoney, addDays, plans, events, settings, buildTasks, recommendationRows,
    createPlan, activatePlan, updateTask, calculateMetrics, evaluatePlan, recordMetrics, finalizePlan, planProgress, activationMarkdown,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();