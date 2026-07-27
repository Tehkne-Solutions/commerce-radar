(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const TRENDS = ROOT.CommerceRadarTrends;
  const RECOMMENDATIONS = ROOT.CommerceRadarRecommendations;
  const IDENTITY = ROOT.CommerceRadarLocalIdentity;

  const KEYS = {
    state: 'tehkne-commerce-radar-v70-onboarding-state',
    events: 'tehkne-commerce-radar-v70-onboarding-events',
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    imports: 'tehkne-commerce-radar-v4-imports',
    opportunities: 'tehkne-commerce-radar-v2-custom-opportunities',
    tests: 'tehkne-commerce-radar-v2-tests',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    plans: 'tehkne-commerce-radar-v45-financial-plans',
    recommendationSettings: 'tehkne-commerce-radar-v6-recommendation-settings',
  };

  const CHANNELS = [
    'Mercado Livre',
    'Shopee',
    'TikTok Shop',
    'Instagram + WhatsApp',
    'Loja própria',
    'WooCommerce',
    'Shopify',
    'Afiliados',
  ];

  const MODELS = {
    direct: 'Loja direta',
    dropshipping: 'Dropshipping',
    resale: 'Revenda',
    affiliate: 'Afiliados',
    mixed: 'Modelo misto',
  };

  const OBJECTIVES = {
    discover: 'Descobrir o primeiro produto',
    validate: 'Validar uma ideia existente',
    margin: 'Encontrar produtos com margem',
    diversify: 'Abrir um novo canal',
  };

  const CATEGORY_LABELS = {
    casa: 'Casa e organização', negocios: 'Pequenos negócios', tecnologia: 'Tecnologia', beleza: 'Beleza e autocuidado',
    moda: 'Moda e acessórios', pet: 'Pet', creator: 'Creators', automotivo: 'Automotivo', infantil: 'Infantil', outros: 'Outros',
  };

  const STEPS = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'channels', label: 'Canais' },
    { id: 'team', label: 'Equipe' },
    { id: 'data', label: 'Dados' },
    { id: 'product', label: 'Produto' },
    { id: 'recommendation', label: 'Recomendação' },
  ];

  const DEFAULT_STATE = {
    version: '0.7.0',
    status: 'new',
    currentStep: 0,
    workspace: {
      name: '', model: 'mixed', objective: 'discover', monthlyBudget: 0, targetDays: 30,
    },
    channels: [],
    dataMode: '',
    starterProductKey: '',
    firstRecommendation: null,
    startedAt: '',
    completedAt: '',
    dismissedAt: '',
  };

  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp5 = (value, fallback = 3) => Math.max(1, Math.min(5, Math.round(num(value, fallback))));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const normalizeKey = (value) => safe(value, 160).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function parseMoney(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = safe(value, 80).replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    const comma = text.lastIndexOf(',');
    const dot = text.lastIndexOf('.');
    if (comma > dot) text = text.replace(/\./g, '').replace(',', '.');
    else if (dot > comma && comma >= 0) text = text.replace(/,/g, '');
    else if (comma >= 0) text = text.replace(',', '.');
    const parsed = Number(text.replace(/[^0-9+\-.]/g, ''));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function state() {
    const saved = read(KEYS.state, {});
    return {
      ...DEFAULT_STATE,
      ...saved,
      workspace: { ...DEFAULT_STATE.workspace, ...(saved.workspace || {}) },
      channels: Array.isArray(saved.channels) ? saved.channels : [],
    };
  }

  function saveState(patch = {}) {
    const current = state();
    const next = {
      ...current,
      ...patch,
      version: '0.7.0',
      workspace: { ...current.workspace, ...(patch.workspace || {}) },
      channels: Array.isArray(patch.channels) ? patch.channels : current.channels,
      startedAt: current.startedAt || patch.startedAt || nowIso(),
      updatedAt: nowIso(),
    };
    write(KEYS.state, next);
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-onboarding-updated', { detail: next }));
    return next;
  }

  function events() { return read(KEYS.events, []); }

  function appendEvent(type, detail = {}) {
    const row = { id: `onboarding-event-${uid()}`, type, detail, at: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.events, [row, ...events()].slice(0, 500));
    return row;
  }

  function users() {
    if (IDENTITY?.users) return IDENTITY.users();
    return read('tehkne-commerce-radar-v68-identity-users', []);
  }

  function loadRecommendationInput() {
    return {
      signals: read(KEYS.signals, []),
      tests: read(KEYS.tests, []),
      audits: read(KEYS.audits, []),
      analyses: read(KEYS.analyses, []),
      opportunities: read(KEYS.opportunities, []),
      plans: read(KEYS.plans, []),
    };
  }

  function buildFirstRecommendation(reference = today()) {
    if (!RECOMMENDATIONS?.buildRanking) return null;
    const config = read(KEYS.recommendationSettings, RECOMMENDATIONS.DEFAULTS || {});
    const ranking = RECOMMENDATIONS.buildRanking(loadRecommendationInput(), reference, config);
    const starterKey = state().starterProductKey;
    return ranking.find((row) => row.key === starterKey) || ranking[0] || null;
  }

  function dataCounts() {
    return {
      imports: read(KEYS.imports, []).length,
      signals: read(KEYS.signals, []).length,
      opportunities: read(KEYS.opportunities, []).length,
      tests: read(KEYS.tests, []).length,
      analyses: read(KEYS.analyses, []).length,
      audits: read(KEYS.audits, []).length,
    };
  }

  function progress(reference = today()) {
    const current = state();
    const counts = dataCounts();
    const first = buildFirstRecommendation(reference);
    const steps = {
      workspace: Boolean(current.workspace.name && current.workspace.model && current.workspace.objective),
      channels: current.channels.length > 0,
      team: users().length > 0,
      data: Object.values(counts).some((value) => value > 0),
      product: Boolean(current.starterProductKey || counts.imports || counts.opportunities || counts.signals),
      recommendation: Boolean(first),
    };
    const completed = Object.values(steps).filter(Boolean).length;
    return { steps, completed, total: STEPS.length, percent: Math.round((completed / STEPS.length) * 100), counts, recommendation: first };
  }

  function saveWorkspace(input = {}) {
    const name = safe(input.name, 120);
    const model = MODELS[input.model] ? input.model : 'mixed';
    const objective = OBJECTIVES[input.objective] ? input.objective : 'discover';
    if (!name) throw new Error('Informe um nome para o workspace.');
    const workspace = {
      name,
      model,
      objective,
      monthlyBudget: parseMoney(input.monthlyBudget),
      targetDays: Math.max(7, Math.min(365, Math.round(num(input.targetDays, 30)))),
    };
    saveState({ workspace, status: 'in_progress' });
    appendEvent('workspace_configured', { name, model, objective, monthlyBudget: workspace.monthlyBudget, targetDays: workspace.targetDays });
    return workspace;
  }

  function saveChannels(channels = []) {
    const selected = [...new Set((Array.isArray(channels) ? channels : []).map((item) => safe(item, 80)).filter((item) => CHANNELS.includes(item)))];
    if (!selected.length) throw new Error('Selecione pelo menos um canal para começar.');
    saveState({ channels: selected, status: 'in_progress' });
    appendEvent('channels_selected', { channels: selected });
    return selected;
  }

  async function createAdministrator(input = {}) {
    if (users().length) return users()[0];
    if (!IDENTITY?.createUser) throw new Error('O módulo de identidade ainda não está disponível.');
    const row = await IDENTITY.createUser({
      name: safe(input.name, 120),
      email: safe(input.email, 180),
      pin: String(input.pin ?? ''),
      profileId: 'administrator',
    }, null);
    appendEvent('administrator_created', { userId: row.id, name: row.name });
    saveState({ status: 'in_progress' });
    return row;
  }

  async function createTeamMember(input = {}) {
    if (!IDENTITY?.createUser) throw new Error('O módulo de identidade ainda não está disponível.');
    const actor = IDENTITY.currentUser?.();
    if (!actor || !IDENTITY.hasPermission?.('identity.manage', actor)) throw new Error('Entre com um administrador para adicionar integrantes.');
    const row = await IDENTITY.createUser({
      name: safe(input.name, 120),
      email: safe(input.email, 180),
      pin: String(input.pin ?? ''),
      profileId: safe(input.profileId || 'viewer', 80),
    }, actor);
    appendEvent('team_member_created', { userId: row.id, name: row.name, profileId: row.profileId });
    return row;
  }

  function saveDataMode(mode) {
    const allowed = ['existing', 'import', 'manual'];
    if (!allowed.includes(mode)) throw new Error('Selecione uma origem de dados válida.');
    saveState({ dataMode: mode, status: 'in_progress' });
    appendEvent('data_mode_selected', { mode });
    return mode;
  }

  function starterOpportunity(signal, input, workspace) {
    const price = parseMoney(input.price);
    const cost = parseMoney(input.cost);
    const margin = price > 0 ? Math.max(0, Math.min(100, ((price - cost) / price) * 100)) : 20 + ((clamp5(input.margin) - 1) / 4) * 50;
    const capital = parseMoney(input.capital);
    const channel = CHANNELS.includes(input.channel) ? input.channel : state().channels[0] || 'Shopee';
    return {
      id: `onboarding-opportunity-${signal.topicKey || normalizeKey(signal.topic)}`,
      custom: true,
      onboardingSource: true,
      name: signal.topic,
      category: signal.category,
      problem: safe(input.problem, 500) || `Validar se ${signal.topic} possui demanda, margem e operação sustentável no canal ${channel}.`,
      capital,
      ticket: price,
      margin: Math.round(margin * 10) / 10,
      model: workspace.model,
      channel,
      test: `Executar um teste de 7 dias em ${channel}, registrar cliques, pedidos, custos e margem líquida.`,
      demand: signal.demand,
      visual: 3,
      recurrence: 3,
      different: 3,
      competition: signal.competition,
      risk: signal.risk,
      score: TRENDS?.signalScore?.(signal)?.score || 40,
      created: nowIso(),
      updatedAt: nowIso(),
      onboardingMetadata: { sourceSignalId: signal.id, workspace: workspace.name },
    };
  }

  function starterAnalysis(signal, opportunity) {
    const profit = Math.max(0, num(opportunity.ticket) - (num(opportunity.ticket) * (1 - num(opportunity.margin) / 100)));
    return {
      id: `onboarding-analysis-${signal.topicKey || normalizeKey(signal.topic)}`,
      product: signal.topic,
      score: Math.round((TRENDS?.signalScore?.(signal)?.score || 40) * 0.7 + Math.min(100, opportunity.margin * 1.5) * 0.3),
      margin: opportunity.margin,
      profit,
      risk: signal.risk,
      channels: [{ name: opportunity.channel }],
      created: nowIso(),
      createdAt: nowIso(),
      onboardingSource: true,
    };
  }

  function saveStarterProduct(input = {}) {
    if (!TRENDS?.normalizeSignal) throw new Error('O Radar de tendências ainda não está disponível.');
    const product = safe(input.product, 140);
    const evidence = safe(input.evidence, 1200);
    if (!product) throw new Error('Informe o produto ou tema que deseja avaliar.');
    if (evidence.length < 12) throw new Error('Descreva uma evidência concreta com pelo menos 12 caracteres.');
    const productKey = normalizeKey(product);
    const signal = TRENDS.normalizeSignal({
      id: `onboarding-signal-${productKey.replace(/\s+/g, '-')}`,
      topic: product,
      category: CATEGORY_LABELS[input.category] ? input.category : 'outros',
      sourceType: TRENDS.SOURCES?.[input.sourceType] ? input.sourceType : 'other',
      sourceName: safe(input.sourceName, 120) || 'Evidência inicial do onboarding',
      sourceUrl: safe(input.sourceUrl, 600),
      geography: 'Brasil',
      period: safe(input.period, 100) || 'observação inicial',
      observedAt: input.observedAt || today(),
      validDays: Math.max(7, Math.min(365, num(input.validDays, 30))),
      growth: clamp5(input.growth), demand: clamp5(input.demand), competition: clamp5(input.competition),
      margin: clamp5(input.margin), risk: clamp5(input.risk), confidence: clamp5(input.confidence),
      evidence,
      notes: 'Cadastrado pela configuração guiada do Commerce Radar.',
      createdAt: nowIso(),
    });
    const signalRows = read(KEYS.signals, []);
    write(KEYS.signals, [signal, ...signalRows.filter((row) => row.id !== signal.id)]);

    const workspace = state().workspace;
    const opportunity = starterOpportunity(signal, input, workspace);
    const opportunities = read(KEYS.opportunities, []);
    write(KEYS.opportunities, [opportunity, ...opportunities.filter((row) => row.id !== opportunity.id)]);

    const analysis = starterAnalysis(signal, opportunity);
    const analyses = read(KEYS.analyses, []);
    write(KEYS.analyses, [analysis, ...analyses.filter((row) => row.id !== analysis.id)]);

    const recommendation = buildFirstRecommendation();
    const summary = recommendation ? {
      key: recommendation.key,
      product: recommendation.product,
      score: recommendation.score,
      confidence: recommendation.confidence,
      classification: recommendation.classification,
      nextAction: recommendation.nextAction,
      capturedAt: nowIso(),
    } : null;
    saveState({ starterProductKey: productKey, firstRecommendation: summary, dataMode: 'manual', status: 'in_progress' });
    appendEvent('starter_product_created', { product, signalId: signal.id, opportunityId: opportunity.id, recommendation: summary });
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-recommendation-action', { detail: { type: 'onboarding', product } }));
    return { signal, opportunity, analysis, recommendation };
  }

  function completeOnboarding(reference = today()) {
    const result = progress(reference);
    const missing = STEPS.filter((step) => !result.steps[step.id]).map((step) => step.label);
    if (missing.length) throw new Error(`Conclua antes: ${missing.join(', ')}.`);
    const current = saveState({ status: 'completed', currentStep: STEPS.length - 1, completedAt: nowIso(), firstRecommendation: result.recommendation ? {
      key: result.recommendation.key,
      product: result.recommendation.product,
      score: result.recommendation.score,
      confidence: result.recommendation.confidence,
      classification: result.recommendation.classification,
      nextAction: result.recommendation.nextAction,
      capturedAt: nowIso(),
    } : state().firstRecommendation });
    appendEvent('onboarding_completed', { workspace: current.workspace.name, channels: current.channels, recommendation: current.firstRecommendation });
    return current;
  }

  function setStep(index) {
    const bounded = Math.max(0, Math.min(STEPS.length - 1, Math.round(num(index, 0))));
    saveState({ currentStep: bounded, status: state().status === 'new' ? 'in_progress' : state().status });
    render();
    return bounded;
  }

  function openViewByNav(id) {
    const button = $(id);
    if (!button) throw new Error('A área solicitada ainda não terminou de carregar.');
    button.click();
  }

  function toast(message, error = false) {
    let node = $('onboardingToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'onboardingToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 4000);
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'guidedOnboarding'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'onboardingNav'));
    if ($('title')) $('title').textContent = 'Configure o Commerce Radar passo a passo';
    document.querySelector('.side')?.classList.remove('open');
    render();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function stepWorkspace(current) {
    const workspace = current.workspace;
    return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 1</span><h3>Defina o objetivo do workspace</h3><p class="muted">Essas informações orientam os canais e os próximos passos. Nenhum valor é tratado como garantia de resultado.</p><div class="onboardingFormGrid"><label class="field wide"><span>Nome do workspace</span><input id="onboardingWorkspaceName" value="${esc(workspace.name)}" placeholder="Ex.: Operação ecommerce 2026"></label><label class="field"><span>Modelo inicial</span><select id="onboardingModel">${Object.entries(MODELS).map(([id, label]) => `<option value="${id}" ${workspace.model === id ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label class="field"><span>Objetivo</span><select id="onboardingObjective">${Object.entries(OBJECTIVES).map(([id, label]) => `<option value="${id}" ${workspace.objective === id ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label class="field"><span>Orçamento mensal disponível</span><input id="onboardingBudget" inputmode="decimal" value="${workspace.monthlyBudget ? esc(BRL.format(workspace.monthlyBudget)) : ''}" placeholder="R$ 0,00"></label><label class="field"><span>Prazo da primeira validação</span><input id="onboardingTargetDays" type="number" min="7" max="365" value="${workspace.targetDays}"></label></div><div class="actions"><button class="btn primary" id="onboardingSaveWorkspace">Salvar e continuar</button></div></article>`;
  }

  function stepChannels(current) {
    return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 2</span><h3>Escolha os canais que deseja avaliar</h3><p class="muted">Selecione canais de interesse, mesmo que ainda não exista uma conta ativa neles.</p><div class="onboardingChoices">${CHANNELS.map((channel) => `<label class="onboardingChoice"><input type="checkbox" value="${esc(channel)}" data-onboarding-channel ${current.channels.includes(channel) ? 'checked' : ''}><span><b>${esc(channel)}</b><small>${channel === 'Loja própria' ? 'Operação independente' : channel.includes('Instagram') ? 'Venda conversacional' : 'Canal comercial'}</small></span></label>`).join('')}</div><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn primary" id="onboardingSaveChannels">Salvar e continuar</button></div></article>`;
  }

  function stepTeam() {
    const currentUsers = users();
    const actor = IDENTITY?.currentUser?.();
    const canManage = Boolean(actor && IDENTITY?.hasPermission?.('identity.manage', actor));
    if (!currentUsers.length) return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 3</span><h3>Crie o primeiro administrador</h3><p class="muted">O PIN será armazenado com salt e hash. A sessão permanece somente neste navegador.</p><div class="onboardingFormGrid"><label class="field"><span>Nome</span><input id="onboardingAdminName"></label><label class="field"><span>E-mail</span><input id="onboardingAdminEmail" type="email"></label><label class="field"><span>PIN</span><input id="onboardingAdminPin" type="password" minlength="4" maxlength="32"></label></div><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn primary" id="onboardingCreateAdmin">Criar administrador e continuar</button></div></article>`;
    return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 3</span><h3>Equipe operacional</h3><p class="muted">${currentUsers.length} usuário(s) cadastrado(s). A criação de integrantes adicionais exige uma sessão administrativa.</p><div class="onboardingTeamList">${currentUsers.slice(0, 8).map((user) => `<div><b>${esc(user.name)}</b><span>${esc(user.email || 'sem e-mail')} · ${esc(user.profileId)}</span></div>`).join('')}</div>${canManage ? `<details class="onboardingDetails"><summary>Adicionar integrante agora</summary><div class="onboardingFormGrid"><label class="field"><span>Nome</span><input id="onboardingMemberName"></label><label class="field"><span>E-mail</span><input id="onboardingMemberEmail" type="email"></label><label class="field"><span>Perfil</span><select id="onboardingMemberProfile">${(IDENTITY.profiles?.() || []).filter((profile) => profile.active !== false).map((profile) => `<option value="${esc(profile.id)}">${esc(profile.name)}</option>`).join('')}</select></label><label class="field"><span>PIN inicial</span><input id="onboardingMemberPin" type="password"></label></div><button class="btn" id="onboardingCreateMember">Adicionar integrante</button></details>` : '<p class="notice">Entre como administrador na área Identidade e acesso para adicionar outros integrantes.</p>'}<div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn" id="onboardingOpenIdentity">Abrir identidade</button><button class="btn primary" data-onboarding-next>Continuar</button></div></article>`;
  }

  function stepData(current, result) {
    const counts = result.counts;
    return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 4</span><h3>Escolha como começar com dados</h3><p class="muted">O Commerce Radar não precisa de API paga. Você pode reutilizar dados existentes, importar uma planilha ou registrar uma evidência manual.</p><div class="onboardingDataModes"><button class="onboardingMode ${current.dataMode === 'existing' ? 'selected' : ''}" data-onboarding-mode="existing"><b>Usar dados existentes</b><span>${counts.imports + counts.signals + counts.opportunities + counts.tests} registro(s) detectado(s)</span></button><button class="onboardingMode ${current.dataMode === 'import' ? 'selected' : ''}" data-onboarding-mode="import"><b>Importar CSV</b><span>Produtos, vendas, tráfego ou marketplaces</span></button><button class="onboardingMode ${current.dataMode === 'manual' ? 'selected' : ''}" data-onboarding-mode="manual"><b>Cadastrar primeira evidência</b><span>Produto, fonte, custos e hipótese</span></button></div><div class="onboardingDataSummary"><span><b>${counts.imports}</b> lotes</span><span><b>${counts.signals}</b> sinais</span><span><b>${counts.opportunities}</b> oportunidades</span><span><b>${counts.tests}</b> testes</span></div><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button>${current.dataMode === 'import' ? '<button class="btn" id="onboardingOpenImport">Abrir importador</button>' : ''}<button class="btn primary" id="onboardingContinueData">Continuar</button></div></article>`;
  }

  function rangeField(id, label, value = 3) {
    return `<label class="field"><span class="rangeHead"><span>${label}</span><output id="${id}Out">${value}</output></span><input id="${id}" type="range" min="1" max="5" value="${value}"></label>`;
  }

  function stepProduct(current) {
    const channel = current.channels[0] || 'Shopee';
    return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 5</span><h3>Registre a primeira hipótese de produto</h3><p class="muted">Use somente o que você realmente observou. A recomendação será preliminar e perderá pontos quando faltarem vendas, testes ou margem real.</p><div class="onboardingFormGrid"><label class="field wide"><span>Produto ou tema</span><input id="onboardingProduct" maxlength="140" placeholder="Ex.: Organizador modular de gavetas"></label><label class="field"><span>Categoria</span><select id="onboardingCategory">${Object.entries(CATEGORY_LABELS).map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join('')}</select></label><label class="field"><span>Canal inicial</span><select id="onboardingProductChannel">${current.channels.map((item) => `<option value="${esc(item)}" ${item === channel ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label><label class="field"><span>Tipo da fonte</span><select id="onboardingSourceType">${Object.entries(TRENDS?.SOURCES || {}).map(([id, item]) => `<option value="${id}">${esc(item.label)}</option>`).join('')}</select></label><label class="field"><span>Nome da fonte</span><input id="onboardingSourceName" placeholder="Ex.: busca, fornecedor ou marketplace"></label><label class="field wide"><span>URL da fonte</span><input id="onboardingSourceUrl" type="url" placeholder="https://..."></label><label class="field wide"><span>Evidência observada</span><textarea id="onboardingEvidence" rows="4" placeholder="Descreva o número, comportamento, procura ou problema observado."></textarea></label><label class="field"><span>Preço de venda estimado</span><input id="onboardingPrice" inputmode="decimal" placeholder="R$ 0,00"></label><label class="field"><span>Custo estimado</span><input id="onboardingCost" inputmode="decimal" placeholder="R$ 0,00"></label><label class="field"><span>Capital inicial</span><input id="onboardingCapital" inputmode="decimal" placeholder="R$ 0,00"></label>${rangeField('onboardingGrowth', 'Crescimento')}${rangeField('onboardingDemand', 'Demanda')}${rangeField('onboardingCompetition', 'Concorrência')}${rangeField('onboardingMargin', 'Margem potencial')}${rangeField('onboardingRisk', 'Risco')}${rangeField('onboardingConfidence', 'Confiança')}</div><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn primary" id="onboardingCreateStarter">Gerar recomendação preliminar</button></div></article>`;
  }

  function stepRecommendation(current, result) {
    const item = result.recommendation;
    if (!item) return `<article class="card onboardingPanel"><span class="eyebrow">ETAPA 6</span><h3>Ainda não existe uma recomendação</h3><p class="muted">Importe dados ou cadastre uma hipótese de produto para gerar o primeiro ranking.</p><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn primary" data-onboarding-step="4">Cadastrar produto</button></div></article>`;
    return `<article class="card onboardingPanel onboardingResult"><span class="eyebrow">ETAPA 6</span><div class="onboardingRecommendationHead"><div><h3>${esc(item.product)}</h3><p>${esc(item.classification.label)} · confiança ${item.confidence}%</p></div><div><b>${item.score}</b><small>/100</small></div></div><div class="onboardingResultGrid"><div><span>Próxima ação</span><b>${esc(item.nextAction)}</b></div><div><span>Canais</span><b>${esc(item.channels?.join(' · ') || current.channels.join(' · '))}</b></div><div><span>Margem observada</span><b>${item.economics?.available ? `${Math.round(item.economics.netMargin * 10) / 10}%` : 'Ainda não confirmada'}</b></div><div><span>Pedidos</span><b>${item.testResult?.orders || 0}</b></div></div><div class="notice">Esta recomendação é explicável e conservadora: dados ausentes ou estimados reduzem score e confiança.</div><div class="actions"><button class="btn" data-onboarding-prev>Voltar</button><button class="btn" id="onboardingOpenRecommendations">Abrir ranking completo</button><button class="btn primary" id="onboardingComplete">Concluir onboarding</button></div></article>`;
  }

  function render() {
    const root = $('guidedOnboarding');
    if (!root) return;
    const current = state();
    const result = progress();
    const step = Math.max(0, Math.min(STEPS.length - 1, current.currentStep));
    const badge = $('onboardingNavCount');
    if (badge) badge.textContent = current.status === 'completed' ? '' : `${result.completed}/${result.total}`;
    const progressNode = $('onboardingProgress');
    if (progressNode) progressNode.innerHTML = `<div><span>Configuração concluída</span><b>${result.percent}%</b></div><i><em style="width:${result.percent}%"></em></i>`;
    const stepsNode = $('onboardingSteps');
    if (stepsNode) stepsNode.innerHTML = STEPS.map((item, index) => `<button class="onboardingStep ${index === step ? 'active' : ''} ${result.steps[item.id] ? 'done' : ''}" data-onboarding-step="${index}"><span>${index + 1}</span><b>${esc(item.label)}</b></button>`).join('');
    const content = $('onboardingContent');
    if (content) content.innerHTML = [
      () => stepWorkspace(current),
      () => stepChannels(current),
      () => stepTeam(current),
      () => stepData(current, result),
      () => stepProduct(current),
      () => stepRecommendation(current, result),
    ][step]();

    document.querySelectorAll('[data-onboarding-step]').forEach((button) => { button.onclick = () => setStep(button.dataset.onboardingStep); });
    document.querySelectorAll('[data-onboarding-prev]').forEach((button) => { button.onclick = () => setStep(step - 1); });
    document.querySelectorAll('[data-onboarding-next]').forEach((button) => { button.onclick = () => setStep(step + 1); });

    $('onboardingSaveWorkspace')?.addEventListener('click', () => { try { saveWorkspace({ name: $('onboardingWorkspaceName').value, model: $('onboardingModel').value, objective: $('onboardingObjective').value, monthlyBudget: $('onboardingBudget').value, targetDays: $('onboardingTargetDays').value }); setStep(1); toast('Workspace configurado.'); } catch (error) { toast(error.message, true); } });
    $('onboardingSaveChannels')?.addEventListener('click', () => { try { saveChannels([...document.querySelectorAll('[data-onboarding-channel]:checked')].map((input) => input.value)); setStep(2); toast('Canais salvos.'); } catch (error) { toast(error.message, true); } });
    $('onboardingCreateAdmin')?.addEventListener('click', async () => { try { await createAdministrator({ name: $('onboardingAdminName').value, email: $('onboardingAdminEmail').value, pin: $('onboardingAdminPin').value }); setStep(3); toast('Administrador criado.'); } catch (error) { toast(error.message, true); } });
    $('onboardingCreateMember')?.addEventListener('click', async () => { try { await createTeamMember({ name: $('onboardingMemberName').value, email: $('onboardingMemberEmail').value, profileId: $('onboardingMemberProfile').value, pin: $('onboardingMemberPin').value }); toast('Integrante adicionado.'); render(); } catch (error) { toast(error.message, true); } });
    $('onboardingOpenIdentity')?.addEventListener('click', () => { try { openViewByNav('identityNav'); } catch (error) { toast(error.message, true); } });
    document.querySelectorAll('[data-onboarding-mode]').forEach((button) => { button.onclick = () => { saveDataMode(button.dataset.onboardingMode); render(); }; });
    $('onboardingOpenImport')?.addEventListener('click', () => { try { openViewByNav('importNav'); } catch (error) { toast(error.message, true); } });
    $('onboardingContinueData')?.addEventListener('click', () => {
      try {
        const mode = state().dataMode;
        if (!mode) throw new Error('Escolha como deseja começar com dados.');
        if (mode === 'manual') return setStep(4);
        const currentProgress = progress();
        if (!currentProgress.steps.data) throw new Error(mode === 'import' ? 'Importe ao menos um arquivo antes de continuar.' : 'Nenhum dado existente foi encontrado.');
        setStep(5);
      } catch (error) { toast(error.message, true); }
    });
    for (const id of ['onboardingGrowth', 'onboardingDemand', 'onboardingCompetition', 'onboardingMargin', 'onboardingRisk', 'onboardingConfidence']) {
      $(id)?.addEventListener('input', (event) => { $(`${id}Out`).value = event.target.value; });
    }
    $('onboardingCreateStarter')?.addEventListener('click', () => {
      try {
        saveStarterProduct({
          product: $('onboardingProduct').value, category: $('onboardingCategory').value, channel: $('onboardingProductChannel').value,
          sourceType: $('onboardingSourceType').value, sourceName: $('onboardingSourceName').value, sourceUrl: $('onboardingSourceUrl').value,
          evidence: $('onboardingEvidence').value, price: $('onboardingPrice').value, cost: $('onboardingCost').value, capital: $('onboardingCapital').value,
          growth: $('onboardingGrowth').value, demand: $('onboardingDemand').value, competition: $('onboardingCompetition').value,
          margin: $('onboardingMargin').value, risk: $('onboardingRisk').value, confidence: $('onboardingConfidence').value,
        });
        setStep(5); toast('Recomendação preliminar gerada.');
      } catch (error) { toast(error.message, true); }
    });
    $('onboardingOpenRecommendations')?.addEventListener('click', () => { try { openViewByNav('recommendationsNav'); } catch (error) { toast(error.message, true); } });
    $('onboardingComplete')?.addEventListener('click', () => { try { completeOnboarding(); render(); toast('Onboarding concluído. O workspace está pronto para operar.'); } catch (error) { toast(error.message, true); } });
  }

  function onboardingMarkdown() {
    const current = state();
    const result = progress();
    const recommendation = result.recommendation;
    return [
      '# Commerce Radar — Configuração guiada', '',
      `Workspace: ${current.workspace.name || 'não configurado'}`,
      `Modelo: ${MODELS[current.workspace.model] || current.workspace.model}`,
      `Objetivo: ${OBJECTIVES[current.workspace.objective] || current.workspace.objective}`,
      `Orçamento mensal: ${BRL.format(current.workspace.monthlyBudget || 0)}`,
      `Canais: ${current.channels.join(', ') || 'não selecionados'}`,
      `Usuários: ${users().length}`,
      `Progresso: ${result.completed}/${result.total} etapas`, '',
      '## Primeira recomendação', '',
      recommendation ? `- ${recommendation.product}: ${recommendation.classification.label}; score ${recommendation.score}/100; confiança ${recommendation.confidence}%.\n- Próxima ação: ${recommendation.nextAction}` : '- Ainda não gerada.', '',
      '## Limitações', '',
      '- A primeira recomendação depende exclusivamente dos dados informados ou importados.',
      '- Dados estimados não substituem pedidos, custos e margem real.',
      '- O onboarding não garante vendas, lucro ou aprovação de um produto.', '',
      'Tehkné Solutions',
    ].join('\n');
  }

  function downloadReport() {
    const url = URL.createObjectURL(new Blob([onboardingMarkdown()], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-onboarding-${today()}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.onboardingState = KEYS.state;
      keys.onboardingEvents = KEYS.events;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { state: {}, events: [] };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = $('backup'); const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!backup || !input || !merge || !replace) { if (attempts > 760) clearInterval(timer); return; }
      clearInterval(timer);
      backup.onclick = () => {
        const keys = ROOT.CommerceRadarCloud?.dataKeys || {};
        const payload = { version: '0.7.0', exportedAt: nowIso(), signature: 'Tehkné Solutions' };
        for (const [name, key] of Object.entries(keys)) payload[name] = read(key, []);
        payload.onboardingState = state(); payload.onboardingEvents = events();
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-backup-${today()}.json`; anchor.click(); URL.revokeObjectURL(url);
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try { const payload = JSON.parse(await file.text()); pending = { state: payload.onboardingState || {}, events: Array.isArray(payload.onboardingEvents) ? payload.onboardingEvents : [] }; }
        catch { pending = { state: {}, events: [] }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        write(KEYS.state, { ...state(), ...pending.state, workspace: { ...state().workspace, ...(pending.state.workspace || {}) }, channels: [...new Set([...(state().channels || []), ...(pending.state.channels || [])])] });
        write(KEYS.events, [...new Map([...events(), ...pending.events].map((item) => [item.id, item])).values()].slice(0, 500)); render();
      });
      replace.addEventListener('click', () => { write(KEYS.state, pending.state); write(KEYS.events, pending.events); render(); });
    }, 50);
  }

  function shouldAutoOpen() {
    if (typeof sessionStorage === 'undefined') return false;
    if (sessionStorage.getItem('commerce-radar-onboarding-auto-opened') === '1') return false;
    const current = state();
    if (current.status === 'completed') return false;
    const counts = dataCounts();
    const fresh = !users().length && !Object.values(counts).some((value) => value > 0);
    return fresh || current.status === 'in_progress';
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const firstView = document.querySelector('.main .view');
    if (!nav || !firstView || $('onboardingNav')) return false;
    nav.insertAdjacentHTML('afterbegin', '<button class="nav" id="onboardingNav"><span>Configuração guiada</span><b id="onboardingNavCount"></b></button>');
    firstView.insertAdjacentHTML('beforebegin', `<section class="view" id="guidedOnboarding"><div class="sectionHead"><div><span class="eyebrow">ONBOARDING OPERACIONAL</span><h2>Configure o Commerce Radar passo a passo</h2><p class="muted">Crie a estrutura mínima para transformar uma hipótese em uma recomendação explicável.</p></div><div class="actions"><button class="btn" id="onboardingExport">Exportar resumo</button><button class="btn" id="onboardingLater">Continuar depois</button></div></div><div class="onboardingProgress" id="onboardingProgress"></div><div class="onboardingLayout"><aside class="card"><div class="onboardingSteps" id="onboardingSteps"></div><div class="onboardingPrinciples"><b>Princípios</b><span>Sem dados inventados</span><span>Sem API paga obrigatória</span><span>Recomendação conservadora</span><span>Assinatura Tehkné Solutions</span></div></aside><main id="onboardingContent"></main></div><div id="onboardingToast" class="v021Toast"></div></section>`);
    $('onboardingNav').onclick = showView;
    $('onboardingExport').onclick = downloadReport;
    $('onboardingLater').onclick = () => { saveState({ dismissedAt: nowIso(), status: state().status === 'new' ? 'in_progress' : state().status }); document.querySelector('[data-view="radar"]')?.click(); };
    extendCloud(); enhanceBackup(); render();
    ROOT.addEventListener?.('commerce-radar-recommendation-action', render);
    ROOT.addEventListener?.('commerce-radar-identity-updated', render);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || event.key === 'tehkne-commerce-radar-v68-identity-users') render(); });
    if (shouldAutoOpen()) {
      sessionStorage.setItem('commerce-radar-onboarding-auto-opened', '1');
      setTimeout(showView, 0);
    }
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 900) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarOnboarding = {
    KEYS, CHANNELS, MODELS, OBJECTIVES, STEPS, DEFAULT_STATE,
    parseMoney, state, saveState, events, progress, dataCounts, saveWorkspace, saveChannels, createAdministrator, createTeamMember,
    saveDataMode, saveStarterProduct, buildFirstRecommendation, completeOnboarding, onboardingMarkdown,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();