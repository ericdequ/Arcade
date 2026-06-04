// =============================================================================
// Arcade — grid (drop-token / connect-N board)
// =============================================================================
// A rectangular board with gravity-drop columns and run detection, taken from
// RobotRic's grid logic. Powers Connect-Four-style games (CollapseFour) and is
// a handy base for any board game. Pure + immutable: drops return a new grid.
// =============================================================================

/** Create an rows×cols grid filled with `fill` (default null). */
export function createGrid({ rows, cols, fill = null }) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new TypeError('rows and cols must be positive integers');
  }
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

export const cloneGrid = (grid) => grid.map((row) => [...row]);

/** Lowest empty row in a column, or -1 if the column is full. */
export function findDropRow(grid, col, empty = null) {
  for (let row = grid.length - 1; row >= 0; row--) {
    if (grid[row][col] === empty) return row;
  }
  return -1;
}

/**
 * Drop a token into a column (gravity). Returns { grid, row, col } with a NEW
 * grid, or { grid, row: -1 } if the column is full or out of range.
 */
export function dropToken(grid, col, token, { empty = null } = {}) {
  if (col < 0 || col >= grid[0].length) return { grid, row: -1, col };
  const row = findDropRow(grid, col, empty);
  if (row < 0) return { grid, row: -1, col };
  const next = cloneGrid(grid);
  next[row][col] = token;
  return { grid: next, row, col };
}

function countDirection(grid, row, col, token, dr, dc) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] === token) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

/** True if placing `token` at (row,col) completes a run of `length` in any line. */
export function hasConnection(grid, row, col, token, length = 4) {
  const lines = [
    [[0, 1], [0, -1]], // horizontal
    [[1, 0], [-1, 0]], // vertical
    [[1, 1], [-1, -1]], // diagonal ↘↖
    [[1, -1], [-1, 1]], // diagonal ↙↗
  ];
  return lines.some(([a, b]) => 1 + countDirection(grid, row, col, token, ...a) + countDirection(grid, row, col, token, ...b) >= length);
}

/** True if no empty cells remain. */
export function isGridFull(grid, empty = null) {
  return grid.every((row) => row.every((cell) => cell !== empty));
}
