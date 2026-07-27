(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CHAMPION = ROOT.CommerceRadarChampionChallenger;
  const GOVERNANCE = ROOT.CommerceRadarExperimentGovernance;

  const KEYS = {
    assignments: 'tehkne-commerce-radar-v67-role-assignments',
    exceptions: 'tehkne-commerce-radar-v67-control-exceptions',
    events: 'tehkne-commerce-radar-v67-audit-events',
    snapshots: 'tehkne-commerce-radar-v67-audit-snapshots',
    settings: 'tehkne-commerce-radar-v67-audit-settings',
  };

  const DEFAULTS = {
    blockOperatorApproval: true,
    blockExecutorOperation: true,
    blockExecutorApproval: true,
    requireIndependentAuditor: true,
    requireExecutor: true,
    requireAuditor: true,
  };

  const CONFLICT_LABELS = {
    missing_executor: 'Executor não definido.',
    missing_auditor: 'Auditor não definido.',
    operator_first_approver: 'Operador também é o primeiro aprovador.',
    operator_second_approver: 'Operador também é o segundo aprovador.',
    duplicate_approvers: 'Os dois aprovadores são a mesma pessoa.',
    executor_operator: 'Executor também é o operador.',
    executor_first_approver: 'Executor também é o primeiro aprovador.',
    executor_second_approver: 'Executor também é o segundo aprovador.',
    auditor_operator: 'Auditor também é o operador.',
    auditor_first_approver: 'Auditor também é o primeiro aprovador.',
    auditor_second_approver: 'Auditor também é o segundo aprovador.',
    auditor_executor: 'Auditor também é o executor.',
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const personKey = (value) => safe(value, 120).toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const list = (value) => Array.isArray(value) ? value.map((item) => safe(item, 120)).filter(Boolean) : safe(value).split(',').map((item) => safe(item, 120)).filter(Boolean);
  const iso = (value) => { const time = Date.parse(value || ''); return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ''; };

  function settings() { return { ...DEFAULTS, ...(read(KEYS.settings, {}) || {}) }; }
  function saveSettings(patch = {}) { const next = { ...settings(), ...patch }; write(KEYS.settings, next); return next; }
  function assignments() { return read(KEYS.assignments, []); }
  function exceptions() { return read(KEYS.exceptions, []); }
  function events() { return read(KEYS.events, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function experiments() { return CHAMPION?.KEYS?.experiments ? read(CHAMPION.KEYS.experiments, []) : []; }
  function governanceRecord(experimentId) { return GOVERNANCE?.recordFor?.(experimentId) || {}; }

  function defaultAssignment(experimentId) {
    return {
      id: `role-assignment-${experimentId}`,
      experimentId,
      executor: '',
      auditor: '',
      consulted: [],
      informed: [],
      updatedAt: '',
      signature: 'Tehkné Solutions',
    };
  }

  function assignmentFor(experimentId) {
    const row = assignments().find((item) => item.experimentId === experimentId);
    return { ...defaultAssignment(experimentId), ...(row || {}), consulted: list(row?.consulted || []), informed: list(row?.informed || []) };
  }

  function appendEvent(type, experimentId, actor = '', detail = {}) {
    const row = { id: `audit-event-${uid()}`, type, experimentId, actor: safe(actor, 120), detail, at: new Date().toISOString(), signature: 'Tehkné Solutions' };
    write(KEYS.events, [row, ...events()].slice(0, 1000));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-audit-updated', { detail: row }));
    return row;
  }

  function configureAssignment(experimentId, patch = {}, actor = '') {
    if (!experiments().some((item) => item.id === experimentId)) throw new Error('Experimento não encontrado.');
    const current = assignmentFor(experimentId);
    const next = {
      ...current,
      executor: safe(patch.executor ?? current.executor, 120),
      auditor: safe(patch.auditor ?? current.auditor, 120),
      consulted: list(patch.consulted ?? current.consulted),
      informed: list(patch.informed ?? current.informed),
      updatedAt: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.assignments, [next, ...assignments().filter((item) => item.experimentId !== experimentId)].slice(0, 200));
    appendEvent('role_assignment_updated', experimentId, actor || next.executor || next.auditor, { assignment: next });
    return next;
  }

  function roleMatrix(experimentId) {
    const record = governanceRecord(experimentId);
    const assignment = assignmentFor(experimentId);
    return {
      operator: safe(record.owner, 120),
      firstApprover: safe(record.firstApprover, 120),
      secondApprover: safe(record.secondApprover, 120),
      executor: safe(assignment.executor, 120),
      auditor: safe(assignment.auditor, 120),
      consulted: assignment.consulted,
      informed: assignment.informed,
    };
  }

  function detectConflicts(matrix, config = settings()) {
    const roles = Object.fromEntries(Object.entries(matrix).filter(([key]) => !['consulted', 'informed'].includes(key)).map(([key, value]) => [key, personKey(value)]));
    const rows = [];
    const add = (code) => rows.push({ code, label: CONFLICT_LABELS[code] });
    if (config.requireExecutor && !roles.executor) add('missing_executor');
    if (config.requireAuditor && !roles.auditor) add('missing_auditor');
    if (config.blockOperatorApproval && roles.operator && roles.operator === roles.firstApprover) add('operator_first_approver');
    if (config.blockOperatorApproval && roles.operator && roles.operator === roles.secondApprover) add('operator_second_approver');
    if (roles.firstApprover && roles.firstApprover === roles.secondApprover) add('duplicate_approvers');
    if (config.blockExecutorOperation && roles.executor && roles.executor === roles.operator) add('executor_operator');
    if (config.blockExecutorApproval && roles.executor && roles.executor === roles.firstApprover) add('executor_first_approver');
    if (config.blockExecutorApproval && roles.executor && roles.executor === roles.secondApprover) add('executor_second_approver');
    if (config.requireIndependentAuditor && roles.auditor && roles.auditor === roles.operator) add('auditor_operator');
    if (config.requireIndependentAuditor && roles.auditor && roles.auditor === roles.firstApprover) add('auditor_first_approver');
    if (config.requireIndependentAuditor && roles.auditor && roles.auditor === roles.secondApprover) add('auditor_second_approver');
    if (config.requireIndependentAuditor && roles.auditor && roles.auditor === roles.executor) add('auditor_executor');
    return rows;
  }

  function activeExceptions(experimentId, reference = today()) {
    return exceptions().filter((item) => item.experimentId === experimentId && item.status === 'approved' && (!item.expiresAt || item.expiresAt >= reference));
  }

  function registerException(experimentId, codes, justification, approvedBy, expiresAt = '', actor = '') {
    const matrix = roleMatrix(experimentId);
    const auditor = personKey(matrix.auditor);
    if (!auditor) throw new Error('Defina um auditor antes de registrar uma exceção.');
    if (personKey(approvedBy) !== auditor) throw new Error('A exceção precisa ser aprovada pelo auditor designado.');
    const conflicts = new Set(detectConflicts(matrix).map((item) => item.code));
    const selected = [...new Set(list(codes).filter((code) => conflicts.has(code)))];
    if (!selected.length) throw new Error('Selecione ao menos um conflito ativo.');
    if (safe(justification).length < 20) throw new Error('Informe uma justificativa com pelo menos 20 caracteres.');
    if (selected.some((code) => code.startsWith('auditor_'))) throw new Error('O auditor não pode aprovar uma exceção para conflito envolvendo o próprio papel.');
    const row = {
      id: `control-exception-${uid()}`,
      experimentId,
      codes: selected,
      justification: safe(justification, 1500),
      approvedBy: safe(approvedBy, 120),
      expiresAt: iso(expiresAt),
      status: 'approved',
      createdAt: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.exceptions, [row, ...exceptions()].slice(0, 400));
    appendEvent('control_exception_approved', experimentId, actor || approvedBy, { exceptionId: row.id, codes: selected, expiresAt: row.expiresAt });
    return row;
  }

  function revokeException(exceptionId, actor = '') {
    const current = exceptions();
    const row = current.find((item) => item.id === exceptionId);
    if (!row) return null;
    const next = { ...row, status: 'revoked', revokedAt: new Date().toISOString(), revokedBy: safe(actor, 120) };
    write(KEYS.exceptions, [next, ...current.filter((item) => item.id !== exceptionId)].slice(0, 400));
    appendEvent('control_exception_revoked', row.experimentId, actor, { exceptionId });
    return next;
  }

  function evaluateSegregation(experimentId, reference = today()) {
    const experiment = experiments().find((item) => item.id === experimentId);
    if (!experiment) return null;
    const matrix = roleMatrix(experimentId);
    const conflicts = detectConflicts(matrix);
    const active = activeExceptions(experimentId, reference);
    const waivedCodes = new Set(active.flatMap((item) => item.codes || []));
    const waived = conflicts.filter((item) => waivedCodes.has(item.code));
    const blocking = conflicts.filter((item) => !waivedCodes.has(item.code));
    const governance = GOVERNANCE?.evaluateGovernance?.(experimentId, reference) || null;
    const formal = GOVERNANCE?.formalDecisions?.().filter((item) => item.experimentId === experimentId) || [];
    return { experiment, matrix, conflicts, waived, blocking, activeExceptions: active, governance, formalDecisions: formal, compliant: blocking.length === 0 };
  }

  function canExecute(experimentId, actor, decision = governanceRecord(experimentId).requestedDecision, reference = today()) {
    const segregation = evaluateSegregation(experimentId, reference);
    if (!segregation) return { ok: false, reason: 'Experimento não encontrado.' };
    if (segregation.blocking.length) return { ok: false, reason: `Conflitos de função: ${segregation.blocking.map((item) => item.label).join(' ')}`, segregation };
    if (!segregation.matrix.executor) return { ok: false, reason: 'Executor não definido.', segregation };
    if (personKey(actor) !== personKey(segregation.matrix.executor)) return { ok: false, reason: `A execução pertence a ${segregation.matrix.executor}.`, segregation };
    const governanceGate = GOVERNANCE?.canExecuteDecision?.(experimentId, decision);
    if (governanceGate && !governanceGate.ok) return { ...governanceGate, segregation };
    return { ok: true, segregation, governance: governanceGate };
  }

  let executionAuthorization = null;

  function executeDecision(experimentId, actor, note = '') {
    const record = governanceRecord(experimentId);
    const decision = record.requestedDecision;
    const gate = canExecute(experimentId, actor, decision);
    if (!gate.ok) return gate;
    executionAuthorization = { experimentId, actor: safe(actor, 120), decision };
    try {
      const result = decision === 'promote'
        ? CHAMPION.promoteChallenger(experimentId, note || record.requestNote)
        : CHAMPION.keepChampion(experimentId, note || record.requestNote);
      if (result === true || result?.ok !== false) {
        appendEvent('formal_decision_executed', experimentId, actor, { decision, note: safe(note, 1000), matrix: gate.segregation.matrix });
        captureAuditSnapshot(today(), true);
        return result === true ? { ok: true } : result;
      }
      return result;
    } finally {
      executionAuthorization = null;
    }
  }

  function wrapExecutionApi() {
    if (!CHAMPION || CHAMPION.__segregationWrapped) return;
    const originalPromote = CHAMPION.promoteChallenger.bind(CHAMPION);
    const originalKeep = CHAMPION.keepChampion.bind(CHAMPION);
    CHAMPION.promoteChallenger = (experimentId, note = '', override = false) => {
      if (!executionAuthorization || executionAuthorization.experimentId !== experimentId || executionAuthorization.decision !== 'promote') {
        return { ok: false, reason: 'Execute a promoção pela área Matriz e auditoria, usando o executor designado.' };
      }
      return originalPromote(experimentId, note, override);
    };
    CHAMPION.keepChampion = (experimentId, note = '') => {
      if (!executionAuthorization || executionAuthorization.experimentId !== experimentId || executionAuthorization.decision !== 'keep') {
        return { ok: false, reason: 'Execute a manutenção pela área Matriz e auditoria, usando o executor designado.' };
      }
      return originalKeep(experimentId, note);
    };
    CHAMPION.__segregationWrapped = true;
  }

  function auditRows(reference = today()) {
    return experiments().map((experiment) => {
      const state = evaluateSegregation(experiment.id, reference);
      const governance = state.governance;
      return {
        experimentId: experiment.id,
        experimentName: experiment.name,
        status: experiment.status,
        approvalStatus: governance?.record?.approvalStatus || 'não configurado',
        requestedDecision: governance?.record?.requestedDecision || '',
        compliant: state.compliant,
        blockingCount: state.blocking.length,
        waivedCount: state.waived.length,
        matrix: state.matrix,
        conflicts: state.conflicts,
        exceptions: state.activeExceptions,
        formalDecisions: state.formalDecisions.length,
      };
    });
  }

  function auditSummary(reference = today()) {
    const rows = auditRows(reference);
    return {
      reference,
      experiments: rows.length,
      compliant: rows.filter((item) => item.compliant).length,
      blocked: rows.filter((item) => !item.compliant).length,
      exceptions: rows.reduce((sum, item) => sum + item.waivedCount, 0),
      pendingApprovals: rows.filter((item) => ['awaiting_first', 'awaiting_second'].includes(item.approvalStatus)).length,
      readyToExecute: rows.filter((item) => item.approvalStatus === 'approved' && item.compliant).length,
      formalDecisions: rows.reduce((sum, item) => sum + item.formalDecisions, 0),
      rows,
    };
  }

  function captureAuditSnapshot(reference = today(), force = false) {
    const id = `audit-snapshot-${reference}`;
    const current = snapshots();
    if (!force && current.some((item) => item.id === id)) return current.find((item) => item.id === id);
    const summary = auditSummary(reference);
    const row = { id, date: reference, ...summary, createdAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...current.filter((item) => item.id !== id)].slice(0, 365));
    appendEvent('audit_snapshot_captured', '', '', { snapshotId: id, compliant: row.compliant, blocked: row.blocked });
    return row;
  }

  function auditMarkdown(reference = today()) {
    const report = auditSummary(reference);
    const lines = [
      '# Commerce Radar — Auditoria consolidada dos experimentos', '',
      `Data de referência: ${reference}`, '',
      `- Experimentos: ${report.experiments}`,
      `- Matrizes conformes: ${report.compliant}`,
      `- Matrizes bloqueadas: ${report.blocked}`,
      `- Conflitos cobertos por exceção: ${report.exceptions}`,
      `- Aprovações pendentes: ${report.pendingApprovals}`,
      `- Prontos para executar: ${report.readyToExecute}`,
      `- Decisões formais: ${report.formalDecisions}`, '',
      '## Matriz consolidada', '',
      ...report.rows.flatMap((row) => [
        `### ${row.experimentName}`,
        `- Situação: ${row.compliant ? 'Conforme' : 'Bloqueado'}`,
        `- Operador: ${row.matrix.operator || 'não definido'}`,
        `- 1º aprovador: ${row.matrix.firstApprover || 'não definido'}`,
        `- 2º aprovador: ${row.matrix.secondApprover || 'não definido'}`,
        `- Executor: ${row.matrix.executor || 'não definido'}`,
        `- Auditor: ${row.matrix.auditor || 'não definido'}`,
        `- Conflitos: ${row.conflicts.map((item) => item.label).join(' ') || 'nenhum'}`,
        `- Exceções ativas: ${row.exceptions.length}`,
        `- Estado da aprovação: ${row.approvalStatus}`,
        '',
      ]),
      '## Limitações', '',
      '- Os nomes informados não são autenticados nesta versão.',
      '- A matriz reduz conflitos declarados, mas não substitui controles corporativos de identidade e acesso.',
      '- Exceções precisam de justificativa e aprovação do auditor designado.', '',
      'Tehkné Solutions',
    ];
    return lines.join('\n');
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([auditMarkdown()], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-auditoria-experimentos-${today()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toast(message, error = false) {
    let node = $('auditToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'auditToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 4200);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'experimentAudit'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'auditNav'));
    if ($('title')) $('title').textContent = 'Segregue funções e consolide a auditoria';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function render() {
    const report = auditSummary();
    const summary = $('auditSummary');
    if (summary) summary.innerHTML = [
      ['Experimentos', report.experiments, 'monitorados'],
      ['Conformes', report.compliant, 'sem conflito bloqueante'],
      ['Bloqueados', report.blocked, 'requerem correção'],
      ['Exceções', report.exceptions, 'controles dispensados'],
    ].map(([label, value, note]) => `<article class="card auditMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const count = $('auditNavCount');
    if (count) count.textContent = report.blocked ? String(report.blocked) : '';

    const node = $('auditExperiments');
    if (node) node.innerHTML = report.rows.length ? report.rows.map((row) => {
      const conflictList = row.conflicts.length ? `<ul class="auditConflicts">${row.conflicts.map((item) => `<li class="${row.exceptions.some((ex) => ex.codes?.includes(item.code)) ? 'waived' : 'blocking'}">${esc(item.label)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum conflito identificado.</p>';
      return `<article class="card auditCard ${row.compliant ? 'compliant' : 'blocked'}" data-audit-card="${esc(row.experimentId)}"><div class="auditHead"><div><span>${esc(row.status)}</span><h3>${esc(row.experimentName)}</h3><p>${row.compliant ? 'Matriz conforme' : `${row.blockingCount} conflito(s) bloqueante(s)`}</p></div><b>${row.compliant ? 'Conforme' : 'Bloqueado'}</b></div><div class="auditMatrix"><label class="field"><span>Operador</span><input value="${esc(row.matrix.operator)}" disabled></label><label class="field"><span>1º aprovador</span><input value="${esc(row.matrix.firstApprover)}" disabled></label><label class="field"><span>2º aprovador</span><input value="${esc(row.matrix.secondApprover)}" disabled></label><label class="field"><span>Executor</span><input data-audit-executor value="${esc(row.matrix.executor)}" maxlength="120"></label><label class="field"><span>Auditor</span><input data-audit-auditor value="${esc(row.matrix.auditor)}" maxlength="120"></label><label class="field"><span>Consultados</span><input data-audit-consulted value="${esc(row.matrix.consulted.join(', '))}" maxlength="500"></label><label class="field"><span>Informados</span><input data-audit-informed value="${esc(row.matrix.informed.join(', '))}" maxlength="500"></label></div>${conflictList}<div class="actions"><button class="btn" data-audit-save>Salvar matriz</button>${row.blockingCount ? '<button class="btn" data-audit-exception>Registrar exceção</button>' : ''}${row.approvalStatus === 'approved' ? '<button class="btn primary" data-audit-execute>Executar decisão aprovada</button>' : ''}</div></article>`;
    }).join('') : '<div class="card empty"><h3>Nenhum experimento</h3><p class="muted">Crie e governe um experimento antes de montar a matriz.</p></div>';

    node?.querySelectorAll('[data-audit-card]').forEach((card) => {
      const experimentId = card.dataset.auditCard;
      card.querySelector('[data-audit-save]')?.addEventListener('click', () => {
        try {
          configureAssignment(experimentId, {
            executor: card.querySelector('[data-audit-executor]').value,
            auditor: card.querySelector('[data-audit-auditor]').value,
            consulted: card.querySelector('[data-audit-consulted]').value,
            informed: card.querySelector('[data-audit-informed]').value,
          });
          toast('Matriz de responsabilidades atualizada.'); render();
        } catch (error) { toast(error.message, true); }
      });
      card.querySelector('[data-audit-exception]')?.addEventListener('click', () => {
        try {
          const state = evaluateSegregation(experimentId);
          const codes = state.blocking.map((item) => item.code);
          const justification = prompt(`Justificativa para: ${state.blocking.map((item) => item.label).join(' ')}`, '') ?? '';
          const expiresAt = prompt('Data de expiração da exceção (AAAA-MM-DD, opcional):', '') ?? '';
          registerException(experimentId, codes, justification, state.matrix.auditor, expiresAt, state.matrix.auditor);
          toast('Exceção registrada e auditada.'); render();
        } catch (error) { toast(error.message, true); }
      });
      card.querySelector('[data-audit-execute]')?.addEventListener('click', () => {
        const state = evaluateSegregation(experimentId);
        const actor = prompt(`Confirme o executor designado (${state.matrix.executor || 'não definido'}):`, '') ?? '';
        const note = prompt('Observação final da execução:', '') ?? '';
        const result = executeDecision(experimentId, actor, note);
        toast(result?.ok ? 'Decisão executada com segregação registrada.' : result?.reason || 'Execução bloqueada.', !result?.ok);
        render();
      });
    });

    const history = $('auditHistory');
    if (history) history.innerHTML = events().slice(0, 20).map((row) => `<div class="auditHistoryRow"><span>${new Date(row.at).toLocaleString('pt-BR')}</span><b>${esc(row.type)}</b><small>${esc(row.actor || 'sistema')}</small></div>`).join('') || '<p class="muted">Nenhum evento de auditoria.</p>';
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.experimentRoleAssignments = KEYS.assignments;
      keys.experimentControlExceptions = KEYS.exceptions;
      keys.experimentAuditEvents = KEYS.events;
      keys.experimentAuditSnapshots = KEYS.snapshots;
      keys.experimentAuditSettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { assignments: [], exceptions: [], events: [], snapshots: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 460) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.6.7', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.experimentRoleAssignments = assignments(); payload.experimentControlExceptions = exceptions(); payload.experimentAuditEvents = events(); payload.experimentAuditSnapshots = snapshots(); payload.experimentAuditSettings = settings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            assignments: Array.isArray(payload.experimentRoleAssignments) ? payload.experimentRoleAssignments : [],
            exceptions: Array.isArray(payload.experimentControlExceptions) ? payload.experimentControlExceptions : [],
            events: Array.isArray(payload.experimentAuditEvents) ? payload.experimentAuditEvents : [],
            snapshots: Array.isArray(payload.experimentAuditSnapshots) ? payload.experimentAuditSnapshots : [],
            settings: payload.experimentAuditSettings || {},
          };
        } catch { pending = { assignments: [], exceptions: [], events: [], snapshots: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.assignments, [...new Map([...assignments(), ...pending.assignments].map((item) => [item.experimentId, item])).values()].slice(0, 200));
        write(KEYS.exceptions, [...new Map([...exceptions(), ...pending.exceptions].map((item) => [item.id, item])).values()].slice(0, 400));
        write(KEYS.events, [...new Map([...events(), ...pending.events].map((item) => [item.id, item])).values()].slice(0, 1000));
        write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 365));
        write(KEYS.settings, { ...settings(), ...pending.settings }); render();
      });
      replace.addEventListener('click', () => { write(KEYS.assignments, pending.assignments); write(KEYS.exceptions, pending.exceptions); write(KEYS.events, pending.events); write(KEYS.snapshots, pending.snapshots); write(KEYS.settings, pending.settings); render(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const governanceNav = $('governanceNav'); const governanceView = $('experimentGovernance');
    if (!governanceNav || !governanceView || $('auditNav')) return false;
    governanceNav.insertAdjacentHTML('afterend', '<button class="nav" id="auditNav"><span>Matriz e auditoria</span><b id="auditNavCount"></b></button>');
    governanceView.insertAdjacentHTML('afterend', `<section class="view" id="experimentAudit"><div class="sectionHead"><div><span class="eyebrow">SEGREGAÇÃO DE FUNÇÕES</span><h2>Matriz e auditoria dos experimentos</h2><p class="muted">Separe operação, aprovação, execução e auditoria. Conflitos bloqueiam a decisão até correção ou exceção formal.</p></div><div class="actions"><button class="btn" id="auditSnapshot">Capturar snapshot</button><button class="btn primary" id="auditExport">Exportar auditoria</button></div></div><div class="auditSummary" id="auditSummary"></div><div class="auditLayout"><main><div id="auditExperiments" class="auditExperiments"></div></main><aside><article class="card"><span class="eyebrow">RACI</span><h3>Papéis controlados</h3><ul class="auditRules"><li>Operador executa o experimento.</li><li>Aprovadores revisam e autorizam.</li><li>Executor aplica a decisão aprovada.</li><li>Auditor verifica a trilha e aprova exceções.</li><li>Consultados e informados não executam controles.</li></ul></article><article class="card"><span class="eyebrow">TRILHA</span><h3>Eventos recentes</h3><div id="auditHistory"></div></article><article class="card"><span class="eyebrow">LIMITAÇÃO</span><p class="muted">Os nomes declarados não são autenticados. A versão atual implementa controle processual local, não IAM corporativo.</p></article></aside></div><div id="auditToast" class="v021Toast"></div></section>`);
    $('auditNav').onclick = showView;
    $('auditSnapshot').onclick = () => { captureAuditSnapshot(today(), true); toast('Snapshot de auditoria capturado.'); render(); };
    $('auditExport').onclick = downloadReport;
    wrapExecutionApi(); extendCloud(); enhanceBackup(); captureAuditSnapshot(); render();
    ROOT.addEventListener?.('commerce-radar-governance-updated', render);
    ROOT.addEventListener?.('commerce-radar-champion-updated', render);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) render(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 620) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarExperimentAudit = {
    KEYS, DEFAULTS, settings, saveSettings, assignments, exceptions, events, snapshots, assignmentFor, configureAssignment, roleMatrix, detectConflicts, registerException, revokeException, evaluateSegregation, canExecute, executeDecision, auditRows, auditSummary, captureAuditSnapshot, auditMarkdown,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  } else {
    wrapExecutionApi();
  }
})();