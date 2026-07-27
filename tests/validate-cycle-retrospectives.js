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

  const plans = [
    {
      id: 'p1', product: 'Organizador modular', productKey: 'organizador-modular', channel: 'Shopee', status: 'decided',
      startDate: '2026-08-01', endDate: '2026-08-07', criteria: { minViews: 100, minClicks: 10, minOrders: 2, minMarginPct: 10 },
      tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, status: 'completed' })),
      decision: { type: 'continue', label: 'Continuar' },
    },
    {
      id: 'p2', product: 'Organizador modular', productKey: 'organizador-modular', channel: 'Mercado Livre', status: 'decided',
      startDate: '2026-08-08', endDate: '2026-08-14', criteria: { minViews: 100, minClicks: 10, minOrders: 2, minMarginPct: 10 },
      tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, status: index < 5 ? 'completed' : 'pending' })),
      decision: { type: 'adjust', label: 'Ajustar' },
    },
    {
      id: 'p3', product: 'Garrafa térmica', productKey: 'garrafa-termica', channel: 'Shopee', status: 'decided',
      startDate: '2026-08-01', endDate: '2026-08-07', criteria: { minViews: 100, minClicks: 10, minOrders: 1, minMarginPct: 10 },
      tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, status: index < 3 ? 'completed' : 'pending' })),
      decision: { type: 'abandon', label: 'Abandonar' },
    },
  ];

  const checkins = [
    { id: 'c11', planId: 'p1', date: '2026-08-01', createdAt: '2026-08-01T20:00:00Z', evidence: 'Painel do canal', metrics: { views: 70, clicks: 10, orders: 1, revenue: 120, spend: 20, productCost: 45, fees: 8, shipping: 5 } },
    { id: 'c12', planId: 'p1', date: '2026-08-02', createdAt: '2026-08-02T20:00:00Z', evidence: 'Relatório de pedidos', metrics: { views: 90, clicks: 15, orders: 2, revenue: 240, spend: 30, productCost: 90, fees: 16, shipping: 10 } },
    { id: 'c21', planId: 'p2', date: '2026-08-08', createdAt: '2026-08-08T20:00:00Z', evidence: 'Painel do anúncio', metrics: { views: 120, clicks: 12, orders: 1, revenue: 110, spend: 35, productCost: 50, fees: 12, shipping: 8 } },
    { id: 'c31', planId: 'p3', date: '2026-08-01', createdAt: '2026-08-01T20:00:00Z', evidence: 'Painel sem conversão', metrics: { views: 150, clicks: 4, orders: 0, revenue: 0, spend: 40, productCost: 0, fees: 0, shipping: 0 } },
  ];

  const changes = [
    { id: 'ch1', planId: 'p1', field: 'image', fieldLabel: 'Imagem ou criativo', changedAt: '2026-08-01T22:00:00Z', before: 'Fundo branco', after: 'Produto em uso', hypothesis: 'A imagem em uso aumentará intenção de compra.', mock: { status: 'comparable', deltas: { views: 20, clicks: 5, orders: 1, revenue: 120, spend: 10, ctr: 2.4, conversion: 3.3, netProfit: 54, netMargin: 5 } } },
    { id: 'ch2', planId: 'p2', field: 'price', fieldLabel: 'Preço', changedAt: '2026-08-08T22:00:00Z', before: 'R$ 79,90', after: 'R$ 69,90', hypothesis: 'O preço menor deve elevar a conversão.', mock: { status: 'comparable', deltas: { views: 0, clicks: 1, orders: 0, revenue: 0, spend: 5, ctr: 0.5, conversion: -1, netProfit: -5, netMargin: -2 } } },
  ];

  function derived(raw = {}) {
    const metrics = { views: Number(raw.views || 0), clicks: Number(raw.clicks || 0), orders: Number(raw.orders || 0), revenue: Number(raw.revenue || 0), spend: Number(raw.spend || 0), productCost: Number(raw.productCost || 0), fees: Number(raw.fees || 0), shipping: Number(raw.shipping || 0) };
    const totalCosts = metrics.spend + metrics.productCost + metrics.fees + metrics.shipping;
    const netProfit = metrics.revenue - totalCosts;
    return { ...metrics, totalCosts, netProfit, ctr: metrics.views ? metrics.clicks / metrics.views * 100 : 0, conversion: metrics.clicks ? metrics.orders / metrics.clicks * 100 : 0, cpa: metrics.orders ? metrics.spend / metrics.orders : null, roas: metrics.spend ? metrics.revenue / metrics.spend : null, netMargin: metrics.revenue ? netProfit / metrics.revenue * 100 : 0 };
  }
  function accumulated(planId) {
    const total = { views: 0, clicks: 0, orders: 0, revenue: 0, spend: 0, productCost: 0, fees: 0, shipping: 0 };
    for (const row of checkins.filter(item => item.planId === planId)) for (const key of Object.keys(total)) total[key] += Number(row.metrics[key] || 0);
    return derived(total);
  }

  global.CommerceRadarActivationPlan = { plans: () => plans };
  global.CommerceRadarActivationTracking = {
    checkins: () => checkins,
    changes: () => changes,
    derivedMetrics: derived,
    accumulatedMetrics: accumulated,
    compareChange: change => change.mock,
  };

  require('../activation-retrospective.js');
  const api = global.CommerceRadarCycleRetrospective;
  if (!api) throw new Error('API de retrospectivas não inicializada');

  const report = api.comparisonReport('2026-08-20');
  if (report.cycles.length !== 3) throw new Error('Quantidade de ciclos incorreta');
  if (report.cycles[0].planId !== 'p1' || report.cycles[0].outcome.id !== 'validated') throw new Error('Ciclo validado não liderou o ranking');
  if (report.byProduct.find(row => row.key === 'Organizador modular')?.cycles !== 2) throw new Error('Agrupamento por produto inválido');
  if (report.byChannel.find(row => row.key === 'Shopee')?.cycles !== 2) throw new Error('Agrupamento por canal inválido');
  const imagePattern = report.patterns.find(row => row.field === 'Imagem ou criativo');
  if (!imagePattern || imagePattern.positiveRate !== 100 || imagePattern.avgOrdersDelta !== 1) throw new Error('Padrão positivo de imagem inválido');
  const pricePattern = report.patterns.find(row => row.field === 'Preço');
  if (!pricePattern || pricePattern.positiveRate !== 0) throw new Error('Padrão negativo de preço inválido');

  let failed = false;
  try { api.saveRetrospective('p1', { worked: 'curto', failed: 'curto', nextHypothesis: 'curto' }); } catch { failed = true; }
  if (!failed) throw new Error('Retrospectiva curta deveria ser bloqueada');

  const retrospective = api.saveRetrospective('p1', {
    worked: 'A imagem em uso e a oferta clara geraram pedidos com margem positiva.',
    failed: 'O primeiro título não explicava o benefício principal do produto.',
    nextHypothesis: 'Testar um kit com duas unidades mantendo a mesma imagem principal.',
    note: 'Manter o orçamento controlado no próximo ciclo.',
  });
  if (retrospective.planId !== 'p1' || api.retrospectives().length !== 1) throw new Error('Retrospectiva não foi persistida');

  const snapshot = api.captureComparison('2026-08-20');
  if (snapshot.cycles.length !== 3 || snapshot.cycles[0].planId !== 'p1' || api.snapshots().length !== 1) throw new Error('Snapshot comparativo inválido');

  const markdown = api.retrospectiveMarkdown();
  for (const marker of ['Retrospectiva e comparação entre ciclos', 'Ranking de ciclos', 'Comparação por produto', 'Padrões de otimização', 'Aprendizados registrados', 'Tehkné Solutions']) {
    if (!markdown.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('activation-retrospective.js', 'utf8');
  const css = fs.readFileSync('activation-retrospective.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/CYCLE_RETROSPECTIVES.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();
  for (const marker of ['Retrospectiva e comparação entre ciclos', 'cycleRetrospectives', 'cycleComparisonSnapshots', 'cycleRetrospectiveSettings', 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
  for (const asset of ['./activation-retrospective.css', './activation-retrospective.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./activation-retrospective.js') < loader.indexOf('./activation-tracking.js')) throw new Error('Retrospectiva deve carregar após acompanhamento diário');
  if (!css.includes('.cycleSummary') || !css.includes('.cycleTable') || css.length < 1500) throw new Error('CSS de retrospectiva incompleto');
  const parts = version.split('.').map(Number);
  if (parts[0] !== 0 || parts[1] < 7 || (parts[1] === 7 && parts[2] < 3)) throw new Error(`Versão anterior a 0.7.3: ${version}`);
  const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
  if (!cacheMatch || Number(cacheMatch[1]) < 33) throw new Error('Cache PWA anterior às retrospectivas');
  for (const marker of ['Score do ciclo', 'Comparação por produto', 'Comparação por canal', 'Padrões de otimização', 'Retrospectiva humana', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);

  console.log('Ranking, grupos, otimizações, retrospectivas, snapshot, backup e PWA válidos.');
})();