# Drone Mission Planner – Developer Guide

This document provides an overview of the application's runtime architecture and guidance on where to make changes when implementing new features or fixing bugs. Use it as a starting point before diving into the source.

## High-level architecture

The app is a vanilla JavaScript single-page experience delivered from the `public/` directory. `public/index.html` bootstraps the environment by loading core scripts (`model.js`, `state.js`, `geo.js`, `map.js`, `actions.js`, `wpml.js`, and UI helpers) as classic scripts so their globals are immediately available, and finally loads `app.js` as an ES module entry point.【F:public/index.html†L1-L114】 The ES module is responsible for wiring the runtime together after all globals have been defined.

### Runtime flow

1. **App entry (`public/app.js`)** – Creates a lightweight event bus, initializes the mode controller and map, and instantiates the pager shell once the shared `State` singleton is ready.【F:public/app.js†L1-L41】
2. **State management (`public/state.js`)** – Exposes the global `State` API backed by `Model`. It manages undo/redo stacks, validation constants, persistence to `localStorage`, and publishes plan updates to subscribers (including the map renderer and feature panels).【F:public/state.js†L1-L178】
3. **Model & geometry (`public/model.js`, `public/geo.js`)** – Handle plan data structures and calculations (flight totals, geometry helpers). These are consumed by `State`, `MapView`, and feature controllers.
4. **Map layer (`public/map.js`)** – Owns the Leaflet map instance, renders placemarks/POIs/zones from `State`, and responds to user interactions routed through the active mode.【F:public/map.js†L1-L112】
5. **Mode controller (`public/ui/mode-controller.js`)** – Switches between waypoint, POI, and zone editing modes, coordinating UI state with `MapView` and `State`.【F:public/ui/mode-controller.js†L1-L76】
6. **Pager shell (`public/ui/pager.js`)** – Renders the tabbed side panel. Each tab corresponds to a lazy-loaded feature module under `public/features/` that provides its own HTML panel and controller lifecycle hooks.【F:public/ui/pager.js†L1-L118】

### `State` vs `Model`

`State` is the mutable façade exposed to the rest of the UI. It orchestrates undo/redo, persists autosaves, tracks the active selection, and broadcasts plan changes via `onChange` subscribers.【F:public/state.js†L1-L178】 `Model` (see `public/model.js`) holds the normalized mission data and pure operations that mutate it (adding, updating, deleting placemarks/POIs/zones). `State` delegates to these helpers and then emits notifications so the map, feature panels, and totals stay in sync. Adjust `Model` when you need to change how data is stored or validated; adjust `State` when you need to alter lifecycle behavior (undo, selection, persistence, notification timing).

## Feature modules

Feature directories live in `public/features/<feature-name>/`. Each module exports a default object with a `panelUrl` (resolved via `import.meta.url`) and an `init(store, bus)` factory. The factory may return lifecycle hooks (`activate`, `deactivate`, `destroy`) that the pager invokes when tabs are switched.【F:public/features/waypoints/index.js†L1-L21】 Panels are plain HTML fragments stored alongside the controller, fetched on demand to keep the initial payload small.

### Waypoints feature

`public/features/waypoints/controller.js` implements the bulk of the UI formerly embedded in `index.html`. It:
- Mounts the fetched panel markup into `#toolPanel` via `mount()`.
- Binds DOM events for waypoint/POI/zone lists, settings modals, and export buttons.
- Talks to the shared `State` singleton to read or update mission data and to the event `bus` for cross-feature communication.
- Subscribes to `State.onChange` so UI lists stay in sync with the plan model.

Because this controller centralizes most interactions with plan data, bug fixes that previously touched the inline scripts now live here.

### Orthomosaic stub

`public/features/ortho/` currently provides a placeholder panel. It demonstrates the minimal structure needed for additional tools (async `init`, optional lifecycle hooks, and a standalone HTML panel). Future features should mirror this layout.

## Adding a new tool tab

1. Create a new directory under `public/features/` with `index.js`, `controller.js`, and `panel.html` files.
2. Export `{ panelUrl, init(store, bus) }` from `index.js`. Use `new URL('./panel.html', import.meta.url)` to ensure the HTML can be fetched when the feature activates.
3. Implement a controller that receives the shared `State` and event `bus`. Provide `activate/deactivate/destroy` if setup or teardown work is required.
4. Register the feature key in `featureRegistry` inside `public/ui/pager.js` and add a matching tab button in `public/index.html` with `data-tool="<key>"`.
5. If the feature needs persistent state, subscribe to `State.onChange` rather than polling, and push plan mutations through the `State` API so undo/redo and persistence stay consistent.

## Working with shared services

- **Event bus** – Created in `app.js`, the bus provides `on`, `off`, and `emit` methods for decoupled communication between features.【F:public/app.js†L1-L41】 Register listeners early (for example inside a feature controller's `init`) and keep the disposer returned by `on` so you can unsubscribe when a tab deactivates.
- **Map interactions** – All map drawing and mouse handling should go through `MapView` (`public/map.js`). Add dedicated adapter methods there instead of manipulating Leaflet directly from features.【F:public/map.js†L1-L112】
- **Globals from classic scripts** – Because many legacy modules attach themselves to `window`, import order in `index.html` matters. When refactoring, ensure new dependencies are either converted to ES modules or loaded before the code that consumes them.【F:public/index.html†L1-L114】

### Publishing & subscribing on the bus

The bus supports simple topic strings. Calling `bus.on(topic, handler)` registers a subscriber and returns an `unsubscribe` function. `bus.emit(topic, payload)` synchronously invokes each handler. Example:

```js
// In feature A
const stop = bus.on('ortho:generate', (payload) => {
  console.log('Create tiles with', payload);
});

// Later, to clean up when the feature deactivates
stop();

// In feature B
bus.emit('ortho:generate', { altitude: 120, overlap: 70 });
```

The orthomosaic stub demonstrates publishing an event when the user clicks its Generate button.【F:public/features/ortho/controller.js†L1-L41】 Consumers in other tabs can listen for `ortho:generate` and react without creating circular dependencies.

### Example interaction flows

1. **Adding geometry from the map**
   1. Leaflet raises a `click` event; `MapView` forwards the location to `window.onMapAddAt` (if defined).【F:public/map.js†L17-L38】
   2. `ModeController` assigns `window.onMapAddAt` to `handleMapAddAt`, which branches on the active mode to call `State.addPlacemark`, `State.addPOI`, or append to the in-progress zone draft before updating the map.【F:public/ui/mode-controller.js†L21-L64】
   3. `State` mutates the `Model`, pushes to the undo stack, and runs `notify()`, which iterates `onChange` subscribers and asks `MapView` to render the fresh plan.【F:public/state.js†L20-L116】
   4. The waypoints controller listens via `store.onChange` to re-render list views, stats, and selection markers so the UI reflects the new point.【F:public/features/waypoints/controller.js†L520-L559】

2. **Responding to bus events**
   1. A feature registers interest in a topic during `init` and stores the disposer: `this.stopListening = bus.on('ortho:generate', payload => { ... })`.
   2. Another feature (or background service) emits with `bus.emit('ortho:generate', payload)`. The bus iterates current listeners synchronously, guarding against handler errors so one subscriber cannot break others.【F:public/app.js†L1-L27】
   3. When a feature deactivates, call the stored disposer or `bus.off(topic, handler)` so dormant tabs do not react to future events.

3. **Updating panels after a state change**
   1. A UI control inside `public/features/waypoints/controller.js` calls a `State` mutator such as `updatePlacemark(index, patch)` or `handlePoiChange()` (which forwards changes to the store).【F:public/features/waypoints/controller.js†L60-L125】【F:public/features/waypoints/controller.js†L170-L213】
   2. `State` updates the underlying `Model`, pushes an undo snapshot, and triggers `notify()` to broadcast the new plan.【F:public/state.js†L52-L116】
   3. The controller's `render()` runs, refreshing lists, stats, and focus helpers (e.g., `MapView.focusPlacemark`) to keep the UI synchronized.【F:public/features/waypoints/controller.js†L520-L559】

### Swapping Leaflet for another map provider

All map interactions are funneled through the global `MapView` adapter. Feature controllers never reach into Leaflet directly; they call `MapView.init()`, `MapView.renderPlan(plan)`, `MapView.setZoneDraft(vertices)`, and focus helpers exposed on `window` by `public/map.js`.【F:public/app.js†L29-L41】【F:public/map.js†L1-L112】 To migrate to Mapbox GL (or another provider):

1. Reimplement the internals of `public/map.js` using the new SDK while preserving the exported `MapView` API (initialization, plan rendering, focus methods, zone draft overlay, and event wiring to `window.onMap...` callbacks).
2. Update tile-layer setup to use the provider's base maps, but keep emitting `mousemove`, `click`, and drag events that invoke the existing global callbacks so `ModeController` continues to work unchanged.【F:public/ui/mode-controller.js†L21-L64】
3. Ensure markers, polylines, and polygons keep the same semantic responsibilities (`placemarks`, `pois`, `zones`). As long as the adapter returns the same data to `MapView.renderPlan`, the rest of the application (state store, feature controllers, pager) remains unaffected.

## Testing & local development

- Install dependencies with `npm install` (already done in this repo).
- Run the automated test suite with `npm test -- --runInBand` (Jest). Tests live under `__tests__/` and `tests/`.
- Use `serve.sh` or your preferred static server to host the `public/` directory during manual QA.

Keeping these conventions in mind will help new contributors extend the planner without reintroducing the tightly coupled inline scripts we just removed.
