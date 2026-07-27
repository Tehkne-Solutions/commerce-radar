const fs = require('fs');

const store = new Map();
const sessionStore = new Map();
global.window = undefined;
global.document = undefined;
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
};
global.sessionStorage = {
  getItem: key => sessionStore.has(key) ? sessionStore.get(key) : null,
  setItem: (key, value) => sessionStore.set(key, String(value)),
  removeItem: key => sessionStore.delete(key),
};
global.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
global.dispatchEvent = () => true;

let promoted = 0;
let approvalActor = '';
const governanceRecord = {
  owner: 'Olivia Operadora',
  firstApprover: 'Paulo Aprovador',
  secondApprover: 'Paula Aprovadora',
  approvalStatus: 'awaiting_first',
  requestedDecision: 'promote',
};

global.CommerceRadarExperimentGovernance = {
  recordFor: () => ({ ...governanceRecord }),
  configureRecord: () => ({ ok: true }),
  requestDecision: () => ({ ok: true }),
  approveDecision: (experimentId, stage, approver) => { approvalActor = approver; return { ok: true, experimentId, stage }; },
};

global.CommerceRadarExperimentAudit = {
  roleMatrix: () => ({
    operator: 'Olivia Operadora',
    firstApprover: 'Paulo Aprovador',
    secondApprover: 'Paula Aprovadora',
    executor: 'Diego Executor',
    auditor: 'Eva Auditora',
  }),
  configureAssignment: () => ({ ok: true }),
  registerException: () => ({ id: 'exception-1' }),
  revokeException: () => ({ ok: true }),
  executeDecision: () => ({ ok: true }),
  captureAuditSnapshot: () => ({ date: '2026-07-27' }),
  auditMarkdown: () => 'auditoria',
};

global.CommerceRadarChampionChallenger = {
  promoteChallenger: () => { promoted += 1; return { ok: true }; },
  keepChampion: () => ({ ok: true }),
};

require('../recommendation-identity.js');
const api = global.CommerceRadarLocalIdentity;
if (!api) throw new Error('API de identidade local não inicializada');

(async () => {
  const admin = await api.createUser({ name: 'Admin Local', email: 'admin@example.com', pin: '1234', profileId: 'administrator' }, null);
  if (!api.currentUser() || api.currentUser().id !== admin.id) throw new Error('Administrador inicial não iniciou sessão');
  if (!admin.pinSalt || !admin.pinHash || admin.pinHash === '1234') throw new Error('PIN não foi armazenado com salt e hash');
  if (store.has(api.SESSION_KEY)) throw new Error('Sessão foi gravada no localStorage');
  if (!sessionStore.has(api.SESSION_KEY)) throw new Error('Sessão não foi gravada no sessionStorage');

  await api.createUser({ name: 'Diego Executor', email: 'diego@example.com', pin: '5678', profileId: 'executor' });
  await api.createUser({ name: 'Paulo Aprovador', email: 'paulo@example.com', pin: '9999', profileId: 'approver' });
  await api.createUser({ name: 'Eva Auditora', email: 'eva@example.com', pin: '8888', profileId: 'auditor' });
  await api.createUser({ name: 'Leitor Bloqueável', email: 'leitor@example.com', pin: '7777', profileId: 'viewer' });

  const custom = api.saveProfile({ name: 'Consulta especial', description: 'Somente auditoria e workspace.', permissions: ['workspace.view', 'audit.view'] });
  if (!custom.id.startsWith('custom-') || custom.permissions.length !== 2) throw new Error('Perfil personalizado inválido');

  api.signOut();
  let invalidAttempts = 0;
  api.saveSettings({ maximumFailedAttempts: 3, lockMinutes: 1 });
  for (let index = 0; index < 3; index += 1) {
    try { await api.authenticate('leitor@example.com', 'PIN-ERRADO'); } catch { invalidAttempts += 1; }
  }
  if (invalidAttempts !== 3) throw new Error('Tentativas inválidas não foram bloqueadas');
  const locked = api.users().find(user => user.email === 'leitor@example.com');
  if (!locked.lockedUntil || Date.parse(locked.lockedUntil) <= Date.now()) throw new Error('Bloqueio temporário não foi registrado');

  await api.authenticate('diego@example.com', '5678');
  const executorGate = api.authorizeAction('decision.execute', 'exp-1', 'executor');
  if (!executorGate.ok) throw new Error(`Executor válido bloqueado: ${executorGate.reason}`);
  if (api.authorizeAction('decision.approve', 'exp-1', 'approver').ok) throw new Error('Executor conseguiu aprovar decisão');
  const promotedResult = global.CommerceRadarChampionChallenger.promoteChallenger('exp-1');
  if (!promotedResult.ok || promoted !== 1) throw new Error('Executor designado não executou a promoção');

  api.signOut();
  await api.authenticate('paulo@example.com', '9999');
  const approvalGate = api.authorizeAction('decision.approve', 'exp-1', 'approver');
  if (!approvalGate.ok) throw new Error(`Aprovador válido bloqueado: ${approvalGate.reason}`);
  global.CommerceRadarExperimentGovernance.approveDecision('exp-1', 1, 'Pessoa falsa', 'Aprovação válida.');
  if (approvalActor !== 'Paulo Aprovador') throw new Error('API não substituiu o ator declarado pela sessão autenticada');
  if (global.CommerceRadarChampionChallenger.promoteChallenger('exp-1').ok) throw new Error('Aprovador conseguiu executar decisão');

  const events = api.identityEvents();
  if (!events.some(event => event.type === 'verified_champion_promotion' && event.userName === 'Diego Executor')) throw new Error('Execução não recebeu autoria verificada');
  if (!events.some(event => event.type === 'decision_approval_recorded' && event.userName === 'Paulo Aprovador')) throw new Error('Aprovação não recebeu autoria verificada');
  if (!events.some(event => event.type === 'login_failed')) throw new Error('Falhas de login não entraram na trilha');

  const report = api.identityMarkdown();
  for (const marker of ['Identidade local e perfis de acesso', 'Diego Executor', 'Consulta especial', 'Tehkné Solutions']) {
    if (!report.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('recommendation-identity.js', 'utf8');
  const css = fs.readFileSync('recommendation-identity.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/LOCAL_IDENTITY_ACCESS.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['Usuários e perfis de acesso', 'identityUsers', 'identityAccessProfiles', 'identityEvents', 'identitySettings', "version: '0.6.8'", 'Tehkné Solutions']) {
    if (!code.includes(marker)) throw new Error(`Marcador ausente no módulo: ${marker}`);
  }
  for (const asset of ['./recommendation-identity.css', './recommendation-identity.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
  }
  if (loader.indexOf('./recommendation-identity.js') < loader.indexOf('./recommendation-audit.js')) throw new Error('Identidade deve carregar após auditoria');
  if (!css.includes('.identitySummary') || !css.includes('.identityPermissionList') || css.length < 2500) throw new Error('CSS de identidade incompleto');
  if (version !== '0.6.8') throw new Error(`Versão incorreta: ${version}`);
  if (!sw.includes('commerce-radar-v28')) throw new Error('Cache PWA não foi atualizado');
  for (const marker of ['Primeiro acesso', 'Proteção do PIN', 'Sessão local', 'Perfis iniciais', 'Dupla verificação das ações', 'Backup e sincronização']) {
    if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
  }

  console.log('Identidade, PIN, sessão, perfis, autorização, autoria, backup e PWA válidos.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
