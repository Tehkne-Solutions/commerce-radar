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

const plansKey = 'tehkne-commerce-radar-v71-activation-plans';
const sourcePlan = {
  id: 'source-plan', product: 'Organizador modular', productKey: 'organizador-modular', channel: 'Shopee', status: 'decided',
  startDate: '2026-07-01', endDate: '2026-07-07', criteria: { minViews: 100, minClicks: 10, minOrders: 2, minMarginPct: 10, maxSpend: 140 },
  tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, title: `Dia ${index + 1}`, checklist: [{ id: 'a', label: `Executar item validado ${index + 1}`, done: true }], status: 'completed' })),
  metrics: { views: 300, clicks: 45, orders: 4, revenue: 520, spend: 80, productCost: 180, fees: 40, shipping: 30 },
};
const weakPlan = { ...sourcePlan, id: 'weak-plan', product: 'Produto fraco' };
store.set(plansKey, JSON.stringify([sourcePlan, weakPlan]));

const validCycle = {
  planId: 'source-plan', product: 'Organizador modular', channel: 'Shopee', score: 82,
  outcome: { id: 'validated', label: 'Validado' }, metrics: { orders: 4, revenue: 520, netProfit: 190, netMargin: 36.5 }, comparableChanges: 1,
  retrospective: { worked: 'Imagem de uso real e promessa objetiva geraram pedidos.', failed: 'Preço inicial alto reduziu a conversão no primeiro dia.', nextHypothesis: 'Testar nova categoria mantendo a prova visual.', tags: ['imagem', 'marketplace'] },
};
const weakCycle = {
  planId: 'weak-plan', product: 'Produto fraco', channel: 'Shopee', score: 48,
  outcome: { id: 'discarded', label: 'Descartado' }, metrics: { orders: 0, revenue: 0, netProfit: -60, netMargin: 0 }, comparableChanges: 0,
  retrospective: { worked: 'Houve algumas visualizações no canal.', failed: 'Não houve pedidos nem margem positiva.', nextHypothesis: 'Reformular completamente a hipótese de produto.' },
};

global.CommerceRadarCycleRetrospective = {
  KEYS: { retrospectives: 'retro-key' },
  cycleSummaries: () => [validCycle, weakCycle],
  plans: () => [sourcePlan, weakPlan],
};

global.CommerceRadarActivationPlan = {
  KEYS: { plans: plansKey },
  createPlan: (input, source) => {
    const plan = {
      id: `new-plan-${Date.now()}`, version: '0.7.1', product: input.product || source.product, productKey: source.key,
      channel: input.channel || source.channels[0], startDate: input.startDate, endDate: '2026-08-07', budget: Number(input.budget || 0), status: 'draft',
      criteria: { minViews: Number(input.minViews || 0), minClicks: Number(input.minClicks || 0), minOrders: Number(input.minOrders || 0), minMarginPct: Number(input.minMarginPct || 0), maxSpend: Number(input.maxSpend || 0) },
      tasks: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, title: `Padrão ${index + 1}`, checklist: [{ id: 'base', label: `Item base ${index + 1}`, done: false }], status: 'pending' })),
      metrics: { views: 0, clicks: 0, orders: 0, revenue: 0, spend: 0, productCost: 0, fees: 0, shipping: 0 }, decision: null,
    };
    const rows = JSON.parse(store.get(plansKey) || '[]');
    store.set(plansKey, JSON.stringify([plan, ...rows]));
    return plan;
  },
};

require('../activation-playbooks.js');
const api = global.CommerceRadarPlaybooks;
assert(api, 'API não inicializada');
assert(api.eligibility(validCycle).eligible, 'Ciclo válido deveria ser elegível');
assert(!api.eligibility(weakCycle).eligible, 'Ciclo fraco não deveria ser elegível');

const draft = api.draftFromCycle('source-plan');
assert.strictEqual(draft.status, 'draft');
assert.strictEqual(draft.sourceSnapshot.orders, 4);
assert(draft.checklist.length >= 7, 'Checklist de origem ausente');
assert.throws(() => api.publishPlaybook(draft.id), /público/i, 'Publicação incompleta deveria ser bloqueada');

api.savePlaybook(draft.id, {
  title: 'Oferta visual para organização doméstica',
  offer: {
    audience: 'Pessoas que precisam organizar gavetas pequenas.',
    problem: 'Objetos soltos dificultam encontrar itens no dia a dia.',
    promise: 'Organizar a gaveta com módulos adaptáveis e prova visual.',
    creative: 'Imagem mostrando antes e depois da gaveta.',
    callToAction: 'Escolha o tamanho e teste a organização em casa.',
  },
});
const published = api.publishPlaybook(draft.id);
assert.strictEqual(published.status, 'published');
assert(published.confidence >= 80, 'Confiança deveria refletir o ciclo validado');

const applied = api.applyPlaybook(published.id, { product: 'Organizador para maquiagem', channel: 'Mercado Livre', startDate: '2026-08-01', budget: 120 });
assert.strictEqual(applied.plan.status, 'draft');
assert.strictEqual(applied.plan.metrics.orders, 0, 'Pedidos do ciclo antigo não podem ser copiados');
assert.strictEqual(applied.plan.metrics.revenue, 0, 'Receita do ciclo antigo não pode ser copiada');
assert.strictEqual(applied.plan.playbook.id, published.id);
assert(applied.plan.tasks.some(task => task.checklist.some(item => item.source === 'playbook')), 'Checklist não foi mesclado');
assert.strictEqual(api.applications().length, 1);

const weakDraft = api.draftFromCycle('weak-plan');
api.savePlaybook(weakDraft.id, {
  offer: { audience: 'Público de teste ainda incerto.', promise: 'Testar uma proposta reformulada com medição clara.' },
  checklist: ['Definir hipótese', 'Criar oferta', 'Publicar', 'Medir', 'Decidir'],
});
assert.throws(() => api.publishPlaybook(weakDraft.id), /score|validado|pedido|lucro/i, 'Playbook fraco não deveria ser publicado');

const report = api.libraryReport();
assert.strictEqual(report.published.length, 1);
assert.strictEqual(report.applications.length, 1);
const markdown = api.playbookMarkdown(published.id);
for (const marker of ['Playbook reutilizável', 'Evidência de origem', 'Modelo de oferta', 'Checklist', 'Estratégia', 'Tehkné Solutions']) assert(markdown.includes(marker), `Relatório sem ${marker}`);
const fs = require('fs');
const code = fs.readFileSync('activation-playbooks.js', 'utf8');
const css = fs.readFileSync('activation-playbooks.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/PLAYBOOK_LIBRARY.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Biblioteca de playbooks', 'learningPlaybooks', 'playbookApplications', 'playbookSettings', 'Tehkné Solutions']) {
  if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
}
for (const asset of ['./activation-playbooks.css', './activation-playbooks.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader sem asset: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`PWA sem asset: ${asset}`);
}
if (loader.indexOf('./activation-playbooks.js') < loader.indexOf('./activation-retrospective.js')) throw new Error('Playbooks devem carregar após retrospectivas');
if (!css.includes('.playbookSummary') || !css.includes('.playbookLayout') || css.length < 1800) throw new Error('CSS de playbooks incompleto');
if (version !== '0.7.4') throw new Error(`Versão incorreta: ${version}`);
if (!sw.includes('commerce-radar-v34')) throw new Error('Cache PWA não foi atualizado');
for (const marker of ['Origem obrigatória', 'Modelo de oferta', 'Checklist reutilizável', 'Publicação', 'Aplicação em um novo ciclo', 'Backup e sincronização']) {
  if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
}
console.log('Playbooks, publicação, aplicação, backup e PWA válidos.');