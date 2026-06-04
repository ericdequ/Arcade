// Package connectfour is Arcade's Connect Four (RobotRic's CollapseFour),
// importable on its own: github.com/ericdequ/Arcade/go/games/connectfour.
// Deterministic (no rng) → trivially correct in cross-language lockstep.
package connectfour

import (
	"github.com/ericdequ/Arcade/go/engine"
	"github.com/ericdequ/Arcade/go/rng"
)

// State is the board + turn tracking.
type State struct {
	Grid    [][]string `json:"grid"` // [row][col], "" = empty
	Players []string   `json:"players"`
	Turn    int        `json:"turn"`
	Winner  string     `json:"winner"`
	Draw    bool       `json:"draw"`
}

// Game implements engine.Game[State].
type Game struct {
	Rows, Cols int
}

// New returns a standard 6×7 Connect Four game.
func New() Game { return Game{Rows: 6, Cols: 7} }

func (g Game) ID() string { return "connect-four" }

func (g Game) Setup(players []string, _ *rng.RNG, opts map[string]any) State {
	rows, cols := g.Rows, g.Cols
	if rows == 0 {
		rows = 6
	}
	if cols == 0 {
		cols = 7
	}
	grid := make([][]string, rows)
	for r := range grid {
		grid[r] = make([]string, cols)
	}
	return State{Grid: grid, Players: players, Turn: 0}
}

func (g Game) Reduce(s State, a engine.Action, _ engine.Ctx) State {
	if a.Type != "drop" || s.Winner != "" || s.Draw {
		return s
	}
	me := a.PlayerID
	if me == "" {
		me = s.Players[s.Turn]
	}
	if me != s.Players[s.Turn] {
		return s // not your turn
	}
	col, ok := intArg(a.Payload, "col")
	if !ok || col < 0 || col >= len(s.Grid[0]) {
		return s
	}
	row := dropRow(s.Grid, col)
	if row < 0 {
		return s // column full
	}

	next := cloneGrid(s.Grid)
	next[row][col] = me
	won := hasConnection(next, row, col, me, 4)
	full := isFull(next)

	turn := s.Turn
	if !won && !full {
		turn = (s.Turn + 1) % len(s.Players)
	}
	winner := ""
	if won {
		winner = me
	}
	return State{Grid: next, Players: s.Players, Turn: turn, Winner: winner, Draw: !won && full}
}

func (g Game) IsOver(s State) bool { return s.Winner != "" || s.Draw }

// --- board helpers ---------------------------------------------------------

func dropRow(grid [][]string, col int) int {
	for r := len(grid) - 1; r >= 0; r-- {
		if grid[r][col] == "" {
			return r
		}
	}
	return -1
}

func cloneGrid(grid [][]string) [][]string {
	out := make([][]string, len(grid))
	for r := range grid {
		out[r] = append([]string(nil), grid[r]...)
	}
	return out
}

func isFull(grid [][]string) bool {
	for _, row := range grid {
		for _, c := range row {
			if c == "" {
				return false
			}
		}
	}
	return true
}

func countDir(grid [][]string, row, col int, tok string, dr, dc int) int {
	n := 0
	r, c := row+dr, col+dc
	for r >= 0 && r < len(grid) && c >= 0 && c < len(grid[0]) && grid[r][c] == tok {
		n++
		r += dr
		c += dc
	}
	return n
}

func hasConnection(grid [][]string, row, col int, tok string, length int) bool {
	dirs := [][2][2]int{
		{{0, 1}, {0, -1}},
		{{1, 0}, {-1, 0}},
		{{1, 1}, {-1, -1}},
		{{1, -1}, {-1, 1}},
	}
	for _, d := range dirs {
		if 1+countDir(grid, row, col, tok, d[0][0], d[0][1])+countDir(grid, row, col, tok, d[1][0], d[1][1]) >= length {
			return true
		}
	}
	return false
}

func intArg(payload map[string]any, key string) (int, bool) {
	v, ok := payload[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case int:
		return n, true
	case float64:
		return int(n), true
	default:
		return 0, false
	}
}
