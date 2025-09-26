export class OrthoController {
  /**
   * @param {State} store reference to the shared plan state
   * @param {Object} bus event bus used to emit `ortho:generate`
   */
  constructor(store, bus) {
    this.store = store;
    this.bus = bus;
    this.root = null;
    this.cleanup = [];
  }

  /**
   * Attach DOM listeners when the panel becomes visible.
   */
  async mount(rootSelector) {
    this.root = document.querySelector(rootSelector);
    if (!this.root) return;
    const button = this.root.querySelector('#orthoGenerate');
    if (button) {
      const handler = () => this.generate();
      button.addEventListener('click', handler);
      this.cleanup.push(() => button.removeEventListener('click', handler));
    }
  }

  /**
   * Remove listeners when another feature takes over the panel.
   */
  async unmount() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.root = null;
  }

  /**
   * Convenience alias for the pager's destroy lifecycle hook.
   */
  dispose() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.root = null;
  }

  /**
   * Collect form values and broadcast an orthomosaic generation request.
   */
  generate() {
    const alt = this.root?.querySelector('#orthoAlt');
    const overlap = this.root?.querySelector('#orthoOverlap');
    const payload = {
      altitude: alt ? Number(alt.value) : null,
      overlap: overlap ? Number(overlap.value) : null
    };
    this.bus.emit?.('ortho:generate', payload);
  }
}
