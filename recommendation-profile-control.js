(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const RECOMMEND = ROOT.CommerceRadarRecommendations;
  const SEGMENTS = ROOT.CommerceRadarSegmentCalibration;
  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    opportunities: 'tehkne-commerce-radar-v2-custom-opportunities',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    recommendationSettings: 'tehkne-commerce-radar-v6-recommendation-settings',
    recommendationSnapshots: 'tehkne-commerce-radar-v6-recommendation-snapshots',
    recommendationDecisions: 'tehkne-commerce-radar-v6-recommendation-decisions',
    segmentProfiles: 'tehkne-commerce-radar-v62-segment-profiles',
    settings: 'tehkne-commerce-radar-v63-profile-control-settings',
    history: 'tehkne-commerce-radar-v63-profile-control-history',
    snapshots: 'tehkne-commerce-radar-v63-profile-control-snapshots',
  };
  const DEFAULTS = {
    mode: 'global',
    enabledProfileIds: [],
    precedence: ['category', 'channel', 'maturity'],
  };
  const DIMENSIONS = { category: 'Categoria', channel: 'Canal', maturity: 'Maturidade' };
  const COMPONENTS = { market: 'Mercado', validation: 'Validação', economics: 'Economia', readiness: 'Prontidão', temporal: 'Atualidade', evidence: 'Evidência' };
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const normalize = (value) => RECOMMEND?.normalizeKey?.(value) || safe(value, 180).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function settings() {
    const saved = read(KEYS.settings, {});
    const precedence = Array.isArray(saved.precedence) ? [...new Set(saved.precedence.filter((value) => DIMENSIONS[value]))] : DEFAULTS.precedence;
    for (const dimension of DEFAULTS.precedence) if (!precedence.includes(dimension)) precedence.push(dimension);
    return { ...DEFAULTS, ...saved, enabledProfileIds: Array.isArray(saved.enabledProfileIds) ? saved.enabledProfileIds : [], precedence: precedence.slice(0, 3) };
  }
  function profiles() { return read(KEYS.segmentProfiles, []); }
  function history() { return read(KEYS.history, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
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
  function segmentOf(item, input = sourceInput()) {
    return SEGMENTS?.recommendationSegment?.(item, input) || { category: 'Sem categoria', channel: item.channels?.[0] || 'Sem canal', maturity: 'early' };
  }
  function profileMatches(profile, segment) {
    return Boolean(profile && segment && normalize(segment[profile.dimension]) === normalize(profile.value));
  }
  function selectProfile(item, allProfiles = profiles(), control = settings(), input = sourceInput()) {
    const enabled = new Set(control.enabledProfileIds || []);
    const segment = segmentOf(item, input);
    for (const dimension of control.precedence || DEFAULTS.precedence) {
      const profile = allProfiles.find((row) => row.dimension === dimension && enabled.has(row.id) && profileMatches(row, segment));
      if (profile) return { profile, segment, precedence: (control.precedence || []).indexOf(dimension) + 1 };
    }
    return { profile: null, segment, precedence: null };
  }
  function applyProfilesToRanking(input = sourceInput(), reference = today(), control = settings(), allProfiles = profiles(), force = false) {
    if (!RECOMMEND?.buildRanking) return [];
    const baseConfig = recommendationSettings();
    const global = RECOMMEND.buildRanking(input, reference, baseConfig);
    const shouldApply = force || control.mode === 'active';
    if (!shouldApply) return global.map((item) => ({ ...item, globalScore: item.score, scoreDelta: 0, appliedProfile: null, segment: segmentOf(item, input) }));
    const cache = new Map();
    const getProfileMap = (profile) => {
      if (!cache.has(profile.id)) cache.set(profile.id, new Map(RECOMMEND.buildRanking(input, reference, { ...baseConfig, weights: profile.weights }).map((item) => [item.key, item])));
      return cache.get(profile.id);
    };
    return global.map((globalItem) => {
      const selected = selectProfile(globalItem, allProfiles, control, input);
      if (!selected.profile) return { ...globalItem, globalScore: globalItem.score, scoreDelta: 0, appliedProfile: null, segment: selected.segment };
      const calibrated = getProfileMap(selected.profile).get(globalItem.key) || globalItem;
      return {
        ...calibrated,
        globalScore: globalItem.score,
        scoreDelta: calibrated.score - globalItem.score,
        appliedProfile: { id: selected.profile.id, dimension: selected.profile.dimension, label: selected.profile.label, precedence: selected.precedence, weights: selected.profile.weights },
        segment: selected.segment,
      };
    }).sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.product.localeCompare(b.product));
  }
  function compareRankings(input = sourceInput(), reference = today(), control = settings(), allProfiles = profiles()) {
    const global = applyProfilesToRanking(input, reference, { ...control, mode: 'global' }, allProfiles, false);
    const simulated = applyProfilesToRanking(input, reference, { ...control, mode: 'active' }, allProfiles, true);
    const globalMap = new Map(global.map((item, index) => [item.key, { item, position: index + 1 }]));
    return simulated.map((item, index) => {
      const prior = globalMap.get(item.key);
      return { ...item, globalPosition: prior?.position || index + 1, controlledPosition: index + 1, positionDelta: (prior?.position || index + 1) - (index + 1), globalScore: prior?.item.score ?? item.globalScore };
    });
  }
  function record(action, previous, current, note = '') {
    const row = { id: `profile-control-${uid()}`, action, previous, current, note: safe(note, 600), at: new Date().toISOString(), signature: 'Tehkné Solutions' };
    write(KEYS.history, [row, ...history()].slice(0, 300));
    return row;
  }
  function saveControl(next, action = 'settings_updated', note = '') {
    const previous = settings();
    const current = { ...previous, ...next, enabledProfileIds: Array.isArray(next.enabledProfileIds) ? next.enabledProfileIds : previous.enabledProfileIds, precedence: Array.isArray(next.precedence) ? next.precedence : previous.precedence, updatedAt: new Date().toISOString() };
    write(KEYS.settings, current);
    record(action, previous, current, note);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-profile-control-updated', { detail: current }));
    return current;
  }
  function activate(next, note = '') { return saveControl({ ...next, mode: 'active' }, 'profiles_activated', note); }
  function simulate(next) { return saveControl({ ...next, mode: 'simulation' }, 'simulation_enabled'); }
  function useGlobal() { return saveControl({ mode: 'global' }, 'global_restored'); }
  function rollback() {
    const last = history().find((row) => ['profiles_activated', 'global_restored', 'simulation_enabled', 'settings_updated'].includes(row.action) && row.previous);
    if (!last) return null;
    const current = settings();
    write(KEYS.settings, last.previous);
    record('rollback', current, last.previous, `Reversão de ${last.id}`);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-profile-control-updated', { detail: last.previous }));
    return last.previous;
  }
  function captureControlledSnapshot(reference = today(), force = false) {
    const control = settings();
    const ranking = applyProfilesToRanking(sourceInput(), reference, control, profiles()).map((item, index) => ({ position: index + 1, key: item.key, product: item.product, score: item.score, globalScore: item.globalScore, scoreDelta: item.scoreDelta, confidence: item.confidence, classification: item.classification.id, profileId: item.appliedProfile?.id || '', latestEvidenceAt: item.latestEvidenceAt }));
    const row = { id: `controlled-ranking-${reference}`, date: reference, mode: control.mode, settings: control, ranking, createdAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
    const current = snapshots();
    if (!force && current.some((item) => item.id === row.id)) return current.find((item) => item.id === row.id);
    write(KEYS.snapshots, [row, ...current.filter((item) => item.id !== row.id)].slice(0, 180));
    write(KEYS.recommendationSnapshots, [row, ...read(KEYS.recommendationSnapshots, []).filter((item) => item.id !== row.id)].slice(0, 180));
    return row;
  }

  function filtered(rows) {
    const query = normalize($('recommendationSearch')?.value || '');
    const status = $('recommendationStatus')?.value || 'all';
    const confidence = num($('recommendationConfidence')?.value, 0);
    return rows.filter((item) => (!query || normalize(`${item.product} ${item.positives?.join(' ') || ''} ${item.penalties?.join(' ') || ''}`).includes(query)) && (status === 'all' || item.classification.id === status) && item.confidence >= confidence);
  }
  function createTest(item) {
    const rows = read(KEYS.tests, []);
    const row = { id: `controlled-test-${uid()}`, product: item.product, channel: item.channels?.[0] || 'Shopee', stage: 'research', investment: 0, revenue: 0, views: 0, clicks: 0, orders: 0, next: item.nextAction, notes: `Criado pelo ranking controlado. Score ${item.score}/100; global ${item.globalScore}/100; perfil ${item.appliedProfile?.label || 'global'}.`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    write(KEYS.tests, [row, ...rows]);
    return row;
  }
  function bar(label, value) { return `<div><span>${label}</span><i><em style="width:${Math.max(0, Math.min(100, value))}%"></em></i><b>${Math.round(value)}</b></div>`; }
  function renderMainRanking() {
    const node = $('recommendationGrid'); if (!node || !RECOMMEND) return;
    const control = settings();
    const all = applyProfilesToRanking(sourceInput(), today(), control, profiles());
    const rows = filtered(all);
    const summary = $('recommendationSummary');
    if (summary) {
      const applied = all.filter((item) => item.appliedProfile).length;
      const changed = all.filter((item) => item.scoreDelta !== 0).length;
      const prioritized = all.filter((item) => item.classification.id === 'prioritize').length;
      summary.innerHTML = [['Modo', control.mode === 'active' ? 'Ativo' : control.mode === 'simulation' ? 'Simulação' : 'Global', control.mode === 'active' ? 'perfis no ranking' : 'sem alteração'], ['Produtos com perfil', applied, 'precedência única'], ['Scores alterados', changed, 'contra o global'], ['Priorizar', prioritized, 'ranking atual']].map(([label, value, note]) => `<article class="card recommendationMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    }
    if (!rows.length) { node.innerHTML = '<div class="card empty"><h3>Nenhuma recomendação encontrada</h3><p class="muted">Ajuste os filtros ou registre novas evidências.</p></div>'; return; }
    const decisions = new Map(read(KEYS.recommendationDecisions, []).map((item) => [item.key, item]));
    node.innerHTML = rows.map((item, index) => {
      const profile = item.appliedProfile;
      const decision = decisions.get(item.key);
      return `<article class="card recommendationCard status-${item.classification.id}${profile ? ' controlled' : ''}"><div class="recommendationHead"><div><span class="recommendationRank">#${index + 1}</span><span class="recommendationStatus">${esc(item.classification.label)}</span>${profile ? `<span class="profileBadge">${esc(DIMENSIONS[profile.dimension])}: ${esc(profile.label)}</span>` : '<span class="profileBadge global">Pesos globais</span>'}<h3>${esc(item.product)}</h3><p>${item.channels?.length ? esc(item.channels.join(' · ')) : 'Canal ainda não confirmado'} · evidência ${item.latestEvidenceAt || 'não informada'}</p></div><div class="recommendationScore"><b>${item.score}</b><small>/100</small><span class="delta ${item.scoreDelta > 0 ? 'up' : item.scoreDelta < 0 ? 'down' : ''}">${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta || 0}</span></div></div><div class="controlledCompare"><span>Global <b>${item.globalScore}</b></span><span>Atual <b>${item.score}</b></span><span>Confiança <b>${item.confidence}%</b></span></div><div class="recommendationBars">${bar('Mercado', item.components.market)}${bar('Validação', item.components.validation)}${bar('Economia', item.components.economics)}${bar('Prontidão', item.components.readiness)}${bar('Atualidade', item.components.temporal)}${bar('Evidência', item.components.evidence)}</div><div class="recommendationReasons"><div><b>Por que pode avançar</b>${(item.positives?.length ? item.positives : ['Ainda não há evidência positiva suficiente.']).map((text) => `<p class="positive">${esc(text)}</p>`).join('')}</div><div><b>Riscos e lacunas</b>${[...(item.penalties || []), ...(item.gaps || [])].slice(0, 5).map((text) => `<p class="warning">${esc(text)}</p>`).join('') || '<p>Nenhuma lacuna crítica identificada.</p>'}</div></div><div class="recommendationNext"><span>Próxima ação</span><b>${esc(item.nextAction)}</b></div>${decision ? `<div class="recommendationDecision"><span>Decisão: <b>${esc(decision.decision)}</b></span><p>${esc(decision.note)}</p></div>` : ''}<details><summary>Ver perfil e evidências</summary><div class="recommendationEvidence"><p><b>Perfil:</b> ${profile ? `${DIMENSIONS[profile.dimension]} — ${esc(profile.label)} · precedência ${profile.precedence}` : 'pesos globais'}</p><p><b>Economia:</b> ${item.economics.available ? `margem ${PCT.format(item.economics.netMargin)}% · ${BRL.format(item.economics.netProfit)}` : 'não disponível'}</p><p><b>Segmentos:</b> ${esc(item.segment.category)} · ${esc(item.segment.channel)} · ${esc(item.segment.maturity)}</p></div></details><div class="actions"><button class="btn primary" data-controlled-test="${esc(item.key)}">Criar teste</button><button class="btn" data-controlled-decision="${esc(item.key)}" data-value="priorizar">Priorizar</button><button class="btn" data-controlled-decision="${esc(item.key)}" data-value="monitorar">Monitorar</button><button class="btn danger" data-controlled-decision="${esc(item.key)}" data-value="pausar">Pausar</button></div></article>`;
    }).join('');
    node.querySelectorAll('[data-controlled-test]').forEach((button) => { button.onclick = () => { const item = all.find((row) => row.key === button.dataset.controlledTest); if (item) { createTest(item); toast('Teste criado no funil.'); renderMainRanking(); } }; });
    node.querySelectorAll('[data-controlled-decision]').forEach((button) => { button.onclick = () => { const note = prompt('Observação da decisão (opcional):', decisions.get(button.dataset.controlledDecision)?.note || '') ?? ''; RECOMMEND.saveDecision(button.dataset.controlledDecision, button.dataset.value, note); renderMainRanking(); }; });
  }
  function showRecommendations() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'recommendations'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'recommendationsNav'));
    if ($('title')) $('title').textContent = settings().mode === 'active' ? 'Ranking com perfis segmentados ativos' : 'Priorize produtos com evidências';
    document.querySelector('.side')?.classList.remove('open');
    captureControlledSnapshot(); renderMainRanking(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }
  function exportControlledRanking() {
    const rows = applyProfilesToRanking(sourceInput(), today(), settings(), profiles());
    const header = ['posicao', 'produto', 'score_atual', 'score_global', 'variacao', 'confianca_pct', 'recomendacao', 'perfil', 'dimensao', 'proxima_acao'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...rows.map((item, index) => [index + 1, item.product, item.score, item.globalScore, item.scoreDelta, item.confidence, item.classification.label, item.appliedProfile?.label || 'Global', item.appliedProfile?.dimension || '', item.nextAction])].map((row) => row.map(quote).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-ranking-controlado-${today()}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  function toast(message, error = false) {
    let node = $('profileControlToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'profileControlToast'; document.body.append(node); }
    if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function selectedFromForm() { return [...document.querySelectorAll('[data-profile-toggle]:checked')].map((input) => input.value); }
  function precedenceFromForm() {
    const values = [$('profilePrecedence1')?.value, $('profilePrecedence2')?.value, $('profilePrecedence3')?.value].filter(Boolean);
    return [...new Set([...values, ...DEFAULTS.precedence])].slice(0, 3);
  }
  function renderControl() {
    const control = settings(); const allProfiles = profiles(); const comparison = compareRankings(sourceInput(), today(), { ...control, mode: 'active' }, allProfiles);
    const status = $('profileControlSummary');
    if (status) status.innerHTML = [['Modo atual', control.mode === 'active' ? 'Ativo' : control.mode === 'simulation' ? 'Simulação' : 'Global', control.mode === 'active' ? 'ranking alterado' : 'ranking preservado'], ['Perfis selecionados', control.enabledProfileIds.length, 'elegíveis para precedência'], ['Produtos afetados', comparison.filter((item) => item.appliedProfile).length, 'na simulação'], ['Mudanças de posição', comparison.filter((item) => item.positionDelta !== 0).length, 'contra o global']].map(([label, value, note]) => `<article class="card profileControlMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const profileNode = $('profileControlProfiles');
    if (profileNode) profileNode.innerHTML = allProfiles.length ? allProfiles.map((profile) => `<label class="profileToggle"><input type="checkbox" data-profile-toggle value="${esc(profile.id)}" ${control.enabledProfileIds.includes(profile.id) ? 'checked' : ''}><span><b>${esc(DIMENSIONS[profile.dimension])}: ${esc(profile.label)}</b><small>${profile.sample} casos · ${Object.entries(profile.weights).map(([key, value]) => `${COMPONENTS[key]} ${value}%`).join(' · ')}</small></span></label>`).join('') : '<p class="muted">Crie perfis na Calibração segmentada antes de ativá-los.</p>';
    [$('profilePrecedence1'), $('profilePrecedence2'), $('profilePrecedence3')].forEach((select, index) => { if (select) select.value = control.precedence[index]; });
    const table = $('profileControlComparison');
    if (table) table.innerHTML = comparison.length ? `<div class="profileComparisonTable"><div class="head"><span>Produto</span><span>Global</span><span>Simulado</span><span>Posição</span><span>Perfil vencedor</span></div>${comparison.slice(0, 30).map((item) => `<div><b>${esc(item.product)}</b><span>${item.globalScore}</span><span class="${item.scoreDelta > 0 ? 'up' : item.scoreDelta < 0 ? 'down' : ''}">${item.score}${item.scoreDelta ? ` (${item.scoreDelta > 0 ? '+' : ''}${item.scoreDelta})` : ''}</span><span>${item.globalPosition} → ${item.controlledPosition}</span><span>${item.appliedProfile ? `${esc(DIMENSIONS[item.appliedProfile.dimension])}: ${esc(item.appliedProfile.label)}` : 'Global'}</span></div>`).join('')}</div>` : '<p class="muted">Nenhum produto disponível para comparação.</p>';
    const historyNode = $('profileControlHistory');
    if (historyNode) historyNode.innerHTML = history().slice(0, 12).map((row) => `<div class="profileHistoryRow"><b>${esc(row.action)}</b><span>${new Date(row.at).toLocaleString('pt-BR')}</span><small>${esc(row.note || '')}</small></div>`).join('') || '<p class="muted">Nenhuma ativação registrada.</p>';
  }
  function showControl() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'profileControl'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'profileControlNav'));
    if ($('title')) $('title').textContent = 'Simule e ative perfis com rollback';
    document.querySelector('.side')?.classList.remove('open'); renderControl(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }
  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.profileControlSettings = KEYS.settings; keys.profileControlHistory = KEYS.history; keys.profileControlSnapshots = KEYS.snapshots; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }
  function enhanceBackup() {
    let attempts = 0; let pending = { settings: {}, history: [], snapshots: [] };
    const timer = setInterval(() => {
      attempts += 1; const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 300) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys || {}; const payload = { version: '0.6.3', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' }; for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []); payload.profileControlSettings = settings(); payload.profileControlHistory = history(); payload.profileControlSnapshots = snapshots(); const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url); };
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { settings: payload.profileControlSettings || {}, history: Array.isArray(payload.profileControlHistory) ? payload.profileControlHistory : [], snapshots: Array.isArray(payload.profileControlSnapshots) ? payload.profileControlSnapshots : [] }; } catch { pending = { settings: {}, history: [], snapshots: [] }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.settings, { ...settings(), ...pending.settings }); write(KEYS.history, [...new Map([...history(), ...pending.history].map((item) => [item.id, item])).values()].slice(0, 300)); write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 180)); renderControl(); renderMainRanking(); });
      replace.addEventListener('click', () => { write(KEYS.settings, pending.settings); write(KEYS.history, pending.history); write(KEYS.snapshots, pending.snapshots); renderControl(); renderMainRanking(); });
    }, 50);
  }
  function inject() {
    if (typeof document === 'undefined') return false;
    const segmentNav = $('segmentNav'); const segmentView = $('recommendationSegments'); const recommendationNav = $('recommendationsNav');
    if (!segmentNav || !segmentView || !recommendationNav || $('profileControlNav')) return false;
    segmentNav.insertAdjacentHTML('afterend', '<button class="nav" id="profileControlNav"><span>Aplicação de perfis</span><b id="profileControlNavCount"></b></button>');
    segmentView.insertAdjacentHTML('afterend', `<section class="view" id="profileControl"><div class="sectionHead"><div><span class="eyebrow">ATIVAÇÃO CONTROLADA</span><h2>Aplicação de perfis no ranking</h2><p class="muted">Escolha perfis, defina precedência, simule o impacto e só então ative. Um único perfil pode vencer por produto.</p></div><div class="actions"><button class="btn" id="profileUseGlobal">Usar global</button><button class="btn" id="profileRollback">Rollback</button><button class="btn primary" id="profileOpenRanking">Abrir ranking</button></div></div><div class="profileControlSummary" id="profileControlSummary"></div><div class="profileControlLayout"><aside><article class="card"><span class="eyebrow">PERFIS DISPONÍVEIS</span><h3>Selecione os autorizados</h3><div id="profileControlProfiles"></div></article><article class="card"><span class="eyebrow">PRECEDÊNCIA</span><h3>Qual dimensão vence</h3><div class="precedenceFields"><label class="field"><span>1ª</span><select id="profilePrecedence1"><option value="category">Categoria</option><option value="channel">Canal</option><option value="maturity">Maturidade</option></select></label><label class="field"><span>2ª</span><select id="profilePrecedence2"><option value="category">Categoria</option><option value="channel">Canal</option><option value="maturity">Maturidade</option></select></label><label class="field"><span>3ª</span><select id="profilePrecedence3"><option value="category">Categoria</option><option value="channel">Canal</option><option value="maturity">Maturidade</option></select></label></div><div class="actions"><button class="btn" id="profileSimulate">Salvar simulação</button><button class="btn primary" id="profileActivate">Ativar no ranking</button></div></article><article class="card"><span class="eyebrow">HISTÓRICO</span><h3>Ativações e rollback</h3><div id="profileControlHistory"></div></article></aside><main><article class="card"><div class="sectionHead"><div><span class="eyebrow">COMPARAÇÃO</span><h3>Global versus segmentado</h3></div><button class="btn" id="profileCapture">Capturar snapshot</button></div><div id="profileControlComparison"></div></article><article class="card"><span class="eyebrow">REGRAS</span><h3>Proteções da aplicação</h3><ul class="profileRules"><li>Somente perfis selecionados podem ser utilizados.</li><li>A precedência escolhe um único perfil por produto.</li><li>Simulação não altera o ranking principal.</li><li>Ativação exige confirmação explícita.</li><li>Rollback restaura a configuração anterior.</li><li>Cada recomendação mostra o perfil responsável.</li></ul></article></main></div><div id="profileControlToast" class="v021Toast"></div></section>`);
    $('profileControlNav').onclick = showControl; recommendationNav.onclick = showRecommendations;
    for (const id of ['recommendationSearch', 'recommendationStatus', 'recommendationConfidence']) $(id)?.addEventListener(id === 'recommendationSearch' ? 'input' : 'change', () => setTimeout(renderMainRanking, 0));
    $('recommendationSnapshot').onclick = () => { captureControlledSnapshot(today(), true); toast('Ranking controlado capturado.'); renderMainRanking(); };
    $('recommendationExport').onclick = exportControlledRanking;
    $('profileSimulate').onclick = () => { simulate({ enabledProfileIds: selectedFromForm(), precedence: precedenceFromForm() }); toast('Simulação salva. O ranking principal continua global.'); renderControl(); renderMainRanking(); };
    $('profileActivate').onclick = () => { const enabledProfileIds = selectedFromForm(); if (!enabledProfileIds.length) { toast('Selecione pelo menos um perfil.', true); return; } if (!confirm('Ativar os perfis selecionados no ranking principal?')) return; activate({ enabledProfileIds, precedence: precedenceFromForm() }, 'Ativação confirmada pelo usuário.'); captureControlledSnapshot(today(), true); toast('Perfis ativados no ranking principal.'); renderControl(); renderMainRanking(); };
    $('profileUseGlobal').onclick = () => { if (!confirm('Voltar aos pesos globais no ranking principal?')) return; useGlobal(); toast('Ranking global restaurado.'); renderControl(); renderMainRanking(); };
    $('profileRollback').onclick = () => { const restored = rollback(); toast(restored ? 'Configuração anterior restaurada.' : 'Não há configuração para reverter.', !restored); renderControl(); renderMainRanking(); };
    $('profileOpenRanking').onclick = showRecommendations;
    $('profileCapture').onclick = () => { captureControlledSnapshot(today(), true); toast('Snapshot controlado capturado.'); renderControl(); };
    extendCloud(); enhanceBackup(); captureControlledSnapshot(); renderControl(); renderMainRanking();
    ROOT.addEventListener?.('commerce-radar-segment-profile-updated', () => { renderControl(); renderMainRanking(); });
    ROOT.addEventListener?.('commerce-radar-profile-control-updated', () => { renderControl(); renderMainRanking(); });
    ROOT.addEventListener?.('commerce-radar-recommendation-action', renderMainRanking);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) { renderControl(); renderMainRanking(); } });
    return true;
  }
  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 420) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarRecommendationProfileControl = { KEYS, DEFAULTS, settings, profiles, segmentOf, profileMatches, selectProfile, applyProfilesToRanking, compareRankings, saveControl, activate, simulate, useGlobal, rollback, captureControlledSnapshot };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();