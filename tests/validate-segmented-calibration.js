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

const baseWeights = { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 };
const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const metric = cases => {
  const conclusive = cases.filter(row => ['success', 'failure'].includes(row.outcome.status));
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of conclusive) {
    if (row.predictedPositive && row.outcome.status === 'success') tp++;
    else if (row.predictedPositive && row.outcome.status === 'failure') fp++;
    else if (!row.predictedPositive && row.outcome.status === 'failure') tn++;
    else if (!row.predictedPositive && row.outcome.status === 'success') fn++;
  }
  return { total: conclusive.length, pending: 0, inconclusive: 0, success: conclusive.filter(row => row.outcome.status === 'success').length, failure: conclusive.filter(row => row.outcome.status === 'failure').length, tp, fp, tn, fn, precision: tp + fp ? tp / (tp + fp) : 0 };
};

global.CommerceRadarRecommendationCalibration = {
  DEFAULTS: { minimumSample: 6 },
  buildCases: predictions => predictions.flatMap(snapshot => (snapshot.ranking || []).map(row => ({ ...row, date: snapshot.date, predictedPositive: row.score >= 64, outcome: row.outcome || { status: 'inconclusive' } }))),
  metrics: metric,
  suggestWeights: (cases, current, config) => {
    const report = metric(cases);
    const success = report.success;
    const failure = report.failure;
    const eligible = report.total >= Number(config.minimumSample || 6) && success >= 2 && failure >= 2;
    return {
      eligible,
      current: { ...current },
      suggested: eligible ? { market: 28, validation: 24, economics: 20, readiness: 10, temporal: 10, evidence: 8 } : { ...current },
      stats: Object.keys(baseWeights).map((key, index) => ({ key, label: key, lift: eligible ? 12 - index : 0 })),
      reason: eligible ? 'Amostra segmentada suficiente.' : 'Amostra insuficiente.',
    };
  },
  capturePrediction: () => ({ id: 'captured' }),
};

global.CommerceRadarRecommendations = {
  DEFAULTS: { weights: baseWeights },
  normalizeKey: normalize,
  buildRanking: (input, reference, config) => {
    const products = [
      { key: 'produto casa a', product: 'Produto Casa A', channels: ['Shopee'], components: { market: 90, validation: 80, economics: 40, readiness: 60, temporal: 70, evidence: 75 }, confidence: 72 },
      { key: 'produto moda a', product: 'Produto Moda A', channels: ['Mercado Livre'], components: { market: 45, validation: 70, economics: 85, readiness: 55, temporal: 65, evidence: 70 }, confidence: 68 },
    ];
    return products.map(item => {
      const weights = config.weights || baseWeights;
      const total = Object.values(weights).reduce((sum, value) => sum + Number(value), 0);
      const score = Math.round(Object.entries(item.components).reduce((sum, [key, value]) => sum + value * Number(weights[key] || 0) / total, 0));
      return { ...item, score, classification: { id: score >= 64 ? 'test' : 'monitor', label: score >= 64 ? 'Testar agora' : 'Monitorar' } };
    });
  },
};

require('../recommendation-segments.js');
const api = global.CommerceRadarSegmentCalibration;
if (!api) throw new Error('API segmentada não inicializada');

if (api.deriveMaturity({ confidence: 30, components: { evidence: 20, validation: 10, economics: 10 } }) !== 'early') throw new Error('Maturidade inicial inválida');
if (api.deriveMaturity({ confidence: 50, components: { evidence: 50, validation: 35, economics: 20 } }) !== 'developing') throw new Error('Maturidade em desenvolvimento inválida');
if (api.deriveMaturity({ confidence: 75, components: { evidence: 75, validation: 70, economics: 65 } }) !== 'validated') throw new Error('Maturidade validada inválida');

const prediction = (key, product, outcome, score = 75, channel = 'Shopee') => ({
  key, product, score, confidence: 70, classification: 'test', channels: [channel],
  components: { market: 80, validation: 70, economics: 60, readiness: 55, temporal: 75, evidence: 70 },
  weights: baseWeights, outcome,
});
const snapshots = [{
  id: 's1', date: '2026-06-01', weekStart: '2026-06-01', ranking: [
    prediction('casa 1', 'Casa 1', { status: 'success' }),
    prediction('casa 2', 'Casa 2', { status: 'success' }),
    prediction('casa 3', 'Casa 3', { status: 'failure' }),
    prediction('casa 4', 'Casa 4', { status: 'failure' }),
    prediction('moda 1', 'Moda 1', { status: 'success' }, 70, 'Mercado Livre'),
    prediction('moda 2', 'Moda 2', { status: 'failure' }, 55, 'Mercado Livre'),
  ]
}];
const input = {
  signals: [
    ...['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Produto Casa A'].map((topic, index) => ({ id: `c${index}`, topic, category: 'Casa' })),
    ...['Moda 1', 'Moda 2', 'Produto Moda A'].map((topic, index) => ({ id: `m${index}`, topic, category: 'Moda' })),
  ],
  tests: [
    { product: 'Casa 1', channel: 'Shopee' }, { product: 'Casa 2', channel: 'Shopee' }, { product: 'Casa 3', channel: 'Shopee' }, { product: 'Casa 4', channel: 'Shopee' },
    { product: 'Moda 1', channel: 'Mercado Livre' }, { product: 'Moda 2', channel: 'Mercado Livre' },
  ], audits: [], analyses: [], opportunities: [], plans: [],
};

const enriched = api.enrichPredictions(snapshots, input);
const casaRow = enriched[0].ranking.find(row => row.key === 'casa 1');
if (casaRow.segments.category !== 'Casa' || casaRow.segments.channel !== 'Shopee' || casaRow.segments.source !== 'inferred') throw new Error('Enriquecimento de segmento inválido');

const groups = api.buildSegmentGroups(snapshots, input, 'category', { minimumSample: 4, minimumSuccess: 2, minimumFailure: 2 }, '2026-07-01');
const casa = groups.find(group => group.label === 'Casa');
const moda = groups.find(group => group.label === 'Moda');
if (!casa || casa.metrics.total !== 4 || !casa.suggestion.eligible) throw new Error(`Categoria Casa deveria ser calibrável: ${JSON.stringify(casa)}`);
if (!moda || moda.metrics.total !== 2 || moda.suggestion.eligible) throw new Error('Categoria Moda não deveria ser calibrável');

const saved = api.saveProfile(casa);
if (!saved || saved.dimension !== 'category' || saved.value !== 'Casa' || Object.values(saved.weights).reduce((sum, value) => sum + value, 0) !== 100) throw new Error('Perfil segmentado não foi salvo');
const storedProfiles = JSON.parse(store.get(api.KEYS.profiles));
const storedHistory = JSON.parse(store.get(api.KEYS.history));
if (storedProfiles.length !== 1 || storedHistory[0].action !== 'profile_created') throw new Error('Perfil ou histórico não persistido');

const preview = api.previewProfile(saved, input, '2026-07-01');
if (preview.length !== 1 || preview[0].product !== 'Produto Casa A') throw new Error(`Prévia não isolou a categoria: ${JSON.stringify(preview)}`);
if (preview[0].score === preview[0].globalScore) throw new Error('Perfil segmentado não alterou a prévia');

api.removeProfile(saved.id);
if (JSON.parse(store.get(api.KEYS.profiles)).length !== 0) throw new Error('Perfil segmentado não foi removido');
if (JSON.parse(store.get(api.KEYS.history))[0].action !== 'profile_removed') throw new Error('Remoção não entrou no histórico');

store.set(api.KEYS.predictions, JSON.stringify(snapshots));
api.persistEnrichedPredictions(input);
const persisted = JSON.parse(store.get(api.KEYS.predictions));
if (!persisted[0].ranking[0].segments?.category) throw new Error('Previsões enriquecidas não foram persistidas');

const code = fs.readFileSync('recommendation-segments.js', 'utf8');
const css = fs.readFileSync('recommendation-segments.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/SEGMENTED_CALIBRATION.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Calibração segmentada', 'segmentCalibrationSettings', 'segmentCalibrationProfiles', 'segmentCalibrationHistory', "version: '0.6.2'", 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./recommendation-segments.css', './recommendation-segments.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-segments.js') < loader.indexOf('./recommendation-calibration.js')) throw new Error('Segmentação deve carregar após calibração global');
if (!css.includes('.segmentSummary') || !css.includes('.segmentGroup') || css.length < 3500) throw new Error('CSS segmentado incompleto');
const parts = version.split('.').map(Number);
if (parts[0] !== 0 || parts[1] < 6 || (parts[1] === 6 && parts[2] < 2)) throw new Error(`Versão anterior a 0.6.2: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 22) throw new Error('Cache PWA anterior à calibração segmentada');
for (const marker of ['Dimensões disponíveis', 'Coortes comparáveis', 'Amostra mínima', 'Perfil segmentado', 'Prévia do impacto', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('Segmentação, isolamento, perfis, prévia, backup e PWA válidos.');
