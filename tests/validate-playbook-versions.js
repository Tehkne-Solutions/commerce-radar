const assert = require('assert');
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

const playbooksKey = 'tehkne-commerce-radar-v74-learning-playbooks';
const applicationsKey = 'tehkne-commerce-radar-v74-playbook-applications';
const plansKey = 'tehkne-commerce-radar-v71-activation-plans';
const playbook = {
  id: 'pb-1', status: 'published', title: 'Oferta visual para organização', description: 'Modelo publicado',
  channels: ['Shopee'], confidence: 84, sourcePlanId: 'source-plan',
  sourceSnapshot: { product: 'Organizador modular', channel: 'Shopee', score: 82, orders: 4, profit: 190 },
  offer: { audience: 'Pessoas que organizam gavetas pequenas.', promise: 'Organizar gavetas com módulos adaptáveis.', problem: 'Objetos soltos.', creative: 'Antes e depois.' },
  strategy: { nextHypothesis: 'Testar a promessa em outra categoria mantendo a prova visual.', worked: 'Imagem de uso real.', failed: 'Preço inicial alto.' },
  criteria: { minViews: 100, minClicks: 10, minOrders: 2, minMarginPct: 10, maxSpend: 140 },
  checklist: Array.from({ length: 7 }, (_, index) => ({ id: `item-${index}`, day: index + 1, label: `Executar item ${index + 1}` })),
  createdAt: '2026-06-01T10:00:00Z', publishedAt: '2026-06-02T10:00:00Z',
};
store.set(playbooksKey, JSON.stringify([playbook]));
store.set(applicationsKey, JSON.stringify([
  { id: 'app-old', playbookId: 'pb-1', sourcePlanId: 'source-plan', planId: 'target-old', product: 'Organizador antigo', channel: 'Shopee', appliedAt: '2026-06-10T10:00:00Z' },
]));
store.set(plansKey, JSON.stringify([]));

const cleanChecklist = (items) => {
  const rows = Array.isArray(items) ? items : String(items || '').split(/\r?\n/);
  return rows.map((item, index) => typeof item === 'string'
    ? { id: `clean-${index}`, day: Math.min(7, index + 1), label: item.trim() }
    : item).filter((item) => item.label);
};
global.CommerceRadarPlaybooks = {
  KEYS: { playbooks: playbooksKey, applications: applicationsKey },
  playbooks: () => JSON.parse(store.get(playbooksKey) || '[]'),
  applications: () => JSON.parse(store.get(applicationsKey) || '[]'),
  cleanChecklist,
  savePlaybook: (id, patch) => {
    const rows = JSON.parse(store.get(playbooksKey) || '[]');
    const next = { ...rows.find((row) => row.id === id), ...patch };
    store.set(playbooksKey, JSON.stringify([next, ...rows.filter((row) => row.id !== id)]));
    return next;
  },
  applyPlaybook: (id) => {
    const application = { id: 'app-v2', playbookId: id, sourcePlanId: 'source-plan', planId: 'target-v2', product: 'Organizador maquiagem', channel: 'Mercado Livre', appliedAt: '2026-08-01T10:00:00Z' };
    const plan = { id: 'target-v2', product: application.product, channel: application.channel, playbook: { id } };
    const apps = JSON.parse(store.get(applicationsKey) || '[]');
    const plans = JSON.parse(store.get(plansKey) || '[]');
    store.set(applicationsKey, JSON.stringify([application, ...apps]));
    store.set(plansKey, JSON.stringify([plan, ...plans]));
    return { application, plan };
  },
};

let cycleRows = [
  { planId: 'source-plan', product: 'Organizador modular', channel: 'Shopee', status: 'decided', score: 82, outcome: { id: 'validated' }, metrics: { orders: 4, revenue: 520, netProfit: 190, netMargin: 36 } },
  { planId: 'target-old', product: 'Organizador antigo', channel: 'Shopee', status: 'decided', score: 76, outcome: { id: 'partial' }, metrics: { orders: 2, revenue: 260, netProfit: 60, netMargin: 23 } },
  { planId: 'target-v2', product: 'Organizador maquiagem', channel: 'Mercado Livre', status: 'decided', score: 90, outcome: { id: 'validated' }, metrics: { orders: 6, revenue: 850, netProfit: 310, netMargin: 36.4 } },
];
global.CommerceRadarCycleRetrospective = { cycleSummaries: () => cycleRows };
global.CommerceRadarActivationPlan = { KEYS: { plans: plansKey } };
global.CommerceRadarPlaybookPerformance = {
  compareApplication(application, currentPlaybook, cycleMap) {
    const source = cycleMap.get(application.sourcePlanId || currentPlaybook.sourcePlanId);
    const target = cycleMap.get(application.planId);
    if (!source || !target) return { application, source, target, comparable: false, result: 'pending' };
    const deltas = {
      score: target.score - source.score,
      orders: target.metrics.orders - source.metrics.orders,
      revenue: target.metrics.revenue - source.metrics.revenue,
      profit: target.metrics.netProfit - source.metrics.netProfit,
      margin: target.metrics.netMargin - source.metrics.netMargin,
    };
    let result = 'partial';
    if (target.outcome.id === 'validated' && target.metrics.orders > 0 && target.metrics.netProfit > 0) result = 'reproduced';
    else if (target.outcome.id === 'discarded' || target.metrics.netProfit < 0) result = 'failed';
    return { application, source, target, comparable: true, result, deltas };
  },
};

require('../activation-playbook-versions.js');
const api = global.CommerceRadarPlaybookVersions;
assert(api, 'API de versões não inicializada');

const created = api.ensureBaselines();
assert.strictEqual(created.length, 0, 'O boot já deveria ter criado a versão-base');
let allVersions = api.versions();
assert.strictEqual(allVersions.length, 1);
assert.strictEqual(allVersions[0].label, 'v1');
assert.strictEqual(allVersions[0].state, 'active');
assert(allVersions[0].snapshotHash.startsWith('fnv1a-'));

assert.throws(() => global.CommerceRadarPlaybooks.savePlaybook('pb-1', { title: 'Edição silenciosa' }), /imutáveis/i);

let candidate = api.createCandidate('pb-1');
assert.strictEqual(candidate.baseLabel, 'v1');
candidate = api.updateCandidate(candidate.id, {
  hypothesis: 'Uma promessa mais específica deve elevar a conversão do novo público.',
  changeSummary: 'Ajustar público, promessa e checklist para a nova categoria de maquiagem.',
  snapshot: {
    title: 'Oferta visual para organização de maquiagem',
    offer: {
      audience: 'Pessoas que organizam maquiagem em gavetas pequenas.',
      promise: 'Organizar maquiagem com módulos adaptáveis e prova visual comparável.',
    },
    checklist: ['Definir público', 'Criar oferta', 'Publicar anúncio', 'Registrar check-in', 'Medir pedidos', 'Calcular margem', 'Decidir continuidade'],
  },
});
assert(api.validateCandidate(candidate).valid);
assert.throws(() => api.publishCandidate(candidate.id, 'Revisão completa da hipótese e do checklist para a nova categoria.', 'ERRADO'), /PUBLICAR/);

const version2 = api.publishCandidate(candidate.id, 'Revisão completa da hipótese, oferta e checklist para a nova categoria.', 'PUBLICAR');
assert.strictEqual(version2.label, 'v2');
allVersions = api.versions();
assert.strictEqual(allVersions.length, 2);
assert.strictEqual(api.activeVersion('pb-1').id, version2.id);
assert.strictEqual(allVersions.find((row) => row.label === 'v1').state, 'superseded');
assert.strictEqual(JSON.parse(store.get(playbooksKey))[0].title, 'Oferta visual para organização de maquiagem');
assert.strictEqual(api.candidates().length, 0);

const applied = global.CommerceRadarPlaybooks.applyPlaybook('pb-1');
assert.strictEqual(applied.application.playbookVersionId, version2.id);
assert.strictEqual(applied.plan.playbook.versionLabel, 'v2');

const versionedApps = api.applicationsWithVersions();
const legacy = versionedApps.find((row) => row.id === 'app-old');
assert.strictEqual(legacy.playbookVersionLabel, 'v1');
assert.strictEqual(legacy.playbookVersionSource, 'inferred');
const captured = versionedApps.find((row) => row.id === 'app-v2');
assert.strictEqual(captured.playbookVersionSource, 'captured');

const v1 = allVersions.find((row) => row.label === 'v1');
const v1Summary = api.summarizeVersion(v1, versionedApps, cycleRows);
const v2Summary = api.summarizeVersion(version2, versionedApps, cycleRows);
assert.strictEqual(v1Summary.completed, 1);
assert.strictEqual(v2Summary.completed, 1);
assert(v2Summary.avgScoreDelta > v1Summary.avgScoreDelta);
assert(v2Summary.avgProfitDelta > v1Summary.avgProfitDelta);

assert.throws(() => api.rollback('pb-1', v1.id, 'Resultados recentes justificam restaurar a versão anterior para comparação.', 'ERRADO'), /ROLLBACK/);
const restored = api.rollback('pb-1', v1.id, 'Resultados recentes justificam restaurar a versão anterior sem apagar o histórico.', 'ROLLBACK');
assert.strictEqual(restored.id, v1.id);
assert.strictEqual(api.activeVersion('pb-1').id, v1.id);
assert.strictEqual(api.versions().length, 2, 'Rollback não pode apagar versões');
assert.strictEqual(JSON.parse(store.get(playbooksKey))[0].title, playbook.title);
assert(api.events().some((row) => row.type === 'version_rollback'));

const snapshot = api.captureVersionSnapshot('2026-08-15');
assert.strictEqual(snapshot.date, '2026-08-15');
assert.strictEqual(snapshot.rows[0].versionCount, 2);
const markdown = api.versionMarkdown();
for (const marker of ['Versionamento dos playbooks', 'Versão ativa', 'Versões publicadas são imutáveis', 'Tehkné Solutions']) {
  assert(markdown.includes(marker), `Relatório sem ${marker}`);
}

const fs = require('fs');
const code = fs.readFileSync('activation-playbook-versions.js', 'utf8');
const css = fs.readFileSync('activation-playbook-versions.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/PLAYBOOK_VERSIONING.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Versões e variantes dos playbooks', 'playbookVersions', 'playbookVersionCandidates', 'playbookVersionEvents', 'playbookVersionSnapshots', 'Tehkné Solutions']) {
  if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
}
for (const asset of ['./activation-playbook-versions.css', './activation-playbook-versions.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
}
if (loader.indexOf('./activation-playbook-versions.js') < loader.indexOf('./activation-playbook-performance.js')) throw new Error('Versionamento deve carregar após desempenho');
if (!css.includes('.pbvSummary') || !css.includes('.pbvCandidate') || css.length < 2200) throw new Error('CSS de versões incompleto');
const parts = version.split('.').map(Number);
if (parts[0] !== 0 || parts[1] < 7 || (parts[1] === 7 && parts[2] < 6)) throw new Error(`Versão anterior a 0.7.6: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 36) throw new Error('Cache PWA anterior ao versionamento');
for (const marker of ['Versão-base retrocompatível', 'Imutabilidade', 'Variante candidata', 'Comparação de desempenho', 'Rollback', 'Backup e sincronização']) {
  if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
}
console.log('Versionamento, variantes, comparação, rollback, backup e PWA válidos.');