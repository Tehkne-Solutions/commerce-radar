const fs = require('fs');

(async () => {
  const store = new Map();
  const sessions = new Map();
  global.window = undefined;
  global.document = undefined;
  global.localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
  global.sessionStorage = {
    getItem: key => sessions.has(key) ? sessions.get(key) : null,
    setItem: (key, value) => sessions.set(key, String(value)),
    removeItem: key => sessions.delete(key),
  };
  global.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  global.dispatchEvent = () => true;
  global.addEventListener = () => true;
  global.CommerceRadarExperimentGovernance = {};
  global.CommerceRadarExperimentAudit = {};
  global.CommerceRadarChampionChallenger = {};

  require('../recommendation-identity.js');
  const identity = global.CommerceRadarLocalIdentity;
  if (!identity) throw new Error('Identidade local não inicializada');

  const admin = await identity.createUser({ name: 'Admin Local', email: 'admin@example.com', profileId: 'administrator', pin: '1234' }, null);
  const dormant = await identity.createUser({ name: 'Usuário Inativo', email: 'inativo@example.com', profileId: 'viewer', pin: '2345' }, admin);
  const expired = await identity.createUser({ name: 'Executor Expirado', email: 'expirado@example.com', profileId: 'executor', pin: '3456' }, admin);

  const date = (offset) => {
    const value = new Date();
    value.setUTCHours(12, 0, 0, 0);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };
  const now = new Date().toISOString();
  const rawUsers = JSON.parse(store.get(identity.KEYS.users)).map(user => {
    if (user.id === dormant.id) return { ...user, lastLoginAt: `${date(-120)}T12:00:00.000Z`, accessExpiresAt: date(120), nextAccessReviewAt: date(-10) };
    if (user.id === expired.id) return { ...user, lastLoginAt: now, accessExpiresAt: date(-1), nextAccessReviewAt: date(30) };
    return user;
  });
  store.set(identity.KEYS.users, JSON.stringify(rawUsers));

  require('../recommendation-access-review.js');
  const api = global.CommerceRadarAccessReview;
  if (!api) throw new Error('API de revisão de acessos não inicializada');

  const rows = api.accessRows(date(0));
  const expiredState = rows.find(row => row.user.id === expired.id);
  const dormantState = rows.find(row => row.user.id === dormant.id);
  const adminState = rows.find(row => row.user.id === admin.id);
  if (!expiredState.expired || expiredState.risk !== 'critical') throw new Error('Conta expirada não foi classificada como crítica');
  if (!dormantState.inactive || !dormantState.reviewOverdue || dormantState.risk !== 'high') throw new Error(`Conta inativa/revisão vencida inválida: ${JSON.stringify(dormantState)}`);
  if (!adminState.overPrivileged || adminState.privileged.length < 4) throw new Error('Administrador não foi identificado como privilegiado');

  let expiredBlocked = false;
  try { await identity.authenticate('Executor Expirado', '3456'); }
  catch (error) { expiredBlocked = error.message.includes('expirou'); }
  if (!expiredBlocked) throw new Error('Conta expirada conseguiu autenticar');

  const currentAdmin = identity.currentUser();
  if (!currentAdmin || currentAdmin.id !== admin.id) throw new Error('Sessão administrativa inicial ausente');
  const revoked = api.revokeSessions(admin.id, currentAdmin, 'Teste de revogação global');
  if (revoked.sessionVersion !== 2) throw new Error('Versão de sessão não foi incrementada');
  if (identity.currentSession()) throw new Error('Sessão atual não foi encerrada após revogação');

  await identity.authenticate('Admin Local', '1234');
  const renewedSession = JSON.parse(sessions.get(identity.SESSION_KEY));
  if (renewedSession.accessVersion !== 2) throw new Error('Nova sessão não recebeu a versão atual');
  if (!api.sessionPolicyGate(date(0)).ok) throw new Error('Nova sessão válida foi bloqueada');
  if (store.has(identity.SESSION_KEY)) throw new Error('Sessão foi gravada no localStorage');

  const reviewer = identity.currentUser();
  const review = api.reviewAccess(dormant.id, 'keep', {
    note: 'Acesso mantido para consulta eventual e revisão trimestral.',
    nextReviewAt: date(90),
  }, reviewer);
  if (review.decision !== 'keep' || review.reviewedBy !== 'Admin Local') throw new Error('Revisão humana não foi registrada');
  const dormantAfter = api.accessRows(date(0)).find(row => row.user.id === dormant.id);
  if (dormantAfter.reviewOverdue) throw new Error('Próxima revisão não foi atualizada');

  const renewal = api.reviewAccess(expired.id, 'renew', {
    note: 'Conta renovada para execução controlada durante o próximo ciclo.',
    expiresAt: date(180),
  }, reviewer);
  if (renewal.decision !== 'renew') throw new Error('Renovação não foi registrada');
  const expiredAfter = api.accessRows(date(0)).find(row => row.user.id === expired.id);
  if (expiredAfter.expired || expiredAfter.accessExpiresAt !== date(180)) throw new Error('Validade da conta não foi renovada');

  api.reviewAccess(expired.id, 'reduce', {
    note: 'Privilégio reduzido após conclusão da etapa de execução.',
    profileId: 'viewer',
  }, reviewer);
  const reduced = identity.users().find(user => user.id === expired.id);
  if (reduced.profileId !== 'viewer') throw new Error('Redução de perfil não foi aplicada');

  const snapshot = api.captureSnapshot(date(0), true);
  if (snapshot.users !== 3 || snapshot.signature !== 'Tehkné Solutions') throw new Error('Snapshot de revisão inválido');
  const markdown = api.accessReviewMarkdown(date(0));
  for (const marker of ['Revisão de acessos e políticas', 'Contas expiradas', 'Revisões recentes', 'Tehkné Solutions']) {
    if (!markdown.includes(marker)) throw new Error(`Relatório sem marcador: ${marker}`);
  }

  const code = fs.readFileSync('recommendation-access-review.js', 'utf8');
  const css = fs.readFileSync('recommendation-access-review.css', 'utf8');
  const loader = fs.readFileSync('module-loader.js', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const docs = fs.readFileSync('docs/ACCESS_REVIEW_POLICIES.md', 'utf8');
  const version = fs.readFileSync('VERSION', 'utf8').trim();

  for (const marker of ['Validade, privilégios e revisão periódica', 'accessPolicySettings', 'accessReviews', 'accessReviewSnapshots', 'sessionVersion', 'Tehkné Solutions']) {
    if (!code.includes(marker)) throw new Error(`Marcador ausente no módulo: ${marker}`);
  }
  for (const asset of ['./recommendation-access-review.css', './recommendation-access-review.js']) {
    if (!loader.includes(asset)) throw new Error(`Loader ausente: ${asset}`);
    if (!sw.includes(asset)) throw new Error(`Cache ausente: ${asset}`);
  }
  if (loader.indexOf('./recommendation-access-review.js') < loader.indexOf('./recommendation-identity.js')) throw new Error('Revisão de acesso deve carregar após identidade');
  if (!css.includes('.accessReviewSummary') || !css.includes('.accessReviewCard') || css.length < 1800) throw new Error('CSS de revisão de acesso incompleto');
  const parts = version.split('.').map(Number);
  if (parts[0] !== 0 || parts[1] < 6 || (parts[1] === 6 && parts[2] < 9)) throw new Error(`Versão anterior a 0.6.9: ${version}`);
  const cacheMatch = sw.match(/commerce-radar-v(\d+)/);
  if (!cacheMatch || Number(cacheMatch[1]) < 29) throw new Error('Cache PWA anterior à revisão de acesso');
  for (const marker of ['Validade da conta', 'Revogação de sessões', 'Inatividade', 'Permissões privilegiadas', 'Revisão periódica', 'Backup e sincronização']) {
    if (!docs.includes(marker)) throw new Error(`Documentação incompleta: ${marker}`);
  }

  console.log('Validade, inatividade, privilégios, revisão, revogação, backup e PWA válidos.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
