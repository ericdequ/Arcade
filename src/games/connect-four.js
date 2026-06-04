// =============================================================================
// Arcade game — Connect Four (RobotRic's CollapseFour, engine form)
// =============================================================================
// Two players drop tokens down columns; first to line up four wins. RobotRic's
// "CollapseFour" dresses this in quantum-measurement flavor, but the underlying
// game IS connect-four — so it slots straight onto the shared grid + engine.
// Deterministic (no rng needed) → trivially correct in lockstep multiplayer.
// =============================================================================

import { defineGame } from '../engine.js';
import { createGrid, dropToken, hasConnection, isGridFull } from '../grid.js';

export const connectFour = defineGame({
  id: 'connect-four',
  title: 'Connect Four',
  minPlayers: 2,
  maxPlayers: 2,

  setup({ players, options }) {
    const rows = options?.rows ?? 6;
    const cols = options?.cols ?? 7;
    return {
      grid: createGrid({ rows, cols }),
      players,
      turn: 0, // index into players
      winner: null,
      draw: false,
      last: null,
    };
  },

  reducers: {
    // payload: { col }
    drop(state, payload, { playerId }) {
      if (state.winner || state.draw) return state;
      const me = playerId ?? state.players[state.turn];
      if (me !== state.players[state.turn]) return state; // not your turn

      const { grid, row, col } = dropToken(state.grid, payload?.col, me);
      if (row < 0) return state; // illegal / full column — no-op

      const won = hasConnection(grid, row, col, me, 4);
      const full = isGridFull(grid);
      return {
        ...state,
        grid,
        turn: won || full ? state.turn : (state.turn + 1) % state.players.length,
        winner: won ? me : null,
        draw: !won && full,
        last: { player: me, row, col },
      };
    },
  },

  view: (state) => ({
    grid: state.grid,
    turnPlayer: state.players[state.turn],
    winner: state.winner,
    draw: state.draw,
    last: state.last,
  }),

  isOver: (state) => Boolean(state.winner) || state.draw,
  result: (state) => ({ winner: state.winner, draw: state.draw }),
});
