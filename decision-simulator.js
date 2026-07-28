(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    simulations: 'tehkne-commerce-radar-v85-decision-simulations',
    snapshots: 'tehkne-commerce-radar-v85-decision-snapshots',
    decisions: 'tehkne-commerce-radar-v85-decision-records',
    reports: 'tehkne-commerce-radar-v85-decision-reports',
    settings: 'tehkne-commerce-radar-v85-decision-settings'
  };
  const DEFAULTS = { keepSnapshots: 180, conservativeFactor: 0.65, baseFactor: 1, aggressiveFactor: 1.35, riskWeight: 0.3 };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const simulations = () => read(KEYS.simulations, []);
  const recommendations = () => ROOT.CommerceRadarAdaptiveLearning?.recommendations?.() || ROOT.CommerceRadarAdaptiveLearning?.generate?.() || [];
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  function normalizeInput(input = {}) {
    return {
      revenue: Math.max(0, Number(input.revenue || 0)),
      marginRate: Math.max(0, Math.min(1, Number(input.marginRate ?? 0.3))),
      conversionRate: Math.max(0, Math.min(1, Number(input.conversionRate ?? 0.02))),
      cac: Math.max(0, Number(input.cac || 0)),
      investment: Math.max(0, Number(input.investment || 0))
    };
  }

  function scenarioFor(recommendation, input, type, factor) {
    const confidenceFactor = recommendation.confidence === 'high' ? 1 : recommendation.confidence === 'medium' ? 0.85 : recommendation.confidence === 'low' ? 0.7 : 0.55;
    const scoreFactor = Math.max(0, Math.min(1, Number(recommendation.score || 0) / 100));
    const riskSignals = (recommendation.risks || []).length;
    const uplift = (0.04 + scoreFactor * 0.22) * confidenceFactor * factor;
    const projectedRevenue = input.revenue * (1 + uplift);
    const projectedMargin = projectedRevenue * input.marginRate - input.investment;
    const projectedConversion = Math.min(1, input.conversionRate * (1 + uplift * 0.8));
    const projectedCac = Math.max(0, input.cac * (1 - uplift * 0.35 + riskSignals * 0.03));
    const downside = input.investment + input.revenue * (0.03 + riskSignals * 0.015) * factor;
    const riskScore = Math.max(0, Math.min(100, Math.round((100 - Number(recommendation.score || 0)) * settings().riskWeight + riskSignals * 12 + (1 - confidenceFactor) * 35)));
    const valueScore = Math.round((projectedMargin - downside * riskScore / 100) * 100) / 100;
    return { type, factor, uplift: Math.round(uplift * 1000) / 10, projectedRevenue: Math.round(projectedRevenue * 100) / 100, projectedMargin: Math.round(projectedMargin * 100) / 100, projectedConversion: Math.round(projectedConversion * 10000) / 100, projectedCac: Math.round(projectedCac * 100) / 100, downside: Math.round(downside * 100) / 100, riskScore, valueScore };
  }

  function simulate(recommendationId, rawInput = {}) {
    const recommendation = recommendations().find(row => row.id === recommendationId || row.experimentId === recommendationId);
    if (!recommendation) throw new Error('Recomendação não encontrada.');
    const input = normalizeInput(rawInput);
    const cfg = settings();
    const scenarios = [
      scenarioFor(recommendation, input, 'conservador', cfg.conservativeFactor),
      scenarioFor(recommendation, input, 'base', cfg.baseFactor),
      scenarioFor(recommendation, input, 'agressivo', cfg.aggressiveFactor)
    ];
    const recommended = [...scenarios].sort((a, b) => b.valueScore - a.valueScore)[0];
    const row = { id: `decision-simulation-${uid()}`, recommendationId: recommendation.id, experimentId: recommendation.experimentId, title: recommendation.title, input, scenarios, recommendedScenario: recommended.type, rationale: `Maior valor ajustado ao risco: ${money(recommended.valueScore)}.`, limitations: ['Projeção baseada em histórico e premissas informadas.', 'Não substitui validação operacional ou financeira.', 'Nenhum dado real é alterado automaticamente.'], createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.simulations, [row, ...simulations()].slice(0, 3000));
    return row;
  }

  function compare(ids = []) {
    const rows = simulations().filter(row => !ids.length || ids.includes(row.id));
    const ranked = rows.map(row => ({ ...row, selected: row.scenarios.find(item => item.type === row.recommendedScenario) })).sort((a, b) => (b.selected?.valueScore || 0) - (a.selected?.valueScore || 0));
    return { total: ranked.length, best: ranked[0] || null, rows: ranked };
  }

  function recordDecision(simulationId, decision, note = '') {
    if (!['approved', 'deferred', 'rejected'].includes(decision)) throw new Error('Decisão inválida.');
    const row = { id: `decision-record-${uid()}`, simulationId, decision, note: String(note).slice(0, 500), createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.decisions, [row, ...read(KEYS.decisions, [])].slice(0, 5000));
    return row;
  }

  function captureSnapshot(reference = nowIso().slice(0, 10)) {
    const current = compare();
    const row = { id: `decision-snapshot-${reference}`, date: reference, metrics: { total: current.total, bestSimulationId: current.best?.id || null, bestValueScore: current.best?.selected?.valueScore || 0 }, top: current.rows.slice(0, 10).map(item => ({ id: item.id, experimentId: item.experimentId, scenario: item.recommendedScenario, valueScore: item.selected?.valueScore || 0, riskScore: item.selected?.riskScore || 0 })), capturedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...read(KEYS.snapshots, []).filter(item => item.date !== reference)].slice(0, settings().keepSnapshots));
    return row;
  }

  function exportMarkdown(ids = []) {
    const current = compare(ids);
    const lines = ['# Commerce Radar — Simulador de decisões', '', `- Simulações comparadas: ${current.total}`, `- Melhor opção: ${current.best?.title || 'não disponível'}`, ''];
    current.rows.forEach((row, index) => { const selected = row.selected; lines.push(`## ${index + 1}. ${row.title}`, '', `- Cenário recomendado: ${row.recommendedScenario}`, `- Receita projetada: ${money(selected?.projectedRevenue)}`, `- Margem projetada: ${money(selected?.projectedMargin)}`, `- CAC projetado: ${money(selected?.projectedCac)}`, `- Conversão projetada: ${selected?.projectedConversion || 0}%`, `- Risco: ${selected?.riskScore || 0}/100`, `- Pior caso estimado: ${money(selected?.downside)}`, `- Justificativa: ${row.rationale}`, ''); });
    lines.push('## Limitações', '', '- Os resultados são simulações determinísticas baseadas nas entradas e no histórico disponível.', '- Nenhum orçamento, experimento, produto, canal ou recomendação é aplicado automaticamente.', '', 'Tehkné Solutions');
    const markdown = lines.join('\n');
    write(KEYS.reports, [{ id: `decision-report-${uid()}`, markdown, createdAt: nowIso(), signature: 'Tehkné Solutions' }, ...read(KEYS.reports, [])].slice(0, 300));
    return markdown;
  }

  function extendCloud() { const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.decisionSimulations = KEYS.simulations; keys.decisionSnapshots = KEYS.snapshots; keys.decisionRecords = KEYS.decisions; keys.decisionReports = KEYS.reports; keys.decisionSettings = KEYS.settings; return true; }; if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true }); }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.getElementById('adaptiveLearningNav');
    const view = document.getElementById('adaptiveLearning');
    if (!nav || !view || document.getElementById('decisionSimulatorNav')) return false;
    nav.insertAdjacentHTML('afterend', '<button class="nav" id="decisionSimulatorNav"><span>Simulador de decisões</span><b id="decisionSimulatorNavCount"></b></button>');
    view.insertAdjacentHTML('afterend', '<section class="view" id="decisionSimulator"><div class="sectionHead"><div><span class="eyebrow">CENÁRIOS ANTES DA AÇÃO</span><h2>Simulador de decisões</h2><p class="muted">Compare impacto, risco e pior caso sem alterar dados reais.</p></div><div class="actions"><button class="btn" id="decisionExport">Exportar</button></div></div><div class="decisionSummary" id="decisionSummary"></div><div id="decisionList"></div></section>');
    const render = () => { const current = compare(); document.getElementById('decisionSummary').innerHTML = [['Simulações', current.total], ['Melhor valor', money(current.best?.selected?.valueScore || 0)], ['Risco', current.best?.selected?.riskScore ?? '—']].map(item => `<article class="card"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join(''); document.getElementById('decisionList').innerHTML = current.rows.map(row => { const s = row.selected; return `<article class="card decisionCard"><h3>${row.title}</h3><p><b>${row.recommendedScenario}</b> · receita ${money(s?.projectedRevenue)} · margem ${money(s?.projectedMargin)}</p><small>Risco ${s?.riskScore}/100 · pior caso ${money(s?.downside)}</small></article>`; }).join('') || '<p class="muted">Crie simulações pela API CommerceRadarDecisionSimulator.simulate().</p>'; document.getElementById('decisionSimulatorNavCount').textContent = current.total || ''; };
    document.getElementById('decisionSimulatorNav').onclick = () => { document.querySelectorAll('.view').forEach(item => item.classList.toggle('on', item.id === 'decisionSimulator')); document.querySelectorAll('.nav').forEach(item => item.classList.toggle('on', item.id === 'decisionSimulatorNav')); render(); };
    document.getElementById('decisionExport').onclick = () => { const url = URL.createObjectURL(new Blob([exportMarkdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-simulacoes-${nowIso().slice(0,10)}.md`; anchor.click(); URL.revokeObjectURL(url); };
    render(); return true;
  }

  function boot() { let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 2000) clearInterval(timer); }, 50); }
  ROOT.CommerceRadarDecisionSimulator = { KEYS, DEFAULTS, settings, simulations, simulate, compare, recordDecision, captureSnapshot, exportMarkdown, money };
  extendCloud();
  if (typeof document !== 'undefined') document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();