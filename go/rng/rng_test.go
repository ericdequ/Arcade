package rng

import (
	"math"
	"testing"
)

// Reference values captured from the JS @ric/arcade rng (seed "room42").
// Locking these proves Go and JS produce identical sequences → cross-language
// lockstep multiplayer.
func TestJSParity(t *testing.T) {
	if got := HashSeed("room42"); got != 3345946216 {
		t.Fatalf("HashSeed(room42) = %d, want 3345946216", got)
	}
	r := New("room42")
	want := []float64{
		0.9784580408595502,
		0.6606142956297845,
		0.20666133984923363,
		0.6612570944707841,
		0.04955979040823877,
	}
	for i, w := range want {
		if got := r.Next(); math.Abs(got-w) > 1e-15 {
			t.Errorf("Next()[%d] = %v, want %v (JS parity)", i, got, w)
		}
	}

	r2 := New("room42")
	for i, w := range []int{97, 66, 20} {
		if got := r2.Int(100); got != w {
			t.Errorf("Int(100)[%d] = %d, want %d (JS parity)", i, got, w)
		}
	}
}

func TestDeterministicAndShuffle(t *testing.T) {
	a := New("x")
	b := New("x")
	for i := 0; i < 10; i++ {
		if a.Next() != b.Next() {
			t.Fatalf("same seed diverged at %d", i)
		}
	}
	deck := []int{1, 2, 3, 4, 5, 6, 7, 8}
	s1 := Shuffle(deck, New("seed"))
	s2 := Shuffle(deck, New("seed"))
	if len(s1) != 8 || s1[0] != s2[0] {
		t.Fatal("shuffle not deterministic")
	}
	if deck[0] != 1 {
		t.Fatal("shuffle mutated input")
	}
}
