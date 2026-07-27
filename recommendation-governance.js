(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CHAMPION = ROOT.CommerceRadarChampionChallenger;

  const KEYS = {
    records: 'tehkne-commerce-radar-v66-governance-records',
    decisions: 'tehkne-commerce-radar-v66-formal-decisions',
    settings: 'tehkne-commerce-radar-v66-governance-settings',
  };

  const DEFAULTS = {
    minimumDurationDays: 14,
    maximumDurationDays: 60,
    inactivityDays: 14,
    requireDistinctApprovers: true,
    stopOnStaleBaseline: true,
    stopOnChampionSuperior: true,
  };

  const APPROVAL_LABELS = {
    configured: 'Configurado',
    awaiting_first: 'Aguardando 1ª aprovação',
    awaiting_second: 'Aguardando 2ª aprovação',
    approved: 'Aprovado para execução',
    rejected: 'Solicitação rejeitada',
    executed: 'Decisão executada',
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const iso = (value) => { const time = Date.parse(value || ''); return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ''; };
  const daysBetween = (start, end) => {
    const a = Date.parse(`${iso(start)}T12:00:00`);
    const b = Date.parse(`${iso(end)}T12:00:00`);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((b - a) / 86400000)) : 0;
  };

  function settings() {
    const stored = read(KEYS.settings, {});
    return { ...DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
  }

  function saveSettings(patch = {}) {
    const current = settings();
    const next = {
      ...current,
      ...patch,
      minimumDurationDays: Math.max(1, num(patch.minimumDurationDays, current.minimumDurationDays)),
      maximumDurationDays: Math.max(2, num(patch.maximumDurationDays, current.maximumDurationDays)),
      inactivityDays: Math.max(1, num(patch.inactivityDays, current.inactivityDays)),
    };
    if (next.maximumDurationDays < next.minimumDurationDays) next.maximumDurationDays = next.minimumDurationDays;
    write(KEYS.settings, next);
    return next;
  }

  function experiments() {
    return CHAMPION?.KEYS?.experiments ? read(CHAMPION.KEYS.experiments, []) : [];
  }

  function shadowSnapshots() {
    return CHAMPION?.KEYS?.snapshots ? read(CHAMPION.KEYS.snapshots, []) : [];
  }

  function records() { return read(KEYS.records, []); }
  function formalDecisions() { return read(KEYS.decisions, []); }

  function defaultRecord(experimentId) {
    const defaults = settings();
    return {
      id: `governance-${experimentId}`,
      experimentId,
      owner: '',
      firstApprover: '',
      secondApprover: '',
      minimumDurationDays: defaults.minimumDurationDays,
      maximumDurationDays: defaults.maximumDurationDays,
      inactivityDays: defaults.inactivityDays,
      stopOnStaleBaseline: defaults.stopOnStaleBaseline,
      stopOnChampionSuperior: defaults.stopOnChampionSuperior,
      approvalStatus: 'configured',
      requestedDecision: '',
      requestNote: '',
      requestedAt: '',
      approvals: [],
      executedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
  }

  function recordFor(experimentId) {
    const row = records().find((item) => item.experimentId === experimentId);
    return { ...defaultRecord(experimentId), ...(row || {}), approvals: Array.isArray(row?.approvals) ? row.approvals : [] };
  }

  function saveRecord(row) {
    const normalized = { ...row, updatedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
    write(KEYS.records, [normalized, ...records().filter((item) => item.experimentId !== normalized.experimentId)].slice(0, 150));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-governance-updated', { detail: normalized }));
    return normalized;
  }

  function configureRecord(experimentId, patch = {}) {
    if (!experiments().some((item) => item.id === experimentId)) throw new Error('Experimento não encontrado.');
    const current = recordFor(experimentId);
    const next = {
      ...current,
      owner: safe(patch.owner ?? current.owner, 120),
      firstApprover: safe(patch.firstApprover ?? current.firstApprover, 120),
      secondApprover: safe(patch.secondApprover ?? current.secondApprover, 120),
      minimumDurationDays: Math.max(1, num(patch.minimumDurationDays, current.minimumDurationDays)),
      maximumDurationDays: Math.max(2, num(patch.maximumDurationDays, current.maximumDurationDays)),
      inactivityDays: Math.max(1, num(patch.inactivityDays, current.inactivityDays)),
      stopOnStaleBaseline: patch.stopOnStaleBaseline ?? current.stopOnStaleBaseline,
      stopOnChampionSuperior: patch.stopOnChampionSuperior ?? current.stopOnChampionSuperior,
    };
    if (next.maximumDurationDays < next.minimumDurationDays) next.maximumDurationDays = next.minimumDurationDays;
    if (settings().requireDistinctApprovers && next.firstApprover && next.firstApprover === next.secondApprover) throw new Error('Os dois aprovadores precisam ser pessoas diferentes.');
    return saveRecord(next);
  }

  function latestSnapshotDate(experimentId) {
    return shadowSnapshots().filter((item) => item.experimentId === experimentId).map((item) => iso(item.date || item.createdAt)).filter(Boolean).sort().reverse()[0] || '';
  }

  function requiredFields(record) {
    const missing = [];
    if (!safe(record.owner)) missing.push('responsável');
    if (!safe(record.firstApprover)) missing.push('1º aprovador');
    if (!safe(record.secondApprover)) missing.push('2º aprovador');
    if (settings().requireDistinctApprovers && record.firstApprover && record.firstApprover === record.secondApprover) missing.push('aprovadores distintos');
    return missing;
  }

  function evaluateGovernance(experimentId, reference = today(), evaluation = CHAMPION?.evaluateExperiment?.(experimentId)) {
    const experiment = experiments().find((item) => item.id === experimentId);
    if (!experiment) return null;
    const record = recordFor(experimentId);
    const start = iso(experiment.startedAt || experiment.createdAt) || reference;
    const durationDays = daysBetween(start, reference);
    const latest = latestSnapshotDate(experimentId) || start;
    const inactivity = daysBetween(latest, reference);
    const minimumMet = durationDays >= record.minimumDurationDays;
    const maximumExceeded = durationDays >= record.maximumDurationDays;
    const staleBaseline = Boolean(evaluation?.stale);
    const championSuperior = Boolean(evaluation?.eligible && evaluation?.result === 'champion');
    const inactive = experiment.status === 'running' && inactivity >= record.inactivityDays;
    const stopSignals = [];
    if (record.stopOnStaleBaseline && staleBaseline) stopSignals.push('Baseline champion foi alterado.');
    if (record.stopOnChampionSuperior && championSuperior) stopSignals.push('Champion demonstrou superioridade com amostra elegível.');
    if (maximumExceeded) stopSignals.push(`Duração máxima de ${record.maximumDurationDays} dias atingida.`);
    if (inactive) stopSignals.push(`Sem nova captura há ${inactivity} dias.`);
    const missing = requiredFields(record);
    const approvals = record.approvals.filter((item) => item.decision === 'approve');
    const canRequestPromote = !missing.length && minimumMet && !staleBaseline && evaluation?.result === 'challenger';
    const canRequestKeep = !missing.length;
    return {
      experiment,
      evaluation,
      record,
      start,
      durationDays,
      latestSnapshotAt: latest,
      inactivityDays: inactivity,
      minimumMet,
      maximumExceeded,
      staleBaseline,
      championSuperior,
      stopSignals,
      missing,
      approvals,
      canRequestPromote,
      canRequestKeep,
    };
  }

  function requestDecision(experimentId, decision, note = '', reference = today()) {
    if (!['promote', 'keep'].includes(decision)) throw new Error('Decisão inválida.');
    const state = evaluateGovernance(experimentId, reference);
    if (!state) throw new Error('Experimento não encontrado.');
    if (state.missing.length) throw new Error(`Complete a governança: ${state.missing.join(', ')}.`);
    if (decision === 'promote' && !state.minimumMet) throw new Error(`A duração mínima de ${state.record.minimumDurationDays} dias ainda não foi cumprida.`);
    if (decision === 'promote' && state.staleBaseline) throw new Error('O baseline mudou. Reinicie o experimento antes de solicitar promoção.');
    if (decision === 'promote' && state.evaluation?.result !== 'challenger') throw new Error('O challenger ainda não foi classificado como superior.');
    return saveRecord({
      ...state.record,
      requestedDecision: decision,
      requestNote: safe(note, 1000),
      requestedAt: new Date().toISOString(),
      approvalStatus: 'awaiting_first',
      approvals: [],
      executedAt: '',
    });
  }

  function approveDecision(experimentId, stage, approver, note = '', decision = 'approve') {
    const record = recordFor(experimentId);
    const expectedStage = record.approvalStatus === 'awaiting_first' ? 1 : record.approvalStatus === 'awaiting_second' ? 2 : 0;
    if (expectedStage !== stage) throw new Error('Esta etapa de aprovação não está disponível.');
    const expectedApprover = stage === 1 ? record.firstApprover : record.secondApprover;
    if (!expectedApprover || safe(approver) !== expectedApprover) throw new Error(`A ${stage}ª aprovação pertence a ${expectedApprover || 'um aprovador não definido'}.`);
    if (stage === 2 && settings().requireDistinctApprovers && record.firstApprover === record.secondApprover) throw new Error('A segunda aprovação precisa ser independente da primeira.');
    const approval = { id: `approval-${uid()}`, stage, approver: expectedApprover, decision, note: safe(note, 1000), at: new Date().toISOString() };
    if (decision === 'reject') return saveRecord({ ...record, approvals: [...record.approvals, approval], approvalStatus: 'rejected' });
    return saveRecord({ ...record, approvals: [...record.approvals, approval], approvalStatus: stage === 1 ? 'awaiting_second' : 'approved' });
  }

  function canExecuteDecision(experimentId, decision, evaluation = CHAMPION?.evaluateExperiment?.(experimentId), reference = today()) {
    const state = evaluateGovernance(experimentId, reference, evaluation);
    if (!state) return { ok: false, reason: 'Experimento não encontrado.' };
    const record = state.record;
    if (record.approvalStatus !== 'approved') return { ok: false, reason: 'A decisão ainda não recebeu as duas aprovações.' };
    if (record.requestedDecision !== decision) return { ok: false, reason: 'A decisão aprovada não corresponde à ação solicitada.' };
    if (state.approvals.length < 2) return { ok: false, reason: 'São necessárias duas aprovações registradas.' };
    if (settings().requireDistinctApprovers && state.approvals[0]?.approver === state.approvals[1]?.approver) return { ok: false, reason: 'As aprovações precisam ser independentes.' };
    if (decision === 'promote') {
      if (!state.minimumMet) return { ok: false, reason: `A duração mínima de ${record.minimumDurationDays} dias ainda não foi cumprida.` };
      if (state.staleBaseline) return { ok: false, reason: 'O baseline champion mudou durante o experimento.' };
      if (evaluation?.result !== 'challenger') return { ok: false, reason: 'O challenger não está classificado como superior.' };
    }
    return { ok: true, state };
  }

  function recordExecution(experimentId, decision, note = '', evaluation = CHAMPION?.evaluateExperiment?.(experimentId)) {
    const record = recordFor(experimentId);
    const experiment = experiments().find((item) => item.id === experimentId);
    const row = {
      id: `formal-decision-${uid()}`,
      experimentId,
      experimentName: experiment?.name || experimentId,
      decision,
      owner: record.owner,
      firstApprover: record.firstApprover,
      secondApprover: record.secondApprover,
      approvals: record.approvals,
      requestedAt: record.requestedAt,
      executedAt: new Date().toISOString(),
      note: safe(note || record.requestNote, 1500),
      result: evaluation?.result || '',
      sample: evaluation?.challenger?.total || 0,
      accuracyDelta: evaluation?.accuracyDelta || 0,
      brierDelta: evaluation?.brierDelta || 0,
      signature: 'Tehkné Solutions',
    };
    write(KEYS.decisions, [row, ...formalDecisions()].slice(0, 300));
    saveRecord({ ...record, approvalStatus: 'executed', executedAt: row.executedAt });
    return row;
  }

  function executeApprovedDecision(experimentId, note = '') {
    const record = recordFor(experimentId);
    const decision = record.requestedDecision;
    const gate = canExecuteDecision(experimentId, decision);
    if (!gate.ok) return gate;
    if (decision === 'promote') return CHAMPION.promoteChallenger(experimentId, note || record.requestNote);
    const result = CHAMPION.keepChampion(experimentId, note || record.requestNote);
    return result?.ok === false ? result : { ok: true, result };
  }

  function wrapChampionApi() {
    if (!CHAMPION || CHAMPION.__governanceWrapped) return;
    const originalPromote = CHAMPION.promoteChallenger.bind(CHAMPION);
    const originalKeep = CHAMPION.keepChampion.bind(CHAMPION);
    CHAMPION.promoteChallenger = (experimentId, note = '', override = false) => {
      const evaluation = CHAMPION.evaluateExperiment(experimentId);
      const gate = canExecuteDecision(experimentId, 'promote', evaluation);
      if (!gate.ok) return gate;
      const result = originalPromote(experimentId, note, override);
      if (result?.ok) recordExecution(experimentId, 'promote', note, evaluation);
      return result;
    };
    CHAMPION.keepChampion = (experimentId, note = '') => {
      const evaluation = CHAMPION.evaluateExperiment(experimentId);
      const gate = canExecuteDecision(experimentId, 'keep', evaluation);
      if (!gate.ok) return gate;
      const result = originalKeep(experimentId, note);
      if (result === true || result?.ok !== false) recordExecution(experimentId, 'keep', note, evaluation);
      return result === true ? { ok: true } : result;
    };
    CHAMPION.__governanceWrapped = true;
  }

  function toast(message, error = false) {
    let node = $('governanceToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'governanceToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 4200);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'experimentGovernance'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'governanceNav'));
    if ($('title')) $('title').textContent = 'Formalize responsáveis, aprovações e decisões';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function readCardPatch(card) {
    return {
      owner: card.querySelector('[data-gov-owner]')?.value,
      firstApprover: card.querySelector('[data-gov-approver-1]')?.value,
      secondApprover: card.querySelector('[data-gov-approver-2]')?.value,
      minimumDurationDays: card.querySelector('[data-gov-min]')?.value,
      maximumDurationDays: card.querySelector('[data-gov-max]')?.value,
      inactivityDays: card.querySelector('[data-gov-inactivity]')?.value,
      stopOnStaleBaseline: Boolean(card.querySelector('[data-gov-stop-stale]')?.checked),
      stopOnChampionSuperior: Boolean(card.querySelector('[data-gov-stop-champion]')?.checked),
    };
  }

  function render() {
    const states = experiments().map((experiment) => evaluateGovernance(experiment.id)).filter(Boolean);
    const summary = $('governanceSummary');
    const awaiting = states.filter((state) => ['awaiting_first', 'awaiting_second'].includes(state.record.approvalStatus)).length;
    const ready = states.filter((state) => state.record.approvalStatus === 'approved').length;
    const stopCount = states.filter((state) => state.stopSignals.length).length;
    if (summary) summary.innerHTML = [
      ['Experimentos', states.length, 'monitorados'],
      ['Aguardando aprovação', awaiting, 'duas etapas'],
      ['Prontos para executar', ready, 'decisão aprovada'],
      ['Critérios de parada', stopCount, 'requerem revisão'],
    ].map(([label, value, note]) => `<article class="card govMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const count = $('governanceNavCount');
    if (count) count.textContent = awaiting + ready + stopCount ? String(awaiting + ready + stopCount) : '';

    const list = $('governanceExperiments');
    if (list) list.innerHTML = states.length ? states.map((state) => {
      const record = state.record;
      const approvalLabel = APPROVAL_LABELS[record.approvalStatus] || record.approvalStatus;
      const stop = state.stopSignals.length ? `<ul class="govSignals">${state.stopSignals.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum critério de parada acionado.</p>';
      return `<article class="card govCard" data-governance-card="${esc(state.experiment.id)}"><div class="govHead"><div><span>${esc(state.experiment.status)}</span><h3>${esc(state.experiment.name)}</h3><p>${state.durationDays} dia(s) em execução · mínimo ${record.minimumDurationDays} · máximo ${record.maximumDurationDays}</p></div><b>${esc(approvalLabel)}</b></div><div class="govGrid"><label class="field"><span>Responsável</span><input data-gov-owner maxlength="120" value="${esc(record.owner)}" placeholder="Responsável pelo experimento"></label><label class="field"><span>1º aprovador</span><input data-gov-approver-1 maxlength="120" value="${esc(record.firstApprover)}" placeholder="Revisão operacional"></label><label class="field"><span>2º aprovador</span><input data-gov-approver-2 maxlength="120" value="${esc(record.secondApprover)}" placeholder="Aprovação final"></label><label class="field"><span>Duração mínima</span><input data-gov-min type="number" min="1" max="180" value="${record.minimumDurationDays}"></label><label class="field"><span>Duração máxima</span><input data-gov-max type="number" min="2" max="365" value="${record.maximumDurationDays}"></label><label class="field"><span>Inatividade máxima</span><input data-gov-inactivity type="number" min="1" max="90" value="${record.inactivityDays}"></label></div><div class="govChecks"><label><input data-gov-stop-stale type="checkbox" ${record.stopOnStaleBaseline ? 'checked' : ''}> Parar se o baseline mudar</label><label><input data-gov-stop-champion type="checkbox" ${record.stopOnChampionSuperior ? 'checked' : ''}> Parar se o champion for superior</label></div>${stop}<p class="muted">Resultado atual: ${esc(state.evaluation?.result || 'sem avaliação')} · ${state.evaluation?.challenger?.total || 0} caso(s) conclusivo(s). ${state.minimumMet ? 'Duração mínima cumprida.' : 'Duração mínima pendente.'}</p><div class="actions"><button class="btn" data-gov-save>Salvar governança</button><button class="btn" data-gov-request="keep">Solicitar manutenção do champion</button><button class="btn primary" data-gov-request="promote" ${state.canRequestPromote ? '' : 'disabled'}>Solicitar promoção</button>${record.approvalStatus === 'awaiting_first' ? '<button class="btn" data-gov-approve="1">Aprovar etapa 1</button><button class="btn danger" data-gov-reject="1">Rejeitar</button>' : ''}${record.approvalStatus === 'awaiting_second' ? '<button class="btn" data-gov-approve="2">Aprovar etapa 2</button><button class="btn danger" data-gov-reject="2">Rejeitar</button>' : ''}${record.approvalStatus === 'approved' ? '<button class="btn primary" data-gov-execute>Executar decisão aprovada</button>' : ''}</div></article>`;
    }).join('') : '<div class="card empty"><h3>Nenhum experimento</h3><p class="muted">Crie um champion–challenger antes de configurar a governança.</p></div>';

    list?.querySelectorAll('[data-governance-card]').forEach((card) => {
      const experimentId = card.dataset.governanceCard;
      card.querySelector('[data-gov-save]')?.addEventListener('click', () => {
        try { configureRecord(experimentId, readCardPatch(card)); toast('Governança atualizada.'); render(); }
        catch (error) { toast(error.message, true); }
      });
      card.querySelectorAll('[data-gov-request]').forEach((button) => {
        button.addEventListener('click', () => {
          try {
            configureRecord(experimentId, readCardPatch(card));
            const note = prompt('Justificativa formal da decisão:', '') ?? '';
            requestDecision(experimentId, button.dataset.govRequest, note);
            toast('Decisão enviada para a primeira aprovação.'); render();
          } catch (error) { toast(error.message, true); }
        });
      });
      card.querySelectorAll('[data-gov-approve]').forEach((button) => {
        button.addEventListener('click', () => {
          const stage = Number(button.dataset.govApprove);
          const record = recordFor(experimentId);
          const approver = stage === 1 ? record.firstApprover : record.secondApprover;
          const note = prompt(`Observação de ${approver}:`, '') ?? '';
          try { approveDecision(experimentId, stage, approver, note, 'approve'); toast(`Etapa ${stage} aprovada.`); render(); }
          catch (error) { toast(error.message, true); }
        });
      });
      card.querySelectorAll('[data-gov-reject]').forEach((button) => {
        button.addEventListener('click', () => {
          const stage = Number(button.dataset.govReject);
          const record = recordFor(experimentId);
          const approver = stage === 1 ? record.firstApprover : record.secondApprover;
          const note = prompt('Motivo da rejeição:', '') ?? '';
          try { approveDecision(experimentId, stage, approver, note, 'reject'); toast('Solicitação rejeitada.'); render(); }
          catch (error) { toast(error.message, true); }
        });
      });
      card.querySelector('[data-gov-execute]')?.addEventListener('click', () => {
        if (!confirm('Executar a decisão aprovada e registrar o fechamento formal?')) return;
        const note = prompt('Observação final da execução:', '') ?? '';
        const result = executeApprovedDecision(experimentId, note);
        toast(result.ok ? 'Decisão executada e registrada.' : result.reason, !result.ok);
        render();
      });
    });

    const history = $('governanceHistory');
    if (history) history.innerHTML = formalDecisions().slice(0, 20).map((row) => `<div class="govHistoryRow"><span>${new Date(row.executedAt).toLocaleString('pt-BR')}</span><b>${esc(row.decision === 'promote' ? 'Promover challenger' : 'Manter champion')}</b><small>${esc(row.experimentName)} · ${esc(row.owner)}</small></div>`).join('') || '<p class="muted">Nenhuma decisão formal executada.</p>';

    const config = settings();
    if ($('govDefaultMin')) $('govDefaultMin').value = String(config.minimumDurationDays);
    if ($('govDefaultMax')) $('govDefaultMax').value = String(config.maximumDurationDays);
    if ($('govDefaultInactive')) $('govDefaultInactive').value = String(config.inactivityDays);
    if ($('govDistinct')) $('govDistinct').checked = Boolean(config.requireDistinctApprovers);
    bindChampionButtons();
  }

  function bindChampionButtons() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-promote]').forEach((button) => {
      button.disabled = false;
      button.onclick = () => {
        const gate = canExecuteDecision(button.dataset.promote, 'promote');
        if (!gate.ok) { showView(); toast(gate.reason, true); return; }
        if (!confirm('Executar a promoção aprovada?')) return;
        const result = CHAMPION.promoteChallenger(button.dataset.promote, gate.state.record.requestNote);
        toast(result.ok ? 'Challenger promovido com governança.' : result.reason, !result.ok); render();
      };
    });
    document.querySelectorAll('[data-keep]').forEach((button) => {
      button.onclick = () => {
        const gate = canExecuteDecision(button.dataset.keep, 'keep');
        if (!gate.ok) { showView(); toast(gate.reason, true); return; }
        if (!confirm('Executar a manutenção aprovada do champion?')) return;
        const result = CHAMPION.keepChampion(button.dataset.keep, gate.state.record.requestNote);
        toast(result?.ok === false ? result.reason : 'Champion mantido com decisão formal.', result?.ok === false); render();
      };
    });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.experimentGovernanceRecords = KEYS.records;
      keys.experimentFormalDecisions = KEYS.decisions;
      keys.experimentGovernanceSettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { records: [], decisions: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 420) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.6.6', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.experimentGovernanceRecords = records();
        payload.experimentFormalDecisions = formalDecisions();
        payload.experimentGovernanceSettings = settings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            records: Array.isArray(payload.experimentGovernanceRecords) ? payload.experimentGovernanceRecords : [],
            decisions: Array.isArray(payload.experimentFormalDecisions) ? payload.experimentFormalDecisions : [],
            settings: payload.experimentGovernanceSettings || {},
          };
        } catch { pending = { records: [], decisions: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.records, [...new Map([...records(), ...pending.records].map((item) => [item.experimentId, item])).values()].slice(0, 150));
        write(KEYS.decisions, [...new Map([...formalDecisions(), ...pending.decisions].map((item) => [item.id, item])).values()].slice(0, 300));
        write(KEYS.settings, { ...settings(), ...pending.settings }); render();
      });
      replace.addEventListener('click', () => { write(KEYS.records, pending.records); write(KEYS.decisions, pending.decisions); write(KEYS.settings, pending.settings); render(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const championNav = $('championNav'); const championView = $('championChallenger');
    if (!championNav || !championView || $('governanceNav')) return false;
    championNav.insertAdjacentHTML('afterend', '<button class="nav" id="governanceNav"><span>Governança</span><b id="governanceNavCount"></b></button>');
    championView.insertAdjacentHTML('afterend', `<section class="view" id="experimentGovernance"><div class="sectionHead"><div><span class="eyebrow">DECISÃO CONTROLADA</span><h2>Governança dos experimentos</h2><p class="muted">Defina responsáveis, duração, critérios de parada e duas aprovações independentes antes de promover ou manter o champion.</p></div></div><div class="governanceSummary" id="governanceSummary"></div><div class="governanceLayout"><main><div id="governanceExperiments" class="governanceExperiments"></div></main><aside><article class="card"><span class="eyebrow">PADRÕES</span><h3>Novos experimentos</h3><label class="field"><span>Duração mínima</span><input id="govDefaultMin" type="number" min="1" max="180"></label><label class="field"><span>Duração máxima</span><input id="govDefaultMax" type="number" min="2" max="365"></label><label class="field"><span>Inatividade máxima</span><input id="govDefaultInactive" type="number" min="1" max="90"></label><label class="govInline"><input id="govDistinct" type="checkbox"> Exigir aprovadores diferentes</label><button class="btn" id="govSaveDefaults">Salvar padrões</button></article><article class="card"><span class="eyebrow">DECISÕES FORMAIS</span><h3>Histórico</h3><div id="governanceHistory"></div></article><article class="card"><span class="eyebrow">PROTEÇÕES</span><h3>Fluxo obrigatório</h3><ol class="govRules"><li>Configurar responsável e dois aprovadores.</li><li>Cumprir duração mínima para promover.</li><li>Solicitar decisão com justificativa.</li><li>Receber duas aprovações independentes.</li><li>Executar manualmente e registrar o fechamento.</li></ol></article></aside></div><div id="governanceToast" class="v021Toast"></div></section>`);
    $('governanceNav').onclick = showView;
    $('govSaveDefaults').onclick = () => {
      saveSettings({ minimumDurationDays: $('govDefaultMin').value, maximumDurationDays: $('govDefaultMax').value, inactivityDays: $('govDefaultInactive').value, requireDistinctApprovers: $('govDistinct').checked });
      toast('Padrões de governança atualizados.'); render();
    };
    wrapChampionApi(); extendCloud(); enhanceBackup(); render();
    const observerTarget = $('championExperiments');
    if (observerTarget) new MutationObserver(() => bindChampionButtons()).observe(observerTarget, { childList: true, subtree: true });
    ROOT.addEventListener?.('commerce-radar-champion-updated', render);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || Object.values(CHAMPION?.KEYS || {}).includes(event.key)) render(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 560) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarExperimentGovernance = {
    KEYS,
    DEFAULTS,
    settings,
    records,
    formalDecisions,
    recordFor,
    configureRecord,
    evaluateGovernance,
    requestDecision,
    approveDecision,
    canExecuteDecision,
    recordExecution,
    executeApprovedDecision,
    saveSettings,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  } else {
    wrapChampionApi();
  }
})();