import { OrthoController } from './controller.js';

// Resolve the feature panel's HTML file relative to this module so the pager
// can fetch it regardless of the hosting environment.
const panelUrl = new URL('./panel.html', import.meta.url).toString();

export default {
  panelUrl,
  /**
   * Initialise the feature and expose lifecycle hooks expected by the pager.
   */
  async init(store, bus) {
    const ctrl = new OrthoController(store, bus);
    return {
      async activate() {
        await ctrl.mount('#toolPanel');
      },
      async deactivate() {
        await ctrl.unmount();
      },
      async destroy() {
        ctrl.dispose();
      }
    };
  }
};
