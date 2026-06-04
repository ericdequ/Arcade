// =============================================================================
// Arcade game — Ride the Bus
// =============================================================================
// On your turn you face four guesses off the seeded deck:
//   1 red-or-black · 2 higher/lower · 3 inside/outside · 4 suit
// Each correct guess advances you; a wrong one ends your turn and adds a drink.
// Clear all four to "get off the bus". Ported from BEV's ride-the-bus logic.
// =============================================================================

import { defineGame } from '../engine.js';
import { standardDeck } from '../cards.js';

const STAGES = ['color', 'highlow', 'insideout', 'suit'];

function check(stage, drawn, faceUp) {
  switch (stage) {
    case 'color': // payload.guess: 'red' | 'black'
      return (g) => (g === 'red') === drawn.suit.isRed;
    case 'highlow': // vs card 0
      return (g) => (g === 'higher' ? drawn.rank.value > faceUp[0].rank.value : drawn.rank.value < faceUp[0].rank.value);
    case 'insideout': {
      // between card 0 and card 1 (exclusive) or outside
      const [lo, hi] = [faceUp[0].rank.value, faceUp[1].rank.value].sort((a, b) => a - b);
      return (g) => (g === 'inside' ? drawn.rank.value > lo && drawn.rank.value < hi : drawn.rank.value < lo || drawn.rank.value > hi);
    }
    case 'suit': // payload.guess: a suit key
      return (g) => g === drawn.suit.key;
    default:
      return () => false;
  }
}

export const rideTheBus = defineGame({
  id: 'ride-the-bus',
  title: 'Ride the Bus',
  minPlayers: 1,
  maxPlayers: 8,

  setup({ players, rng }) {
    return {
      deck: rng.shuffle(standardDeck()),
      index: 0,
      players,
      turn: 0,
      stage: 0, // 0..3
      faceUp: [], // cards revealed this turn
      drinks: Object.fromEntries(players.map((p) => [p, 0])),
      offTheBus: Object.fromEntries(players.map((p) => [p, false])),
      last: null,
    };
  },

  reducers: {
    // payload: { guess }
    guess(state, payload, { playerId }) {
      const me = playerId ?? state.players[state.turn];
      const drawn = state.deck[state.index];
      if (!drawn) return state;

      const stageName = STAGES[state.stage];
      const correct = check(stageName, drawn, state.faceUp)(payload?.guess);
      const faceUp = [...state.faceUp, drawn];

      if (!correct) {
        // wrong → drink, reset this player's turn, pass on
        return {
          ...state,
          index: state.index + 1,
          stage: 0,
          faceUp: [],
          turn: (state.turn + 1) % state.players.length,
          drinks: { ...state.drinks, [me]: state.drinks[me] + state.stage + 1 },
          last: { player: me, stage: stageName, card: drawn, correct: false },
        };
      }

      const nextStage = state.stage + 1;
      const got = nextStage >= STAGES.length;
      return {
        ...state,
        index: state.index + 1,
        stage: got ? 0 : nextStage,
        faceUp: got ? [] : faceUp,
        turn: got ? (state.turn + 1) % state.players.length : state.turn,
        offTheBus: got ? { ...state.offTheBus, [me]: true } : state.offTheBus,
        last: { player: me, stage: stageName, card: drawn, correct: true, gotOff: got },
      };
    },
  },

  view: (state) => ({
    turnPlayer: state.players[state.turn],
    stage: STAGES[state.stage],
    faceUp: state.faceUp,
    drinks: state.drinks,
    offTheBus: state.offTheBus,
    cardsLeft: state.deck.length - state.index,
    last: state.last,
  }),

  isOver: (state) => Object.values(state.offTheBus).every(Boolean) || state.index >= state.deck.length,
  result: (state) => ({ drinks: state.drinks, offTheBus: state.offTheBus }),
});

export { STAGES };
