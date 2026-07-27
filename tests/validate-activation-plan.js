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

  const baseRecommendation = {
    key: 'organizador-modular',
    product: 'Organizador modular',
    score: 72,
    confidence: 58,
    classification: { id: 'test', label: 'Testar agora' },
    nextAction: 'Criar um teste pequeno com métricas de clique e pedido.',
    channels: ['Shopee'],
  };

  global.CommerceRadarRecommendations = {
    DEFAULTS: {},
    buildRanking: () => [baseRecommendation],
  };
  global.CommerceRadarOnboarding = {
    state: () => ({
      starterProductKey: 'organizador-modular',
      channels: ['Shopee'],
      workspace: { monthlyBudget: 1000 },
    }),
    buildFirstRecommendation: () => baseRecommendation,
  };

  require('../activation-plan.js');
  const api = global.CommerceRadarActivationPlan;
  if (!api) throw new Error('API do plano não inicializada');

  if (api.parseMoney('R$ 1.250,50') !== 1250.5) throw new Error('Moeda pt-BR inválida');
  const plan = api.createPlan({
    startDate: '2026-08-03',
    budget: 'R$ 250,00',
    minViews: 100,
    minClicks: 10,
    minOrders: 2,
    minMarginPct: 10,
    maxSpend: 'R$ 250,00',
  }, baseRecommendation);

  if (plan.tasks.length !== 7) throw new Error('Plano não possui sete dias');
  if (plan.tasks[0].dueDate !== '2026-08-03' || plan.tasks[6].dueDate !== '2026-08-09') throw new Error('Datas diárias inválidas');
  if (plan.status !== 'draft' || plan.linkedTestId) throw new Error('Plano deveria iniciar como rascunho sem teste');
  if ((JSON.parse(store.get(api.KEYS.tests) || '[]')).length !== 0) throw new Error('Criação do plano inventou um teste');

  const active = api.activatePlan(plan.id);
  const testsAfterActivation = JSON.parse(store.get(api.KEYS.tests));
  const linked = testsAfterActivation.find(row => row.id === active.linkedTestId);
  if (!linked || linked.views !== 0 || linked.clicks !== 0 || linked.orders !== 0 || linked.revenue !== 0 || linked.investment !== 0) {
    throw new Error('Teste inicial não foi criado com métricas zeradas');
  }

  const firstTask = active.tasks[0];
  const completedChecklist = firstTask.checklist.map(item => ({ ...item, done: true }));
  const taskUpdated = api.updateTask(active.id, 1, { checklist: completedChecklist, status: 'completed', evidence: 'Hipótese, preço e limite registrados.' });
  if (taskUpdated.tasks[0].status !== 'completed' || api.planProgress(taskUpdated).completed !== 1) throw new Error('Tarefa não foi concluída');

  const successful = api.recordMetrics(active.id, {
    views: 240,
    clicks: 32,
    orders: 3,
    revenue: 'R$ 360,00',
    spend: 'R$ 60,00',
    productCost: 'R$ 150,00',
    fees: 'R$ 24,00',
    shipping: 'R$ 18,00',
  });
  if (successful.evaluation.suggestion !== 'continue') throw new Error(`Continuidade não foi sugerida: ${JSON.stringify(successful.evaluation)}`);
  const linkedUpdated = JSON.parse(store.get(api.KEYS.tests)).find(row => row.id === active.linkedTestId);
  if (linkedUpdated.orders !== 3 || linkedUpdated.revenue !== 360 || linkedUpdated.investment !== 60) throw new Error('Métricas não foram sincronizadas com o teste');
  if (successful.decision) throw new Error('O sistema registrou decisão humana automaticamente');

  const finalized = api.finalizePlan(active.id, 'continue', 'Os pedidos atingiram a meta e a margem preliminar permaneceu positiva.');
  if (finalized.status !== 'decided' || finalized.decision.type !== 'continue' || finalized.decision.suggested !== 'continue') throw new Error('Decisão humana não foi persistida');

  const adjustPlan = api.createPlan({ product: 'Produto com custo alto', channel: 'Mercado Livre', startDate: '2026-08-03', minOrders: 1, minMarginPct: 10 }, null);
  api.activatePlan(adjustPlan.id);
  const adjusted = api.recordMetrics(adjustPlan.id, { views: 180, clicks: 20, orders: 1, revenue: 100, spend: 30, productCost: 65, fees: 12, shipping: 8 });
  if (adjusted.evaluation.suggestion !== 'adjust') throw new Error('Operação com pedido e prejuízo deveria sugerir ajuste');

  const abandonPlan = api.createPlan({ product: 'Produto sem interesse', channel: 'Shopee', startDate: '2026-07-01', minViews: 100, minClicks: 10, minOrders: 1, maxSpend: 100 }, null);
  const abandonEvaluation = api.evaluatePlan({ ...abandonPlan, metrics: { views: 150, clicks: 0, orders: 0, revenue: 0, spend: 100, productCost: 0, fees: 0, shipping: 0 } }, '2026-07-10');
  if (abandonEvaluation.suggestion !== 'abandon') throw new Error('Plano encerrado sem interesse deveria sugerir abandono');

  const report = api.activationMarkdown(finalized);
  for (const marker of ['Plano de ativação de sete dias', 'Critérios', 'Resultados', 'Decisão humana', 'Tehkné Solutions']) {
    if (!report.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('activation-plan.js', 'utf8');
  const css = fs.readFileSync('activation-plan.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/SEVEN_DAY_ACTIVATION.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['Plano de 7 dias', 'activationPlans', 'activationEvents', 'activationSettings', "version: '0.7.1'", 'Tehkné Solutions']) {
    if (!code.includes(marker)) throw new Error(`Marcador ausente no módulo: ${marker}`);
  }
  for (const asset of ['./activation-plan.css', './activation-plan.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./activation-plan.js') < loader.indexOf('./onboarding.js')) throw new Error('Plano deve carregar após onboarding');
  if (!css.includes('.activationSummary') || !css.includes('.activationPlan') || css.length < 2500) throw new Error('CSS do plano incompleto');
  const parts = version.split('.').map(Number);
  if (parts[0] !== 0 || parts[1] < 7 || (parts[1] === 7 && parts[2] < 1)) throw new Error(`Versão anterior a 0.7.1: ${version}`);
  const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
  if (!cacheMatch || Number(cacheMatch[1]) < 31) throw new Error('Cache PWA anterior ao plano de sete dias');
  for (const marker of ['Dia 1 — Hipótese e oferta', 'Dia 7 — Decisão', 'Sugestões do sistema', 'Decisão humana', 'Integração com testes', 'Backup e sincronização']) {
    if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
  }

  console.log('Plano, tarefas, métricas, sugestões, decisão, backup e PWA válidos.');
})();