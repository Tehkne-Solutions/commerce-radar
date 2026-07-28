(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    portfolios: 'tehkne-commerce-radar-v86-portfolios',
    decisions: 'tehkne-commerce-radar-v86-portfolio-decisions',
    snapshots: 'tehkne-commerce-radar-v86-portfolio-snapshots',
    reports: 'tehkne-commerce-radar-v86-portfolio-reports',
    settings: 'tehkne-commerce-radar-v86-portfolio-settings'
  };
  const DEFAULTS = { maxAssetWeight: 0.45, maxChannelWeight: 0.65, maxProductWeight: 0.65, keepSnapshots: 180 };
  const PROFILES = {
    conservador: { riskPenalty: 1.35, maxWeight: 0.35 },
    balanceado: { riskPenalty: 0.9, maxWeight: 0.45 },
    agressivo: { riskPenalty: 0.45, maxWeight: 0.6 }
  };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const portfolios = () => read(KEYS.portfolios, []);
  const simulations = () => ROOT.CommerceRadarDecisionSimulator?.simulations?.() || [];

  function candidates() {
    return simulations().map(row => {
      const selected = row.scenarios?.find(item => item.type === row.recommendedScenario) || row.scenarios?.[0] || {};
      const investment = Math.max(1, Number(row.input?.investment || 1));
      const expectedReturn = Number(selected.projectedMargin || 0) - Number(row.input?.revenue || 0) * Number(row.input?.marginRate || 0);
      return {
        id: row.id,
        title: row.title,
        channel: row.channel || 'Não informado',
        product: row.product || 'Não informado',
        expectedReturn,
        returnRate: expectedReturn / investment,
        risk: Math.max(0, Math.min(100, Number(selected.riskScore || 0))),
        downsideRate: Math.max(0, Number(selected.downside || 0) / investment)
      };
    });
  }

  function allocate(totalBudget, profileName = 'balanceado', ids = []) {
    const budget = Math.max(0, Number(totalBudget || 0));
    if (!budget) throw new Error('Orçamento virtual deve ser maior que zero.');
    const profile = PROFILES[profileName];
    if (!profile) throw new Error('Perfil de portfólio inválido.');
    const rows = candidates().filter(row => !ids.length || ids.includes(row.id));
    if (!rows.length) throw new Error('Nenhuma simulação disponível para alocação.');
    const cfg = settings();
    const scored = rows.map(row => ({ ...row, score: Math.max(0.01, row.returnRate * 100 - row.risk * profile.riskPenalty - row.downsideRate * 10) }));
    const scoreTotal = scored.reduce((sum, row) => sum + row.score, 0);
    let allocations = scored.map(row => ({ ...row, weight: Math.min(profile.maxWeight, cfg.maxAssetWeight, row.score / scoreTotal) }));
    let weightTotal = allocations.reduce((sum, row) => sum + row.weight, 0);
    allocations = allocations.map(row => ({ ...row, weight: row.weight / weightTotal }));
    allocations = allocations.map(row => ({ ...row, amount: Math.round(budget * row.weight * 100) / 100 }));
    const allocated = allocations.reduce((sum, row) => sum + row.amount, 0);
    if (allocations.length) allocations[0].amount = Math.round((allocations[0].amount + budget - allocated) * 100) / 100;
    const expectedReturn = allocations.reduce((sum, row) => sum + row.amount * row.returnRate, 0);
    const weightedRisk = allocations.reduce((sum, row) => sum + row.weight * row.risk, 0);
    const worstCase = allocations.reduce((sum, row) => sum + row.amount * row.downsideRate, 0);
    const concentration = allocations.reduce((sum, row) => sum + row.weight ** 2, 0);
    const diversification = Math.max(0, Math.min(100, Math.round((1 - concentration) * 100)));
    const breaches = [];
    const groupWeight = field => allocations.reduce((map, row) => { map[row[field]] = (map[row[field]] || 0) + row.weight; return map; }, {});
    Object.entries(groupWeight('channel')).forEach(([name, weight]) => { if (weight > cfg.maxChannelWeight) breaches.push(`Canal ${name} acima do limite.`); });
    Object.entries(groupWeight('product')).forEach(([name, weight]) => { if (weight > cfg.maxProductWeight) breaches.push(`Produto ${name} acima do limite.`); });
    const row = { id: `portfolio-${uid()}`, profile: profileName, budget, allocations, expectedReturn: Math.round(expectedReturn * 100) / 100, weightedRisk: Math.round(weightedRisk * 10) / 10, worstCase: Math.round(worstCase * 100) / 100, concentration: Math.round(concentration * 1000) / 1000, diversification, breaches, createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.portfolios, [row, ...portfolios()].slice(0, 2000));
    return row;
  }

  function compare(ids = []) {
    const rows = portfolios().filter(row => !ids.length || ids.includes(row.id)).map(row => ({ ...row, adjustedValue: Math.round((row.expectedReturn - row.worstCase * row.weightedRisk / 100) * 100) / 100 })).sort((a, b) => b.adjustedValue - a.adjustedValue);
    return { total: rows.length, best: rows[0] || null, rows };
  }

  function recordDecision(portfolioId, decision, note = '') {
    if (!['approved', 'deferred', 'rejected'].includes(decision)) throw new Error('Decisão inválida.');
    const row = { id: `portfolio-decision-${uid()}`, portfolioId, decision, note: String(note).slice(0, 500), createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.decisions, [row, ...read(KEYS.decisions, [])].slice(0, 5000));
    return row;
  }

  function captureSnapshot(reference = nowIso().slice(0, 10)) {
    const current = compare();
    const row = { id: `portfolio-snapshot-${reference}`, date: reference, metrics: { total: current.total, bestId: current.best?.id || null, bestAdjustedValue: current.best?.adjustedValue || 0 }, top: current.rows.slice(0, 10).map(item => ({ id: item.id, profile: item.profile, budget: item.budget, expectedReturn: item.expectedReturn, risk: item.weightedRisk, diversification: item.diversification })), capturedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...read(KEYS.snapshots, []).filter(item => item.date !== reference)].slice(0, settings().keepSnapshots));
    return row;
  }

  function exportMarkdown(ids = []) {
    const current = compare(ids);
    const lines = ['# Commerce Radar — Laboratório de portfólio', '', `- Portfólios comparados: ${current.total}`, `- Melhor composição: ${current.best?.profile || 'não disponível'}`, ''];
    current.rows.forEach((row, index) => { lines.push(`## ${index + 1}. ${row.profile}`, '', `- Orçamento virtual: ${money(row.budget)}`, `- Retorno esperado: ${money(row.expectedReturn)}`, `- Pior caso: ${money(row.worstCase)}`, `- Risco ponderado: ${row.weightedRisk}/100`, `- Diversificação: ${row.diversification}/100`, `- Valor ajustado ao risco: ${money(row.adjustedValue)}`, `- Alertas: ${row.breaches.join('; ') || 'nenhum'}`, ''); row.allocations.forEach(item => lines.push(`  - ${item.title}: ${money(item.amount)} (${Math.round(item.weight * 1000) / 10}%)`)); lines.push(''); });
    lines.push('## Segurança funcional', '', '- Todas as alocações são virtuais.', '- Nenhum orçamento, campanha, produto ou experimento real é alterado automaticamente.', '', 'Tehkné Solutions');
    const markdown = lines.join('\n');
    write(KEYS.reports, [{ id: `portfolio-report-${uid()}`, markdown, createdAt: nowIso(), signature: 'Tehkné Solutions' }, ...read(KEYS.reports, [])].slice(0, 300));
    return markdown;
  }

  function extendCloud() { const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.portfolios = KEYS.portfolios; keys.portfolioDecisions = KEYS.decisions; keys.portfolioSnapshots = KEYS.snapshots; keys.portfolioReports = KEYS.reports; keys.portfolioSettings = KEYS.settings; return true; }; if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true }); }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.getElementById('decisionSimulatorNav');
    const view = document.getElementById('decisionSimulator');
    if (!nav || !view || document.getElementById('portfolioLabNav')) return false;
    nav.insertAdjacentHTML('afterend', '<button class="nav" id="portfolioLabNav"><span>Laboratório de portfólio</span><b id="portfolioLabNavCount"></b></button>');
    view.insertAdjacentHTML('afterend', '<section class="view" id="portfolioLab"><div class="sectionHead"><div><span class="eyebrow">ALOCAÇÃO VIRTUAL</span><h2>Laboratório de portfólio</h2><p class="muted">Compare retorno, risco e concentração antes de investir.</p></div><div class="actions"><button class="btn" id="portfolioExport">Exportar</button></div></div><div class="portfolioSummary" id="portfolioSummary"></div><div id="portfolioList"></div></section>');
    const render = () => { const current = compare(); document.getElementById('portfolioSummary').innerHTML = [['Portfólios', current.total], ['Melhor valor', money(current.best?.adjustedValue || 0)], ['Diversificação', current.best?.diversification ?? '—']].map(item => `<article class="card"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join(''); document.getElementById('portfolioList').innerHTML = current.rows.map(row => `<article class="card portfolioCard"><h3>${row.profile}</h3><p><b>${money(row.budget)}</b> · retorno ${money(row.expectedReturn)}</p><small>Risco ${row.weightedRisk}/100 · diversificação ${row.diversification}/100 · pior caso ${money(row.worstCase)}</small></article>`).join('') || '<p class="muted">Crie portfólios pela API CommerceRadarPortfolioLab.allocate().</p>'; document.getElementById('portfolioLabNavCount').textContent = current.total || ''; };
    document.getElementById('portfolioLabNav').onclick = () => { document.querySelectorAll('.view').forEach(item => item.classList.toggle('on', item.id === 'portfolioLab')); document.querySelectorAll('.nav').forEach(item => item.classList.toggle('on', item.id === 'portfolioLabNav')); render(); };
    document.getElementById('portfolioExport').onclick = () => { const url = URL.createObjectURL(new Blob([exportMarkdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-portfolios-${nowIso().slice(0,10)}.md`; anchor.click(); URL.revokeObjectURL(url); };
    render(); return true;
  }

  function boot() { let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 2000) clearInterval(timer); }, 50); }
  ROOT.CommerceRadarPortfolioLab = { KEYS, DEFAULTS, PROFILES, settings, portfolios, candidates, allocate, compare, recordDecision, captureSnapshot, exportMarkdown, money };
  extendCloud();
  if (typeof document !== 'undefined') document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();