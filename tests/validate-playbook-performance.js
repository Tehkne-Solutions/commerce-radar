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

  const playbooks = [
    { id: 'pb-effective', title: 'Oferta modular', status: 'published', sourcePlanId: 'src-effective' },
    { id: 'pb-degraded', title: 'Preço agressivo', status: 'published', sourcePlanId: 'src-degraded' },
    { id: 'pb-stale', title: 'Criativo antigo', status: 'published', sourcePlanId: 'src-stale' },
    { id: 'pb-insufficient', title: 'Canal novo', status: 'published', sourcePlanId: 'src-insufficient' },
    { id: 'pb-unused', title: 'Modelo sem uso', status: 'published', sourcePlanId: 'src-unused' },
  ];

  const applications = [
    { id: 'a1', playbookId: 'pb-effective', sourcePlanId: 'src-effective', planId: 'eff-1', product: 'Produto A', channel: 'Shopee', appliedAt: '2026-08-05T10:00:00Z' },
    { id: 'a2', playbookId: 'pb-effective', sourcePlanId: 'src-effective', planId: 'eff-2', product: 'Produto B', channel: 'Shopee', appliedAt: '2026-08-10T10:00:00Z' },
    { id: 'a3', playbookId: 'pb-effective', sourcePlanId: 'src-effective', planId: 'eff-3', product: 'Produto C', channel: 'Mercado Livre', appliedAt: '2026-08-15T10:00:00Z' },
    { id: 'd1', playbookId: 'pb-degraded', sourcePlanId: 'src-degraded', planId: 'deg-1', product: 'Produto D', channel: 'Shopee', appliedAt: '2026-08-12T10:00:00Z' },
    { id: 'd2', playbookId: 'pb-degraded', sourcePlanId: 'src-degraded', planId: 'deg-2', product: 'Produto E', channel: 'Shopee', appliedAt: '2026-08-16T10:00:00Z' },
    { id: 's1', playbookId: 'pb-stale', sourcePlanId: 'src-stale', planId: 'stale-1', product: 'Produto F', channel: 'Loja própria', appliedAt: '2025-12-01T10:00:00Z' },
    { id: 's2', playbookId: 'pb-stale', sourcePlanId: 'src-stale', planId: 'stale-2', product: 'Produto G', channel: 'Loja própria', appliedAt: '2025-12-08T10:00:00Z' },
    { id: 'i1', playbookId: 'pb-insufficient', sourcePlanId: 'src-insufficient', planId: 'ins-1', product: 'Produto H', channel: 'Instagram', appliedAt: '2026-08-14T10:00:00Z' },
  ];

  const source = (planId, score = 80, profit = 120) => ({
    planId, product: planId, channel: 'Origem', status: 'decided', decision: { type: 'continue' }, outcome: { id: 'validated' }, score,
    metrics: { orders: 3, revenue: 500, netProfit: profit, netMargin: 24, ctr: 8, conversion: 12 },
  });
  const reproduced = (planId, score = 76, profit = 100) => ({
    planId, product: planId, channel: 'Destino', status: 'decided', decision: { type: 'continue' }, outcome: { id: 'validated' }, score,
    metrics: { orders: 3, revenue: 480, netProfit: profit, netMargin: 21, ctr: 7.5, conversion: 11 },
  });
  const failed = (planId, score = 40, profit = -60) => ({
    planId, product: planId, channel: 'Destino', status: 'decided', decision: { type: 'abandon' }, outcome: { id: 'discarded' }, score,
    metrics: { orders: 0, revenue: 0, netProfit: profit, netMargin: -20, ctr: 2, conversion: 0 },
  });

  const cycles = [
    source('src-effective'), reproduced('eff-1', 75, 95), reproduced('eff-2', 78, 110), reproduced('eff-3', 77, 105),
    source('src-degraded', 82, 140), failed('deg-1', 45, -50), failed('deg-2', 38, -80),
    source('src-stale', 79, 115), reproduced('stale-1', 75, 90), reproduced('stale-2', 74, 85),
    source('src-insufficient', 80, 100), reproduced('ins-1', 78, 90),
    source('src-unused', 77, 90),
  ];

  global.CommerceRadarPlaybooks = {
    KEYS: { playbooks: 'tehkne-commerce-radar-v74-learning-playbooks', applications: 'tehkne-commerce-radar-v74-playbook-applications' },
    playbooks: () => playbooks,
    applications: () => applications,
    archivePlaybook: id => {
      const row = playbooks.find(item => item.id === id);
      if (!row) return null;
      row.status = 'archived';
      return row;
    },
  };
  global.CommerceRadarCycleRetrospective = { cycleSummaries: () => cycles };

  require('../activation-playbook-performance.js');
  const api = global.CommerceRadarPlaybookPerformance;
  if (!api) throw new Error('API de desempenho não inicializada');

  const report = api.performanceReport('2026-08-20', playbooks, applications, cycles, api.DEFAULTS);
  const effective = report.rows.find(row => row.playbookId === 'pb-effective');
  const degraded = report.rows.find(row => row.playbookId === 'pb-degraded');
  const stale = report.rows.find(row => row.playbookId === 'pb-stale');
  const insufficient = report.rows.find(row => row.playbookId === 'pb-insufficient');
  const unused = report.rows.find(row => row.playbookId === 'pb-unused');

  if (!effective || effective.classification.id !== 'effective' || effective.replicationRate !== 100 || effective.completed !== 3) throw new Error(`Playbook eficaz inválido: ${JSON.stringify(effective)}`);
  if (!degraded || degraded.classification.id !== 'degraded' || degraded.failed !== 2 || degraded.replicationRate !== 0) throw new Error('Playbook degradado não foi identificado');
  if (!stale || stale.classification.id !== 'stale') throw new Error('Playbook desatualizado não foi identificado');
  if (!insufficient || insufficient.classification.id !== 'insufficient') throw new Error('Amostra insuficiente não foi identificada');
  if (!unused || unused.classification.id !== 'unused') throw new Error('Playbook nunca aplicado não foi identificado');
  if (report.effective !== 1 || report.attention !== 2 || report.comparable !== 8 || report.applications !== 8) throw new Error(`Resumo incorreto: ${JSON.stringify(report)}`);

  let blocked = false;
  try { api.recordReview('pb-degraded', 'archive', 'curto'); } catch { blocked = true; }
  if (!blocked) throw new Error('Justificativa curta deveria ser bloqueada');

  const review = api.recordReview('pb-degraded', 'archive', 'Os dois ciclos mais recentes falharam e terminaram com prejuízo preliminar.');
  if (review.action !== 'archive' || api.reviews().length !== 1) throw new Error('Revisão de arquivamento não foi persistida');

  blocked = false;
  try { api.executeArchive('pb-degraded', 'confirmar'); } catch { blocked = true; }
  if (!blocked) throw new Error('Arquivamento sem palavra de confirmação deveria ser bloqueado');
  api.executeArchive('pb-degraded', 'ARQUIVAR');
  if (playbooks.find(row => row.id === 'pb-degraded').status !== 'archived') throw new Error('Playbook não foi arquivado após confirmação');

  const snapshot = api.capturePerformance('2026-08-20');
  if (snapshot.rows.length !== 5 || api.snapshots().length !== 1) throw new Error('Snapshot de desempenho inválido');

  const markdown = api.performanceMarkdown();
  for (const marker of ['Desempenho dos playbooks', 'Taxa de reprodução', 'Variação média de lucro', 'Nenhum playbook é arquivado automaticamente', 'Tehkné Solutions']) {
    if (!markdown.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('activation-playbook-performance.js', 'utf8');
  const css = fs.readFileSync('activation-playbook-performance.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/PLAYBOOK_PERFORMANCE.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['Desempenho dos playbooks', 'playbookPerformanceSettings', 'playbookPerformanceSnapshots', 'playbookPerformanceReviews', 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
  for (const asset of ['./activation-playbook-performance.css', './activation-playbook-performance.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./activation-playbook-performance.js') < loader.indexOf('./activation-playbooks.js')) throw new Error('Desempenho deve carregar após a biblioteca');
  if (!css.includes('.pbpSummary') || !css.includes('.pbpCard') || css.length < 1500) throw new Error('CSS de desempenho incompleto');
  if (version !== '0.7.5') throw new Error(`Versão incorreta: ${version}`);
  if (!sw.includes('commerce-radar-v35')) throw new Error('Cache PWA não foi atualizado');
  for (const marker of ['Unidade de comparação', 'Resultado de cada aplicação', 'Classificação do playbook', 'Arquivamento protegido', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);

  console.log('Desempenho, classificação, revisão, arquivamento, snapshot, backup e PWA válidos.');
})();
