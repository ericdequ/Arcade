// Package rng is Arcade's seedable deterministic PRNG (mulberry32).
//
// It is byte-identical to the JavaScript @ric/arcade rng: same FNV-1a seed
// hash, same mulberry32 step. So a Go client and a JS client that seed from the
// same value (e.g. a waves_worx pairing session) produce the same shuffle and
// can play lockstep multiplayer ACROSS languages. Not cryptographic.
package rng

// HashSeed is FNV-1a over a string → uint32 (matches JS hashSeed).
func HashSeed(s string) uint32 {
	h := uint32(2166136261)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}

// RNG is a mulberry32 generator. Use New / NewUint; not safe for concurrent use.
type RNG struct{ a uint32 }

// New seeds from a string.
func New(seed string) *RNG { return &RNG{a: HashSeed(seed)} }

// NewUint seeds from a uint32 directly.
func NewUint(seed uint32) *RNG { return &RNG{a: seed} }

// Next returns a float64 in [0, 1). uint32 arithmetic wraps mod 2^32, matching
// JS Math.imul + >>>0 exactly.
func (r *RNG) Next() float64 {
	r.a += 0x6d2b79f5
	t := (r.a ^ (r.a >> 15)) * (1 | r.a)
	t = ((t + ((t ^ (t >> 7)) * (61 | t))) ^ t)
	return float64(t^(t>>14)) / 4294967296.0
}

// Int returns an int in [0, n).
func (r *RNG) Int(n int) int { return int(r.Next() * float64(n)) }

// Range returns an int in [min, max] inclusive.
func (r *RNG) Range(min, max int) int { return min + int(r.Next()*float64(max-min+1)) }

// Shuffle returns a new Fisher–Yates-shuffled copy (input untouched), matching
// the JS rng.shuffle order for the same seed.
func Shuffle[T any](items []T, r *RNG) []T {
	out := make([]T, len(items))
	copy(out, items)
	for i := len(out) - 1; i > 0; i-- {
		j := int(r.Next() * float64(i+1))
		out[i], out[j] = out[j], out[i]
	}
	return out
}
