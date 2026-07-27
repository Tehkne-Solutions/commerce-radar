(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const GOVERNANCE = ROOT.CommerceRadarExperimentGovernance;
  const AUDIT = ROOT.CommerceRadarExperimentAudit;
  const CHAMPION = ROOT.CommerceRadarChampionChallenger;

  const KEYS = {
    users: 'tehkne-commerce-radar-v68-identity-users',
    profiles: 'tehkne-commerce-radar-v68-access-profiles',
    events: 'tehkne-commerce-radar-v68-identity-events',
    settings: 'tehkne-commerce-radar-v68-identity-settings',
  };
  const SESSION_KEY = 'tehkne-commerce-radar-v68-local-session';

  const PERMISSIONS = {
    'workspace.view': 'Visualizar o workspace',
    'identity.manage': 'Gerenciar usuários',
    'profiles.manage': 'Gerenciar perfis de acesso',
    'experiment.operate': 'Operar experimentos',
    'governance.manage': 'Configurar governança',
    'decision.request': 'Solicitar decisão',
    'decision.approve': 'Aprovar ou rejeitar decisão',
    'decision.execute': 'Executar decisão aprovada',
    'matrix.view': 'Visualizar matriz de responsabilidades',
    'matrix.manage': 'Editar matriz de responsabilidades',
    'exception.approve': 'Aprovar exceções de controle',
    'audit.view': 'Visualizar auditoria',
    'audit.capture': 'Capturar snapshot de auditoria',
    'audit.export': 'Exportar relatórios de auditoria',
    'recommendations.view': 'Visualizar recomendações',
    'imports.manage': 'Importar dados',
    'finance.view': 'Visualizar indicadores financeiros',
  };

  const BUILTIN_PROFILES = [
    { id: 'administrator', name: 'Administrador', description: 'Controle total do workspace local.', permissions: ['*'], builtIn: true },
    { id: 'manager', name: 'Gestor', description: 'Configura governança e solicita decisões.', permissions: ['workspace.view', 'experiment.operate', 'governance.manage', 'decision.request', 'matrix.view', 'recommendations.view', 'finance.view'], builtIn: true },
    { id: 'operator', name: 'Operador', description: 'Opera experimentos e acompanha recomendações.', permissions: ['workspace.view', 'experiment.operate', 'decision.request', 'matrix.view', 'recommendations.view', 'imports.manage'], builtIn: true },
    { id: 'approver', name: 'Aprovador', description: 'Revisa e aprova decisões formais.', permissions: ['workspace.view', 'decision.approve', 'matrix.view', 'audit.view'], builtIn: true },
    { id: 'executor', name: 'Executor', description: 'Executa decisões já aprovadas e segregadas.', permissions: ['workspace.view', 'decision.execute', 'matrix.view', 'audit.view'], builtIn: true },
    { id: 'auditor', name: 'Auditor', description: 'Administra matriz, exceções e relatórios de auditoria.', permissions: ['workspace.view', 'matrix.view', 'matrix.manage', 'exception.approve', 'audit.view', 'audit.capture', 'audit.export'], builtIn: true },
    { id: 'viewer', name: 'Leitor', description: 'Acesso somente para consulta.', permissions: ['workspace.view', 'matrix.view', 'audit.view', 'recommendations.view', 'finance.view'], builtIn: true },
  ];

  const DEFAULTS = {
    sessionMinutes: 480,
    maximumFailedAttempts: 5,
    lockMinutes: 5,
    requireSessionForGovernance: true,
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const personKey = (value) => safe(value, 120).normalize?.('NFD').replace?.(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ') || safe(value, 120).toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const memorySession = new Map();
  const sessionStore = () => globalThis.sessionStorage || {
    getItem: (key) => memorySession.has(key) ? memorySession.get(key) : null,
    setItem: (key, value) => memorySession.set(key, String(value)),
    removeItem: (key) => memorySession.delete(key),
  };

  function settings() { return { ...DEFAULTS, ...(read(KEYS.settings, {}) || {}) }; }
  function saveSettings(patch = {}) {
    const current = settings();
    const next = {
      ...current,
      ...patch,
      sessionMinutes: Math.max(5, Math.min(1440, Number(patch.sessionMinutes ?? current.sessionMinutes) || current.sessionMinutes)),
      maximumFailedAttempts: Math.max(3, Math.min(10, Number(patch.maximumFailedAttempts ?? current.maximumFailedAttempts) || current.maximumFailedAttempts)),
      lockMinutes: Math.max(1, Math.min(60, Number(patch.lockMinutes ?? current.lockMinutes) || current.lockMinutes)),
    };
    write(KEYS.settings, next);
    return next;
  }

  function ensureProfiles() {
    const current = read(KEYS.profiles, []);
    const map = new Map(current.map((profile) => [profile.id, profile]));
    for (const profile of BUILTIN_PROFILES) {
      map.set(profile.id, { ...profile, ...(map.get(profile.id) || {}), builtIn: true, permissions: [...profile.permissions] });
    }
    const rows = [...map.values()];
    write(KEYS.profiles, rows);
    return rows;
  }

  function profiles() { return ensureProfiles(); }
  function users() { return read(KEYS.users, []); }
  function identityEvents() { return read(KEYS.events, []); }

  function appendIdentityEvent(type, user = null, detail = {}) {
    const row = {
      id: `identity-event-${uid()}`,
      type,
      userId: user?.id || '',
      userName: user?.name || '',
      profileId: user?.profileId || '',
      detail,
      at: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.events, [row, ...identityEvents()].slice(0, 1500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-identity-updated', { detail: row }));
    return row;
  }

  async function sha256(value) {
    const text = String(value);
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') return require('crypto').createHash('sha256').update(text).digest('hex');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function randomSalt() {
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return `${uid()}-${Date.now()}`;
  }

  function validatePin(pin) {
    const value = String(pin ?? '');
    if (value.length < 4 || value.length > 32) throw new Error('O PIN precisa ter entre 4 e 32 caracteres.');
    return value;
  }

  async function pinRecord(pin, salt = randomSalt()) {
    const normalized = validatePin(pin);
    return { pinSalt: salt, pinHash: await sha256(`${salt}:${normalized}`) };
  }

  function profileFor(profileId) { return profiles().find((profile) => profile.id === profileId && profile.active !== false) || null; }

  function currentSession() {
    let row = null;
    try { row = JSON.parse(sessionStore().getItem(SESSION_KEY) || 'null'); } catch { row = null; }
    if (!row?.userId || !row?.expiresAt || Date.parse(row.expiresAt) <= Date.now()) {
      sessionStore().removeItem(SESSION_KEY);
      return null;
    }
    const user = users().find((item) => item.id === row.userId && item.active !== false);
    if (!user) {
      sessionStore().removeItem(SESSION_KEY);
      return null;
    }
    return row;
  }

  function currentUser() {
    const session = currentSession();
    return session ? users().find((item) => item.id === session.userId && item.active !== false) || null : null;
  }

  function permissionsFor(user = currentUser()) {
    if (!user) return [];
    return profileFor(user.profileId)?.permissions || [];
  }

  function hasPermission(permission, user = currentUser()) {
    const permissions = permissionsFor(user);
    return permissions.includes('*') || permissions.includes(permission);
  }

  function requirePermission(permission, user = currentUser()) {
    if (!user) throw new Error('Entre com um usuário local para continuar.');
    if (!hasPermission(permission, user)) throw new Error(`O perfil ${profileFor(user.profileId)?.name || user.profileId} não possui a permissão “${PERMISSIONS[permission] || permission}”.`);
    return user;
  }

  function createSession(user) {
    const config = settings();
    const startedAt = nowIso();
    const expiresAt = new Date(Date.now() + config.sessionMinutes * 60000).toISOString();
    const session = { id: `session-${uid()}`, userId: user.id, startedAt, lastSeenAt: startedAt, expiresAt };
    sessionStore().setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function signOut(reason = 'manual') {
    const user = currentUser();
    sessionStore().removeItem(SESSION_KEY);
    if (user) appendIdentityEvent('session_closed', user, { reason });
    render();
    applyAccessToDom();
    return true;
  }

  async function createUser(input = {}, actor = currentUser()) {
    const existing = users();
    if (existing.length && !hasPermission('identity.manage', actor)) throw new Error('Somente um administrador pode criar usuários.');
    const name = safe(input.name, 120);
    const email = safe(input.email, 180).toLocaleLowerCase('pt-BR');
    const profileId = safe(input.profileId || (existing.length ? 'viewer' : 'administrator'), 80);
    if (!name) throw new Error('Informe o nome do usuário.');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
    if (!profileFor(profileId)) throw new Error('Perfil de acesso não encontrado.');
    if (existing.some((user) => personKey(user.name) === personKey(name) || (email && user.email === email))) throw new Error('Já existe um usuário com esse nome ou e-mail.');
    const secret = await pinRecord(input.pin);
    const row = {
      id: `user-${uid()}`,
      name,
      email,
      profileId,
      ...secret,
      active: input.active !== false,
      failedAttempts: 0,
      lockedUntil: '',
      lastLoginAt: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.users, [row, ...existing].slice(0, 250));
    appendIdentityEvent(existing.length ? 'user_created' : 'initial_administrator_created', actor || row, { targetUserId: row.id, targetName: row.name, profileId });
    if (!existing.length) {
      createSession(row);
      appendIdentityEvent('session_started', row, { bootstrap: true });
    }
    return row;
  }

  function updateUser(userId, patch = {}, actor = currentUser()) {
    requirePermission('identity.manage', actor);
    const current = users();
    const row = current.find((user) => user.id === userId);
    if (!row) throw new Error('Usuário não encontrado.');
    const next = {
      ...row,
      name: safe(patch.name ?? row.name, 120),
      email: safe(patch.email ?? row.email, 180).toLocaleLowerCase('pt-BR'),
      profileId: safe(patch.profileId ?? row.profileId, 80),
      active: patch.active ?? row.active,
      updatedAt: nowIso(),
    };
    if (!profileFor(next.profileId)) throw new Error('Perfil de acesso não encontrado.');
    if (!next.name) throw new Error('O nome do usuário é obrigatório.');
    if (next.email && !/^\S+@\S+\.\S+$/.test(next.email)) throw new Error('Informe um e-mail válido.');
    write(KEYS.users, [next, ...current.filter((user) => user.id !== userId)]);
    appendIdentityEvent('user_updated', actor, { targetUserId: userId, profileId: next.profileId, active: next.active });
    if (!next.active && currentSession()?.userId === next.id) signOut('user_deactivated');
    return next;
  }

  async function resetPin(userId, pin, actor = currentUser()) {
    requirePermission('identity.manage', actor);
    const current = users();
    const row = current.find((user) => user.id === userId);
    if (!row) throw new Error('Usuário não encontrado.');
    const next = { ...row, ...(await pinRecord(pin)), failedAttempts: 0, lockedUntil: '', updatedAt: nowIso() };
    write(KEYS.users, [next, ...current.filter((user) => user.id !== userId)]);
    appendIdentityEvent('pin_reset', actor, { targetUserId: userId });
    return next;
  }

  function saveProfile(input = {}, actor = currentUser()) {
    requirePermission('profiles.manage', actor);
    const current = profiles();
    const id = safe(input.id || `custom-${uid()}`, 80).toLocaleLowerCase('pt-BR').replace(/[^a-z0-9-]+/g, '-');
    const existing = current.find((profile) => profile.id === id);
    if (existing?.builtIn) throw new Error('Perfis internos não podem ser substituídos.');
    const name = safe(input.name, 120);
    if (!name) throw new Error('Informe o nome do perfil.');
    const requested = Array.isArray(input.permissions) ? input.permissions : safe(input.permissions).split(',');
    const permissions = [...new Set(requested.map((permission) => safe(permission, 80)).filter((permission) => permission === '*' || PERMISSIONS[permission]))];
    if (!permissions.length) throw new Error('Selecione ao menos uma permissão válida.');
    const row = { id, name, description: safe(input.description, 300), permissions, builtIn: false, active: input.active !== false, createdAt: existing?.createdAt || nowIso(), updatedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.profiles, [row, ...current.filter((profile) => profile.id !== id)]);
    appendIdentityEvent(existing ? 'profile_updated' : 'profile_created', actor, { profileId: id, permissions });
    return row;
  }

  async function authenticate(identifier, pin) {
    const lookup = personKey(identifier);
    const current = users();
    const user = current.find((item) => item.active !== false && (personKey(item.name) === lookup || personKey(item.email) === lookup));
    if (!user) {
      appendIdentityEvent('login_failed', null, { identifier: safe(identifier, 120), reason: 'unknown_user' });
      throw new Error('Usuário ou PIN inválido.');
    }
    if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) throw new Error(`Usuário temporariamente bloqueado até ${new Date(user.lockedUntil).toLocaleTimeString('pt-BR')}.`);
    const hash = await sha256(`${user.pinSalt}:${String(pin ?? '')}`);
    if (hash !== user.pinHash) {
      const config = settings();
      const failedAttempts = Number(user.failedAttempts || 0) + 1;
      const lockedUntil = failedAttempts >= config.maximumFailedAttempts ? new Date(Date.now() + config.lockMinutes * 60000).toISOString() : '';
      const next = { ...user, failedAttempts: lockedUntil ? 0 : failedAttempts, lockedUntil, updatedAt: nowIso() };
      write(KEYS.users, [next, ...current.filter((item) => item.id !== user.id)]);
      appendIdentityEvent('login_failed', user, { failedAttempts, lockedUntil });
      throw new Error(lockedUntil ? `Usuário bloqueado por ${config.lockMinutes} minuto(s).` : 'Usuário ou PIN inválido.');
    }
    const next = { ...user, failedAttempts: 0, lockedUntil: '', lastLoginAt: nowIso(), updatedAt: nowIso() };
    write(KEYS.users, [next, ...current.filter((item) => item.id !== user.id)]);
    const session = createSession(next);
    appendIdentityEvent('session_started', next, { sessionId: session.id, expiresAt: session.expiresAt });
    render();
    applyAccessToDom();
    return { user: next, session };
  }

  function roleName(experimentId, role) {
    const matrix = AUDIT?.roleMatrix?.(experimentId) || {};
    if (role === 'approver') {
      const record = GOVERNANCE?.recordFor?.(experimentId) || {};
      return record.approvalStatus === 'awaiting_second' ? record.secondApprover : record.firstApprover;
    }
    return matrix[role] || '';
  }

  function authorizeAction(permission, experimentId = '', role = '') {
    const user = currentUser();
    if (!user) return { ok: false, reason: 'Entre com um usuário local para continuar.' };
    if (!hasPermission(permission, user)) return { ok: false, reason: `O perfil ${profileFor(user.profileId)?.name || user.profileId} não possui a permissão “${PERMISSIONS[permission] || permission}”.`, user };
    if (experimentId && role) {
      const expected = roleName(experimentId, role);
      if (!expected) return { ok: false, reason: `O papel ${role} ainda não foi definido para este experimento.`, user };
      if (personKey(user.name) !== personKey(expected)) return { ok: false, reason: `Esta ação pertence a ${expected}. A sessão atual é de ${user.name}.`, user, expected };
    }
    return { ok: true, user };
  }

  function guardOrThrow(permission, experimentId = '', role = '') {
    const result = authorizeAction(permission, experimentId, role);
    if (!result.ok) throw new Error(result.reason);
    return result.user;
  }

  function wrapPublicApis() {
    if (GOVERNANCE && !GOVERNANCE.__identityWrapped) {
      const originalConfigure = GOVERNANCE.configureRecord?.bind(GOVERNANCE);
      const originalRequest = GOVERNANCE.requestDecision?.bind(GOVERNANCE);
      const originalApprove = GOVERNANCE.approveDecision?.bind(GOVERNANCE);
      if (originalConfigure) GOVERNANCE.configureRecord = (experimentId, patch = {}) => { const user = guardOrThrow('governance.manage'); const result = originalConfigure(experimentId, patch); appendIdentityEvent('governance_configured', user, { experimentId }); return result; };
      if (originalRequest) GOVERNANCE.requestDecision = (experimentId, decision, note = '', reference) => { const user = guardOrThrow('decision.request', experimentId, 'operator'); const result = originalRequest(experimentId, decision, note, reference); appendIdentityEvent('decision_requested', user, { experimentId, decision }); return result; };
      if (originalApprove) GOVERNANCE.approveDecision = (experimentId, stage, approver, note = '', decision = 'approve') => { const user = guardOrThrow('decision.approve', experimentId, 'approver'); const result = originalApprove(experimentId, stage, user.name, note, decision); appendIdentityEvent('decision_approval_recorded', user, { experimentId, stage, decision }); return result; };
      GOVERNANCE.__identityWrapped = true;
    }
    if (AUDIT && !AUDIT.__identityWrapped) {
      const originalConfigure = AUDIT.configureAssignment?.bind(AUDIT);
      const originalException = AUDIT.registerException?.bind(AUDIT);
      const originalRevoke = AUDIT.revokeException?.bind(AUDIT);
      const originalExecute = AUDIT.executeDecision?.bind(AUDIT);
      const originalSnapshot = AUDIT.captureAuditSnapshot?.bind(AUDIT);
      const originalMarkdown = AUDIT.auditMarkdown?.bind(AUDIT);
      if (originalConfigure) AUDIT.configureAssignment = (experimentId, patch = {}, actor = '') => { const user = guardOrThrow('matrix.manage'); const result = originalConfigure(experimentId, patch, user.name); appendIdentityEvent('role_matrix_updated', user, { experimentId }); return result; };
      if (originalException) AUDIT.registerException = (experimentId, codes, justification, approvedBy, expiresAt = '', actor = '') => { const user = guardOrThrow('exception.approve', experimentId, 'auditor'); const result = originalException(experimentId, codes, justification, user.name, expiresAt, user.name); appendIdentityEvent('control_exception_approved', user, { experimentId, exceptionId: result.id }); return result; };
      if (originalRevoke) AUDIT.revokeException = (exceptionId, actor = '') => { const user = guardOrThrow('exception.approve'); const result = originalRevoke(exceptionId, user.name); appendIdentityEvent('control_exception_revoked', user, { exceptionId }); return result; };
      if (originalExecute) AUDIT.executeDecision = (experimentId, actor = '', note = '') => { const user = guardOrThrow('decision.execute', experimentId, 'executor'); const result = originalExecute(experimentId, user.name, note); if (result?.ok) appendIdentityEvent('verified_decision_execution', user, { experimentId, decision: GOVERNANCE?.recordFor?.(experimentId)?.requestedDecision || '' }); return result; };
      if (originalSnapshot) AUDIT.captureAuditSnapshot = (reference, force) => { const user = guardOrThrow('audit.capture'); const result = originalSnapshot(reference, force); appendIdentityEvent('audit_snapshot_captured', user, { reference: result?.date || reference }); return result; };
      if (originalMarkdown) AUDIT.auditMarkdown = (reference) => { guardOrThrow('audit.export'); return originalMarkdown(reference); };
      AUDIT.__identityWrapped = true;
    }
    if (CHAMPION && !CHAMPION.__identityWrapped) {
      const originalPromote = CHAMPION.promoteChallenger?.bind(CHAMPION);
      const originalKeep = CHAMPION.keepChampion?.bind(CHAMPION);
      if (originalPromote) CHAMPION.promoteChallenger = (experimentId, note = '', override = false) => { const gate = authorizeAction('decision.execute', experimentId, 'executor'); if (!gate.ok) return gate; const result = originalPromote(experimentId, note, override); if (result?.ok) appendIdentityEvent('verified_champion_promotion', gate.user, { experimentId }); return result; };
      if (originalKeep) CHAMPION.keepChampion = (experimentId, note = '') => { const gate = authorizeAction('decision.execute', experimentId, 'executor'); if (!gate.ok) return gate; const result = originalKeep(experimentId, note); if (result === true || result?.ok !== false) appendIdentityEvent('verified_champion_retention', gate.user, { experimentId }); return result; };
      CHAMPION.__identityWrapped = true;
    }
  }

  function experimentIdFromElement(element) {
    return element?.closest?.('[data-governance-card]')?.dataset.governanceCard
      || element?.closest?.('[data-audit-card]')?.dataset.auditCard
      || element?.closest?.('[data-champion-card]')?.dataset.championCard
      || element?.dataset?.promote || element?.dataset?.keep || '';
  }

  function actionForElement(element) {
    if (!element) return null;
    if (element.id === 'auditSnapshot') return { permission: 'audit.capture', action: 'audit_snapshot' };
    if (element.id === 'auditExport') return { permission: 'audit.export', action: 'audit_export' };
    if (element.matches?.('[data-gov-save]')) return { permission: 'governance.manage', action: 'governance_save' };
    if (element.matches?.('[data-gov-request]')) return { permission: 'decision.request', role: 'operator', action: 'decision_request' };
    if (element.matches?.('[data-gov-approve],[data-gov-reject]')) return { permission: 'decision.approve', role: 'approver', action: 'decision_approval' };
    if (element.matches?.('[data-gov-execute]')) return { permission: 'decision.execute', role: 'executor', action: 'decision_execute' };
    if (element.matches?.('[data-audit-save]')) return { permission: 'matrix.manage', action: 'matrix_save' };
    if (element.matches?.('[data-audit-exception]')) return { permission: 'exception.approve', role: 'auditor', action: 'exception_approve' };
    if (element.matches?.('[data-audit-execute]')) return { permission: 'decision.execute', role: 'executor', action: 'decision_execute' };
    if (element.matches?.('[data-promote],[data-keep]')) return { permission: 'decision.execute', role: 'executor', action: 'champion_decision' };
    return null;
  }

  function accessToast(message, error = false) {
    let node = $('identityToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'identityToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(accessToast.timer);
    accessToast.timer = setTimeout(() => node.classList.remove('show'), 4200);
  }

  function guardClick(event) {
    const button = event.target?.closest?.('button');
    const action = actionForElement(button);
    if (!action) return;
    const experimentId = experimentIdFromElement(button);
    const gate = authorizeAction(action.permission, experimentId, action.role || '');
    if (!gate.ok) {
      event.preventDefault();
      event.stopImmediatePropagation();
      accessToast(gate.reason, true);
      return;
    }
    setTimeout(() => appendIdentityEvent('authorized_action_invoked', gate.user, { action: action.action, permission: action.permission, experimentId }), 0);
  }

  function applyAccessToDom() {
    if (typeof document === 'undefined') return;
    const user = currentUser();
    document.querySelectorAll('button').forEach((button) => {
      const action = actionForElement(button);
      if (!action) return;
      const gate = authorizeAction(action.permission, experimentIdFromElement(button), action.role || '');
      button.classList.toggle('identityDenied', !gate.ok);
      if (!gate.ok) button.title = gate.reason;
    });
    const auditNav = $('auditNav');
    if (auditNav) auditNav.classList.toggle('identityDenied', !user || !hasPermission('audit.view', user));
    const governanceNav = $('governanceNav');
    if (governanceNav) governanceNav.classList.toggle('identityDenied', !user || !hasPermission('workspace.view', user));
    const badge = $('identitySessionBadge');
    if (badge) badge.textContent = user ? user.name : 'Sessão encerrada';
  }

  function createCustomProfileFromForm() {
    const permissions = [...document.querySelectorAll('[data-profile-permission]:checked')].map((input) => input.value);
    const row = saveProfile({ name: $('identityProfileName').value, description: $('identityProfileDescription').value, permissions });
    $('identityProfileName').value = '';
    $('identityProfileDescription').value = '';
    document.querySelectorAll('[data-profile-permission]').forEach((input) => { input.checked = false; });
    accessToast(`Perfil ${row.name} criado.`);
    render();
  }

  function render() {
    const root = $('identityAccess');
    if (!root) return;
    const currentProfiles = profiles();
    const currentUsers = users();
    const user = currentUser();
    const profile = user ? profileFor(user.profileId) : null;
    const session = currentSession();
    const summary = $('identitySummary');
    if (summary) summary.innerHTML = [
      ['Usuários ativos', currentUsers.filter((item) => item.active !== false).length, `${currentUsers.length} cadastrados`],
      ['Perfis', currentProfiles.filter((item) => item.active !== false).length, 'internos e personalizados'],
      ['Sessão', user ? user.name : 'Encerrada', user ? profile?.name || user.profileId : 'login necessário'],
      ['Eventos', identityEvents().length, 'trilha local'],
    ].map(([label, value, note]) => `<article class="card identityMetric"><small>${esc(label)}</small><b>${esc(value)}</b><span>${esc(note)}</span></article>`).join('');

    const sessionNode = $('identitySession');
    if (sessionNode) sessionNode.innerHTML = user
      ? `<div class="identitySigned"><div><span class="eyebrow">SESSÃO ATIVA</span><h3>${esc(user.name)}</h3><p class="muted">${esc(profile?.name || user.profileId)} · expira em ${new Date(session.expiresAt).toLocaleString('pt-BR')}</p></div><button class="btn" id="identityLogout">Sair</button></div>`
      : `<div class="identityLogin"><div><span class="eyebrow">ENTRAR</span><h3>Sessão operacional local</h3><p class="muted">Use nome ou e-mail e o PIN cadastrado.</p></div><div class="identityLoginFields"><label class="field"><span>Usuário</span><input id="identityLoginIdentifier" autocomplete="username"></label><label class="field"><span>PIN</span><input id="identityLoginPin" type="password" autocomplete="current-password"></label><button class="btn primary" id="identityLoginButton">Entrar</button></div></div>`;
    $('identityLogout')?.addEventListener('click', () => signOut());
    $('identityLoginButton')?.addEventListener('click', async () => {
      try { await authenticate($('identityLoginIdentifier').value, $('identityLoginPin').value); accessToast('Sessão iniciada.'); }
      catch (error) { accessToast(error.message, true); }
    });

    const bootstrap = $('identityBootstrap');
    if (bootstrap) {
      bootstrap.hidden = currentUsers.length > 0;
      bootstrap.innerHTML = currentUsers.length ? '' : `<article class="card identityBootstrapCard"><span class="eyebrow">PRIMEIRO ACESSO</span><h3>Criar administrador local</h3><p class="muted">O PIN será salvo com salt e hash. A sessão ficará apenas neste navegador.</p><div class="identityFormGrid"><label class="field"><span>Nome</span><input id="identityBootstrapName"></label><label class="field"><span>E-mail</span><input id="identityBootstrapEmail" type="email"></label><label class="field"><span>PIN</span><input id="identityBootstrapPin" type="password"></label></div><button class="btn primary" id="identityBootstrapButton">Criar administrador</button></article>`;
      $('identityBootstrapButton')?.addEventListener('click', async () => {
        try { await createUser({ name: $('identityBootstrapName').value, email: $('identityBootstrapEmail').value, pin: $('identityBootstrapPin').value, profileId: 'administrator' }, null); accessToast('Administrador criado e sessão iniciada.'); render(); applyAccessToDom(); }
        catch (error) { accessToast(error.message, true); }
      });
    }

    const adminNode = $('identityAdministration');
    const canManageUsers = user && hasPermission('identity.manage', user);
    if (adminNode) adminNode.innerHTML = canManageUsers ? `<div class="identityAdminLayout"><main><article class="card"><span class="eyebrow">USUÁRIOS</span><h3>Novo usuário</h3><div class="identityFormGrid"><label class="field"><span>Nome</span><input id="identityUserName"></label><label class="field"><span>E-mail</span><input id="identityUserEmail" type="email"></label><label class="field"><span>Perfil</span><select id="identityUserProfile">${currentProfiles.filter((item) => item.active !== false).map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</select></label><label class="field"><span>PIN inicial</span><input id="identityUserPin" type="password"></label></div><button class="btn primary" id="identityCreateUser">Criar usuário</button></article><div class="identityUsers">${currentUsers.map((item) => `<article class="card identityUser ${item.active === false ? 'inactive' : ''}" data-user-id="${esc(item.id)}"><div><h3>${esc(item.name)}</h3><p>${esc(item.email || 'sem e-mail')} · ${esc(profileFor(item.profileId)?.name || item.profileId)}</p></div><div class="actions"><button class="btn" data-user-toggle>${item.active === false ? 'Ativar' : 'Desativar'}</button><button class="btn" data-user-pin>Redefinir PIN</button></div></article>`).join('')}</div></main><aside><article class="card"><span class="eyebrow">PERFIL PERSONALIZADO</span><h3>Novo perfil</h3><label class="field"><span>Nome</span><input id="identityProfileName"></label><label class="field"><span>Descrição</span><textarea id="identityProfileDescription"></textarea></label><div class="identityPermissionList">${Object.entries(PERMISSIONS).map(([id, label]) => `<label><input type="checkbox" value="${esc(id)}" data-profile-permission> ${esc(label)}</label>`).join('')}</div><button class="btn" id="identityCreateProfile">Criar perfil</button></article></aside></div>` : `<article class="card"><h3>Administração restrita</h3><p class="muted">Entre com um perfil que possua gerenciamento de usuários.</p></article>`;
    $('identityCreateUser')?.addEventListener('click', async () => {
      try { await createUser({ name: $('identityUserName').value, email: $('identityUserEmail').value, profileId: $('identityUserProfile').value, pin: $('identityUserPin').value }); accessToast('Usuário criado.'); render(); }
      catch (error) { accessToast(error.message, true); }
    });
    $('identityCreateProfile')?.addEventListener('click', () => { try { createCustomProfileFromForm(); } catch (error) { accessToast(error.message, true); } });
    adminNode?.querySelectorAll('[data-user-id]').forEach((card) => {
      const userId = card.dataset.userId;
      card.querySelector('[data-user-toggle]')?.addEventListener('click', () => { try { const target = currentUsers.find((item) => item.id === userId); updateUser(userId, { active: target?.active === false }); accessToast('Situação do usuário atualizada.'); render(); } catch (error) { accessToast(error.message, true); } });
      card.querySelector('[data-user-pin]')?.addEventListener('click', async () => { const pin = prompt('Novo PIN:', '') ?? ''; try { await resetPin(userId, pin); accessToast('PIN redefinido.'); } catch (error) { accessToast(error.message, true); } });
    });

    const profilesNode = $('identityProfiles');
    if (profilesNode) profilesNode.innerHTML = currentProfiles.map((item) => `<article class="card identityProfile"><div><span>${item.builtIn ? 'INTERNO' : 'PERSONALIZADO'}</span><h3>${esc(item.name)}</h3><p>${esc(item.description || '')}</p></div><div class="identityProfilePermissions">${item.permissions.map((permission) => `<small>${esc(permission === '*' ? 'Todas as permissões' : PERMISSIONS[permission] || permission)}</small>`).join('')}</div></article>`).join('');

    const eventsNode = $('identityEvents');
    if (eventsNode) eventsNode.innerHTML = identityEvents().slice(0, 30).map((event) => `<div class="identityEvent"><span>${new Date(event.at).toLocaleString('pt-BR')}</span><b>${esc(event.type)}</b><small>${esc(event.userName || 'sistema')}</small></div>`).join('') || '<p class="muted">Nenhum evento de identidade.</p>';
    const permissionsNode = $('identityCurrentPermissions');
    if (permissionsNode) permissionsNode.innerHTML = user ? permissionsFor(user).map((permission) => `<small>${esc(permission === '*' ? 'Todas as permissões' : PERMISSIONS[permission] || permission)}</small>`).join('') : '<p class="muted">Entre para visualizar as permissões da sessão.</p>';
    applyAccessToDom();
  }

  function identityMarkdown() {
    const currentUsers = users();
    const currentProfiles = profiles();
    const lines = [
      '# Commerce Radar — Identidade local e perfis de acesso', '',
      `Data: ${today()}`, '',
      `- Usuários cadastrados: ${currentUsers.length}`,
      `- Usuários ativos: ${currentUsers.filter((user) => user.active !== false).length}`,
      `- Perfis de acesso: ${currentProfiles.length}`,
      `- Eventos de identidade: ${identityEvents().length}`, '',
      '## Usuários', '',
      ...currentUsers.map((user) => `- ${user.name}: ${profileFor(user.profileId)?.name || user.profileId}; ${user.active === false ? 'inativo' : 'ativo'}; último acesso ${user.lastLoginAt || 'não registrado'}.`), '',
      '## Perfis', '',
      ...currentProfiles.map((profile) => `- ${profile.name}: ${profile.permissions.join(', ')}.`), '',
      '## Limitações', '',
      '- A identidade é local ao workspace e não utiliza SSO, IAM corporativo ou assinatura digital.',
      '- O PIN é armazenado com salt e hash, mas a segurança ainda depende do dispositivo e do navegador.',
      '- A sessão não é sincronizada entre dispositivos.', '',
      'Tehkné Solutions',
    ];
    return lines.join('\n');
  }

  function downloadIdentityReport() {
    requirePermission('audit.export');
    const url = URL.createObjectURL(new Blob([identityMarkdown()], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-identidade-acesso-${today()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'identityAccess'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'identityNav'));
    if ($('title')) $('title').textContent = 'Gerencie identidade local e perfis de acesso';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.identityUsers = KEYS.users;
      keys.identityAccessProfiles = KEYS.profiles;
      keys.identityEvents = KEYS.events;
      keys.identitySettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { users: [], profiles: [], events: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 520) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.6.8', exportedAt: nowIso(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.identityUsers = users(); payload.identityAccessProfiles = profiles(); payload.identityEvents = identityEvents(); payload.identitySettings = settings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            users: Array.isArray(payload.identityUsers) ? payload.identityUsers : [],
            profiles: Array.isArray(payload.identityAccessProfiles) ? payload.identityAccessProfiles : [],
            events: Array.isArray(payload.identityEvents) ? payload.identityEvents : [],
            settings: payload.identitySettings || {},
          };
        } catch { pending = { users: [], profiles: [], events: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.users, [...new Map([...users(), ...pending.users].map((item) => [item.id, item])).values()].slice(0, 250));
        write(KEYS.profiles, [...new Map([...profiles(), ...pending.profiles].map((item) => [item.id, item])).values()]);
        write(KEYS.events, [...new Map([...identityEvents(), ...pending.events].map((item) => [item.id, item])).values()].slice(0, 1500));
        write(KEYS.settings, { ...settings(), ...pending.settings }); ensureProfiles(); signOut('restore_merge'); render();
      });
      replace.addEventListener('click', () => { write(KEYS.users, pending.users); write(KEYS.profiles, pending.profiles); write(KEYS.events, pending.events); write(KEYS.settings, pending.settings); ensureProfiles(); signOut('restore_replace'); render(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const auditNav = $('auditNav'); const auditView = $('experimentAudit');
    if (!auditNav || !auditView || $('identityNav')) return false;
    auditNav.insertAdjacentHTML('afterend', '<button class="nav" id="identityNav"><span>Identidade e acesso</span><b id="identitySessionBadge"></b></button>');
    auditView.insertAdjacentHTML('afterend', `<section class="view" id="identityAccess"><div class="sectionHead"><div><span class="eyebrow">IDENTIDADE LOCAL</span><h2>Usuários e perfis de acesso</h2><p class="muted">Associe ações críticas a uma sessão local, controle permissões por perfil e mantenha uma trilha verificável no workspace.</p></div><div class="actions"><button class="btn" id="identityExport">Exportar acessos</button></div></div><div id="identityBootstrap"></div><div class="identitySummary" id="identitySummary"></div><article class="card" id="identitySession"></article><div id="identityAdministration"></div><div class="identityLayout"><main><section><div class="sectionHead"><div><span class="eyebrow">PERFIS</span><h3>Matriz de permissões</h3></div></div><div class="identityProfiles" id="identityProfiles"></div></section></main><aside><article class="card"><span class="eyebrow">SESSÃO ATUAL</span><h3>Permissões efetivas</h3><div class="identityPermissionCloud" id="identityCurrentPermissions"></div></article><article class="card"><span class="eyebrow">TRILHA</span><h3>Eventos de identidade</h3><div id="identityEvents"></div></article><article class="card"><span class="eyebrow">LIMITAÇÃO</span><p class="muted">A sessão é local ao navegador. Este controle não substitui IAM, SSO, MFA ou assinatura digital corporativa.</p></article></aside></div><div id="identityToast" class="v021Toast"></div></section>`);
    $('identityNav').onclick = showView;
    $('identityExport').onclick = () => { try { downloadIdentityReport(); } catch (error) { accessToast(error.message, true); } };
    document.addEventListener('click', guardClick, true);
    const observer = new MutationObserver(() => applyAccessToDom());
    observer.observe(document.body, { childList: true, subtree: true });
    wrapPublicApis(); extendCloud(); enhanceBackup(); ensureProfiles(); render(); applyAccessToDom();
    ROOT.addEventListener?.('commerce-radar-audit-updated', applyAccessToDom);
    ROOT.addEventListener?.('commerce-radar-governance-updated', applyAccessToDom);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) { render(); applyAccessToDom(); } });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 700) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarLocalIdentity = {
    KEYS, SESSION_KEY, PERMISSIONS, BUILTIN_PROFILES, DEFAULTS,
    settings, saveSettings, profiles, users, identityEvents, currentSession, currentUser, permissionsFor, hasPermission, requirePermission,
    createUser, updateUser, resetPin, saveProfile, authenticate, signOut, authorizeAction, identityMarkdown, appendIdentityEvent,
  };

  ensureProfiles();
  wrapPublicApis();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();