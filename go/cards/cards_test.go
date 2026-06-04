package cards

import (
	"testing"

	"github.com/ericdequ/Arcade/go/rng"
)

func TestStandardDeck(t *testing.T) {
	deck := Standard()
	if len(deck) != 52 {
		t.Fatalf("deck len = %d, want 52", len(deck))
	}
	seen := map[string]bool{}
	for _, c := range deck {
		if seen[c.ID] {
			t.Fatalf("duplicate card %s", c.ID)
		}
		seen[c.ID] = true
	}
	// First card matches JS order (spades 2) for cross-language shuffle parity.
	if deck[0].ID != "2-spades" {
		t.Errorf("first card = %s, want 2-spades", deck[0].ID)
	}
}

func TestShuffleDeterministic(t *testing.T) {
	a := Shuffle(Standard(), rng.New("table"))
	b := Shuffle(Standard(), rng.New("table"))
	if a[0].ID != b[0].ID {
		t.Fatal("shuffle not deterministic for same seed")
	}
}

func TestBlackjack(t *testing.T) {
	deck := Standard()
	var ace, six Card
	for _, c := range deck {
		if c.Rank.ID == "ace" {
			ace = c
		}
		if c.Rank.ID == "6" {
			six = c
		}
	}
	if got := BlackjackValue([]Card{ace, six}); got != 17 {
		t.Errorf("ace+6 = %d, want 17", got)
	}
	if got := BlackjackValue([]Card{ace, six, six, six}); got != 19 {
		t.Errorf("ace flex = %d, want 19", got)
	}
}
