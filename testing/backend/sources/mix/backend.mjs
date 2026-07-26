// Reference backend GENERATED from ./manual.md — a small DAW-shaped
// scaffold, the safe-to-generate category (never an enforcement core).
// Honestly labelled: info().generated === true, naming its source. create()
// returns a fresh instance so each gate run starts from clean state.
//
// A fixed small mixer (three tracks, two buses) — there is no
// create-track/create-bus op in the manual's surface, so the mixer is the
// instrument's own shape, not "seed data" layered on top the way notes/
// urlshortener seed their stores via a real add/shorten call. One route
// exists from construction (t1 -> busA), the instrument's factory routing —
// honestly part of initial state, not hidden as user history. Same honest
// deviation the patch backend documents (osc1.out -> filter1.in).
//
// `rev` is the witness the live gate reads out-of-band via `state` (see
// manual.md's "Witness" section): a monotonic counter, part of the real
// state `state` returns, advanced by exactly 1 on every op that actually
// changes state. It never moves on a refusal or a same-value no-op.
export function create() {
  const tracks = new Map([
    ["t1", { name: "Kick", gainDb: 0, pan: 0, mute: false }],
    ["t2", { name: "Bass", gainDb: 0, pan: 0, mute: false }],
    ["t3", { name: "Lead", gainDb: 0, pan: 0, mute: false }],
  ]);
  const buses = new Map([
    ["busA", { name: "Main" }],
    ["busB", { name: "FX" }],
  ]);
  let routes = [{ track: "t1", bus: "busA" }];
  let playing = false;
  let rev = 0;

  function snapshotTracks() {
    const out = {};
    for (const [id, t] of tracks) out[id] = { name: t.name, gainDb: t.gainDb, pan: t.pan, mute: t.mute };
    return out;
  }
  function snapshotBuses() {
    const out = {};
    for (const [id, b] of buses) out[id] = { name: b.name };
    return out;
  }

  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "mix",
        generated: true,
        source: "sources/mix/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "play": {
          if (!playing) { playing = true; rev++; }   // state-faithful: already-playing is a real no-op, witness unchanged
          return { ok: true, playing, rev };
        }
        case "stop": {
          if (playing) { playing = false; rev++; }   // state-faithful: already-stopped is a real no-op, witness unchanged
          return { ok: true, playing, rev };
        }
        case "setGain": {
          const t = tracks.get(args.track);
          if (!t) return { ok: false, error: "unknown track '" + args.track + "'" };
          const db = Number(args.db);
          if (!Number.isFinite(db)) return { ok: false, error: "db must be a number" };
          if (t.gainDb !== db) { t.gainDb = db; rev++; }   // state-faithful: a same-value fade is a real no-op, witness unchanged
          return { ok: true, track: args.track, gainDb: t.gainDb, rev };
        }
        case "setPan": {
          const t = tracks.get(args.track);
          if (!t) return { ok: false, error: "unknown track '" + args.track + "'" };
          const pos = Number(args.pos);
          if (!Number.isFinite(pos)) return { ok: false, error: "pos must be a number" };
          if (t.pan !== pos) { t.pan = pos; rev++; }   // state-faithful: a same-value pan is a real no-op, witness unchanged
          return { ok: true, track: args.track, pan: t.pan, rev };
        }
        case "mute": {
          const t = tracks.get(args.track);
          if (!t) return { ok: false, error: "unknown track '" + args.track + "'" };
          t.mute = !t.mute;   // toggle: no "set to X", only "flip it" — every successful call is a real change
          rev++;
          return { ok: true, track: args.track, mute: t.mute, rev };
        }
        case "route": {
          const track = String(args.track ?? ""), bus = String(args.bus ?? "");
          if (!tracks.has(track)) return { ok: false, error: "unknown track '" + track + "'" };
          if (!buses.has(bus)) return { ok: false, error: "unknown bus '" + bus + "'" };
          if (routes.some((r) => r.track === track && r.bus === bus)) {
            return { ok: false, error: "already routed: " + track + " -> " + bus };
          }
          routes.push({ track, bus });
          rev++;
          return { ok: true, routes: [...routes], rev };
        }
        case "unroute": {
          const track = String(args.track ?? ""), bus = String(args.bus ?? "");
          const i = routes.findIndex((r) => r.track === track && r.bus === bus);
          if (i === -1) return { ok: false, error: "no such route: " + track + " -> " + bus };
          routes.splice(i, 1);
          rev++;
          return { ok: true, routes: [...routes], rev };
        }
        case "state":
          return { ok: true, rev, playing, tracks: snapshotTracks(), buses: snapshotBuses(), routes: [...routes] };
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
