const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = new Map();
const localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};

const context = {
  console,
  localStorage,
  crypto: { randomUUID: () => `uuid-${Math.random()}` },
  CommerceRadarEvidenceConfidence: { assess: () => ({ score: 80 }) },
  CommerceRadarPlaybookVersionExperiments: { experiments: () => [{ id: 'exp-1' }] },
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('activation-evidence-prevention.js', 'utf8'), context);

const api = context.CommerceRadarEvidencePrevention;
assert(api, 'API global ausente');
assert.strictEqual(typeof api.startMonitoring, 'function');
assert.strictEqual(typeof api.checkpoint, 'function');
assert.strictEqual(typeof api.exportMarkdown, 'function');

const monitor = api.startMonitoring('exp-1', { id: 'plan-1', verifiedScore: 80 });
assert.strictEqual(monitor.status, 'monitoring');
assert.strictEqual(api.monitors().length, 1);
assert(api.checkpoints().length >= 1);

let result = api.checkpoint('exp-1', { score: 75 });
assert.strictEqual(result.status, 'attention');
result = api.checkpoint('exp-1', { score: 70 });
assert.strictEqual(result.status, 'recurrent');
assert(api.exportMarkdown().includes('Tehkné Solutions'));
assert(api.report().recurrent >= 1);

const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
assert(loader.includes('activation-evidence-prevention.js'));
assert(loader.includes('activation-evidence-prevention.css'));
assert(sw.includes('activation-evidence-prevention.js'));
assert(sw.includes('activation-evidence-prevention.css'));
assert.strictEqual(fs.readFileSync('VERSION', 'utf8').trim(), '0.8.8');
assert(sw.includes('commerce-radar-v48'));
console.log('validate-evidence-prevention: OK');