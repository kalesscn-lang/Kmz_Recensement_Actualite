(() => {
  const base = (document.querySelector('meta[name="kmz-base"]')?.getAttribute('content') || './').trim();

  const resolve = (p) => {
    if (!p) return p;
    if (/^(https?:)?\/\//.test(p) || p.startsWith('/') || p.startsWith('data:')) return p;
    return base + p;
  };

  function apply() {
    document.querySelectorAll('[data-kmz-href]').forEach(a => {
      const p = a.getAttribute('data-kmz-href');
      const url = resolve(p);
      if (a.getAttribute('href') !== url) a.setAttribute('href', url);
    });

    document.querySelectorAll('img[data-kmz-src]').forEach(img => {
      const p = img.getAttribute('data-kmz-src');
      const url = resolve(p);
      const cur = img.getAttribute('src') || '';
      if (cur !== url) img.setAttribute('src', url);
      img.setAttribute('decoding', 'async');
      img.setAttribute('loading', 'eager');
    });

    const page = document.body.getAttribute('data-page') || '';
    document.querySelectorAll('[data-kmz-page]').forEach(a => {
      const p = a.getAttribute('data-kmz-page');
      const active = p === page;
      a.classList.toggle('active', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  document.addEventListener('DOMContentLoaded', apply);
})();
