// =============================================================================
// Arcade game — Snake (RobotRic, engine form)
// =============================================================================
// Real-time games fit the deterministic engine via two actions: `turn` (input)
// and `tick` (the host advances on an interval). Food spawns from the seeded
// rng, so the same seed + same turn/tick stream replays identically — and two
// devices can race the SAME board in lockstep. Ported from RobotRic's Snake
// (20×20 grid, +10 per food).
// =============================================================================

import { defineGame } from '../engine.js';

const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const opposite = (a, b) => a.x === -b.x && a.y === -b.y;
const eq = (a, b) => a.x === b.x && a.y === b.y;

function spawnFood(snake, size, rng) {
  const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
  const free = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!occupied.has(`${x},${y}`)) free.push({ x, y });
  return free.length ? rng.pick(free) : null;
}

export const snake = defineGame({
  id: 'snake',
  title: 'Snake',
  minPlayers: 1,
  maxPlayers: 1,

  setup({ rng, options }) {
    const size = options?.size ?? 20;
    const c = Math.floor(size / 2);
    const body = [{ x: c, y: c }];
    return { size, snake: body, dir: DIRS.right, food: spawnFood(body, size, rng), alive: true, score: 0, ticks: 0 };
  },

  reducers: {
    // payload: { dir: 'up'|'down'|'left'|'right' }
    turn(state, payload) {
      const next = DIRS[payload?.dir];
      if (!next || !state.alive) return state;
      if (state.snake.length > 1 && opposite(next, state.dir)) return state; // no reversing
      return { ...state, dir: next };
    },

    tick(state, _payload, { rng }) {
      if (!state.alive) return state;
      const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };
      // Wall / self collision → dead.
      const hitWall = head.x < 0 || head.y < 0 || head.x >= state.size || head.y >= state.size;
      const hitSelf = state.snake.some((c) => eq(c, head));
      if (hitWall || hitSelf) return { ...state, alive: false, ticks: state.ticks + 1 };

      const ate = state.food && eq(head, state.food);
      const body = [head, ...state.snake];
      if (!ate) body.pop();
      return {
        ...state,
        snake: body,
        food: ate ? spawnFood(body, state.size, rng) : state.food,
        score: ate ? state.score + 10 : state.score,
        ticks: state.ticks + 1,
      };
    },
  },

  view: (state) => ({ size: state.size, snake: state.snake, food: state.food, alive: state.alive, score: state.score }),
  isOver: (state) => !state.alive,
  result: (state) => ({ score: state.score, length: state.snake.length, ticks: state.ticks }),
});
