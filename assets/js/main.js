(() => {
  const base = (document.querySelector('meta[name="kmz-base"]')?.getAttribute('content') || './').trim();

  const resolve = (p) => {
    if (!p) return p;
    if (/^(https?:)?\/\//.test(p) || p.startsWith('/') || p.startsWith('data:')) return p;
    return base + p;
  };

  function post(scope) {
    scope.querySelectorAll('[data-kmz-href]').forEach(a => {
      const p = a.getAttribute('data-kmz-href');
      if (!p) return;
      const url = resolve(p);
      if (a.getAttribute('href') !== url) a.setAttribute('href', url);
    });

    scope.querySelectorAll('img[data-kmz-src]').forEach(img => {
      const p = img.getAttribute('data-kmz-src');
      if (!p) return;
      const url = resolve(p);
      const cur = img.getAttribute('src') || '';
      if (cur !== url) img.setAttribute('src', url);
    });

    const page = document.body.getAttribute('data-page') || '';
    scope.querySelectorAll('[data-kmz-page]').forEach(a => {
      const p = a.getAttribute('data-kmz-page');
      a.classList.toggle('active', p === page);
    });
  }

  const FALLBACK_NAV = `
  <nav class="navbar navbar-expand-lg kmz-navbar">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2 kmz-brand" href="${resolve('index.html')}">
        <img class="kmz-logo" src="${resolve('assets/img/newx/logo_kme_dios_tana.png')}" alt="Logo KMZ">
        <div class="kmz-brand-text">
          <div class="kmz-brand-title">KMZ Katolika Mpitendry Zava-maneno</div>
          <div class="kmz-brand-sub">Diosezin'Antananarivo</div>
        </div>
      </a>
    </div>
  </nav>`;

  const FALLBACK_FOOT = `
  <footer class="kmz-footer mt-5">
    <div class="container py-4">
      <div class="d-flex align-items-center gap-2 mb-2">
        <img class="kmz-footer-logo" src="${resolve('assets/img/newx/logo_kme_dios_tana.png')}" alt="Logo KMZ">
        <div>
          <div class="kmz-footer-title">KMZ Katolika Mpitendry Zava-maneno</div>
          <div class="kmz-footer-sub">Diosezin'Antananarivo</div>
        </div>
      </div>
      <div class="text-secondary small">© 2026 KMZ — Diosezin'Antananarivo</div>
    </div>
  </footer>`;

  async function loadPartial(id, path, fallbackHtml) {
    const mount = document.getElementById(id);
    if (!mount) return;
    try {
      const res = await fetch(resolve(path), { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      mount.innerHTML = await res.text();
      post(mount);
    } catch (e) {
      mount.innerHTML = fallbackHtml;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadPartial('app-navbar', 'assets/partials/navbar.html', FALLBACK_NAV);
    await loadPartial('app-footer', 'assets/partials/footer.html', FALLBACK_FOOT);
    post(document);
  });
})();
