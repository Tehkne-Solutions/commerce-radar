const fs = require('fs');
const store = new Map();
global.window = undefined;
global.document = undefined;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};
require('../trend-radar.js');
require('../financial-audit.js');
require('../recommendations.js');
const api = global.CommerceRadarRecommendations;
if (!api) throw new Error('API de recomendações não inicializada');

const reference = '2026-07-26';
const input = {
  signals: [
    { id:'s1', topic:'Kit fotografia de produtos', category:'creator', sourceType:'search', sourceName:'Busca', observedAt:'2026-07-20', validDays:60, growth:5, demand:5, competition:3, margin:5, risk:2, confidence:5, evidence:'Busca crescente.' },
    { id:'s2', topic:'Kit fotografia de produtos', category:'creator', sourceType:'marketplace', sourceName:'Marketplace', observedAt:'2026-07-25', validDays:45, growth:4, demand:5, competition:3, margin:4, risk:2, confidence:5, evidence:'Vendas e avaliações recentes.' },
    { id:'stale', topic:'Produto antigo', category:'outros', sourceType:'search', sourceName:'Busca antiga', observedAt:'2025-01-01', validDays:30, growth:5, demand:5, competition:2, margin:4, risk:2, confidence:4, evidence:'Sinal antigo.' },
    { id:'loss-signal', topic:'Produto com prejuízo', category:'casa', sourceType:'marketplace', sourceName:'Marketplace', observedAt:'2026-07-24', validDays:30, growth:4, demand:4, competition:3, margin:2, risk:4, confidence:4, evidence:'Demanda presente, custos ruins.' },
  ],
  tests: [
    { id:'t1', product:'Kit fotografia de produtos', channel:'Shopee', stage:'validated', investment:300, revenue:1600, clicks:100, orders:8, updated:'2026-07-25' },
    { id:'t2', product:'Produto com prejuízo', channel:'Mercado Livre', stage:'discarded', investment:200, revenue:50, clicks:30, orders:1, updated:'2026-07-25' },
  ],
  audits: [
    { id:'a1', product:'Kit fotografia de produtos', channel:'Shopee', quality:'real', periodEnd:'2026-07-25', orders:8, grossRevenue:1600, productCost:600, marketplaceFees:200, paymentFees:40, shippingCost:80, taxes:80, advertising:200, packaging:20, otherCosts:0 },
    { id:'a2', product:'Produto com prejuízo', channel:'Mercado Livre', quality:'real', periodEnd:'2026-07-25', orders:1, grossRevenue:50, productCost:40, marketplaceFees:10, shippingCost:20, taxes:5, advertising:200 },
  ],
  analyses: [
    { id:'an1', product:'Kit fotografia de produtos', score:86, margin:52, risk:2, channels:[{name:'Shopee',score:88}], created:'2026-07-24' },
    { id:'an2', product:'Produto antigo', score:60, margin:40, risk:3, channels:[{name:'Shopee',score:60}], created:'2026-06-01' },
  ],
  opportunities: [
    { id:'o1', name:'Kit fotografia de produtos', score:88, capital:300, channel:'Shopee', risk:2 },
    { id:'o2', name:'Produto antigo', score:60, capital:500, channel:'Shopee', risk:3 },
  ],
  plans: [{ id:'p1', openingCash:1200, updatedAt:'2026-07-25' }],
};

const ranking = api.buildRanking(input, reference, api.DEFAULTS);
if (ranking.length !== 3) throw new Error(`Quantidade de candidatos inválida: ${ranking.length}`);
const strong = ranking.find(item => item.product === 'Kit fotografia de produtos');
const stale = ranking.find(item => item.product === 'Produto antigo');
const loss = ranking.find(item => item.product === 'Produto com prejuízo');
if (!strong || strong.score < 80 || strong.confidence < 65 || strong.classification.id !== 'prioritize') throw new Error(`Produto forte não foi priorizado: ${JSON.stringify(strong)}`);
if (!stale || stale.temporal.score >= 40 || !stale.penalties.some(item => item.includes('vencidas'))) throw new Error(`Penalização temporal inválida: ${JSON.stringify(stale)}`);
if (!loss || ['prioritize','test'].includes(loss.classification.id) || loss.economics.losses < 1 || !loss.penalties.some(item => item.includes('prejuízo'))) throw new Error(`Prejuízo/descarte não reduziu a recomendação: ${JSON.stringify(loss)}`);
if (ranking[0].key !== strong.key) throw new Error('Ordenação do ranking inválida');
if (!strong.positives.some(item => item.includes('8 pedido'))) throw new Error('Explicação de pedidos ausente');
if (!stale.gaps.some(item => item.includes('Atualizar'))) throw new Error('Próxima lacuna temporal ausente');

store.set(api.KEYS.signals, JSON.stringify(input.signals));
store.set(api.KEYS.tests, JSON.stringify(input.tests));
store.set(api.KEYS.audits, JSON.stringify(input.audits));
store.set(api.KEYS.analyses, JSON.stringify(input.analyses));
store.set(api.KEYS.custom, JSON.stringify(input.opportunities));
store.set(api.KEYS.plans, JSON.stringify(input.plans));
const snapshot = api.captureSnapshot(reference, true);
if (snapshot.ranking.length !== 3 || snapshot.ranking[0].product !== strong.product) throw new Error('Snapshot do ranking inválido');
const savedSnapshots = JSON.parse(store.get(api.KEYS.snapshots));
if (savedSnapshots.length !== 1 || savedSnapshots[0].date !== reference) throw new Error('Snapshot não persistido');
api.saveDecision(strong.key, 'priorizar', 'Executar rodada controlada.');
const savedDecisions = JSON.parse(store.get(api.KEYS.decisions));
if (savedDecisions[0].decision !== 'priorizar' || !savedDecisions[0].note.includes('controlada')) throw new Error('Decisão manual não persistida');

const code = fs.readFileSync('recommendations.js', 'utf8');
const css = fs.readFileSync('recommendations.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/RECOMMENDATIONS.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Recomendações e ranking temporal', 'recommendationSettings', 'recommendationSnapshots', 'recommendationDecisions', "version: '0.6.0'", 'Tehkné Solutions']) if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
for (const asset of ['./recommendations.css', './recommendations.js']) {
  if (!loader.includes(asset)) throw new Error(`Carregador sem asset: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache sem asset: ${asset}`);
}
if (!app.includes('./module-loader.js')) throw new Error('app.js não ativa o carregador modular');
if (!loader.includes('./cloud-config.js') || !loader.includes('./trend-radar.js') || !loader.includes('./financial-audit.js') || !loader.includes('./cloud-bootstrap.js')) throw new Error('Sequência modular incompleta');
if (loader.indexOf('./recommendations.js') < loader.indexOf('./trend-radar.js') || loader.indexOf('./recommendations.js') < loader.indexOf('./financial-audit.js')) throw new Error('Recomendações devem carregar após tendências e finanças');
if (!css.includes('.recommendationSummary') || !css.includes('.recommendationCard') || css.length < 3000) throw new Error('Estilos de recomendações incompletos');
const parts = version.split('.').map(Number);
if (parts[0] !== 0 || parts[1] < 6) throw new Error(`Versão anterior a 0.6.0: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 20 || !sw.includes('./module-loader.js')) throw new Error('Cache PWA anterior às recomendações');
for (const marker of ['Fontes utilizadas', 'Pesos padrão', 'Atualidade', 'Penalizações', 'Ranking temporal', 'Carregamento modular', 'Backup e sincronização']) if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
console.log('Ranking, confiança, temporalidade, explicações, carregador e PWA válidos.');
