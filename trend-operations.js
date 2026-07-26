(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const K = {
    queue: 'tehkne-commerce-radar-v51-review-queue',
    history: 'tehkne-commerce-radar-v51-signal-history',
    owners: 'tehkne-commerce-radar-v52-review-owners',
    settings: 'tehkne-commerce-radar-v53-operational-settings',
    snapshots: 'tehkne-commerce-radar-v53-compliance-snapshots',
    runs: 'tehkne-commerce-radar-v53-routine-runs',
  };
  const DEFAULTS = { periodDays: 7, defaultWeeklyCapacity: 8, ownerCapacity: {}, dailyTarget: 5 };
  const REVIEW_ACTIONS = new Set(['source_reviewed', 'batch_review']);
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const parseDate = (value) => { const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; };
  const iso = (value) => { const date = parseDate(value); return date ? date.toISOString().slice(0, 10) : ''; };
  const addDays = (value, days) => { const date = parseDate(value || today()); if (!date) return ''; date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); };
  const inRange = (value, start, end) => { const date = iso(value); return Boolean(date && date >= start && date <= end); };

  function settings() { return { ...DEFAULTS, ...read(K.settings, {}), ownerCapacity: { ...(read(K.settings, {}).ownerCapacity || {}) } }; }
  function saveSettings(patch) { write(K.settings, { ...settings(), ...patch, ownerCapacity: { ...settings().ownerCapacity, ...(patch.ownerCapacity || {}) } }); }
  function owners() { return read(K.owners, []).filter((owner) => owner?.active !== false); }
  function metadata() { return read(K.queue, []); }
  function history() { return read(K.history, []); }
  function snapshots() { return read(K.snapshots, []); }
  function runs() { return read(K.runs, []); }
  function calendarEvents(reference = today()) { return ROOT.CommerceRadarReviewCalendar?.buildEvents?.(undefined, undefined, undefined, reference) || []; }

  function completedReviews(start, end, rawHistory = history()) {
    const seen = new Set();
    return rawHistory.filter((entry) => REVIEW_ACTIONS.has(entry.action) && inRange(entry.at, start, end)).filter((entry) => {
      const key = `${entry.signalId}:${String(entry.at).slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function complianceMetrics(rawEvents = calendarEvents(), rawHistory = history(), periodDays = 7, reference = today()) {
    const days = Math.max(1, Math.min(90, Number(periodDays || 7)));
    const start = addDays(reference, -(days - 1));
    const completed = completedReviews(start, reference, rawHistory);
    const overdue = rawEvents.filter((event) => event.date < reference);
    const dueToday = rawEvents.filter((event) => event.date === reference);
    const scheduled = completed.length + overdue.length;
    const compliance = scheduled ? Math.round((completed.length / scheduled) * 100) : 100;
    return { start, end: reference, days, completed: completed.length, overdue: overdue.length, dueToday: dueToday.length, scheduled, compliance };
  }

  function workloadByOwner(rawEvents = calendarEvents(), rawOwners = owners(), rawHistory = history(), reference = today(), rawSettings = settings()) {
    const currentOwners = [...rawOwners];
    if (rawEvents.some((event) => !event.ownerId)) currentOwners.push({ id: 'unassigned', name: 'Sem responsável', active: true });
    const sevenStart = addDays(reference, -6);
    return currentOwners.map((owner) => {
      const events = rawEvents.filter((event) => owner.id === 'unassigned' ? !event.ownerId : event.ownerId === owner.id);
      const overdue = events.filter((event) => event.date < reference).length;
      const due7 = events.filter((event) => event.date >= reference && event.date <= addDays(reference, 7)).length;
      const due30 = events.filter((event) => event.date >= reference && event.date <= addDays(reference, 30)).length;
      const signalIds = new Set(events.map((event) => event.id));
      const completed7 = completedReviews(sevenStart, reference, rawHistory).filter((entry) => signalIds.has(entry.signalId)).length;
      const capacity = owner.id === 'unassigned' ? 0 : Math.max(1, Number(rawSettings.ownerCapacity?.[owner.id] || rawSettings.defaultWeeklyCapacity || 8));
      const demand = overdue + due7;
      const utilization = capacity ? Math.round((demand / capacity) * 100) : (demand ? 999 : 0);
      const status = owner.id === 'unassigned' ? (demand ? 'Sem dono' : 'Livre') : utilization > 100 ? 'Sobrecarregado' : utilization >= 80 ? 'Atenção' : 'Saudável';
      return { ownerId: owner.id, ownerName: owner.name, assigned: events.length, overdue, due7, due30, completed7, capacity, demand, utilization, status };
    }).sort((a, b) => b.overdue - a.overdue || b.utilization - a.utilization || a.ownerName.localeCompare(b.ownerName));
  }

  function routineItems(rawEvents = calendarEvents(), rawWorkload = workloadByOwner(rawEvents), reference = today(), rawSettings = settings()) {
    const overdue = rawEvents.filter((event) => event.date < reference).length;
    const dueToday = rawEvents.filter((event) => event.date === reference).length;
    const unassigned = rawEvents.filter((event) => !event.ownerId && event.date <= addDays(reference, 7)).length;
    const contradictions = rawEvents.filter((event) => event.contradiction && event.date <= addDays(reference, 15)).length;
    const overloaded = rawWorkload.filter((row) => row.status === 'Sobrecarregado').length;
    return [
      { id: 'review-overdue', label: `Tratar fontes atrasadas (${overdue})`, count: overdue, critical: overdue > 0 },
      { id: 'review-today', label: `Concluir revisões de hoje (${dueToday})`, count: dueToday, critical: dueToday > 0 },
      { id: 'assign-unowned', label: `Atribuir fontes sem responsável (${unassigned})`, count: unassigned, critical: unassigned > 0 },
      { id: 'resolve-contradictions', label: `Revisar contradições próximas (${contradictions})`, count: contradictions, critical: contradictions > 0 },
      { id: 'rebalance-workload', label: `Rebalancear responsáveis sobrecarregados (${overloaded})`, count: overloaded, critical: overloaded > 0 },
      { id: 'daily-target', label: `Concluir meta diária de ${Math.max(1, Number(rawSettings.dailyTarget || 5))} revisões`, count: 1, critical: false },
    ];
  }

  function routineRun(date = today(), type = 'daily', generated = routineItems()) {
    const current = runs().find((run) => run.date === date && run.type === type);
    const prior = new Map((current?.items || []).map((item) => [item.id, item]));
    return {
      id: current?.id || `routine-${type}-${date}`,
      date,
      type,
      items: generated.map((item) => ({ ...item, done: Boolean(prior.get(item.id)?.done), doneAt: prior.get(item.id)?.doneAt || '' })),
      updatedAt: new Date().toISOString(),
    };
  }

  function saveRoutineRun(run) { write(K.runs, [run, ...runs().filter((item) => item.id !== run.id)].slice(0, 180)); return run; }
  function toggleRoutineItem(itemId, done, date = today()) {
    const run = routineRun(date);
    run.items = run.items.map((item) => item.id === itemId ? { ...item, done, doneAt: done ? new Date().toISOString() : '' } : item);
    return saveRoutineRun(run);
  }

  function captureSnapshot(reference = today(), force = false) {
    const metrics = complianceMetrics(calendarEvents(reference), history(), settings().periodDays, reference);
    const workload = workloadByOwner(calendarEvents(reference), owners(), history(), reference, settings());
    const snapshot = { id: `snapshot-${reference}`, date: reference, metrics, workload, createdAt: new Date().toISOString() };
    const existing = snapshots();
    if (!force && existing.some((item) => item.date === reference)) return existing.find((item) => item.date === reference);
    write(K.snapshots, [snapshot, ...existing.filter((item) => item.date !== reference)].slice(0, 180));
    return snapshot;
  }

  function operationalReport(reference = today()) {
    const currentSettings = settings();
    const events = calendarEvents(reference);
    const metrics = complianceMetrics(events, history(), currentSettings.periodDays, reference);
    const workload = workloadByOwner(events, owners(), history(), reference, currentSettings);
    return { reference, metrics, workload, routine: routineRun(reference), snapshots: snapshots().slice(0, 14) };
  }

  function toast(message, error = false) {
    let node = $('trendOperationsToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'trendOperationsToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function renderSummary() {
    const node = $('toSummary');
    if (!node) return;
    const metrics = complianceMetrics(calendarEvents(), history(), settings().periodDays);
    const workload = workloadByOwner();
    const overloaded = workload.filter((row) => row.status === 'Sobrecarregado').length;
    node.innerHTML = [
      ['Cumprimento', `${metrics.compliance}%`, `${metrics.days} dias`],
      ['Concluídas', metrics.completed, 'no período'],
      ['Atrasadas', metrics.overdue, 'abertas'],
      ['Sobrecarga', overloaded, 'responsáveis'],
    ].map(([label, value, note]) => `<article class="card toMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const badge = $('trendOperationsNavCount');
    if (badge) badge.textContent = metrics.overdue + overloaded ? String(metrics.overdue + overloaded) : '';
  }

  function renderWorkload() {
    const node = $('toWorkload');
    if (!node) return;
    const rows = workloadByOwner();
    node.innerHTML = rows.length ? rows.map((row) => `<article class="card toOwner status-${row.status.toLocaleLowerCase('pt-BR').replace(/\s+/g, '-')}"><div class="toOwnerHead"><div><h3>${esc(row.ownerName)}</h3><span>${esc(row.status)}</span></div><strong>${row.utilization > 900 ? '—' : `${row.utilization}%`}</strong></div><div class="toOwnerStats"><span><b>${row.overdue}</b>Atrasadas</span><span><b>${row.due7}</b>Próx. 7 dias</span><span><b>${row.completed7}</b>Concluídas</span><span><b>${row.assigned}</b>Total</span></div>${row.ownerId !== 'unassigned' ? `<label class="field"><span>Capacidade semanal</span><input type="number" min="1" max="100" value="${row.capacity}" data-owner-capacity="${esc(row.ownerId)}"></label>` : ''}</article>`).join('') : '<div class="empty compact"><p class="muted">Nenhuma carga de trabalho disponível.</p></div>';
    node.querySelectorAll('[data-owner-capacity]').forEach((input) => {
      input.onchange = () => {
        const current = settings();
        saveSettings({ ownerCapacity: { ...current.ownerCapacity, [input.dataset.ownerCapacity]: Math.max(1, Number(input.value || current.defaultWeeklyCapacity)) } });
        renderAll();
        toast('Capacidade semanal atualizada.');
      };
    });
  }

  function renderRoutine() {
    const node = $('toRoutine');
    if (!node) return;
    const run = routineRun(today());
    const completed = run.items.filter((item) => item.done).length;
    node.innerHTML = `<div class="toRoutineProgress"><b>${completed}/${run.items.length}</b><span>ações concluídas hoje</span></div>${run.items.map((item) => `<label class="toRoutineItem${item.critical ? ' critical' : ''}"><input type="checkbox" data-routine-item="${esc(item.id)}" ${item.done ? 'checked' : ''}><span>${esc(item.label)}</span></label>`).join('')}`;
    node.querySelectorAll('[data-routine-item]').forEach((input) => { input.onchange = () => { toggleRoutineItem(input.dataset.routineItem, input.checked); renderRoutine(); }; });
  }

  function renderSnapshots() {
    const node = $('toSnapshots');
    if (!node) return;
    const rows = snapshots().slice(0, 14);
    node.innerHTML = rows.length ? `<div class="toSnapshotTable"><div class="head"><span>Data</span><span>Cumprimento</span><span>Concluídas</span><span>Atrasadas</span></div>${rows.map((item) => `<div><span>${new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')}</span><b>${item.metrics.compliance}%</b><span>${item.metrics.completed}</span><span>${item.metrics.overdue}</span></div>`).join('')}</div>` : '<div class="empty compact"><p class="muted">Capture o primeiro snapshot para iniciar a série histórica.</p></div>';
  }

  function renderAll() { renderSummary(); renderWorkload(); renderRoutine(); renderSnapshots(); }

  function exportReport() {
    const report = operationalReport();
    const lines = [
      '# Commerce Radar — Relatório operacional de revisões', '',
      `Data: ${new Date(`${report.reference}T12:00:00`).toLocaleDateString('pt-BR')}`, '',
      `- Cumprimento: ${report.metrics.compliance}%`,
      `- Revisões concluídas: ${report.metrics.completed}`,
      `- Atrasadas abertas: ${report.metrics.overdue}`,
      `- Previstas para hoje: ${report.metrics.dueToday}`, '',
      '## Carga por responsável', '',
      ...report.workload.map((row) => `- ${row.ownerName}: ${row.status}; ${row.overdue} atrasada(s); ${row.due7} nos próximos 7 dias; capacidade ${row.capacity || 'não definida'}.`), '',
      '## Rotina de hoje', '',
      ...report.routine.items.map((item) => `- [${item.done ? 'x' : ' '}] ${item.label}`), '',
      'Tehkné Solutions',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-operacao-${today()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'trendOperations'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'trendOperationsNav'));
    const title = $('title');
    if (title) title.textContent = 'Acompanhe cumprimento, capacidade e rotina';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.trendOperationalSettings = K.settings;
      keys.trendComplianceSnapshots = K.snapshots;
      keys.trendRoutineRuns = K.runs;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { settings: {}, snapshots: [], runs: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 180) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.5.3', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.trendOperationalSettings = settings();
        payload.trendComplianceSnapshots = snapshots();
        payload.trendRoutineRuns = runs();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            settings: payload.trendOperationalSettings && typeof payload.trendOperationalSettings === 'object' ? payload.trendOperationalSettings : {},
            snapshots: Array.isArray(payload.trendComplianceSnapshots) ? payload.trendComplianceSnapshots : [],
            runs: Array.isArray(payload.trendRoutineRuns) ? payload.trendRoutineRuns : [],
          };
        } catch { pending = { settings: {}, snapshots: [], runs: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        saveSettings(pending.settings);
        write(K.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id || item.date, item])).values()].slice(0, 180));
        write(K.runs, [...new Map([...runs(), ...pending.runs].map((item) => [item.id, item])).values()].slice(0, 180));
        renderAll();
      });
      replace.addEventListener('click', () => { write(K.settings, pending.settings); write(K.snapshots, pending.snapshots); write(K.runs, pending.runs); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const calendarNav = $('trendCalendarNav'); const calendarView = $('trendCalendar');
    if (!calendarNav || !calendarView || $('trendOperationsNav')) return false;
    calendarNav.insertAdjacentHTML('afterend', '<button class="nav" id="trendOperationsNav"><span>Operação de revisões</span><b id="trendOperationsNavCount"></b></button>');
    calendarView.insertAdjacentHTML('afterend', `<section class="view" id="trendOperations"><div class="sectionHead"><div><span class="eyebrow">GESTÃO OPERACIONAL</span><h2>Cumprimento, carga e rotina</h2><p class="muted">Acompanhe o ritmo das revisões, distribua capacidade e execute uma rotina diária previsível.</p></div><div class="actions"><button class="btn" id="toCapture">Capturar snapshot</button><button class="btn primary" id="toExport">Exportar relatório</button></div></div><div class="toSummary" id="toSummary"></div><div class="card toToolbar"><label class="field"><span>Período do cumprimento</span><select id="toPeriod"><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select></label><label class="field"><span>Capacidade semanal padrão</span><input id="toDefaultCapacity" type="number" min="1" max="100"></label><label class="field"><span>Meta diária</span><input id="toDailyTarget" type="number" min="1" max="100"></label><button class="btn" id="toSaveSettings">Salvar parâmetros</button></div><div class="toLayout"><main><article><div class="sectionHead"><div><span class="eyebrow">CARGA</span><h3>Capacidade por responsável</h3></div></div><div class="toWorkload" id="toWorkload"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">HISTÓRICO</span><h3>Snapshots de cumprimento</h3></div></div><div id="toSnapshots"></div></article></main><aside><article class="card"><div class="sectionHead"><div><span class="eyebrow">HOJE</span><h3>Rotina operacional</h3></div></div><div id="toRoutine"></div></article><article class="card"><span class="eyebrow">MÉTODO</span><h3>Como interpretar</h3><ul class="toMethod"><li>Cumprimento = concluídas ÷ concluídas + atrasadas abertas.</li><li>Sobrecarga considera atrasadas e próximas de 7 dias.</li><li>Capacidade é uma premissa operacional, não produtividade garantida.</li><li>Snapshots diários formam a série histórica da equipe.</li></ul></article></aside></div></section><div id="trendOperationsToast" class="v021Toast"></div>`);
    $('trendOperationsNav').onclick = showView;
    $('toPeriod').value = String(settings().periodDays);
    $('toDefaultCapacity').value = settings().defaultWeeklyCapacity;
    $('toDailyTarget').value = settings().dailyTarget;
    $('toSaveSettings').onclick = () => {
      saveSettings({ periodDays: Number($('toPeriod').value), defaultWeeklyCapacity: Math.max(1, Number($('toDefaultCapacity').value || 8)), dailyTarget: Math.max(1, Number($('toDailyTarget').value || 5)) });
      renderAll(); toast('Parâmetros operacionais atualizados.');
    };
    $('toCapture').onclick = () => { captureSnapshot(today(), true); renderSnapshots(); toast('Snapshot operacional capturado.'); };
    $('toExport').onclick = exportReport;
    extendCloud(); enhanceBackup(); captureSnapshot(); renderAll();
    ROOT.addEventListener?.('commerce-radar-review-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(K).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 240) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarReviewOperations = { K, complianceMetrics, workloadByOwner, routineItems, routineRun, toggleRoutineItem, captureSnapshot, operationalReport };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();