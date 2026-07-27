(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const ACTIVATION = ROOT.CommerceRadarActivationPlan;
  const RETRO = ROOT.CommerceRadarCycleRetrospective;
  const KEYS = {
    playbooks: 'tehkne-commerce-radar-v74-learning-playbooks',
    applications: 'tehkne-commerce-radar-v74-playbook-applications',
    settings: 'tehkne-commerce-radar-v74-playbook-settings',
  };
  const DEFAULTS = { minimumScore: 65, requireProfit: true, minimumChecklist: 5, keepApplications: 1000 };
  const STATUS = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 1800) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function playbooks() { return read(KEYS.playbooks, []); }
  function applications() { return read(KEYS.applications, []); }
  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function saveSettings(patch = {}) { const next = { ...settings(), ...patch }; write(KEYS.settings, next); return next; }
  function cycleRows(reference = today()) { return RETRO?.cycleSummaries?.(undefined, undefined, undefined, reference) || []; }

  function cleanChecklist(items = []) {
    const rows = Array.isArray(items) ? items : String(items || '').split(/\r?\n/);
    return rows.map((item, index) => {
      if (typeof item === 'string') return { id: `playbook-item-${index + 1}`, day: Math.min(7, Math.max(1, index + 1)), label: safe(item, 240) };
      return { id: safe(item.id, 120) || `playbook-item-${index + 1}`, day: Math.min(7, Math.max(1, Math.round(num(item.day, index + 1)))), label: safe(item.label, 240) };
    }).filter((item) => item.label).slice(0, 28);
  }

  function eligibility(cycle, config = settings()) {
    const reasons = [];
    if (!cycle) reasons.push('Ciclo não encontrado.');
    if (cycle && !cycle.retrospective) reasons.push('A retrospectiva humana ainda não foi registrada.');
    if (cycle && cycle.score < num(config.minimumScore, 65)) reasons.push(`Score abaixo do mínimo ${num(config.minimumScore, 65)}.`);
    if (cycle && cycle.outcome?.id !== 'validated') reasons.push('O ciclo ainda não foi classificado como validado.');
    if (cycle && num(cycle.metrics?.orders) < 1) reasons.push('Nenhum pedido real foi registrado.');
    if (cycle && config.requireProfit && num(cycle.metrics?.netProfit) <= 0) reasons.push('O ciclo não possui lucro preliminar positivo.');
    return { eligible: reasons.length === 0, reasons };
  }

  function sourceConfidence(cycle) {
    if (!cycle) return 0;
    let value = Math.min(70, num(cycle.score));
    if (cycle.outcome?.id === 'validated') value += 10;
    if (num(cycle.metrics?.orders) >= 3) value += 5;
    if (num(cycle.metrics?.netProfit) > 0) value += 5;
    if (cycle.retrospective) value += 5;
    if (cycle.comparableChanges > 0) value += 5;
    return Math.max(0, Math.min(95, Math.round(value)));
  }

  function draftFromCycle(planId, input = {}) {
    const cycle = cycleRows().find((row) => row.planId === planId);
    if (!cycle) throw new Error('Ciclo não encontrado para criar o playbook.');
    const retrospective = cycle.retrospective;
    if (!retrospective) throw new Error('Registre a retrospectiva antes de criar o playbook.');
    const existing = playbooks().find((row) => row.sourcePlanId === planId && row.status !== 'archived');
    if (existing) return existing;
    const sourcePlan = RETRO?.plans?.().find((row) => row.id === planId) || {};
    const sourceTasks = Array.isArray(sourcePlan.tasks) ? sourcePlan.tasks : [];
    const checklist = cleanChecklist(sourceTasks.flatMap((task) => (task.checklist || []).map((item) => ({ day: task.day, label: item.label }))));
    const row = {
      id: `playbook-${uid()}`,
      version: '0.7.4',
      status: 'draft',
      title: safe(input.title || `${cycle.product} — ${cycle.channel}`, 180),
      description: safe(input.description || `Playbook criado a partir do ciclo ${cycle.product} no canal ${cycle.channel}.`, 600),
      tags: Array.isArray(retrospective.tags) ? retrospective.tags : [],
      channels: [cycle.channel].filter(Boolean),
      sourcePlanId: planId,
      sourceSnapshot: {
        product: cycle.product, channel: cycle.channel, score: cycle.score, outcome: cycle.outcome?.id || '',
        orders: num(cycle.metrics?.orders), revenue: num(cycle.metrics?.revenue), profit: num(cycle.metrics?.netProfit), margin: num(cycle.metrics?.netMargin),
        capturedAt: nowIso(),
      },
      confidence: sourceConfidence(cycle),
      offer: {
        audience: safe(input.audience || '', 500),
        problem: safe(input.problem || '', 500),
        promise: safe(input.promise || retrospective.worked, 700),
        proof: safe(input.proof || `Pedidos: ${num(cycle.metrics?.orders)}; lucro preliminar: ${BRL.format(num(cycle.metrics?.netProfit))}.`, 700),
        creative: safe(input.creative || '', 700),
        objections: safe(input.objections || retrospective.failed, 700),
        callToAction: safe(input.callToAction || '', 400),
      },
      strategy: {
        worked: safe(retrospective.worked, 1800),
        failed: safe(retrospective.failed, 1800),
        nextHypothesis: safe(retrospective.nextHypothesis, 1800),
        trafficApproach: safe(input.trafficApproach || '', 900),
        optimizationRule: safe(input.optimizationRule || 'Alterar uma variável por vez e registrar check-ins antes e depois.', 900),
        stopRule: safe(input.stopRule || 'Interromper ou revisar quando o limite de investimento terminar sem evidência comercial mínima.', 900),
      },
      criteria: { ...(sourcePlan.criteria || {}) },
      checklist,
      createdAt: nowIso(), updatedAt: nowIso(), publishedAt: '', signature: 'Tehkné Solutions',
    };
    write(KEYS.playbooks, [row, ...playbooks()].slice(0, 500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-updated', { detail: row }));
    return row;
  }

  function validatePlaybook(row, config = settings()) {
    const errors = [];
    const source = cycleRows().find((cycle) => cycle.planId === row?.sourcePlanId);
    const sourceCheck = eligibility(source, config);
    if (!sourceCheck.eligible) errors.push(...sourceCheck.reasons);
    if (safe(row?.title, 180).length < 6) errors.push('Informe um título com pelo menos 6 caracteres.');
    if (safe(row?.offer?.audience, 500).length < 8) errors.push('Defina o público do playbook.');
    if (safe(row?.offer?.promise, 700).length < 12) errors.push('Defina uma promessa verificável.');
    if (cleanChecklist(row?.checklist).length < num(config.minimumChecklist, 5)) errors.push(`Inclua pelo menos ${num(config.minimumChecklist, 5)} itens no checklist.`);
    if (safe(row?.strategy?.nextHypothesis, 1800).length < 12) errors.push('Registre a próxima hipótese.');
    return { valid: errors.length === 0, errors, source };
  }

  function savePlaybook(id, patch = {}) {
    const current = playbooks().find((row) => row.id === id);
    if (!current) throw new Error('Playbook não encontrado.');
    const next = {
      ...current,
      ...patch,
      title: safe(patch.title ?? current.title, 180),
      description: safe(patch.description ?? current.description, 900),
      tags: Array.isArray(patch.tags) ? patch.tags.map((tag) => safe(tag, 80)).filter(Boolean).slice(0, 16) : current.tags,
      channels: Array.isArray(patch.channels) ? patch.channels.map((channel) => safe(channel, 80)).filter(Boolean).slice(0, 12) : current.channels,
      offer: { ...current.offer, ...(patch.offer || {}) },
      strategy: { ...current.strategy, ...(patch.strategy || {}) },
      criteria: { ...current.criteria, ...(patch.criteria || {}) },
      checklist: patch.checklist !== undefined ? cleanChecklist(patch.checklist) : current.checklist,
      updatedAt: nowIso(),
    };
    write(KEYS.playbooks, [next, ...playbooks().filter((row) => row.id !== id)].slice(0, 500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-updated', { detail: next }));
    return next;
  }

  function publishPlaybook(id) {
    const current = playbooks().find((row) => row.id === id);
    if (!current) throw new Error('Playbook não encontrado.');
    const validation = validatePlaybook(current);
    if (!validation.valid) throw new Error(validation.errors[0]);
    return savePlaybook(id, { status: 'published', publishedAt: current.publishedAt || nowIso() });
  }

  function archivePlaybook(id) { return savePlaybook(id, { status: 'archived' }); }

  function mergeChecklist(tasks = [], checklist = []) {
    return tasks.map((task) => {
      const extras = checklist.filter((item) => Number(item.day) === Number(task.day)).map((item, index) => ({ id: `playbook-${index + 1}-${item.id}`, label: item.label, done: false, source: 'playbook' }));
      const existing = new Set((task.checklist || []).map((item) => safe(item.label, 240).toLocaleLowerCase('pt-BR')));
      return { ...task, checklist: [...(task.checklist || []), ...extras.filter((item) => !existing.has(item.label.toLocaleLowerCase('pt-BR')))] };
    });
  }

  function applyPlaybook(id, input = {}) {
    const playbook = playbooks().find((row) => row.id === id && row.status === 'published');
    if (!playbook) throw new Error('Publique o playbook antes de aplicá-lo.');
    const product = safe(input.product, 160);
    if (!product) throw new Error('Informe o produto do novo ciclo.');
    const channel = safe(input.channel || playbook.channels?.[0], 80);
    const source = { key: product.toLocaleLowerCase('pt-BR'), product, score: playbook.sourceSnapshot?.score || 0, confidence: playbook.confidence, classification: { id: 'playbook', label: 'Playbook' }, nextAction: playbook.strategy?.nextHypothesis || '', channels: [channel] };
    const plan = ACTIVATION?.createPlan?.({
      product, channel, startDate: input.startDate || today(), budget: input.budget,
      minViews: input.minViews ?? playbook.criteria?.minViews, minClicks: input.minClicks ?? playbook.criteria?.minClicks,
      minOrders: input.minOrders ?? playbook.criteria?.minOrders, minMarginPct: input.minMarginPct ?? playbook.criteria?.minMarginPct,
      maxSpend: input.maxSpend ?? input.budget ?? playbook.criteria?.maxSpend,
    }, source);
    if (!plan) throw new Error('Não foi possível criar o novo plano.');
    const plansKey = ACTIVATION?.KEYS?.plans || 'tehkne-commerce-radar-v71-activation-plans';
    const rows = read(plansKey, []);
    const enhanced = {
      ...plan,
      tasks: mergeChecklist(plan.tasks || [], playbook.checklist || []),
      playbook: { id: playbook.id, title: playbook.title, sourcePlanId: playbook.sourcePlanId, appliedAt: nowIso(), confidence: playbook.confidence },
      offerTemplate: { ...playbook.offer },
      strategyTemplate: { ...playbook.strategy },
      updatedAt: nowIso(),
    };
    write(plansKey, [enhanced, ...rows.filter((row) => row.id !== plan.id)].slice(0, 300));
    const application = {
      id: `playbook-application-${uid()}`, playbookId: playbook.id, playbookTitle: playbook.title, planId: enhanced.id,
      product: enhanced.product, channel: enhanced.channel, sourcePlanId: playbook.sourcePlanId, appliedAt: nowIso(), status: 'draft_created', signature: 'Tehkné Solutions',
    };
    write(KEYS.applications, [application, ...applications()].slice(0, Math.max(100, num(settings().keepApplications, 1000))));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-applied', { detail: application }));
    return { plan: enhanced, application };
  }

  function libraryReport() {
    const rows = playbooks();
    const published = rows.filter((row) => row.status === 'published');
    const candidates = cycleRows().filter((cycle) => cycle.retrospective && !rows.some((row) => row.sourcePlanId === cycle.planId && row.status !== 'archived'));
    const byChannel = new Map();
    for (const row of published) for (const channel of row.channels || []) byChannel.set(channel, (byChannel.get(channel) || 0) + 1);
    return { rows, published, drafts: rows.filter((row) => row.status === 'draft'), archived: rows.filter((row) => row.status === 'archived'), candidates, applications: applications(), channels: [...byChannel.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count) };
  }

  function playbookMarkdown(id) {
    const row = playbooks().find((item) => item.id === id);
    if (!row) throw new Error('Playbook não encontrado.');
    return [
      '# Commerce Radar — Playbook reutilizável', '', `Título: ${row.title}`, `Status: ${STATUS[row.status] || row.status}`, `Confiança operacional: ${row.confidence}%`,
      `Ciclo de origem: ${row.sourceSnapshot?.product || ''} · ${row.sourceSnapshot?.channel || ''}`, '',
      '## Evidência de origem', '', `- Score: ${row.sourceSnapshot?.score || 0}`, `- Pedidos: ${row.sourceSnapshot?.orders || 0}`, `- Receita: ${BRL.format(num(row.sourceSnapshot?.revenue))}`, `- Lucro preliminar: ${BRL.format(num(row.sourceSnapshot?.profit))}`, `- Margem preliminar: ${PCT.format(num(row.sourceSnapshot?.margin))}%`, '',
      '## Modelo de oferta', '', `- Público: ${row.offer?.audience || 'não definido'}`, `- Problema: ${row.offer?.problem || 'não definido'}`, `- Promessa: ${row.offer?.promise || 'não definida'}`, `- Prova: ${row.offer?.proof || 'não definida'}`, `- Criativo: ${row.offer?.creative || 'não definido'}`, `- Objeções: ${row.offer?.objections || 'não definidas'}`, `- Chamada para ação: ${row.offer?.callToAction || 'não definida'}`, '',
      '## Checklist', '', ...(row.checklist || []).map((item) => `- Dia ${item.day}: ${item.label}`), '',
      '## Estratégia', '', `- O que funcionou: ${row.strategy?.worked || ''}`, `- O que falhou: ${row.strategy?.failed || ''}`, `- Próxima hipótese: ${row.strategy?.nextHypothesis || ''}`, `- Regra de otimização: ${row.strategy?.optimizationRule || ''}`, `- Regra de parada: ${row.strategy?.stopRule || ''}`, '',
      '## Limitações', '', '- O playbook reaproveita uma hipótese observada e não garante repetição do resultado.', '- Público, preço, concorrência, sazonalidade e canal podem mudar.', '- O novo ciclo deve começar com métricas zeradas e validação própria.', '', 'Tehkné Solutions',
    ].join('\n');
  }

  function toast(message, error = false) {
    let node = $('playbookToast'); if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'playbookToast'; document.body.append(node); }
    if (!node) return; node.className = `v021Toast show${error ? ' error' : ''}`; node.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function renderAll() {
    const report = libraryReport();
    const summary = $('playbookSummary');
    if (summary) summary.innerHTML = [['Publicados', report.published.length, 'prontos para reutilizar'], ['Rascunhos', report.drafts.length, 'aguardando revisão'], ['Candidatos', report.candidates.length, 'ciclos com retrospectiva'], ['Aplicações', report.applications.length, 'novos ciclos criados']].map(([label, value, note]) => `<article class="card playbookMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const candidates = $('playbookCandidates');
    if (candidates) candidates.innerHTML = `<article class="card"><span class="eyebrow">CANDIDATOS</span><h3>Transformar ciclo em playbook</h3>${report.candidates.length ? `<div class="playbookCandidateList">${report.candidates.map((cycle) => { const check = eligibility(cycle); return `<div><b>${esc(cycle.product)} · ${esc(cycle.channel)}</b><span>Score ${cycle.score} · ${cycle.outcome.label} · ${cycle.metrics.orders} pedido(s)</span><small>${check.eligible ? 'Elegível para publicação após completar o modelo.' : esc(check.reasons[0])}</small><button class="btn small" data-create-playbook="${esc(cycle.planId)}">Criar rascunho</button></div>`; }).join('')}</div>` : '<p class="muted">Nenhum ciclo com retrospectiva disponível.</p>'}</article>`;
    const library = $('playbookLibrary');
    if (library) library.innerHTML = report.rows.length ? report.rows.map((row) => `<article class="card playbookCard status-${esc(row.status)}"><div class="playbookHead"><div><span class="eyebrow">${esc(STATUS[row.status] || row.status)}</span><h3>${esc(row.title)}</h3><p>${esc((row.channels || []).join(', ') || 'Sem canal')} · confiança ${row.confidence}%</p></div><strong>${row.sourceSnapshot?.score || 0}</strong></div><p>${esc(row.description)}</p><div class="playbookEvidence"><span>${row.sourceSnapshot?.orders || 0} pedido(s)</span><span>${BRL.format(num(row.sourceSnapshot?.profit))} lucro</span><span>${PCT.format(num(row.sourceSnapshot?.margin))}% margem</span></div><details><summary>Editar modelo</summary><div class="playbookForm"><label class="field"><span>Título</span><input data-pb-title="${row.id}" value="${esc(row.title)}"></label><label class="field"><span>Canais</span><input data-pb-channels="${row.id}" value="${esc((row.channels || []).join(', '))}"></label><label class="field wide"><span>Público</span><textarea data-pb-audience="${row.id}" rows="2">${esc(row.offer?.audience || '')}</textarea></label><label class="field wide"><span>Problema</span><textarea data-pb-problem="${row.id}" rows="2">${esc(row.offer?.problem || '')}</textarea></label><label class="field wide"><span>Promessa verificável</span><textarea data-pb-promise="${row.id}" rows="2">${esc(row.offer?.promise || '')}</textarea></label><label class="field wide"><span>Criativo ou formato</span><textarea data-pb-creative="${row.id}" rows="2">${esc(row.offer?.creative || '')}</textarea></label><label class="field wide"><span>Chamada para ação</span><textarea data-pb-cta="${row.id}" rows="2">${esc(row.offer?.callToAction || '')}</textarea></label><label class="field wide"><span>Checklist — uma linha por item</span><textarea data-pb-checklist="${row.id}" rows="7">${esc((row.checklist || []).map((item) => item.label).join('\n'))}</textarea></label><button class="btn" data-save-playbook="${row.id}">Salvar modelo</button></div></details>${row.status === 'published' ? `<div class="playbookApply"><input data-pb-product="${row.id}" placeholder="Produto do novo ciclo"><input data-pb-channel="${row.id}" value="${esc(row.channels?.[0] || '')}" placeholder="Canal"><input data-pb-start="${row.id}" type="date" value="${today()}"><button class="btn primary" data-apply-playbook="${row.id}">Criar novo plano</button></div>` : ''}<div class="actions">${row.status === 'draft' ? `<button class="btn primary" data-publish-playbook="${row.id}">Publicar</button>` : ''}<button class="btn" data-export-playbook="${row.id}">Exportar</button>${row.status !== 'archived' ? `<button class="btn" data-archive-playbook="${row.id}">Arquivar</button>` : ''}</div></article>`).join('') : '<div class="card empty"><p>Nenhum playbook criado.</p></div>';
    document.querySelectorAll('[data-create-playbook]').forEach((button) => { button.onclick = () => { try { draftFromCycle(button.dataset.createPlaybook); renderAll(); toast('Rascunho criado a partir da retrospectiva.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-save-playbook]').forEach((button) => { button.onclick = () => { const id = button.dataset.savePlaybook; try { savePlaybook(id, { title: document.querySelector(`[data-pb-title="${id}"]`)?.value, channels: String(document.querySelector(`[data-pb-channels="${id}"]`)?.value || '').split(',').map((item) => item.trim()), offer: { audience: document.querySelector(`[data-pb-audience="${id}"]`)?.value, problem: document.querySelector(`[data-pb-problem="${id}"]`)?.value, promise: document.querySelector(`[data-pb-promise="${id}"]`)?.value, creative: document.querySelector(`[data-pb-creative="${id}"]`)?.value, callToAction: document.querySelector(`[data-pb-cta="${id}"]`)?.value }, checklist: document.querySelector(`[data-pb-checklist="${id}"]`)?.value }); renderAll(); toast('Playbook atualizado.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-publish-playbook]').forEach((button) => { button.onclick = () => { try { publishPlaybook(button.dataset.publishPlaybook); renderAll(); toast('Playbook publicado para reutilização.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-archive-playbook]').forEach((button) => { button.onclick = () => { archivePlaybook(button.dataset.archivePlaybook); renderAll(); toast('Playbook arquivado.'); }; });
    document.querySelectorAll('[data-apply-playbook]').forEach((button) => { button.onclick = () => { const id = button.dataset.applyPlaybook; try { applyPlaybook(id, { product: document.querySelector(`[data-pb-product="${id}"]`)?.value, channel: document.querySelector(`[data-pb-channel="${id}"]`)?.value, startDate: document.querySelector(`[data-pb-start="${id}"]`)?.value }); renderAll(); toast('Novo plano criado em rascunho com métricas zeradas.'); } catch (error) { toast(error.message, true); } }; });
    document.querySelectorAll('[data-export-playbook]').forEach((button) => { button.onclick = () => { const url = URL.createObjectURL(new Blob([playbookMarkdown(button.dataset.exportPlaybook)], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-playbook-${button.dataset.exportPlaybook}.md`; anchor.click(); URL.revokeObjectURL(url); }; });
    const badge = $('playbookNavCount'); if (badge) badge.textContent = report.drafts.length || '';
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'playbookLibrary'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'playbookNav'));
    if ($('title')) $('title').textContent = 'Transforme aprendizados em playbooks reutilizáveis';
    document.querySelector('.side')?.classList.remove('open'); renderAll(); globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.learningPlaybooks = KEYS.playbooks; keys.playbookApplications = KEYS.applications; keys.playbookSettings = KEYS.settings; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0; let pending = { playbooks: [], applications: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1; const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!input || !merge || !replace) { if (attempts > 300) clearInterval(timer); return; } clearInterval(timer);
      input.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); pending = { playbooks: Array.isArray(payload.learningPlaybooks) ? payload.learningPlaybooks : [], applications: Array.isArray(payload.playbookApplications) ? payload.playbookApplications : [], settings: payload.playbookSettings && typeof payload.playbookSettings === 'object' ? payload.playbookSettings : {} }; } catch { pending = { playbooks: [], applications: [], settings: {} }; } }, { capture: true });
      merge.addEventListener('click', () => { write(KEYS.playbooks, [...new Map([...playbooks(), ...pending.playbooks].map((item) => [item.id, item])).values()].slice(0, 500)); write(KEYS.applications, [...new Map([...applications(), ...pending.applications].map((item) => [item.id, item])).values()].slice(0, 1000)); write(KEYS.settings, { ...settings(), ...pending.settings }); renderAll(); });
      replace.addEventListener('click', () => { write(KEYS.playbooks, pending.playbooks); write(KEYS.applications, pending.applications); write(KEYS.settings, pending.settings); renderAll(); });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const retroNav = $('cycleRetrospectiveNav'); const retroView = $('cycleRetrospective');
    if (!retroNav || !retroView || $('playbookNav')) return false;
    retroNav.insertAdjacentHTML('afterend', '<button class="nav" id="playbookNav"><span>Biblioteca de playbooks</span><b id="playbookNavCount"></b></button>');
    retroView.insertAdjacentHTML('afterend', `<section class="view" id="playbookLibrary"><div class="sectionHead"><div><span class="eyebrow">APRENDIZADO REUTILIZÁVEL</span><h2>Biblioteca de playbooks</h2><p class="muted">Reaproveite ofertas e checklists validados como hipótese para um novo ciclo, nunca como garantia de resultado.</p></div></div><div class="playbookSummary" id="playbookSummary"></div><div class="playbookLayout"><main><div id="playbookLibrary"></div></main><aside><div id="playbookCandidates"></div><article class="card"><span class="eyebrow">REGRA DE USO</span><h3>Todo novo ciclo recomeça do zero</h3><p class="muted">O playbook transfere estrutura, não pedidos, receita ou lucro. Métricas do novo plano começam zeradas e precisam de evidência própria.</p></article></aside></div><div id="playbookToast" class="v021Toast"></div></section>`);
    $('playbookNav').onclick = showView; extendCloud(); enhanceBackup(); renderAll();
    ROOT.addEventListener?.('commerce-radar-retrospective-updated', renderAll); ROOT.addEventListener?.('commerce-radar-playbook-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || event.key === RETRO?.KEYS?.retrospectives) renderAll(); });
    return true;
  }

  function boot() { if (inject()) return; let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1400) clearInterval(timer); }, 50); }

  ROOT.CommerceRadarPlaybooks = { KEYS, DEFAULTS, STATUS, playbooks, applications, settings, saveSettings, cleanChecklist, eligibility, sourceConfidence, draftFromCycle, validatePlaybook, savePlaybook, publishPlaybook, archivePlaybook, mergeChecklist, applyPlaybook, libraryReport, playbookMarkdown };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot(); }
})();