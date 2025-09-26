import { Pager } from './ui/pager.js';

/**
 * Very small publish/subscribe hub used to share events between lazily loaded
 * feature modules without forcing them to import one another.
 */
function createBus() {
  const listeners = new Map();
  return {
    /**
     * Register a handler for a particular event and return an unsubscribe
     * function so callers can clean up when a panel is destroyed.
     */
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    /**
     * Remove a specific handler. If no handlers remain for an event the entry
     * is removed from the map to keep memory usage low.
     */
    off(event, handler) {
      const set = listeners.get(event);
      if (!set) return;
      set.delete(handler);
      if (!set.size) listeners.delete(event);
    },
    /**
     * Dispatch an event to all listeners. Each handler runs inside a try/catch
     * so one failure does not prevent other listeners from receiving the
     * message.
     */
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

/**
 * Bootstraps the legacy global services (MapView, State, ModeController) and
 * then hands control to the pager so feature panels can be loaded on demand.
 */
function initSplashScreen() {
  const splash = document.getElementById('splashScreen');
  const dismiss = document.getElementById('splashDismiss');
  if (!splash || !dismiss) return;

  const media = splash.querySelector('.splash-media');
  const mediaImg = media?.querySelector('img');

  if (media && mediaImg) {
    const activateMedia = () => {
      if (mediaImg.naturalWidth > 0) {
        media.classList.add('has-image');
      }
    };

    if (mediaImg.complete) {
      activateMedia();
    } else {
      mediaImg.addEventListener('load', activateMedia, { once: true });
    }

    mediaImg.addEventListener('error', () => {
      media.classList.remove('has-image');
    });
  }

  const hide = () => {
    splash.classList.add('hidden');
  };

  dismiss.addEventListener('click', hide);
  splash.addEventListener('click', (event) => {
    if (event.target === splash) hide();
  });
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

initSplashScreen();
init();
