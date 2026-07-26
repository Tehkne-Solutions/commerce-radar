(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    signals: 'tehkne-commerce-radar-v5-trend-signals',
    custom: 'tehkne-commerce-radar-v2-custom-opportunities',
    tests: 'tehkne-commerce-radar-v2-tests',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    trendSettings: 'tehkne-commerce-radar-v5-trend-settings',
  };

  const SOURCES = {
    search: { label: 'Busca e interesse', quality: 4 },
    marketplace: { label: 'Marketplace', quality: 4 },
    social: { label: 'Rede social / conteúdo', quality: 3 },
    supplier: { label: 'Fornecedor / catálogo', quality: 3 },
    internal: { label: 'Dados internos', quality: 5 },
    competitor: { label: 'Concorrência', quality: 3 },
    research: { label: 'Pesquisa / relatório', quality: 4 },
    community: { label: 'Comunidade / atendimento', quality: 2 },
    other: { label: 'Outra fonte', quality: 2 },
  };

  const CATEGORIES = {
    casa: 'Casa e organização',
    negocios: 'Pequenos negócios',
    tecnologia: 'Tecnologia',
    beleza: 'Beleza e autocuidado',
    moda: 'Moda e acessórios',
    pet: 'Pet',
    creator: 'Creators',
    automotivo: 'Automotivo',
    infantil: 'Infantil',
    outros: 'Outros',
  };

  const CHANNELS = [
    'TikTok Shop',
    'Mercado Livre',
    'Shopee',
    'Instagram + WhatsApp',
    'Loja própria',
  ];

  const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  const byId = (id) => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const safe = (value, max = 500) => String(value ?? '').trim().slice(0, max);
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, num(value)));
  const clamp5 = (value, fallback = 3) => Math.min(5, Math.max(1, num(value, fallback)));
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const isoDate = (value) => {
    const text = safe(value, 32);
    if (!text) return '';
    const time = Date.parse(text);
    return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : '';
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char]);

  function read(key, fallback = []) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeTopic(value) {
    return safe(value, 140)
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function daysBetween(from, to = today()) {
    const a = Date.parse(from);
    const b = Date.parse(to);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.max(0, Math.floor((b - a) / 86400000));
  }

  function addDays(date, days) {
    const time = Date.parse(date);
    if (!Number.isFinite(time)) return '';
    return new Date(time + Math.max(1, num(days, 30)) * 86400000).toISOString().slice(0, 10);
  }

  function normalizeSignal(raw = {}) {
    const sourceType = SOURCES[raw.sourceType] ? raw.sourceType : 'other';
    const observedAt = isoDate(raw.observedAt) || today();
    const validDays = Math.min(365, Math.max(1, Math.round(num(raw.validDays, 30))));
    return {
      id: safe(raw.id, 120) || `trend-${uid()}`,
      topic: safe(raw.topic, 140) || 'Oportunidade sem nome',
      topicKey: normalizeTopic(raw.topic || 'Oportunidade sem nome'),
      category: CATEGORIES[raw.category] ? raw.category : 'outros',
      sourceType,
      sourceName: safe(raw.sourceName, 120) || SOURCES[sourceType].label,
      sourceUrl: safe(raw.sourceUrl, 600),
      geography: safe(raw.geography, 80) || 'Brasil',
      period: safe(raw.period, 100),
      observedAt,
      validDays,
      expiresAt: addDays(observedAt, validDays),
      growth: clamp5(raw.growth),
      demand: clamp5(raw.demand),
      competition: clamp5(raw.competition),
      margin: clamp5(raw.margin),
      risk: clamp5(raw.risk),
      confidence: clamp5(raw.confidence),
      evidence: safe(raw.evidence, 1200),
      notes: safe(raw.notes, 1200),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function freshness(signal, referenceDate = today()) {
    const item = normalizeSignal(signal);
    const ageDays = daysBetween(item.observedAt, referenceDate);
    const remaining = item.validDays - ageDays;
    const factor = clamp(remaining / item.validDays, 0, 1);
    return {
      ageDays,
      remainingDays: remaining,
      factor,
      score: 1 + factor * 4,
      expired: remaining < 0,
      label: remaining < 0 ? 'Vencido' : remaining <= 7 ? 'Expira em breve' : 'Válido',
    };
  }

  function signalScore(raw, referenceDate = today()) {
    const signal = normalizeSignal(raw);
    const fresh = freshness(signal, referenceDate);
    const sourceQuality = SOURCES[signal.sourceType]?.quality || 2;
    const to100 = (value) => ((clamp5(value) - 1) / 4) * 100;
    const score =
      to100(signal.growth) * 0.20 +
      to100(signal.demand) * 0.18 +
      to100(signal.margin) * 0.18 +
      to100(6 - signal.competition) * 0.14 +
      to100(6 - signal.risk) * 0.12 +
      to100(signal.confidence) * 0.08 +
      to100(fresh.score) * 0.06 +
      to100(sourceQuality) * 0.04;
    return { signal, fresh, sourceQuality, score: Math.round(clamp(score)) };
  }

  function aggregateSignals(rawSignals = [], referenceDate = today()) {
    const groups = new Map();
    for (const raw of rawSignals) {
      const scored = signalScore(raw, referenceDate);
      const key = scored.signal.topicKey || scored.signal.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(scored);
    }

    return [...groups.entries()].map(([topicKey, rows]) => {
      const active = rows.filter((row) => !row.fresh.expired);
      const usable = active.length ? active : rows;
      const totalWeight = usable.reduce((sum, row) => {
        const freshnessWeight = Math.max(0.1, row.fresh.factor);
        return sum + row.signal.confidence * row.sourceQuality * freshnessWeight;
      }, 0) || 1;
      const avg = (field) => usable.reduce((sum, row) => {
        const weight = row.signal.confidence * row.sourceQuality * Math.max(0.1, row.fresh.factor);
        return sum + row.signal[field] * weight;
      }, 0) / totalWeight;
      const weightedScore = usable.reduce((sum, row) => {
        const weight = row.signal.confidence * row.sourceQuality * Math.max(0.1, row.fresh.factor);
        return sum + row.score * weight;
      }, 0) / totalWeight;
      const sourceTypes = new Set(usable.map((row) => row.signal.sourceType));
      const sources = new Set(usable.map((row) => `${row.signal.sourceType}:${row.signal.sourceName}`));
      const growthValues = usable.map((row) => row.signal.growth);
      const demandValues = usable.map((row) => row.signal.demand);
      const contradiction =
        (Math.max(...growthValues) - Math.min(...growthValues) >= 3) ||
        (Math.max(...demandValues) - Math.min(...demandValues) >= 3);
      const diversityBonus = Math.min(5, Math.max(0, sourceTypes.size - 1) * 2.5);
      const contradictionPenalty = contradiction ? 8 : 0;
      const score = Math.round(clamp(weightedScore + diversityBonus - contradictionPenalty));
      const freshest = [...usable].sort((a, b) => b.signal.observedAt.localeCompare(a.signal.observedAt))[0];
      const allExpired = active.length === 0;
      let status = 'Fraco';
      if (allExpired) status = 'Vencido';
      else if (score >= 82 && sources.size >= 2) status = 'Em alta';
      else if (score >= 68) status = 'Promissor';
      else if (score >= 52) status = 'Monitorar';
      return {
        topicKey,
        topic: freshest.signal.topic,
        category: freshest.signal.category,
        score,
        status,
        signals: rows.length,
        activeSignals: active.length,
        sources: sources.size,
        sourceTypes: sourceTypes.size,
        contradiction,
        allExpired,
        freshestAt: freshest.signal.observedAt,
        growth: avg('growth'),
        demand: avg('demand'),
        competition: avg('competition'),
        margin: avg('margin'),
        risk: avg('risk'),
        confidence: avg('confidence'),
        rows,
      };
    }).sort((a, b) => Number(a.allExpired) - Number(b.allExpired) || b.score - a.score || b.activeSignals - a.activeSignals);
  }

  function suggestedChannel(aggregate) {
    const types = new Set(aggregate.rows.map((row) => row.signal.sourceType));
    if (types.has('social')) return 'TikTok Shop';
    if (types.has('marketplace')) return 'Mercado Livre';
    if (aggregate.category === 'negocios') return 'Instagram + WhatsApp';
    return 'Shopee';
  }

  function aggregateToOpportunity(aggregate) {
    const marginPercent = Math.round(20 + ((aggregate.margin - 1) / 4) * 50);
    return {
      id: `trend-opportunity-${aggregate.topicKey.replace(/\s+/g, '-')}-${Date.now()}`,
      custom: true,
      trendSource: true,
      name: aggregate.topic,
      category: aggregate.category,
      problem: `Validar se o sinal de demanda para ${aggregate.topic} representa uma oportunidade comercial real e sustentável.`,
      capital: 0,
      ticket: 79.9,
      margin: marginPercent,
      model: 'afiliado',
      channel: suggestedChannel(aggregate),
      test: `Executar um teste de 7 dias em ${suggestedChannel(aggregate)} e confirmar cliques, pedidos, margem e repetição do sinal.`,
      demand: Math.round(aggregate.demand),
      visual: 4,
      recurrence: 3,
      different: 3,
      competition: Math.round(aggregate.competition),
      risk: Math.round(aggregate.risk),
      score: aggregate.score,
      created: new Date().toISOString(),
      trendMetadata: {
        signals: aggregate.signals,
        sources: aggregate.sources,
        freshestAt: aggregate.freshestAt,
        status: aggregate.status,
      },
    };
  }

  function aggregateToTest(aggregate) {
    return {
      id: `trend-test-${uid()}`,
      product: aggregate.topic,
      channel: suggestedChannel(aggregate),
      stage: 'research',
      investment: 0,
      revenue: 0,
      views: 0,
      clicks: 0,
      orders: 0,
      notes: `Teste criado pelo Radar de tendências. Score ${aggregate.score}/100, ${aggregate.activeSignals} sinal(is) ativo(s), ${aggregate.sources} fonte(s).`,
      createdAt: new Date().toISOString(),
    };
  }

  function parseDelimited(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return [];
    const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
    const parseLine = (line) => {
      const cells = [];
      let current = '';
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
          else quoted = !quoted;
        } else if (char === delimiter && !quoted) {
          cells.push(current.trim()); current = '';
        } else current += char;
      }
      cells.push(current.trim());
      return cells;
    };
    const headers = parseLine(lines[0]).map((item) => normalizeTopic(item).replace(/\s+/g, '_'));
    return lines.slice(1).map((line) => {
      const values = parseLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
  }

  function importSignals(text) {
    const rows = parseDelimited(text);
    const pick = (row, keys) => {
      for (const key of keys) if (row[key] !== undefined && row[key] !== '') return row[key];
      return '';
    };
    return rows.map((row) => normalizeSignal({
      topic: pick(row, ['topico', 'produto', 'oportunidade', 'topic', 'product']),
      category: pick(row, ['categoria', 'category']) || 'outros',
      sourceType: pick(row, ['tipo_fonte', 'source_type']) || 'other',
      sourceName: pick(row, ['fonte', 'nome_fonte', 'source', 'source_name']),
      sourceUrl: pick(row, ['url', 'link', 'source_url']),
      geography: pick(row, ['geografia', 'regiao', 'geography']) || 'Brasil',
      period: pick(row, ['periodo', 'period']),
      observedAt: pick(row, ['observado_em', 'data', 'observed_at']) || today(),
      validDays: pick(row, ['validade_dias', 'valid_days']) || 30,
      growth: pick(row, ['crescimento', 'growth']) || 3,
      demand: pick(row, ['demanda', 'demand']) || 3,
      competition: pick(row, ['concorrencia', 'competition']) || 3,
      margin: pick(row, ['margem', 'margin']) || 3,
      risk: pick(row, ['risco', 'risk']) || 3,
      confidence: pick(row, ['confianca', 'confidence']) || 3,
      evidence: pick(row, ['evidencia', 'evidence']),
      notes: pick(row, ['observacoes', 'notes']),
    })).filter((item) => item.topic && item.topic !== 'Oportunidade sem nome');
  }

  function signals() {
    return read(KEYS.signals, []).map(normalizeSignal);
  }

  function settings() {
    return { showExpired: false, ...read(KEYS.trendSettings, {}) };
  }

  function saveSignals(rows) {
    write(KEYS.signals, rows.map(normalizeSignal));
  }

  function toast(message, error = false) {
    let node = byId('trendToast');
    if (!node && typeof document !== 'undefined') {
      node = document.createElement('div');
      node.id = 'trendToast';
      document.body.append(node);
    }
    if (!node) return;
    node.className = `v021Toast show${error ? ' error' : ''}`;
    node.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function filteredAggregates() {
    const query = normalizeTopic(byId('trendSearch')?.value || '');
    const category = byId('trendCategory')?.value || 'all';
    const source = byId('trendSourceFilter')?.value || 'all';
    const status = byId('trendStatusFilter')?.value || 'all';
    const showExpired = Boolean(byId('trendShowExpired')?.checked);
    const rows = signals().filter((signal) => {
      if (query && !normalizeTopic(`${signal.topic} ${signal.sourceName} ${signal.evidence}`).includes(query)) return false;
      if (category !== 'all' && signal.category !== category) return false;
      if (source !== 'all' && signal.sourceType !== source) return false;
      return true;
    });
    return aggregateSignals(rows).filter((item) => {
      if (!showExpired && item.allExpired) return false;
      if (status !== 'all' && item.status !== status) return false;
      return true;
    });
  }

  function renderSummary() {
    const container = byId('trendSummary');
    if (!container) return;
    const raw = signals();
    const aggregates = aggregateSignals(raw);
    const active = raw.filter((item) => !freshness(item).expired);
    const promising = aggregates.filter((item) => ['Em alta', 'Promissor'].includes(item.status));
    const stale = raw.length - active.length;
    const contradicted = aggregates.filter((item) => item.contradiction).length;
    container.innerHTML = [
      ['Sinais ativos', active.length, `${raw.length} cadastrados`],
      ['Oportunidades fortes', promising.length, 'score e fontes confirmadas'],
      ['Sinais vencidos', stale, 'precisam de atualização'],
      ['Contradições', contradicted, 'exigem revisão manual'],
    ].map(([label, value, note]) => `<article class="card trendMetric"><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join('');
    const count = byId('trendNavCount');
    if (count) count.textContent = promising.length ? String(promising.length) : '';
  }

  function renderRadar() {
    const container = byId('trendGrid');
    if (!container) return;
    const aggregates = filteredAggregates();
    if (!aggregates.length) {
      container.innerHTML = '<div class="card empty"><h3>Nenhum sinal encontrado</h3><p class="muted">Cadastre fontes ou ajuste os filtros.</p></div>';
      return;
    }
    container.innerHTML = aggregates.map((item) => {
      const statusClass = item.status === 'Em alta' ? 'hot' : item.status === 'Promissor' ? 'good' : item.status === 'Vencido' ? 'expired' : 'watch';
      return `<article class="card trendCard ${statusClass}">
        <div class="trendCardHead"><div><span class="trendStatus">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.topic)}</h3><p>${escapeHtml(CATEGORIES[item.category] || item.category)} · observado em ${escapeHtml(item.freshestAt)}</p></div><div class="trendScore"><b>${item.score}</b><small>/100</small></div></div>
        <div class="trendBars">
          ${[['Crescimento', item.growth], ['Demanda', item.demand], ['Margem', item.margin], ['Concorrência', 6 - item.competition], ['Segurança', 6 - item.risk]].map(([label, value]) => `<div><span>${label}</span><i><em style="width:${(value / 5) * 100}%"></em></i><b>${NUMBER.format(value)}</b></div>`).join('')}
        </div>
        <div class="trendFacts"><span>${item.activeSignals}/${item.signals} sinais ativos</span><span>${item.sources} fontes</span>${item.contradiction ? '<span class="warningText">Sinais contraditórios</span>' : ''}</div>
        <details><summary>Ver evidências</summary><div class="trendEvidence">${item.rows.map(({ signal, fresh, score }) => `<div><b>${escapeHtml(signal.sourceName)}</b><span>${escapeHtml(signal.observedAt)} · ${fresh.label} · ${score}/100</span><p>${escapeHtml(signal.evidence || signal.notes || 'Sem evidência descritiva.')}</p>${signal.sourceUrl ? `<a href="${escapeHtml(signal.sourceUrl)}" target="_blank" rel="noopener noreferrer">Abrir fonte</a>` : ''}<button class="btn small" data-edit-trend="${escapeHtml(signal.id)}">Editar</button></div>`).join('')}</div></details>
        <div class="actions"><button class="btn primary" data-trend-opportunity="${escapeHtml(item.topicKey)}">Criar oportunidade</button><button class="btn" data-trend-test="${escapeHtml(item.topicKey)}">Criar teste</button></div>
      </article>`;
    }).join('');

    container.querySelectorAll('[data-edit-trend]').forEach((button) => {
      button.onclick = () => openSignal(signals().find((item) => item.id === button.dataset.editTrend));
    });
    container.querySelectorAll('[data-trend-opportunity]').forEach((button) => {
      button.onclick = () => createOpportunity(button.dataset.trendOpportunity);
    });
    container.querySelectorAll('[data-trend-test]').forEach((button) => {
      button.onclick = () => createTest(button.dataset.trendTest);
    });
  }

  function renderSources() {
    const container = byId('trendSources');
    if (!container) return;
    const rows = [...signals()].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    if (!rows.length) {
      container.innerHTML = '<div class="empty compact"><p class="muted">Nenhuma fonte cadastrada.</p></div>';
      return;
    }
    container.innerHTML = rows.slice(0, 30).map((signal) => {
      const fresh = freshness(signal);
      return `<article class="trendSourceRow ${fresh.expired ? 'expired' : ''}"><div><b>${escapeHtml(signal.topic)}</b><span>${escapeHtml(signal.sourceName)} · ${escapeHtml(SOURCES[signal.sourceType].label)}</span></div><div><strong>${signalScore(signal).score}/100</strong><small>${fresh.label}</small></div><button class="btn small" data-edit-source="${escapeHtml(signal.id)}">Editar</button></article>`;
    }).join('');
    container.querySelectorAll('[data-edit-source]').forEach((button) => {
      button.onclick = () => openSignal(signals().find((item) => item.id === button.dataset.editSource));
    });
  }

  function renderAll() {
    renderSummary();
    renderRadar();
    renderSources();
  }

  function openSignal(raw = null) {
    const signal = normalizeSignal(raw || {});
    byId('trendModalTitle').textContent = raw ? 'Editar sinal' : 'Novo sinal';
    byId('trendSignalId').value = raw ? signal.id : '';
    byId('trendTopic').value = raw ? signal.topic : '';
    byId('trendSignalCategory').value = signal.category;
    byId('trendSourceType').value = signal.sourceType;
    byId('trendSourceName').value = raw ? signal.sourceName : '';
    byId('trendSourceUrl').value = signal.sourceUrl;
    byId('trendGeography').value = signal.geography;
    byId('trendPeriod').value = signal.period;
    byId('trendObservedAt').value = signal.observedAt;
    byId('trendValidDays').value = signal.validDays;
    for (const field of ['growth', 'demand', 'competition', 'margin', 'risk', 'confidence']) {
      byId(`trend-${field}`).value = signal[field];
      byId(`trend-${field}-out`).value = signal[field];
    }
    byId('trendEvidence').value = signal.evidence;
    byId('trendNotes').value = signal.notes;
    byId('trendDelete').classList.toggle('hide', !raw);
    byId('trendModal').classList.add('open');
  }

  function saveSignal(event) {
    event.preventDefault();
    const id = byId('trendSignalId').value;
    const existing = signals().find((item) => item.id === id);
    const signal = normalizeSignal({
      ...existing,
      id: id || undefined,
      topic: byId('trendTopic').value,
      category: byId('trendSignalCategory').value,
      sourceType: byId('trendSourceType').value,
      sourceName: byId('trendSourceName').value,
      sourceUrl: byId('trendSourceUrl').value,
      geography: byId('trendGeography').value,
      period: byId('trendPeriod').value,
      observedAt: byId('trendObservedAt').value,
      validDays: byId('trendValidDays').value,
      growth: byId('trend-growth').value,
      demand: byId('trend-demand').value,
      competition: byId('trend-competition').value,
      margin: byId('trend-margin').value,
      risk: byId('trend-risk').value,
      confidence: byId('trend-confidence').value,
      evidence: byId('trendEvidence').value,
      notes: byId('trendNotes').value,
    });
    saveSignals([signal, ...signals().filter((item) => item.id !== signal.id)]);
    byId('trendModal').classList.remove('open');
    renderAll();
    toast('Sinal salvo no radar.');
  }

  function deleteSignal() {
    const id = byId('trendSignalId').value;
    if (!id || !confirm('Excluir este sinal e sua referência?')) return;
    saveSignals(signals().filter((item) => item.id !== id));
    byId('trendModal').classList.remove('open');
    renderAll();
    toast('Sinal excluído.');
  }

  function findAggregate(topicKey) {
    return aggregateSignals(signals()).find((item) => item.topicKey === topicKey);
  }

  function mergeById(first, second) {
    return [...new Map([...first, ...second].map((item) => [item.id, item])).values()];
  }

  function createOpportunity(topicKey) {
    const aggregate = findAggregate(topicKey);
    if (!aggregate) return;
    const rows = read(KEYS.custom, []);
    const duplicate = rows.some((item) => normalizeTopic(item.name) === aggregate.topicKey);
    if (duplicate && !confirm('Já existe uma oportunidade com esse nome. Criar outra mesmo assim?')) return;
    write(KEYS.custom, [aggregateToOpportunity(aggregate), ...rows]);
    toast('Oportunidade criada no radar principal.');
  }

  function createTest(topicKey) {
    const aggregate = findAggregate(topicKey);
    if (!aggregate) return;
    const rows = read(KEYS.tests, []);
    write(KEYS.tests, [aggregateToTest(aggregate), ...rows]);
    toast('Teste criado no funil de experimentos.');
  }

  function exportSignals() {
    const header = ['topico', 'categoria', 'tipo_fonte', 'fonte', 'url', 'geografia', 'periodo', 'observado_em', 'validade_dias', 'crescimento', 'demanda', 'concorrencia', 'margem', 'risco', 'confianca', 'evidencia', 'observacoes'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = signals().map((item) => [item.topic, item.category, item.sourceType, item.sourceName, item.sourceUrl, item.geography, item.period, item.observedAt, item.validDays, item.growth, item.demand, item.competition, item.margin, item.risk, item.confidence, item.evidence, item.notes]);
    download(`commerce-radar-tendencias-${today()}.csv`, [header, ...rows].map((row) => row.map(quote).join(';')).join('\n'), 'text/csv;charset=utf-8');
  }

  function downloadTemplate() {
    const csv = 'topico;categoria;tipo_fonte;fonte;url;geografia;periodo;observado_em;validade_dias;crescimento;demanda;concorrencia;margem;risco;confianca;evidencia;observacoes\nOrganizador de cabos;tecnologia;search;Busca e interesse;;Brasil;últimos 30 dias;2026-07-26;30;4;4;4;3;2;4;Interesse crescente e busca recorrente;Validar com outra fonte';
    download('modelo-tendencias-commerce-radar.csv', csv, 'text/csv;charset=utf-8');
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file) {
    if (!file) return;
    try {
      const imported = importSignals(await file.text());
      if (!imported.length) return toast('Nenhum sinal válido foi encontrado.', true);
      saveSignals(mergeById(signals(), imported));
      renderAll();
      toast(`${imported.length} sinal(is) importado(s).`);
    } catch {
      toast('Não foi possível importar o arquivo.', true);
    } finally {
      byId('trendImportFile').value = '';
    }
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      keys.trendSignals = KEYS.signals;
      keys.trendSettings = KEYS.trendSettings;
      return true;
    };
    if (apply()) return;
    ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, { once: true });
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { signals: [], settings: {} };
    const timer = setInterval(() => {
      attempts += 1;
      const backup = byId('backup');
      const input = byId('restoreFile');
      const merge = byId('mergeRestore');
      const replace = byId('replaceRestore');
      if (!backup || !input || !merge || !replace) {
        if (attempts > 160) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      backup.onclick = () => {
        const payload = {
          version: '0.5.0',
          exportedAt: new Date().toISOString(),
          signature: 'Tehkné Solutions',
          analyses: read(KEYS.analyses, []),
          tests: read(KEYS.tests, []),
          customOpportunities: read(KEYS.custom, []),
          launchPlans: read('tehkne-commerce-radar-v2-launch-plans', []),
          importBatches: read('tehkne-commerce-radar-v4-imports', []),
          financialAudits: read('tehkne-commerce-radar-v42-financial-audits', []),
          financialProfiles: read('tehkne-commerce-radar-v42-financial-profiles', []),
          reconciliationBatches: read('tehkne-commerce-radar-v43-reconciliation-batches', []),
          payoutControls: read('tehkne-commerce-radar-v44-payout-controls', []),
          periodClosings: read('tehkne-commerce-radar-v44-period-closings', []),
          financialPlans: read('tehkne-commerce-radar-v45-financial-plans', []),
          trendSignals: signals(),
          trendSettings: settings(),
        };
        download(`commerce-radar-backup-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json');
      };
      input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const payload = JSON.parse(await file.text());
          pending = {
            signals: Array.isArray(payload.trendSignals) ? payload.trendSignals.map(normalizeSignal) : [],
            settings: payload.trendSettings && typeof payload.trendSettings === 'object' ? payload.trendSettings : {},
          };
        } catch {
          pending = { signals: [], settings: {} };
        }
      }, { capture: true });
      merge.addEventListener('click', () => {
        saveSignals(mergeById(signals(), pending.signals));
        write(KEYS.trendSettings, { ...settings(), ...pending.settings });
        renderAll();
      });
      replace.addEventListener('click', () => {
        saveSignals(pending.signals);
        write(KEYS.trendSettings, pending.settings);
        renderAll();
      });
    }, 50);
  }

  function fillSelects() {
    byId('trendCategory').innerHTML = '<option value="all">Todas as categorias</option>' + Object.entries(CATEGORIES).map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');
    byId('trendSignalCategory').innerHTML = Object.entries(CATEGORIES).map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join('');
    byId('trendSourceFilter').innerHTML = '<option value="all">Todas as fontes</option>' + Object.entries(SOURCES).map(([key, value]) => `<option value="${key}">${escapeHtml(value.label)}</option>`).join('');
    byId('trendSourceType').innerHTML = Object.entries(SOURCES).map(([key, value]) => `<option value="${key}">${escapeHtml(value.label)}</option>`).join('');
  }

  function showView() {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('on', view.id === 'trendRadar'));
    document.querySelectorAll('.nav').forEach((item) => item.classList.toggle('on', item.id === 'trendNav'));
    const title = byId('title');
    if (title) title.textContent = 'Encontre sinais antes de escolher o produto';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const method = nav?.querySelector('[data-view="method"]');
    const methodView = byId('method');
    if (!nav || !method || !methodView || byId('trendNav')) return false;

    method.insertAdjacentHTML('beforebegin', '<button class="nav" id="trendNav"><span>Radar de tendências</span><b id="trendNavCount"></b></button>');
    methodView.insertAdjacentHTML('beforebegin', `<section class="view" id="trendRadar">
      <div class="sectionHead"><div><span class="eyebrow">INTELIGÊNCIA DE OPORTUNIDADES</span><h2>Radar de tendências</h2><p class="muted">Registre sinais com fonte, validade e confiança. O sistema cruza evidências e reduz o peso de dados vencidos.</p></div><div class="actions"><button class="btn" id="trendTemplate">Baixar modelo</button><button class="btn" id="trendImport">Importar CSV</button><button class="btn primary" id="trendNew">Novo sinal</button></div></div>
      <div class="trendSummary" id="trendSummary"></div>
      <div class="card trendFilters"><label class="field wide"><span>Buscar</span><input id="trendSearch" placeholder="Produto, fonte ou evidência"></label><label class="field"><span>Categoria</span><select id="trendCategory"></select></label><label class="field"><span>Fonte</span><select id="trendSourceFilter"></select></label><label class="field"><span>Status</span><select id="trendStatusFilter"><option value="all">Todos</option><option>Em alta</option><option>Promissor</option><option>Monitorar</option><option>Fraco</option><option>Vencido</option></select></label><label class="check trendCheck"><input id="trendShowExpired" type="checkbox"><span>Mostrar vencidos</span></label><button class="btn" id="trendExport">Exportar sinais</button></div>
      <div class="trendLayout"><div><div class="trendGrid" id="trendGrid"></div></div><aside><article class="card"><div class="sectionHead"><div><span class="eyebrow">FONTES</span><h3>Atualizações recentes</h3></div></div><div id="trendSources"></div></article><article class="card"><span class="eyebrow">MÉTODO</span><h3>Como interpretar</h3><ul class="trendMethod"><li>Confirme com fontes diferentes.</li><li>Revise sinais antes do vencimento.</li><li>Não confunda interesse com venda.</li><li>Valide margem e operação em teste pequeno.</li></ul></article></aside></div>
      <input id="trendImportFile" type="file" accept=".csv,.txt,text/csv,text/plain" hidden>
    </section>`);

    document.body.insertAdjacentHTML('beforeend', `<div class="modal" id="trendModal"><div class="card modalBox wideModal"><div class="modalHead"><div><span class="eyebrow">SINAL DE MERCADO</span><h2 id="trendModalTitle">Novo sinal</h2></div><button class="btn small" id="trendModalClose" type="button">Fechar</button></div><form id="trendForm"><input id="trendSignalId" type="hidden"><div class="grid"><label class="field wide"><span>Produto ou tema</span><input id="trendTopic" required maxlength="140"></label><label class="field"><span>Categoria</span><select id="trendSignalCategory"></select></label><label class="field"><span>Tipo de fonte</span><select id="trendSourceType"></select></label><label class="field"><span>Nome da fonte</span><input id="trendSourceName" required maxlength="120"></label><label class="field wide"><span>URL da evidência</span><input id="trendSourceUrl" type="url" maxlength="600" placeholder="https://..."></label><label class="field"><span>Geografia</span><input id="trendGeography" maxlength="80" value="Brasil"></label><label class="field"><span>Período analisado</span><input id="trendPeriod" maxlength="100" placeholder="últimos 30 dias"></label><label class="field"><span>Observado em</span><input id="trendObservedAt" type="date" required></label><label class="field"><span>Validade em dias</span><input id="trendValidDays" type="number" min="1" max="365" value="30"></label>${[['growth','Crescimento'],['demand','Demanda'],['competition','Concorrência'],['margin','Margem potencial'],['risk','Risco'],['confidence','Confiança']].map(([key,label]) => `<label class="field"><span class="rangeHead"><span>${label}</span><output id="trend-${key}-out">3</output></span><input id="trend-${key}" type="range" min="1" max="5" value="3"></label>`).join('')}<label class="field wide"><span>Evidência observada</span><textarea id="trendEvidence" rows="4" maxlength="1200" required placeholder="Explique o que mudou, qual número ou comportamento sustenta o sinal."></textarea></label><label class="field wide"><span>Observações</span><textarea id="trendNotes" rows="3" maxlength="1200"></textarea></label></div><div class="formFooter"><button class="btn danger hide" id="trendDelete" type="button">Excluir</button><button class="btn primary" type="submit">Salvar sinal</button></div></form></div></div><div id="trendToast" class="v021Toast"></div>`);

    fillSelects();
    byId('trendNav').onclick = showView;
    byId('trendNew').onclick = () => openSignal();
    byId('trendModalClose').onclick = () => byId('trendModal').classList.remove('open');
    byId('trendForm').addEventListener('submit', saveSignal);
    byId('trendDelete').onclick = deleteSignal;
    byId('trendImport').onclick = () => byId('trendImportFile').click();
    byId('trendImportFile').addEventListener('change', (event) => handleImport(event.target.files?.[0]));
    byId('trendTemplate').onclick = downloadTemplate;
    byId('trendExport').onclick = exportSignals;
    for (const id of ['trendSearch', 'trendCategory', 'trendSourceFilter', 'trendStatusFilter', 'trendShowExpired']) {
      byId(id).addEventListener(id === 'trendSearch' ? 'input' : 'change', renderAll);
    }
    for (const field of ['growth', 'demand', 'competition', 'margin', 'risk', 'confidence']) {
      byId(`trend-${field}`).addEventListener('input', (event) => { byId(`trend-${field}-out`).value = event.target.value; });
    }
    byId('trendObservedAt').value = today();
    renderAll();
    extendCloud();
    enhanceBackup();
    return true;
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 180) clearInterval(timer);
    }, 50);
  }

  ROOT.CommerceRadarTrends = {
    SOURCES,
    normalizeSignal,
    freshness,
    signalScore,
    aggregateSignals,
    aggregateToOpportunity,
    aggregateToTest,
    parseDelimited,
    importSignals,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})();