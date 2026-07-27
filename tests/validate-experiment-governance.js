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

const experimentKey = 'test-champion-experiments';
const snapshotKey = 'test-champion-snapshots';
let promoteCalls = 0;
let keepCalls = 0;
let evaluationMode = 'challenger';

const experiments = [
  {
    id: 'exp-1',
    name: 'Experimento governado',
    status: 'running',
    createdAt: '2026-07-01T10:00:00Z',
    startedAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'exp-2',
    name: 'Experimento com baseline alterado',
    status: 'running',
    createdAt: '2026-05-01T10:00:00Z',
    startedAt: '2026-05-01T10:00:00Z',
  },
];
store.set(experimentKey, JSON.stringify(experiments));
store.set(snapshotKey, JSON.stringify([
  { id: 'shadow-1', experimentId: 'exp-1', date: '2026-07-10' },
  { id: 'shadow-2', experimentId: 'exp-2', date: '2026-05-10' },
]));

global.CommerceRadarChampionChallenger = {
  KEYS: { experiments: experimentKey, snapshots: snapshotKey },
  evaluateExperiment: experimentId => {
    if (experimentId === 'exp-2') {
      return {
        result: 'stale', stale: true, eligible: true,
        challenger: { total: 8 }, accuracyDelta: -20, brierDelta: 0.1,
      };
    }
    return {
      result: evaluationMode, stale: false, eligible: true,
      challenger: { total: 8 }, accuracyDelta: 12, brierDelta: -0.05,
    };
  },
  promoteChallenger: () => { promoteCalls += 1; return { ok: true }; },
  keepChampion: () => { keepCalls += 1; return true; },
};

require('../recommendation-governance.js');
const api = global.CommerceRadarExperimentGovernance;
const champion = global.CommerceRadarChampionChallenger;
if (!api) throw new Error('API de governança não inicializada');

api.saveSettings({
  minimumDurationDays: 14,
  maximumDurationDays: 30,
  inactivityDays: 7,
  requireDistinctApprovers: true,
});

api.configureRecord('exp-1', {
  owner: 'Rubens',
  firstApprover: 'Ana',
  secondApprover: 'Bruno',
  minimumDurationDays: 14,
  maximumDurationDays: 30,
  inactivityDays: 7,
  stopOnStaleBaseline: true,
  stopOnChampionSuperior: true,
});

let duplicateApproverBlocked = false;
try {
  api.configureRecord('exp-1', { firstApprover: 'Ana', secondApprover: 'Ana' });
} catch {
  duplicateApproverBlocked = true;
}
if (!duplicateApproverBlocked) throw new Error('Aprovadores iguais não foram bloqueados');

const early = api.evaluateGovernance('exp-1', '2026-07-10');
if (early.minimumMet || early.durationDays !== 9) throw new Error('Duração mínima foi calculada incorretamente');
let earlyRequestBlocked = false;
try {
  api.requestDecision('exp-1', 'promote', 'Muito cedo.', '2026-07-10');
} catch {
  earlyRequestBlocked = true;
}
if (!earlyRequestBlocked) throw new Error('Promoção foi solicitada antes da duração mínima');

const mature = api.evaluateGovernance('exp-1', '2026-07-20');
if (!mature.minimumMet || !mature.stopSignals.some(item => item.includes('Sem nova captura'))) throw new Error('Duração ou critério de inatividade inválidos');

api.requestDecision('exp-1', 'promote', 'Challenger superior após período mínimo.', '2026-07-20');
const blockedBeforeApproval = champion.promoteChallenger('exp-1', 'Não deveria executar.');
if (blockedBeforeApproval.ok || promoteCalls !== 0) throw new Error('Promoção ocorreu sem duas aprovações');

api.approveDecision('exp-1', 1, 'Ana', 'Amostra e hipótese revisadas.');
let wrongSecondBlocked = false;
try {
  api.approveDecision('exp-1', 2, 'Ana', 'Aprovação indevida.');
} catch {
  wrongSecondBlocked = true;
}
if (!wrongSecondBlocked) throw new Error('Segunda aprovação pela pessoa errada foi permitida');

api.approveDecision('exp-1', 2, 'Bruno', 'Autorização final concedida.');
const gate = api.canExecuteDecision('exp-1', 'promote', champion.evaluateExperiment('exp-1'), '2026-07-20');
if (!gate.ok) throw new Error(`Decisão aprovada permaneceu bloqueada: ${gate.reason}`);

const executed = api.executeApprovedDecision('exp-1', 'Promoção formal executada.');
if (!executed.ok || promoteCalls !== 1) throw new Error('Promoção aprovada não foi executada');
const formal = api.formalDecisions()[0];
if (!formal || formal.decision !== 'promote' || formal.owner !== 'Rubens' || formal.approvals.length !== 2) throw new Error('Decisão formal não foi registrada corretamente');
if (api.recordFor('exp-1').approvalStatus !== 'executed') throw new Error('Governança não foi marcada como executada');

const stale = api.evaluateGovernance('exp-2', '2026-07-20');
if (!stale.stopSignals.some(item => item.includes('Baseline')) || !stale.stopSignals.some(item => item.includes('Duração máxima'))) throw new Error('Critérios de parada por baseline e duração máxima não foram detectados');

api.configureRecord('exp-2', {
  owner: 'Carla',
  firstApprover: 'Diego',
  secondApprover: 'Elisa',
  minimumDurationDays: 14,
  maximumDurationDays: 30,
  inactivityDays: 7,
});
api.requestDecision('exp-2', 'keep', 'Baseline mudou; manter champion.', '2026-07-20');
api.approveDecision('exp-2', 1, 'Diego', 'Revisão operacional aprovada.');
api.approveDecision('exp-2', 2, 'Elisa', 'Manutenção autorizada.');
const kept = api.executeApprovedDecision('exp-2', 'Champion mantido formalmente.');
if (!kept.ok || keepCalls !== 1) throw new Error('Manutenção aprovada do champion não foi executada');
if (!api.formalDecisions().some(row => row.experimentId === 'exp-2' && row.decision === 'keep')) throw new Error('Decisão formal de manter champion ausente');

const code = fs.readFileSync('recommendation-governance.js', 'utf8');
const css = fs.readFileSync('recommendation-governance.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/EXPERIMENT_GOVERNANCE.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();

for (const marker of ['Governança dos experimentos', 'experimentGovernanceRecords', 'experimentFormalDecisions', 'experimentGovernanceSettings', "version: '0.6.6'", 'Tehkné Solutions']) {
  if (!code.includes(marker)) throw new Error(`Marcador ausente: ${marker}`);
}
for (const asset of ['./recommendation-governance.css', './recommendation-governance.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-governance.js') < loader.indexOf('./recommendation-champion.js')) throw new Error('Governança deve carregar após champion–challenger');
if (!css.includes('.governanceSummary') || !css.includes('.govCard') || css.length < 1800) throw new Error('CSS de governança incompleto');
const versionParts = version.split('.').map(Number);
if (versionParts[0] !== 0 || versionParts[1] < 6 || (versionParts[1] === 6 && versionParts[2] < 6)) throw new Error(`Versão anterior a 0.6.6: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 26) throw new Error('Cache PWA anterior à governança');
for (const marker of ['Fluxo obrigatório', 'Aprovação em duas etapas', 'Duração mínima', 'Critérios de parada', 'Decisão formal', 'Backup e sincronização']) {
  if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
}
console.log('Duração, responsáveis, duas aprovações, critérios de parada, decisão formal, backup e PWA válidos.');