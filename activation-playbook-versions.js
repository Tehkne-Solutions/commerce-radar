(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const PLAYBOOKS = ROOT.CommerceRadarPlaybooks;
  const PERFORMANCE = ROOT.CommerceRadarPlaybookPerformance;
  const RETRO = ROOT.CommerceRadarCycleRetrospective;
  const KEYS = {
    versions: 'tehkne-commerce-radar-v76-playbook-versions',
    candidates: 'tehkne-commerce-radar-v76-playbook-version-candidates',
    events: 'tehkne-commerce-radar-v76-playbook-version-events',
    snapshots: 'tehkne-commerce-radar-v76-playbook-version-snapshots',
    settings: 'tehkne-commerce-radar-v76-playbook-version-settings',
  };
  const DEFAULTS = { keepEvents: 1500, keepSnapshots: 365, minimumReviewLength: 20 };
  const STATE = { active: 'Ativa', superseded: 'Substituída', archived: 'Arquivada' };
  const $ = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 2400) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const PCT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function settings() { return { ...DEFAULTS, ...read(KEYS.settings, {}) }; }
  function versions() { return read(KEYS.versions, []); }
  function candidates() { return read(KEYS.candidates, []); }
  function events() { return read(KEYS.events, []); }
  function snapshots() { return read(KEYS.snapshots, []); }
  function playbooks() { return PLAYBOOKS?.playbooks?.() || read('tehkne-commerce-radar-v74-learning-playbooks', []); }
  function applications() { return PLAYBOOKS?.applications?.() || read('tehkne-commerce-radar-v74-playbook-applications', []); }
  function cycles(reference = today()) { return RETRO?.cycleSummaries?.(undefined, undefined, undefined, reference) || []; }
  function playbooksKey() { return PLAYBOOKS?.KEYS?.playbooks || 'tehkne-commerce-radar-v74-learning-playbooks'; }
  function applicationsKey() { return PLAYBOOKS?.KEYS?.applications || 'tehkne-commerce-radar-v74-playbook-applications'; }
  function plansKey() { return ROOT.CommerceRadarActivationPlan?.KEYS?.plans || 'tehkne-commerce-radar-v71-activation-plans'; }

  function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
    return value;
  }
  function hashSnapshot(value) {
    const text = JSON.stringify(stable(value));
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function snapshotFromPlaybook(playbook) {
    return {
      title: safe(playbook?.title, 180),
      description: safe(playbook?.description, 900),
      tags: clone(playbook?.tags || []),
      channels: clone(playbook?.channels || []),
      confidence: num(playbook?.confidence),
      offer: clone(playbook?.offer || {}),
      strategy: clone(playbook?.strategy || {}),
      criteria: clone(playbook?.criteria || {}),
      checklist: clone(playbook?.checklist || []),
      sourcePlanId: playbook?.sourcePlanId || '',
      sourceSnapshot: clone(playbook?.sourceSnapshot || {}),
    };
  }

  function nextNumber(playbookId) {
    const existing = versions().filter((row) => row.playbookId === playbookId).map((row) => num(row.number));
    return Math.max(0, ...existing) + 1;
  }

  function activeVersion(playbookId, rows = versions()) {
    return rows.find((row) => row.playbookId === playbookId && row.state === 'active') || rows.filter((row) => row.playbookId === playbookId).sort((a, b) => num(b.number) - num(a.number))[0] || null;
  }

  function ensureBaseline(playbook) {
    if (!playbook || !playbook.id || playbook.status === 'draft') return null;
    const existing = versions().filter((row) => row.playbookId === playbook.id);
    if (existing.length) return activeVersion(playbook.id, existing);
    const snapshot = snapshotFromPlaybook(playbook);
    const row = {
      id: `playbook-version-${uid()}`,
      playbookId: playbook.id,
      playbookTitle: playbook.title,
      number: 1,
      label: 'v1',
      state: playbook.status === 'archived' ? 'archived' : 'active',
      snapshot,
      snapshotHash: hashSnapshot(snapshot),
      hypothesis: 'Versão-base criada automaticamente a partir do playbook publicado antes da v0.7.6.',
      changeSummary: 'Preservação do estado publicado existente para iniciar o histórico de versões.',
      reviewNote: 'Migração retrocompatível sem alteração do conteúdo do playbook.',
      createdAt: playbook.publishedAt || playbook.createdAt || nowIso(),
      publishedAt: playbook.publishedAt || nowIso(),
      createdBy: 'migração v0.7.6',
      signature: 'Tehkné Solutions',
    };
    write(KEYS.versions, [row, ...versions()].slice(0, 2000));
    return row;
  }

  function ensureBaselines() {
    const created = [];
    for (const playbook of playbooks()) {
      const before = versions().some((row) => row.playbookId === playbook.id);
      const version = ensureBaseline(playbook);
      if (version && !before) created.push(version);
    }
    return created;
  }

  function createCandidate(playbookId, baseVersionId = '', input = {}) {
    const playbook = playbooks().find((row) => row.id === playbookId);
    if (!playbook) throw new Error('Playbook não encontrado.');
    ensureBaseline(playbook);
    const rows = versions();
    const base = rows.find((row) => row.id === baseVersionId && row.playbookId === playbookId) || activeVersion(playbookId, rows);
    if (!base) throw new Error('Nenhuma versão-base disponível.');
    const existing = candidates().find((row) => row.playbookId === playbookId && row.status === 'draft');
    if (existing) return existing;
    const proposedNumber = nextNumber(playbookId);
    const row = {
      id: `playbook-candidate-${uid()}`,
      playbookId,
      playbookTitle: playbook.title,
      baseVersionId: base.id,
      baseLabel: base.label,
      proposedNumber,
      proposedLabel: `v${proposedNumber}`,
      status: 'draft',
      snapshot: clone(base.snapshot),
      hypothesis: safe(input.hypothesis, 1200),
      changeSummary: safe(input.changeSummary, 1200),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.candidates, [row, ...candidates()].slice(0, 500));
    recordEvent('candidate_created', row, { baseVersionId: base.id });
    return row;
  }

  function updateCandidate(id, patch = {}) {
    const current = candidates().find((row) => row.id === id);
    if (!current || current.status !== 'draft') throw new Error('A variante candidata não está disponível para edição.');
    const snapshotPatch = patch.snapshot || {};
    const next = {
      ...current,
      hypothesis: safe(patch.hypothesis ?? current.hypothesis, 1200),
      changeSummary: safe(patch.changeSummary ?? current.changeSummary, 1200),
      snapshot: {
        ...current.snapshot,
        ...snapshotPatch,
        title: safe(snapshotPatch.title ?? current.snapshot.title, 180),
        description: safe(snapshotPatch.description ?? current.snapshot.description, 900),
        channels: Array.isArray(snapshotPatch.channels) ? snapshotPatch.channels.map((item) => safe(item, 80)).filter(Boolean).slice(0, 12) : current.snapshot.channels,
        offer: { ...current.snapshot.offer, ...(snapshotPatch.offer || {}) },
        strategy: { ...current.snapshot.strategy, ...(snapshotPatch.strategy || {}) },
        criteria: { ...current.snapshot.criteria, ...(snapshotPatch.criteria || {}) },
        checklist: snapshotPatch.checklist !== undefined ? PLAYBOOKS?.cleanChecklist?.(snapshotPatch.checklist) || snapshotPatch.checklist : current.snapshot.checklist,
      },
      updatedAt: nowIso(),
    };
    write(KEYS.candidates, [next, ...candidates().filter((row) => row.id !== id)].slice(0, 500));
    recordEvent('candidate_updated', next, { changedFields: Object.keys(patch) });
    return next;
  }

  function validateCandidate(candidate) {
    const errors = [];
    const minimum = num(settings().minimumReviewLength, 20);
    if (!candidate) errors.push('Variante candidata não encontrada.');
    if (candidate && safe(candidate.hypothesis, 1200).length < minimum) errors.push(`Registre uma hipótese com pelo menos ${minimum} caracteres.`);
    if (candidate && safe(candidate.changeSummary, 1200).length < minimum) errors.push(`Descreva as mudanças com pelo menos ${minimum} caracteres.`);
    if (candidate && safe(candidate.snapshot?.title, 180).length < 6) errors.push('O título da versão precisa ter pelo menos 6 caracteres.');
    if (candidate && safe(candidate.snapshot?.offer?.audience, 500).length < 8) errors.push('Defina o público da variante.');
    if (candidate && safe(candidate.snapshot?.offer?.promise, 700).length < 12) errors.push('Defina uma promessa verificável.');
    if (candidate && (candidate.snapshot?.checklist || []).length < 5) errors.push('A variante precisa manter pelo menos cinco itens no checklist.');
    return { valid: errors.length === 0, errors };
  }

  function applySnapshotToPlaybook(playbookId, snapshot, version) {
    const rows = playbooks();
    const current = rows.find((row) => row.id === playbookId);
    if (!current) throw new Error('Playbook não encontrado para aplicar a versão.');
    const next = {
      ...current,
      ...clone(snapshot),
      id: current.id,
      status: 'published',
      versionMeta: { id: version.id, number: version.number, label: version.label, activatedAt: nowIso() },
      updatedAt: nowIso(),
    };
    write(playbooksKey(), [next, ...rows.filter((row) => row.id !== playbookId)].slice(0, 500));
    ROOT.dispatchEvent?.(new CustomEvent('commerce-radar-playbook-updated', { detail: next }));
    return next;
  }

  function publishCandidate(id, reviewNote = '', confirmation = '') {
    const candidate = candidates().find((row) => row.id === id);
    const validation = validateCandidate(candidate);
    if (!validation.valid) throw new Error(validation.errors[0]);
    const note = safe(reviewNote, 1800);
    if (note.length < num(settings().minimumReviewLength, 20)) throw new Error('Registre a revisão da variante antes de publicar.');
    if (safe(confirmation, 80).toLocaleUpperCase('pt-BR') !== 'PUBLICAR') throw new Error('Digite PUBLICAR para confirmar a nova versão.');
    const rows = versions();
    const current = activeVersion(candidate.playbookId, rows);
    const version = {
      id: `playbook-version-${uid()}`,
      playbookId: candidate.playbookId,
      playbookTitle: candidate.snapshot.title,
      number: candidate.proposedNumber,
      label: candidate.proposedLabel,
      state: 'active',
      snapshot: clone(candidate.snapshot),
      snapshotHash: hashSnapshot(candidate.snapshot),
      baseVersionId: candidate.baseVersionId,
      hypothesis: candidate.hypothesis,
      changeSummary: candidate.changeSummary,
      reviewNote: note,
      createdAt: candidate.createdAt,
      publishedAt: nowIso(),
      createdBy: 'revisão controlada',
      signature: 'Tehkné Solutions',
    };
    const updatedVersions = [version, ...rows.map((row) => row.playbookId === candidate.playbookId && row.state === 'active' ? { ...row, state: 'superseded', supersededAt: nowIso(), supersededBy: version.id } : row)];
    write(KEYS.versions, updatedVersions.slice(0, 2000));
    write(KEYS.candidates, candidates().filter((row) => row.id !== id));
    applySnapshotToPlaybook(candidate.playbookId, version.snapshot, version);
    recordEvent('version_published', version, { previousVersionId: current?.id || '', candidateId: id });
    return version;
  }

  function rollback(playbookId, targetVersionId, reason = '', confirmation = '') {
    const justification = safe(reason, 1800);
    if (justification.length < num(settings().minimumReviewLength, 20)) throw new Error('Justifique o rollback com pelo menos 20 caracteres.');
    if (safe(confirmation, 80).toLocaleUpperCase('pt-BR') !== 'ROLLBACK') throw new Error('Digite ROLLBACK para confirmar.');
    const rows = versions();
    const target = rows.find((row) => row.id === targetVersionId && row.playbookId === playbookId);
    if (!target || !['superseded', 'active'].includes(target.state)) throw new Error('A versão selecionada não pode ser restaurada.');
    const current = activeVersion(playbookId, rows);
    if (current?.id === target.id) throw new Error('A versão selecionada já está ativa.');
    const activatedAt = nowIso();
    const nextRows = rows.map((row) => {
      if (row.playbookId !== playbookId) return row;
      if (row.id === target.id) return { ...row, state: 'active', reactivatedAt: activatedAt, supersededAt: '', supersededBy: '' };
      if (row.state === 'active') return { ...row, state: 'superseded', supersededAt: activatedAt, supersededBy: target.id };
      return row;
    });
    write(KEYS.versions, nextRows);
    applySnapshotToPlaybook(playbookId, target.snapshot, target);
    recordEvent('version_rollback', target, { previousVersionId: current?.id || '', reason: justification });
    return target;
  }

  function recordEvent(type, entity, detail = {}) {
    const row = {
      id: `playbook-version-event-${uid()}`,
      type,
      playbookId: entity.playbookId,
      versionId: entity.id,
      label: entity.label || entity.proposedLabel || '',
      detail: clone(detail),
      at: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.events, [row, ...events()].slice(0, Math.max(200, num(settings().keepEvents, 1500))));
    return row;
  }

  function attachVersionToApplication(result, playbookId) {
    if (!result?.application || !result?.plan) return result;
    const playbook = playbooks().find((row) => row.id === playbookId);
    const version = activeVersion(playbookId) || ensureBaseline(playbook);
    if (!version) return result;
    const application = { ...result.application, playbookVersionId: version.id, playbookVersionLabel: version.label, playbookVersionSource: 'captured' };
    const plan = { ...result.plan, playbook: { ...(result.plan.playbook || {}), versionId: version.id, versionLabel: version.label } };
    write(applicationsKey(), [application, ...applications().filter((row) => row.id !== application.id)].slice(0, 1000));
    const plans = read(plansKey(), []);
    write(plansKey(), [plan, ...plans.filter((row) => row.id !== plan.id)].slice(0, 300));
    recordEvent('version_applied', version, { applicationId: application.id, planId: plan.id });
    return { ...result, application, plan };
  }

  function applicationsWithVersions() {
    const versionRows = versions();
    const baselineByPlaybook = new Map();
    for (const playbook of playbooks()) {
      const first = versionRows.filter((row) => row.playbookId === playbook.id).sort((a, b) => num(a.number) - num(b.number))[0] || ensureBaseline(playbook);
      if (first) baselineByPlaybook.set(playbook.id, first);
    }
    return applications().map((row) => {
      if (row.playbookVersionId) return row;
      const baseline = baselineByPlaybook.get(row.playbookId);
      return baseline ? { ...row, playbookVersionId: baseline.id, playbookVersionLabel: baseline.label, playbookVersionSource: 'inferred' } : row;
    });
  }

  function summarizeVersion(version, rawApplications = applicationsWithVersions(), rawCycles = cycles()) {
    const playbook = playbooks().find((row) => row.id === version.playbookId) || { id: version.playbookId, sourcePlanId: version.snapshot?.sourcePlanId };
    const cycleMap = new Map(rawCycles.map((cycle) => [cycle.planId, cycle]));
    const rows = rawApplications.filter((row) => row.playbookId === version.playbookId && row.playbookVersionId === version.id)
      .map((application) => PERFORMANCE?.compareApplication?.(application, playbook, cycleMap))
      .filter(Boolean);
    const comparable = rows.filter((row) => row.comparable);
    const reproduced = comparable.filter((row) => row.result === 'reproduced').length;
    const failed = comparable.filter((row) => row.result === 'failed').length;
    const avg = (field) => comparable.length ? comparable.reduce((sum, row) => sum + num(row.deltas?.[field]), 0) / comparable.length : 0;
    return {
      version,
      applications: rows.length,
      completed: comparable.length,
      reproduced,
      failed,
      replicationRate: comparable.length ? reproduced / comparable.length * 100 : 0,
      profitableRate: comparable.length ? comparable.filter((row) => num(row.target?.metrics?.netProfit) > 0).length / comparable.length * 100 : 0,
      avgScoreDelta: avg('score'),
      avgProfitDelta: avg('profit'),
      comparisons: comparable,
    };
  }

  function versionReport(reference = today()) {
    ensureBaselines();
    const rawApplications = applicationsWithVersions();
    const rawCycles = cycles(reference);
    const grouped = new Map();
    for (const version of versions()) {
      if (!grouped.has(version.playbookId)) grouped.set(version.playbookId, []);
      grouped.get(version.playbookId).push(summarizeVersion(version, rawApplications, rawCycles));
    }
    const playbookRows = playbooks().filter((row) => row.status !== 'draft').map((playbook) => {
      const rows = (grouped.get(playbook.id) || []).sort((a, b) => num(b.version.number) - num(a.version.number));
      return {
        playbook,
        active: rows.find((row) => row.version.state === 'active') || rows[0] || null,
        versions: rows,
        candidate: candidates().find((row) => row.playbookId === playbook.id && row.status === 'draft') || null,
      };
    });
    return {
      reference,
      rows: playbookRows,
      totalVersions: versions().length,
      activeVersions: versions().filter((row) => row.state === 'active').length,
      candidates: candidates().filter((row) => row.status === 'draft').length,
      rollbacks: events().filter((row) => row.type === 'version_rollback').length,
    };
  }

  function captureVersionSnapshot(reference = today()) {
    const report = versionReport(reference);
    const row = {
      id: `playbook-version-snapshot-${reference}`,
      date: reference,
      rows: report.rows.map((item) => ({
        playbookId: item.playbook.id,
        activeVersionId: item.active?.version.id || '',
        activeVersionLabel: item.active?.version.label || '',
        versionCount: item.versions.length,
        candidateId: item.candidate?.id || '',
        performance: item.versions.map((version) => ({ id: version.version.id, label: version.version.label, completed: version.completed, replicationRate: version.replicationRate, avgScoreDelta: version.avgScoreDelta, avgProfitDelta: version.avgProfitDelta })),
      })),
      capturedAt: nowIso(),
      signature: 'Tehkné Solutions',
    };
    write(KEYS.snapshots, [row, ...snapshots().filter((item) => item.date !== reference)].slice(0, Math.max(30, num(settings().keepSnapshots, 365))));
    return row;
  }

  function versionMarkdown() {
    const report = versionReport();
    return [
      '# Commerce Radar — Versionamento dos playbooks', '', `Data: ${report.reference}`, `Versões preservadas: ${report.totalVersions}`, `Variantes candidatas: ${report.candidates}`, `Rollbacks registrados: ${report.rollbacks}`, '',
      '## Playbooks', '',
      ...report.rows.flatMap((item) => [
        `### ${item.playbook.title}`, '',
        `- Versão ativa: ${item.active?.version.label || 'não definida'}`,
        `- Total de versões: ${item.versions.length}`,
        `- Variante em revisão: ${item.candidate ? item.candidate.proposedLabel : 'não'}`,
        ...item.versions.map((row) => `- ${row.version.label} · ${STATE[row.version.state] || row.version.state} · ${row.completed} ciclo(s) comparável(is) · reprodução ${PCT.format(row.replicationRate)}% · Δ lucro ${BRL.format(row.avgProfitDelta)}`),
        '',
      ]),
      '## Controles', '', '- Versões publicadas são imutáveis.', '- Toda mudança nasce como variante candidata.', '- Publicação e rollback exigem justificativa e confirmação textual.', '- O histórico não é apagado durante rollback.', '- Aplicações antigas sem versão explícita são associadas à versão-base como inferência identificada.', '',
      'Tehkné Solutions',
    ].join('\n');
  }

  function patchPlaybookApi() {
    if (!PLAYBOOKS || PLAYBOOKS.__versioningPatched) return;
    const originalApply = PLAYBOOKS.applyPlaybook?.bind(PLAYBOOKS);
    const originalSave = PLAYBOOKS.savePlaybook?.bind(PLAYBOOKS);
    if (originalApply) PLAYBOOKS.applyPlaybook = (id, input = {}) => attachVersionToApplication(originalApply(id, input), id);
    if (originalSave) PLAYBOOKS.savePlaybook = (id, patch = {}) => {
      const current = playbooks().find((row) => row.id === id);
      if (current?.status === 'published' && !patch.__versioningInternal) throw new Error('Playbooks publicados são imutáveis. Crie uma variante candidata.');
      return originalSave(id, patch);
    };
    PLAYBOOKS.__versioningPatched = true;
  }

  function protectPublishedUi(event) {
    const button = event.target?.closest?.('[data-save-playbook]');
    if (!button) return;
    const playbook = playbooks().find((row) => row.id === button.dataset.savePlaybook);
    if (playbook?.status === 'published') {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast('Playbooks publicados são imutáveis. Edite por uma variante candidata.', true);
    }
  }

  function toast(message, error = false) {
    let node = $('playbookVersionToast');
    if (!node && typeof document !== 'undefined') { node = document.createElement('div'); node.id = 'playbookVersionToast'; document.body.append(node); }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3800);
  }

  function renderAll() {
    const report = versionReport();
    const summary = $('playbookVersionSummary');
    if (summary) summary.innerHTML = [
      ['Versões', report.totalVersions, 'preservadas'],
      ['Ativas', report.activeVersions, 'uma por playbook'],
      ['Candidatas', report.candidates, 'em revisão'],
      ['Rollbacks', report.rollbacks, 'registrados'],
    ].map(([label, value, note]) => `<article class="card pbvMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');

    const list = $('playbookVersionList');
    if (list) list.innerHTML = report.rows.length ? report.rows.map((item) => {
      const playbook = item.playbook;
      const versionsHtml = item.versions.map((row) => `<div class="pbvVersion state-${esc(row.version.state)}"><div><b>${esc(row.version.label)}</b><span>${esc(STATE[row.version.state] || row.version.state)}</span><small>${row.completed} comparável(is) · reprodução ${PCT.format(row.replicationRate)}% · Δ lucro ${BRL.format(row.avgProfitDelta)}</small></div>${row.version.state !== 'active' ? `<button class="btn small" data-pbv-rollback="${row.version.id}" data-pbv-playbook="${playbook.id}">Preparar rollback</button>` : ''}</div>`).join('');
      const candidate = item.candidate;
      const candidateHtml = candidate ? `<article class="pbvCandidate"><span class="eyebrow">VARIANTE ${esc(candidate.proposedLabel)}</span><label class="field"><span>Hipótese</span><textarea rows="2" data-pbv-hypothesis="${candidate.id}">${esc(candidate.hypothesis)}</textarea></label><label class="field"><span>Resumo das mudanças</span><textarea rows="2" data-pbv-summary="${candidate.id}">${esc(candidate.changeSummary)}</textarea></label><label class="field"><span>Título</span><input data-pbv-title="${candidate.id}" value="${esc(candidate.snapshot.title)}"></label><label class="field"><span>Público</span><textarea rows="2" data-pbv-audience="${candidate.id}">${esc(candidate.snapshot.offer?.audience || '')}</textarea></label><label class="field"><span>Promessa</span><textarea rows="2" data-pbv-promise="${candidate.id}">${esc(candidate.snapshot.offer?.promise || '')}</textarea></label><label class="field"><span>Checklist — uma linha por item</span><textarea rows="6" data-pbv-checklist="${candidate.id}">${esc((candidate.snapshot.checklist || []).map((row) => row.label || row).join('\n'))}</textarea></label><div class="actions"><button class="btn" data-pbv-save="${candidate.id}">Salvar variante</button></div><label class="field"><span>Revisão para publicação</span><textarea rows="2" data-pbv-review="${candidate.id}" placeholder="Explique por que esta versão está pronta"></textarea></label><label class="field"><span>Confirmação</span><input data-pbv-confirm="${candidate.id}" placeholder="Digite PUBLICAR"></label><button class="btn primary" data-pbv-publish="${candidate.id}">Publicar nova versão</button></article>` : `<button class="btn primary" data-pbv-create="${playbook.id}">Criar variante candidata</button>`;
      return `<article class="card pbvCard"><div class="pbvHead"><div><span class="eyebrow">${esc(item.active?.version.label || 'Sem versão')}</span><h3>${esc(playbook.title)}</h3><p>${item.versions.length} versão(ões) preservada(s)</p></div><strong>${item.active?.completed || 0}</strong></div><div class="pbvVersions">${versionsHtml}</div>${candidateHtml}<div class="pbvRollback" id="pbvRollback-${playbook.id}"></div></article>`;
    }).join('') : '<div class="card empty"><p>Nenhum playbook publicado.</p></div>';

    document.querySelectorAll('[data-pbv-create]').forEach((button) => {
      button.onclick = () => { try { createCandidate(button.dataset.pbvCreate); renderAll(); toast('Variante candidata criada a partir da versão ativa.'); } catch (error) { toast(error.message, true); } };
    });
    document.querySelectorAll('[data-pbv-save]').forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.pbvSave;
        try {
          updateCandidate(id, {
            hypothesis: document.querySelector(`[data-pbv-hypothesis="${id}"]`)?.value,
            changeSummary: document.querySelector(`[data-pbv-summary="${id}"]`)?.value,
            snapshot: {
              title: document.querySelector(`[data-pbv-title="${id}"]`)?.value,
              offer: {
                audience: document.querySelector(`[data-pbv-audience="${id}"]`)?.value,
                promise: document.querySelector(`[data-pbv-promise="${id}"]`)?.value,
              },
              checklist: document.querySelector(`[data-pbv-checklist="${id}"]`)?.value,
            },
          });
          renderAll();
          toast('Variante candidata atualizada.');
        } catch (error) { toast(error.message, true); }
      };
    });
    document.querySelectorAll('[data-pbv-publish]').forEach((button) => {
      button.onclick = () => {
        const id = button.dataset.pbvPublish;
        try {
          publishCandidate(id, document.querySelector(`[data-pbv-review="${id}"]`)?.value || '', document.querySelector(`[data-pbv-confirm="${id}"]`)?.value || '');
          renderAll();
          toast('Nova versão publicada e ativada.');
        } catch (error) { toast(error.message, true); }
      };
    });
    document.querySelectorAll('[data-pbv-rollback]').forEach((button) => {
      button.onclick = () => {
        const playbookId = button.dataset.pbvPlaybook;
        const targetVersionId = button.dataset.pbvRollback;
        const host = $(`pbvRollback-${playbookId}`);
        if (host) host.innerHTML = `<div class="pbvRollbackForm"><label class="field"><span>Justificativa do rollback</span><textarea rows="2" data-pbv-rollback-reason="${targetVersionId}"></textarea></label><label class="field"><span>Confirmação</span><input data-pbv-rollback-confirm="${targetVersionId}" placeholder="Digite ROLLBACK"></label><button class="btn" data-pbv-rollback-execute="${targetVersionId}" data-pbv-playbook="${playbookId}">Executar rollback</button></div>`;
        host?.querySelector('[data-pbv-rollback-execute]')?.addEventListener('click', () => {
          try {
            rollback(playbookId, targetVersionId, host.querySelector(`[data-pbv-rollback-reason="${targetVersionId}"]`)?.value || '', host.querySelector(`[data-pbv-rollback-confirm="${targetVersionId}"]`)?.value || '');
            renderAll();
            toast('Rollback concluído sem apagar o histórico.');
          } catch (error) { toast(error.message, true); }
        });
      };
    });

    const badge = $('playbookVersionNavCount');
    if (badge) badge.textContent = report.candidates || '';
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'playbookVersioning'));
    document.querySelectorAll('.nav').forEach((nav) => nav.classList.toggle('on', nav.id === 'playbookVersionNav'));
    if ($('title')) $('title').textContent = 'Controle versões e variantes dos playbooks';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.playbookVersions = KEYS.versions;
      keys.playbookVersionCandidates = KEYS.candidates;
      keys.playbookVersionEvents = KEYS.events;
      keys.playbookVersionSnapshots = KEYS.snapshots;
      keys.playbookVersionSettings = KEYS.settings;
      return true;
    };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { versions: [], candidates: [], events: [], snapshots: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const input = $('restoreFile'); const merge = $('mergeRestore'); const replace = $('replaceRestore');
      if (!input || !merge || !replace) { if (attempts > 360) clearInterval(timer); return; }
      clearInterval(timer);
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            versions: Array.isArray(payload.playbookVersions) ? payload.playbookVersions : [],
            candidates: Array.isArray(payload.playbookVersionCandidates) ? payload.playbookVersionCandidates : [],
            events: Array.isArray(payload.playbookVersionEvents) ? payload.playbookVersionEvents : [],
            snapshots: Array.isArray(payload.playbookVersionSnapshots) ? payload.playbookVersionSnapshots : [],
            settings: payload.playbookVersionSettings && typeof payload.playbookVersionSettings === 'object' ? payload.playbookVersionSettings : {},
          };
        } catch { pending = { versions: [], candidates: [], events: [], snapshots: [], settings: {} }; }
      }, { capture: true });
      merge.addEventListener('click', () => {
        const mergeBy = (left, right, key = 'id') => [...new Map([...left, ...right].map((item) => [item[key], item])).values()];
        write(KEYS.versions, mergeBy(versions(), pending.versions).slice(0, 2000));
        write(KEYS.candidates, mergeBy(candidates(), pending.candidates).slice(0, 500));
        write(KEYS.events, mergeBy(events(), pending.events).slice(0, 1500));
        write(KEYS.snapshots, mergeBy(snapshots(), pending.snapshots).slice(0, 365));
        write(KEYS.settings, { ...settings(), ...pending.settings });
        renderAll();
      });
      replace.addEventListener('click', () => {
        write(KEYS.versions, pending.versions);
        write(KEYS.candidates, pending.candidates);
        write(KEYS.events, pending.events);
        write(KEYS.snapshots, pending.snapshots);
        write(KEYS.settings, pending.settings);
        renderAll();
      });
    }, 50);
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const performanceNav = $('playbookPerformanceNav');
    const performanceView = $('playbookPerformance');
    if (!performanceNav || !performanceView || $('playbookVersionNav')) return false;
    performanceNav.insertAdjacentHTML('afterend', '<button class="nav" id="playbookVersionNav"><span>Versões dos playbooks</span><b id="playbookVersionNavCount"></b></button>');
    performanceView.insertAdjacentHTML('afterend', `<section class="view" id="playbookVersioning"><div class="sectionHead"><div><span class="eyebrow">REVISÃO CONTROLADA</span><h2>Versões e variantes dos playbooks</h2><p class="muted">Preserve versões publicadas, teste variantes candidatas e execute rollback sem apagar aplicações ou decisões anteriores.</p></div><div class="actions"><button class="btn" id="pbvCapture">Capturar versões</button><button class="btn" id="pbvExport">Exportar relatório</button></div></div><div class="pbvSummary" id="playbookVersionSummary"></div><div class="pbvList" id="playbookVersionList"></div><div id="playbookVersionToast" class="v021Toast"></div></section>`);
    $('playbookVersionNav').onclick = showView;
    $('pbvCapture').onclick = () => { captureVersionSnapshot(); toast('Snapshot de versões capturado.'); };
    $('pbvExport').onclick = () => {
      const url = URL.createObjectURL(new Blob([versionMarkdown()], { type: 'text/markdown;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `commerce-radar-versoes-playbooks-${today()}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    };
    document.addEventListener('click', protectPublishedUi, true);
    ensureBaselines();
    patchPlaybookApi();
    extendCloud();
    enhanceBackup();
    renderAll();
    ROOT.addEventListener?.('commerce-radar-playbook-updated', renderAll);
    ROOT.addEventListener?.('commerce-radar-playbook-applied', renderAll);
    ROOT.addEventListener?.('commerce-radar-activation-updated', renderAll);
    ROOT.addEventListener?.('storage', (event) => { if (Object.values(KEYS).includes(event.key) || Object.values(PLAYBOOKS?.KEYS || {}).includes(event.key)) renderAll(); });
    return true;
  }

  function boot() {
    patchPlaybookApi();
    ensureBaselines();
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 1800) clearInterval(timer); }, 50);
  }

  ROOT.CommerceRadarPlaybookVersions = {
    KEYS, DEFAULTS, STATE, settings, versions, candidates, events, snapshots, snapshotFromPlaybook, hashSnapshot,
    activeVersion, ensureBaseline, ensureBaselines, createCandidate, updateCandidate, validateCandidate, publishCandidate,
    rollback, attachVersionToApplication, applicationsWithVersions, summarizeVersion, versionReport, captureVersionSnapshot, versionMarkdown,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  } else {
    patchPlaybookApi();
    ensureBaselines();
  }
})();