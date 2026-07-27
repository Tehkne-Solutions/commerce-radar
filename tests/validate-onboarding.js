const fs = require('fs');

(async () => {
  const store = new Map();
  const sessions = new Map();
  const identityUsers = [];
  global.window = undefined;
  global.document = undefined;
  global.localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
  global.sessionStorage = {
    getItem: key => sessions.has(key) ? sessions.get(key) : null,
    setItem: (key, value) => sessions.set(key, String(value)),
    removeItem: key => sessions.delete(key),
  };

  global.CommerceRadarLocalIdentity = {
    users: () => [...identityUsers],
    profiles: () => [{ id: 'administrator', name: 'Administrador', active: true }, { id: 'viewer', name: 'Leitor', active: true }],
    currentUser: () => identityUsers[0] || null,
    hasPermission: (permission, user) => Boolean(user && user.profileId === 'administrator' && permission === 'identity.manage'),
    createUser: async input => {
      if (!input.name || String(input.pin || '').length < 4) throw new Error('Usuário inválido');
      const row = { id: `user-${identityUsers.length + 1}`, name: input.name, email: input.email || '', profileId: input.profileId, active: true };
      identityUsers.push(row);
      return row;
    },
  };

  require('../trend-radar.js');
  require('../recommendations.js');
  require('../onboarding.js');

  const api = global.CommerceRadarOnboarding;
  if (!api) throw new Error('API do onboarding não inicializada');

  if (api.parseMoney('R$ 1.250,50') !== 1250.5) throw new Error('Moeda pt-BR não foi interpretada');
  const workspace = api.saveWorkspace({
    name: 'Operação inicial',
    model: 'resale',
    objective: 'discover',
    monthlyBudget: 'R$ 1.250,50',
    targetDays: 21,
  });
  if (workspace.monthlyBudget !== 1250.5 || workspace.targetDays !== 21) throw new Error('Workspace inválido');

  const channels = api.saveChannels(['Shopee', 'Mercado Livre', 'Shopee', 'Canal inexistente']);
  if (channels.length !== 2 || !channels.includes('Shopee')) throw new Error('Seleção de canais inválida');

  const admin = await api.createAdministrator({ name: 'Admin Inicial', email: 'admin@example.com', pin: '1234' });
  if (!admin || identityUsers.length !== 1 || admin.profileId !== 'administrator') throw new Error('Administrador inicial não foi criado');

  api.saveDataMode('manual');
  const starter = api.saveStarterProduct({
    product: 'Organizador modular de gavetas',
    category: 'casa',
    channel: 'Shopee',
    sourceType: 'search',
    sourceName: 'Busca observada',
    sourceUrl: 'https://example.com/evidencia',
    evidence: 'A procura pelo termo cresceu e aparecem dúvidas recorrentes sobre organização.',
    price: 'R$ 89,90',
    cost: 'R$ 32,50',
    capital: 'R$ 0,00',
    growth: 4,
    demand: 4,
    competition: 3,
    margin: 4,
    risk: 2,
    confidence: 3,
  });

  if (!starter.signal || !starter.opportunity || !starter.analysis) throw new Error('Registros iniciais não foram criados');
  if (JSON.parse(store.get(api.KEYS.signals)).length !== 1) throw new Error('Sinal inicial não foi persistido');
  if (JSON.parse(store.get(api.KEYS.opportunities)).length !== 1) throw new Error('Oportunidade inicial não foi persistida');
  if (JSON.parse(store.get(api.KEYS.analyses)).length !== 1) throw new Error('Análise inicial não foi persistida');
  if ((JSON.parse(store.get(api.KEYS.tests) || '[]')).length !== 0) throw new Error('O onboarding inventou um teste ou pedidos');

  const recommendation = api.buildFirstRecommendation();
  if (!recommendation || recommendation.product !== 'Organizador modular de gavetas') throw new Error('Primeira recomendação não foi gerada');
  if (recommendation.testResult.orders !== 0) throw new Error('A recomendação inventou pedidos');
  if (!recommendation.nextAction) throw new Error('Próxima ação não foi calculada');

  const progress = api.progress();
  if (progress.completed !== progress.total || progress.percent !== 100) throw new Error(`Onboarding incompleto: ${JSON.stringify(progress.steps)}`);

  const completed = api.completeOnboarding();
  if (completed.status !== 'completed' || !completed.completedAt) throw new Error('Conclusão não foi persistida');
  if (!api.events().some(event => event.type === 'onboarding_completed')) throw new Error('Conclusão não entrou na trilha');

  const report = api.onboardingMarkdown();
  for (const marker of ['Configuração guiada', 'Operação inicial', 'Organizador modular de gavetas', 'Tehkné Solutions']) {
    if (!report.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('onboarding.js', 'utf8');
  const css = fs.readFileSync('onboarding.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/ONBOARDING_GUIDE.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['ONBOARDING OPERACIONAL', 'onboardingState', 'onboardingEvents', "version: '0.7.0'", 'Tehkné Solutions']) {
    if (!code.includes(marker)) throw new Error(`Marcador ausente no onboarding: ${marker}`);
  }
  for (const asset of ['./onboarding.css', './onboarding.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
  }
  if (loader.indexOf('./onboarding.js') < loader.indexOf('./recommendation-access-review.js')) throw new Error('Onboarding deve carregar após identidade e revisão de acesso');
  if (!css.includes('.onboardingProgress') || !css.includes('.onboardingPanel') || css.length < 2500) throw new Error('CSS do onboarding incompleto');
  if (version !== '0.7.0') throw new Error(`Versão incorreta: ${version}`);
  if (!sw.includes('commerce-radar-v30')) throw new Error('Cache PWA não foi atualizado');
  for (const marker of ['Etapa 1 — Workspace', 'Etapa 3 — Equipe', 'Etapa 4 — Origem dos dados', 'Primeira recomendação', 'Critérios de conclusão', 'Backup e sincronização']) {
    if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
  }

  console.log('Workspace, canais, equipe, dados, produto, recomendação, backup e PWA válidos.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
