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

const EXPERIMENTS_KEY = 'test-champion-experiments';
const experiment = { id: 'exp-1', name: 'Experimento governado', status: 'running' };
store.set(EXPERIMENTS_KEY, JSON.stringify([experiment]));

let promoteCalls = 0;
let keepCalls = 0;
const governanceRecord = {
  experimentId: 'exp-1',
  owner: 'Ana Operadora',
  firstApprover: 'Bruno Revisor',
  secondApprover: 'Carla Aprovadora',
  approvalStatus: 'approved',
  requestedDecision: 'promote',
  requestNote: 'Challenger superior e aprovado.',
  approvals: [
    { stage: 1, approver: 'Bruno Revisor', decision: 'approve' },
    { stage: 2, approver: 'Carla Aprovadora', decision: 'approve' },
  ],
};

const formalDecisions = [];
global.CommerceRadarChampionChallenger = {
  KEYS: { experiments: EXPERIMENTS_KEY },
  promoteChallenger: () => { promoteCalls += 1; formalDecisions.push({ experimentId: 'exp-1', decision: 'promote' }); return { ok: true }; },
  keepChampion: () => { keepCalls += 1; formalDecisions.push({ experimentId: 'exp-1', decision: 'keep' }); return { ok: true }; },
};
global.CommerceRadarExperimentGovernance = {
  recordFor: () => ({ ...governanceRecord, approvals: [...governanceRecord.approvals] }),
  records: () => [{ ...governanceRecord }],
  formalDecisions: () => [...formalDecisions],
  evaluateGovernance: () => ({ record: { ...governanceRecord }, missing: [], approvals: governanceRecord.approvals, minimumMet: true }),
  canExecuteDecision: (experimentId, decision) => governanceRecord.approvalStatus === 'approved' && governanceRecord.requestedDecision === decision
    ? { ok: true }
    : { ok: false, reason: 'Governança incompleta.' },
};

require('../recommendation-audit.js');
const api = global.CommerceRadarExperimentAudit;
if (!api) throw new Error('API de auditoria não inicializada');

const direct = global.CommerceRadarChampionChallenger.promoteChallenger('exp-1', 'Tentativa direta');
if (direct.ok || promoteCalls !== 0) throw new Error('Promoção direta não foi bloqueada');

api.configureAssignment('exp-1', {
  executor: 'Diego Executor',
  auditor: 'Eva Auditora',
  consulted: ['Financeiro', 'Produto'],
  informed: 'Diretoria, Operação',
}, 'Ana Operadora');

let segregation = api.evaluateSegregation('exp-1', '2026-07-27');
if (!segregation.compliant || segregation.blocking.length !== 0) throw new Error(`Matriz válida foi bloqueada: ${JSON.stringify(segregation.blocking)}`);
if (segregation.matrix.consulted.length !== 2 || segregation.matrix.informed.length !== 2) throw new Error('Consultados ou informados não foram normalizados');

const wrongActor = api.canExecute('exp-1', 'Outra Pessoa', 'promote');
if (wrongActor.ok || !wrongActor.reason.includes('Diego Executor')) throw new Error('Executor incorreto não foi bloqueado');

const execution = api.executeDecision('exp-1', 'Diego Executor', 'Execução formal pelo executor.');
if (!execution.ok || promoteCalls !== 1) throw new Error('Execução segregada não promoveu o challenger');
const auditEvents = JSON.parse(store.get(api.KEYS.events));
if (!auditEvents.some(row => row.type === 'formal_decision_executed' && row.actor === 'Diego Executor')) throw new Error('Execução não entrou na trilha de auditoria');

api.configureAssignment('exp-1', { executor: 'Ana Operadora', auditor: 'Eva Auditora' }, 'Eva Auditora');
segregation = api.evaluateSegregation('exp-1', '2026-07-27');
if (!segregation.blocking.some(row => row.code === 'executor_operator')) throw new Error('Conflito executor-operador não foi detectado');
if (api.executeDecision('exp-1', 'Ana Operadora').ok) throw new Error('Execução com conflito não foi bloqueada');

api.configureAssignment('exp-1', { executor: 'Diego Executor', auditor: 'Eva Auditora' }, 'Eva Auditora');
governanceRecord.firstApprover = 'Ana Operadora';
segregation = api.evaluateSegregation('exp-1', '2026-07-27');
if (!segregation.blocking.some(row => row.code === 'operator_first_approver')) throw new Error('Conflito operador-aprovador não foi detectado');
api.registerException(
  'exp-1',
  ['operator_first_approver'],
  'Exceção temporária aprovada devido à equipe reduzida durante o piloto.',
  'Eva Auditora',
  '2026-08-31',
  'Eva Auditora'
);
segregation = api.evaluateSegregation('exp-1', '2026-07-27');
if (!segregation.compliant || !segregation.waived.some(row => row.code === 'operator_first_approver')) throw new Error('Exceção válida não dispensou o conflito');

api.configureAssignment('exp-1', { executor: 'Diego Executor', auditor: 'Ana Operadora' }, 'Eva Auditora');
let selfExceptionBlocked = false;
try {
  api.registerException('exp-1', ['auditor_operator'], 'Tentativa inválida de autoaprovação pelo auditor em conflito.', 'Ana Operadora');
} catch (error) {
  selfExceptionBlocked = error.message.includes('próprio papel');
}
if (!selfExceptionBlocked) throw new Error('Auditor conseguiu aprovar exceção para conflito próprio');

api.configureAssignment('exp-1', { executor: 'Diego Executor', auditor: 'Eva Auditora' }, 'Eva Auditora');
governanceRecord.firstApprover = 'Bruno Revisor';
const summary = api.auditSummary('2026-07-27');
if (summary.experiments !== 1 || summary.compliant !== 1 || summary.blocked !== 0) throw new Error(`Resumo de auditoria inválido: ${JSON.stringify(summary)}`);
const snapshot = api.captureAuditSnapshot('2026-07-27', true);
if (snapshot.compliant !== 1 || snapshot.signature !== 'Tehkné Solutions') throw new Error('Snapshot consolidado inválido');
const markdown = api.auditMarkdown('2026-07-27');
for (const marker of ['Auditoria consolidada dos experimentos', 'Matriz consolidada', 'Diego Executor', 'Eva Auditora', 'Tehkné Solutions']) {
  if (!markdown.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
}

const code = fs.readFileSync('recommendation-audit.js', 'utf8');
const css = fs.readFileSync('recommendation-audit.css', 'utf8');
const loader = fs.readFileSync('module-loader.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const docs = fs.readFileSync('docs/EXPERIMENT_AUDIT.md', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
for (const marker of ['Matriz e auditoria', 'experimentRoleAssignments', 'experimentControlExceptions', 'experimentAuditEvents', 'experimentAuditSnapshots', 'experimentAuditSettings', "version: '0.6.7'", 'Tehkné Solutions']) {
  if (!code.includes(marker)) throw new Error(`Marcador ausente no módulo: ${marker}`);
}
for (const asset of ['./recommendation-audit.css', './recommendation-audit.js']) {
  if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
  if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
}
if (loader.indexOf('./recommendation-audit.js') < loader.indexOf('./recommendation-governance.js')) throw new Error('Auditoria deve carregar após governança');
if (!css.includes('.auditSummary') || !css.includes('.auditCard') || css.length < 1800) throw new Error('CSS de auditoria incompleto');
const versionParts = version.split('.').map(Number);
if (versionParts[0] !== 0 || versionParts[1] < 6 || (versionParts[1] === 6 && versionParts[2] < 7)) throw new Error(`Versão anterior a 0.6.7: ${version}`);
const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
if (!cacheMatch || Number(cacheMatch[1]) < 27) throw new Error('Cache PWA anterior à auditoria v0.6.7');
for (const marker of ['Matriz de responsabilidades', 'Conflitos bloqueados', 'Execução controlada', 'Exceções formais', 'Relatório consolidado', 'Backup e sincronização']) {
  if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
}

console.log('Segregação, executor, exceções, trilha, relatório, backup e PWA válidos.');