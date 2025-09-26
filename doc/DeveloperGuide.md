# Drone Mission Planner – Developer Guide

This document provides an overview of the application's runtime architecture and guidance on where to make changes when implementing new features or fixing bugs. Use it as a starting point before diving into the source.

## High-level architecture

The app is a vanilla JavaScript single-page experience delivered from the `public/` directory. `public/index.html` bootstraps the environment by loading core scripts (`model.js`, `state.js`, `geo.js`, `map.js`, `actions.js`, `wpml.js`, and UI helpers) as classic scripts so their globals are immediately available, and finally loads `app.js` as an ES module entry point.【F:public/index.html†L1-L114】 The ES module is responsible for wiring the runtime together after all globals have been defined.

### Runtime flow

1. **App entry (`public/app.js`)** – Creates a lightweight event bus, initializes the mode controller and map, and instantiates the pager shell once the shared `State` singleton is ready.【F:public/app.js†L1-L41】
2. **State management (`public/state.js`)** – Exposes the global `State` API backed by `Model`. It manages undo/redo stacks, validation constants, persistence to `localStorage`, and publishes plan updates to subscribers (including the map renderer and feature panels).【F:public/state.js†L1-L114】
3. **Model & geometry (`public/model.js`, `public/geo.js`)** – Handle plan data structures and calculations (flight totals, geometry helpers). These are consumed by `State`, `MapView`, and feature controllers.
4. **Map layer (`public/map.js`)** – Owns the Leaflet map instance, renders placemarks/POIs/zones from `State`, and responds to user interactions routed through the active mode.
5. **Mode controller (`public/ui/mode-controller.js`)** – Switches between waypoint, POI, and zone editing modes, coordinating UI state with `MapView` and `State`.
6. **Pager shell (`public/ui/pager.js`)** – Renders the tabbed side panel. Each tab corresponds to a lazy-loaded feature module under `public/features/` that provides its own HTML panel and controller lifecycle hooks.【F:public/ui/pager.js†L1-L118】

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

- **Event bus** – Created in `app.js`, the bus provides `on`, `off`, and `emit` methods for decoupled communication between features. Use it for cross-panel events (e.g., telling the map to draw a preview for a tool that lives in a different tab).【F:public/app.js†L1-L41】
- **Map interactions** – All map drawing and mouse handling should go through `MapView` (`public/map.js`). Add dedicated methods there instead of manipulating Leaflet directly from features.
- **Globals from classic scripts** – Because many legacy modules attach themselves to `window`, import order in `index.html` matters. When refactoring, ensure new dependencies are either converted to ES modules or loaded before the code that consumes them.

## Testing & local development

- Install dependencies with `npm install` (already done in this repo).
- Run the automated test suite with `npm test -- --runInBand` (Jest). Tests live under `__tests__/` and `tests/`.
- Use `serve.sh` or your preferred static server to host the `public/` directory during manual QA.

Keeping these conventions in mind will help new contributors extend the planner without reintroducing the tightly coupled inline scripts we just removed.
