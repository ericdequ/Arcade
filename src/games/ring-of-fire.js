// =============================================================================
// Arcade game — Ring of Fire (Kings)
// =============================================================================
// Cards fan out in a ring; players draw one per turn and act out its rule
// ("two is you", "give to the left", …). Ported from BEV's ring-of-fire rules.
// The deck order is seeded, so the whole table draws the same sequence.
// =============================================================================

import { defineGame } from '../engine.js';
import { standardDeck } from '../deck.js';

// Rank → rule. The classic ruleset; override via options.rules.
export const DEFAULT_RULES = Object.freeze({
  A: 'Waterfall — everyone drinks',
  2: 'You — pick someone to drink',
  3: 'Me — you drink',
  4: 'Floor — last to touch the floor drinks',
  5: 'Guys drink',
  6: 'Chicks drink',
  7: 'Heaven — last to raise a hand drinks',
  8: 'Mate — pick a drinking buddy',
  9: 'Rhyme — say a word, go around rhyming',
  10: 'Categories — name things in a category',
  J: 'Make a rule',
  Q: 'Question master',
  K: 'Pour into the king’s cup',
});

export const ringOfFire = defineGame({
  id: 'ring-of-fire',
  title: 'Ring of Fire',
  minPlayers: 2,
  maxPlayers: 12,

  setup({ players, rng, options }) {
    return {
      deck: rng.shuffle(standardDeck()),
      index: 0,
      turn: 0,
      players,
      rules: { ...DEFAULT_RULES, ...(options?.rules ?? {}) },
      kingsDrawn: 0,
      last: null,
    };
  },

  reducers: {
    draw(state, _payload, { playerId }) {
      const me = playerId ?? state.players[state.turn];
      const card = state.deck[state.index];
      if (!card) return state;
      const rule = state.rules[card.rank.key] ?? '';
      const kingsDrawn = state.kingsDrawn + (card.rank.key === 'K' ? 1 : 0);
      return {
        ...state,
        index: state.index + 1,
        turn: (state.turn + 1) % state.players.length,
        kingsDrawn,
        last: { player: me, card, rule },
      };
    },
  },

  view: (state) => ({
    turnPlayer: state.players[state.turn],
    cardsLeft: state.deck.length - state.index,
    kingsDrawn: state.kingsDrawn,
    last: state.last,
  }),

  // The game ends when the 4th king is drawn (kings-cup tradition) or the ring
  // is exhausted.
  isOver: (state) => state.kingsDrawn >= 4 || state.index >= state.deck.length,
  result: (state) => ({ endedOnKing: state.kingsDrawn >= 4, cardsDrawn: state.index }),
});
