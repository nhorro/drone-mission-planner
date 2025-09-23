const featureRegistry = {
  waypoints: () => import('../features/waypoints/index.js'),
  ortho: () => import('../features/ortho/index.js'),
  zones: () => import('../features/waypoints/index.js')
};

export class Pager {
  constructor(store, bus) {
    this.store = store;
    this.bus = bus;
    this.panelEl = document.getElementById('toolPanel');
    if (!this.panelEl) throw new Error('toolPanel container not found');

    this.tabs = Array.from(document.querySelectorAll('#toolTabs [data-tool]'));
    this.activeEntry = null;
    this.activeKey = null;
    this.pendingKey = null;
    this.suppressHash = false;

    this.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tool;
        if (key) this.navigate(key);
      });
    });

    window.addEventListener('hashchange', () => {
      if (this.suppressHash) {
        this.suppressHash = false;
        return;
      }
      const key = this.getKeyFromHash();
      if (key && key !== this.activeKey) {
        this.navigate(key, { replaceHash: true });
      }
    });

    const initialKey = this.getKeyFromHash() || 'waypoints';
    this.navigate(initialKey, { replaceHash: true });
  }

  getKeyFromHash() {
    if (!location.hash) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    return params.get('tool');
  }

  buildHash(key) {
    const params = new URLSearchParams(location.hash.slice(1));
    params.set('tool', key);
    return params.toString();
  }

  setActiveTab(key) {
    this.tabs.forEach(btn => {
      const isActive = btn.dataset.tool === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  async navigate(key, opts = {}) {
    const load = featureRegistry[key];
    if (!load) {
      console.warn('Unknown tool', key);
      return;
    }
    if (key === this.activeKey && !opts.force) {
      if (!opts.replaceHash) this.updateHash(key, false);
      return;
    }

    this.pendingKey = key;
    this.setActiveTab(key);

    if (this.activeEntry) {
      await this.teardownActive();
    }

    try {
      const mod = await load();
      if (this.pendingKey !== key) return;
      const def = mod.default || mod;
      if (!def?.panelUrl) throw new Error('Feature missing panelUrl');
      const feature = await def.init?.(this.store, this.bus);
      const response = await fetch(def.panelUrl);
      if (!response.ok) throw new Error(`Failed to fetch panel: ${response.status}`);
      const html = await response.text();
      if (this.pendingKey !== key) return;
      this.panelEl.innerHTML = html;
      this.activeEntry = { instance: feature };
      this.activeKey = key;
      await feature?.activate?.();
      this.pendingKey = null;
      this.updateHash(key, !!opts.replaceHash);
    } catch (err) {
      console.error('Failed to load tool', key, err);
      this.panelEl.innerHTML = '<div class="alert alert-danger">Failed to load tool.</div>';
      this.activeEntry = null;
      this.activeKey = null;
      this.pendingKey = null;
    }
  }

  async teardownActive() {
    const entry = this.activeEntry;
    if (!entry) return;
    try {
      await entry.instance?.deactivate?.();
    } catch (err) {
      console.error('Failed to deactivate tool', this.activeKey, err);
    }
    try {
      await entry.instance?.destroy?.();
    } catch (err) {
      console.error('Failed to destroy tool', this.activeKey, err);
    }
    this.panelEl.innerHTML = '';
    this.activeEntry = null;
    this.activeKey = null;
  }

  updateHash(key, replace) {
    const hash = this.buildHash(key);
    this.suppressHash = true;
    if (replace) {
      const url = `${location.pathname}${location.search}${hash ? '#' + hash : ''}`;
      history.replaceState(null, '', url);
    } else {
      location.hash = hash;
    }
  }
}
