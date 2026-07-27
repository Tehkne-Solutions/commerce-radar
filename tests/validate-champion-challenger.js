const fs = require('fs');

const store = new Map();
global.window = undefined;
global.document = undefined;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};
global.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
global.dispatchEvent = () => true;

const products = ['Produto 1', 'Produto 2', 'Produto 3', 'Produto 4', 'Produto 5', 'Produto 6'];
const success = new Set(products.slice(0, 3));
const profiles = [
  { id: 'category:champion', dimension: 'category', label: 'Champion', sample: 10 },
  { id: 'category:challenger', dimension: 'category', label: 'Challenger', sample: 12 },
];
let currentControl = { mode: 'active', enabledProfileIds: ['category:champion'], precedence: ['category', 'channel', 'maturity'] };
let activateCalls = 0;

function rankingFor(config) {
  const challenger = config.enabledProfileIds.includes('category:challenger');
  return products.map((product, index) => {
    const isSuccess = index < 3;
    const score = challenger ? (isSuccess ? 82 - index * 3 : 38 + (index - 3) * 4) : (isSuccess ? 54 + index * 3 : 72 - (index - 3) * 3);
    return {
      key: product.toLowerCase(), product, score, globalScore: score, confidence: 75,
      classification: { id: score >= 64 ? 'test' : 'monitor', label: score >= 64 ? 'Testar agora' : 'Monitorar' },
      appliedProfile: { id: config.enabledProfileIds[0] || '', label: config.enabledProfileIds[0] || '', dimension: 'category' },
    };
  }).sort((a, b) => b.score - a.score);
}

global.CommerceRadarRecommendations = { normalizeKey: value => String(value || '').toLowerCase() };
global.CommerceRadarRecommendationProfileControl = {
  settings: () => ({ ...currentControl, enabledProfileIds: [...currentControl.enabledProfileIds], precedence: [...currentControl.precedence] }),
  profiles: () => profiles,
  applyProfilesToRanking: (input, reference, config) => rankingFor(config),
  activate: config => { activateCalls += 1; currentControl = { ...config, mode: 'active', enabledProfileIds: [...config.enabledProfileIds], precedence: [...config.precedence] }; return currentControl; },
};
global.CommerceRadarRecommendationDrift = {
  outcomeFor: row => ({ status: success.has(row.product) ? 'success' : 'failure', end: '2026-08-01' }),
  classificationMetrics: (cases, field, threshold) => {
    const conclusive = cases.filter(row => ['success', 'failure'].includes(row.outcome.status));
    let tp = 0, fp = 0, tn = 0, fn = 0, brier = 0;
    for (const row of conclusive) {
      const predicted = row[field] >= threshold;
      const actual = row.outcome.status === 'success';
      if (predicted && actual) tp += 1;
      else if (predicted && !actual) fp += 1;
      else if (!predicted && !actual) tn += 1;
      else fn += 1;
      brier += ((row[field] / 100) - (actual ? 1 : 0)) ** 2;
    }
    const total = conclusive.length;
    return {
      total, tp, fp, tn, fn,
      success: conclusive.filter(row => row.outcome.status === 'success').length,
      failure: conclusive.filter(row => row.outcome.status === 'failure').length,
      accuracy: total ? ((tp + tn) / total) * 100 : 0,
      precision: tp + fp ? (tp / (tp + fp)) * 100 : 0,
      recall: tp + fn ? (tp / (tp + fn)) * 100 : 0,
      brier: total ? brier / total : 0,
    };
  },
};

require('../recommendation-champion.js');
const api = global.CommerceRadarChampionChallenger;
if (!api) throw new Error('API champion–challenger não inicializada');

const experiment = api.createExperiment({
  name: 'Challenger de categoria',
  hypothesis: 'O perfil challenger separa melhor sucesso e falha.',
  enabledProfileIds: ['category:challenger'],
  precedence: ['category', 'channel', 'maturity'],
});
if (experiment.champion.enabledProfileIds[0] !== 'category:champion') throw new Error('Champion não foi congelado');
if (experiment.challenger.enabledProfileIds[0] !== 'category:challenger') throw new Error('Challenger não foi congelado');
if (activateCalls !== 0) throw new Error('Criar experimento alterou o ranking ativo');

api.setExperimentStatus(experiment.id, 'running');
api.captureShadow(experiment.id, '2026-07-01', true);
api.captureShadow(experiment.id, '2026-07-01', true);
const savedSnapshots = JSON.parse(store.get(api.KEYS.snapshots));
if (savedSnapshots.length !== 1 || savedSnapshots[0].rows.length !== 6) throw new Error('Snapshot sombra ou deduplicação por data inválidos');
if (activateCalls !== 0) throw new Error('Captura sombra ativou o challenger');

const evaluation = api.evaluateExperiment(experiment.id, {}, { ...api.DEFAULTS, minimumSample: 6 }, '2026-08-10');
if (!evaluation.eligible || evaluation.result !== 'challenger') throw new Error(`Challenger vencedor não detectado: ${evaluation.result}`);
if (Math.round(evaluation.challenger.accuracy) !== 100 || Math.round(evaluation.champion.accuracy) !== 0) throw new Error('Métricas champion/challenger inválidas');
if (evaluation.brierDelta >= 0) throw new Error('Brier do challenger deveria ser melhor');

const promotion = api.promoteChallenger(experiment.id, 'Promoção validada no teste.');
if (!promotion.ok || activateCalls !== 1) throw new Error('Promoção manual não foi executada');
if (currentControl.enabledProfileIds[0] !== 'category:challenger') throw new Error('Configuração challenger não foi ativada');
const promoted = JSON.parse(store.get(api.KEYS.experiments)).find(row => row.id === experiment.id);
if (promoted.status !== 'promoted') throw new Error('Experimento não foi marcado como promovido');
if (JSON.parse(store.get(api.KEYS.decisions))[0].decision !== 'promote') throw new Error('Decisão de promoção não foi auditada');

const second = api.createExperiment({ name: 'Baseline mutável', enabledProfileIds: ['category:champion'], precedence: ['category', 'channel', 'maturity'] });
api.setExperimentStatus(second.id, 'running');
api.captureShadow(second.id, '2026-07-08', true);
currentControl = { mode: 'global', enabledProfileIds: [], precedence: ['category', 'channel', 'maturity'] };
const stale = api.evaluateExperiment(second.id, {}, api.DEFAULTS, '2026-08-10');
if (!stale.stale || stale.result !== 'stale') throw new Error('Alteração externa do baseline não foi detectada');
const blocked = api.promoteChallenger(second.id, 'Não deveria promover.');
if (blocked.ok) throw new Error('Promoção foi permitida com baseline alterado');

const code = fs.readFileSync('recommendation-champion.js', 'utf8');
const css = fs.readFileSync('recommendation-champion.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/CHAMPION_CHALLENGER.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Champion–challenger', 'championExperiments', 'championSnapshots', 'championDecisions', 'championSettings', "version: '0.6.5'", 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./recommendation-champion.css', './recommendation-champion.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-champion.js') < loader.indexOf('./recommendation-drift.js')) throw new Error('Champion–challenger deve carregar após drift');
if (!css.includes('.championSummary') || !css.includes('.championCard') || css.length < 1800) throw new Error('CSS champion–challenger incompleto');
if (version !== '0.6.5') throw new Error(`Versão incorreta: ${version}`);
if (!sw.includes('commerce-radar-v25')) throw new Error('Cache PWA não foi atualizado');
for (const marker of ['Champion', 'Challenger', 'Congelamento do baseline', 'Capturas em modo sombra', 'Promoção manual', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('Champion, challenger, modo sombra, promoção manual, baseline, backup e PWA válidos.');