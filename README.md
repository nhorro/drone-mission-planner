# Drone Mission Planner

This is a static web application for offline planning of drone missions. It was written to overcome the limitation in DJI Mini 4 Pro in which missions have to be planned in the DJI Go Fly App with the drone connected, which makes it impractical. 

![Screenshot](./doc/assets/screenshot.png)

Screenshot: trajectory and main POIs of [Isla Huemul](https://es.wikipedia.org/wiki/Isla_Huemul) in San Carlos de Bariloche, Argentina.

## Roadmap

- [x] Basic application skeleton.
- [x] Basic operations: editing waypoints and POIs.
- [x] Save / load trajectories in simplified format (JSON).
- [ ] Export to WPML.
- [ ] Generate trajectories for orthomosaic.

## Instructions

Serve with any web server. For example, python's `http.server`:

~~~bash
python3 -m http.server -d public 8000
~~~

## Exporting to DJI Mini 4 Pro WPML

This is currently WIP. See [reverse engineering of generated WPML](./doc/WPMLReverseEngineering.md).