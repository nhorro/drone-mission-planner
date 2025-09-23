export class OrthoController {
  constructor(store, bus) {
    this.store = store;
    this.bus = bus;
    this.root = null;
    this.cleanup = [];
  }

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

  async unmount() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.root = null;
  }

  dispose() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.root = null;
  }

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
