(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CALIBRATION = ROOT.CommerceRadarRecommendationCalibration;
  const RECOMMEND = ROOT.CommerceRadarRecommendations;
  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    opportunities: 'tehkne-commerce-radar-v2-custom-opportunities',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    recommendationSettings: 'tehkne-commerce-radar-v6-recommendation-settings',
    calibrationSettings: 'tehkne-commerce-radar-v61-calibration-settings',
    predictions: 'tehkne-commerce-radar-v61-calibration-predictions',
    settings: 'tehkne-commerce-radar-v62-segment-settings',
    profiles: 'tehkne-commerce-radar-v62-segment-profiles',
    history: 'tehkne-commerce-radar-v62-segment-history',
  };
  const DEFAULTS = {
    dimension: 'category',
    minimumSample: 6,
    minimumSuccess: 2,
    minimumFailure: 2,
  };
  const DIMENSIONS = {
    category: 'Categoria',
    channel: 'Canal',
    maturity: 'Maturidade da evidência',
  };
  const MATURITY_LABELS = {
    early: 'Inicial',
    developing: 'Em desenvolvimento',
    validated: 'Validada',
  };
  const COMPONENT_LABELS = {
    market: 'Mercado', validation: 'Validação', economics: 'Economia', readiness: 'Prontidão', temporal: 'Atualidade', evidence: 'Evidência',
  };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const normalize = (value) => RECOMMEND?.normalizeKey?.(value) || safe(value, 180).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function profiles() { return read(KEYS.profiles, []); }
  function history() { return read(KEYS.history, []); }
  function predictions() { return read(KEYS.predictions, []); }
  function sourceInput() {
    return {
      signals: read(KEYS.signals, []), tests: read(KEYS.tests, []), audits: read(KEYS.audits, []), analyses: read(KEYS.analyses, []), opportunities: read(KEYS.opportunities, []), plans: read(KEYS.plans, []),
    };
  }
  function recommendationSettings() {
    const defaults = RECOMMEND?.DEFAULTS || { weights: { market: 24, validation: 22, economics: 22, readiness: 12, temporal: 12, evidence: 8 } };
    const saved = read(KEYS.recommendationSettings, {});
    return { ...defaults, ...saved, weights: { ...defaults.weights, ...(saved.weights || {}) } };
  }
  function calibrationSettings() {
    return { ...(CALIBRATION?.DEFAULTS || {}), ...read(KEYS.calibrationSettings, {}) };
  }

  function mostCommon(values = [], fallback = '') {
    const counts = new Map();
    for (const raw of values.map((value) => safe(value, 120)).filter(Boolean)) counts.set(raw, (counts.get(raw) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || fallback;
  }

  function deriveMaturity(row = {}) {
    const components = row.components || {};
    const confidence = num(row.confidence);
    const evidence = num(components.evidence);
    const validation = num(components.validation);
    const economics = num(components.economics);
    if (confidence >= 65 && evidence >= 65 && validation >= 55 && economics >= 50) return 'validated';
    if (confidence >= 40 && evidence >= 40 && (validation >= 25 || economics >= 25)) return 'developing';
    return 'early';
  }

  function buildMetadataIndex(input = sourceInput()) {
    const rows = new Map();
    const ensure = (name) => {
      const key = normalize(name);
      if (!key) return null;
      if (!rows.has(key)) rows.set(key, { key, categories: [], channels: [] });
      return rows.get(key);
    };
    for (const row of input.signals || []) { const item = ensure(row.topic); if (item) item.categories.push(row.category); }
    for (const row of input.tests || []) { const item = ensure(row.product); if (item) { item.categories.push(row.category); item.channels.push(row.channel); } }
    for (const row of input.audits || []) { const item = ensure(row.product); if (item) { item.categories.push(row.category); item.channels.push(row.channel); } }
    for (const row of input.analyses || []) {
      const item = ensure(row.product);
      if (item) {
        item.categories.push(row.category);
        item.channels.push(...(row.channels || []).map((channel) => channel?.name || channel));
      }
    }
    for (const row of input.opportunities || []) { const item = ensure(row.name); if (item) { item.categories.push(row.category); item.channels.push(row.channel); } }
    return new Map([...rows.entries()].map(([key, item]) => [key, {
      key,
      category: mostCommon(item.categories, 'Sem categoria'),
      channel: mostCommon(item.channels, 'Sem canal'),
    }]));
  }

  function enrichPredictions(rawPredictions = predictions(), input = sourceInput()) {
    const index = buildMetadataIndex(input);
    return rawPredictions.map((snapshot) => ({
      ...snapshot,
      ranking: (snapshot.ranking || []).map((row) => {
        const metadata = index.get(row.key) || {};
        const existing = row.segments || {};
        return {
          ...row,
          segments: {
            category: safe(existing.category || metadata.category || 'Sem categoria', 120),
            channel: safe(existing.channel || metadata.channel || 'Sem canal', 120),
            maturity: existing.maturity || deriveMaturity(row),
            source: row.segments ? row.segments.source || 'captured' : 'inferred',
          },
        };
      }),
    }));
  }

  function persistEnrichedPredictions(input = sourceInput()) {
    const current = predictions();
    const enriched = enrichPredictions(current, input);
    if (JSON.stringify(enriched) !== JSON.stringify(current)) write(KEYS.predictions, enriched);
    return enriched;
  }

  function segmentValue(row, dimension) {
    const raw = row?.segments?.[dimension];
    if (dimension === 'maturity') return raw || deriveMaturity(row);
    return safe(raw || (dimension === 'channel' ? 'Sem canal' : 'Sem categoria'), 120);
  }

  function segmentLabel(dimension, value) {
    if (dimension === 'maturity') return MATURITY_LABELS[value] || value;
    return value || (dimension === 'channel' ? 'Sem canal' : 'Sem categoria');
  }

  function segmentKey(dimension, value) { return `${dimension}:${normalize(value || 'sem valor')}`; }

  function buildSegmentGroups(rawPredictions = predictions(), input = sourceInput(), dimension = settings().dimension, config = settings(), reference = today()) {
    const enriched = enrichPredictions(rawPredictions, input);
    const cases = CALIBRATION?.buildCases?.(enriched, input, { ...calibrationSettings(), minimumSample: Math.max(4, num(config.minimumSample, 6)) }, reference) || [];
    const grouped = new Map();
    for (const row of cases) {
      const value = segmentValue(row, dimension);
      const key = segmentKey(dimension, value);
      if (!grouped.has(key)) grouped.set(key, { key, dimension, value, label: segmentLabel(dimension, value), cases: [] });
      grouped.get(key).cases.push(row);
    }
    return [...grouped.values()].map((group) => {
      const report = CALIBRATION?.metrics?.(group.cases) || {};
      const success = group.cases.filter((row) => row.outcome?.status === 'success').length;
      const failure = group.cases.filter((row) => row.outcome?.status === 'failure').length;
      const suggestion = CALIBRATION?.suggestWeights?.(group.cases, recommendationSettings().weights, { ...calibrationSettings(), minimumSample: Math.max(4, num(config.minimumSample, 6)) }) || { eligible: false, current: recommendationSettings().weights, suggested: recommendationSettings().weights, stats: [], reason: 'Calibração indisponível.' };
      const eligible = report.total >= Math.max(4, num(config.minimumSample, 6)) && success >= num(config.minimumSuccess, 2) && failure >= num(config.minimumFailure, 2) && suggestion.eligible;
      return {
        ...group,
        metrics: report,
        success,
        failure,
        suggestion: { ...suggestion, eligible, reason: eligible ? suggestion.reason : `O segmento exige ${config.minimumSample} casos conclusivos, ${config.minimumSuccess} sucessos e ${config.minimumFailure} falhas.` },
      };
    }).sort((a, b) => b.metrics.total - a.metrics.total || a.label.localeCompare(b.label));
  }

  function saveProfile(group) {
    if (!group?.suggestion?.eligible) return null;
    const row = {
      id: segmentKey(group.dimension, group.value),
      dimension: group.dimension,
      value: group.value,
      label: group.label,
      weights: { ...group.suggestion.suggested },
      sample: group.metrics.total,
      metrics: { ...group.metrics },
      success: group.success,
      failure: group.failure,
      appliedAt: new Date().toISOString(),
      signature: 'Tehkné Solutions',
    };
    const current = profiles();
    const previous = current.find((item) => item.id === row.id) || null;
    write(KEYS.profiles, [row, ...current.filter((item) => item.id !== row.id)].slice(0, 100));
    write(KEYS.history, [{ id: `${row.id}:${Date.now()}`, action: previous ? 'profile_updated' : 'profile_created', profile: row, previous, at: row.appliedAt }, ...history()].slice(0, 300));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-segment-profile-updated', { detail: row }));
    return row;
  }

  function removeProfile(id) {
    const current = profiles();
    const row = current.find((item) => item.id === id);
    if (!row) return null;
    write(KEYS.profiles, current.filter((item) => item.id !== id));
    write(KEYS.history, [{ id: `${id}:${Date.now()}`, action: 'profile_removed', profile: row, at: new Date().toISOString() }, ...history()].slice(0, 300));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-segment-profile-updated', { detail: { removed: id } }));
    return row;
  }

  function recommendationSegment(item, input = sourceInput()) {
    const metadata = buildMetadataIndex(input).get(item.key) || {};
    return {
      category: metadata.category || 'Sem categoria',
      channel: item.channels?.[0] || metadata.channel || 'Sem canal',
      maturity: deriveMaturity(item),
    };
  }

  function previewProfile(profile, input = sourceInput(), reference = today()) {
    if (!profile || !RECOMMEND?.buildRanking) return [];
    const baseConfig = recommendationSettings();
    const global = RECOMMEND.buildRanking(input, reference, baseConfig);
    const calibrated = RECOMMEND.buildRanking(input, reference, { ...baseConfig, weights: profile.weights });
    const globalMap = new Map(global.map((item) => [item.key, item]));
    return calibrated.filter((item) => {
      const segments = recommendationSegment(item, input);
      return normalize(segments[profile.dimension]) === normalize(profile.value);
    }).map((item) => ({
      ...item,
      globalScore: globalMap.get(item.key)?.score ?? item.score,
      scoreDelta: item.score - (globalMap.get(item.key)?.score ?? item.score),
      segment: recommendationSegment(item, input),
    })).sort((a, b) => b.score - a.score || b.confidence - a.confidence);
  }

  function captureSegmentedPrediction(reference = today()) {
    const input = sourceInput();
    const row = CALIBRATION?.capturePrediction?.(reference, true, input);
    persistEnrichedPredictions(input);
    return row;
  }

  function toast(message, error = false) {
    let node = $('segmentToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'segmentToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  let selectedGroupId = '';

  function renderSummary(groups) {
    const node = $('segmentSummary'); if (!node) return;
    const eligible = groups.filter((group) => group.suggestion.eligible).length;
    const active = profiles().filter((profile) => profile.dimension === settings().dimension).length;
    const inferred = predictions().flatMap((snapshot) => snapshot.ranking || []).filter((row) => row.segments?.source === 'inferred').length;
    node.innerHTML = [
      ['Segmentos', groups.length, DIMENSIONS[settings().dimension]],
      ['Calibráveis', eligible, 'amostra suficiente'],
      ['Perfis ativos', active, 'isolados do global'],
      ['Metadados inferidos', inferred, 'previsões antigas'],
    ].map(([label, value, note]) => `<article class="card segmentMetric"><small>${label}</small><b>${value}</b><span>${esc(note)}</span></article>`).join('');
    const count = $('segmentNavCount'); if (count) count.textContent = eligible ? String(eligible) : '';
  }

  function renderGroups() {
    const config = settings();
    const groups = buildSegmentGroups(predictions(), sourceInput(), config.dimension, config, today());
    renderSummary(groups);
    const node = $('segmentGroups'); if (!node) return groups;
    if (!groups.length) { node.innerHTML = '<div class="card empty"><h3>Sem coortes segmentadas</h3><p class="muted">Capture previsões e registre resultados posteriores.</p></div>'; return groups; }
    const profileMap = new Map(profiles().map((profile) => [profile.id, profile]));
    if (!selectedGroupId || !groups.some((group) => group.key === selectedGroupId)) selectedGroupId = groups[0].key;
    node.innerHTML = groups.map((group) => {
      const profile = profileMap.get(group.key);
      const precision = group.metrics.precision ? `${Math.round(group.metrics.precision * 100)}%` : '—';
      return `<article class="card segmentGroup${selectedGroupId === group.key ? ' selected' : ''}" data-segment-select="${esc(group.key)}"><div class="segmentGroupHead"><div><span>${esc(DIMENSIONS[group.dimension])}</span><h3>${esc(group.label)}</h3></div><b>${group.metrics.total}</b></div><div class="segmentStats"><span><b>${group.success}</b>Sucessos</span><span><b>${group.failure}</b>Falhas</span><span><b>${precision}</b>Precisão</span></div><p class="${group.suggestion.eligible ? 'eligible' : 'waiting'}">${esc(group.suggestion.eligible ? 'Perfil pode ser calibrado' : group.suggestion.reason)}</p>${profile ? '<em>Perfil ativo</em>' : ''}</article>`;
    }).join('');
    node.querySelectorAll('[data-segment-select]').forEach((card) => { card.onclick = () => { selectedGroupId = card.dataset.segmentSelect; renderAll(); }; });
    return groups;
  }

  function renderDetail(groups) {
    const node = $('segmentDetail'); if (!node) return;
    const group = groups.find((item) => item.key === selectedGroupId);
    if (!group) { node.innerHTML = '<p class="muted">Selecione um segmento.</p>'; return; }
    const profile = profiles().find((item) => item.id === group.key);
    const stats = group.suggestion.stats || [];
    node.innerHTML = `<div class="segmentDetailHead"><div><span class="eyebrow">${esc(DIMENSIONS[group.dimension])}</span><h3>${esc(group.label)}</h3><p>${group.metrics.total} casos conclusivos · ${group.metrics.pending || 0} pendentes · ${group.metrics.inconclusive || 0} inconclusivos</p></div><div class="actions"><button class="btn primary" id="segmentApply" ${group.suggestion.eligible ? '' : 'disabled'}>${profile ? 'Atualizar perfil' : 'Aplicar perfil'}</button>${profile ? '<button class="btn danger" id="segmentRemove">Remover perfil</button>' : ''}</div></div><div class="segmentMatrix"><span><b>${group.metrics.tp || 0}</b>Verdadeiros positivos</span><span><b>${group.metrics.fp || 0}</b>Falsos positivos</span><span><b>${group.metrics.fn || 0}</b>Falsos negativos</span><span><b>${group.metrics.tn || 0}</b>Verdadeiros negativos</span></div><div class="segmentWeights">${stats.map((item) => `<div><span>${esc(item.label)}</span><i><em style="width:${Math.min(100, Math.abs(item.lift))}%"></em></i><b>${item.lift >= 0 ? '+' : ''}${item.lift.toFixed(1)}</b><small>${group.suggestion.current[item.key]}% → ${group.suggestion.suggested[item.key]}%</small></div>`).join('')}</div><p class="muted">${esc(group.suggestion.reason)}</p>`;
    const apply = $('segmentApply');
    if (apply) apply.onclick = () => {
      if (!confirm(`Aplicar o perfil somente ao segmento “${group.label}”? O ranking global permanecerá inalterado.`)) return;
      saveProfile(group); toast('Perfil segmentado aplicado.'); renderAll();
    };
    const remove = $('segmentRemove');
    if (remove) remove.onclick = () => { if (!confirm('Remover este perfil segmentado?')) return; removeProfile(group.key); toast('Perfil segmentado removido.'); renderAll(); };
  }

  function renderPreview() {
    const node = $('segmentPreview'); if (!node) return;
    const profile = profiles().find((item) => item.id === selectedGroupId);
    if (!profile) { node.innerHTML = '<div class="empty compact"><p class="muted">Aplique um perfil para comparar o score global com o score segmentado.</p></div>'; return; }
    const rows = previewProfile(profile).slice(0, 20);
    node.innerHTML = rows.length ? `<div class="segmentPreviewTable"><div class="head"><span>Produto</span><span>Global</span><span>Segmento</span><span>Variação</span><span>Recomendação</span></div>${rows.map((row) => `<div><b>${esc(row.product)}</b><span>${row.globalScore}</span><span>${row.score}</span><span class="${row.scoreDelta > 0 ? 'up' : row.scoreDelta < 0 ? 'down' : ''}">${row.scoreDelta > 0 ? '+' : ''}${row.scoreDelta}</span><span>${esc(row.classification.label)}</span></div>`).join('')}</div>` : '<div class="empty compact"><p class="muted">Nenhum produto atual corresponde a este segmento.</p></div>';
  }

  function renderProfiles() {
    const node = $('segmentProfiles'); if (!node) return;
    const rows = profiles();
    node.innerHTML = rows.length ? rows.map((profile) => `<article class="segmentProfile"><div><b>${esc(DIMENSIONS[profile.dimension])}: ${esc(profile.label)}</b><span>${profile.sample} casos · ${new Date(profile.appliedAt).toLocaleDateString('pt-BR')}</span></div><small>${Object.keys(COMPONENT_LABELS).map((key) => `${COMPONENT_LABELS[key]} ${profile.weights[key]}%`).join(' · ')}</small></article>`).join('') : '<p class="muted">Nenhum perfil segmentado aplicado.</p>';
  }

  function renderAll() {
    persistEnrichedPredictions();
    const groups = renderGroups();
    renderDetail(groups); renderPreview(); renderProfiles();
  }

  function exportReport() {
    const config = settings();
    const groups = buildSegmentGroups(predictions(), sourceInput(), config.dimension, config, today());
    const lines = ['# Calibração segmentada — Commerce Radar', '', `Data: ${new Date().toLocaleDateString('pt-BR')}`, `Dimensão: ${DIMENSIONS[config.dimension]}`, '', '## Segmentos', ''];
    for (const group of groups) lines.push(`- ${group.label}: ${group.metrics.total} conclusivos; ${group.success} sucessos; ${group.failure} falhas; ${group.suggestion.eligible ? 'calibrável' : 'amostra insuficiente'}.`);
    lines.push('', '## Perfis ativos', '');
    for (const profile of profiles()) lines.push(`- ${DIMENSIONS[profile.dimension]} — ${profile.label}: ${Object.entries(profile.weights).map(([key, value]) => `${COMPONENT_LABELS[key]} ${value}%`).join(', ')}.`);
    lines.push('', '## Limites', '', '- Perfis segmentados não alteram os pesos globais.', '- Segmentos pequenos podem produzir resultados instáveis.', '- Metadados antigos podem ser inferidos a partir do estado atual.', '- Correlação histórica não comprova causalidade.', '', 'Tehkné Solutions');
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-calibracao-segmentada-${today()}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'recommendationSegments'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'segmentNav'));
    if ($('title')) $('title').textContent = 'Calibre por segmento sem misturar amostras';
    document.querySelector('.side')?.classList.remove('open');
    renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false;
      keys.segmentCalibrationSettings = KEYS.settings; keys.segmentCalibrationProfiles = KEYS.profiles; keys.segmentCalibrationHistory = KEYS.history;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, profiles: [], history: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 260) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {}; const payload = { version: '0.6.2', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.segmentCalibrationSettings = settings(); payload.segmentCalibrationProfiles = profiles(); payload.segmentCalibrationHistory = history();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const payload = JSON.parse(await file.text()); pending = { settings: payload.segmentCalibrationSettings && typeof payload.segmentCalibrationSettings === 'object' ? payload.segmentCalibrationSettings : {}, profiles: Array.isArray(payload.segmentCalibrationProfiles) ? payload.segmentCalibrationProfiles : [], history: Array.isArray(payload.segmentCalibrationHistory) ? payload.segmentCalibrationHistory : [] }; }
        catch { pending = { settings: {}, profiles: [], history: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.settings, { ...settings(), ...pending.settings }); write(KEYS.profiles, [...new Map([...profiles(), ...pending.profiles].map((item) => [item.id, item])).values()].slice(0, 100)); write(KEYS.history, [...new Map([...history(), ...pending.history].map((item) => [item.id, item])).values()].slice(0, 300)); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.profiles, pending.profiles); write(KEYS.history, pending.history); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const calibrationNav = $('calibrationNav'); const calibrationView = $('recommendationCalibration');
    if (!calibrationNav || !calibrationView || $('segmentNav')) return false;
    calibrationNav.insertAdjacentHTML('afterend', '<button class="nav" id="segmentNav"><span>Calibração segmentada</span><b id="segmentNavCount"></b></button>');
    calibrationView.insertAdjacentHTML('afterend', `<section class="view" id="recommendationSegments"><div class="sectionHead"><div><span class="eyebrow">AMOSTRAS COMPARÁVEIS</span><h2>Calibração segmentada</h2><p class="muted">Separe categoria, canal e maturidade antes de sugerir pesos. Perfis segmentados não modificam o ranking global.</p></div><div class="actions"><button class="btn" id="segmentCapture">Capturar previsão segmentada</button><button class="btn primary" id="segmentExport">Exportar relatório</button></div></div><div class="segmentSummary" id="segmentSummary"></div><div class="card segmentToolbar"><label class="field"><span>Dimensão</span><select id="segmentDimension"><option value="category">Categoria</option><option value="channel">Canal</option><option value="maturity">Maturidade da evidência</option></select></label><label class="field"><span>Amostra mínima</span><input id="segmentMinimumSample" type="number" min="4" max="50"></label><button class="btn" id="segmentSaveSettings">Atualizar análise</button></div><div class="segmentLayout"><aside><div id="segmentGroups" class="segmentGroups"></div><article class="card"><span class="eyebrow">PERFIS ATIVOS</span><h3>Pesos isolados</h3><div id="segmentProfiles"></div></article></aside><main><article class="card" id="segmentDetail"></article><article class="card"><div class="sectionHead"><div><span class="eyebrow">IMPACTO</span><h3>Prévia do ranking no segmento</h3></div></div><div id="segmentPreview"></div></article><article class="card"><span class="eyebrow">PROTEÇÕES</span><h3>Regras da segmentação</h3><ul class="segmentRules"><li>Cada segmento precisa de sucessos e falhas próprios.</li><li>Produtos fora do segmento não usam o perfil.</li><li>O ranking global permanece inalterado.</li><li>Previsões antigas podem ter metadados inferidos.</li><li>Nenhum perfil é aplicado automaticamente.</li></ul></article></main></div><div id="segmentToast" class="v021Toast"></div></section>`);
    $('segmentNav').onclick = showView;
    $('segmentDimension').value = settings().dimension;
    $('segmentMinimumSample').value = settings().minimumSample;
    $('segmentSaveSettings').onclick = () => { write(KEYS.settings, { ...settings(), dimension: $('segmentDimension').value, minimumSample: Math.max(4, num($('segmentMinimumSample').value, 6)) }); selectedGroupId = ''; renderAll(); toast('Segmentação atualizada.'); };
    $('segmentCapture').onclick = () => { captureSegmentedPrediction(today()); toast('Previsão segmentada capturada.'); renderAll(); };
    $('segmentExport').onclick = exportReport;
    extendCloud(); enhanceBackup(); persistEnrichedPredictions(); renderAll();
    ROOT.addEventListener?.('commerce-radar-calibration-applied', renderAll);
    ROOT.addEventListener?.('commerce-radar-segment-profile-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 360) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarSegmentCalibration = {
    KEYS, DEFAULTS, DIMENSIONS, deriveMaturity, buildMetadataIndex, enrichPredictions, persistEnrichedPredictions, segmentValue, buildSegmentGroups, saveProfile, removeProfile, recommendationSegment, previewProfile, captureSegmentedPrediction,
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();