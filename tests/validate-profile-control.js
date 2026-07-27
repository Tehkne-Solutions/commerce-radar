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

const globalWeights = { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 };
const products = [
  { key: 'produto casa', product: 'Produto Casa', channels: ['Shopee'], confidence: 75, components: { market: 90, validation: 55, economics: 35, readiness: 60, temporal: 80, evidence: 70 } },
  { key: 'produto moda', product: 'Produto Moda', channels: ['Mercado Livre'], confidence: 65, components: { market: 45, validation: 70, economics: 85, readiness: 55, temporal: 60, evidence: 65 } },
];
const classify = score => ({ id: score >= 80 ? 'prioritize' : score >= 64 ? 'test' : 'monitor', label: score >= 80 ? 'Priorizar' : score >= 64 ? 'Testar agora' : 'Monitorar' });
global.CommerceRadarRecommendations = {
  DEFAULTS: { weights: globalWeights },
  normalizeKey: value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(),
  saveDecision: () => true,
  buildRanking: (input, reference, config = {}) => products.map(item => {
    const weights = config.weights || globalWeights;
    const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0) || 100;
    const score = Math.round(Object.entries(item.components).reduce((sum, [key, value]) => sum + value * Number(weights[key] || 0) / total, 0));
    return { ...item, score, classification: classify(score), positives: [], penalties: [], gaps: [], nextAction: 'Testar', latestEvidenceAt: '2026-07-20', economics: { available: false }, segment: {} };
  }),
};
global.CommerceRadarSegmentCalibration = {
  recommendationSegment: item => item.key === 'produto casa'
    ? { category: 'Casa', channel: 'Shopee', maturity: 'validated' }
    : { category: 'Moda', channel: 'Mercado Livre', maturity: 'developing' },
};

require('../recommendation-profile-control.js');
const api = global.CommerceRadarRecommendationProfileControl;
if (!api) throw new Error('API de controle não inicializada');

const profiles = [
  { id: 'category:casa', dimension: 'category', value: 'Casa', label: 'Casa', weights: { market: 40, validation: 20, economics: 10, readiness: 10, temporal: 12, evidence: 8 }, sample: 8 },
  { id: 'channel:shopee', dimension: 'channel', value: 'Shopee', label: 'Shopee', weights: { market: 10, validation: 35, economics: 25, readiness: 10, temporal: 12, evidence: 8 }, sample: 9 },
  { id: 'maturity:validated', dimension: 'maturity', value: 'validated', label: 'Validada', weights: { market: 20, validation: 25, economics: 25, readiness: 10, temporal: 12, evidence: 8 }, sample: 10 },
];
store.set(api.KEYS.segmentProfiles, JSON.stringify(profiles));
store.set(api.KEYS.recommendationSettings, JSON.stringify({ weights: globalWeights }));

const categoryFirst = { mode: 'active', enabledProfileIds: profiles.map(row => row.id), precedence: ['category', 'channel', 'maturity'] };
const selected = api.selectProfile(products[0], profiles, categoryFirst, {});
if (selected.profile.id !== 'category:casa' || selected.precedence !== 1) throw new Error('Precedência de categoria inválida');

const activeRanking = api.applyProfilesToRanking({}, '2026-07-27', categoryFirst, profiles);
const casa = activeRanking.find(row => row.key === 'produto casa');
const moda = activeRanking.find(row => row.key === 'produto moda');
if (!casa.appliedProfile || casa.appliedProfile.id !== 'category:casa') throw new Error('Perfil de categoria não foi aplicado');
if (casa.score === casa.globalScore) throw new Error('Perfil não alterou o score do produto compatível');
if (moda.appliedProfile || moda.score !== moda.globalScore) throw new Error('Produto externo ao segmento deveria permanecer global');

const channelFirst = { ...categoryFirst, precedence: ['channel', 'category', 'maturity'] };
const selectedChannel = api.selectProfile(products[0], profiles, channelFirst, {});
if (selectedChannel.profile.id !== 'channel:shopee') throw new Error('Precedência de canal inválida');

const simulatedMain = api.applyProfilesToRanking({}, '2026-07-27', { ...categoryFirst, mode: 'simulation' }, profiles);
if (simulatedMain.some(row => row.appliedProfile)) throw new Error('Simulação alterou o ranking principal');
const comparison = api.compareRankings({}, '2026-07-27', { ...categoryFirst, mode: 'simulation' }, profiles);
if (!comparison.find(row => row.key === 'produto casa').appliedProfile) throw new Error('Comparação não aplicou o perfil simulado');

api.activate(categoryFirst, 'Ativação de teste');
let saved = JSON.parse(store.get(api.KEYS.settings));
if (saved.mode !== 'active' || saved.enabledProfileIds.length !== 3) throw new Error('Ativação não foi persistida');
if (JSON.parse(store.get(api.KEYS.history))[0].action !== 'profiles_activated') throw new Error('Ativação não entrou no histórico');
api.useGlobal();
saved = JSON.parse(store.get(api.KEYS.settings));
if (saved.mode !== 'global') throw new Error('Modo global não foi restaurado');
const rolled = api.rollback();
if (!rolled || rolled.mode !== 'active') throw new Error('Rollback não restaurou a configuração anterior');

const snapshot = api.captureControlledSnapshot('2026-07-27', true);
if (!snapshot || snapshot.ranking.length !== 2 || !snapshot.signature) throw new Error('Snapshot controlado inválido');
if (!snapshot.ranking.find(row => row.key === 'produto casa').profileId) throw new Error('Snapshot não registrou o perfil aplicado');

const code = fs.readFileSync('recommendation-profile-control.js', 'utf8');
const css = fs.readFileSync('recommendation-profile-control.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/PROFILE_CONTROL.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Aplicação de perfis no ranking', 'profileControlSettings', 'profileControlHistory', 'profileControlSnapshots', "version: '0.6.3'", 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./recommendation-profile-control.css', './recommendation-profile-control.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-profile-control.js') < loader.indexOf('./recommendation-segments.js')) throw new Error('Controle deve carregar após perfis segmentados');
if (!css.includes('.profileControlSummary') || !css.includes('.profileComparisonTable') || css.length < 2500) throw new Error('CSS de controle incompleto');
const parts = version.split('.').map(Number);
if (parts[0] !== 0 || parts[1] < 6 || (parts[1] === 6 && parts[2] < 3)) throw new Error(`Versão anterior a 0.6.3: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 23) throw new Error('Cache PWA anterior ao controle de perfis');
for (const marker of ['Modos', 'Precedência', 'Regra de perfil único', 'Comparação antes da ativação', 'Rollback', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('Simulação, precedência, ativação, ranking, rollback, backup e PWA válidos.');
