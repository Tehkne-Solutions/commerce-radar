(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const SIGNALS_KEY = 'tehkne-commerce-radar-v5-trend-signals';
  const QUEUE_KEY = 'tehkne-commerce-radar-v51-review-queue';
  const HISTORY_KEY = 'tehkne-commerce-radar-v51-signal-history';
  const SETTINGS_KEY = 'tehkne-commerce-radar-v51-queue-settings';
  const PRIORITIES = { high: 'Alta', medium: 'Média', low: 'Baixa' };
  const STATES = { pending: 'Pendente', reviewing: 'Em revisão', reviewed: 'Revisado', snoozed: 'Adiado' };
  const byId = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);

  function read(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function addDays(date, days) {
    const base = Date.parse(date || today());
    return new Date(base + num(days) * 86400000).toISOString().slice(0, 10);
  }

  function dayDiff(from, to = today()) {
    const a = Date.parse(from);
    const b = Date.parse(to);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.floor((b - a) / 86400000);
  }

  function normalizeMeta(raw = {}, signalId = '') {
    const priority = PRIORITIES[raw.priority] ? raw.priority : 'medium';
    const state = STATES[raw.state] ? raw.state : 'pending';
    return {
      signalId: safe(raw.signalId || signalId, 140),
      priority,
      state,
      nextReviewAt: safe(raw.nextReviewAt, 10),
      lastReviewedAt: safe(raw.lastReviewedAt, 32),
      owner: safe(raw.owner, 100),
      note: safe(raw.note, 1000),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  function metaMap(rows = read(QUEUE_KEY, [])) {
    return new Map(rows.map((item) => {
      const normalized = normalizeMeta(item, item.signalId);
      return [normalized.signalId, normalized];
    }));
  }

  function normalizeHistory(raw = {}) {
    return {
      id: safe(raw.id, 140) || `history-${uid()}`,
      signalId: safe(raw.signalId, 140),
      action: safe(raw.action, 60) || 'updated',
      at: raw.at || new Date().toISOString(),
      note: safe(raw.note, 1200),
      changes: Array.isArray(raw.changes) ? raw.changes.map((item) => ({ field: safe(item.field, 80), before: safe(item.before, 500), after: safe(item.after, 500) })).slice(0, 30) : [],
      snapshot: raw.snapshot && typeof raw.snapshot === 'object' ? raw.snapshot : {},
    };
  }

  function diffSignal(before = {}, after = {}) {
    const fields = ['observedAt', 'validDays', 'expiresAt', 'growth', 'demand', 'competition', 'margin', 'risk', 'confidence', 'evidence', 'notes'];
    return fields.filter((field) => String(before[field] ?? '') !== String(after[field] ?? '')).map((field) => ({ field, before: String(before[field] ?? ''), after: String(after[field] ?? '') }));
  }

  function dueState(signal, meta = {}, referenceDate = today()) {
    const api = ROOT.CommerceRadarTrends;
    const fresh = api?.freshness ? api.freshness(signal, referenceDate) : { expired: false, remainingDays: 30, label: 'Válido' };
    const reviewDate = meta.nextReviewAt || signal.expiresAt;
    const reviewRemaining = reviewDate ? -dayDiff(referenceDate, reviewDate) : fresh.remainingDays;
    if (fresh.expired) return { id: 'expired', label: 'Vencido', remainingDays: fresh.remainingDays, severity: 4 };
    if (reviewRemaining < 0) return { id: 'overdue', label: 'Revisão atrasada', remainingDays: reviewRemaining, severity: 4 };
    if (reviewRemaining <= 3) return { id: 'critical', label: `Revisar em ${Math.max(0, reviewRemaining)} dia(s)`, remainingDays: reviewRemaining, severity: 3 };
    if (reviewRemaining <= 7) return { id: 'soon', label: `Revisar em ${reviewRemaining} dias`, remainingDays: reviewRemaining, severity: 2 };
    if (reviewRemaining <= 15) return { id: 'upcoming', label: `Revisar em ${reviewRemaining} dias`, remainingDays: reviewRemaining, severity: 1 };
    return { id: 'current', label: 'Em dia', remainingDays: reviewRemaining, severity: 0 };
  }

  function queueScore(signal, meta = {}, aggregate = null, referenceDate = today()) {
    const due = dueState(signal, meta, referenceDate);
    const priorityWeight = { high: 35, medium: 18, low: 5 }[meta.priority || 'medium'];
    const contradictionWeight = aggregate?.contradiction ? 24 : 0;
    const staleWeight = due.severity * 25;
    const stateDiscount = meta.state === 'reviewed' ? 25 : meta.state === 'snoozed' ? 12 : 0;
    const lowConfidenceWeight = Math.max(0, 4 - num(signal.confidence, 3)) * 4;
    return Math.max(0, Math.round(staleWeight + priorityWeight + contradictionWeight + lowConfidenceWeight - stateDiscount));
  }

  function buildQueue(signals = [], metadata = [], referenceDate = today()) {
    const api = ROOT.CommerceRadarTrends;
    const metas = metaMap(metadata);
    const aggregates = api?.aggregateSignals ? api.aggregateSignals(signals, referenceDate) : [];
    const aggregateMap = new Map(aggregates.flatMap((item) => item.rows.map(({ signal }) => [signal.id, item])));
    return signals.map((signal) => {
      const normalized = api?.normalizeSignal ? api.normalizeSignal(signal) : signal;
      const meta = normalizeMeta(metas.get(normalized.id) || {}, normalized.id);
      const aggregate = aggregateMap.get(normalized.id) || null;
      const due = dueState(normalized, meta, referenceDate);
      return { signal: normalized, meta, aggregate, due, queueScore: queueScore(normalized, meta, aggregate, referenceDate) };
    }).sort((a, b) => b.queueScore - a.queueScore || a.due.remainingDays - b.due.remainingDays || b.signal.updatedAt.localeCompare(a.signal.updatedAt));
  }

  function createHistoryEntry(signalId, action, before = {}, after = {}, note = '') {
    return normalizeHistory({ signalId, action, note, changes: diffSignal(before, after), snapshot: after });
  }

  function signals() {
    const api = ROOT.CommerceRadarTrends;
    return read(SIGNALS_KEY, []).map((item) => api?.normalizeSignal ? api.normalizeSignal(item) : item);
  }

  function saveSignals(rows) {
    const api = ROOT.CommerceRadarTrends;
    write(SIGNALS_KEY, rows.map((item) => api?.normalizeSignal ? api.normalizeSignal(item) : item));
  }

  function metadata() {
    return read(QUEUE_KEY, []).map((item) => normalizeMeta(item, item.signalId));
  }

  function saveMetadata(rows) {
    write(QUEUE_KEY, rows.map((item) => normalizeMeta(item, item.signalId)));
  }

  function history() {
    return read(HISTORY_KEY, []).map(normalizeHistory);
  }

  function saveHistory(rows) {
    write(HISTORY_KEY, rows.map(normalizeHistory).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 1000));
  }

  function upsertMeta(signalId, patch = {}) {
    const rows = metadata();
    const current = rows.find((item) => item.signalId === signalId) || normalizeMeta({}, signalId);
    const next = normalizeMeta({ ...current, ...patch, signalId, updatedAt: new Date().toISOString() }, signalId);
    saveMetadata([next, ...rows.filter((item) => item.signalId !== signalId)]);
    return next;
  }

  function updateSignal(signalId, patch, action = 'updated', note = '') {
    const rows = signals();
    const before = rows.find((item) => item.id === signalId);
    if (!before) return null;
    const api = ROOT.CommerceRadarTrends;
    const after = api?.normalizeSignal ? api.normalizeSignal({ ...before, ...patch, id: before.id, createdAt: before.createdAt }) : { ...before, ...patch };
    saveSignals([after, ...rows.filter((item) => item.id !== signalId)]);
    saveHistory([createHistoryEntry(signalId, action, before, after, note), ...history()]);
    return after;
  }

  function batchReview(ids = [], options = {}) {
    const unique = [...new Set(ids)].filter(Boolean);
    const reviewedAt = options.reviewedAt || today();
    const results = [];
    for (const id of unique) {
      const current = signals().find((item) => item.id === id);
      if (!current) continue;
      const patch = {};
      if (options.refreshObservation) patch.observedAt = reviewedAt;
      if (options.validDays) patch.validDays = Math.max(1, Math.min(365, num(options.validDays, current.validDays)));
      if (options.evidenceAppend) patch.evidence = safe(`${current.evidence}${current.evidence ? '\n' : ''}${options.evidenceAppend}`, 1200);
      const after = Object.keys(patch).length ? updateSignal(id, patch, options.action || 'batch_review', options.note || '') : current;
      const expiresAt = after?.expiresAt || current.expiresAt;
      upsertMeta(id, {
        priority: options.priority || metadata().find((item) => item.signalId === id)?.priority || 'medium',
        state: options.state || 'reviewed',
        lastReviewedAt: new Date().toISOString(),
        nextReviewAt: options.nextReviewAt || expiresAt,
        note: options.note || '',
      });
      if (!Object.keys(patch).length) saveHistory([createHistoryEntry(id, options.action || 'batch_review', current, current, options.note || ''), ...history()]);
      results.push(id);
    }
    return results;
  }

  function toast(message, error = false) {
    let node = byId('trendQueueToast');
    if (!node && typeof document !== 'undefined') {
      node = document.createElement('div'); node.id = 'trendQueueToast'; document.body.append(node);
    }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function selectedIds() {
    return [...document.querySelectorAll('[data-queue-check]:checked')].map((input) => input.value);
  }

  function filteredQueue() {
    const query = safe(byId('trendQueueSearch')?.value, 140).toLocaleLowerCase('pt-BR');
    const priority = byId('trendQueuePriority')?.value || 'all';
    const due = byId('trendQueueDue')?.value || 'all';
    const state = byId('trendQueueState')?.value || 'all';
    return buildQueue(signals(), metadata()).filter((item) => {
      if (query && !`${item.signal.topic} ${item.signal.sourceName} ${item.signal.evidence}`.toLocaleLowerCase('pt-BR').includes(query)) return false;
      if (priority !== 'all' && item.meta.priority !== priority) return false;
      if (due !== 'all' && item.due.id !== due) return false;
      if (state !== 'all' && item.meta.state !== state) return false;
      return true;
    });
  }

  function renderSummary() {
    const node = byId('trendQueueSummary');
    if (!node) return;
    const rows = buildQueue(signals(), metadata());
    const expired = rows.filter((item) => ['expired', 'overdue'].includes(item.due.id)).length;
    const soon = rows.filter((item) => ['critical', 'soon'].includes(item.due.id)).length;
    const high = rows.filter((item) => item.meta.priority === 'high').length;
    const contradictions = rows.filter((item) => item.aggregate?.contradiction).length;
    node.innerHTML = [['Atrasados ou vencidos', expired], ['Próximos 7 dias', soon], ['Prioridade alta', high], ['Com contradição', contradictions]].map(([label, value]) => `<article class="card tqMetric"><small>${label}</small><b>${value}</b></article>`).join('');
    const count = byId('trendQueueNavCount');
    if (count) count.textContent = expired + soon ? String(expired + soon) : '';
  }

  function renderQueue() {
    const node = byId('trendQueueList');
    if (!node) return;
    const rows = filteredQueue();
    if (!rows.length) {
      node.innerHTML = '<div class="card empty"><h3>Fila vazia</h3><p class="muted">Nenhuma fonte corresponde aos filtros atuais.</p></div>';
      return;
    }
    node.innerHTML = rows.map(({ signal, meta, aggregate, due, queueScore: score }) => `<article class="card tqRow due-${due.id}">
      <label class="tqCheck"><input type="checkbox" data-queue-check value="${escapeHtml(signal.id)}"><span></span></label>
      <div class="tqMain"><div class="tqHead"><div><span class="tqDue">${escapeHtml(due.label)}</span><h3>${escapeHtml(signal.topic)}</h3><p>${escapeHtml(signal.sourceName)} · ${escapeHtml(signal.observedAt)} · vence ${escapeHtml(signal.expiresAt)}</p></div><strong>${score}</strong></div>
      <div class="tqFacts"><span>Prioridade ${escapeHtml(PRIORITIES[meta.priority])}</span><span>${escapeHtml(STATES[meta.state])}</span><span>Confiança ${signal.confidence}/5</span>${aggregate?.contradiction ? '<span class="warningText">Contradição</span>' : ''}</div>
      <p class="muted">${escapeHtml(signal.evidence || 'Sem evidência descritiva.')}</p>
      <div class="actions"><button class="btn small" data-queue-review="${escapeHtml(signal.id)}">Revisar</button><button class="btn small" data-queue-priority="${escapeHtml(signal.id)}">Alterar prioridade</button><button class="btn small" data-queue-history="${escapeHtml(signal.id)}">Histórico</button><button class="btn small" data-queue-snooze="${escapeHtml(signal.id)}">Adiar 7 dias</button></div></div>
    </article>`).join('');
    node.querySelectorAll('[data-queue-review]').forEach((button) => button.onclick = () => openReview(button.dataset.queueReview));
    node.querySelectorAll('[data-queue-priority]').forEach((button) => button.onclick = () => cyclePriority(button.dataset.queuePriority));
    node.querySelectorAll('[data-queue-history]').forEach((button) => button.onclick = () => openHistory(button.dataset.queueHistory));
    node.querySelectorAll('[data-queue-snooze]').forEach((button) => button.onclick = () => snooze(button.dataset.queueSnooze, 7));
  }

  function renderAll() {
    renderSummary(); renderQueue();
  }

  function cyclePriority(id) {
    const current = metadata().find((item) => item.signalId === id)?.priority || 'medium';
    const next = current === 'low' ? 'medium' : current === 'medium' ? 'high' : 'low';
    upsertMeta(id, { priority: next, state: 'pending' });
    const signal = signals().find((item) => item.id === id) || {};
    saveHistory([createHistoryEntry(id, 'priority_changed', signal, signal, `Prioridade alterada para ${PRIORITIES[next]}.`), ...history()]);
    renderAll(); toast(`Prioridade alterada para ${PRIORITIES[next]}.`);
  }

  function snooze(id, days) {
    const nextReviewAt = addDays(today(), days);
    upsertMeta(id, { state: 'snoozed', nextReviewAt, note: `Adiado por ${days} dias.` });
    const signal = signals().find((item) => item.id === id) || {};
    saveHistory([createHistoryEntry(id, 'snoozed', signal, signal, `Próxima revisão em ${nextReviewAt}.`), ...history()]);
    renderAll(); toast(`Fonte adiada até ${nextReviewAt}.`);
  }

  function openReview(id) {
    const signal = signals().find((item) => item.id === id);
    if (!signal) return;
    const meta = metadata().find((item) => item.signalId === id) || normalizeMeta({}, id);
    byId('tqReviewId').value = id;
    byId('tqReviewTitle').textContent = signal.topic;
    byId('tqReviewSource').textContent = `${signal.sourceName} · observado em ${signal.observedAt}`;
    byId('tqReviewDate').value = today();
    byId('tqReviewValidity').value = signal.validDays;
    byId('tqReviewPriority').value = meta.priority;
    byId('tqReviewEvidence').value = signal.evidence;
    byId('tqReviewNote').value = '';
    byId('trendQueueReviewModal').classList.add('open');
  }

  function saveReview(event) {
    event.preventDefault();
    const id = byId('tqReviewId').value;
    const before = signals().find((item) => item.id === id);
    if (!before) return;
    const after = updateSignal(id, {
      observedAt: byId('tqReviewDate').value,
      validDays: byId('tqReviewValidity').value,
      evidence: byId('tqReviewEvidence').value,
    }, 'source_reviewed', byId('tqReviewNote').value);
    upsertMeta(id, {
      priority: byId('tqReviewPriority').value,
      state: 'reviewed',
      lastReviewedAt: new Date().toISOString(),
      nextReviewAt: after?.expiresAt,
      note: byId('tqReviewNote').value,
    });
    byId('trendQueueReviewModal').classList.remove('open');
    renderAll(); toast('Fonte revisada e histórico atualizado.');
  }

  function openHistory(id) {
    const signal = signals().find((item) => item.id === id);
    const rows = history().filter((item) => item.signalId === id);
    byId('tqHistoryTitle').textContent = signal?.topic || 'Histórico da fonte';
    byId('tqHistoryList').innerHTML = rows.length ? rows.map((entry) => `<article class="tqHistoryEntry"><div><b>${escapeHtml(entry.action)}</b><span>${new Date(entry.at).toLocaleString('pt-BR')}</span></div>${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ''}${entry.changes.length ? `<ul>${entry.changes.map((change) => `<li><b>${escapeHtml(change.field)}</b>: ${escapeHtml(change.before || '—')} → ${escapeHtml(change.after || '—')}</li>`).join('')}</ul>` : '<small>Revisão sem mudança nos valores do sinal.</small>'}</article>`).join('') : '<div class="empty compact"><p class="muted">Nenhuma alteração registrada.</p></div>';
    byId('trendQueueHistoryModal').classList.add('open');
  }

  function batchAction(action) {
    const ids = selectedIds();
    if (!ids.length) return toast('Selecione pelo menos uma fonte.', true);
    if (action === 'review') batchReview(ids, { refreshObservation: true, state: 'reviewed', action: 'batch_review', note: 'Revisão em lote sem alteração manual da evidência.' });
    if (action === 'high') batchReview(ids, { priority: 'high', state: 'pending', action: 'batch_priority', note: 'Prioridade alta aplicada em lote.' });
    if (action === 'snooze') ids.forEach((id) => snooze(id, 7));
    renderAll(); toast(`${ids.length} fonte(s) atualizada(s).`);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'trendQueue'));
    document.querySelectorAll('.nav').forEach((item) => item.classList.toggle('on', item.id === 'trendQueueNav'));
    const title = byId('title'); if (title) title.textContent = 'Revise fontes antes que os sinais envelheçam';
    document.querySelector('.side')?.classList.remove('open');
    renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.trendReviewQueue = QUEUE_KEY;
      keys.trendSignalHistory = HISTORY_KEY;
      keys.trendQueueSettings = SETTINGS_KEY;
      return true;
    };
    if (apply()) return;
    ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { queue: [], history: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = byId('backup'); const input = byId('restoreFile'); const merge = byId('mergeRestore'); const replace = byId('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 180) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.5.1', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.trendSignals = signals(); payload.trendReviewQueue = metadata(); payload.trendSignalHistory = history(); payload.trendQueueSettings = read(SETTINGS_KEY, {});
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            queue: Array.isArray(payload.trendReviewQueue) ? payload.trendReviewQueue.map((item) => normalizeMeta(item, item.signalId)) : [],
            history: Array.isArray(payload.trendSignalHistory) ? payload.trendSignalHistory.map(normalizeHistory) : [],
            settings: payload.trendQueueSettings && typeof payload.trendQueueSettings === 'object' ? payload.trendQueueSettings : {},
          };
        } catch { pending = { queue: [], history: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        saveMetadata([...new Map([...metadata(), ...pending.queue].map((item) => [item.signalId, item])).values()]);
        saveHistory([...history(), ...pending.history]);
        write(SETTINGS_KEY, { ...read(SETTINGS_KEY, {}), ...pending.settings }); renderAll();
      });
      replace.addEventListener('click', () => { saveMetadata(pending.queue); saveHistory(pending.history); write(SETTINGS_KEY, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const trendNav = byId('trendNav');
    const trendView = byId('trendRadar');
    if (!nav || !trendNav || !trendView || byId('trendQueueNav')) return false;
    trendNav.insertAdjacentHTML('afterend', '<button class="nav" id="trendQueueNav"><span>Fila de fontes</span><b id="trendQueueNavCount"></b></button>');
    trendView.insertAdjacentHTML('afterend', `<section class="view" id="trendQueue">
      <div class="sectionHead"><div><span class="eyebrow">MANUTENÇÃO DOS SINAIS</span><h2>Fila de atualização de fontes</h2><p class="muted">Priorize revisões, trate vencimentos e preserve o histórico completo de cada evidência.</p></div><div class="actions"><button class="btn" id="tqBatchReview">Revisar selecionados</button><button class="btn" id="tqBatchSnooze">Adiar 7 dias</button><button class="btn primary" id="tqBatchHigh">Prioridade alta</button></div></div>
      <div class="tqSummary" id="trendQueueSummary"></div>
      <div class="card tqFilters"><label class="field wide"><span>Buscar</span><input id="trendQueueSearch" placeholder="Tema, fonte ou evidência"></label><label class="field"><span>Prioridade</span><select id="trendQueuePriority"><option value="all">Todas</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label><label class="field"><span>Prazo</span><select id="trendQueueDue"><option value="all">Todos</option><option value="expired">Vencido</option><option value="overdue">Revisão atrasada</option><option value="critical">Até 3 dias</option><option value="soon">Até 7 dias</option><option value="upcoming">Até 15 dias</option><option value="current">Em dia</option></select></label><label class="field"><span>Estado</span><select id="trendQueueState"><option value="all">Todos</option><option value="pending">Pendente</option><option value="reviewing">Em revisão</option><option value="reviewed">Revisado</option><option value="snoozed">Adiado</option></select></label></div>
      <div id="trendQueueList" class="tqList"></div>
    </section>`);
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="trendQueueReviewModal"><div class="card modalBox wideModal"><div class="modalHead"><div><span class="eyebrow">REVISÃO DA FONTE</span><h2 id="tqReviewTitle">Revisar fonte</h2><p id="tqReviewSource" class="muted"></p></div><button class="btn small" id="tqReviewClose" type="button">Fechar</button></div><form id="tqReviewForm"><input id="tqReviewId" type="hidden"><div class="grid"><label class="field"><span>Observado em</span><input id="tqReviewDate" type="date" required></label><label class="field"><span>Validade em dias</span><input id="tqReviewValidity" type="number" min="1" max="365" required></label><label class="field"><span>Prioridade</span><select id="tqReviewPriority"><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label><label class="field wide"><span>Evidência atualizada</span><textarea id="tqReviewEvidence" rows="6" maxlength="1200" required></textarea></label><label class="field wide"><span>Nota da revisão</span><textarea id="tqReviewNote" rows="3" maxlength="1000" placeholder="O que foi confirmado, alterado ou descartado?"></textarea></label></div><div class="actions end"><button class="btn primary" type="submit">Salvar revisão</button></div></form></div></div>
      <div class="modal" id="trendQueueHistoryModal"><div class="card modalBox wideModal"><div class="modalHead"><div><span class="eyebrow">TRILHA DE AUDITORIA</span><h2 id="tqHistoryTitle">Histórico da fonte</h2></div><button class="btn small" id="tqHistoryClose" type="button">Fechar</button></div><div id="tqHistoryList" class="tqHistoryList"></div></div></div><div id="trendQueueToast" class="v021Toast"></div>`);
    byId('trendQueueNav').onclick = showView;
    byId('tqReviewClose').onclick = () => byId('trendQueueReviewModal').classList.remove('open');
    byId('tqHistoryClose').onclick = () => byId('trendQueueHistoryModal').classList.remove('open');
    byId('tqReviewForm').addEventListener('submit', saveReview);
    byId('tqBatchReview').onclick = () => batchAction('review');
    byId('tqBatchSnooze').onclick = () => batchAction('snooze');
    byId('tqBatchHigh').onclick = () => batchAction('high');
    for (const id of ['trendQueueSearch', 'trendQueuePriority', 'trendQueueDue', 'trendQueueState']) byId(id).addEventListener(id === 'trendQueueSearch' ? 'input' : 'change', renderAll);
    renderAll(); extendCloud(); enhanceBackup(); return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 220) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarTrendQueue = { normalizeMeta, normalizeHistory, diffSignal, dueState, queueScore, buildQueue, createHistoryEntry, batchReview };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();