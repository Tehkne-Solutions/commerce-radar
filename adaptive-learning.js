(() => {
  'use strict';
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    recommendations: 'tehkne-commerce-radar-v84-adaptive-recommendations',
    feedback: 'tehkne-commerce-radar-v84-adaptive-feedback',
    snapshots: 'tehkne-commerce-radar-v84-adaptive-snapshots',
    reports: 'tehkne-commerce-radar-v84-adaptive-reports',
    settings: 'tehkne-commerce-radar-v84-adaptive-settings'
  };
  const DEFAULTS = { minimumSample: 3, recurrencePenalty: 12, lowConfidencePenalty: 8, feedbackWeight: 4, keepSnapshots: 180 };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowIso = () => new Date().toISOString();
  const settings = () => ({ ...DEFAULTS, ...read(KEYS.settings, {}) });
  const feedback = () => read(KEYS.feedback, []);
  const recommendations = () => read(KEYS.recommendations, []);
  const experiments = () => ROOT.CommerceRadarPlaybookVersionExperiments?.experiments?.() || [];
  const preventionRows = () => ROOT.CommerceRadarEvidencePrevention?.report?.().rows || [];

  function normalizeExperiment(row) {
    const confidence = ROOT.CommerceRadarEvidenceConfidence?.assess?.(row.id, false) || {};
    const monitors = preventionRows().filter(item => item.experimentId === row.id);
    const recurrent = monitors.filter(item => item.status === 'recurrent').length;
    const stable = monitors.filter(item => item.status === 'stable').length;
    const human = feedback().filter(item => item.experimentId === row.id);
    const accepted = human.filter(item => item.decision === 'accepted').length;
    const rejected = human.filter(item => item.decision === 'rejected').length;
    const sample = Number(row.sampleSize ?? row.sample ?? row.results?.length ?? monitors.length ?? 0);
    const outcome = Number(row.successRate ?? row.score ?? row.resultScore ?? confidence.score ?? 0);
    const base = outcome * 0.65 + Number(confidence.score || 0) * 0.35;
    const sampleFactor = Math.min(1, sample / Math.max(1, settings().minimumSample));
    const penalty = recurrent * settings().recurrencePenalty + (Number(confidence.score || 0) < 50 ? settings().lowConfidencePenalty : 0) + rejected * settings().feedbackWeight;
    const bonus = stable * 5 + accepted * settings().feedbackWeight;
    const score = Math.max(0, Math.min(100, Math.round((base * sampleFactor + bonus - penalty) * 10) / 10));
    const confidenceLevel = sample < settings().minimumSample ? 'insufficient' : confidence.score >= 70 ? 'high' : confidence.score >= 50 ? 'medium' : 'low';
    const positives = [];
    const risks = [];
    if (stable) positives.push(`${stable} monitoramento(s) estável(is)`);
    if (accepted) positives.push(`${accepted} feedback(s) aceito(s)`);
    if (confidence.score >= 70) positives.push('confiança de evidência alta');
    if (sample < settings().minimumSample) risks.push(`amostra abaixo de ${settings().minimumSample}`);
    if (recurrent) risks.push(`${recurrent} reincidência(s)`);
    if (confidence.score < 50) risks.push('confiança de evidência baixa');
    return {
      id: `adaptive-${row.id}`,
      experimentId: row.id,
      title: row.playbookTitle || row.title || row.name || row.id,
      playbook: row.playbookTitle || row.playbook || 'Não informado',
      channel: row.channel || row.marketplace || 'Não informado',
      product: row.product || row.productName || 'Não informado',
      segment: row.segment || row.audience || 'Não informado',
      score,
      confidence: confidenceLevel,
      sample,
      positives,
      risks,
      limitation: confidenceLevel === 'insufficient' ? 'Recomendação exploratória; colete mais evidências antes de decidir.' : 'Recomendação informativa; exige validação humana.',
      generatedAt: nowIso(),
      signature: 'Tehkné Solutions'
    };
  }

  function generate() {
    const rows = experiments().map(normalizeExperiment).sort((a, b) => b.score - a.score);
    write(KEYS.recommendations, rows);
    return rows;
  }

  function recordFeedback(experimentId, decision, note = '') {
    if (!['accepted', 'ignored', 'rejected'].includes(decision)) throw new Error('Feedback inválido.');
    const row = { id: `adaptive-feedback-${uid()}`, experimentId, decision, note: String(note).slice(0, 300), createdAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.feedback, [row, ...feedback()].slice(0, 5000));
    generate();
    return row;
  }

  function summary() {
    const rows = recommendations().length ? recommendations() : generate();
    return { total: rows.length, high: rows.filter(row => row.score >= 70).length, exploratory: rows.filter(row => row.confidence === 'insufficient').length, average: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length * 10) / 10 : 0, rows };
  }

  function captureSnapshot(reference = nowIso().slice(0, 10)) {
    const current = summary();
    const row = { id: `adaptive-snapshot-${reference}`, date: reference, metrics: { total: current.total, high: current.high, exploratory: current.exploratory, average: current.average }, top: current.rows.slice(0, 10).map(item => ({ experimentId: item.experimentId, score: item.score, confidence: item.confidence })), capturedAt: nowIso(), signature: 'Tehkné Solutions' };
    write(KEYS.snapshots, [row, ...read(KEYS.snapshots, []).filter(item => item.date !== reference)].slice(0, settings().keepSnapshots));
    return row;
  }

  function exportMarkdown() {
    const current = summary();
    const lines = ['# Commerce Radar — Aprendizado adaptativo', '', `- Recomendações: ${current.total}`, `- Alta prioridade: ${current.high}`, `- Exploratórias: ${current.exploratory}`, `- Score médio: ${current.average}`, ''];
    current.rows.forEach((row, index) => lines.push(`## ${index + 1}. ${row.title}`, '', `- Score: ${row.score}`, `- Confiança: ${row.confidence}`, `- Amostra: ${row.sample}`, `- Playbook: ${row.playbook}`, `- Canal: ${row.channel}`, `- Produto: ${row.product}`, `- Segmento: ${row.segment}`, `- Fatores positivos: ${row.positives.join('; ') || 'nenhum sinal forte'}`, `- Riscos: ${row.risks.join('; ') || 'nenhum risco adicional identificado'}`, `- Limitação: ${row.limitation}`, ''));
    lines.push('## Segurança funcional', '', '- O módulo não altera experimentos, orçamento, produtos, canais ou decisões automaticamente.', '', 'Tehkné Solutions');
    const markdown = lines.join('\n');
    write(KEYS.reports, [{ id: `adaptive-report-${uid()}`, markdown, createdAt: nowIso(), signature: 'Tehkné Solutions' }, ...read(KEYS.reports, [])].slice(0, 300));
    return markdown;
  }

  function extendCloud() {
    const apply = () => { const keys = ROOT.CommerceRadarCloud?.dataKeys; if (!keys) return false; keys.adaptiveRecommendations = KEYS.recommendations; keys.adaptiveFeedback = KEYS.feedback; keys.adaptiveSnapshots = KEYS.snapshots; keys.adaptiveReports = KEYS.reports; keys.adaptiveSettings = KEYS.settings; return true; };
    if (!apply()) ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.getElementById('evidencePreventionNav');
    const view = document.getElementById('evidencePrevention');
    if (!nav || !view || document.getElementById('adaptiveLearningNav')) return false;
    nav.insertAdjacentHTML('afterend', '<button class="nav" id="adaptiveLearningNav"><span>Aprendizado adaptativo</span><b id="adaptiveLearningNavCount"></b></button>');
    view.insertAdjacentHTML('afterend', '<section class="view" id="adaptiveLearning"><div class="sectionHead"><div><span class="eyebrow">INTELIGÊNCIA EXPLICÁVEL</span><h2>Aprendizado adaptativo</h2><p class="muted">Priorize oportunidades com base no histórico, sem decisões automáticas.</p></div><div class="actions"><button class="btn" id="adaptiveRefresh">Recalcular</button><button class="btn" id="adaptiveExport">Exportar</button></div></div><div class="adaptiveSummary" id="adaptiveSummary"></div><div id="adaptiveList"></div></section>');
    const render = () => { const current = summary(); document.getElementById('adaptiveSummary').innerHTML = [['Recomendações', current.total], ['Alta prioridade', current.high], ['Exploratórias', current.exploratory], ['Score médio', current.average]].map(item => `<article class="card"><small>${item[0]}</small><strong>${item[1]}</strong></article>`).join(''); document.getElementById('adaptiveList').innerHTML = current.rows.map(row => `<article class="card adaptiveCard"><div><h3>${row.title}</h3><p><b>${row.score}</b>/100 · ${row.confidence} · amostra ${row.sample}</p><small>${row.positives.join(' · ') || 'Sem sinais positivos fortes'}</small><br><small>${row.risks.join(' · ') || 'Sem riscos adicionais'}</small></div><div class="adaptiveActions"><button data-id="${row.experimentId}" data-decision="accepted">Aceitar</button><button data-id="${row.experimentId}" data-decision="ignored">Ignorar</button><button data-id="${row.experimentId}" data-decision="rejected">Rejeitar</button></div></article>`).join('') || '<p class="muted">Nenhum experimento disponível.</p>'; document.getElementById('adaptiveLearningNavCount').textContent = current.high || ''; document.querySelectorAll('.adaptiveActions button').forEach(button => button.onclick = () => { recordFeedback(button.dataset.id, button.dataset.decision); render(); }); };
    document.getElementById('adaptiveLearningNav').onclick = () => { document.querySelectorAll('.view').forEach(item => item.classList.toggle('on', item.id === 'adaptiveLearning')); document.querySelectorAll('.nav').forEach(item => item.classList.toggle('on', item.id === 'adaptiveLearningNav')); render(); };
    document.getElementById('adaptiveRefresh').onclick = () => { generate(); captureSnapshot(); render(); };
    document.getElementById('adaptiveExport').onclick = () => { const url = URL.createObjectURL(new Blob([exportMarkdown()], { type: 'text/markdown;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commerce-radar-aprendizado-${nowIso().slice(0,10)}.md`; anchor.click(); URL.revokeObjectURL(url); };
    render();
    return true;
  }

  function boot() { let attempts = 0; const timer = setInterval(() => { attempts += 1; if (inject() || attempts > 2000) clearInterval(timer); }, 50); }
  ROOT.CommerceRadarAdaptiveLearning = { KEYS, DEFAULTS, settings, recommendations, feedback, generate, recordFeedback, summary, captureSnapshot, exportMarkdown };
  extendCloud();
  if (typeof document !== 'undefined') document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
})();