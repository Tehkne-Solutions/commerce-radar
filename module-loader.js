(() => {
  'use strict';

  const styles = [
    './cloud.css',
    './cloud-diagnostics.css',
    './cloud-history.css',
    './marketplace-adapters.css',
    './import.css',
    './financial-audit.css',
    './financial-reconciliation.css',
    './financial-close.css',
    './financial-planning.css',
    './trend-radar.css',
    './trend-queue.css',
    './recommendations.css',
    './recommendation-calibration.css',
    './recommendation-segments.css',
    './recommendation-profile-control.css',
    './recommendation-drift.css',
    './recommendation-champion.css',
    './recommendation-governance.css',
    './recommendation-audit.css',
    './recommendation-identity.css',
    './recommendation-access-review.css',
  ];

  const scripts = [
    './cloud-config.js',
    './cloud.js',
    './cloud-diagnostics.js',
    './cloud-history.js',
    './marketplace-adapters.js',
    './import.js',
    './financial-audit.js',
    './financial-reconciliation.js',
    './financial-close.js',
    './financial-planning.js',
    './trend-radar.js',
    './trend-queue.js',
    './recommendations.js',
    './recommendation-calibration.js',
    './recommendation-segments.js',
    './recommendation-profile-control.js',
    './recommendation-drift.js',
    './recommendation-champion.js',
    './recommendation-governance.js',
    './recommendation-audit.js',
    './recommendation-identity.js',
    './recommendation-access-review.js',
    './cloud-bootstrap.js',
  ];

  function addStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      document.body.append(script);
    });
  }

  async function boot() {
    styles.forEach(addStyle);
    for (const src of scripts) await loadScript(src);
    window.dispatchEvent(new CustomEvent('commerce-radar-modules-ready'));
  }

  boot().catch((error) => {
    console.error('[Commerce Radar] Falha no carregamento modular:', error);
    const notice = document.createElement('div');
    notice.className = 'notice';
    notice.textContent = 'Parte dos módulos avançados não pôde ser carregada. Recarregue a página ou limpe o cache do aplicativo.';
    document.querySelector('.main')?.prepend(notice);
  });
})();