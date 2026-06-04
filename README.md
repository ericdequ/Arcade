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

## Two layers: engine + catalog

Arcade unifies BEV's bar games and RobotRic's arcade into one library:

- **Engine** — playable, deterministic, multiplayer-ready games (`defineGame`).
- **Catalog** — manifests for browsing/launching *every* game. A manifest's
  `launch` is `engine` (playable in-app, linked by `engineId`), `iframe` (a
  Scratch embed), or `route` (an app page renders it, e.g. a canvas Snake).

```js
import { catalog, games, createMatch } from '@ric/arcade';

catalog.list();                       // every game (browse the arcade)
catalog.list({ tag: 'cards' });       // filter by tag/collection/launch/source
const m = catalog.get('collapse-four'); // RobotRic's quantum connect-four…
createMatch({ game: games.get(m.engineId), players, seed }); // …plays on the shared engine
```

RobotRic's branded games (`collapse-four`, `lll`, `ring-of-fire`) keep their
names, thumbnails, and routes while reusing the shared playable engines.

## Bundled engine games

| id | players | from |
|----|---------|------|
| `higher-lower` | 1–8 | minimal engine example |
| `ride-the-bus` | 1–8 | BEV bar arcade |
| `ring-of-fire` | 2–12 | BEV bar arcade |
| `connect-four` | 2 | RobotRic CollapseFour |
| `blackjack` | 1 | deck-logic + card-animation showcase |
| `snake` | 1 | RobotRic Snake (grid, tick/turn → lockstep) |
| `roulette` | 1–8 | RobotRic Saloon (seeded European wheel) |

Plus the RobotRic catalog (Scratch embeds, dev games) via `robotricGames`.

### Card animations

Card games emit framework-agnostic **animation descriptors** (`anim.js`) so
every table deals/flips/sweeps with consistent motion — `dealSequence` staggers
a hand, `flip`/`slide`/`collect` describe single moves, all timed by shared
`CARD_MOTION` tokens. The engine produces the card moves; feed the descriptors
to CSS / Web Animations / framer. Blackjack uses them end-to-end.

### Real-time games on a turn engine

`snake` shows how a real-time game fits the deterministic engine: `turn` (input)
+ `tick` (the host advances on an interval). Seeded food means two devices with
the same seed + tick stream race the **same board in lockstep**.

## API

- `makeRng(seed)` — seeded PRNG: `next/int/range/pick/shuffle/fork`
- `standardDeck()`, `createDeck()`, `draw()`, `deal()`, `compareRanks()`, `blackjackValue()` — cards
- `createGrid()`, `dropToken()`, `hasConnection()`, `isGridFull()` — board/grid
- `defineGame()`, `GameRegistry`, `games`, `createMatch()`, `replayMatch()` — engine
- `joinMatch()`, `seedFromSession()` — lockstep transport
- `normalizeGame()`, `createCatalog()`, `mergeCollections()`, `catalog`, `robotricGames` — catalog

## Test

```bash
npm test   # 20 cases: rng determinism, unified card shape + blackjack,
           # grid/connect-four, catalog launch+engineId links, engine rules,
           # replay parity, and two-device lockstep convergence
```
