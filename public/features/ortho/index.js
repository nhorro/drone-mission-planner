import { OrthoController } from './controller.js';

const panelUrl = new URL('./panel.html', import.meta.url).toString();

export default {
  panelUrl,
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
