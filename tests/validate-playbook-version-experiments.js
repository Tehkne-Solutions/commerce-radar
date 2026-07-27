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
    { id: 'pb-1', title: 'Oferta organizadores', status: 'published', sourcePlanId: 'source-1', channels: ['Shopee'] },
    { id: 'pb-2', title: 'Oferta maquiagem', status: 'published', sourcePlanId: 'source-2', channels: ['Mercado Livre'] },
    { id: 'pb-3', title: 'Oferta cozinha', status: 'published', sourcePlanId: 'source-3', channels: ['Loja própria'] },
  ];
  let applications = [];
  let plans = [];
  let cycles = [];
  let planSequence = 0;
  const snapshot = (title, promise) => ({
    title, description: `${title} documentado`, channels: ['Shopee'], confidence: 80, sourcePlanId: title.includes('maquiagem') ? 'source-2' : title.includes('cozinha') ? 'source-3' : 'source-1',
    sourceSnapshot: { score: 78 }, offer: { audience: 'Pessoas com necessidade claramente observada', promise },
    strategy: { nextHypothesis: 'Testar uma promessa mais específica sem ampliar investimento.' },
    criteria: { minViews: 100, minClicks: 10, minOrders: 2, minMarginPct: 8, maxSpend: 100 },
    checklist: Array.from({ length: 7 }, (_, index) => ({ id: `item-${index + 1}`, day: index + 1, label: `Executar tarefa ${index + 1}` })),
  });
  let versions = [
    { id: 'v1-pb1', playbookId: 'pb-1', label: 'v1', number: 1, state: 'active', snapshot: snapshot('Oferta organizadores', 'Organize melhor com uma solução visual e simples.') },
    { id: 'v1-pb2', playbookId: 'pb-2', label: 'v1', number: 1, state: 'active', snapshot: snapshot('Oferta maquiagem', 'Encontre seus itens de maquiagem com mais rapidez.') },
    { id: 'v1-pb3', playbookId: 'pb-3', label: 'v1', number: 1, state: 'active', snapshot: snapshot('Oferta cozinha', 'Organize os utensílios sem perder espaço útil.') },
  ];
  const hash = value => `hash-${JSON.stringify(value).length}-${JSON.stringify(value).charCodeAt(0)}`;
  versions = versions.map(row => ({ ...row, snapshotHash: hash(row.snapshot) }));
  let candidates = [
    { id: 'c2-pb1', playbookId: 'pb-1', proposedLabel: 'v2', proposedNumber: 2, status: 'draft', baseVersionId: 'v1-pb1', hypothesis: 'Uma promessa mais concreta pode elevar pedidos e lucro.', snapshot: snapshot('Oferta organizadores v2', 'Ganhe espaço em sete dias com organização visual.') },
    { id: 'c2-pb2', playbookId: 'pb-2', proposedLabel: 'v2', proposedNumber: 2, status: 'draft', baseVersionId: 'v1-pb2', hypothesis: 'Uma prova visual mais clara pode elevar a conversão do anúncio.', snapshot: snapshot('Oferta maquiagem v2', 'Localize cada item de maquiagem em poucos segundos.') },
    { id: 'c2-pb3', playbookId: 'pb-3', proposedLabel: 'v2', proposedNumber: 2, status: 'draft', baseVersionId: 'v1-pb3', hypothesis: 'Uma oferta focada em cozinhas pequenas pode melhorar resultados.', snapshot: snapshot('Oferta cozinha v2', 'Libere espaço em cozinhas pequenas sem reforma.') },
  ];

  global.CommerceRadarPlaybooks = {
    KEYS: { playbooks: 'playbooks', applications: 'applications' },
    playbooks: () => playbooks,
    applications: () => applications,
    cleanChecklist: rows => rows,
  };
  global.CommerceRadarActivationPlan = {
    KEYS: { plans: 'plans' },
    createPlan: (input, source) => {
      const plan = { id: `plan-${++planSequence}`, product: input.product, channel: input.channel, criteria: input, source, metrics: { views: 0, clicks: 0, orders: 0, revenue: 0, investment: 0 }, tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, checklist: [] })) };
      plans.push(plan);
      store.set('plans', JSON.stringify(plans));
      return plan;
    },
  };
  global.CommerceRadarCycleRetrospective = { cycleSummaries: () => cycles };
  global.CommerceRadarPlaybookPerformance = {
    compareApplication: (application, playbook, cycleMap) => {
      const target = cycleMap.get(application.planId);
      if (!target) return { application, comparable: false, result: 'pending', target: null };
      const comparable = target.status === 'decided';
      if (!comparable) return { application, comparable: false, result: 'pending', target };
      const result = target.outcome.id === 'validated' && target.metrics.orders > 0 && target.metrics.netProfit > 0 ? 'reproduced' : target.outcome.id === 'discarded' || target.metrics.netProfit < 0 ? 'failed' : 'partial';
      return { application, comparable: true, result, target, deltas: { score: target.score - 70, profit: target.metrics.netProfit } };
    },
  };
  global.CommerceRadarPlaybookVersions = {
    KEYS: { versions: 'versions', candidates: 'candidates' },
    versions: () => versions,
    candidates: () => candidates,
    hashSnapshot: hash,
    ensureBaseline: playbook => versions.find(row => row.playbookId === playbook.id),
    activeVersion: playbookId => versions.find(row => row.playbookId === playbookId && row.state === 'active'),
    validateCandidate: candidate => ({ valid: Boolean(candidate && candidate.hypothesis.length >= 20 && candidate.snapshot.checklist.length >= 5), errors: ['Candidata inválida'] }),
    publishCandidate: (id, note, confirmation) => {
      if (confirmation !== 'PUBLICAR') throw new Error('Confirmação inválida');
      const candidate = candidates.find(row => row.id === id);
      if (!candidate) return null;
      versions = versions.map(row => row.playbookId === candidate.playbookId && row.state === 'active' ? { ...row, state: 'superseded' } : row);
      const version = { id: `published-${candidate.id}`, playbookId: candidate.playbookId, label: candidate.proposedLabel, number: candidate.proposedNumber, state: 'active', snapshot: candidate.snapshot, snapshotHash: hash(candidate.snapshot), reviewNote: note };
      versions.unshift(version);
      candidates = candidates.filter(row => row.id !== id);
      return version;
    },
  };

  require('../activation-playbook-version-experiments.js');
  const api = global.CommerceRadarPlaybookVersionExperiments;
  if (!api) throw new Error('API de experimentos entre versões não inicializada');

  const experiment = api.createExperiment('pb-1', { hypothesis: 'A variante específica deve elevar reprodução e lucro médio.' });
  if (experiment.champion.label !== 'v1' || experiment.challenger.label !== 'v2' || experiment.status !== 'draft') throw new Error('Congelamento champion–challenger inválido');
  api.startExperiment(experiment.id);

  const championA = api.applyArm(experiment.id, 'champion', { product: 'Organizador A', channel: 'Shopee', budget: 50 });
  const championB = api.applyArm(experiment.id, 'champion', { product: 'Organizador B', channel: 'Shopee', budget: 50 });
  const challengerA = api.applyArm(experiment.id, 'challenger', { product: 'Organizador C', channel: 'Shopee', budget: 50 });
  const challengerB = api.applyArm(experiment.id, 'challenger', { product: 'Organizador D', channel: 'Shopee', budget: 50 });
  if (championA.plan.metrics.orders !== 0 || challengerA.plan.metrics.revenue !== 0) throw new Error('Ciclos deveriam iniciar com métricas zeradas');
  if (challengerA.application.playbookVersionSource !== 'candidate_shadow' || challengerA.application.versionExperimentArm !== 'challenger') throw new Error('Challenger não foi identificado em modo sombra');

  cycles = [
    { planId: championA.plan.id, status: 'decided', outcome: { id: 'discarded' }, score: 45, metrics: { orders: 0, netProfit: -60 } },
    { planId: championB.plan.id, status: 'decided', outcome: { id: 'discarded' }, score: 50, metrics: { orders: 0, netProfit: -40 } },
    { planId: challengerA.plan.id, status: 'decided', outcome: { id: 'validated' }, score: 82, metrics: { orders: 3, netProfit: 120 } },
    { planId: challengerB.plan.id, status: 'decided', outcome: { id: 'validated' }, score: 85, metrics: { orders: 4, netProfit: 140 } },
  ];
  const evaluation = api.evaluateExperiment(experiment.id, '2026-08-30');
  if (!evaluation.sufficient || evaluation.winner !== 'challenger' || evaluation.champion.replicationRate !== 0 || evaluation.challenger.replicationRate !== 100) throw new Error(`Avaliação challenger inválida: ${JSON.stringify(evaluation)}`);

  let blocked = false;
  try { api.promoteChallenger(experiment.id, 'Resultados do challenger superaram o champion com lucro e reprodução.', 'confirmar'); } catch { blocked = true; }
  if (!blocked) throw new Error('Promoção sem PROMOVER deveria ser bloqueada');
  const promoted = api.promoteChallenger(experiment.id, 'Resultados do challenger superaram o champion com lucro e reprodução.', 'PROMOVER');
  if (promoted.version.label !== 'v2' || promoted.experiment.status !== 'promoted' || api.decisions().length !== 1) throw new Error('Promoção manual não foi persistida');

  const keepExperiment = api.createExperiment('pb-2', { hypothesis: 'A nova prova visual pode ser comparada sem trocar a versão ativa.' });
  api.startExperiment(keepExperiment.id);
  const k1 = api.applyArm(keepExperiment.id, 'champion', { product: 'Kit A', channel: 'Mercado Livre' });
  const k2 = api.applyArm(keepExperiment.id, 'champion', { product: 'Kit B', channel: 'Mercado Livre' });
  const k3 = api.applyArm(keepExperiment.id, 'challenger', { product: 'Kit C', channel: 'Mercado Livre' });
  const k4 = api.applyArm(keepExperiment.id, 'challenger', { product: 'Kit D', channel: 'Mercado Livre' });
  cycles.push(
    { planId: k1.plan.id, status: 'decided', outcome: { id: 'validated' }, score: 82, metrics: { orders: 3, netProfit: 100 } },
    { planId: k2.plan.id, status: 'decided', outcome: { id: 'validated' }, score: 84, metrics: { orders: 4, netProfit: 110 } },
    { planId: k3.plan.id, status: 'decided', outcome: { id: 'discarded' }, score: 48, metrics: { orders: 0, netProfit: -50 } },
    { planId: k4.plan.id, status: 'decided', outcome: { id: 'discarded' }, score: 44, metrics: { orders: 0, netProfit: -70 } },
  );
  const kept = api.keepChampion(keepExperiment.id, 'A versão ativa manteve lucro e reprodução superiores nos ciclos comparáveis.', 'MANTER');
  if (kept.experiment.status !== 'rejected' || api.decisions().length !== 2) throw new Error('Decisão de manter champion não foi persistida');

  const drifted = api.createExperiment('pb-3', { hypothesis: 'A oferta para cozinhas pequenas deve ser testada com configuração congelada.' });
  candidates.find(row => row.id === 'c2-pb3').snapshot.offer.promise = 'Conteúdo alterado externamente depois do congelamento.';
  blocked = false;
  try { api.startExperiment(drifted.id); } catch { blocked = true; }
  if (!blocked || api.currentIntegrity(drifted).valid) throw new Error('Alteração externa da candidata deveria bloquear o experimento');

  const snapshotRow = api.captureSnapshot('2026-08-30');
  if (!snapshotRow.rows.length || api.snapshots().length !== 1) throw new Error('Snapshot de experimentos inválido');
  const report = api.markdown();
  for (const marker of ['Experimentos entre versões', 'Champion:', 'Challenger:', 'PROMOVER', 'Tehkné Solutions']) if (!report.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);

  const code = fs.readFileSync('activation-playbook-version-experiments.js', 'utf8');
  const css = fs.readFileSync('activation-playbook-version-experiments.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/PLAYBOOK_VERSION_EXPERIMENTS.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();
  for (const marker of ['playbookVersionExperiments', 'playbookVersionAssignments', 'playbookVersionDecisions', 'playbookVersionExperimentSnapshots', 'candidate_shadow', 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
  for (const asset of ['./activation-playbook-version-experiments.css', './activation-playbook-version-experiments.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./activation-playbook-version-experiments.js') < loader.indexOf('./activation-playbook-versions.js')) throw new Error('Experimentos devem carregar após versionamento');
  if (!css.includes('.pbxSummary') || !css.includes('.pbxArms') || css.length < 1500) throw new Error('CSS dos experimentos incompleto');
  if (version !== '0.7.7') throw new Error(`Versão incorreta: ${version}`);
  if (!sw.includes('commerce-radar-v37')) throw new Error('Cache PWA não foi atualizado');
  for (const marker of ['Configuração congelada', 'Modo sombra', 'Amostra mínima', 'Promoção do challenger', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);

  console.log('Experimentos, amostra, integridade, promoção, manutenção, backup e PWA válidos.');
})();