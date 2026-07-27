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
  normalizeKey: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(),
};

require('../recommendation-drift.js');
const api = global.CommerceRadarRecommendationDrift;
if (!api) throw new Error('API de drift não inicializada');

const products = ['Casa 1', 'Casa 2', 'Casa 3', 'Casa 4', 'Casa 5', 'Casa 6'];
const ranking = products.map((product, index) => ({
  position: index + 1,
  key: product.toLowerCase(),
  product,
  score: 80,
  globalScore: index < 3 ? 80 : 20,
  confidence: 75,
  classification: 'test',
  profileId: 'category:casa',
  latestEvidenceAt: '2026-05-30',
}));
const controlSnapshots = [
  { id: 's1', date: '2026-06-01', mode: 'active', ranking },
  { id: 's2', date: '2026-06-03', mode: 'active', ranking },
];
const tests = [
  ...products.slice(0, 3).map((product, index) => ({ id: `ok-${index}`, product, stage: 'validated', orders: 3, createdAt: '2026-06-10T10:00:00Z' })),
  ...products.slice(3).map((product, index) => ({ id: `fail-${index}`, product, stage: 'discarded', orders: 0, createdAt: '2026-06-11T10:00:00Z' })),
];
const input = { tests, audits: [] };
const config = { ...api.DEFAULTS, horizonDays: 21, lookbackDays: 90, minimumSample: 6, minimumSuccess: 2, minimumFailure: 2 };
const profiles = [{ id: 'category:casa', dimension: 'category', label: 'Casa' }];

const deduped = api.dedupeControlledRows(controlSnapshots, config, '2026-07-01');
if (deduped.length !== 6) throw new Error(`Deduplicação semanal inválida: ${deduped.length}`);
if (!deduped.every(row => row.date === '2026-06-03')) throw new Error('A captura mais recente da semana não foi preservada');

const success = api.outcomeFor({ product: 'Casa 1', date: '2026-06-03' }, input, config, '2026-07-01');
const failure = api.outcomeFor({ product: 'Casa 4', date: '2026-06-03' }, input, config, '2026-07-01');
if (success.status !== 'success' || failure.status !== 'failure') throw new Error('Resultados posteriores não foram classificados');

const reports = api.buildProfileReports(controlSnapshots, input, config, '2026-07-01', profiles);
if (reports.length !== 1) throw new Error('Perfil monitorado não foi agrupado');
const report = reports[0];
if (report.controlled.total !== 6 || report.controlled.success !== 3 || report.controlled.failure !== 3) throw new Error('Amostra conclusiva inválida');
if (Math.round(report.controlled.accuracy) !== 50 || Math.round(report.global.accuracy) !== 100) throw new Error(`Acurácias inválidas: ${report.controlled.accuracy}/${report.global.accuracy}`);
if (report.accuracyDelta !== -50) throw new Error(`Diferença de acurácia inválida: ${report.accuracyDelta}`);
if (report.brierDelta <= 0) throw new Error('Brier do perfil deveria ser pior que o global');
if (report.status !== 'critical') throw new Error(`Drift crítico não detectado: ${report.status}`);
if (!report.recommendation.toLowerCase().includes('rollback')) throw new Error('Recomendação crítica não menciona rollback');

const insufficient = api.statusFor({ total: 3, success: 2, failure: 1, accuracy: 100, brier: 0 }, { total: 3, success: 2, failure: 1, accuracy: 50, brier: 0.3 }, config);
if (insufficient !== 'insufficient') throw new Error('Amostra pequena deveria ser inconclusiva');

store.set(api.KEYS.controlSnapshots, JSON.stringify(controlSnapshots));
store.set(api.KEYS.tests, JSON.stringify(tests));
store.set(api.KEYS.audits, JSON.stringify([]));
store.set(api.KEYS.segmentProfiles, JSON.stringify(profiles));
store.set(api.KEYS.settings, JSON.stringify(config));
const snapshot = api.captureDriftSnapshot('2026-07-01', true);
if (!snapshot || snapshot.overall.critical !== 1 || snapshot.profiles[0].status !== 'critical') throw new Error('Snapshot de drift inválido');
if (!JSON.parse(store.get(api.KEYS.snapshots))[0].signature) throw new Error('Snapshot não foi persistido com assinatura');

api.saveReview('category:casa', 'rollback', 'Revisar antes de qualquer mudança.');
const review = JSON.parse(store.get(api.KEYS.reviews))[0];
if (review.decision !== 'rollback' || !review.note.includes('Revisar')) throw new Error('Revisão humana não foi persistida');
const controlBefore = store.get(api.KEYS.controlSettings);
if (store.get(api.KEYS.controlSettings) !== controlBefore) throw new Error('O monitor alterou a configuração automaticamente');

const code = fs.readFileSync('recommendation-drift.js', 'utf8');
const css = fs.readFileSync('recommendation-drift.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/PROFILE_DRIFT.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Monitoramento de drift', 'profileDriftSettings', 'profileDriftSnapshots', 'profileDriftReviews', "version: '0.6.4'", 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./recommendation-drift.css', './recommendation-drift.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-drift.js') < loader.indexOf('./recommendation-profile-control.js')) throw new Error('Drift deve carregar após aplicação de perfis');
if (!css.includes('.driftSummary') || !css.includes('.driftProfile') || css.length < 1800) throw new Error('CSS de drift incompleto');
const parts = version.split('.').map(Number);
if (parts[0] !== 0 || parts[1] < 6 || (parts[1] === 6 && parts[2] < 4)) throw new Error(`Versão anterior a 0.6.4: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 24) throw new Error('Cache PWA anterior ao monitoramento de drift');
for (const marker of ['Casos comparáveis', 'Baseline global', 'Brier score', 'Drift crítico', 'Revisões humanas', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('Drift, baseline global, Brier, revisão humana, backup e PWA válidos.');