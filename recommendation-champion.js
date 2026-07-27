(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const CONTROL = ROOT.CommerceRadarRecommendationProfileControl;
  const DRIFT = ROOT.CommerceRadarRecommendationDrift;
  const RECOMMEND = ROOT.CommerceRadarRecommendations;

  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    tests: 'tehkne-commerce-radar-v2-tests',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    opportunities: 'tehkne-commerce-radar-v2-custom-opportunities',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    experiments: 'tehkne-commerce-radar-v65-champion-experiments',
    snapshots: 'tehkne-commerce-radar-v65-champion-snapshots',
    decisions: 'tehkne-commerce-radar-v65-champion-decisions',
    settings: 'tehkne-commerce-radar-v65-champion-settings',
  };

  const DEFAULTS = {
    horizonDays: 21,
    lookbackDays: 90,
    minimumSample: 6,
    minimumSuccess: 2,
    minimumFailure: 2,
    positiveThreshold: 64,
    minimumAccuracyGain: 5,
    minimumBrierGain: 0.03,
  };

  const STATUS = {
    draft: 'Rascunho',
    running: 'Em sombra',
    paused: 'Pausado',
    completed: 'Concluído',
    promoted: 'Promovido',
    rejected: 'Rejeitado',
  };

  const RESULT = {
    insufficient: { label: 'Amostra insuficiente', recommendation: 'Continue o modo sombra até atingir a amostra mínima.' },
    challenger: { label: 'Challenger superior', recommendation: 'O challenger pode ser promovido após revisão humana.' },
    champion: { label: 'Champion superior', recommendation: 'Mantenha o champion e revise a hipótese do challenger.' },
    tie: { label: 'Sem vencedor', recommendation: 'Amplie a amostra ou teste uma diferença mais relevante.' },
    stale: { label: 'Baseline alterado', recommendation: 'O champion ativo mudou. Reinicie ou encerre o experimento antes de promover.' },
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const addDays = (value, days) => { const date = new Date(`${String(value || today()).slice(0, 10)}T12:00:00`); date.setDate(date.getDate() + Number(days || 0)); return date.toISOString().slice(0, 10); };
  const monday = (value) => { const date = new Date(`${String(value || today()).slice(0, 10)}T12:00:00`); const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); return date.toISOString().slice(0, 10); };

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function experiments() { return read(KEYS.experiments, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function decisions() { return read(KEYS.decisions, []); }
  function profiles() { return CONTROL?.profiles?.() || []; }
  function sourceInput() {
    return {
      signals: read(KEYS.signals, []), tests: read(KEYS.tests, []), audits: read(KEYS.audits, []), analyses: read(KEYS.analyses, []), opportunities: read(KEYS.opportunities, []), plans: read(KEYS.plans, []),
    };
  }

  function normalizeControl(value = {}) {
    const precedence = Array.isArray(value.precedence) ? [...new Set(value.precedence.filter(Boolean))] : ['category', 'channel', 'maturity'];
    for (const dimension of ['category', 'channel', 'maturity']) if (!precedence.includes(dimension)) precedence.push(dimension);
    return {
      mode: value.mode === 'global' ? 'global' : 'active',
      enabledProfileIds: Array.isArray(value.enabledProfileIds) ? [...new Set(value.enabledProfileIds)] : [],
      precedence: precedence.slice(0, 3),
    };
  }

  function configHash(value = {}) {
    const config = normalizeControl(value);
    return JSON.stringify({ mode: config.mode, enabledProfileIds: [...config.enabledProfileIds].sort(), precedence: config.precedence });
  }

  function saveExperiment(row) {
    write(KEYS.experiments, [row, ...experiments().filter((item) => item.id !== row.id)].slice(0, 100));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-champion-updated', { detail: row }));
    return row;
  }

  function createExperiment(input = {}, championConfig = CONTROL?.settings?.() || { mode: 'global' }) {
    const champion = normalizeControl(championConfig);
    const challenger = normalizeControl({ mode: 'active', enabledProfileIds: input.enabledProfileIds || [], precedence: input.precedence || champion.precedence });
    if (!challenger.enabledProfileIds.length) throw new Error('Selecione ao menos um perfil challenger.');
    const createdAt = new Date().toISOString();
    const row = {
      id: `champion-${uid()}`,
      name: safe(input.name || `Experimento ${new Date().toLocaleDateString('pt-BR')}`, 120),
      hypothesis: safe(input.hypothesis, 800),
      status: 'draft',
      champion,
      challenger,
      championHash: configHash(champion),
      challengerHash: configHash(challenger),
      createdAt,
      startedAt: '',
      endedAt: '',
      signature: 'Tehkné Solutions',
    };
    return saveExperiment(row);
  }

  function setExperimentStatus(id, status) {
    const row = experiments().find((item) => item.id === id);
    if (!row || !STATUS[status]) return null;
    const now = new Date().toISOString();
    return saveExperiment({ ...row, status, startedAt: status === 'running' && !row.startedAt ? now : row.startedAt, endedAt: ['completed', 'promoted', 'rejected'].includes(status) ? now : row.endedAt, updatedAt: now });
  }

  function buildRanking(config, input = sourceInput(), reference = today()) {
    if (!CONTROL?.applyProfilesToRanking) return [];
    const normalized = normalizeControl(config);
    return CONTROL.applyProfilesToRanking(input, reference, normalized, profiles(), normalized.mode === 'active');
  }

  function captureShadow(experimentId, reference = today(), force = false) {
    const experiment = experiments().find((item) => item.id === experimentId);
    if (!experiment) return null;
    const champion = buildRanking(experiment.champion, sourceInput(), reference);
    const challenger = buildRanking(experiment.challenger, sourceInput(), reference);
    const championMap = new Map(champion.map((item, index) => [item.key, { item, position: index + 1 }]));
    const rows = challenger.map((item, index) => {
      const base = championMap.get(item.key);
      return {
        key: item.key,
        product: item.product,
        championScore: base?.item.score ?? item.globalScore ?? item.score,
        challengerScore: item.score,
        championPosition: base?.position || index + 1,
        challengerPosition: index + 1,
        championProfileId: base?.item.appliedProfile?.id || '',
        challengerProfileId: item.appliedProfile?.id || '',
        confidence: item.confidence,
      };
    });
    const id = `champion-shadow-${experimentId}-${reference}`;
    const row = { id, experimentId, date: reference, week: monday(reference), rows, championHash: experiment.championHash, challengerHash: experiment.challengerHash, createdAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
    const current = snapshots();
    if (!force && current.some((item) => item.id === id)) return current.find((item) => item.id === id);
    write(KEYS.snapshots, [row, ...current.filter((item) => item.id !== id)].slice(0, 365));
    return row;
  }

  function dedupeCases(experimentId, config = settings(), reference = today()) {
    const cutoff = addDays(reference, -Math.max(1, num(config.lookbackDays, 90)));
    const latest = new Map();
    const rows = snapshots().filter((snapshot) => snapshot.experimentId === experimentId && snapshot.date >= cutoff);
    for (const snapshot of rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
      for (const item of snapshot.rows || []) latest.set(`${item.key}:${snapshot.week || monday(snapshot.date)}`, { ...item, date: snapshot.date, week: snapshot.week || monday(snapshot.date), experimentId });
    }
    return [...latest.values()];
  }

  function evaluateExperiment(experimentId, input = sourceInput(), config = settings(), reference = today()) {
    const experiment = experiments().find((item) => item.id === experimentId);
    if (!experiment) return null;
    const cases = dedupeCases(experimentId, config, reference).map((row) => ({ ...row, outcome: DRIFT?.outcomeFor?.(row, input, config, reference) || { status: 'inconclusive' } }));
    const champion = DRIFT?.classificationMetrics?.(cases, 'championScore', config.positiveThreshold) || emptyMetrics();
    const challenger = DRIFT?.classificationMetrics?.(cases, 'challengerScore', config.positiveThreshold) || emptyMetrics();
    const currentHash = configHash(CONTROL?.settings?.() || {});
    const stale = currentHash !== experiment.championHash;
    const eligible = challenger.total >= config.minimumSample && challenger.success >= config.minimumSuccess && challenger.failure >= config.minimumFailure;
    const accuracyDelta = challenger.accuracy - champion.accuracy;
    const brierDelta = challenger.brier - champion.brier;
    let result = 'insufficient';
    if (stale) result = 'stale';
    else if (eligible) {
      const challengerWins = (accuracyDelta >= config.minimumAccuracyGain && brierDelta <= 0.02) || (brierDelta <= -config.minimumBrierGain && accuracyDelta >= -2);
      const championWins = (accuracyDelta <= -config.minimumAccuracyGain && brierDelta >= -0.02) || (brierDelta >= config.minimumBrierGain && accuracyDelta <= 2);
      result = challengerWins ? 'challenger' : championWins ? 'champion' : 'tie';
    }
    return {
      experiment, cases, champion, challenger, eligible, stale, result,
      accuracyDelta, brierDelta,
      pending: cases.filter((row) => row.outcome.status === 'pending').length,
      inconclusive: cases.filter((row) => row.outcome.status === 'inconclusive').length,
      recommendation: RESULT[result].recommendation,
    };
  }

  function emptyMetrics() { return { total: 0, tp: 0, fp: 0, tn: 0, fn: 0, success: 0, failure: 0, accuracy: 0, precision: 0, recall: 0, brier: 0 }; }

  function saveDecision(experimentId, decision, note = '') {
    const row = { id: `champion-decision-${uid()}`, experimentId, decision, note: safe(note, 1000), at: new Date().toISOString(), signature: 'Tehkné Solutions' };
    write(KEYS.decisions, [row, ...decisions()].slice(0, 300));
    return row;
  }

  function promoteChallenger(experimentId, note = '', override = false) {
    const evaluation = evaluateExperiment(experimentId);
    if (!evaluation) return { ok: false, reason: 'Experimento não encontrado.' };
    if (!override && evaluation.result !== 'challenger') return { ok: false, reason: 'O challenger ainda não possui evidência suficiente de superioridade.' };
    if (!CONTROL?.activate) return { ok: false, reason: 'Controle de perfis indisponível.' };
    CONTROL.activate(evaluation.experiment.challenger, `Champion–challenger ${evaluation.experiment.name}. ${safe(note, 500)}`);
    setExperimentStatus(experimentId, 'promoted');
    saveDecision(experimentId, 'promote', note);
    return { ok: true, evaluation };
  }

  function keepChampion(experimentId, note = '') {
    setExperimentStatus(experimentId, 'rejected');
    saveDecision(experimentId, 'keep_champion', note);
    return true;
  }

  function render() {
    const all = experiments();
    const running = all.filter((item) => item.status === 'running');
    const evaluations = all.map((item) => evaluateExperiment(item.id)).filter(Boolean);
    const summary = $('championSummary');
    if (summary) summary.innerHTML = [
      ['Experimentos', all.length, 'total'],
      ['Em sombra', running.length, 'sem alterar ranking'],
      ['Challenger superior', evaluations.filter((row) => row.result === 'challenger').length, 'elegíveis'],
      ['Baseline alterado', evaluations.filter((row) => row.stale).length, 'requer reinício'],
    ].map(([label, value, note]) => `<article class="card championMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');

    const list = $('championExperiments');
    if (list) list.innerHTML = evaluations.length ? evaluations.map((row) => {
      const experiment = row.experiment;
      return `<article class="card championCard result-${row.result}"><div class="championHead"><div><span>${esc(STATUS[experiment.status] || experiment.status)}</span><h3>${esc(experiment.name)}</h3><p>${esc(experiment.hypothesis || 'Sem hipótese registrada.')}</p></div><b>${esc(RESULT[row.result].label)}</b></div><div class="championCompare"><span><small>Acurácia champion</small><b>${row.champion.accuracy.toFixed(1)}%</b></span><span><small>Acurácia challenger</small><b>${row.challenger.accuracy.toFixed(1)}%</b></span><span><small>Diferença</small><b>${row.accuracyDelta >= 0 ? '+' : ''}${row.accuracyDelta.toFixed(1)} p.p.</b></span><span><small>Brier Δ</small><b>${row.brierDelta >= 0 ? '+' : ''}${row.brierDelta.toFixed(3)}</b></span></div><p class="muted">${row.challenger.total} conclusivos · ${row.pending} pendentes · ${row.inconclusive} inconclusivos. ${esc(row.recommendation)}</p><div class="actions"><button class="btn" data-shadow="${esc(experiment.id)}">Capturar sombra</button>${experiment.status === 'draft' || experiment.status === 'paused' ? `<button class="btn" data-start="${esc(experiment.id)}">Iniciar</button>` : ''}${experiment.status === 'running' ? `<button class="btn" data-pause="${esc(experiment.id)}">Pausar</button>` : ''}<button class="btn" data-keep="${esc(experiment.id)}">Manter champion</button><button class="btn primary" data-promote="${esc(experiment.id)}" ${row.result !== 'challenger' ? 'disabled' : ''}>Promover challenger</button></div></article>`;
    }).join('') : '<div class="card empty"><h3>Nenhum experimento</h3><p class="muted">Crie um challenger com perfis e precedência diferentes do ranking atual.</p></div>';

    list?.querySelectorAll('[data-shadow]').forEach((button) => { button.onclick = () => { captureShadow(button.dataset.shadow, today(), true); toast('Snapshot sombra capturado.'); render(); }; });
    list?.querySelectorAll('[data-start]').forEach((button) => { button.onclick = () => { setExperimentStatus(button.dataset.start, 'running'); captureShadow(button.dataset.start, today(), true); toast('Experimento iniciado em modo sombra.'); render(); }; });
    list?.querySelectorAll('[data-pause]').forEach((button) => { button.onclick = () => { setExperimentStatus(button.dataset.pause, 'paused'); toast('Experimento pausado.'); render(); }; });
    list?.querySelectorAll('[data-keep]').forEach((button) => { button.onclick = () => { const note = prompt('Motivo para manter o champion:', '') ?? ''; keepChampion(button.dataset.keep, note); toast('Champion mantido e decisão registrada.'); render(); }; });
    list?.querySelectorAll('[data-promote]').forEach((button) => { button.onclick = () => { if (!confirm('Promover o challenger e substituir a configuração ativa?')) return; const note = prompt('Observação da promoção:', '') ?? ''; const result = promoteChallenger(button.dataset.promote, note); toast(result.ok ? 'Challenger promovido.' : result.reason, !result.ok); render(); }; });

    const profileNode = $('challengerProfiles');
    if (profileNode) profileNode.innerHTML = profiles().map((profile) => `<label class="challengerToggle"><input type="checkbox" data-challenger-profile value="${esc(profile.id)}"><span><b>${esc(profile.dimension)}: ${esc(profile.label)}</b><small>${profile.sample || 0} casos</small></span></label>`).join('') || '<p class="muted">Nenhum perfil segmentado disponível.</p>';

    const historyNode = $('championHistory');
    if (historyNode) historyNode.innerHTML = decisions().slice(0, 12).map((row) => `<div class="championHistoryRow"><span>${new Date(row.at).toLocaleString('pt-BR')}</span><b>${esc(row.decision)}</b><small>${esc(row.note || '')}</small></div>`).join('') || '<p class="muted">Nenhuma decisão registrada.</p>';
  }

  function toast(message, error = false) {
    let node = $('championToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'championToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'championChallenger'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'championNav'));
    if ($('title')) $('title').textContent = 'Compare champion e challenger em modo sombra';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function selectedProfiles() { return [...document.querySelectorAll('[data-challenger-profile]:checked')].map((input) => input.value); }
  function selectedPrecedence() {
    const values = [$('challengerPrecedence1')?.value, $('challengerPrecedence2')?.value, $('challengerPrecedence3')?.value].filter(Boolean);
    return [...new Set([...values, 'category', 'channel', 'maturity'])].slice(0, 3);
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.championExperiments = KEYS.experiments;
      keys.championSnapshots = KEYS.snapshots;
      keys.championDecisions = KEYS.decisions;
      keys.championSettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { experiments: [], snapshots: [], decisions: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 380) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.6.5', exportedAt: new Date().toISOString(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.championExperiments = experiments(); payload.championSnapshots = snapshots(); payload.championDecisions = decisions(); payload.championSettings = settings();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const payload = JSON.parse(await file.text()); pending = { experiments: Array.isArray(payload.championExperiments) ? payload.championExperiments : [], snapshots: Array.isArray(payload.championSnapshots) ? payload.championSnapshots : [], decisions: Array.isArray(payload.championDecisions) ? payload.championDecisions : [], settings: payload.championSettings || {} }; }
        catch { pending = { experiments: [], snapshots: [], decisions: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.experiments, [...new Map([...experiments(), ...pending.experiments].map((item) => [item.id, item])).values()].slice(0, 100));
        write(KEYS.snapshots, [...new Map([...snapshots(), ...pending.snapshots].map((item) => [item.id, item])).values()].slice(0, 365));
        write(KEYS.decisions, [...new Map([...decisions(), ...pending.decisions].map((item) => [item.id, item])).values()].slice(0, 300));
        write(KEYS.settings, { ...settings(), ...pending.settings }); render();
      });
      replace.addEventListener('click', () => { write(KEYS.experiments, pending.experiments); write(KEYS.snapshots, pending.snapshots); write(KEYS.decisions, pending.decisions); write(KEYS.settings, pending.settings); render(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const driftNav = $('profileDriftNav'); const driftView = $('profileDrift');
    if (!driftNav || !driftView || $('championNav')) return false;
    driftNav.insertAdjacentHTML('afterend', '<button class="nav" id="championNav"><span>Champion–challenger</span><b id="championNavCount"></b></button>');
    driftView.insertAdjacentHTML('afterend', `<section class="view" id="championChallenger"><div class="sectionHead"><div><span class="eyebrow">MODO SOMBRA</span><h2>Champion–challenger</h2><p class="muted">Compare a configuração ativa com uma candidata usando os mesmos produtos e resultados. O challenger não altera o ranking até uma promoção manual.</p></div></div><div class="championSummary" id="championSummary"></div><div class="championLayout"><aside><article class="card"><span class="eyebrow">NOVO EXPERIMENTO</span><h3>Defina o challenger</h3><label class="field"><span>Nome</span><input id="challengerName" maxlength="120" placeholder="Ex.: Categoria antes de canal"></label><label class="field"><span>Hipótese</span><textarea id="challengerHypothesis" rows="3" maxlength="800" placeholder="O que deve melhorar e por quê?"></textarea></label><div id="challengerProfiles"></div><div class="challengerPrecedence"><label class="field"><span>1ª precedência</span><select id="challengerPrecedence1"><option value="category">Categoria</option><option value="channel">Canal</option><option value="maturity">Maturidade</option></select></label><label class="field"><span>2ª</span><select id="challengerPrecedence2"><option value="channel">Canal</option><option value="category">Categoria</option><option value="maturity">Maturidade</option></select></label><label class="field"><span>3ª</span><select id="challengerPrecedence3"><option value="maturity">Maturidade</option><option value="category">Categoria</option><option value="channel">Canal</option></select></label></div><button class="btn primary" id="createChallenger">Criar experimento</button></article><article class="card"><span class="eyebrow">DECISÕES</span><h3>Histórico</h3><div id="championHistory"></div></article></aside><main><div id="championExperiments" class="championExperiments"></div><article class="card"><span class="eyebrow">PROTEÇÕES</span><h3>Regras do modo sombra</h3><ul class="championRules"><li>Champion e challenger usam os mesmos produtos e resultados.</li><li>O ranking operacional permanece no champion durante o teste.</li><li>A configuração dos dois lados é congelada no início.</li><li>Alteração externa do champion invalida a promoção direta.</li><li>Promoção exige amostra suficiente e confirmação explícita.</li><li>Nenhuma troca ocorre automaticamente.</li></ul></article></main></div><div id="championToast" class="v021Toast"></div></section>`);
    $('championNav').onclick = showView;
    $('createChallenger').onclick = () => {
      try {
        const experiment = createExperiment({ name: $('challengerName').value, hypothesis: $('challengerHypothesis').value, enabledProfileIds: selectedProfiles(), precedence: selectedPrecedence() });
        setExperimentStatus(experiment.id, 'running'); captureShadow(experiment.id, today(), true); toast('Experimento criado e iniciado em modo sombra.'); render();
      } catch (error) { toast(error.message || 'Não foi possível criar o experimento.', true); }
    };
    extendCloud(); enhanceBackup(); render();
    ROOT.addEventListener?.('commerce-radar-profile-control-updated', render);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key)) render(); });
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 520) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarChampionChallenger = {
    KEYS, DEFAULTS, normalizeControl, configHash, createExperiment, setExperimentStatus, buildRanking, captureShadow, dedupeCases, evaluateExperiment, saveDecision, promoteChallenger, keepChampion,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();