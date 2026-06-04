// Package cards is Arcade's deck primitive — a standard 52-card deck with the
// unified card shape (engine fields Value/IsRed/Key + RobotRic fields
// Order/NumericValue/Color), mirroring the JS @ric/arcade/cards module.
package cards

import "github.com/ericdequ/Arcade/go/rng"

// Suit of a card.
type Suit struct {
	ID    string `json:"id"`
	Key   string `json:"key"`
	Label string `json:"label"`
	Sym   string `json:"symbol"`
	Color string `json:"color"`
	IsRed bool   `json:"isRed"`
}

// Rank of a card. Order/Value are the high-card value (Ace = 14); NumericValue
// is the blackjack value.
type Rank struct {
	ID           string `json:"id"`
	Key          string `json:"key"`
	Label        string `json:"label"`
	Order        int    `json:"order"`
	Value        int    `json:"value"`
	NumericValue int    `json:"numericValue"`
}

// Card pairs a rank + suit with denormalized convenience fields.
type Card struct {
	ID    string `json:"id"`
	Suit  Suit   `json:"suit"`
	Rank  Rank   `json:"rank"`
	Value int    `json:"value"`
	IsRed bool   `json:"isRed"`
}

var suits = []Suit{
	{"spades", "spades", "Spades", "♠", "black", false},
	{"hearts", "hearts", "Hearts", "♥", "red", true},
	{"diamonds", "diamonds", "Diamonds", "♦", "red", true},
	{"clubs", "clubs", "Clubs", "♣", "black", false},
}

func ranks() []Rank {
	out := make([]Rank, 0, 13)
	for n := 2; n <= 10; n++ {
		s := itoa(n)
		out = append(out, Rank{s, s, s, n, n, n})
	}
	out = append(out,
		Rank{"jack", "J", "Jack", 11, 11, 10},
		Rank{"queen", "Q", "Queen", 12, 12, 10},
		Rank{"king", "K", "King", 13, 13, 10},
		Rank{"ace", "A", "Ace", 14, 14, 11},
	)
	return out
}

// Standard returns a fresh 52-card deck (Ace high), in the same order as the JS
// standardDeck() so a shared rng shuffles both identically.
func Standard() []Card {
	rs := ranks()
	deck := make([]Card, 0, 52)
	for _, suit := range suits {
		for _, rank := range rs {
			deck = append(deck, Card{
				ID:    rank.ID + "-" + suit.ID,
				Suit:  suit,
				Rank:  rank,
				Value: rank.Value,
				IsRed: suit.IsRed,
			})
		}
	}
	return deck
}

// Shuffle returns a seeded shuffle of the deck (same order as JS for the seed).
func Shuffle(deck []Card, r *rng.RNG) []Card { return rng.Shuffle(deck, r) }

// BlackjackValue is the best total of a hand (aces flex 11→1).
func BlackjackValue(hand []Card) int {
	value, aces := 0, 0
	for _, c := range hand {
		value += c.Rank.NumericValue
		if c.Rank.ID == "ace" {
			aces++
		}
	}
	for value > 21 && aces > 0 {
		value -= 10
		aces--
	}
	return value
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [4]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
