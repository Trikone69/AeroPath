const ROWS = 20;
const COLS = 30;
const grid = document.querySelector('#grid');
const start = [9, 0];
const goal = [9, 29];
const obstacles = new Set();
let algorithm = 'astar';
let pointMode = null;
let tool = 'draw';
let isPainting = false;
let lastPath = [];
let animationTimer = null;
let toastTimer = null;

const keyOf = (r, c) => `${r},${c}`;
function findRoute() {
  const startKey = keyOf(...start);
  const goalKey = keyOf(...goal);
  const distance = new Map([[startKey, 0]]);
  const parent = new Map();
  const explored = new Set();
  const queue = [{ point: start, score: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score);
    const { point } = queue.shift();
    const currentKey = keyOf(...point);
    if (explored.has(currentKey)) continue;
    explored.add(currentKey);
    if (currentKey === goalKey) {
      const path = [goal];
      let cursor = goalKey;
      while (cursor !== startKey) {
        cursor = parent.get(cursor);
        path.push(cursor.split(',').map(Number));
      }
      path.reverse();
      return { found: true, path, explored: explored.size, length: path.length - 1 };
    }
    const [r, c] = point;
    for (const next of [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]]) {
      const [nr, nc] = next;
      const nextKey = keyOf(nr, nc);
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || obstacles.has(nextKey) || explored.has(nextKey)) continue;
      const nextDistance = distance.get(currentKey) + 1;
      if (nextDistance >= (distance.get(nextKey) ?? Infinity)) continue;
      distance.set(nextKey, nextDistance);
      parent.set(nextKey, currentKey);
      const heuristic = algorithm === 'astar' ? Math.abs(nr - goal[0]) + Math.abs(nc - goal[1]) : 0;
      queue.push({ point: next, score: nextDistance + heuristic });
    }
  }
  return { found: false, path: [], explored: explored.size, length: 0 };
}
const cells = [];
for (let row = 0; row < ROWS; row += 1) {
  cells[row] = [];
  for (let col = 0; col < COLS; col += 1) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.dataset.row = row;
    cell.dataset.col = col;
    cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
    grid.append(cell);
    cells[row][col] = cell;
  }
}

function renderGrid() {
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
    const cell = cells[r][c];
    cell.className = 'cell';
    if (obstacles.has(keyOf(r, c))) cell.classList.add('obstacle');
    if (cell.dataset.explored === '1') cell.classList.add('explored');
    if (cell.dataset.path === '1') cell.classList.add('path');
    if (start[0] === r && start[1] === c) cell.className = 'cell start';
    if (goal[0] === r && goal[1] === c) cell.className = 'cell goal';
  }
  document.querySelector('#start-coord').textContent = `${String(start[1] + 1).padStart(2, '0')}, ${String(start[0] + 1).padStart(2, '0')}`;
  document.querySelector('#goal-coord').textContent = `${String(goal[1] + 1).padStart(2, '0')}, ${String(goal[0] + 1).padStart(2, '0')}`;
  document.querySelector('#obstacle-count').textContent = `${String(obstacles.size).padStart(2, '0')} CELLS`;
}

function clearResult() {
  clearInterval(animationTimer);
  lastPath = [];
  for (const row of cells) for (const cell of row) {
    delete cell.dataset.explored;
    delete cell.dataset.path;
  }
  document.querySelector('#metric-length').innerHTML = '—<small> steps</small>';
  document.querySelector('#metric-explored').textContent = '—';
  document.querySelector('#metric-distance').innerHTML = '—<small> m</small>';
  document.querySelector('#result-tag').textContent = 'AWAITING RUN';
  document.querySelector('#animate-button').disabled = true;
  document.querySelector('#map-state').innerHTML = 'FLIGHT ZONE <b>READY</b>';
  renderGrid();
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function paintAt(cell) {
  const r = Number(cell.dataset.row);
  const c = Number(cell.dataset.col);
  const key = keyOf(r, c);
  if ((start[0] === r && start[1] === c) || (goal[0] === r && goal[1] === c)) return;
  if (pointMode) {
    const point = pointMode === 'start' ? start : goal;
    const other = pointMode === 'start' ? goal : start;
    if (r === other[0] && c === other[1]) return;
    obstacles.delete(key);
    point[0] = r;
    point[1] = c;
    pointMode = null;
    document.querySelectorAll('.point-card').forEach(card => card.classList.remove('selected'));
    clearResult();
    return;
  }
  if (tool === 'draw') obstacles.add(key);
  else obstacles.delete(key);
  clearResult();
}

grid.addEventListener('pointerdown', event => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  event.preventDefault();
  if (pointMode) { paintAt(cell); return; }
  isPainting = true;
  grid.setPointerCapture(event.pointerId);
  paintAt(cell);
});
grid.addEventListener('pointerover', event => {
  const cell = event.target.closest('.cell');
  if (cell) document.querySelector('#coordinate').innerHTML = `X ${String(Number(cell.dataset.col) + 1).padStart(2, '0')} <b>/</b> Y ${String(Number(cell.dataset.row) + 1).padStart(2, '0')}`;
});
grid.addEventListener('pointermove', event => {
  if (!isPainting) return;
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.cell');
  if (cell && !obstacles.has(keyOf(Number(cell.dataset.row), Number(cell.dataset.col))) && tool === 'draw') paintAt(cell);
  else if (cell && obstacles.has(keyOf(Number(cell.dataset.row), Number(cell.dataset.col))) && tool === 'erase') paintAt(cell);
});
grid.addEventListener('pointerup', () => { isPainting = false; });
grid.addEventListener('pointercancel', () => { isPainting = false; });

document.querySelectorAll('.point-card').forEach((card, index) => card.addEventListener('click', () => {
  pointMode = index === 0 ? 'start' : 'goal';
  document.querySelectorAll('.point-card').forEach(item => item.classList.remove('selected'));
  card.classList.add('selected');
  toast(`Select a grid cell for ${pointMode === 'start' ? 'takeoff' : 'landing'}.`);
}));
document.querySelector('#reset-points').addEventListener('click', () => { start.splice(0, 2, 9, 0); goal.splice(0, 2, 9, 29); pointMode = null; clearResult(); });
document.querySelector('#obstacle-tool').addEventListener('click', () => setTool('draw'));
document.querySelector('#erase-tool').addEventListener('click', () => setTool('erase'));
function setTool(next) {
  tool = next;
  document.querySelector('#obstacle-tool').classList.toggle('active', tool === 'draw');
  document.querySelector('#erase-tool').classList.toggle('active', tool === 'erase');
  pointMode = null;
  document.querySelectorAll('.point-card').forEach(card => card.classList.remove('selected'));
}
document.querySelector('#clear-obstacles').addEventListener('click', () => { obstacles.clear(); clearResult(); });
document.querySelector('#randomize').addEventListener('click', () => {
  obstacles.clear();
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    if (Math.random() < 0.17 && !(row === start[0] && col === start[1]) && !(row === goal[0] && col === goal[1])) obstacles.add(keyOf(row, col));
  }
  clearResult();
});
document.querySelectorAll('.algorithm-option').forEach(button => button.addEventListener('click', () => {
  algorithm = button.dataset.algorithm;
  document.querySelectorAll('.algorithm-option').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#algorithm-description').textContent = algorithm === 'astar'
    ? 'A* uses distance to goal to prioritize promising routes.'
    : 'Dijkstra expands outward evenly until it reaches the goal.';
  clearResult();
}));

async function runSearch() {
  const runButton = document.querySelector('#run-button');
  runButton.disabled = true;
  runButton.querySelector('span:nth-child(2)').textContent = 'Calculating route…';
  try {
    // Keep the planner usable on static hosts such as GitHub Pages.
    const result = findRoute();
    clearResult();
    for (const [r, c] of result.path) if (!(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) cells[r][c].dataset.path = '1';
    lastPath = result.path;
    document.querySelector('#metric-length').innerHTML = result.found ? `${result.length}<small> steps</small>` : '—<small> steps</small>';
    document.querySelector('#metric-explored').textContent = result.explored.toLocaleString();
    document.querySelector('#metric-distance').innerHTML = result.found ? `${(result.length * 1.2).toFixed(1)}<small> m</small>` : '—<small> m</small>';
    document.querySelector('#result-tag').textContent = result.found ? `${algorithm === 'astar' ? 'A*' : 'DIJKSTRA'} · ROUTE FOUND` : 'NO ROUTE FOUND';
    document.querySelector('#map-state').innerHTML = result.found ? 'FLIGHT ZONE <b>ROUTE LOCKED</b>' : 'FLIGHT ZONE <b>NO ROUTE</b>';
    for (const [r, c] of result.found ? result.path : []) cells[r][c].dataset.explored = '1';
    renderGrid();
    document.querySelector('#animate-button').disabled = !result.found;
    if (!result.found) toast('No route found. Clear a passage through the obstacles.');
  } catch (error) { toast(error.message || 'Route calculation failed.'); }
  finally { runButton.disabled = false; runButton.querySelector('span:nth-child(2)').textContent = 'Find optimal route'; }
}
document.querySelector('#run-button').addEventListener('click', runSearch);
document.querySelector('#animate-button').addEventListener('click', () => {
  if (!lastPath.length) return;
  clearInterval(animationTimer);
  for (const row of cells) for (const cell of row) delete cell.dataset.path;
  renderGrid();
  let index = 0;
  document.querySelector('#map-state').innerHTML = 'FLIGHT ZONE <b>IN FLIGHT</b>';
  animationTimer = setInterval(() => {
    const [r, c] = lastPath[index];
    if (!(r === start[0] && c === start[1]) && !(r === goal[0] && c === goal[1])) cells[r][c].dataset.path = '1';
    renderGrid();
    index += 1;
    if (index >= lastPath.length) {
      clearInterval(animationTimer);
      document.querySelector('#map-state').innerHTML = 'FLIGHT ZONE <b>MISSION COMPLETE</b>';
    }
  }, 35);
});
document.addEventListener('keydown', event => {
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (event.code === 'Space') { event.preventDefault(); runSearch(); }
  if (event.key.toLowerCase() === 'r') { obstacles.clear(); start.splice(0, 2, 9, 0); goal.splice(0, 2, 9, 29); clearResult(); }
  if (event.key.toLowerCase() === 'b') setTool('draw');
  if (event.key.toLowerCase() === 'e') setTool('erase');
});

renderGrid();
