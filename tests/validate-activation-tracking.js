const fs = require('fs');

(() => {
  const store = new Map();
  global.window = undefined;
  global.document = undefined;
  global.localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
  global.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  global.dispatchEvent = () => true;
  global.addEventListener = () => true;

  const recommendation = {
    key: 'organizador-modular', product: 'Organizador modular', score: 74, confidence: 62,
    classification: { id: 'test', label: 'Testar agora' }, nextAction: 'Executar validação controlada.', channels: ['Shopee'],
  };
  global.CommerceRadarRecommendations = { DEFAULTS: {}, buildRanking: () => [recommendation] };
  global.CommerceRadarOnboarding = {
    state: () => ({ starterProductKey: recommendation.key, channels: ['Shopee'], workspace: { monthlyBudget: 1000 } }),
    buildFirstRecommendation: () => recommendation,
  };

  require('../activation-plan.js');
  const planApi = global.CommerceRadarActivationPlan;
  const draft = planApi.createPlan({
    startDate: '2026-08-03', budget: 'R$ 280,00', minViews: 140, minClicks: 21, minOrders: 2, minMarginPct: 10, maxSpend: 'R$ 280,00',
  }, recommendation);
  const active = planApi.activatePlan(draft.id);

  require('../activation-tracking.js');
  const api = global.CommerceRadarActivationTracking;
  if (!api) throw new Error('API de acompanhamento não inicializada');
  if (api.parseMoney('R$ 1.250,50') !== 1250.5) throw new Error('Moeda pt-BR inválida');

  const dayOne = api.saveCheckin(active.id, {
    date: '2026-08-03', createdAt: '2026-08-03T20:00:00.000Z', views: 35, clicks: 4, orders: 0,
    revenue: 0, spend: 'R$ 20,00', productCost: 0, fees: 0, shipping: 0,
    evidence: 'Print do painel do canal no fim do primeiro dia.', confidence: 4, offerSnapshot: 'Preço R$ 89,90 e imagem principal branca.',
  });
  const dayTwo = api.saveCheckin(active.id, {
    date: '2026-08-04', createdAt: '2026-08-04T20:00:00.000Z', views: 55, clicks: 10, orders: 1,
    revenue: 'R$ 89,90', spend: 'R$ 25,00', productCost: 'R$ 32,50', fees: 'R$ 9,00', shipping: 'R$ 8,00',
    evidence: 'Relatório do canal com o primeiro pedido confirmado.', confidence: 5, offerSnapshot: 'Preço R$ 84,90 e nova imagem com uso real.',
  });
  if (!dayOne.id || !dayTwo.id || api.planCheckins(active.id).length !== 2) throw new Error('Check-ins não foram persistidos');

  const accumulated = api.accumulatedMetrics(active.id);
  if (accumulated.views !== 90 || accumulated.clicks !== 14 || accumulated.orders !== 1 || accumulated.revenue !== 89.9 || accumulated.spend !== 45) {
    throw new Error(`Acumulado diário inválido: ${JSON.stringify(accumulated)}`);
  }
  const updatedPlan = planApi.plans().find(row => row.id === active.id);
  if (updatedPlan.metrics.views !== 90 || updatedPlan.metrics.orders !== 1) throw new Error('Acumulado não atualizou o plano original');
  const linkedTest = JSON.parse(store.get(planApi.KEYS.tests)).find(row => row.id === active.linkedTestId);
  if (linkedTest.views !== 90 || linkedTest.orders !== 1 || linkedTest.revenue !== 89.9) throw new Error('Acumulado não atualizou o teste vinculado');

  const target = api.targetForDay(updatedPlan, 3);
  if (target.views !== 60 || target.clicks !== 9 || Math.abs(target.orders - (6 / 7)) > 0.001 || target.spend !== 120) {
    throw new Error(`Meta acumulada inválida: ${JSON.stringify(target)}`);
  }

  const alerts = api.planAlerts(updatedPlan, '2026-08-05');
  if (!alerts.some(row => row.type === 'missing_checkin')) throw new Error('Check-in ausente não gerou alerta');
  if (!alerts.some(row => row.type === 'task_overdue')) throw new Error('Tarefa atrasada não gerou alerta');

  const change = api.recordOfferChange(active.id, {
    field: 'image', before: 'Imagem em fundo branco', after: 'Imagem mostrando uso real na gaveta',
    hypothesis: 'A demonstração de uso deve aumentar o clique e a conversão.', changedAt: '2026-08-03T23:00:00.000Z',
  });
  const comparison = api.compareChange(change);
  if (comparison.status !== 'comparable') throw new Error('Mudança não encontrou check-ins antes e depois');
  if (comparison.deltas.clicks !== 6 || comparison.deltas.orders !== 1 || comparison.deltas.revenue !== 89.9) {
    throw new Error(`Comparação antes/depois inválida: ${JSON.stringify(comparison.deltas)}`);
  }

  const report = api.trackingMarkdown(active.id);
  for (const marker of ['Acompanhamento diário do plano', 'Acumulado', 'Check-ins', 'Mudanças na oferta', 'Tehkné Solutions']) {
    if (!report.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('activation-tracking.js', 'utf8');
  const css = fs.readFileSync('activation-tracking.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/DAILY_ACTIVATION_TRACKING.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['ACOMPANHAMENTO DIÁRIO', 'activationCheckins', 'activationChanges', 'activationTrackingSettings', 'Tehkné Solutions']) {
    if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
  }
  for (const asset of ['./activation-tracking.css', './activation-tracking.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./activation-tracking.js') < loader.indexOf('./activation-plan.js')) throw new Error('Acompanhamento deve carregar após o plano');
  if (!css.includes('.trackingSummary') || !css.includes('.trackingLayout') || css.length < 1800) throw new Error('CSS de acompanhamento incompleto');
  const parts = version.split('.').map(Number);
  if (parts[0] !== 0 || parts[1] < 7 || (parts[1] === 7 && parts[2] < 2)) throw new Error(`Versão anterior a 0.7.2: ${version}`);
  const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
  if (!cacheMatch || Number(cacheMatch[1]) < 32) throw new Error('Cache PWA anterior ao acompanhamento diário');
  for (const marker of ['Check-in diário', 'Meta acumulada', 'Alertas', 'Mudanças na oferta', 'Comparação antes e depois', 'Backup e sincronização']) {
    if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
  }

  console.log('Check-ins, metas, alertas, mudanças, comparação, backup e PWA válidos.');
})();