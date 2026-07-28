(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const HISTORY = ROOT.CommerceRadarEvidenceHistory;
  const EVIDENCE = ROOT.CommerceRadarEvidenceConfidence;

  const KEYS = {
    alerts: 'tehkne-commerce-radar-v82-evidence-recovery-alerts',
    plans: 'tehkne-commerce-radar-v82-evidence-recovery-plans',
    actions: 'tehkne-commerce-radar-v82-evidence-recovery-actions',
    events: 'tehkne-commerce-radar-v82-evidence-recovery-events',
    snapshots: 'tehkne-commerce-radar-v82-evidence-recovery-snapshots',
    settings: 'tehkne-commerce-radar-v82-evidence-recovery-settings',
  };

  const DEFAULTS = {
    regressionThreshold: 8,
    componentLossThreshold: 10,
    defaultDueDays: 7,
    keepSnapshots: 365,
  };

  const suggestions = {
    sample: 'Executar novos ciclos comparáveis nos dois braços.',
    coverage: 'Criar ciclos nos estratos sem cobertura suficiente.',
    representation: 'Diversificar produtos, canais e contextos representados.',
    stability: 'Revisar fontes de variação e repetir ciclos sob condições equivalentes.',
    integrity: 'Restaurar snapshots congelados e validar hashes do experimento.',
  };

  const read = (key, fallback = []) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const safe = (value, max = 1200) => String(value ?? '').trim().slice(0, max);
  const nowIso = () => new Date().toISOString();
  const today = () => nowIso().slice(0, 10);
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const alerts = () => read(KEYS.alerts, []);
  const plans = () => read(KEYS.plans, []);
  const actions = () => read(KEYS.actions, []);
  const events = () => read(KEYS.events, []);
  const snapshots = () => read(KEYS.snapshots, []);
  const experiments = () => ROOT.CommerceRadarPlaybookVersionExperiments?.experiments?.() || [];

  function severity(delta) {
    const loss = Math.abs(Number(delta) || 0);
    if (loss >= 20) return 'critical';
    if (loss >= 12) return 'high';
    return 'medium';
  }

  function detect(experimentId, reference = today()) {
    const trend = HISTORY?.trend?.(experimentId) || {
      direction: 'insufficient',
      delta: 0,
      causes: [],
    };
    const latest = HISTORY?.series?.(experimentId)?.at(-1)
      || EVIDENCE?.assess?.(experimentId, false);
    const found = [];

    if (
      trend.direction === 'falling'
      && Math.abs(trend.delta) >= settings().regressionThreshold
    ) {
      found.push({
        component: 'overall',
        delta: trend.delta,
        severity: severity(trend.delta),
        message: `Confiança regrediu ${Math.abs(trend.delta).toFixed(1)} pontos.`,
      });
    }

    (trend.causes || [])
      .filter(cause => cause.value <= -settings().componentLossThreshold)
      .forEach(cause => {
        found.push({
          component: cause.component,
          delta: cause.value,
          severity: severity(cause.value),
          message: `${cause.component} perdeu ${Math.abs(cause.value).toFixed(1)} pontos.`,
        });
      });

    const preserved = alerts().filter(row => (
      row.experimentId !== experimentId || row.status === 'resolved'
    ));

    const rows = found.map(item => {
      const previous = alerts().find(row => (
        row.experimentId === experimentId
        && row.component === item.component
        && row.status !== 'resolved'
      ));

      if (previous) {
        return { ...previous, ...item, lastDetectedAt: nowIso() };
      }

      return {
        id: `recovery-alert-${uid()}`,
        experimentId,
        ...item,
        status: 'open',
        firstDetectedAt: nowIso(),
        lastDetectedAt: nowIso(),
        reference,
        score: latest?.score ?? null,
        signature: 'Tehkné Solutions',
      };
    });

    write(KEYS.alerts, [...rows, ...preserved].slice(0, 4000));
    return rows;
  }

  function generatePlan(experimentId, owner = 'Operação', dueDate = '') {
    const detected = detect(experimentId);
    if (!detected.length) {
      throw new Error('Não há regressão relevante para gerar plano.');
    }

    const existing = plans().find(row => (
      row.experimentId === experimentId && row.status === 'active'
    ));
    if (existing) return existing;

    const due = dueDate || new Date(
      Date.now() + settings().defaultDueDays * 86400000,
    ).toISOString().slice(0, 10);

    const plan = {
      id: `recovery-plan-${uid()}`,
      experimentId,
      status: 'active',
      owner: safe(owner, 120) || 'Operação',
      dueDate: due,
      baseline: EVIDENCE?.assess?.(experimentId, false)?.score ?? 0,
      createdAt: nowIso(),
      signature: 'Tehkné Solutions',
    };

    const planActions = detected.map((alert, index) => ({
      id: `recovery-action-${uid()}-${index}`,
      planId: plan.id,
      experimentId,
      alertId: alert.id,
      component: alert.component,
      title: alert.component === 'overall'
        ? 'Reverter regressão geral'
        : suggestions[alert.component] || `Recuperar ${alert.component}`,
      description: alert.component === 'overall'
        ? 'Executar as ações dos componentes degradados e registrar nova captura.'
        : suggestions[alert.component] || 'Documentar ação corretiva para este componente.',
      priority: alert.severity === 'critical'
        ? 'urgent'
        : alert.severity === 'high' ? 'high' : 'normal',
      owner: plan.owner,
      dueDate: due,
      status: 'todo',
      createdAt: nowIso(),
      signature: 'Tehkné Solutions',
    }));

    write(KEYS.plans, [plan, ...plans()].slice(0, 1500));
    write(KEYS.actions, [...planActions, ...actions()].slice(0, 6000));
    write(KEYS.events, [{
      id: `recovery-event-${uid()}`,
      type: 'plan_created',
      experimentId,
      planId: plan.id,
      createdAt: nowIso(),
      signature: 'Tehkné Solutions',
    }, ...events()].slice(0, 6000));

    return { plan, actions: planActions };
  }

  function updateAction(id, input = {}) {
    const current = actions().find(row => row.id === id);
    if (!current) throw new Error('Ação não encontrada.');

    const status = safe(input.status || current.status, 30);
    if (status === 'done' && safe(input.evidence, 1200).length < 20) {
      throw new Error('Registre evidência com pelo menos 20 caracteres.');
    }

    const row = {
      ...current,
      status,
      owner: safe(input.owner || current.owner, 120),
      dueDate: safe(input.dueDate || current.dueDate, 20),
      evidence: status === 'done'
        ? safe(input.evidence, 1200)
        : current.evidence || '',
      completedAt: status === 'done' ? nowIso() : null,
      updatedAt: nowIso(),
    };

    write(KEYS.actions, [row, ...actions().filter(item => item.id !== id)]);
    return row;
  }

  function verify(planId, confirmation = '') {
    if (safe(confirmation, 30).toUpperCase() !== 'VERIFICAR') {
      throw new Error('Digite VERIFICAR para confirmar.');
    }

    const plan = plans().find(row => row.id === planId);
    if (!plan) throw new Error('Plano não encontrado.');

    const pending = actions().filter(row => (
      row.planId === planId && row.status !== 'done'
    ));
    if (pending.length) {
      throw new Error('Conclua todas as ações antes da verificação.');
    }

    HISTORY?.capture?.(plan.experimentId);
    const score = EVIDENCE?.assess?.(plan.experimentId, false)?.score ?? 0;
    const recovered = score >= plan.baseline;
    const updated = {
      ...plan,
      status: recovered ? 'recovered' : 'monitoring',
      verifiedScore: score,
      verifiedAt: nowIso(),
    };

    write(KEYS.plans, [updated, ...plans().filter(row => row.id !== planId)]);

    if (recovered) {
      write(KEYS.alerts, alerts().map(row => (
        row.experimentId === plan.experimentId && row.status !== 'resolved'
          ? { ...row, status: 'resolved', resolvedAt: nowIso() }
          : row
      )));
    }

    write(KEYS.events, [{
      id: `recovery-event-${uid()}`,
      type: recovered ? 'recovery_verified' : 'recovery_pending',
      experimentId: plan.experimentId,
      planId,
      score,
      createdAt: nowIso(),
      signature: 'Tehkné Solutions',
    }, ...events()].slice(0, 6000));

    return updated;
  }

  function dashboard() {
    return experiments().map(experiment => {
      const activePlan = plans().find(row => (
        row.experimentId === experiment.id
        && ['active', 'monitoring'].includes(row.status)
      ));

      return {
        experiment,
        alerts: alerts().filter(row => (
          row.experimentId === experiment.id && row.status !== 'resolved'
        )),
        plan: activePlan || null,
        actions: activePlan
          ? actions().filter(row => row.planId === activePlan.id)
          : [],
      };
    });
  }

  function captureSnapshot(reference = today()) {
    const row = {
      id: `recovery-snapshot-${reference}`,
      date: reference,
      rows: dashboard().map(item => ({
        experimentId: item.experiment.id,
        alerts: item.alerts.length,
        planStatus: item.plan?.status || 'none',
        todo: item.actions.filter(action => action.status !== 'done').length,
      })),
      capturedAt: nowIso(),
      signature: 'Tehkné Solutions',
    };

    write(KEYS.snapshots, [
      row,
      ...snapshots().filter(item => item.date !== reference),
    ].slice(0, settings().keepSnapshots));
    return row;
  }

  function markdown() {
    const lines = ['# Commerce Radar — Recuperação da confiança', ''];
    dashboard().forEach(item => {
      lines.push(
        `## ${item.experiment.playbookTitle || item.experiment.id}`,
        '',
        `- Alertas abertos: ${item.alerts.length}`,
        `- Plano: ${item.plan?.status || 'não criado'}`,
      );
      item.actions.forEach(action => {
        lines.push(
          `- [${action.status === 'done' ? 'x' : ' '}] ${action.title} · ${action.owner} · ${action.dueDate}`,
        );
      });
      lines.push('');
    });
    lines.push(
      '## Limitações',
      '',
      '- Ações concluídas não elevam a pontuação por si só; a recuperação exige evidência observada em nova captura.',
      '- Nenhum plano promove, encerra ou altera automaticamente experimentos.',
      '',
      'Tehkné Solutions',
    );
    return lines.join('\n');
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.evidenceRecoveryAlerts = KEYS.alerts;
      keys.evidenceRecoveryPlans = KEYS.plans;
      keys.evidenceRecoveryActions = KEYS.actions;
      keys.evidenceRecoveryEvents = KEYS.events;
      keys.evidenceRecoverySnapshots = KEYS.snapshots;
      keys.evidenceRecoverySettings = KEYS.settings;
      return true;
    };
    if (!apply()) {
      ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
    }
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.getElementById('evidenceHistoryNav');
    const view = document.getElementById('evidenceHistory');
    if (!nav || !view || document.getElementById('evidenceRecoveryNav')) return false;

    nav.insertAdjacentHTML('afterend', '<button class="nav" id="evidenceRecoveryNav"><span>Recuperação da confiança</span><b id="evidenceRecoveryNavCount"></b></button>');
    view.insertAdjacentHTML('afterend', '<section class="view" id="evidenceRecovery"><div class="sectionHead"><div><span class="eyebrow">AÇÃO SOBRE REGRESSÕES</span><h2>Recuperação da confiança</h2><p class="muted">Converta perdas de qualidade em ações responsáveis e verifique a recuperação somente com nova evidência.</p></div><div class="actions"><button class="btn" id="recoveryCapture">Capturar</button><button class="btn" id="recoveryExport">Exportar relatório</button></div></div><div class="recoverySummary" id="recoverySummary"></div><div id="recoveryList"></div></section>');

    const render = () => {
      experiments().forEach(experiment => detect(experiment.id));
      const rows = dashboard();
      const open = rows.reduce((sum, item) => sum + item.alerts.length, 0);
      const active = rows.filter(item => item.plan).length;
      const overdue = rows.reduce((sum, item) => sum + item.actions.filter(action => (
        action.status !== 'done' && action.dueDate < today()
      )).length, 0);

      document.getElementById('recoverySummary').innerHTML = [
        ['Alertas', open],
        ['Planos ativos', active],
        ['Atrasadas', overdue],
      ].map(item => `<article class="card"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join('');

      document.getElementById('recoveryList').innerHTML = rows.map(item => `
        <article class="card recoveryCard">
          <h3>${item.experiment.playbookTitle || item.experiment.id}</h3>
          <p>${item.alerts.length} alerta(s) · ${item.plan?.status || 'sem plano'}</p>
          ${item.actions.map(action => `
            <div class="recoveryAction">
              <span>${action.title}</span><b>${action.status}</b>
              <small>${action.owner} · ${action.dueDate}</small>
            </div>
          `).join('') || '<p class="muted">Sem ações abertas.</p>'}
        </article>
      `).join('');

      document.getElementById('evidenceRecoveryNavCount').textContent = open || '';
    };

    document.getElementById('evidenceRecoveryNav').onclick = () => {
      document.querySelectorAll('.view').forEach(item => {
        item.classList.toggle('on', item.id === 'evidenceRecovery');
      });
      document.querySelectorAll('.nav').forEach(item => {
        item.classList.toggle('on', item.id === 'evidenceRecoveryNav');
      });
      render();
    };

    document.getElementById('recoveryCapture').onclick = () => {
      captureSnapshot();
      render();
    };
    document.getElementById('recoveryExport').onclick = () => {
      const url = URL.createObjectURL(new Blob([markdown()], {
        type: 'text/markdown;charset=utf-8',
      }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `commerce-radar-recuperacao-confianca-${today()}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    render();
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 2000) clearInterval(timer);
    }, 50);
  }

  ROOT.CommerceRadarEvidenceRecovery = {
    KEYS,
    DEFAULTS,
    settings,
    alerts,
    plans,
    actions,
    events,
    snapshots,
    severity,
    detect,
    generatePlan,
    updateAction,
    verify,
    dashboard,
    captureSnapshot,
    markdown,
  };

  extendCloud();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})();
