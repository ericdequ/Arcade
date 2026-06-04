// =============================================================================
// Arcade game — Roulette (RobotRic Saloon, engine form)
// =============================================================================
// Single-zero (European) roulette. Players place bets, then `spin` draws a
// pocket from the seeded rng and pays out — so the wheel is provably fair and
// every device sees the same result for the same seed + action stream. Standard
// payouts (straight 35:1, even-money 1:1, dozen/column 2:1).
// =============================================================================

import { defineGame } from '../engine.js';

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const pocketColor = (n) => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

// Net multiplier (winnings on top of the returned stake) if the bet hits.
const PAYOUT = { straight: 35, red: 1, black: 1, even: 1, odd: 1, low: 1, high: 1, dozen: 2, column: 2 };

function wins(bet, n) {
  if (n === 0) return bet.type === 'straight' && bet.value === 0;
  switch (bet.type) {
    case 'straight': return bet.value === n;
    case 'red': return RED.has(n);
    case 'black': return !RED.has(n);
    case 'even': return n % 2 === 0;
    case 'odd': return n % 2 === 1;
    case 'low': return n >= 1 && n <= 18;
    case 'high': return n >= 19 && n <= 36;
    case 'dozen': return Math.ceil(n / 12) === bet.value; // value 1|2|3
    case 'column': return bet.value >= 1 && bet.value <= 3 && n % 3 === bet.value % 3; // col1=n%3==1, col2==2, col3==0
    default: return false;
  }
}

export const roulette = defineGame({
  id: 'roulette',
  title: 'Roulette',
  minPlayers: 1,
  maxPlayers: 8,

  setup({ players, options }) {
    const start = options?.startBalance ?? 100;
    return {
      players,
      balances: Object.fromEntries(players.map((p) => [p, start])),
      bets: [],
      last: null,
      history: [],
    };
  },

  reducers: {
    // payload: { type, value?, amount }
    bet(state, payload, { playerId }) {
      const me = playerId ?? state.players[0];
      const amount = Math.max(0, Math.floor(payload?.amount ?? 0));
      if (!amount || !PAYOUT[payload?.type] || state.balances[me] < amount) return state;
      return {
        ...state,
        balances: { ...state.balances, [me]: state.balances[me] - amount },
        bets: [...state.bets, { player: me, type: payload.type, value: payload.value, amount }],
      };
    },

    spin(state, _payload, { rng }) {
      const n = rng.int(37); // 0..36
      const color = pocketColor(n);
      const balances = { ...state.balances };
      const settled = state.bets.map((b) => {
        const won = wins(b, n);
        if (won) balances[b.player] += b.amount + b.amount * PAYOUT[b.type]; // stake back + winnings
        return { ...b, won };
      });
      return {
        ...state,
        balances,
        bets: [],
        last: { number: n, color, bets: settled },
        history: [...state.history, n].slice(-20),
      };
    },
  },

  view: (state) => ({ balances: state.balances, openBets: state.bets, last: state.last, history: state.history }),
  isOver: () => false, // the house never closes — end by leaving the match
  result: (state) => ({ balances: state.balances }),
});
