// Lazy import map used to resolve feature keys into ES module dynamic imports.
// Keeping the registry in one place makes it clear which feature owns each tab
// and simplifies adding new panels in the future.
const featureRegistry = {
  waypoints: () => import('../features/waypoints/index.js'),
  ortho: () => import('../features/ortho/index.js'),
  zones: () => import('../features/waypoints/index.js')
};

/**
 * Coordinates tab navigation within the sidebar. The pager fetches each
 * feature's HTML panel on demand, instantiates its controller, and manages the
 * lifecycle hooks (activate/deactivate/destroy) as the user switches tabs.
 */
export class Pager {
  /**
   * @param {State} store shared application state façade (global singleton)
   * @param {Object} bus lightweight event bus for cross-feature communication
   */
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

    // Wire up each tab button so clicking navigates to the feature
    // corresponding to its `data-tool` attribute.
    this.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tool;
        if (key) this.navigate(key);
      });
    });

    // Keep the pager in sync with the URL hash to support deep linking.
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

  /**
   * Parse the current `location.hash` and return the requested tool key, if
   * present. Returns `null` when no explicit tab is encoded.
   */
  getKeyFromHash() {
    if (!location.hash) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    return params.get('tool');
  }

  /**
   * Build the hash fragment representing the provided tool key while keeping
   * any other existing hash parameters intact.
   */
  buildHash(key) {
    const params = new URLSearchParams(location.hash.slice(1));
    params.set('tool', key);
    return params.toString();
  }

  /**
   * Update aria attributes and CSS classes so the UI reflects which tab is
   * currently active.
   */
  setActiveTab(key) {
    this.tabs.forEach(btn => {
      const isActive = btn.dataset.tool === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  /**
   * Navigate to a feature by key. Handles lazy loading, lifecycle cleanup, and
   * updating the URL hash unless `replaceHash` is requested.
   */
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
      // Load the module and resolve the default export (supports both
      // `export default` and `module.exports` style definitions).
      const mod = await load();
      if (this.pendingKey !== key) return;
      const def = mod.default || mod;
      if (!def?.panelUrl) throw new Error('Feature missing panelUrl');
      const feature = await def.init?.(this.store, this.bus);
      // Panels are stored as static HTML partials that we fetch on demand so
      // they can live alongside their respective controllers.
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

  /**
   * Ensure the previously active feature can dispose of any resources before a
   * new panel is rendered.
   */
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

  /**
   * Sync the browser hash with the currently active tool. The `suppressHash`
   * guard prevents the hashchange handler from re-triggering navigation when we
   * programmatically update the hash.
   */
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
