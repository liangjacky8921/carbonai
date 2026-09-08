/* CarbonAI v5.1 — Lazy Loader for heavy libraries */
const LazyLoader = {
  _loaded: {},
  _loading: {},

  loadScript(src, id) {
    if (this._loaded[id]) return Promise.resolve();
    if (this._loading[id]) return this._loading[id];
    if (document.querySelector(`script[data-lazy="${id}"]`)) {
      this._loaded[id] = true;
      return Promise.resolve();
    }
    this._loading[id] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.dataset.lazy = id;
      s.onload = () => { this._loaded[id] = true; delete this._loading[id]; resolve(); };
      s.onerror = () => { delete this._loading[id]; reject(new Error(`Failed to load: ${src}`)); };
      document.head.appendChild(s);
    });
    return this._loading[id];
  },

  /* Load ECharts on demand */
  echarts() { return this.loadScript('https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js', 'echarts'); },

  /* Load Chart.js on demand */
  chartjs() { return this.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js', 'chartjs'); },

  /* Load Leaflet + plugins on demand */
  leaflet() {
    if (this._loaded['leaflet']) return Promise.resolve();
    this._loading['leaflet'] = (async () => {
      await this.loadCSS('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');
      await this.loadScript('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js', 'leaflet-core');
      window._leaflet_ok = true;
      this._loaded['leaflet'] = true;
    })();
    return this._loading['leaflet'];
  },

  turf() { return this.loadScript('https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js', 'turf'); },
  shpjs() { return this.loadScript('https://cdn.jsdelivr.net/npm/shpjs@6.1.0/dist/shp.min.js', 'shpjs'); },
  leafletHeat() { return this.leaflet().then(() => this.loadScript('https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js', 'leaflet-heat')); },
  sheetjs() { return this.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'sheetjs'); },
  html2pdf() { return this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js', 'html2pdf'); },

  loadCSS(url) {
    if (document.querySelector(`link[href="${url}"]`)) return Promise.resolve();
    return new Promise((resolve) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = url;
      l.onload = resolve;
      document.head.appendChild(l);
    });
  },

  /* Preload all critical CDN CSS */
  preloadCSS() {
    return Promise.all([
      this.loadCSS('https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css'),
      this.loadCSS('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'),
    ]);
  }
};
