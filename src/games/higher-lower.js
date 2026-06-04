// =============================================================================
// Arcade game — Higher or Lower
// =============================================================================
// The minimal worked example of the engine. A shared shuffled deck; on your
// turn you guess whether the next card is higher or lower than the last. Right
// = +1 streak, wrong = your streak resets and you take a drink. Pure +
// deterministic: every device with the same seed sees the same cards.
// =============================================================================

import { defineGame } from '../engine.js';
import { standardDeck } from '../cards.js';

export const higherLower = defineGame({
  id: 'higher-lower',
  title: 'Higher or Lower',
  minPlayers: 1,
  maxPlayers: 8,

  setup({ players, rng }) {
    const deck = rng.shuffle(standardDeck());
    return {
      deck,
      shown: deck[0], // first card face-up
      index: 1,
      turn: 0,
      players,
      streaks: Object.fromEntries(players.map((p) => [p, 0])),
      drinks: Object.fromEntries(players.map((p) => [p, 0])),
      last: null,
    };
  },

  reducers: {
    // payload: { guess: 'higher' | 'lower' }
    guess(state, payload, { playerId }) {
      const me = playerId ?? state.players[state.turn];
      const next = state.deck[state.index];
      if (!next) return { ...state, last: { reason: 'deck-empty' } };

      const higher = next.rank.value > state.shown.rank.value;
      const lower = next.rank.value < state.shown.rank.value;
      const correct = (payload?.guess === 'higher' && higher) || (payload?.guess === 'lower' && lower);

      const streaks = { ...state.streaks, [me]: correct ? state.streaks[me] + 1 : 0 };
      const drinks = { ...state.drinks };
      if (!correct) drinks[me] = (drinks[me] ?? 0) + 1;

      return {
        ...state,
        shown: next,
        index: state.index + 1,
        turn: (state.turn + 1) % state.players.length,
        streaks,
        drinks,
        last: { player: me, guess: payload?.guess, card: next, correct },
      };
    },
  },

  view: (state) => ({
    shown: state.shown,
    turnPlayer: state.players[state.turn],
    streaks: state.streaks,
    drinks: state.drinks,
    cardsLeft: state.deck.length - state.index,
    last: state.last,
  }),

  isOver: (state) => state.index >= state.deck.length,
  result: (state) => ({ streaks: state.streaks, drinks: state.drinks }),
});
