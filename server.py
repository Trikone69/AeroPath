"""AeroPath: small standard-library API and static-file server."""

from __future__ import annotations

import heapq
import json
import math
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
ROWS, COLS = 20, 30


def find_path(start: tuple[int, int], goal: tuple[int, int], blocked: set[tuple[int, int]], algorithm: str) -> dict[str, Any]:
    """Search a four-connected grid and report the route and explored count."""
    def heuristic(cell: tuple[int, int]) -> int:
        return abs(cell[0] - goal[0]) + abs(cell[1] - goal[1])

    frontier: list[tuple[float, int, tuple[int, int]]] = []
    sequence = 0
    heapq.heappush(frontier, (0, sequence, start))
    cost = {start: 0}
    parent: dict[tuple[int, int], tuple[int, int]] = {}
    visited: set[tuple[int, int]] = set()

    while frontier:
        _, _, current = heapq.heappop(frontier)
        if current in visited:
            continue
        visited.add(current)
        if current == goal:
            path = [goal]
            while path[-1] != start:
                path.append(parent[path[-1]])
            path.reverse()
            return {"found": True, "path": [list(p) for p in path], "explored": len(visited), "length": len(path) - 1}

        row, col = current
        for nxt in ((row - 1, col), (row, col + 1), (row + 1, col), (row, col - 1)):
            nr, nc = nxt
            if not (0 <= nr < ROWS and 0 <= nc < COLS) or nxt in blocked or nxt in visited:
                continue
            next_cost = cost[current] + 1
            if next_cost < cost.get(nxt, math.inf):
                cost[nxt] = next_cost
                parent[nxt] = current
                priority = next_cost + (heuristic(nxt) if algorithm == "astar" else 0)
                sequence += 1
                heapq.heappush(frontier, (priority, sequence, nxt))
    return {"found": False, "path": [], "explored": len(visited), "length": 0}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self) -> None:
        if self.path != "/api/path":
            self.send_error(404)
            return
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0"))))
            start = tuple(payload["start"])
            goal = tuple(payload["goal"])
            algorithm = payload.get("algorithm", "astar")
            obstacles = {tuple(p) for p in payload.get("obstacles", [])}
            for point in (start, goal):
                if len(point) != 2 or not (0 <= point[0] < ROWS and 0 <= point[1] < COLS):
                    raise ValueError("Start and goal must be inside the grid.")
            if algorithm not in {"astar", "dijkstra"}:
                raise ValueError("Choose A* or Dijkstra.")
            if start in obstacles or goal in obstacles:
                raise ValueError("Start and goal cannot be blocked.")
            result = find_path(start, goal, obstacles, algorithm)
            encoded = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            body = json.dumps({"error": str(exc)}).encode()
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    print("AeroPath is running at http://localhost:8000")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
