# @ric/arcade — Go

`github.com/ericdequ/Arcade/go` — the Go build of Arcade. Import the engine, the
primitives, or a single game on its own:

```go
import (
    "github.com/ericdequ/Arcade/go/engine"
    "github.com/ericdequ/Arcade/go/games/connectfour"
)

m := engine.NewMatch[connectfour.State](connectfour.New(), []string{"x", "o"}, "room-K7QF9M", nil)
m.Dispatch(engine.Action{Type: "drop", Payload: map[string]any{"col": 3}, PlayerID: "x"})
m.IsOver()  // m.State().Winner
```

## Packages

| import path | what |
|-------------|------|
| `…/go/rng` | seedable mulberry32 PRNG — **byte-identical to the JS rng** |
| `…/go/cards` | standard 52-card deck (unified shape) + shuffle + blackjack |
| `…/go/engine` | generic deterministic runtime: `Game[S]` + `Match[S]` |
| `…/go/games/connectfour` | Connect Four (RobotRic's CollapseFour) |

## Cross-language lockstep

`rng` matches the JavaScript `@ric/arcade` rng exactly (same FNV-1a seed hash,
same mulberry32 step — locked by a parity test against captured JS values). So a
Go client and a JS client that seed from the same value (e.g. a waves_worx
pairing session) shuffle the same deck and reach the same state from the same
actions — **multiplayer across languages, no server.**

## Add a game

Implement `engine.Game[S]` for your state type `S` (Setup / Reduce / IsOver) and
put it under `games/yourgame/`. Use the injected `*rng.RNG` (never a global) to
stay deterministic and lockstep-ready.

```bash
go test ./...
```
