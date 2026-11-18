# Dubai City Stories

A game by **Hassan Ali**, set on the real map of Dubai. Built from the YYC City Stories engine.

The map is one continuous city in real coordinates, grown outward from Al Garhoud phase by phase
(see `tools/phases.json`). Phase 1: Al Garhoud and Dubai International Airport.

## Map data
- Streets, buildings, land use, water and the coastline: © OpenStreetMap contributors, Open Database Licence (ODbL)
- 3D engine: three.js (MIT)

## Building the map
`python tools/build_dubai.py` (needs `shapely`), or run the "Build the Dubai map" GitHub Action.
