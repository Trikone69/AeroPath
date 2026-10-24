# AeroPath

A grid-based drone path planning and obstacle avoidance simulator. The browser provides an interactive 30 × 20 flight zone and runs A* or Dijkstra locally, so the site works without a backend and can be hosted on GitHub Pages. The Python server provides a standalone Python implementation of both algorithms and serves the files locally.

Live site: <https://trikone69.github.io/AeroPath/>

## Run locally

Requires Python 3.9+; the server uses only the Python standard library.

```bash
python server.py
```

Open [http://localhost:8000](http://localhost:8000). Keep the terminal running while using the simulator. Or open `index.html` directly; browser pathfinding works without the Python server.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` publishes the static site whenever `main` or `master` receives a push. This repository is configured to use GitHub Actions as its Pages source. GitHub Actions publishes the site and reports its URL in the workflow run.

## Use the simulator

- Click **Draw obstacles** and drag across the grid to create no-fly cells. Choose **Erase obstacles** to remove them.
- Click a **Takeoff** or **Landing** card, then select a new grid cell.
- Add a random obstacle field or clear all obstacles.
- Choose A* or Dijkstra and select **Find optimal route**. The analysis shows path length, explored cells, and approximate distance (1.2 m per grid cell).
- Select **Animate flight** to replay the computed route.
- Keyboard shortcuts: `Space` runs the search, `B` draws obstacles, `E` erases, and `R` resets the grid and waypoints.

The grid uses four-direction movement. Both search algorithms return an optimal route for this movement model. A* uses Manhattan distance as its heuristic.

## Files

- `server.py` — static-file server and JSON pathfinding API.
- `index.html` — page structure and simulator controls.
- `styles.css` — responsive visual design.
- `app.js` — interactive grid, drawing tools, API integration, metrics, and animation.
