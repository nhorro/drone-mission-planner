import { Pager } from './ui/pager.js';

function createBus() {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    off(event, handler) {
      const set = listeners.get(event);
      if (!set) return;
      set.delete(handler);
      if (!set.size) listeners.delete(event);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      set.forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error('Bus handler error for', event, err);
        }
      });
    }
  };
}

function init() {
  ModeController.init();
  MapView.init();
  MapView.renderPlan(State.getPlan());

  const bus = createBus();
  new Pager(State, bus);

  State.onChange((plan) => {
    MapView.renderPlan(plan);
  });
}

init();
