// =============================================================================
// Arcade — socket.io channel: lockstep over a tiny relay (the cloud-optional path)
// =============================================================================
// Arcade's transport is channel-agnostic: joinMatch() only needs a channel with
// { send(bytes), subscribe(cb) }. The bundled channels are no-cloud (waves_worx
// BLE / sound / loopback) for peers who are physically near. This adds the OTHER
// option — a featherweight relay so peers who AREN'T near can still share one
// deterministic match.
//
// The relay never referees state and never decodes a byte: it only rebroadcasts
// opaque action frames within a room (sender excluded). So the determinism
// guarantee is unchanged — every device still computes identical state locally
// from the same ordered actions; the relay is just the wire.
//
// socket.io / socket.io-client are loaded LAZILY (dynamic import) and declared
// as optionalDependencies, so consumers who only use the no-cloud channels never
// pull a websocket stack. Import this module only when you want the relay path.
// =============================================================================

const MSG = 'arcade.msg';
const JOIN = 'arcade.join';

/** Normalize whatever the wire handed back into a Uint8Array. */
const toBytes = (b) =>
  b instanceof Uint8Array ? b : b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b ?? []);

/**
 * Client channel backed by socket.io-client. Speaks Arcade's { send, subscribe }
 * contract, so it drops straight into joinMatch({ channel }).
 *
 * @param {object} opts
 * @param {string} [opts.url]              relay URL (e.g. 'https://relay.example'); omit if injecting a socket
 * @param {string} opts.room              shared room id — use the match seed so peers co-locate
 * @param {object} [opts.socket]          inject a pre-built/connected socket (tests, reuse); not auto-closed
 * @param {Function} [opts.io]            inject socket.io-client's `io` factory (tests)
 * @param {object} [opts.connectOptions]  extra socket.io-client connect options
 * @returns {Promise<{socket:object, send:Function, subscribe:Function, close:Function}>}
 */
export async function socketChannel({ url, room, socket, io, connectOptions } = {}) {
  if (!room) throw new Error('socketChannel: `room` is required');
  const connect = io ?? (await import('socket.io-client')).io;
  const sock = socket ?? connect(url, { transports: ['websocket'], ...connectOptions });
  const roomId = String(room);

  // Best-effort re-join on every reconnect (no ack — resilience only).
  sock.on('connect', () => sock.emit(JOIN, roomId));
  // Block until we're connected AND the relay has acked the room join, so the
  // returned channel is genuinely ready — no "played before my peer joined" race.
  await once(sock, 'connect');
  await emitWithAck(sock, JOIN, roomId);

  return {
    socket: sock,
    send: (bytes) => sock.emit(MSG, { room: roomId, bytes }),
    subscribe: (cb) => {
      const handler = (frame) => cb(toBytes(frame?.bytes), { transport: 'socketio' });
      sock.on(MSG, handler);
      return () => sock.off(MSG, handler);
    },
    // Only tear down sockets we created; an injected socket stays the caller's.
    close: () => {
      if (!socket) sock.close();
    },
  };
}

/** Resolve once `event` fires on `sock` (or immediately if already connected). */
const once = (sock, event) =>
  event === 'connect' && sock.connected
    ? Promise.resolve()
    : new Promise((res) => sock.once(event, res));

/** Emit with a socket.io ack callback, resolving when the server acknowledges. */
const emitWithAck = (sock, event, payload) => new Promise((res) => sock.emit(event, payload, res));

/**
 * Attach the Arcade relay to an EXISTING socket.io Server. Use this to fold the
 * relay into an app's own websocket server. It only rebroadcasts frames within a
 * room (sender excluded via socket.to) — never decodes them.
 *
 * @param {object} io  a socket.io Server instance
 * @returns {object}   the same io, for chaining
 */
export function attachRelay(io) {
  io.on('connection', (socket) => {
    socket.on(JOIN, (room, ack) => {
      socket.join(String(room));
      ack?.();
    });
    socket.on(MSG, (frame) => {
      if (!frame || frame.room == null) return;
      socket.to(String(frame.room)).emit(MSG, { bytes: frame.bytes });
    });
  });
  return io;
}

/**
 * Stand up a standalone relay. Lazy-loads socket.io's Server so it's only
 * required when you actually run a relay (never in a browser/native bundle).
 *
 * @param {object} [opts]
 * @param {number} [opts.port=0]          listen port (0 = ephemeral; read io.httpServer.address())
 * @param {object} [opts.server]          an existing http.Server to attach to instead of listening
 * @param {Function} [opts.Server]        inject socket.io's Server (tests)
 * @param {object} [opts.serverOptions]   extra socket.io Server options (e.g. cors)
 * @returns {Promise<{io:object, close:() => Promise<void>}>}
 */
export async function createRelay({ port = 0, server, Server, serverOptions } = {}) {
  const IOServer = Server ?? (await import('socket.io')).Server;
  const options = { cors: { origin: '*' }, ...serverOptions };
  const io = server ? new IOServer(server, options) : new IOServer(port, options);
  attachRelay(io);
  return {
    io,
    close: () =>
      new Promise((resolve) => {
        io.close(() => resolve());
      }),
  };
}
