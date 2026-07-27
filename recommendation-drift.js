(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const RECOMMEND = ROOT.CommerceRadarRecommendations;
  const KEYS = {
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    controlSettings: 'tehkne-commerce-radar-v63-profile-control-settings',
    controlSnapshots: 'tehkne-commerce-radar-v63-profile-control-snapshots',
    segmentProfiles: 'tehkne-commerce-radar-v62-segment-profiles',
    settings: 'tehkne-commerce-radar-v64-drift-settings',
    snapshots: 'tehkne-commerce-radar-v64-drift-snapshots',
    reviews: 'tehkne-commerce-radar-v64-drift-reviews',
  };
  const DEFAULTS = {
    horizonDays: 21,
    lookbackDays: 90,
    minimumSample: 6,
    minimumSuccess: 2,
    minimumFailure: 2,
    warningAccuracyDelta: -7,
    criticalAccuracyDelta: -15,
    warningBrierDelta: 0.04,
    criticalBrierDelta: 0.08,
    positiveThreshold: 64,
  };
  const STATUS = {
    stable: { label: 'Estável', recommendation: 'Manter o perfil e continuar coletando resultados.' },
    warning: { label: 'Atenção', recommendation: 'Revisar o perfil e comparar novamente em modo de simulação.' },
    critical: { label: 'Drift crítico', recommendation: 'Considerar rollback ou retorno ao global após revisão humana.' },
    insufficient: { label: 'Amostra insuficiente', recommendation: 'Coletar mais resultados antes de concluir.' },
  };
  const STATUS_ORDER = { critical: 0, warning: 1, insufficient: 2, stable: 3 };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, num(value)));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const normalize = (value) => RECOMMEND?.normalizeKey?.(value) || safe(value, 180).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const iso = (value) => { const time = Date.parse(value || ''); return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ''; };
  const addDays = (value, days) => {
    const base = iso(value) || today();
    const date = new Date(`${base}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  };

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function snapshots() { return read(KEYS.snapshots, []); }
  function reviews() { return read(KEYS.reviews, []); }
  function controlSnapshots() { return read(KEYS.controlSnapshots, []); }
  function profiles() { return read(KEYS.segmentProfiles, []); }
  function sourceInput() { return { tests: read(KEYS.tests, []), audits: read(KEYS.audits, []) }; }

  function eventDate(row = {}) {
    return iso(row.updatedAt || row.completedAt || row.periodEnd || row.createdAt || row.created || row.date);
  }

  function auditOutcome(row = {}) {
    const gross = Math.max(0, num(row.grossRevenue));
    const netSales = Math.max(0, gross - Math.max(0, num(row.discounts)) - Math.max(0, num(row.refunds)));
    const shipping = Math.max(0, num(row.shippingCost) - num(row.shippingSubsidy));
    const variable = ['productCost', 'marketplaceFees', 'paymentFees', 'taxes', 'advertising', 'packaging', 'otherCosts']
      .reduce((sum, key) => sum + Math.max(0, num(row[key])), shipping);
    const profit = Number.isFinite(Number(row.netProfit)) ? Number(row.netProfit) : netSales - variable;
    const margin = Number.isFinite(Number(row.netMargin)) ? Number(row.netMargin) : netSales > 0 ? (profit / netSales) * 100 : 0;
    return { profit, margin };
  }

  function outcomeFor(row, input = sourceInput(), config = settings(), reference = today()) {
    const start = iso(row.date || row.createdAt);
    const end = addDays(start, config.horizonDays);
    const key = normalize(row.product);
    const inWindow = (item) => {
      const date = eventDate(item);
      return normalize(item.product) === key && date > start && date <= end;
    };
    const tests = (input.tests || []).filter(inWindow);
    const audits = (input.audits || []).filter(inWindow);
    const orders = tests.reduce((sum, item) => sum + Math.max(0, num(item.orders)), 0);
    const validated = tests.some((item) => item.stage === 'validated');
    const discarded = tests.some((item) => item.stage === 'discarded') && !validated;
    const profitable = audits.some((item) => {
      const result = auditOutcome(item);
      return result.profit > 0 && result.margin >= 8;
    });
    const loss = audits.some((item) => auditOutcome(item).profit < 0);
    if (validated || (orders >= 3 && profitable)) return { status: 'success', end, orders };
    if (discarded || loss) return { status: 'failure', end, orders };
    if (reference < end) return { status: 'pending', end, orders };
    return { status: 'inconclusive', end, orders };
  }

  function dedupeControlledRows(rawSnapshots = controlSnapshots(), config = settings(), reference = today()) {
    const cutoff = addDays(reference, -Math.max(1, num(config.lookbackDays, 90)));
    const latest = new Map();
    const sorted = [...rawSnapshots].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    for (const snapshot of sorted) {
      if (snapshot.mode !== 'active' || !snapshot.date || snapshot.date < cutoff) continue;
      const date = new Date(`${snapshot.date}T12:00:00`);
      const day = date.getDay() || 7;
      date.setDate(date.getDate() - day + 1);
      const week = date.toISOString().slice(0, 10);
      for (const item of snapshot.ranking || []) {
        if (!item.profileId) continue;
        const key = item.key || normalize(item.product);
        latest.set(`${item.profileId}:${key}:${week}`, {
          ...item,
          date: snapshot.date,
          snapshotId: snapshot.id,
          week,
          profileId: item.profileId,
          controlledScore: num(item.score),
          globalScore: num(item.globalScore),
          product: item.product,
          key,
        });
      }
    }
    return [...latest.values()];
  }

  function classificationMetrics(cases, field, threshold) {
    const conclusive = cases.filter((row) => ['success', 'failure'].includes(row.outcome.status));
    let tp = 0; let fp = 0; let tn = 0; let fn = 0; let brier = 0;
    for (const row of conclusive) {
      const probability = clamp(row[field]) / 100;
      const predicted = row[field] >= threshold;
      const actual = row.outcome.status === 'success';
      if (predicted && actual) tp += 1;
      else if (predicted && !actual) fp += 1;
      else if (!predicted && !actual) tn += 1;
      else fn += 1;
      brier += (probability - (actual ? 1 : 0)) ** 2;
    }
    const total = conclusive.length;
    return {
      total, tp, fp, tn, fn,
      success: conclusive.filter((row) => row.outcome.status === 'success').length,
      failure: conclusive.filter((row) => row.outcome.status === 'failure').length,
      accuracy: total ? ((tp + tn) / total) * 100 : 0,
      precision: tp + fp ? (tp / (tp + fp)) * 100 : 0,
      recall: tp + fn ? (tp / (tp + fn)) * 100 : 0,
      brier: total ? brier / total : 0,
    };
  }

  function statusFor(controlled, global, config = settings()) {
    if (controlled.total < config.minimumSample || controlled.success < config.minimumSuccess || controlled.failure < config.minimumFailure) return 'insufficient';
    const accuracyDelta = controlled.accuracy - global.accuracy;
    const brierDelta = controlled.brier - global.brier;
    if (accuracyDelta <= config.criticalAccuracyDelta || brierDelta >= config.criticalBrierDelta) return 'critical';
    if (accuracyDelta <= config.warningAccuracyDelta || brierDelta >= config.warningBrierDelta) return 'warning';
    return 'stable';
  }

  function buildProfileReports(rawSnapshots = controlSnapshots(), input = sourceInput(), config = settings(), reference = today(), allProfiles = profiles()) {
    const rows = dedupeControlledRows(rawSnapshots, config, reference)
      .map((row) => ({ ...row, outcome: outcomeFor(row, input, config, reference) }));
    const grouped = new Map();
    for (const row of rows) {
      if (!grouped.has(row.profileId)) grouped.set(row.profileId, []);
      grouped.get(row.profileId).push(row);
    }
    return [...grouped.entries()].map(([profileId, cases]) => {
      const profile = allProfiles.find((item) => item.id === profileId) || { id: profileId, label: profileId, dimension: 'unknown' };
      const controlled = classificationMetrics(cases, 'controlledScore', config.positiveThreshold);
      const global = classificationMetrics(cases, 'globalScore', config.positiveThreshold);
      const status = statusFor(controlled, global, config);
      return {
        profile,
        cases,
        controlled,
        global,
        pending: cases.filter((row) => row.outcome.status === 'pending').length,
        inconclusive: cases.filter((row) => row.outcome.status === 'inconclusive').length,
        status,
        accuracyDelta: controlled.accuracy - global.accuracy,
        brierDelta: controlled.brier - global.brier,
        recommendation: STATUS[status].recommendation,
        latestPredictionAt: cases.map((row) => row.date).sort().reverse()[0] || '',
      };
    }).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.controlled.total - a.controlled.total);
  }

  function overallReport(reports = buildProfileReports()) {
    const conclusive = reports.reduce((sum, row) => sum + row.controlled.total, 0);
    const critical = reports.filter((row) => row.status === 'critical').length;
    const warning = reports.filter((row) => row.status === 'warning').length;
    const stable = reports.filter((row) => row.status === 'stable').length;
    return {
      profiles: reports.length,
      conclusive,
      critical,
      warning,
      stable,
      status: critical ? 'critical' : warning ? 'warning' : stable ? 'stable' : 'insufficient',
    };
  }

  function captureDriftSnapshot(reference = today(), force = false) {
    const config = settings();
    const reports = buildProfileReports(controlSnapshots(), sourceInput(), config, reference, profiles());
    const row = {
      id: `profile-drift-${reference}`,
      date: reference,
      config,
      overall: overallReport(reports),
      profiles: reports.map((item) => ({
        profileId: item.profile.id,
        label: item.profile.label,
        dimension: item.profile.dimension,
        status: item.status,
        controlled: item.controlled,
        global: item.global,
        accuracyDelta: item.accuracyDelta,
        brierDelta: item.brierDelta,
        pending: item.pending,
        inconclusive: item.inconclusive,
        recommendation: item.recommendation,
      })),
      createdAt: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
    const current = snapshots();
    if (!force && current.some((item) => item.id === row.id)) return current.find((item) => item.id === row.id);
    write(KEYS.snapshots, [row, ...current.filter((item) => item.id !== row.id)].slice(0, 180));
    return row;
  }

  function saveReview(profileId, decision, note = '') {
    const row = {
      id: `drift-review-${uid()}`,
      profileId,
      decision,
      note: safe(note, 1000),
      at: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.reviews, [row, ...reviews()].slice(0, 300));
    return row;
  }

  function toast(message, error = false) {
    let node = $('profileDriftToast');
    if (!node && typeof document !== 'undefined') {
      node = document.createElement('div');
      node.id = 'profileDriftToast';
      document.body.append(node);
    }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function render() {
    const config = settings();
    const reports = buildProfileReports(controlSnapshots(), sourceInput(), config, today(), profiles());
    const overall = overallReport(reports);
    const summary = $('profileDriftSummary');
    if (summary) {
      summary.innerHTML = [
        ['Situação', STATUS[overall.status].label, 'comparação contra global'],
        ['Perfis monitorados', overall.profiles, 'com aplicação histórica'],
        ['Casos conclusivos', overall.conclusive, 'mesmos produtos e períodos'],
        ['Alertas', overall.critical + overall.warning, `${overall.critical} críticos`],
      ].map(([label, value, note]) => `<article class="card driftMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    }
    const count = $('profileDriftNavCount');
    if (count) count.textContent = overall.critical + overall.warning ? String(overall.critical + overall.warning) : '';
    const list = $('profileDriftProfiles');
    if (list) {
      list.innerHTML = reports.length ? reports.map((row) => `<article class="card driftProfile status-${row.status}"><div class="driftProfileHead"><div><span>${esc(row.profile.dimension || 'Perfil')}</span><h3>${esc(row.profile.label)}</h3><p>${row.controlled.total} conclusivos · ${row.pending} pendentes · ${row.inconclusive} inconclusivos</p></div><b>${esc(STATUS[row.status].label)}</b></div><div class="driftCompare"><span><small>Acurácia perfil</small><b>${row.controlled.accuracy.toFixed(1)}%</b></span><span><small>Acurácia global</small><b>${row.global.accuracy.toFixed(1)}%</b></span><span><small>Diferença</small><b class="${row.accuracyDelta < 0 ? 'down' : row.accuracyDelta > 0 ? 'up' : ''}">${row.accuracyDelta >= 0 ? '+' : ''}${row.accuracyDelta.toFixed(1)} p.p.</b></span><span><small>Brier Δ</small><b class="${row.brierDelta > 0 ? 'down' : row.brierDelta < 0 ? 'up' : ''}">${row.brierDelta >= 0 ? '+' : ''}${row.brierDelta.toFixed(3)}</b></span></div><p>${esc(row.recommendation)}</p><div class="actions"><button class="btn" data-drift-review="${esc(row.profile.id)}" data-decision="review">Registrar revisão</button><button class="btn" data-drift-review="${esc(row.profile.id)}" data-decision="simulate">Recomendar simulação</button><button class="btn danger" data-drift-review="${esc(row.profile.id)}" data-decision="rollback">Recomendar rollback</button></div></article>`).join('') : '<div class="card empty"><h3>Sem casos pós-ativação</h3><p class="muted">Ative perfis, capture rankings e registre resultados posteriores para iniciar o monitoramento.</p></div>';
      list.querySelectorAll('[data-drift-review]').forEach((button) => {
        button.onclick = () => {
          const note = prompt('Observação da revisão:', '') ?? '';
          saveReview(button.dataset.driftReview, button.dataset.decision, note);
          toast('Revisão registrada sem alterar o ranking.');
          render();
        };
      });
    }
    const trend = $('profileDriftHistory');
    if (trend) {
      trend.innerHTML = snapshots().slice(0, 14).map((row) => `<div class="driftHistoryRow"><span>${new Date(`${row.date}T12:00:00`).toLocaleDateString('pt-BR')}</span><b>${esc(STATUS[row.overall?.status || 'insufficient'].label)}</b><small>${row.overall?.conclusive || 0} casos · ${row.overall?.critical || 0} críticos</small></div>`).join('') || '<p class="muted">Capture o primeiro diagnóstico para formar o histórico.</p>';
    }
    const reviewNode = $('profileDriftReviews');
    if (reviewNode) {
      reviewNode.innerHTML = reviews().slice(0, 12).map((row) => `<div class="driftHistoryRow"><span>${new Date(row.at).toLocaleString('pt-BR')}</span><b>${esc(row.decision)}</b><small>${esc(row.note || '')}</small></div>`).join('') || '<p class="muted">Nenhuma revisão registrada.</p>';
    }
    if ($('driftHorizon')) $('driftHorizon').value = String(config.horizonDays);
    if ($('driftLookback')) $('driftLookback').value = String(config.lookbackDays);
    if ($('driftMinimum')) $('driftMinimum').value = String(config.minimumSample);
  }

  function exportReport() {
    const reports = buildProfileReports();
    const lines = ['# Monitoramento de drift — Commerce Radar', '', `Data: ${new Date().toLocaleDateString('pt-BR')}`, '', '## Perfis', ''];
    for (const row of reports) {
      lines.push(`- ${row.profile.label}: ${STATUS[row.status].label}; acurácia perfil ${row.controlled.accuracy.toFixed(1)}%; global ${row.global.accuracy.toFixed(1)}%; diferença ${row.accuracyDelta.toFixed(1)} p.p.; Brier Δ ${row.brierDelta.toFixed(3)}; ${row.recommendation}`);
    }
    lines.push('', '## Limites', '', '- O diagnóstico depende de resultados posteriores registrados.', '- Drift não comprova causalidade.', '- Nenhuma recomendação executa rollback automaticamente.', '- Amostras pequenas permanecem inconclusivas.', '', 'Tehkné Solutions');
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `commerce-radar-drift-${today()}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'profileDrift'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'profileDriftNav'));
    if ($('title')) $('title').textContent = 'Monitore perfis ativos contra o baseline global';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.profileDriftSettings = KEYS.settings;
      keys.profileDriftSnapshots = KEYS.snapshots;
      keys.profileDriftReviews = KEYS.reviews;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { settings: {}, snapshots: [], reviews: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup');
      const input = $('restoreFile');
      const merge = $('mergeRestore');
      const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) {
        if (attempts > 340) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.6.4', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.profileDriftSettings = settings();
        payload.profileDriftSnapshots = snapshots();
        payload.profileDriftReviews = reviews();
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
            settings: payload.profileDriftSettings || {},
            snapshots: Array.isArray(payload.profileDriftSnapshots) ? payload.profileDriftSnapshots : [],
            reviews: Array.isArray(payload.profileDriftReviews) ? payload.profileDriftReviews : [],
          };
        } catch {
          pending = { settings: {}, snapshots: [], reviews: [] };
        }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.settings, { ...settings(), ...pending.settings });
        write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 180));
        write(KEYS.reviews, [...new Map([...reviews(), ...pending.reviews].map((item) => [item.id, item])).values()].slice(0, 300));
        render();
      });
      replace.addEventListener('click', () => {
        write(KEYS.settings, pending.settings);
        write(KEYS.snapshots, pending.snapshots);
        write(KEYS.reviews, pending.reviews);
        render();
      });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const controlNav = $('profileControlNav');
    const controlView = $('profileControl');
    if (!controlNav || !controlView || $('profileDriftNav')) return false;
    controlNav.insertAdjacentHTML('afterend', '<button class="nav" id="profileDriftNav"><span>Monitoramento de drift</span><b id="profileDriftNavCount"></b></button>');
    controlView.insertAdjacentHTML('afterend', `<section class="view" id="profileDrift"><div class="sectionHead"><div><span class="eyebrow">PÓS-ATIVAÇÃO</span><h2>Monitoramento de drift</h2><p class="muted">Compare o desempenho dos perfis ativos com o mesmo ranking global. Alertas recomendam revisão, mas nunca executam rollback automaticamente.</p></div><div class="actions"><button class="btn" id="driftCapture">Capturar diagnóstico</button><button class="btn primary" id="driftExport">Exportar relatório</button></div></div><div class="driftSummary" id="profileDriftSummary"></div><div class="card driftToolbar"><label class="field"><span>Horizonte do resultado</span><select id="driftHorizon"><option value="14">14 dias</option><option value="21">21 dias</option><option value="30">30 dias</option><option value="45">45 dias</option></select></label><label class="field"><span>Janela histórica</span><select id="driftLookback"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option><option value="180">180 dias</option></select></label><label class="field"><span>Amostra mínima</span><input id="driftMinimum" type="number" min="4" max="100"></label><button class="btn" id="driftSaveSettings">Atualizar diagnóstico</button></div><div class="driftLayout"><main><div id="profileDriftProfiles" class="driftProfiles"></div></main><aside><article class="card"><span class="eyebrow">HISTÓRICO</span><h3>Diagnósticos diários</h3><div id="profileDriftHistory"></div></article><article class="card"><span class="eyebrow">REVISÕES</span><h3>Decisões humanas</h3><div id="profileDriftReviews"></div></article><article class="card"><span class="eyebrow">PROTEÇÕES</span><h3>Como interpretar</h3><ul class="driftRules"><li>O perfil e o global usam os mesmos produtos e resultados.</li><li>Amostras pequenas não geram alerta conclusivo.</li><li>Brier menor representa melhor calibração.</li><li>Drift não comprova causalidade.</li><li>Rollback nunca é automático.</li></ul></article></aside></div><div id="profileDriftToast" class="v021Toast"></div></section>`);
    $('profileDriftNav').onclick = showView;
    $('driftCapture').onclick = () => {
      captureDriftSnapshot(today(), true);
      toast('Diagnóstico de drift capturado.');
      render();
    };
    $('driftExport').onclick = exportReport;
    $('driftSaveSettings').onclick = () => {
      write(KEYS.settings, {
        ...settings(),
        horizonDays: num($('driftHorizon').value, 21),
        lookbackDays: num($('driftLookback').value, 90),
        minimumSample: Math.max(4, num($('driftMinimum').value, 6)),
      });
      toast('Parâmetros atualizados.');
      render();
    };
    extendCloud();
    enhanceBackup();
    captureDriftSnapshot();
    render();
    ROOT.addEventListener?.('commerce-radar-profile-control-updated', render);
    ROOT.addEventListener?.('storage', (event) => {
      if (Object.values(KEYS).includes(event.key)) render();
    });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 480) clearInterval(timer);
    }, 50);
  }

  ROOT.CommerceRadarRecommendationDrift = {
    KEYS,
    DEFAULTS,
    outcomeFor,
    dedupeControlledRows,
    classificationMetrics,
    statusFor,
    buildProfileReports,
    overallReport,
    captureDriftSnapshot,
    saveReview,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();