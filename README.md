# Arcade

A deterministic, pluggable **party-game engine**. Games are pure data + pure
functions; a seeded RNG makes every match reproducible and enables **no-cloud
lockstep multiplayer**. Clone the repo and drop in your own games.

Home for the games refactored out of BEV's bar arcade — and the test bed for
[waves_worx](https://github.com/ericdequ/waves_worx) transports and RobotRic.

## Why deterministic

The engine owns a **seeded** RNG and applies actions in order, so two devices
that build a match with the same seed and exchange only *actions* compute
byte-identical state locally — multiplayer with **no server refereeing the
shuffle**. The seed comes from a shared value (a waves_worx pairing session), so
neither device picks the deck.

```js
import { games, createMatch } from '@ric/arcade';

const game = games.get('ride-the-bus');
const match = createMatch({ game, players: ['ana', 'ben'], seed: 'room-K7QF9M' });

match.view('ana');                          // what Ana may see
match.dispatch({ type: 'guess', payload: { guess: 'higher' }, playerId: 'ana' });
match.isOver();  match.result();
```

## No-cloud multiplayer (over waves_worx)

`joinMatch` runs the same match on every device, broadcasting actions over any
channel with `{ send, subscribe }` — exactly waves_worx's channel contract:

```js
import { joinMatch, seedFromSession, games } from '@ric/arcade';
// after a waves_worx pairing handshake gives you `session`:
const seed = seedFromSession(session, 'ride-the-bus');
const me = joinMatch({ game: games.get('ride-the-bus'), players, seed, me: 'ana', channel });
me.play('guess', { guess: 'higher' });      // applied locally + sent to peers
```

Every peer's local engine converges to identical state from the action stream
alone (proven in `test/transport.test.mjs`).

## Add your own game

A game is one `defineGame()` call. Drop a file in `src/games/`, register it:

```js
import { defineGame } from '@ric/arcade/engine';

export const myGame = defineGame({
  id: 'my-game',
  minPlayers: 2,
  setup: ({ players, rng }) => ({ deck: rng.shuffle(/* … */), turn: 0 }),
  reducers: {
    play: (state, payload, { playerId, rng }) => ({ /* next state */ }),
  },
  view: (state, playerId) => ({ /* what this player sees — hide secrets */ }),
  isOver: (state) => /* … */,
  result: (state) => /* … */,
});
```

Use `rng` (never `Math.random`) so your game stays deterministic and works in
lockstep multiplayer for free.

## Bundled games

| id | players | from |
|----|---------|------|
| `higher-lower` | 1–8 | minimal engine example |
| `ride-the-bus` | 1–8 | BEV bar arcade |
| `ring-of-fire` | 2–12 | BEV bar arcade |

## API

- `makeRng(seed)` — seeded PRNG: `next/int/range/pick/shuffle/fork`
- `standardDeck()`, `buildDeck()`, `draw()`, `deal()` — card primitives
- `defineGame()`, `GameRegistry`, `games`, `createMatch()`, `replayMatch()`
- `joinMatch()`, `seedFromSession()` — lockstep transport

## Test

```bash
npm test   # 11 cases: rng determinism, deck integrity, engine rules,
           # replay parity, and two-device lockstep convergence
```
