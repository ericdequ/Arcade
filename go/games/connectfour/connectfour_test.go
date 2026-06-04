package connectfour

import (
	"testing"

	"github.com/ericdequ/Arcade/go/engine"
)

func drop(p string, col int) engine.Action {
	return engine.Action{Type: "drop", Payload: map[string]any{"col": col}, PlayerID: p}
}

func TestVerticalWin(t *testing.T) {
	m := engine.NewMatch[State](New(), []string{"x", "o"}, "seed", nil)
	moves := []engine.Action{drop("x", 0), drop("o", 1), drop("x", 0), drop("o", 1), drop("x", 0), drop("o", 1), drop("x", 0)}
	for _, mv := range moves {
		if m.IsOver() {
			break
		}
		m.Dispatch(mv)
	}
	if !m.IsOver() || m.State().Winner != "x" {
		t.Fatalf("want x to win, got winner=%q over=%v", m.State().Winner, m.IsOver())
	}
}

func TestOutOfTurnIgnored(t *testing.T) {
	m := engine.NewMatch[State](New(), []string{"x", "o"}, "seed", nil)
	before := m.State().Turn
	m.Dispatch(drop("o", 0)) // not o's turn
	if m.State().Turn != before {
		t.Fatal("out-of-turn move should be ignored")
	}
}

func TestReplayReproducesState(t *testing.T) {
	m := engine.NewMatch[State](New(), []string{"x", "o"}, "seed", nil)
	for _, mv := range []engine.Action{drop("x", 3), drop("o", 3), drop("x", 4)} {
		m.Dispatch(mv)
	}
	r := engine.Replay[State](New(), []string{"x", "o"}, "seed", nil, m.Log())
	if r.State().Grid[5][3] != "x" || r.State().Grid[4][3] != "o" || r.State().Grid[5][4] != "x" {
		t.Fatal("replay did not reproduce the board")
	}
}
