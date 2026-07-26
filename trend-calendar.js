(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const K = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    queue: 'tehkne-commerce-radar-v51-review-queue',
    history: 'tehkne-commerce-radar-v51-signal-history',
    owners: 'tehkne-commerce-radar-v52-review-owners',
    settings: 'tehkne-commerce-radar-v52-calendar-settings',
    alertState: 'tehkne-commerce-radar-v52-alert-state',
  };
  const DEFAULTS = {
    view: 'month',
    anchor: '',
    ownerFilter: 'all',
    leadDays: 7,
    browserNotifications: false,
    lastNotificationDate: '',
  };
  const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const parseDate = (value) => { const time = Date.parse(value); return Number.isFinite(time) ? new Date(`${new Date(time).toISOString().slice(0, 10)}T12:00:00`) : null; };
  const iso = (value) => { const date = parseDate(value); return date ? date.toISOString().slice(0, 10) : ''; };
  const addDays = (value, days) => { const date = parseDate(value || today()); if (!date) return ''; date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); };
  const daysUntil = (value, reference = today()) => { const a = parseDate(reference); const b = parseDate(value); return a && b ? Math.round((b - a) / 86400000) : 0; };
  const monday = (value) => { const date = parseDate(value || today()); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return date.toISOString().slice(0, 10); };
  const monthStart = (value) => { const date = parseDate(value || today()); date.setDate(1); return date.toISOString().slice(0, 10); };

  function normalizeOwner(raw = {}) {
    return {
      id: safe(raw.id, 120) || `owner-${uid()}`,
      name: safe(raw.name, 100) || 'Responsável sem nome',
      email: safe(raw.email, 180),
      role: safe(raw.role, 100),
      active: raw.active !== false,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function owners() { return read(K.owners, []).map(normalizeOwner); }
  function saveOwners(rows) { write(K.owners, rows.map(normalizeOwner)); }
  function settings() { return { ...DEFAULTS, ...read(K.settings, {}) }; }
  function saveSettings(value) { write(K.settings, { ...settings(), ...value }); }
  function alertState() { return { dismissed: {}, ...read(K.alertState, {}) }; }
  function saveAlertState(value) { write(K.alertState, { ...alertState(), ...value }); }
  function signals() { const api = ROOT.CommerceRadarTrends; return read(K.signals, []).map((item) => api?.normalizeSignal ? api.normalizeSignal(item) : item); }
  function metadata() { return read(K.queue, []).map((item) => ({ priority: 'medium', state: 'pending', owner: '', ...item })); }
  function history() { return read(K.history, []); }
  function saveHistory(rows) { write(K.history, rows.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 1000)); }

  function ownerMap(rawOwners = owners()) {
    const map = new Map();
    for (const owner of rawOwners.map(normalizeOwner)) {
      map.set(owner.id, owner);
      map.set(owner.name.toLocaleLowerCase('pt-BR'), owner);
    }
    return map;
  }

  function normalizeMeta(raw = {}, signalId = '') {
    return {
      signalId: safe(raw.signalId || signalId, 140),
      priority: ['high', 'medium', 'low'].includes(raw.priority) ? raw.priority : 'medium',
      state: ['pending', 'reviewing', 'reviewed', 'snoozed'].includes(raw.state) ? raw.state : 'pending',
      nextReviewAt: iso(raw.nextReviewAt),
      lastReviewedAt: safe(raw.lastReviewedAt, 32),
      owner: safe(raw.owner, 120),
      note: safe(raw.note, 1000),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

  function upsertMeta(signalId, patch = {}) {
    const rows = metadata();
    const current = rows.find((item) => item.signalId === signalId) || normalizeMeta({}, signalId);
    const next = normalizeMeta({ ...current, ...patch, signalId, updatedAt: new Date().toISOString() }, signalId);
    write(K.queue, [next, ...rows.filter((item) => item.signalId !== signalId)]);
    return { before: current, after: next };
  }

  function addMetaHistory(signalId, action, changes, note = '') {
    const signal = signals().find((item) => item.id === signalId) || {};
    saveHistory([{
      id: `history-${uid()}`,
      signalId,
      action,
      at: new Date().toISOString(),
      note: safe(note, 1200),
      changes,
      snapshot: signal,
    }, ...history()]);
  }

  function assignOwner(signalId, ownerId, note = '') {
    const { before, after } = upsertMeta(signalId, { owner: ownerId, state: beforeState(signalId) });
    addMetaHistory(signalId, 'owner_assigned', [{ field: 'owner', before: before.owner || '', after: after.owner || '' }], note || 'Responsável atualizado pelo calendário.');
    dispatchUpdate();
    return after;
  }

  function beforeState(signalId) {
    return metadata().find((item) => item.signalId === signalId)?.state || 'pending';
  }

  function scheduleReview(signalId, date, patch = {}) {
    const nextReviewAt = iso(date);
    if (!nextReviewAt) return null;
    const { before, after } = upsertMeta(signalId, { ...patch, nextReviewAt });
    const changes = [];
    for (const field of ['nextReviewAt', 'owner', 'priority', 'state']) {
      if (String(before[field] ?? '') !== String(after[field] ?? '')) changes.push({ field, before: String(before[field] ?? ''), after: String(after[field] ?? '') });
    }
    addMetaHistory(signalId, 'review_scheduled', changes, patch.note || 'Revisão atualizada pelo calendário.');
    dispatchUpdate();
    return after;
  }

  function dispatchUpdate() {
    if (typeof CustomEvent !== 'undefined') ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-review-updated'));
  }

  function buildEvents(rawSignals = signals(), rawMetadata = metadata(), rawOwners = owners(), reference = today()) {
    const metas = new Map(rawMetadata.map((item) => [item.signalId, normalizeMeta(item, item.signalId)]));
    const people = ownerMap(rawOwners);
    const queueApi = ROOT.CommerceRadarTrendQueue;
    const trendApi = ROOT.CommerceRadarTrends;
    const aggregates = trendApi?.aggregateSignals ? trendApi.aggregateSignals(rawSignals, reference) : [];
    const aggregateMap = new Map(aggregates.flatMap((aggregate) => aggregate.rows.map(({ signal }) => [signal.id, aggregate])));
    return rawSignals.map((raw) => {
      const signal = trendApi?.normalizeSignal ? trendApi.normalizeSignal(raw) : raw;
      const meta = normalizeMeta(metas.get(signal.id) || {}, signal.id);
      const date = meta.nextReviewAt || iso(signal.expiresAt);
      if (!date) return null;
      const person = people.get(meta.owner) || people.get(String(meta.owner || '').toLocaleLowerCase('pt-BR')) || null;
      const due = queueApi?.dueState ? queueApi.dueState(signal, meta, reference) : { id: daysUntil(date, reference) < 0 ? 'overdue' : 'current', label: 'Agendado', remainingDays: daysUntil(date, reference), severity: 0 };
      return {
        id: signal.id,
        date,
        topic: signal.topic,
        sourceName: signal.sourceName,
        ownerId: person?.id || meta.owner || '',
        ownerName: person?.name || (meta.owner ? meta.owner : 'Sem responsável'),
        priority: meta.priority,
        state: meta.state,
        due,
        contradiction: Boolean(aggregateMap.get(signal.id)?.contradiction),
        confidence: Number(signal.confidence || 0),
        expiresAt: signal.expiresAt,
      };
    }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date) || (PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]) || a.topic.localeCompare(b.topic));
  }

  function buildCalendar(events = [], anchor = today(), mode = 'month') {
    const normalizedMode = mode === 'week' ? 'week' : 'month';
    const periodStart = normalizedMode === 'week' ? monday(anchor) : monthStart(anchor);
    const gridStart = monday(periodStart);
    const count = normalizedMode === 'week' ? 7 : 42;
    const periodMonth = parseDate(periodStart)?.getMonth();
    const days = Array.from({ length: count }, (_, index) => {
      const date = addDays(gridStart, index);
      return {
        date,
        inPeriod: normalizedMode === 'week' || parseDate(date)?.getMonth() === periodMonth,
        events: events.filter((event) => event.date === date),
      };
    });
    return { mode: normalizedMode, anchor: iso(anchor) || today(), start: gridStart, end: days.at(-1)?.date || gridStart, days };
  }

  function buildAlerts(events = [], rawSettings = settings(), rawState = alertState(), reference = today()) {
    const leadDays = Math.max(1, Math.min(30, Number(rawSettings.leadDays || 7)));
    const dismissed = rawState.dismissed || {};
    const severityRank = { critical: 3, warning: 2, info: 1 };
    return events.map((event) => {
      if (dismissed[event.id] && dismissed[event.id] >= reference) return null;
      const remaining = daysUntil(event.date, reference);
      let severity = '';
      let label = '';
      if (remaining < 0) { severity = 'critical'; label = `${Math.abs(remaining)} dia(s) atrasado`; }
      else if (remaining === 0) { severity = 'critical'; label = 'Revisão hoje'; }
      else if (remaining <= leadDays) { severity = 'warning'; label = `Revisão em ${remaining} dia(s)`; }
      else if (!event.ownerId && remaining <= 15) { severity = 'info'; label = 'Sem responsável'; }
      else if (event.contradiction && remaining <= 15) { severity = 'warning'; label = 'Contradição requer revisão'; }
      if (!severity) return null;
      return { ...event, remainingDays: remaining, severity, alertLabel: label };
    }).filter(Boolean).sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.date.localeCompare(b.date) || PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  }

  function dismissAlert(signalId, until = today()) {
    const current = alertState();
    saveAlertState({ ...current, dismissed: { ...(current.dismissed || {}), [signalId]: until } });
  }

  function monthLabel(anchor) {
    return parseDate(anchor || today()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function toast(message, error = false) {
    let node = $('trendCalendarToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'trendCalendarToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function filteredEvents() {
    const filter = $('tcOwnerFilter')?.value || 'all';
    const rows = buildEvents();
    if (filter === 'all') return rows;
    if (filter === 'unassigned') return rows.filter((event) => !event.ownerId);
    return rows.filter((event) => event.ownerId === filter);
  }

  function calendarAnchor() {
    return settings().anchor || monthStart(today());
  }

  function renderSummary() {
    const node = $('trendCalendarSummary');
    if (!node) return;
    const events = buildEvents();
    const alerts = buildAlerts(events);
    const overdue = alerts.filter((item) => item.remainingDays < 0).length;
    const todayCount = alerts.filter((item) => item.remainingDays === 0).length;
    const sevenDays = events.filter((item) => { const days = daysUntil(item.date); return days >= 0 && days <= 7; }).length;
    const unassigned = events.filter((item) => !item.ownerId).length;
    node.innerHTML = [
      ['Atrasados', overdue],
      ['Para hoje', todayCount],
      ['Próximos 7 dias', sevenDays],
      ['Sem responsável', unassigned],
    ].map(([label, value]) => `<article class="card tcMetric"><small>${label}</small><b>${value}</b></article>`).join('');
    const badge = $('trendCalendarNavCount');
    if (badge) badge.textContent = overdue + todayCount ? String(overdue + todayCount) : '';
  }

  function renderCalendar() {
    const container = $('trendCalendarGrid');
    if (!container) return;
    const current = settings();
    const calendar = buildCalendar(filteredEvents(), current.anchor || today(), current.view);
    $('tcPeriodLabel').textContent = current.view === 'week'
      ? `${new Date(`${calendar.start}T12:00:00`).toLocaleDateString('pt-BR')} – ${new Date(`${calendar.end}T12:00:00`).toLocaleDateString('pt-BR')}`
      : monthLabel(current.anchor || today());
    $('tcMonthMode').classList.toggle('primary', current.view === 'month');
    $('tcWeekMode').classList.toggle('primary', current.view === 'week');
    container.className = `tcCalendar ${calendar.mode}`;
    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    container.innerHTML = `${weekdays.map((day) => `<div class="tcWeekday">${day}</div>`).join('')}${calendar.days.map((day) => {
      const dayNumber = Number(day.date.slice(-2));
      const isToday = day.date === today();
      const cards = day.events.slice(0, calendar.mode === 'week' ? 8 : 3).map((event) => `<button class="tcEvent due-${esc(event.due.id)}" data-calendar-event="${esc(event.id)}"><b>${esc(event.topic)}</b><span>${esc(event.ownerName)}</span></button>`).join('');
      const extra = day.events.length > (calendar.mode === 'week' ? 8 : 3) ? `<small class="tcMore">+${day.events.length - (calendar.mode === 'week' ? 8 : 3)} revisão(ões)</small>` : '';
      return `<div class="tcDay${day.inPeriod ? '' : ' outside'}${isToday ? ' today' : ''}"><header><b>${dayNumber}</b><span>${day.events.length || ''}</span></header>${cards}${extra}</div>`;
    }).join('')}`;
    container.querySelectorAll('[data-calendar-event]').forEach((button) => { button.onclick = () => openEvent(button.dataset.calendarEvent); });
  }

  function renderOwners() {
    const container = $('tcOwners');
    if (!container) return;
    const events = buildEvents();
    const rows = owners();
    container.innerHTML = rows.length ? rows.map((owner) => {
      const assigned = events.filter((event) => event.ownerId === owner.id).length;
      const due = events.filter((event) => event.ownerId === owner.id && daysUntil(event.date) <= 7).length;
      return `<article class="tcOwner ${owner.active ? '' : 'inactive'}"><div><b>${esc(owner.name)}</b><span>${esc(owner.role || owner.email || 'Responsável')}</span></div><small>${assigned} fonte(s) · ${due} próximas</small><button class="btn small" data-owner-edit="${esc(owner.id)}">Editar</button></article>`;
    }).join('') : '<div class="empty compact"><p class="muted">Cadastre responsáveis para distribuir as revisões.</p></div>';
    container.querySelectorAll('[data-owner-edit]').forEach((button) => { button.onclick = () => openOwner(button.dataset.ownerEdit); });
    const select = $('tcOwnerFilter');
    const selected = select.value || settings().ownerFilter || 'all';
    select.innerHTML = '<option value="all">Todos os responsáveis</option><option value="unassigned">Sem responsável</option>' + rows.filter((owner) => owner.active).map((owner) => `<option value="${esc(owner.id)}">${esc(owner.name)}</option>`).join('');
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function renderAlerts() {
    const container = $('tcAlerts');
    if (!container) return;
    const rows = buildAlerts(buildEvents());
    container.innerHTML = rows.length ? rows.slice(0, 12).map((alert) => `<article class="tcAlert ${alert.severity}"><div><b>${esc(alert.topic)}</b><span>${esc(alert.alertLabel)} · ${esc(alert.ownerName)}</span></div><div class="actions"><button class="btn small" data-alert-open="${esc(alert.id)}">Abrir</button><button class="btn small" data-alert-dismiss="${esc(alert.id)}">Dispensar hoje</button></div></article>`).join('') : '<div class="empty compact"><p class="muted">Nenhum alerta no horizonte configurado.</p></div>';
    container.querySelectorAll('[data-alert-open]').forEach((button) => { button.onclick = () => openEvent(button.dataset.alertOpen); });
    container.querySelectorAll('[data-alert-dismiss]').forEach((button) => { button.onclick = () => { dismissAlert(button.dataset.alertDismiss, today()); renderAll(); }; });
  }

  function renderAll() { renderSummary(); renderOwners(); renderCalendar(); renderAlerts(); maybeNotify(); }

  function openOwner(id = '') {
    const owner = owners().find((item) => item.id === id) || normalizeOwner({ name: '', email: '', role: '', active: true });
    $('tcOwnerId').value = id ? owner.id : '';
    $('tcOwnerName').value = id ? owner.name : '';
    $('tcOwnerEmail').value = owner.email;
    $('tcOwnerRole').value = owner.role;
    $('tcOwnerActive').checked = owner.active;
    $('tcOwnerTitle').textContent = id ? 'Editar responsável' : 'Novo responsável';
    $('trendOwnerModal').classList.add('open');
  }

  function saveOwner(event) {
    event.preventDefault();
    const id = $('tcOwnerId').value;
    const rows = owners();
    const existing = rows.find((item) => item.id === id);
    const owner = normalizeOwner({ ...existing, id: id || undefined, name: $('tcOwnerName').value, email: $('tcOwnerEmail').value, role: $('tcOwnerRole').value, active: $('tcOwnerActive').checked });
    saveOwners([owner, ...rows.filter((item) => item.id !== owner.id)]);
    $('trendOwnerModal').classList.remove('open');
    renderAll();
    toast('Responsável salvo.');
  }

  function openEvent(signalId) {
    const event = buildEvents().find((item) => item.id === signalId);
    if (!event) return;
    $('tcEventId').value = signalId;
    $('tcEventTitle').textContent = event.topic;
    $('tcEventSource').textContent = `${event.sourceName} · ${event.due.label}`;
    $('tcEventDate').value = event.date;
    $('tcEventPriority').value = event.priority;
    $('tcEventState').value = event.state;
    $('tcEventNote').value = '';
    const select = $('tcEventOwner');
    select.innerHTML = '<option value="">Sem responsável</option>' + owners().filter((owner) => owner.active || owner.id === event.ownerId).map((owner) => `<option value="${esc(owner.id)}">${esc(owner.name)}</option>`).join('');
    select.value = event.ownerId;
    $('trendCalendarEventModal').classList.add('open');
  }

  function saveEvent(event) {
    event.preventDefault();
    const signalId = $('tcEventId').value;
    scheduleReview(signalId, $('tcEventDate').value, {
      owner: $('tcEventOwner').value,
      priority: $('tcEventPriority').value,
      state: $('tcEventState').value,
      note: $('tcEventNote').value,
    });
    $('trendCalendarEventModal').classList.remove('open');
    renderAll();
    toast('Agenda da fonte atualizada.');
  }

  function movePeriod(direction) {
    const current = settings();
    const date = parseDate(current.anchor || today());
    if (current.view === 'week') date.setDate(date.getDate() + direction * 7);
    else date.setMonth(date.getMonth() + direction, 1);
    saveSettings({ anchor: date.toISOString().slice(0, 10) });
    renderCalendar();
  }

  function maybeNotify() {
    const current = settings();
    if (!current.browserNotifications || typeof Notification === 'undefined' || Notification.permission !== 'granted' || current.lastNotificationDate === today()) return;
    const alerts = buildAlerts(buildEvents());
    if (!alerts.length) return;
    const critical = alerts.filter((item) => item.severity === 'critical').length;
    new Notification('Commerce Radar — revisões de fontes', { body: `${alerts.length} alerta(s), ${critical} crítico(s). Abra o calendário para revisar.` });
    saveSettings({ lastNotificationDate: today() });
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return toast('Este navegador não oferece notificações.', true);
    const permission = await Notification.requestPermission();
    saveSettings({ browserNotifications: permission === 'granted', lastNotificationDate: '' });
    toast(permission === 'granted' ? 'Notificações locais ativadas.' : 'Permissão não concedida.', permission !== 'granted');
    renderAlerts();
    maybeNotify();
  }

  function saveAlertSettings() {
    saveSettings({ leadDays: Math.max(1, Math.min(30, Number($('tcLeadDays').value || 7))) });
    renderAll();
    toast('Horizonte dos alertas atualizado.');
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'trendCalendar'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'trendCalendarNav'));
    const title = $('title');
    if (title) title.textContent = 'Organize responsáveis, prazos e alertas';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.trendOwners = K.owners;
      keys.trendCalendarSettings = K.settings;
      keys.trendAlertState = K.alertState;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { owners: [], settings: {}, alertState: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup');
      const input = $('restoreFile');
      const merge = $('mergeRestore');
      const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 180) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.5.2', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.trendOwners = owners();
        payload.trendCalendarSettings = settings();
        payload.trendAlertState = alertState();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `commerce-radar-backup-${today()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            owners: Array.isArray(payload.trendOwners) ? payload.trendOwners.map(normalizeOwner) : [],
            settings: payload.trendCalendarSettings && typeof payload.trendCalendarSettings === 'object' ? payload.trendCalendarSettings : {},
            alertState: payload.trendAlertState && typeof payload.trendAlertState === 'object' ? payload.trendAlertState : {},
          };
        } catch { pending = { owners: [], settings: {}, alertState: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        saveOwners([...new Map([...owners(), ...pending.owners].map((item) => [item.id, item])).values()]);
        saveSettings(pending.settings);
        saveAlertState({ ...alertState(), ...pending.alertState, dismissed: { ...(alertState().dismissed || {}), ...(pending.alertState.dismissed || {}) } });
        renderAll();
      });
      replace.addEventListener('click', () => {
        saveOwners(pending.owners);
        write(K.settings, pending.settings);
        write(K.alertState, pending.alertState);
        renderAll();
      });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const queueNav = $('trendQueueNav');
    const queueView = $('trendQueue');
    if (!queueNav || !queueView || $('trendCalendarNav')) return false;
    queueNav.insertAdjacentHTML('afterend', '<button class="nav" id="trendCalendarNav"><span>Calendário de revisões</span><b id="trendCalendarNavCount"></b></button>');
    queueView.insertAdjacentHTML('afterend', `<section class="view" id="trendCalendar"><div class="sectionHead"><div><span class="eyebrow">COORDENAÇÃO DAS FONTES</span><h2>Calendário de revisões</h2><p class="muted">Distribua responsáveis, acompanhe a agenda semanal ou mensal e trate alertas antes que os sinais envelheçam.</p></div><div class="actions"><button class="btn" id="tcNotify">Ativar notificações</button><button class="btn primary" id="tcNewOwner">Novo responsável</button></div></div><div class="tcSummary" id="trendCalendarSummary"></div><div class="card tcToolbar"><div class="actions"><button class="btn small" id="tcPrev">Anterior</button><button class="btn small" id="tcToday">Hoje</button><button class="btn small" id="tcNext">Próximo</button></div><h3 id="tcPeriodLabel"></h3><div class="actions"><button class="btn small" id="tcMonthMode">Mês</button><button class="btn small" id="tcWeekMode">Semana</button><select id="tcOwnerFilter" class="tcSelect"><option value="all">Todos</option></select></div></div><div class="tcLayout"><main><div id="trendCalendarGrid" class="tcCalendar"></div></main><aside><article class="card"><div class="sectionHead"><div><span class="eyebrow">RESPONSÁVEIS</span><h3>Distribuição</h3></div></div><div id="tcOwners"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">ALERTAS</span><h3>Próximas ações</h3></div></div><label class="field"><span>Alertar com antecedência</span><div class="tcInline"><input id="tcLeadDays" type="number" min="1" max="30" value="7"><button class="btn small" id="tcSaveAlerts">Salvar</button></div></label><div id="tcAlerts"></div></article></aside></div></section>`);
    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="trendOwnerModal"><div class="card modalBox"><div class="modalHead"><div><span class="eyebrow">RESPONSÁVEL</span><h2 id="tcOwnerTitle">Novo responsável</h2></div><button class="btn small" id="tcOwnerClose" type="button">Fechar</button></div><form id="tcOwnerForm"><input id="tcOwnerId" type="hidden"><div class="grid"><label class="field wide"><span>Nome</span><input id="tcOwnerName" required maxlength="100"></label><label class="field wide"><span>E-mail</span><input id="tcOwnerEmail" type="email" maxlength="180"></label><label class="field wide"><span>Função</span><input id="tcOwnerRole" maxlength="100" placeholder="Pesquisa, operação, conteúdo..."></label><label class="check wide"><input id="tcOwnerActive" type="checkbox" checked><span>Responsável ativo</span></label></div><div class="formFooter"><button class="btn primary">Salvar responsável</button></div></form></div></div><div class="modal" id="trendCalendarEventModal"><div class="card modalBox wideModal"><div class="modalHead"><div><span class="eyebrow">AGENDA DA FONTE</span><h2 id="tcEventTitle">Agendar revisão</h2><p id="tcEventSource" class="muted"></p></div><button class="btn small" id="tcEventClose" type="button">Fechar</button></div><form id="tcEventForm"><input id="tcEventId" type="hidden"><div class="grid"><label class="field"><span>Próxima revisão</span><input id="tcEventDate" type="date" required></label><label class="field"><span>Responsável</span><select id="tcEventOwner"></select></label><label class="field"><span>Prioridade</span><select id="tcEventPriority"><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></label><label class="field"><span>Estado</span><select id="tcEventState"><option value="pending">Pendente</option><option value="reviewing">Em revisão</option><option value="reviewed">Revisado</option><option value="snoozed">Adiado</option></select></label><label class="field wide"><span>Nota da alteração</span><textarea id="tcEventNote" rows="4" maxlength="1000"></textarea></label></div><div class="formFooter"><button class="btn primary">Salvar agenda</button></div></form></div></div><div id="trendCalendarToast" class="v021Toast"></div>`);
    $('trendCalendarNav').onclick = showView;
    $('tcNewOwner').onclick = () => openOwner();
    $('tcOwnerClose').onclick = () => $('trendOwnerModal').classList.remove('open');
    $('tcOwnerForm').addEventListener('submit', saveOwner);
    $('tcEventClose').onclick = () => $('trendCalendarEventModal').classList.remove('open');
    $('tcEventForm').addEventListener('submit', saveEvent);
    $('tcPrev').onclick = () => movePeriod(-1);
    $('tcNext').onclick = () => movePeriod(1);
    $('tcToday').onclick = () => { saveSettings({ anchor: today() }); renderCalendar(); };
    $('tcMonthMode').onclick = () => { saveSettings({ view: 'month', anchor: monthStart(calendarAnchor()) }); renderCalendar(); };
    $('tcWeekMode').onclick = () => { saveSettings({ view: 'week', anchor: calendarAnchor() }); renderCalendar(); };
    $('tcOwnerFilter').onchange = () => { saveSettings({ ownerFilter: $('tcOwnerFilter').value }); renderCalendar(); };
    $('tcNotify').onclick = requestNotifications;
    $('tcSaveAlerts').onclick = saveAlertSettings;
    $('tcLeadDays').value = settings().leadDays;
    $('tcOwnerFilter').value = settings().ownerFilter;
    extendCloud();
    enhanceBackup();
    renderAll();
    ROOT.addEventListener?.('commerce-radar-review-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(K).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 180) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarReviewCalendar = {
    K,
    normalizeOwner,
    buildEvents,
    buildCalendar,
    buildAlerts,
    assignOwner,
    scheduleReview,
    dismissAlert,
    daysUntil,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();
