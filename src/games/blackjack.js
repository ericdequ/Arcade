// =============================================================================
// Arcade game — Blackjack
// =============================================================================
// The deck-logic showcase: a seeded shuffled deck, hit/stand, dealer plays to
// 17, aces flex via cards.blackjackValue. Each move emits card-animation
// descriptors (anim.js) so the table deals/flips/sweeps with consistent motion.
// Deterministic → same seed deals the same shoe on every device.
// =============================================================================

import { defineGame } from '../engine.js';
import { standardDeck, blackjackValue } from '../cards.js';
import { dealSequence, deal, flip, collect } from '../anim.js';

const value = blackjackValue;

export const blackjack = defineGame({
  id: 'blackjack',
  title: 'Blackjack',
  minPlayers: 1,
  maxPlayers: 1,

  setup({ rng }) {
    const deck = rng.shuffle(standardDeck());
    const player = [deck[0], deck[2]];
    const dealer = [deck[1], deck[3]];
    return {
      deck,
      index: 4,
      player,
      dealer,
      phase: 'player', // player → dealer → done
      result: null, // 'player' | 'dealer' | 'push'
      // Opening deal: player face-up, dealer's hole card face-down.
      anim: [
        ...dealSequence([player[0].id, dealer[0].id, player[1].id], { to: 'table' }),
        deal(dealer[1].id, { to: 'dealer', faceUp: false, delayMs: 3 * 70 }),
      ],
    };
  },

  reducers: {
    hit(state) {
      if (state.phase !== 'player') return state;
      const card = state.deck[state.index];
      const player = [...state.player, card];
      const busted = value(player) > 21;
      return {
        ...state,
        player,
        index: state.index + 1,
        phase: busted ? 'done' : 'player',
        result: busted ? 'dealer' : null,
        anim: [deal(card.id, { to: 'player' })],
      };
    },

    stand(state) {
      if (state.phase !== 'player') return state;
      // Dealer reveals the hole card, then draws to 17.
      const dealer = [...state.dealer];
      const anim = [flip(dealer[1].id, { faceUp: true })];
      let i = state.index;
      while (value(dealer) < 17) {
        const card = state.deck[i++];
        dealer.push(card);
        anim.push(deal(card.id, { to: 'dealer' }));
      }
      const p = value(state.player);
      const d = value(dealer);
      let result = 'push';
      if (d > 21 || p > d) result = 'player';
      else if (d > p) result = 'dealer';
      anim.push(...[...state.player, ...dealer].map((c) => collect(c.id)));
      return { ...state, dealer, index: i, phase: 'done', result, anim };
    },
  },

  view: (state) => ({
    player: state.player,
    playerTotal: value(state.player),
    // Hide the dealer's hole card + total while the player is still acting.
    dealer: state.phase === 'player' ? [state.dealer[0], { hidden: true }] : state.dealer,
    dealerTotal: state.phase === 'player' ? null : value(state.dealer),
    phase: state.phase,
    result: state.result,
    anim: state.anim,
  }),

  isOver: (state) => state.phase === 'done',
  result: (state) => ({ result: state.result, playerTotal: value(state.player), dealerTotal: value(state.dealer) }),
});
