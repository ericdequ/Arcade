// Package engine is Arcade's deterministic game runtime in Go — the sibling of
// the JS engine. A game is a pure Game[S]; a Match[S] owns a seeded rng and
// applies actions in order, so the same seed + same action log reproduces the
// same state (and matches the JS engine when the game logic matches).
package engine

import "github.com/ericdequ/Arcade/go/rng"

// Action is one move.
type Action struct {
	Type     string         `json:"type"`
	Payload  map[string]any `json:"payload,omitempty"`
	PlayerID string         `json:"playerId,omitempty"`
}

// Ctx is passed to a game's Reduce.
type Ctx struct {
	RNG      *rng.RNG
	PlayerID string
	Players  []string
}

// Game is a pure, deterministic game over a state type S.
type Game[S any] interface {
	ID() string
	Setup(players []string, r *rng.RNG, options map[string]any) S
	Reduce(state S, action Action, ctx Ctx) S
	IsOver(state S) bool
}

// Match runs a Game deterministically.
type Match[S any] struct {
	game    Game[S]
	players []string
	rng     *rng.RNG
	state   S
	log     []Action
}

// NewMatch builds a match. Same (game, players, seed, options) + same dispatched
// actions ⇒ identical state on every device, in any language.
func NewMatch[S any](g Game[S], players []string, seed string, options map[string]any) *Match[S] {
	r := rng.New(seed)
	return &Match[S]{game: g, players: players, rng: r, state: g.Setup(players, r, options)}
}

// State returns the current full state.
func (m *Match[S]) State() S { return m.state }

// Players returns the ordered player ids.
func (m *Match[S]) Players() []string { return m.players }

// IsOver reports whether the game has ended.
func (m *Match[S]) IsOver() bool { return m.game.IsOver(m.state) }

// Log returns a copy of the applied action log (for replay / transport).
func (m *Match[S]) Log() []Action { return append([]Action(nil), m.log...) }

// Dispatch applies an action and records it.
func (m *Match[S]) Dispatch(a Action) S {
	if m.game.IsOver(m.state) {
		return m.state
	}
	m.state = m.game.Reduce(m.state, a, Ctx{RNG: m.rng, PlayerID: a.PlayerID, Players: m.players})
	m.log = append(m.log, a)
	return m.state
}

// Replay rebuilds a match by re-applying an action log.
func Replay[S any](g Game[S], players []string, seed string, options map[string]any, log []Action) *Match[S] {
	m := NewMatch(g, players, seed, options)
	for _, a := range log {
		m.Dispatch(a)
	}
	return m
}
