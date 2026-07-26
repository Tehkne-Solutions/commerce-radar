(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const KEYS = {
    audits: 'tehkne-commerce-radar-v42-financial-audits',
    profiles: 'tehkne-commerce-radar-v42-financial-profiles',
    imports: 'tehkne-commerce-radar-v4-imports',
    tests: 'tehkne-commerce-radar-v2-tests',
    analyses: 'tehkne-commerce-radar-v2-analyses',
    custom: 'tehkne-commerce-radar-v2-custom-opportunities',
    launch: 'tehkne-commerce-radar-v2-launch-plans',
  };
  const CHANNELS = [
    'Mercado Livre',
    'Shopee',
    'TikTok Shop',
    'Instagram + WhatsApp',
    'Loja própria',
    'Outro canal',
  ];
  const QUALITY_NAMES = {
    real: 'Dados reais',
    partial: 'Dados parciais',
    estimated: 'Estimado',
    incomplete: 'Incompleto',
  };
  const STATUS_NAMES = {
    profit: 'Lucrativo',
    attention: 'Atenção',
    loss: 'Prejuízo',
  };

  const BRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const NUMBER = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  });

  const byId = (id) =>
    typeof document !== 'undefined' ? document.getElementById(id) : null;
  const safe = (value, max = 500) =>
    String(value ?? '').trim().slice(0, max);
  const number = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;
  const money = (value) => Math.max(0, number(value));
  const clamp = (value, min = 0, max = 100) =>
    Math.max(min, Math.min(max, number(value)));
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const escapeHtml = (value) =>
    String(value ?? '').replace(
      /[&<>"]/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
        })[char],
    );

  function read(key, fallback = []) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || JSON.stringify(fallback),
      );
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeProfile(raw = {}) {
    return {
      id: safe(raw.id, 120) || uid(),
      name: safe(raw.name, 100) || 'Perfil sem nome',
      channel: CHANNELS.includes(raw.channel)
        ? raw.channel
        : 'Outro canal',
      marketplaceFeePct: clamp(raw.marketplaceFeePct, 0, 80),
      paymentFeePct: clamp(raw.paymentFeePct, 0, 30),
      taxPct: clamp(raw.taxPct, 0, 50),
      shippingPerOrder: money(raw.shippingPerOrder),
      packagingPerOrder: money(raw.packagingPerOrder),
      otherPerOrder: money(raw.otherPerOrder),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeAudit(raw = {}) {
    return {
      id: safe(raw.id, 120) || uid(),
      product: safe(raw.product, 120) || 'Produto sem nome',
      sku: safe(raw.sku, 100),
      channel: CHANNELS.includes(raw.channel)
        ? raw.channel
        : 'Outro canal',
      periodStart: safe(raw.periodStart, 10),
      periodEnd: safe(raw.periodEnd, 10),
      quality: ['real', 'partial', 'estimated', 'incomplete'].includes(
        raw.quality,
      )
        ? raw.quality
        : 'incomplete',
      profileId: safe(raw.profileId, 120),
      orders: money(raw.orders),
      units: money(raw.units),
      grossRevenue: money(raw.grossRevenue),
      discounts: money(raw.discounts),
      refunds: money(raw.refunds),
      productCost: money(raw.productCost),
      marketplaceFees: money(raw.marketplaceFees),
      paymentFees: money(raw.paymentFees),
      shippingCost: money(raw.shippingCost),
      shippingSubsidy: money(raw.shippingSubsidy),
      taxes: money(raw.taxes),
      advertising: money(raw.advertising),
      packaging: money(raw.packaging),
      otherCosts: money(raw.otherCosts),
      sourceType: safe(raw.sourceType, 40),
      sourceId: safe(raw.sourceId, 160),
      notes: safe(raw.notes, 1500),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function expectedFromProfile(audit, profile) {
    if (!profile) return null;
    const orders = Math.max(0, audit.orders);
    return {
      marketplaceFees:
        (audit.grossRevenue * profile.marketplaceFeePct) / 100,
      paymentFees: (audit.grossRevenue * profile.paymentFeePct) / 100,
      taxes: (audit.grossRevenue * profile.taxPct) / 100,
      shippingCost: orders * profile.shippingPerOrder,
      packaging: orders * profile.packagingPerOrder,
      otherCosts: orders * profile.otherPerOrder,
    };
  }

  function reconcile(actual, expected) {
    if (!expected) return { items: [], totalVariance: 0 };
    const labels = {
      marketplaceFees: 'Taxa do canal',
      paymentFees: 'Pagamento',
      taxes: 'Impostos',
      shippingCost: 'Frete',
      packaging: 'Embalagem',
      otherCosts: 'Outros',
    };
    const items = Object.keys(labels).map((key) => {
      const observed = money(actual[key]);
      const planned = money(expected[key]);
      const variance = observed - planned;
      const limit = Math.max(5, planned * 0.1);
      return {
        key,
        label: labels[key],
        observed,
        planned,
        variance,
        alert: Math.abs(variance) > limit,
      };
    });
    return {
      items,
      totalVariance: items.reduce((sum, item) => sum + item.variance, 0),
    };
  }

  function computeAudit(input, profile = null) {
    const audit = normalizeAudit(input);
    const netSales = Math.max(
      0,
      audit.grossRevenue - audit.discounts - audit.refunds,
    );
    const netShipping = Math.max(
      0,
      audit.shippingCost - audit.shippingSubsidy,
    );
    const nonAdCosts =
      audit.productCost +
      audit.marketplaceFees +
      audit.paymentFees +
      netShipping +
      audit.taxes +
      audit.packaging +
      audit.otherCosts;
    const totalCosts = nonAdCosts + audit.advertising;
    const contributionBeforeAds = netSales - nonAdCosts;
    const netProfit = netSales - totalCosts;
    const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
    const contributionMargin =
      netSales > 0 ? (contributionBeforeAds / netSales) * 100 : 0;
    const orders = Math.max(0, audit.orders);
    const profitPerOrder = orders > 0 ? netProfit / orders : 0;
    const contributionPerOrder =
      orders > 0 ? contributionBeforeAds / orders : 0;
    const cac = orders > 0 ? audit.advertising / orders : 0;
    const roas =
      audit.advertising > 0
        ? audit.grossRevenue / audit.advertising
        : 0;
    const breakEvenRoas =
      contributionBeforeAds > 0 ? netSales / contributionBeforeAds : 0;
    const refundRate =
      audit.grossRevenue > 0
        ? (audit.refunds / audit.grossRevenue) * 100
        : 0;
    const feeRate =
      audit.grossRevenue > 0
        ? ((audit.marketplaceFees + audit.paymentFees) /
            audit.grossRevenue) *
          100
        : 0;
    const shippingRate =
      audit.grossRevenue > 0
        ? (netShipping / audit.grossRevenue) * 100
        : 0;
    const taxRate =
      audit.grossRevenue > 0
        ? (audit.taxes / audit.grossRevenue) * 100
        : 0;
    const adsRate =
      audit.grossRevenue > 0
        ? (audit.advertising / audit.grossRevenue) * 100
        : 0;
    const costRate =
      audit.grossRevenue > 0
        ? (audit.productCost / audit.grossRevenue) * 100
        : 0;
    const status =
      netProfit < 0 ? 'loss' : netMargin < 10 ? 'attention' : 'profit';
    const expected = expectedFromProfile(audit, profile);
    const reconciliation = reconcile(audit, expected);

    return {
      audit,
      netSales,
      netShipping,
      nonAdCosts,
      totalCosts,
      contributionBeforeAds,
      netProfit,
      netMargin,
      contributionMargin,
      profitPerOrder,
      contributionPerOrder,
      cac,
      roas,
      breakEvenRoas,
      refundRate,
      feeRate,
      shippingRate,
      taxRate,
      adsRate,
      costRate,
      status,
      expected,
      reconciliation,
    };
  }

  function auditFlags(result) {
    const audit = result.audit;
    const flags = [];

    if (audit.grossRevenue <= 0) {
      flags.push({
        level: 'danger',
        text: 'Receita não informada; não é possível validar lucro.',
      });
    }
    if (audit.productCost <= 0) {
      flags.push({
        level: 'warning',
        text: 'Custo do produto ausente ou zerado.',
      });
    }
    if (audit.orders <= 0) {
      flags.push({
        level: 'warning',
        text: 'Pedidos ausentes; indicadores por pedido ficam indisponíveis.',
      });
    }
    if (result.netProfit < 0) {
      flags.push({
        level: 'danger',
        text: `A operação perdeu ${BRL.format(
          Math.abs(result.netProfit),
        )} no período.`,
      });
    }
    if (result.feeRate > 25) {
      flags.push({
        level: 'warning',
        text: `Taxas representam ${result.feeRate.toFixed(
          1,
        )}% da receita bruta.`,
      });
    }
    if (result.shippingRate > 20) {
      flags.push({
        level: 'warning',
        text: `Frete líquido representa ${result.shippingRate.toFixed(
          1,
        )}% da receita bruta.`,
      });
    }
    if (result.refundRate > 8) {
      flags.push({
        level: 'warning',
        text: `Reembolsos representam ${result.refundRate.toFixed(
          1,
        )}% da receita bruta.`,
      });
    }
    if (
      audit.advertising > 0 &&
      result.roas > 0 &&
      result.breakEvenRoas > 0 &&
      result.roas < result.breakEvenRoas
    ) {
      flags.push({
        level: 'danger',
        text: `ROAS ${result.roas.toFixed(
          2,
        )} abaixo do equilíbrio ${result.breakEvenRoas.toFixed(2)}.`,
      });
    }
    if (result.reconciliation.items.some((item) => item.alert)) {
      flags.push({
        level: 'warning',
        text: 'Há custos com variação relevante contra o perfil planejado.',
      });
    }
    if (!flags.length) {
      flags.push({
        level: 'success',
        text: 'Nenhum alerta crítico encontrado com os dados informados.',
      });
    }
    return flags;
  }

  function completeness(audit) {
    const required = [
      'grossRevenue',
      'productCost',
      'marketplaceFees',
      'shippingCost',
      'taxes',
      'orders',
    ];
    const present = required.filter((key) => money(audit[key]) > 0).length;
    return Math.round((present / required.length) * 100);
  }

  function audits() {
    return read(KEYS.audits, []).map(normalizeAudit);
  }

  function profiles() {
    return read(KEYS.profiles, []).map(normalizeProfile);
  }

  function profileById(id) {
    return profiles().find((item) => item.id === id) || null;
  }

  function resultFor(audit) {
    return computeAudit(audit, profileById(audit.profileId));
  }

  function saveRows(key, rows) {
    write(key, rows);
    renderAll();
  }

  function toast(message, error = false) {
    let element = byId('financialToast');
    if (!element && typeof document !== 'undefined') {
      element = document.createElement('div');
      element.id = 'financialToast';
      document.body.append(element);
    }
    if (!element) return;
    element.className = `v021Toast show${error ? ' error' : ''}`;
    element.textContent = message;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 3600);
  }

  function showFinancial() {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll('.view')
      .forEach((view) => view.classList.toggle('on', view.id === 'financial'));
    document.querySelectorAll('.nav').forEach((item) => {
      item.classList.toggle('on', item.id === 'financialNav');
    });
    const title = byId('title');
    if (title) title.textContent = 'Audite o lucro real';
    document.querySelector('.side')?.classList.remove('open');
    renderAll();
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  function auditSectionHtml() {
    return `
      <section class="view" id="financial">
        <div class="sectionHead">
          <div>
            <span class="eyebrow">MARGEM LÍQUIDA</span>
            <h2>Auditoria financeira</h2>
            <p class="muted">Reconcile receita, custos e taxas sem presumir uma tarifa fixa de marketplace.</p>
          </div>
          <div class="actions">
            <button class="btn" id="exportFinancial">Exportar CSV</button>
            <button class="btn primary" id="newFinancialAudit">Nova auditoria</button>
          </div>
        </div>
        <div class="summary" id="financialSummary"></div>
        <div class="card financialFilters">
          <label class="field">
            <span>Buscar</span>
            <input id="financialSearch" placeholder="Produto, SKU ou canal">
          </label>
          <label class="field">
            <span>Canal</span>
            <select id="financialChannel">
              <option value="all">Todos</option>
              ${CHANNELS.map((channel) => `<option>${escapeHtml(channel)}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            <span>Resultado</span>
            <select id="financialStatus">
              <option value="all">Todos</option>
              <option value="profit">Lucrativo</option>
              <option value="attention">Atenção</option>
              <option value="loss">Prejuízo</option>
            </select>
          </label>
        </div>
        <div class="financialLayout">
          <div>
            <div class="financialList" id="financialList"></div>
            <div class="card empty" id="financialEmpty">
              <h3>Nenhuma auditoria criada</h3>
              <p class="muted">Comece com um teste real, um lote importado ou informe os números manualmente.</p>
              <button class="btn primary" id="emptyNewAudit">Criar auditoria</button>
            </div>
          </div>
          <aside class="financialAside">
            <article class="card">
              <div class="sectionHead">
                <div>
                  <span class="eyebrow">PREMISSAS</span>
                  <h3>Perfis financeiros</h3>
                </div>
                <button class="btn small" id="newFinancialProfile">Novo perfil</button>
              </div>
              <p class="muted">Cadastre taxas e custos esperados por canal. Valores permanecem editáveis em cada auditoria.</p>
              <div id="financialProfiles"></div>
            </article>
            <article class="card">
              <span class="eyebrow">FONTES DISPONÍVEIS</span>
              <h3>Criar a partir dos dados existentes</h3>
              <div id="financialSources"></div>
            </article>
          </aside>
        </div>
      </section>
    `;
  }

  function auditModalHtml() {
    const channelOptions = CHANNELS.map(
      (channel) => `<option>${escapeHtml(channel)}</option>`,
    ).join('');

    return `
      <div class="modal" id="financialAuditModal">
        <div class="card modalBox financialModal">
          <div class="modalHead">
            <div>
              <span class="eyebrow">RESULTADO POR PRODUTO E CANAL</span>
              <h2 id="financialAuditTitle">Nova auditoria</h2>
            </div>
            <button class="btn small" id="closeFinancialAudit">Fechar</button>
          </div>
          <form id="financialAuditForm">
            <input type="hidden" id="faId">
            <input type="hidden" id="faSourceType">
            <input type="hidden" id="faSourceId">
            <div class="grid">
              <label class="field wide">
                <span>Produto</span>
                <input id="faProduct" required maxlength="120">
              </label>
              <label class="field">
                <span>SKU</span>
                <input id="faSku" maxlength="100">
              </label>
              <label class="field">
                <span>Canal</span>
                <select id="faChannel">${channelOptions}</select>
              </label>
              <label class="field">
                <span>Qualidade dos dados</span>
                <select id="faQuality">
                  <option value="real">Dados reais</option>
                  <option value="partial">Dados parciais</option>
                  <option value="estimated">Estimado</option>
                  <option value="incomplete">Incompleto</option>
                </select>
              </label>
              <label class="field"><span>Início</span><input id="faPeriodStart" type="date"></label>
              <label class="field"><span>Fim</span><input id="faPeriodEnd" type="date"></label>
              <label class="field wide">
                <span>Perfil de premissas</span>
                <div class="fieldInline">
                  <select id="faProfile"><option value="">Sem perfil</option></select>
                  <button class="btn small" type="button" id="applyFinancialProfile">Aplicar valores esperados</button>
                </div>
              </label>
              <label class="field"><span>Pedidos</span><input id="faOrders" type="number" min="0" step="1" value="0"></label>
              <label class="field"><span>Unidades</span><input id="faUnits" type="number" min="0" step="1" value="0"></label>
              <label class="field"><span>Receita bruta (R$)</span><input id="faGrossRevenue" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Descontos fora da receita (R$)</span><input id="faDiscounts" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Reembolsos (R$)</span><input id="faRefunds" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Custo dos produtos (R$)</span><input id="faProductCost" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Taxas do canal (R$)</span><input id="faMarketplaceFees" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Taxas de pagamento (R$)</span><input id="faPaymentFees" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Frete pago (R$)</span><input id="faShippingCost" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Subsídio de frete (R$)</span><input id="faShippingSubsidy" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Impostos (R$)</span><input id="faTaxes" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Publicidade (R$)</span><input id="faAdvertising" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Embalagens (R$)</span><input id="faPackaging" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Outros custos (R$)</span><input id="faOtherCosts" type="number" min="0" step="0.01" value="0"></label>
              <label class="field wide">
                <span>Observações</span>
                <textarea id="faNotes" maxlength="1500"></textarea>
              </label>
            </div>
            <div class="financialPreview" id="financialPreview"></div>
            <div class="formFooter">
              <button class="btn danger hide" type="button" id="deleteFinancialAudit">Excluir</button>
              <button class="btn primary">Salvar auditoria</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function profileModalHtml() {
    const channelOptions = CHANNELS.map(
      (channel) => `<option>${escapeHtml(channel)}</option>`,
    ).join('');

    return `
      <div class="modal" id="financialProfileModal">
        <div class="card modalBox">
          <div class="modalHead">
            <div>
              <span class="eyebrow">CUSTOS ESPERADOS</span>
              <h2 id="financialProfileTitle">Novo perfil</h2>
            </div>
            <button class="btn small" id="closeFinancialProfile">Fechar</button>
          </div>
          <form id="financialProfileForm">
            <input type="hidden" id="fpId">
            <div class="grid">
              <label class="field wide"><span>Nome do perfil</span><input id="fpName" required maxlength="100"></label>
              <label class="field wide"><span>Canal</span><select id="fpChannel">${channelOptions}</select></label>
              <label class="field"><span>Taxa do canal (%)</span><input id="fpMarketplaceFeePct" type="number" min="0" max="80" step="0.01" value="0"></label>
              <label class="field"><span>Taxa de pagamento (%)</span><input id="fpPaymentFeePct" type="number" min="0" max="30" step="0.01" value="0"></label>
              <label class="field"><span>Impostos (%)</span><input id="fpTaxPct" type="number" min="0" max="50" step="0.01" value="0"></label>
              <label class="field"><span>Frete por pedido (R$)</span><input id="fpShippingPerOrder" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Embalagem por pedido (R$)</span><input id="fpPackagingPerOrder" type="number" min="0" step="0.01" value="0"></label>
              <label class="field"><span>Outros por pedido (R$)</span><input id="fpOtherPerOrder" type="number" min="0" step="0.01" value="0"></label>
            </div>
            <div class="formFooter">
              <button class="btn danger hide" type="button" id="deleteFinancialProfile">Excluir</button>
              <button class="btn primary">Salvar perfil</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function inject() {
    if (typeof document === 'undefined') return false;
    const nav = document.querySelector('.side nav');
    const methodNav = nav?.querySelector('[data-view="method"]');
    const methodView = byId('method');
    if (!nav || !methodNav || !methodView || byId('financialNav')) {
      return false;
    }

    methodNav.insertAdjacentHTML(
      'beforebegin',
      '<button class="nav" id="financialNav"><span>Auditoria financeira</span><b id="financialNavCount">0</b></button>',
    );
    methodView.insertAdjacentHTML('beforebegin', auditSectionHtml());
    document.body.insertAdjacentHTML(
      'beforeend',
      `${auditModalHtml()}${profileModalHtml()}<div id="financialToast" class="v021Toast"></div>`,
    );

    bind();
    extendCloud();
    enhanceBackup();
    renderAll();

    const side = document.querySelector('.sidebox');
    if (side) {
      side.querySelector('.eyebrow').textContent = 'MVP 0.4.2';
      side.querySelector('b').textContent =
        'Margem líquida e reconciliação';
      side.querySelector('p').textContent =
        'Custos reais, alertas e ponto de equilíbrio.';
    }
    return true;
  }

  function bind() {
    byId('financialNav').onclick = showFinancial;
    byId('newFinancialAudit').onclick = () => openAudit();
    byId('emptyNewAudit').onclick = () => openAudit();
    byId('closeFinancialAudit').onclick = () =>
      byId('financialAuditModal').classList.remove('open');
    byId('financialAuditForm').onsubmit = (event) => {
      event.preventDefault();
      saveAudit();
    };
    byId('deleteFinancialAudit').onclick = deleteAudit;
    byId('newFinancialProfile').onclick = () => openProfile();
    byId('closeFinancialProfile').onclick = () =>
      byId('financialProfileModal').classList.remove('open');
    byId('financialProfileForm').onsubmit = (event) => {
      event.preventDefault();
      saveProfile();
    };
    byId('deleteFinancialProfile').onclick = deleteProfile;
    byId('applyFinancialProfile').onclick = applySelectedProfile;
    byId('exportFinancial').onclick = exportFinancial;

    for (const id of [
      'financialSearch',
      'financialChannel',
      'financialStatus',
    ]) {
      byId(id).addEventListener(
        id === 'financialSearch' ? 'input' : 'change',
        renderAudits,
      );
    }
    byId('financialAuditForm').addEventListener('input', renderPreview);
    byId('faProfile').addEventListener('change', renderPreview);
  }

  function auditForm() {
    return normalizeAudit({
      id: byId('faId').value || undefined,
      sourceType: byId('faSourceType').value,
      sourceId: byId('faSourceId').value,
      product: byId('faProduct').value,
      sku: byId('faSku').value,
      channel: byId('faChannel').value,
      quality: byId('faQuality').value,
      periodStart: byId('faPeriodStart').value,
      periodEnd: byId('faPeriodEnd').value,
      profileId: byId('faProfile').value,
      orders: byId('faOrders').value,
      units: byId('faUnits').value,
      grossRevenue: byId('faGrossRevenue').value,
      discounts: byId('faDiscounts').value,
      refunds: byId('faRefunds').value,
      productCost: byId('faProductCost').value,
      marketplaceFees: byId('faMarketplaceFees').value,
      paymentFees: byId('faPaymentFees').value,
      shippingCost: byId('faShippingCost').value,
      shippingSubsidy: byId('faShippingSubsidy').value,
      taxes: byId('faTaxes').value,
      advertising: byId('faAdvertising').value,
      packaging: byId('faPackaging').value,
      otherCosts: byId('faOtherCosts').value,
      notes: byId('faNotes').value,
    });
  }

  function fillProfileSelect(selected = '') {
    const select = byId('faProfile');
    if (!select) return;
    select.innerHTML =
      '<option value="">Sem perfil</option>' +
      profiles()
        .map(
          (profile) =>
            `<option value="${escapeHtml(profile.id)}">${escapeHtml(
              profile.name,
            )}</option>`,
        )
        .join('');
    select.value = selected || '';
  }

  const AUDIT_FIELD_MAP = {
    Orders: 'orders',
    Units: 'units',
    GrossRevenue: 'grossRevenue',
    Discounts: 'discounts',
    Refunds: 'refunds',
    ProductCost: 'productCost',
    MarketplaceFees: 'marketplaceFees',
    PaymentFees: 'paymentFees',
    ShippingCost: 'shippingCost',
    ShippingSubsidy: 'shippingSubsidy',
    Taxes: 'taxes',
    Advertising: 'advertising',
    Packaging: 'packaging',
    OtherCosts: 'otherCosts',
  };

  function openAudit(audit = null) {
    const value = audit
      ? normalizeAudit(audit)
      : normalizeAudit({
          quality: 'incomplete',
          channel: 'Mercado Livre',
        });

    byId('financialAuditTitle').textContent = audit
      ? 'Editar auditoria'
      : 'Nova auditoria';
    byId('faId').value = audit?.id || '';
    byId('faSourceType').value = value.sourceType;
    byId('faSourceId').value = value.sourceId;
    byId('faProduct').value =
      value.product === 'Produto sem nome' ? '' : value.product;
    byId('faSku').value = value.sku;
    byId('faChannel').value = value.channel;
    byId('faQuality').value = value.quality;
    byId('faPeriodStart').value = value.periodStart;
    byId('faPeriodEnd').value = value.periodEnd;
    fillProfileSelect(value.profileId);

    for (const [suffix, key] of Object.entries(AUDIT_FIELD_MAP)) {
      byId(`fa${suffix}`).value = value[key] || 0;
    }

    byId('faNotes').value = value.notes;
    byId('deleteFinancialAudit').classList.toggle('hide', !audit);
    renderPreview();
    byId('financialAuditModal').classList.add('open');
  }

  function saveAudit() {
    const value = auditForm();
    const rows = audits();
    const old = rows.find((item) => item.id === value.id);
    value.createdAt = old?.createdAt || value.createdAt;
    saveRows(KEYS.audits, [
      value,
      ...rows.filter((item) => item.id !== value.id),
    ]);
    byId('financialAuditModal').classList.remove('open');
    toast('Auditoria financeira salva.');
  }

  function deleteAudit() {
    const id = byId('faId').value;
    if (!id || !confirm('Excluir esta auditoria financeira?')) return;
    saveRows(
      KEYS.audits,
      audits().filter((item) => item.id !== id),
    );
    byId('financialAuditModal').classList.remove('open');
  }

  function profileForm() {
    return normalizeProfile({
      id: byId('fpId').value || undefined,
      name: byId('fpName').value,
      channel: byId('fpChannel').value,
      marketplaceFeePct: byId('fpMarketplaceFeePct').value,
      paymentFeePct: byId('fpPaymentFeePct').value,
      taxPct: byId('fpTaxPct').value,
      shippingPerOrder: byId('fpShippingPerOrder').value,
      packagingPerOrder: byId('fpPackagingPerOrder').value,
      otherPerOrder: byId('fpOtherPerOrder').value,
    });
  }

  const PROFILE_FIELD_MAP = {
    MarketplaceFeePct: 'marketplaceFeePct',
    PaymentFeePct: 'paymentFeePct',
    TaxPct: 'taxPct',
    ShippingPerOrder: 'shippingPerOrder',
    PackagingPerOrder: 'packagingPerOrder',
    OtherPerOrder: 'otherPerOrder',
  };

  function openProfile(profile = null) {
    const value =
      profile ||
      normalizeProfile({
        name: '',
        channel: 'Mercado Livre',
      });

    byId('financialProfileTitle').textContent = profile
      ? 'Editar perfil'
      : 'Novo perfil';
    byId('fpId').value = profile?.id || '';
    byId('fpName').value = profile?.name || '';
    byId('fpChannel').value = value.channel;

    for (const [suffix, key] of Object.entries(PROFILE_FIELD_MAP)) {
      byId(`fp${suffix}`).value = value[key] || 0;
    }

    byId('deleteFinancialProfile').classList.toggle('hide', !profile);
    byId('financialProfileModal').classList.add('open');
  }

  function saveProfile() {
    const value = profileForm();
    const rows = profiles();
    const old = rows.find((item) => item.id === value.id);
    value.createdAt = old?.createdAt || value.createdAt;
    saveRows(KEYS.profiles, [
      value,
      ...rows.filter((item) => item.id !== value.id),
    ]);
    byId('financialProfileModal').classList.remove('open');
    toast('Perfil financeiro salvo.');
  }

  function deleteProfile() {
    const id = byId('fpId').value;
    if (
      !id ||
      !confirm(
        'Excluir este perfil? Auditorias manterão os valores já informados.',
      )
    ) {
      return;
    }
    saveRows(
      KEYS.profiles,
      profiles().filter((item) => item.id !== id),
    );
    byId('financialProfileModal').classList.remove('open');
  }

  function applySelectedProfile() {
    const audit = auditForm();
    const profile = profileById(byId('faProfile').value);
    const expected = expectedFromProfile(audit, profile);
    if (!expected) {
      toast('Selecione um perfil primeiro.', true);
      return;
    }

    for (const [key, value] of Object.entries(expected)) {
      const id = `fa${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      if (byId(id)) byId(id).value = value.toFixed(2);
    }

    byId('faQuality').value =
      byId('faQuality').value === 'real' ? 'real' : 'estimated';
    renderPreview();
    toast('Premissas aplicadas. Revise antes de salvar.');
  }

  function renderPreview() {
    if (!byId('financialPreview')) return;
    const result = computeAudit(
      auditForm(),
      profileById(byId('faProfile').value),
    );
    const flags = auditFlags(result);

    byId('financialPreview').innerHTML = `
      <div class="financialPreviewGrid">
        <div><small>Receita líquida</small><b>${BRL.format(result.netSales)}</b></div>
        <div><small>Lucro líquido</small><b class="${result.netProfit < 0 ? 'negative' : 'positive'}">${BRL.format(result.netProfit)}</b></div>
        <div><small>Margem líquida</small><b>${result.netMargin.toFixed(1)}%</b></div>
        <div><small>Contribuição antes da mídia</small><b>${BRL.format(result.contributionBeforeAds)}</b></div>
        <div><small>CPA</small><b>${result.audit.orders ? BRL.format(result.cac) : '—'}</b></div>
        <div><small>ROAS / equilíbrio</small><b>${result.audit.advertising ? `${result.roas.toFixed(2)} / ${result.breakEvenRoas.toFixed(2)}` : '—'}</b></div>
      </div>
      <div class="financialFlags">
        ${flags.map((flag) => `<span class="${flag.level}">${escapeHtml(flag.text)}</span>`).join('')}
      </div>
    `;
  }

  function renderSummary() {
    const results = audits().map(resultFor);
    const revenue = results.reduce((sum, item) => sum + item.netSales, 0);
    const profit = results.reduce((sum, item) => sum + item.netProfit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    byId('financialNavCount').textContent = results.length;
    byId('financialSummary').innerHTML = `
      <div class="card"><span>Auditorias</span><b>${results.length}</b></div>
      <div class="card"><span>Receita líquida</span><b>${BRL.format(revenue)}</b></div>
      <div class="card"><span>Lucro líquido</span><b class="${profit < 0 ? 'negative' : 'positive'}">${BRL.format(profit)}</b></div>
      <div class="card"><span>Margem consolidada</span><b>${margin.toFixed(1)}%</b></div>
    `;
  }

  function costBar(result) {
    const total = Math.max(result.netSales, result.totalCosts, 1);
    const items = [
      ['Produto', result.audit.productCost, 'product'],
      [
        'Taxas',
        result.audit.marketplaceFees + result.audit.paymentFees,
        'fees',
      ],
      ['Frete', result.netShipping, 'shipping'],
      ['Impostos', result.audit.taxes, 'tax'],
      ['Mídia', result.audit.advertising, 'ads'],
      [
        'Outros',
        result.audit.packaging + result.audit.otherCosts,
        'other',
      ],
    ];

    return items
      .filter((item) => item[1] > 0)
      .map(
        ([label, value, kind]) =>
          `<span class="${kind}" style="width:${Math.max(
            2,
            (value / total) * 100,
          ).toFixed(2)}%" title="${escapeHtml(label)}: ${BRL.format(
            value,
          )}"></span>`,
      )
      .join('');
  }

  function renderAudits() {
    if (!byId('financialList')) return;
    const search = safe(byId('financialSearch').value, 120).toLowerCase();
    const channel = byId('financialChannel').value;
    const status = byId('financialStatus').value;
    const rows = audits()
      .map((audit) => ({ audit, result: resultFor(audit) }))
      .filter(
        ({ audit, result }) =>
          (!search ||
            `${audit.product} ${audit.sku} ${audit.channel}`
              .toLowerCase()
              .includes(search)) &&
          (channel === 'all' || audit.channel === channel) &&
          (status === 'all' || result.status === status),
      );

    byId('financialEmpty').classList.toggle('hide', Boolean(rows.length));
    byId('financialList').innerHTML = rows
      .map(({ audit, result }) => {
        const flags = auditFlags(result);
        return `
          <article class="card financialCard ${result.status}">
            <div class="financialCardHead">
              <div>
                <span class="financialBadge ${result.status}">${STATUS_NAMES[result.status]}</span>
                <h3>${escapeHtml(audit.product)}</h3>
                <p>${escapeHtml(audit.channel)}${audit.sku ? ` · ${escapeHtml(audit.sku)}` : ''}</p>
              </div>
              <div class="financialProfit">
                <small>Lucro líquido</small>
                <b>${BRL.format(result.netProfit)}</b>
                <span>${result.netMargin.toFixed(1)}%</span>
              </div>
            </div>
            <div class="financialMetrics">
              <div><small>Receita líquida</small><b>${BRL.format(result.netSales)}</b></div>
              <div><small>Custo total</small><b>${BRL.format(result.totalCosts)}</b></div>
              <div><small>Contribuição/pedido</small><b>${audit.orders ? BRL.format(result.contributionPerOrder) : '—'}</b></div>
              <div><small>Qualidade</small><b>${QUALITY_NAMES[audit.quality]}</b></div>
            </div>
            <div class="financialCostBar">${costBar(result)}</div>
            <div class="financialFlags compact">
              ${flags.slice(0, 2).map((flag) => `<span class="${flag.level}">${escapeHtml(flag.text)}</span>`).join('')}
            </div>
            <div class="actions">
              <button class="btn small" data-edit-audit="${escapeHtml(audit.id)}">Editar</button>
              <button class="btn small" data-report-audit="${escapeHtml(audit.id)}">Relatório</button>
            </div>
          </article>
        `;
      })
      .join('');

    byId('financialList')
      .querySelectorAll('[data-edit-audit]')
      .forEach((button) => {
        button.onclick = () =>
          openAudit(
            audits().find((item) => item.id === button.dataset.editAudit),
          );
      });

    byId('financialList')
      .querySelectorAll('[data-report-audit]')
      .forEach((button) => {
        button.onclick = () => exportReport(button.dataset.reportAudit);
      });
  }

  function renderProfiles() {
    const container = byId('financialProfiles');
    const rows = profiles();
    container.innerHTML = rows.length
      ? rows
          .map(
            (profile) => `
              <button class="financialProfile" data-profile-id="${escapeHtml(profile.id)}">
                <span>
                  <b>${escapeHtml(profile.name)}</b>
                  <small>${escapeHtml(profile.channel)}</small>
                </span>
                <em>${profile.marketplaceFeePct.toFixed(1)}% canal · ${profile.taxPct.toFixed(1)}% imposto</em>
              </button>
            `,
          )
          .join('')
      : '<div class="financialSourceEmpty">Nenhum perfil cadastrado.</div>';

    container.querySelectorAll('[data-profile-id]').forEach((button) => {
      button.onclick = () =>
        openProfile(
          rows.find((item) => item.id === button.dataset.profileId),
        );
    });
  }

  function sourceCandidates() {
    const used = new Set(
      audits().map((item) => `${item.sourceType}:${item.sourceId}`),
    );
    const candidates = [];

    for (const test of read(KEYS.tests, [])) {
      const key = `test:${test.id}`;
      if (used.has(key)) continue;
      candidates.push({
        kind: 'test',
        id: test.id,
        label: test.product,
        channel: test.channel || 'Outro canal',
        meta: `${NUMBER.format(test.orders || 0)} pedido(s) · ${BRL.format(test.revenue || 0)}`,
        data: {
          product: test.product,
          channel: CHANNELS.includes(test.channel)
            ? test.channel
            : 'Outro canal',
          quality: 'partial',
          orders: test.orders || 0,
          units: test.orders || 0,
          grossRevenue: test.revenue || 0,
          advertising: test.investment || 0,
          sourceType: 'test',
          sourceId: test.id,
          notes:
            'Auditoria iniciada a partir de um teste real do Commerce Radar.',
        },
      });
    }

    for (const batch of read(KEYS.imports, [])) {
      for (const product of batch.products || []) {
        const id = `${batch.id}:${product.sku || product.product}:${product.channel}`;
        const key = `import:${id}`;
        if (used.has(key)) continue;
        const revenue = money(product.revenue);
        const margin = number(product.margin);
        const cost =
          revenue > 0 ? revenue * (1 - margin / 100) : 0;

        candidates.push({
          kind: 'import',
          id,
          label: product.product,
          channel: CHANNELS.includes(product.channel)
            ? product.channel
            : 'Outro canal',
          meta: `${NUMBER.format(product.orders || 0)} pedido(s) · ${BRL.format(revenue)}`,
          data: {
            product: product.product,
            sku: product.sku,
            channel: CHANNELS.includes(product.channel)
              ? product.channel
              : 'Outro canal',
            quality: 'partial',
            orders: product.orders || 0,
            units: product.orders || 0,
            grossRevenue: revenue,
            productCost: Math.max(0, cost),
            sourceType: 'import',
            sourceId: id,
            periodEnd: safe(batch.importedAt, 10),
            notes: `Auditoria iniciada a partir do lote ${
              batch.filename || batch.id
            }. Revise taxas, frete, impostos e reembolsos.`,
          },
        });
      }
    }

    return candidates.slice(0, 20);
  }

  function renderSources() {
    const container = byId('financialSources');
    const rows = sourceCandidates();
    container.innerHTML = rows.length
      ? rows
          .map(
            (item) => `
              <button class="financialSource" data-source-kind="${item.kind}" data-source-id="${escapeHtml(item.id)}">
                <span>
                  <b>${escapeHtml(item.label)}</b>
                  <small>${escapeHtml(item.channel)}</small>
                </span>
                <em>${escapeHtml(item.meta)}</em>
              </button>
            `,
          )
          .join('')
      : '<div class="financialSourceEmpty">Nenhuma fonte nova disponível.</div>';

    container.querySelectorAll('[data-source-id]').forEach((button) => {
      button.onclick = () => {
        const candidate = sourceCandidates().find(
          (item) =>
            item.kind === button.dataset.sourceKind &&
            item.id === button.dataset.sourceId,
        );
        if (candidate) openAudit(candidate.data);
      };
    });
  }

  function renderAll() {
    if (!byId('financial')) return;
    renderSummary();
    renderAudits();
    renderProfiles();
    renderSources();
    fillProfileSelect(byId('faProfile')?.value);
  }

  function exportFinancial() {
    const rows = audits();
    if (!rows.length) {
      toast('Não há auditorias para exportar.', true);
      return;
    }

    const headers = [
      'produto',
      'sku',
      'canal',
      'qualidade',
      'pedidos',
      'unidades',
      'receita_bruta',
      'descontos',
      'reembolsos',
      'receita_liquida',
      'custo_produtos',
      'taxas_canal',
      'taxas_pagamento',
      'frete_liquido',
      'impostos',
      'publicidade',
      'embalagens',
      'outros_custos',
      'lucro_liquido',
      'margem_liquida_pct',
      'contribuicao_antes_midia',
      'roas',
      'roas_equilibrio',
      'status',
    ];

    const lines = [
      headers,
      ...rows.map((audit) => {
        const result = resultFor(audit);
        return [
          audit.product,
          audit.sku,
          audit.channel,
          audit.quality,
          audit.orders,
          audit.units,
          audit.grossRevenue,
          audit.discounts,
          audit.refunds,
          result.netSales,
          audit.productCost,
          audit.marketplaceFees,
          audit.paymentFees,
          result.netShipping,
          audit.taxes,
          audit.advertising,
          audit.packaging,
          audit.otherCosts,
          result.netProfit,
          result.netMargin,
          result.contributionBeforeAds,
          result.roas,
          result.breakEvenRoas,
          result.status,
        ];
      }),
    ];

    downloadCsv('commerce-radar-auditoria-financeira.csv', lines);
  }

  function exportReport(id) {
    const audit = audits().find((item) => item.id === id);
    if (!audit) return;

    const result = resultFor(audit);
    const flags = auditFlags(result);
    const profile = profileById(audit.profileId);
    const profileSection = profile
      ? `\n## Perfil comparado\n\n${profile.name} — ${profile.channel}\n`
      : '';

    const markdown = `# Auditoria financeira — ${audit.product}

**Canal:** ${audit.channel}
**Período:** ${audit.periodStart || 'não informado'} a ${audit.periodEnd || 'não informado'}
**Qualidade:** ${QUALITY_NAMES[audit.quality]}
**Resultado:** ${STATUS_NAMES[result.status]}

## Resultado

- Receita bruta: ${BRL.format(audit.grossRevenue)}
- Receita líquida: ${BRL.format(result.netSales)}
- Custos totais: ${BRL.format(result.totalCosts)}
- Lucro líquido: ${BRL.format(result.netProfit)}
- Margem líquida: ${result.netMargin.toFixed(1)}%
- Contribuição antes da mídia: ${BRL.format(result.contributionBeforeAds)}
- Lucro por pedido: ${audit.orders ? BRL.format(result.profitPerOrder) : 'não disponível'}
- ROAS: ${audit.advertising ? result.roas.toFixed(2) : 'não disponível'}
- ROAS de equilíbrio: ${result.breakEvenRoas ? result.breakEvenRoas.toFixed(2) : 'não disponível'}

## Custos

- Produtos: ${BRL.format(audit.productCost)}
- Taxas do canal: ${BRL.format(audit.marketplaceFees)}
- Taxas de pagamento: ${BRL.format(audit.paymentFees)}
- Frete líquido: ${BRL.format(result.netShipping)}
- Impostos: ${BRL.format(audit.taxes)}
- Publicidade: ${BRL.format(audit.advertising)}
- Embalagens e outros: ${BRL.format(audit.packaging + audit.otherCosts)}

## Alertas

${flags.map((item) => `- ${item.text}`).join('\n')}
${profileSection}
## Observações

${audit.notes || 'Sem observações.'}

---
Tehkné Solutions
`;

    download(
      `auditoria-${audit.product
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')}.md`,
      markdown,
      'text/markdown;charset=utf-8',
    );
  }

  function downloadCsv(filename, rows) {
    const text =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(value ?? '').replace(/"/g, '""')}"`,
            )
            .join(';'),
        )
        .join('\r\n');
    download(filename, text, 'text/csv;charset=utf-8');
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function extendCloud() {
    const apply = () => {
      const keys = ROOT.CommerceRadarCloud?.dataKeys;
      if (!keys) return false;
      Object.assign(keys, {
        importBatches: KEYS.imports,
        financialAudits: KEYS.audits,
        financialProfiles: KEYS.profiles,
      });
      return true;
    };

    if (apply()) return;
    ROOT.addEventListener?.('commerce-radar-cloud-ready', apply, {
      once: true,
    });
  }

  function mergeById(first, second) {
    return [
      ...new Map(
        [...first, ...second].map((item) => [
          item.id || JSON.stringify(item).slice(0, 100),
          item,
        ]),
      ).values(),
    ];
  }

  function enhanceBackup() {
    let attempts = 0;
    let pending = { audits: [], profiles: [] };

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
          version: '0.4.2',
          exportedAt: new Date().toISOString(),
          signature: 'Tehkné Solutions',
          analyses: read(KEYS.analyses, []),
          tests: read(KEYS.tests, []),
          customOpportunities: read(KEYS.custom, []),
          launchPlans: read(KEYS.launch, []),
          importBatches: read(KEYS.imports, []),
          financialAudits: audits(),
          financialProfiles: profiles(),
        };
        download(
          `commerce-radar-backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json`,
          JSON.stringify(payload, null, 2),
          'application/json',
        );
      };

      input.addEventListener(
        'change',
        async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const payload = JSON.parse(await file.text());
            pending = {
              audits: Array.isArray(payload.financialAudits)
                ? payload.financialAudits.map(normalizeAudit)
                : [],
              profiles: Array.isArray(payload.financialProfiles)
                ? payload.financialProfiles.map(normalizeProfile)
                : [],
            };
          } catch {
            pending = { audits: [], profiles: [] };
          }
        },
        { capture: true },
      );

      merge.addEventListener('click', () => {
        write(KEYS.audits, mergeById(audits(), pending.audits));
        write(
          KEYS.profiles,
          mergeById(profiles(), pending.profiles),
        );
      });

      replace.addEventListener('click', () => {
        write(KEYS.audits, pending.audits);
        write(KEYS.profiles, pending.profiles);
      });
    }, 50);
  }

  function boot() {
    if (inject()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 180) clearInterval(timer);
    }, 50);
  }

  ROOT.CommerceRadarFinancial = {
    normalizeAudit,
    normalizeProfile,
    computeAudit,
    expectedFromProfile,
    reconcile,
    auditFlags,
    completeness,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
})();