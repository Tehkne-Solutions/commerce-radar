(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const K = {
    snapshots: 'tehkne-commerce-radar-v53-compliance-snapshots',
    owners: 'tehkne-commerce-radar-v52-review-owners',
    settings: 'tehkne-commerce-radar-v54-sla-settings',
    closings: 'tehkne-commerce-radar-v54-weekly-closings',
  };
  const DEFAULTS = {
    teamComplianceTarget: 85,
    maxTeamOverdue: 2,
    maxUtilization: 100,
    ownerComplianceTarget: 80,
    maxOwnerOverdue: 1,
    lookbackWeeks: 4,
  };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const parseDate = (value) => { const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; };
  const iso = (value) => { const date = parseDate(value); return date ? date.toISOString().slice(0, 10) : ''; };
  const addDays = (value, days) => { const date = parseDate(value || today()); if (!date) return ''; date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); };
  const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length) : 0;

  function weekStart(value = today()) {
    const date = parseDate(value) || parseDate(today());
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date.toISOString().slice(0, 10);
  }
  function weekEnd(value = today()) { return addDays(weekStart(value), 6); }
  function settings() { return { ...DEFAULTS, ...read(K.settings, {}) }; }
  function saveSettings(patch) { const next = { ...settings(), ...patch }; write(K.settings, next); return next; }
  function snapshots() { return read(K.snapshots, []).filter((item) => item?.date).sort((a, b) => a.date.localeCompare(b.date)); }
  function owners() { return read(K.owners, []).filter((item) => item?.active !== false); }
  function closings() { return read(K.closings, []).sort((a, b) => String(b.weekStart).localeCompare(String(a.weekStart))); }

  function ownerCompliance(row = {}) {
    const completed = Number(row.completed7 || 0);
    const overdue = Number(row.overdue || 0);
    const denominator = completed + overdue;
    return denominator ? Math.round((completed / denominator) * 100) : 100;
  }

  function weeklySummary(rawSnapshots = snapshots(), reference = today()) {
    const start = weekStart(reference);
    const end = weekEnd(reference);
    const rows = rawSnapshots.filter((item) => item.date >= start && item.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    if (!rows.length) return { weekStart: start, weekEnd: end, hasData: false, days: 0, compliance: 0, completed: 0, overdue: 0, dueToday: 0, overloaded: 0, owners: [] };
    const latest = rows[rows.length - 1];
    const ownerIds = new Set(rows.flatMap((item) => (item.workload || []).map((row) => row.ownerId)));
    const ownerRows = [...ownerIds].map((ownerId) => {
      const observations = rows.map((item) => (item.workload || []).find((row) => row.ownerId === ownerId)).filter(Boolean);
      const last = observations[observations.length - 1] || {};
      return {
        ownerId,
        ownerName: last.ownerName || ownerId || 'Sem responsável',
        compliance: ownerCompliance(last),
        overdue: Number(last.overdue || 0),
        completed: Number(last.completed7 || 0),
        utilization: average(observations.map((row) => row.utilization > 900 ? 0 : row.utilization)),
        status: last.status || '',
      };
    });
    return {
      weekStart: start,
      weekEnd: end,
      hasData: true,
      days: rows.length,
      compliance: average(rows.map((item) => item.metrics?.compliance)),
      completed: Math.max(...rows.map((item) => Number(item.metrics?.completed || 0))),
      overdue: Number(latest.metrics?.overdue || 0),
      dueToday: Number(latest.metrics?.dueToday || 0),
      overloaded: ownerRows.filter((row) => row.utilization > 100).length,
      owners: ownerRows.sort((a, b) => b.overdue - a.overdue || b.utilization - a.utilization || a.ownerName.localeCompare(b.ownerName)),
    };
  }

  function compareWeeks(current, previous) {
    return {
      compliance: Number(current.compliance || 0) - Number(previous.compliance || 0),
      completed: Number(current.completed || 0) - Number(previous.completed || 0),
      overdue: Number(current.overdue || 0) - Number(previous.overdue || 0),
      overloaded: Number(current.overloaded || 0) - Number(previous.overloaded || 0),
    };
  }

  function evaluateSla(summary, rawSettings = settings()) {
    const teamChecks = [
      { id: 'team-compliance', label: 'Cumprimento da equipe', value: summary.compliance, target: rawSettings.teamComplianceTarget, pass: summary.hasData && summary.compliance >= rawSettings.teamComplianceTarget },
      { id: 'team-overdue', label: 'Atrasos abertos', value: summary.overdue, target: rawSettings.maxTeamOverdue, pass: summary.hasData && summary.overdue <= rawSettings.maxTeamOverdue },
      { id: 'team-utilization', label: 'Sobrecarga', value: summary.overloaded, target: 0, pass: summary.hasData && summary.owners.every((row) => row.utilization <= rawSettings.maxUtilization) },
    ];
    const failures = teamChecks.filter((item) => !item.pass).length;
    const status = !summary.hasData ? 'Sem dados' : failures === 0 ? 'Dentro do SLA' : failures === 1 ? 'Atenção' : 'Fora do SLA';
    const ownerChecks = summary.owners.map((owner) => {
      const checks = {
        compliance: owner.compliance >= rawSettings.ownerComplianceTarget,
        overdue: owner.overdue <= rawSettings.maxOwnerOverdue,
        utilization: owner.utilization <= rawSettings.maxUtilization,
      };
      const ownerFailures = Object.values(checks).filter((pass) => !pass).length;
      return { ...owner, checks, failures: ownerFailures, slaStatus: ownerFailures === 0 ? 'Dentro do SLA' : ownerFailures === 1 ? 'Atenção' : 'Fora do SLA' };
    });
    return { status, failures, teamChecks, owners: ownerChecks };
  }

  function weeklyTrend(rawSnapshots = snapshots(), count = 8, reference = today()) {
    const currentStart = weekStart(reference);
    return Array.from({ length: Math.max(1, count) }, (_, index) => weeklySummary(rawSnapshots, addDays(currentStart, -7 * index))).reverse();
  }

  function recurringDeviations(rawSnapshots = snapshots(), rawSettings = settings(), reference = today()) {
    const weeks = weeklyTrend(rawSnapshots, Math.max(2, Number(rawSettings.lookbackWeeks || 4)), reference);
    const ownerMap = new Map();
    for (const week of weeks) {
      const evaluation = evaluateSla(week, rawSettings);
      for (const owner of evaluation.owners) {
        const current = ownerMap.get(owner.ownerId) || { ownerId: owner.ownerId, ownerName: owner.ownerName, weeksObserved: 0, complianceBreaches: 0, overdueBreaches: 0, utilizationBreaches: 0 };
        current.weeksObserved += 1;
        if (!owner.checks.compliance) current.complianceBreaches += 1;
        if (!owner.checks.overdue) current.overdueBreaches += 1;
        if (!owner.checks.utilization) current.utilizationBreaches += 1;
        ownerMap.set(owner.ownerId, current);
      }
    }
    return [...ownerMap.values()].map((item) => ({ ...item, totalBreaches: item.complianceBreaches + item.overdueBreaches + item.utilizationBreaches })).filter((item) => item.totalBreaches >= 2).sort((a, b) => b.totalBreaches - a.totalBreaches || a.ownerName.localeCompare(b.ownerName));
  }

  function normalizeAction(raw = {}) {
    return {
      id: safe(raw.id, 120) || `action-${uid()}`,
      description: safe(raw.description, 500),
      owner: safe(raw.owner, 120),
      dueDate: iso(raw.dueDate),
      status: raw.status === 'done' ? 'done' : 'pending',
      completedAt: raw.status === 'done' ? (raw.completedAt || new Date().toISOString()) : '',
    };
  }

  function buildClosing(rawSnapshots = snapshots(), rawSettings = settings(), reference = today(), data = {}) {
    const summary = weeklySummary(rawSnapshots, reference);
    const previous = weeklySummary(rawSnapshots, addDays(summary.weekStart, -7));
    const evaluation = evaluateSla(summary, rawSettings);
    return {
      id: data.id || `closing-${summary.weekStart}`,
      weekStart: summary.weekStart,
      weekEnd: summary.weekEnd,
      status: data.status === 'closed' ? 'closed' : 'draft',
      summary,
      previous,
      comparison: compareWeeks(summary, previous),
      evaluation,
      deviations: recurringDeviations(rawSnapshots, rawSettings, reference),
      decisions: safe(data.decisions, 4000),
      actions: Array.isArray(data.actions) ? data.actions.map(normalizeAction).filter((item) => item.description) : [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedAt: data.status === 'closed' ? (data.closedAt || new Date().toISOString()) : '',
      signature: 'Tehkné Solutions',
    };
  }

  function saveClosing(closing) {
    const normalized = buildClosing(snapshots(), settings(), closing.weekStart, closing);
    write(K.closings, [normalized, ...closings().filter((item) => item.id !== normalized.id)].slice(0, 104));
    return normalized;
  }

  let editorActions = [];
  function selectedReference() { return $('tsWeek')?.value || today(); }
  function currentClosing() { const start = weekStart(selectedReference()); return closings().find((item) => item.weekStart === start); }

  function toast(message, error = false) {
    let node = $('trendSlaToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'trendSlaToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function delta(value, inverse = false) {
    const number = Number(value || 0);
    const good = inverse ? number <= 0 : number >= 0;
    return `<span class="tsDelta ${good ? 'good' : 'bad'}">${number > 0 ? '+' : ''}${number}</span>`;
  }

  function renderSummary() {
    const node = $('tsSummary'); if (!node) return;
    const summary = weeklySummary(snapshots(), selectedReference());
    const previous = weeklySummary(snapshots(), addDays(summary.weekStart, -7));
    const comparison = compareWeeks(summary, previous);
    const evaluation = evaluateSla(summary);
    node.innerHTML = [
      ['SLA da semana', evaluation.status, `${summary.days} snapshot(s)`],
      ['Cumprimento', `${summary.compliance}% ${delta(comparison.compliance)}`, `meta ${settings().teamComplianceTarget}%`],
      ['Atrasadas', `${summary.overdue} ${delta(comparison.overdue, true)}`, `limite ${settings().maxTeamOverdue}`],
      ['Sobrecarga', `${summary.overloaded} ${delta(comparison.overloaded, true)}`, 'responsáveis'],
    ].map(([label, value, note]) => `<article class="card tsMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const badge = $('trendSlaNavCount');
    if (badge) badge.textContent = evaluation.failures ? String(evaluation.failures) : '';
  }

  function renderTrend() {
    const node = $('tsTrend'); if (!node) return;
    const rows = weeklyTrend(snapshots(), 8, selectedReference());
    node.innerHTML = `<div class="tsTable"><div class="head"><span>Semana</span><span>Cumprimento</span><span>Atrasos</span><span>Sobrecarga</span><span>Dados</span></div>${rows.map((row) => `<div><span>${new Date(`${row.weekStart}T12:00:00`).toLocaleDateString('pt-BR')}–${new Date(`${row.weekEnd}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span><b>${row.hasData ? `${row.compliance}%` : '—'}</b><span>${row.hasData ? row.overdue : '—'}</span><span>${row.hasData ? row.overloaded : '—'}</span><span>${row.days}</span></div>`).join('')}</div>`;
  }

  function renderOwners() {
    const node = $('tsOwners'); if (!node) return;
    const evaluation = evaluateSla(weeklySummary(snapshots(), selectedReference()));
    node.innerHTML = evaluation.owners.length ? evaluation.owners.map((owner) => `<article class="card tsOwner ${owner.slaStatus === 'Fora do SLA' ? 'breach' : owner.slaStatus === 'Atenção' ? 'warning' : 'ok'}"><div><h3>${esc(owner.ownerName)}</h3><span>${esc(owner.slaStatus)}</span></div><div class="tsOwnerStats"><span><b>${owner.compliance}%</b>Cumprimento</span><span><b>${owner.overdue}</b>Atrasos</span><span><b>${owner.utilization}%</b>Utilização</span></div></article>`).join('') : '<div class="empty compact"><p class="muted">Ainda não há snapshots suficientes nesta semana.</p></div>';
  }

  function renderDeviations() {
    const node = $('tsDeviations'); if (!node) return;
    const rows = recurringDeviations(snapshots(), settings(), selectedReference());
    node.innerHTML = rows.length ? rows.map((item) => `<article class="tsDeviation"><div><b>${esc(item.ownerName)}</b><span>${item.totalBreaches} desvio(s) em ${item.weeksObserved} semana(s)</span></div><small>${item.complianceBreaches} cumprimento · ${item.overdueBreaches} atrasos · ${item.utilizationBreaches} carga</small></article>`).join('') : '<div class="empty compact"><p class="muted">Nenhum desvio recorrente identificado no horizonte configurado.</p></div>';
  }

  function renderActions() {
    const node = $('tsActions'); if (!node) return;
    node.innerHTML = editorActions.length ? editorActions.map((action) => `<article class="tsAction"><label><input type="checkbox" data-action-toggle="${esc(action.id)}" ${action.status === 'done' ? 'checked' : ''}><span>${esc(action.description)}</span></label><small>${esc(action.owner || 'Sem responsável')} · ${action.dueDate ? new Date(`${action.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : 'sem prazo'}</small><button class="btn small" data-action-remove="${esc(action.id)}">Remover</button></article>`).join('') : '<p class="muted">Nenhuma ação adicionada ao fechamento.</p>';
    node.querySelectorAll('[data-action-toggle]').forEach((input) => { input.onchange = () => { editorActions = editorActions.map((item) => item.id === input.dataset.actionToggle ? { ...item, status: input.checked ? 'done' : 'pending', completedAt: input.checked ? new Date().toISOString() : '' } : item); renderActions(); }; });
    node.querySelectorAll('[data-action-remove]').forEach((button) => { button.onclick = () => { editorActions = editorActions.filter((item) => item.id !== button.dataset.actionRemove); renderActions(); }; });
  }

  function loadEditor() {
    const closing = currentClosing();
    editorActions = (closing?.actions || []).map(normalizeAction);
    $('tsDecisions').value = closing?.decisions || '';
    $('tsClosingState').textContent = closing ? (closing.status === 'closed' ? 'Fechado' : 'Rascunho salvo') : 'Novo fechamento';
    renderActions();
  }

  function renderClosings() {
    const node = $('tsClosings'); if (!node) return;
    const rows = closings().slice(0, 12);
    node.innerHTML = rows.length ? rows.map((closing) => `<article class="tsClosing"><div><b>Semana de ${new Date(`${closing.weekStart}T12:00:00`).toLocaleDateString('pt-BR')}</b><span>${esc(closing.status === 'closed' ? 'Fechado' : 'Rascunho')} · ${closing.summary?.compliance || 0}% · ${closing.actions?.length || 0} ação(ões)</span></div><button class="btn small" data-closing-open="${esc(closing.weekStart)}">Abrir</button></article>`).join('') : '<div class="empty compact"><p class="muted">Nenhum fechamento semanal salvo.</p></div>';
    node.querySelectorAll('[data-closing-open]').forEach((button) => { button.onclick = () => { $('tsWeek').value = button.dataset.closingOpen; renderAll(); loadEditor(); }; });
  }

  function renderAll() { renderSummary(); renderTrend(); renderOwners(); renderDeviations(); renderClosings(); }

  function saveEditor(status = 'draft') {
    const existing = currentClosing();
    const closing = buildClosing(snapshots(), settings(), selectedReference(), { ...existing, status, decisions: $('tsDecisions').value, actions: editorActions });
    saveClosing(closing); renderAll(); loadEditor(); toast(status === 'closed' ? 'Fechamento semanal concluído.' : 'Rascunho semanal salvo.');
  }

  function exportClosing() {
    const closing = currentClosing() || buildClosing(snapshots(), settings(), selectedReference(), { decisions: $('tsDecisions').value, actions: editorActions });
    const lines = [
      '# Commerce Radar — Fechamento semanal de fontes', '',
      `Período: ${new Date(`${closing.weekStart}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${closing.weekEnd}T12:00:00`).toLocaleDateString('pt-BR')}`,
      `Status: ${closing.status === 'closed' ? 'Fechado' : 'Rascunho'}`, '',
      '## Indicadores', '',
      `- SLA: ${closing.evaluation.status}`,
      `- Cumprimento: ${closing.summary.compliance}%`,
      `- Atrasos abertos: ${closing.summary.overdue}`,
      `- Responsáveis sobrecarregados: ${closing.summary.overloaded}`,
      `- Variação de cumprimento: ${closing.comparison.compliance >= 0 ? '+' : ''}${closing.comparison.compliance} p.p.`, '',
      '## Decisões', '', closing.decisions || 'Nenhuma decisão registrada.', '',
      '## Ações', '',
      ...(closing.actions.length ? closing.actions.map((action) => `- [${action.status === 'done' ? 'x' : ' '}] ${action.description} — ${action.owner || 'sem responsável'}${action.dueDate ? ` — ${action.dueDate}` : ''}`) : ['- Nenhuma ação registrada.']), '',
      '## Desvios recorrentes', '',
      ...(closing.deviations.length ? closing.deviations.map((item) => `- ${item.ownerName}: ${item.totalBreaches} desvio(s) em ${item.weeksObserved} semana(s).`) : ['- Nenhum desvio recorrente.']), '',
      'Tehkné Solutions',
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-fechamento-${closing.weekStart}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'trendSla'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'trendSlaNav'));
    const title = $('title'); if (title) title.textContent = 'Gerencie SLA e fechamento semanal';
    document.querySelector('.side')?.classList.remove('open');
    renderAll(); loadEditor(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false;
      keys.trendSlaSettings = K.settings; keys.trendWeeklyClosings = K.closings; return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, closings: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 180) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.5.4', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.trendSlaSettings = settings(); payload.trendWeeklyClosings = closings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const payload = JSON.parse(await file.text()); pending = { settings: payload.trendSlaSettings && typeof payload.trendSlaSettings === 'object' ? payload.trendSlaSettings : {}, closings: Array.isArray(payload.trendWeeklyClosings) ? payload.trendWeeklyClosings : [] }; }
        catch { pending = { settings: {}, closings: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => { saveSettings(pending.settings); write(K.closings, [...new Map([...closings(), ...pending.closings].map((item) => [item.id || item.weekStart, item])).values()].slice(0, 104)); renderAll(); });
      replace.addEventListener('click', () => { write(K.settings, pending.settings); write(K.closings, pending.closings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const operationsNav = $('trendOperationsNav'); const operationsView = $('trendOperations');
    if (!operationsNav || !operationsView || $('trendSlaNav')) return false;
    operationsNav.insertAdjacentHTML('afterend', '<button class="nav" id="trendSlaNav"><span>SLA e fechamento</span><b id="trendSlaNavCount"></b></button>');
    operationsView.insertAdjacentHTML('afterend', `<section class="view" id="trendSla"><div class="sectionHead"><div><span class="eyebrow">GOVERNANÇA SEMANAL</span><h2>SLA, tendências e fechamento</h2><p class="muted">Compare semanas, identifique desvios recorrentes e transforme o fechamento em decisões e ações rastreáveis.</p></div><div class="actions"><button class="btn" id="tsExport">Exportar fechamento</button><button class="btn primary" id="tsClose">Fechar semana</button></div></div><div class="tsSummary" id="tsSummary"></div><div class="card tsToolbar"><label class="field"><span>Semana analisada</span><input id="tsWeek" type="date"></label><label class="field"><span>Meta de cumprimento da equipe (%)</span><input id="tsTeamTarget" type="number" min="1" max="100"></label><label class="field"><span>Máximo de atrasos da equipe</span><input id="tsTeamOverdue" type="number" min="0" max="999"></label><label class="field"><span>Utilização máxima (%)</span><input id="tsUtilization" type="number" min="50" max="300"></label><label class="field"><span>Meta individual (%)</span><input id="tsOwnerTarget" type="number" min="1" max="100"></label><label class="field"><span>Máximo de atrasos individual</span><input id="tsOwnerOverdue" type="number" min="0" max="999"></label><label class="field"><span>Semanas para recorrência</span><input id="tsLookback" type="number" min="2" max="12"></label><button class="btn" id="tsSaveSettings">Salvar SLA</button></div><div class="tsLayout"><main><article class="card"><div class="sectionHead"><div><span class="eyebrow">TENDÊNCIA</span><h3>Últimas semanas</h3></div></div><div id="tsTrend"></div></article><article><div class="sectionHead"><div><span class="eyebrow">RESPONSÁVEIS</span><h3>Resultado individual</h3></div></div><div class="tsOwners" id="tsOwners"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">FECHAMENTO</span><h3>Decisões e ações</h3><span id="tsClosingState" class="muted"></span></div><div class="actions"><button class="btn small" id="tsSaveDraft">Salvar rascunho</button></div></div><label class="field"><span>Decisões da semana</span><textarea id="tsDecisions" rows="5" maxlength="4000" placeholder="Registre decisões, mudanças de processo e prioridades..."></textarea></label><div class="tsActionForm"><input id="tsActionDescription" placeholder="Nova ação"><select id="tsActionOwner"><option value="">Sem responsável</option></select><input id="tsActionDue" type="date"><button class="btn" id="tsAddAction">Adicionar</button></div><div id="tsActions"></div></article></main><aside><article class="card"><div class="sectionHead"><div><span class="eyebrow">RECORRÊNCIA</span><h3>Desvios repetidos</h3></div></div><div id="tsDeviations"></div></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">ARQUIVO</span><h3>Fechamentos salvos</h3></div></div><div id="tsClosings"></div></article><article class="card"><span class="eyebrow">LEITURA</span><h3>Limites do indicador</h3><p class="muted">Tendências históricas usam os snapshots disponíveis. Ausência de snapshot não é convertida em dado estimado. SLA mede execução operacional, não a veracidade da fonte.</p></article></aside></div></section><div id="trendSlaToast" class="v021Toast"></div>`);
    $('trendSlaNav').onclick = showView;
    $('tsWeek').value = weekStart(today());
    const current = settings();
    $('tsTeamTarget').value = current.teamComplianceTarget; $('tsTeamOverdue').value = current.maxTeamOverdue; $('tsUtilization').value = current.maxUtilization; $('tsOwnerTarget').value = current.ownerComplianceTarget; $('tsOwnerOverdue').value = current.maxOwnerOverdue; $('tsLookback').value = current.lookbackWeeks;
    $('tsSaveSettings').onclick = () => { saveSettings({ teamComplianceTarget: Number($('tsTeamTarget').value), maxTeamOverdue: Number($('tsTeamOverdue').value), maxUtilization: Number($('tsUtilization').value), ownerComplianceTarget: Number($('tsOwnerTarget').value), maxOwnerOverdue: Number($('tsOwnerOverdue').value), lookbackWeeks: Number($('tsLookback').value) }); renderAll(); toast('Metas de SLA atualizadas.'); };
    $('tsWeek').onchange = () => { renderAll(); loadEditor(); };
    const ownerSelect = $('tsActionOwner'); ownerSelect.innerHTML = '<option value="">Sem responsável</option>' + owners().map((owner) => `<option value="${esc(owner.name)}">${esc(owner.name)}</option>`).join('');
    $('tsAddAction').onclick = () => { const description = safe($('tsActionDescription').value, 500); if (!description) return toast('Informe a ação.', true); editorActions.push(normalizeAction({ description, owner: ownerSelect.value, dueDate: $('tsActionDue').value })); $('tsActionDescription').value = ''; $('tsActionDue').value = ''; renderActions(); };
    $('tsSaveDraft').onclick = () => saveEditor('draft'); $('tsClose').onclick = () => saveEditor('closed'); $('tsExport').onclick = exportClosing;
    extendCloud(); enhanceBackup(); renderAll(); loadEditor();
    ROOT.addEventListener?.('commerce-radar-review-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(K).includes(event.key)) { renderAll(); loadEditor(); } });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 300) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarReviewSla = { K, weekStart, weekEnd, weeklySummary, compareWeeks, evaluateSla, weeklyTrend, recurringDeviations, buildClosing, saveClosing };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();