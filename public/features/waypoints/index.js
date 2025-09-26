import { WaypointsController } from './controller.js';

// Static HTML partial served for the feature panel.
const panelUrl = new URL('./panel.html', import.meta.url).toString();

export default {
  panelUrl,
  /**
   * Initialise the feature and hand its lifecycle hooks back to the pager.
   */
  async init(store, bus) {
    const ctrl = new WaypointsController(store, bus);
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
