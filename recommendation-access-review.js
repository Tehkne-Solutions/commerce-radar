(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const IDENTITY = ROOT.CommerceRadarLocalIdentity;
  const GOVERNANCE = ROOT.CommerceRadarExperimentGovernance;
  const AUDIT = ROOT.CommerceRadarExperimentAudit;
  const CHAMPION = ROOT.CommerceRadarChampionChallenger;

  const KEYS = {
    reviews: 'tehkne-commerce-radar-v69-access-reviews',
    snapshots: 'tehkne-commerce-radar-v69-access-review-snapshots',
    settings: 'tehkne-commerce-radar-v69-access-policy-settings',
  };

  const DEFAULTS = {
    reviewIntervalDays: 90,
    inactivityDays: 60,
    defaultAccountValidityDays: 365,
    privilegedPermissionThreshold: 4,
    snapshotRetention: 365,
    requireReviewForPrivileged: true,
  };

  const PRIVILEGED_PERMISSIONS = [
    'identity.manage', 'profiles.manage', 'governance.manage', 'decision.approve',
    'decision.execute', 'matrix.manage', 'exception.approve', 'audit.capture', 'audit.export',
  ];

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const isoDate = (value) => { const time = Date.parse(value || ''); return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ''; };
  const addDays = (value, days) => { const date = new Date(`${isoDate(value || today())}T12:00:00`); date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); };
  const daysBetween = (from, to = today()) => { const a = Date.parse(`${isoDate(from)}T12:00:00`); const b = Date.parse(`${isoDate(to)}T12:00:00`); return Number.isFinite(a) && Number.isFinite(b) ? Math.floor((b - a) / 86400000) : null; };
  const personKey = (value) => safe(value, 120).normalize?.('NFD').replace?.(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ') || safe(value, 120).toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const sessionStore = () => globalThis.sessionStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };

  function settings() {
    return { ...DEFAULTS, ...(read(KEYS.settings, {}) || {}) };
  }

  function saveSettings(patch = {}) {
    const current = settings();
    const next = {
      ...current,
      ...patch,
      reviewIntervalDays: Math.max(7, Math.min(365, Number(patch.reviewIntervalDays ?? current.reviewIntervalDays) || current.reviewIntervalDays)),
      inactivityDays: Math.max(7, Math.min(730, Number(patch.inactivityDays ?? current.inactivityDays) || current.inactivityDays)),
      defaultAccountValidityDays: Math.max(30, Math.min(1825, Number(patch.defaultAccountValidityDays ?? current.defaultAccountValidityDays) || current.defaultAccountValidityDays)),
      privilegedPermissionThreshold: Math.max(1, Math.min(PRIVILEGED_PERMISSIONS.length, Number(patch.privilegedPermissionThreshold ?? current.privilegedPermissionThreshold) || current.privilegedPermissionThreshold)),
      snapshotRetention: Math.max(30, Math.min(730, Number(patch.snapshotRetention ?? current.snapshotRetention) || current.snapshotRetention)),
    };
    write(KEYS.settings, next);
    return next;
  }

  function reviews() { return read(KEYS.reviews, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function users() { return IDENTITY?.users?.() || read(IDENTITY?.KEYS?.users || 'tehkne-commerce-radar-v68-identity-users', []); }
  function profiles() { return IDENTITY?.profiles?.() || []; }
  function currentUser() { return IDENTITY?.currentUser?.() || null; }

  function identityUserKey() { return IDENTITY?.KEYS?.users || 'tehkne-commerce-radar-v68-identity-users'; }
  function saveUsers(rows) { write(identityUserKey(), rows); }

  function normalizeUsers(reference = today()) {
    const config = settings();
    const current = users();
    let changed = false;
    const rows = current.map((user) => {
      const next = { ...user };
      if (!Number.isFinite(Number(next.sessionVersion))) { next.sessionVersion = 1; changed = true; }
      if (!next.accessCreatedAt) { next.accessCreatedAt = next.createdAt || nowIso(); changed = true; }
      if (!next.accessExpiresAt && next.profileId !== 'administrator') { next.accessExpiresAt = addDays(next.createdAt || reference, config.defaultAccountValidityDays); changed = true; }
      if (!next.nextAccessReviewAt) { next.nextAccessReviewAt = addDays(next.createdAt || reference, config.reviewIntervalDays); changed = true; }
      return next;
    });
    if (changed) saveUsers(rows);
    return rows;
  }

  function profileFor(user) { return profiles().find((profile) => profile.id === user?.profileId) || null; }
  function privilegedPermissions(profile) {
    if (!profile) return [];
    if ((profile.permissions || []).includes('*')) return [...PRIVILEGED_PERMISSIONS];
    return PRIVILEGED_PERMISSIONS.filter((permission) => (profile.permissions || []).includes(permission));
  }

  function latestReview(userId) {
    return reviews().filter((review) => review.userId === userId).sort((a, b) => String(b.reviewedAt).localeCompare(String(a.reviewedAt)))[0] || null;
  }

  function accountState(user, reference = today(), config = settings()) {
    const profile = profileFor(user);
    const lastActivity = isoDate(user.lastLoginAt || user.createdAt);
    const inactiveForDays = daysBetween(lastActivity, reference);
    const review = latestReview(user.id);
    const reviewDueAt = isoDate(user.nextAccessReviewAt || addDays(review?.reviewedAt || user.createdAt || reference, config.reviewIntervalDays));
    const accessExpiresAt = isoDate(user.accessExpiresAt);
    const expired = Boolean(accessExpiresAt && accessExpiresAt < reference);
    const inactive = user.active !== false && inactiveForDays !== null && inactiveForDays >= config.inactivityDays;
    const reviewOverdue = Boolean(reviewDueAt && reviewDueAt < reference);
    const reviewDueSoon = Boolean(reviewDueAt && reviewDueAt >= reference && reviewDueAt <= addDays(reference, 14));
    const privileged = privilegedPermissions(profile);
    const overPrivileged = privileged.length >= config.privilegedPermissionThreshold || (profile?.permissions || []).includes('*');
    const risk = expired ? 'critical' : reviewOverdue || (inactive && overPrivileged) ? 'high' : inactive || overPrivileged || reviewDueSoon ? 'medium' : 'low';
    const findings = [];
    if (expired) findings.push('Conta expirada');
    if (inactive) findings.push(`Sem acesso há ${inactiveForDays} dia(s)`);
    if (reviewOverdue) findings.push('Revisão de acesso vencida');
    else if (reviewDueSoon) findings.push('Revisão próxima');
    if (overPrivileged) findings.push(`${privileged.length} permissão(ões) privilegiada(s)`);
    if (user.active === false) findings.push('Conta inativa');
    return { user, profile, accessExpiresAt, reviewDueAt, lastActivity, inactiveForDays, expired, inactive, reviewOverdue, reviewDueSoon, privileged, overPrivileged, risk, findings, latestReview: review };
  }

  function accessRows(reference = today()) {
    return normalizeUsers(reference).map((user) => accountState(user, reference)).sort((a, b) => {
      const weight = { critical: 4, high: 3, medium: 2, low: 1 };
      return weight[b.risk] - weight[a.risk] || a.user.name.localeCompare(b.user.name, 'pt-BR');
    });
  }

  function requireManager(actor = currentUser()) {
    if (!actor) throw new Error('Entre com um usuário autorizado para revisar acessos.');
    if (!IDENTITY?.hasPermission?.('identity.manage', actor)) throw new Error('O perfil atual não pode gerenciar políticas de acesso.');
    return actor;
  }

  function updatePolicyUser(userId, patch = {}, actor = currentUser(), eventType = 'access_policy_updated') {
    const manager = requireManager(actor);
    const current = normalizeUsers();
    const row = current.find((user) => user.id === userId);
    if (!row) throw new Error('Usuário não encontrado.');
    const next = { ...row, ...patch, updatedAt: nowIso() };
    saveUsers([next, ...current.filter((user) => user.id !== userId)]);
    IDENTITY?.appendIdentityEvent?.(eventType, manager, { targetUserId: userId, targetName: row.name, patch: Object.keys(patch) });
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-access-review-updated', { detail: { userId, type: eventType } }));
    return next;
  }

  function setUserExpiry(userId, expiresAt, actor = currentUser()) {
    const date = isoDate(expiresAt);
    if (!date) throw new Error('Informe uma data de expiração válida.');
    return updatePolicyUser(userId, { accessExpiresAt: date }, actor, 'account_expiry_updated');
  }

  function revokeSessions(userId, actor = currentUser(), reason = 'Revisão administrativa') {
    const row = normalizeUsers().find((user) => user.id === userId);
    if (!row) throw new Error('Usuário não encontrado.');
    const next = updatePolicyUser(userId, { sessionVersion: Number(row.sessionVersion || 1) + 1, sessionsRevokedAt: nowIso() }, actor, 'sessions_revoked');
    IDENTITY?.appendIdentityEvent?.('sessions_revoked', actor, { targetUserId: userId, reason: safe(reason, 500), sessionVersion: next.sessionVersion });
    ensureCurrentSessionValid();
    return next;
  }

  function reviewAccess(userId, decision, input = {}, actor = currentUser()) {
    const reviewer = requireManager(actor);
    const state = accessRows().find((row) => row.user.id === userId);
    if (!state) throw new Error('Usuário não encontrado.');
    const allowed = ['keep', 'reduce', 'deactivate', 'renew'];
    if (!allowed.includes(decision)) throw new Error('Decisão de revisão inválida.');
    if (safe(input.note, 2000).length < 10) throw new Error('Registre uma justificativa com pelo menos 10 caracteres.');
    let target = state.user;
    if (decision === 'deactivate') target = updatePolicyUser(userId, { active: false }, reviewer, 'access_deactivated_after_review');
    if (decision === 'reduce') {
      if (!input.profileId || !profiles().some((profile) => profile.id === input.profileId)) throw new Error('Selecione um perfil válido para reduzir o acesso.');
      target = updatePolicyUser(userId, { profileId: input.profileId }, reviewer, 'access_reduced_after_review');
    }
    if (decision === 'renew') {
      const expiresAt = isoDate(input.expiresAt || addDays(today(), settings().defaultAccountValidityDays));
      target = updatePolicyUser(userId, { active: true, accessExpiresAt: expiresAt }, reviewer, 'access_renewed_after_review');
    }
    const reviewedAt = nowIso();
    const nextReviewAt = isoDate(input.nextReviewAt || addDays(reviewedAt, settings().reviewIntervalDays));
    target = updatePolicyUser(userId, { lastAccessReviewAt: reviewedAt, nextAccessReviewAt: nextReviewAt }, reviewer, 'access_review_schedule_updated');
    const record = {
      id: `access-review-${uid()}`,
      userId,
      userName: target.name,
      profileBefore: state.user.profileId,
      profileAfter: target.profileId,
      activeBefore: state.user.active !== false,
      activeAfter: target.active !== false,
      decision,
      findings: state.findings,
      note: safe(input.note, 2000),
      reviewedBy: reviewer.name,
      reviewedById: reviewer.id,
      reviewedAt,
      nextReviewAt,
      signature: 'Tehkné Solutions',
    };
    write(KEYS.reviews, [record, ...reviews()].slice(0, 1000));
    IDENTITY?.appendIdentityEvent?.('access_review_completed', reviewer, { targetUserId: userId, decision, reviewId: record.id, nextReviewAt });
    if (decision === 'deactivate' || input.revokeSessions) revokeSessions(userId, reviewer, `Revisão de acesso: ${decision}`);
    return record;
  }

  function currentRawSession() {
    try { return JSON.parse(sessionStore().getItem(IDENTITY?.SESSION_KEY || 'tehkne-commerce-radar-v68-local-session') || 'null'); } catch { return null; }
  }

  function stampCurrentSessionVersion() {
    const session = currentRawSession();
    if (!session?.userId) return null;
    const user = normalizeUsers().find((item) => item.id === session.userId);
    if (!user) return null;
    const next = { ...session, accessVersion: Number(user.sessionVersion || 1) };
    sessionStore().setItem(IDENTITY.SESSION_KEY, JSON.stringify(next));
    return next;
  }

  function sessionPolicyGate(reference = today()) {
    const session = currentRawSession();
    if (!session?.userId) return { ok: false, reason: 'Sessão local não iniciada.' };
    const user = normalizeUsers(reference).find((item) => item.id === session.userId);
    if (!user || user.active === false) return { ok: false, reason: 'Usuário inativo ou inexistente.' };
    const state = accountState(user, reference);
    if (state.expired) return { ok: false, reason: `A conta de ${user.name} expirou em ${state.accessExpiresAt}.` };
    const sessionVersion = Number(session.accessVersion || 1);
    if (sessionVersion !== Number(user.sessionVersion || 1)) return { ok: false, reason: 'As sessões deste usuário foram revogadas.' };
    return { ok: true, user, state, session };
  }

  function ensureCurrentSessionValid() {
    const session = currentRawSession();
    if (!session) return null;
    const gate = sessionPolicyGate();
    if (!gate.ok) {
      IDENTITY?.signOut?.(gate.reason.includes('revogadas') ? 'sessions_revoked' : 'access_policy_block');
      return null;
    }
    return gate;
  }

  function policyAuthorize(permission, experimentId = '', role = '') {
    const policy = sessionPolicyGate();
    if (!policy.ok) return policy;
    return IDENTITY?.authorizeAction?.(permission, experimentId, role) || { ok: true, user: policy.user };
  }

  function wrapIdentityApi() {
    if (!IDENTITY || IDENTITY.__accessPolicyWrapped) return;
    const originalAuthenticate = IDENTITY.authenticate?.bind(IDENTITY);
    const originalAuthorize = IDENTITY.authorizeAction?.bind(IDENTITY);
    if (originalAuthenticate) IDENTITY.authenticate = async (identifier, pin) => {
      const lookup = personKey(identifier);
      const target = normalizeUsers().find((user) => personKey(user.name) === lookup || personKey(user.email) === lookup);
      if (target && accountState(target).expired) throw new Error(`Esta conta expirou em ${isoDate(target.accessExpiresAt)}.`);
      const result = await originalAuthenticate(identifier, pin);
      stampCurrentSessionVersion();
      ensureCurrentSessionValid();
      return result;
    };
    if (originalAuthorize) IDENTITY.authorizeAction = (permission, experimentId = '', role = '') => {
      const gate = sessionPolicyGate();
      return gate.ok ? originalAuthorize(permission, experimentId, role) : gate;
    };
    IDENTITY.__accessPolicyWrapped = true;
  }

  function wrapCriticalApis() {
    const wrappers = [
      [GOVERNANCE, 'configureRecord', 'governance.manage'],
      [GOVERNANCE, 'requestDecision', 'decision.request', 'operator'],
      [GOVERNANCE, 'approveDecision', 'decision.approve', 'approver'],
      [AUDIT, 'configureAssignment', 'matrix.manage'],
      [AUDIT, 'registerException', 'exception.approve', 'auditor'],
      [AUDIT, 'revokeException', 'exception.approve'],
      [AUDIT, 'executeDecision', 'decision.execute', 'executor'],
      [AUDIT, 'captureAuditSnapshot', 'audit.capture'],
      [AUDIT, 'auditMarkdown', 'audit.export'],
      [CHAMPION, 'promoteChallenger', 'decision.execute', 'executor'],
      [CHAMPION, 'keepChampion', 'decision.execute', 'executor'],
    ];
    for (const [api, method, permission, role] of wrappers) {
      if (!api?.[method] || api[`__accessPolicy_${method}`]) continue;
      const original = api[method].bind(api);
      api[method] = (...args) => {
        const experimentId = typeof args[0] === 'string' && args[0].startsWith('exp') ? args[0] : '';
        const gate = policyAuthorize(permission, experimentId, role || '');
        if (!gate.ok) {
          if (['promoteChallenger', 'keepChampion', 'executeDecision'].includes(method)) return gate;
          throw new Error(gate.reason);
        }
        return original(...args);
      };
      api[`__accessPolicy_${method}`] = true;
    }
  }

  function policySummary(reference = today()) {
    const rows = accessRows(reference);
    return {
      reference,
      users: rows.length,
      active: rows.filter((row) => row.user.active !== false).length,
      expired: rows.filter((row) => row.expired).length,
      inactive: rows.filter((row) => row.inactive).length,
      overdue: rows.filter((row) => row.reviewOverdue).length,
      privileged: rows.filter((row) => row.overPrivileged).length,
      critical: rows.filter((row) => row.risk === 'critical').length,
      high: rows.filter((row) => row.risk === 'high').length,
      rows,
    };
  }

  function captureSnapshot(reference = today(), force = false) {
    requireManager();
    const id = `access-review-snapshot-${reference}`;
    const current = snapshots();
    if (!force && current.some((item) => item.id === id)) return current.find((item) => item.id === id);
    const summary = policySummary(reference);
    const row = { id, date: reference, ...summary, createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...current.filter((item) => item.id !== id)].slice(0, settings().snapshotRetention));
    IDENTITY?.appendIdentityEvent?.('access_review_snapshot_captured', currentUser(), { snapshotId: id, expired: row.expired, overdue: row.overdue });
    return row;
  }

  function accessReviewMarkdown(reference = today()) {
    const report = policySummary(reference);
    return [
      '# Commerce Radar — Revisão de acessos e políticas', '',
      `Data de referência: ${reference}`, '',
      `- Usuários: ${report.users}`,
      `- Contas expiradas: ${report.expired}`,
      `- Contas inativas: ${report.inactive}`,
      `- Revisões vencidas: ${report.overdue}`,
      `- Contas privilegiadas: ${report.privileged}`, '',
      '## Contas', '',
      ...report.rows.map((row) => `- ${row.user.name}: ${row.profile?.name || row.user.profileId}; risco ${row.risk}; expiração ${row.accessExpiresAt || 'sem prazo'}; revisão ${row.reviewDueAt || 'não definida'}; ${row.findings.join('; ') || 'sem alerta'}.`), '',
      '## Revisões recentes', '',
      ...reviews().slice(0, 50).map((review) => `- ${review.reviewedAt}: ${review.userName}; ${review.decision}; por ${review.reviewedBy}; próxima revisão ${review.nextReviewAt}.`), '',
      '## Limitações', '',
      '- A revogação entre dispositivos depende da próxima sincronização do workspace.',
      '- A identidade continua local e não substitui IAM, SSO, MFA ou diretório corporativo.',
      '- O sistema identifica privilégios por permissões, mas a decisão de reduzir acesso é humana.', '',
      'Tehkné Solutions',
    ].join('\n');
  }

  function toast(message, error = false) {
    let node = $('accessReviewToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'accessReviewToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 4200);
  }

  function downloadReport() {
    if (!policyAuthorize('audit.export').ok) throw new Error('A sessão atual não pode exportar a revisão de acessos.');
    const url = URL.createObjectURL(new Blob([accessReviewMarkdown()], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-revisao-acessos-${today()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'accessReview'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'accessReviewNav'));
    if ($('title')) $('title').textContent = 'Revise acessos, validade e privilégios';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function render() {
    const summary = policySummary();
    const summaryNode = $('accessReviewSummary');
    if (summaryNode) summaryNode.innerHTML = [
      ['Expiradas', summary.expired, 'bloqueadas'],
      ['Inativas', summary.inactive, `${settings().inactivityDays}+ dias`],
      ['Revisões vencidas', summary.overdue, 'ação necessária'],
      ['Privilegiadas', summary.privileged, 'revisar escopo'],
    ].map(([label, value, note]) => `<article class="card accessReviewMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const badge = $('accessReviewNavCount');
    if (badge) badge.textContent = summary.expired + summary.overdue ? String(summary.expired + summary.overdue) : '';

    const settingsNode = $('accessReviewSettings');
    if (settingsNode) settingsNode.innerHTML = `<label class="field"><span>Revisão a cada dias</span><input id="accessReviewInterval" type="number" min="7" max="365" value="${settings().reviewIntervalDays}"></label><label class="field"><span>Inatividade após dias</span><input id="accessInactivityDays" type="number" min="7" max="730" value="${settings().inactivityDays}"></label><label class="field"><span>Validade padrão</span><input id="accessValidityDays" type="number" min="30" max="1825" value="${settings().defaultAccountValidityDays}"></label><label class="field"><span>Limite de privilégios</span><input id="accessPrivilegeThreshold" type="number" min="1" max="9" value="${settings().privilegedPermissionThreshold}"></label><button class="btn" id="accessReviewSaveSettings">Salvar políticas</button>`;
    $('accessReviewSaveSettings')?.addEventListener('click', () => {
      try {
        requireManager();
        saveSettings({ reviewIntervalDays: $('accessReviewInterval').value, inactivityDays: $('accessInactivityDays').value, defaultAccountValidityDays: $('accessValidityDays').value, privilegedPermissionThreshold: $('accessPrivilegeThreshold').value });
        normalizeUsers(); render(); toast('Políticas de acesso atualizadas.');
      } catch (error) { toast(error.message, true); }
    });

    const node = $('accessReviewUsers');
    if (node) node.innerHTML = summary.rows.map((row) => `<article class="card accessReviewCard risk-${row.risk}" data-access-user="${esc(row.user.id)}"><div class="accessReviewHead"><div><span>${esc(row.profile?.name || row.user.profileId)}</span><h3>${esc(row.user.name)}</h3><p>${esc(row.findings.join(' · ') || 'Sem alerta operacional')}</p></div><b>${esc(row.risk)}</b></div><div class="accessReviewFacts"><span><small>Último acesso</small><b>${esc(row.lastActivity || 'não registrado')}</b></span><span><small>Expiração</small><b>${esc(row.accessExpiresAt || 'sem prazo')}</b></span><span><small>Próxima revisão</small><b>${esc(row.reviewDueAt || 'não definida')}</b></span><span><small>Privilégios</small><b>${row.privileged.length}</b></span></div><div class="actions"><button class="btn" data-access-review>Revisar</button><button class="btn" data-access-expiry>Alterar validade</button><button class="btn" data-access-revoke>Revogar sessões</button></div></article>`).join('') || '<div class="card empty"><h3>Nenhum usuário</h3><p class="muted">Cadastre identidades antes de revisar acessos.</p></div>';
    node?.querySelectorAll('[data-access-user]').forEach((card) => {
      const userId = card.dataset.accessUser;
      card.querySelector('[data-access-expiry]')?.addEventListener('click', () => {
        const date = prompt('Nova data de expiração (AAAA-MM-DD):', accessRows().find((row) => row.user.id === userId)?.accessExpiresAt || '') ?? '';
        try { setUserExpiry(userId, date); render(); toast('Validade atualizada.'); } catch (error) { toast(error.message, true); }
      });
      card.querySelector('[data-access-revoke]')?.addEventListener('click', () => {
        const reason = prompt('Motivo da revogação:', 'Revisão administrativa de acesso') ?? '';
        try { revokeSessions(userId, currentUser(), reason); render(); toast('Sessões revogadas.'); } catch (error) { toast(error.message, true); }
      });
      card.querySelector('[data-access-review]')?.addEventListener('click', () => {
        const decision = prompt('Decisão: keep, reduce, deactivate ou renew', 'keep') ?? '';
        const note = prompt('Justificativa da revisão:', '') ?? '';
        const profileId = decision === 'reduce' ? (prompt('Novo perfil:', 'viewer') ?? '') : '';
        try { reviewAccess(userId, decision, { note, profileId, revokeSessions: decision === 'deactivate' }); render(); toast('Revisão registrada.'); } catch (error) { toast(error.message, true); }
      });
    });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.accessPolicySettings = KEYS.settings;
      keys.accessReviews = KEYS.reviews;
      keys.accessReviewSnapshots = KEYS.snapshots;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { settings: {}, reviews: [], snapshots: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 760) clearInterval(timer); return; }
      clearInterval(timer);
      backup.addEventListener('click', () => setTimeout(() => {}, 0));
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = { settings: payload.accessPolicySettings || {}, reviews: Array.isArray(payload.accessReviews) ? payload.accessReviews : [], snapshots: Array.isArray(payload.accessReviewSnapshots) ? payload.accessReviewSnapshots : [] };
        } catch { pending = { settings: {}, reviews: [], snapshots: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        saveSettings(pending.settings);
        write(KEYS.reviews, [...new Map([...reviews(), ...pending.reviews].map((item) => [item.id, item])).values()].slice(0, 1000));
        write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, settings().snapshotRetention));
        normalizeUsers(); ensureCurrentSessionValid(); render();
      });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.reviews, pending.reviews); write(KEYS.snapshots, pending.snapshots); normalizeUsers(); ensureCurrentSessionValid(); render(); });
    }, 50);
  }

  function guardLoginClick(event) {
    const button = event.target?.closest?.('#identityLoginButton');
    if (!button) return;
    const identifier = $('identityLoginIdentifier')?.value || '';
    const lookup = personKey(identifier);
    const target = normalizeUsers().find((user) => personKey(user.name) === lookup || personKey(user.email) === lookup);
    if (target && accountState(target).expired) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(`A conta de ${target.name} expirou em ${isoDate(target.accessExpiresAt)}.`, true);
    }
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const identityNav = $('identityNav'); const identityView = $('identityAccess');
    if (!identityNav || !identityView || $('accessReviewNav')) return false;
    identityNav.insertAdjacentHTML('afterend', '<button class="nav" id="accessReviewNav"><span>Revisão de acessos</span><b id="accessReviewNavCount"></b></button>');
    identityView.insertAdjacentHTML('afterend', `<section class="view" id="accessReview"><div class="sectionHead"><div><span class="eyebrow">POLÍTICAS DE ACESSO</span><h2>Validade, privilégios e revisão periódica</h2><p class="muted">Identifique contas expiradas, inativas ou excessivamente privilegiadas e registre decisões humanas de acesso.</p></div><div class="actions"><button class="btn" id="accessReviewSnapshot">Capturar snapshot</button><button class="btn primary" id="accessReviewExport">Exportar relatório</button></div></div><div class="accessReviewSummary" id="accessReviewSummary"></div><article class="card accessReviewSettings" id="accessReviewSettings"></article><div class="accessReviewLayout"><main><div class="accessReviewUsers" id="accessReviewUsers"></div></main><aside><article class="card"><span class="eyebrow">CRITÉRIOS</span><h3>Alertas avaliados</h3><ul class="accessReviewRules"><li>Conta com validade expirada.</li><li>Usuário sem login no período configurado.</li><li>Revisão periódica vencida.</li><li>Perfil com permissões privilegiadas acima do limite.</li></ul></article><article class="card"><span class="eyebrow">SESSÕES</span><p class="muted">A revogação incrementa a versão do usuário. Sessões antigas são encerradas após a próxima validação ou sincronização.</p></article></aside></div><div id="accessReviewToast" class="v021Toast"></div></section>`);
    $('accessReviewNav').onclick = showView;
    $('accessReviewSnapshot').onclick = () => { try { captureSnapshot(today(), true); toast('Snapshot de acessos capturado.'); } catch (error) { toast(error.message, true); } };
    $('accessReviewExport').onclick = () => { try { downloadReport(); } catch (error) { toast(error.message, true); } };
    document.addEventListener('click', guardLoginClick, true);
    normalizeUsers(); wrapIdentityApi(); wrapCriticalApis(); extendCloud(); enhanceBackup(); stampCurrentSessionVersion(); ensureCurrentSessionValid(); render();
    ROOT.addEventListener?.('commerce-radar-identity-updated', (event) => { if (event.detail?.type === 'session_started') stampCurrentSessionVersion(); normalizeUsers(); ensureCurrentSessionValid(); render(); });
    ROOT.addEventListener?.('storage', (event) => { if ([identityUserKey(), ...Object.values(KEYS)].includes(event.key)) { normalizeUsers(); ensureCurrentSessionValid(); render(); } });
    setInterval(ensureCurrentSessionValid, 30000);
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 780) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarAccessReview = {
    KEYS, DEFAULTS, PRIVILEGED_PERMISSIONS, settings, saveSettings, reviews, snapshots, normalizeUsers,
    privilegedPermissions, latestReview, accountState, accessRows, setUserExpiry, revokeSessions, reviewAccess,
    sessionPolicyGate, ensureCurrentSessionValid, policyAuthorize, policySummary, captureSnapshot, accessReviewMarkdown,
  };

  normalizeUsers();
  wrapIdentityApi();
  wrapCriticalApis();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();