// =============================================================================
// Arcade — catalog (game manifests + registry)
// =============================================================================
// The browse/launch layer, from RobotRic's registry. A manifest describes a
// game for listing: id, title, url, thumbnail, instructions, tags. The unifying
// addition is `launch` + `engineId`: a manifest can point at a playable engine
// game (defineGame in ../engine.js), an external `iframe` (Scratch embeds), or a
// `route` (a page that renders the game itself, e.g. a canvas Snake).
//
//   catalog game ──engineId──▶ engine game (playable in-app, multiplayer-ready)
//                ──iframe────▶ embedded
//                ──route─────▶ app page
// =============================================================================

const REQUIRED = ['id', 'title', 'url'];

const slugify = (v) =>
  String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Normalize a raw game record into a frozen manifest. */
export function normalizeGame(game) {
  if (!game || typeof game !== 'object') throw new TypeError('game must be an object');
  const id = slugify(game.id || game.slug || game.title);
  const launch = game.launch || (game.engineId ? 'engine' : game.iframe ? 'iframe' : 'route');
  const manifest = {
    id,
    title: game.title || game.name || id,
    url: game.url || game.href || `/Arcade/${id}`,
    status: game.status || 'available',
    collection: game.collection || 'arcade',
    source: game.source || 'arcade',
    thumbnail: game.thumbnail || game.image || null,
    iframe: game.iframe || null,
    instructions: game.instructions || '',
    tags: Array.isArray(game.tags) ? [...game.tags] : [],
    logic: game.logic || null,
    launch,
    engineId: game.engineId || null,
    metadata: game.metadata || {},
  };
  for (const field of REQUIRED) {
    if (!manifest[field]) throw new Error(`game is missing required field: ${field}`);
  }
  return Object.freeze(manifest);
}

/** A filterable registry of manifests. */
export function createCatalog(games = []) {
  const records = new Map();
  const api = {
    add(game) {
      const m = normalizeGame(game);
      if (records.has(m.id)) throw new Error(`duplicate game id: ${m.id}`);
      records.set(m.id, m);
      return m;
    },
    addMany(list) {
      return list.map(api.add);
    },
    get(id) {
      return records.get(slugify(id)) || null;
    },
    list(filters = {}) {
      return [...records.values()].filter((g) => {
        if (filters.status && g.status !== filters.status) return false;
        if (filters.collection && g.collection !== filters.collection) return false;
        if (filters.source && g.source !== filters.source) return false;
        if (filters.launch && g.launch !== filters.launch) return false;
        if (filters.tag && !g.tags.includes(filters.tag)) return false;
        return true;
      });
    },
    /** Manifests that resolve to a playable engine game. */
    playable() {
      return api.list({ launch: 'engine' });
    },
    toJSON() {
      return api.list();
    },
  };
  api.addMany(games);
  return api;
}

/** Merge collections into one flat, de-duplicated manifest list. */
export function mergeCollections(...collections) {
  const cat = createCatalog();
  for (const c of collections) {
    for (const g of c) {
      if (!cat.get(g.id)) cat.add(g);
    }
  }
  return cat.list();
}
