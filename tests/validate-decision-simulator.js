const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};
const recommendations = [{ id: 'adaptive-exp-1', experimentId: 'exp-1', title: 'Teste', score: 80, confidence: 'high', risks: [] }];
const context = {
  console,
  localStorage,
  Intl,
  crypto: { randomUUID: () => `uuid-${Math.random()}` },
  CommerceRadarAdaptiveLearning: { recommendations: () => recommendations },
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('decision-simulator.js', 'utf8'), context);

const api = context.CommerceRadarDecisionSimulator;
assert(api, 'API global ausente');
const input = { revenue: 10000, marginRate: 0.3, conversionRate: 0.02, cac: 50, investment: 1000 };
const first = api.simulate('adaptive-exp-1', input);
const second = api.simulate('adaptive-exp-1', input);
assert.strictEqual(first.scenarios.length, 3);
assert.deepStrictEqual(first.scenarios, second.scenarios, 'simulação deve ser determinística');
assert(['conservador', 'base', 'agressivo'].includes(first.recommendedScenario));
assert(first.scenarios.every(row => Number.isFinite(row.riskScore)));
assert(api.compare().best);
assert(api.exportMarkdown().includes('Tehkné Solutions'));
assert(api.money(1234.56).includes('R$'));

const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
assert(loader.includes('decision-simulator.js'));
assert(loader.includes('decision-simulator.css'));
assert(sw.includes('decision-simulator.js'));
assert(sw.includes('decision-simulator.css'));
assert(sw.includes('commerce-radar-v45'));
assert.strictEqual(fs.readFileSync('VERSION', 'utf8').trim(), '0.8.5');
console.log('validate-decision-simulator: OK');