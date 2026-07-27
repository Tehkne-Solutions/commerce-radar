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

global.CommerceRadarRecommendations = {
  DEFAULTS: { weights: { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 } },
  normalizeKey: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(),
  buildRanking: () => [{
    key: 'produto captura', product: 'Produto Captura', score: 72, confidence: 68,
    classification: { id: 'test' },
    components: { market: 80, validation: 70, economics: 65, readiness: 60, temporal: 90, evidence: 75 },
    weights: { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 },
    latestEvidenceAt: '2026-06-30',
  }],
};
global.CommerceRadarFinancial = {
  computeAudit: audit => {
    const netSales = Number(audit.grossRevenue || 0);
    const netProfit = Number(audit.netProfit || 0);
    return { netSales, netProfit, netMargin: netSales > 0 ? netProfit / netSales * 100 : 0 };
  },
};

require('../recommendation-calibration.js');
const api = global.CommerceRadarRecommendationCalibration;
if (!api) throw new Error('API de calibração não inicializada');

if (api.weekStart('2026-07-05') !== '2026-06-29') throw new Error('Semana não inicia na segunda-feira');

const weights = { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 };
const components = {
  strong: { market: 90, validation: 88, economics: 84, readiness: 75, temporal: 90, evidence: 85 },
  weak: { market: 35, validation: 25, economics: 20, readiness: 45, temporal: 55, evidence: 40 },
};
const prediction = (product, score, classification, componentSet, date = '2026-06-01') => ({
  key: global.CommerceRadarRecommendations.normalizeKey(product), product, score, confidence: 70, classification, components: componentSet, weights,
  latestEvidenceAt: date,
});
const snapshots = [
  { id: 'p1', date: '2026-06-01', weekStart: '2026-06-01', ranking: [
    prediction('Produto A', 86, 'prioritize', components.strong),
    prediction('Produto B', 75, 'test', components.strong),
    prediction('Produto C', 72, 'test', components.weak),
    prediction('Produto D', 68, 'test', components.weak),
    prediction('Produto E', 30, 'pause', components.weak),
    prediction('Produto F', 40, 'monitor', components.strong),
    prediction('Produto G', 70, 'test', components.strong),
  ] },
  { id: 'p2', date: '2026-06-20', weekStart: '2026-06-15', ranking: [
    prediction('Produto H', 78, 'test', components.strong, '2026-06-20'),
  ] },
];
const sourceInput = {
  tests: [
    { product: 'Produto A', stage: 'validated', orders: 4, updatedAt: '2026-06-10' },
    { product: 'Produto B', stage: 'conversion', orders: 3, updatedAt: '2026-06-11' },
    { product: 'Produto C', stage: 'discarded', orders: 0, updatedAt: '2026-06-12' },
    { product: 'Produto E', stage: 'discarded', orders: 0, updatedAt: '2026-06-13' },
    { product: 'Produto F', stage: 'validated', orders: 2, updatedAt: '2026-06-14' },
    { product: 'Produto A', stage: 'discarded', orders: 0, updatedAt: '2026-05-20' },
  ],
  audits: [
    { product: 'Produto B', periodEnd: '2026-06-15', grossRevenue: 1000, netProfit: 180 },
    { product: 'Produto D', periodEnd: '2026-06-16', grossRevenue: 800, netProfit: -120 },
  ],
  signals: [], analyses: [], opportunities: [], plans: [],
};
const config = {
  horizonDays: 21,
  minimumSample: 6,
  minimumOrders: 3,
  minimumNetMargin: 8,
  positiveScoreThreshold: 64,
  maximumWeightChangePct: 15,
};
const cases = api.buildCases(snapshots, sourceInput, config, '2026-07-01');
const byKey = new Map(cases.map(row => [row.key, row]));
if (byKey.get('produto a').outcome.status !== 'success') throw new Error('Teste validado deveria gerar sucesso');
if (byKey.get('produto b').outcome.status !== 'success') throw new Error('Pedidos e lucro deveriam gerar sucesso');
if (byKey.get('produto c').outcome.status !== 'failure') throw new Error('Teste descartado deveria gerar falha');
if (byKey.get('produto d').outcome.status !== 'failure') throw new Error('Prejuízo deveria gerar falha');
if (byKey.get('produto g').outcome.status !== 'inconclusive') throw new Error('Caso sem resultado deveria ser inconclusivo');
if (byKey.get('produto h').outcome.status !== 'pending') throw new Error('Horizonte ainda aberto deveria ficar pendente');
if (byKey.get('produto a').outcome.discarded) throw new Error('Evento anterior à previsão entrou no resultado');

const result = api.metrics(cases);
if (result.total !== 6 || result.tp !== 2 || result.fp !== 2 || result.tn !== 1 || result.fn !== 1) {
  throw new Error(`Matriz inválida: ${JSON.stringify(result)}`);
}
if (Math.abs(result.accuracy - 0.5) > 0.0001 || Math.abs(result.precision - 0.5) > 0.0001) throw new Error('Métricas de calibração inválidas');

const suggestion = api.suggestWeights(cases, weights, config);
if (!suggestion.eligible) throw new Error(`Sugestão deveria estar disponível: ${suggestion.reason}`);
if (Object.values(suggestion.suggested).reduce((sum, value) => sum + value, 0) !== 100) throw new Error('Pesos sugeridos não totalizam 100');
if (suggestion.suggested.market <= suggestion.suggested.economics) throw new Error('Componentes fortes não receberam diferenciação coerente');

store.set(api.KEYS.settings, JSON.stringify(config));
store.set(api.KEYS.predictions, JSON.stringify(snapshots));
store.set('tehkne-commerce-radar-v6-recommendation-settings', JSON.stringify({ weights }));
const report = api.calibrationReport(snapshots, sourceInput, config, '2026-07-01');
const run = api.applySuggestedWeights(report);
if (!run || run.signature !== 'Tehkné Solutions') throw new Error('Calibração não foi registrada');
const applied = JSON.parse(store.get('tehkne-commerce-radar-v6-recommendation-settings'));
if (JSON.stringify(applied.weights) !== JSON.stringify(report.suggestion.suggested)) throw new Error('Pesos sugeridos não foram aplicados');
api.revertLastCalibration();
const reverted = JSON.parse(store.get('tehkne-commerce-radar-v6-recommendation-settings'));
if (JSON.stringify(reverted.weights) !== JSON.stringify(weights)) throw new Error('Reversão dos pesos falhou');

const captured = api.capturePrediction('2026-07-01', true, sourceInput);
if (!captured || captured.ranking[0].components.market !== 80) throw new Error('Captura completa da previsão falhou');

const code = fs.readFileSync('recommendation-calibration.js', 'utf8');
const css = fs.readFileSync('recommendation-calibration.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/RECOMMENDATION_CALIBRATION.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Calibração com resultados reais', 'calibrationSettings', 'calibrationPredictions', 'calibrationRuns', "version: '0.6.1'", 'Tehkné Solutions']) {
  if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
}
for (const asset of ['./recommendation-calibration.css', './recommendation-calibration.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-calibration.js') < loader.indexOf('./recommendations.js')) throw new Error('Calibração deve carregar após recomendações');
if (!css.includes('.calibrationSummary') || !css.includes('.calibrationMatrixGrid') || css.length < 2500) throw new Error('CSS de calibração incompleto');
const versionParts = version.split('.').map(Number);
if (versionParts[0] !== 0 || versionParts[1] < 6 || (versionParts[1] === 6 && versionParts[2] < 1)) throw new Error(`Versão anterior a 0.6.1: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 21) throw new Error('Cache PWA anterior à calibração global');
for (const marker of ['Horizonte de resultado', 'Matriz de acertos', 'Sugestão de pesos', 'Aplicação e reversão', 'Backup e sincronização']) {
  if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
}
console.log('Calibração, matriz, pesos, reversão, integração e PWA válidos.');