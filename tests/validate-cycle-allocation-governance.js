const assert = require('assert');
const fs = require('fs');
const store = new Map();
global.window = undefined;
global.document = undefined;
global.localStorage = { getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)) };
global.CustomEvent = class CustomEvent { constructor(type, init={}) { this.type=type; this.detail=init.detail; } };
global.dispatchEvent = () => true;
global.addEventListener = () => true;
let experimentRows = [{ id:'exp-1', playbookId:'pb-1', playbookTitle:'Oferta visual', status:'running', startedAt:'2026-07-01T10:00:00Z', createdAt:'2026-07-01T10:00:00Z' }];
let assignmentRows = [];
let seq = 0;
global.CommerceRadarPlaybookVersionExperiments = {
  experiments:()=>experimentRows,
  assignments:()=>assignmentRows,
  evaluateExperiment:()=>({ sufficient:false, winner:'insufficient', integrity:{valid:true} }),
  applyArm:(id,arm,input)=>{ const application={id:`a${++seq}`,versionExperimentId:id,versionExperimentArm:arm,planId:`p${seq}`,appliedAt:'2026-07-02T10:00:00Z'}; assignmentRows=[application,...assignmentRows]; return {application,plan:{id:application.planId,product:input.product}}; }
};
require('../activation-experiment-allocation.js');
const api = global.CommerceRadarAllocationGovernance;
assert(api,'API não inicializada');
assert.strictEqual(api.recommendedArm('exp-1'),'champion');
let result = api.governedApply('exp-1','champion',{product:'Produto A'});
assert.strictEqual(result.application.versionExperimentArm,'champion');
assert.strictEqual(api.recommendedArm('exp-1'),'challenger');
assert.throws(()=>api.governedApply('exp-1','champion',{product:'Produto B'}),/desequilibrada/i);
api.governedApply('exp-1','challenger',{product:'Produto C'});
let counts=api.armCounts('exp-1');
assert.deepStrictEqual({champion:counts.champion,challenger:counts.challenger},{champion:1,challenger:1});
api.savePolicy('exp-1',{maxImbalance:1,minimumDays:7,maximumDays:30,inactivityDays:5});
api.governedApply('exp-1','champion',{product:'Produto D'});
assert.throws(()=>api.governedApply('exp-1','champion',{product:'Produto E'}),/desequilibrada/i);
assert.throws(()=>api.requestException('exp-1','champion','curta'),/20 caracteres/i);
api.requestException('exp-1','champion','Necessidade operacional documentada para este braço.','2026-08-01');
api.governedApply('exp-1','champion',{product:'Produto E'});
counts=api.armCounts('exp-1');
assert.strictEqual(counts.champion,3);
const signals=api.stopSignals('exp-1','2026-08-10');
assert(signals.some(row=>row.id==='maximum_duration'));
assert(signals.some(row=>row.id==='inactivity'));
assert(signals.some(row=>row.id==='imbalance'));
const snap=api.captureSnapshot('2026-08-10');
assert.strictEqual(snap.rows[0].champion,3);
const md=api.markdown();
for(const marker of ['Governança da alocação','Próximo braço recomendado','Tehkné Solutions']) assert(md.includes(marker));
const code=fs.readFileSync('activation-experiment-allocation.js','utf8');
const css=fs.readFileSync('activation-experiment-allocation.css','utf8');
const loader=fs.readFileSync('module-loader.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const docs=fs.readFileSync('docs/CYCLE_ALLOCATION_GOVERNANCE.md','utf8');
const version=fs.readFileSync('VERSION','utf8').trim();
for(const marker of ['Governança da alocação dos ciclos','allocationPolicies','allocationExceptions','allocationEvents','allocationSnapshots','Tehkné Solutions']) assert(code.includes(marker),`Marcador ausente: ${marker}`);
for(const asset of ['./activation-experiment-allocation.css','./activation-experiment-allocation.js']) { assert(loader.includes(asset)); assert(sw.includes(asset)); }
assert(loader.indexOf('./activation-experiment-allocation.js') > loader.indexOf('./activation-playbook-version-experiments.js'));
assert(css.includes('.alSummary') && css.includes('.alSignals'));
assert.strictEqual(version,'0.7.8');
assert(sw.includes('commerce-radar-v38'));
for(const marker of ['Distribuição recomendada','Limite de desequilíbrio','Critérios de parada','Exceções','Backup e sincronização']) assert(docs.includes(marker));
console.log('Governança da alocação, exceções, parada, backup e PWA válidos.');
