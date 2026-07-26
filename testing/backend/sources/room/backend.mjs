// Reference backend GENERATED from ./manual.md — a small walkable-room-shaped
// scaffold, the safe-to-generate category (never an enforcement core).
// Honestly labelled: info().generated === true, naming its source. create()
// returns a fresh instance so each gate run starts from clean state.
//
// A fixed small room (three stations, two doors) — there is no
// create-station/create-door op in the manual's surface, so the room is the
// instrument's own shape, not "seed data" layered on top the way notes/
// urlshortener seed their stores via a real add/shorten call. One adjacency
// link exists from construction (helm -> comms), the room's factory
// adjacency — honestly part of initial state, not hidden as user history.
// Same honest deviation the patch (osc1.out -> filter1.in) and mix
// (t1 -> busA) backends document.
//
// `rev` is the witness the live gate reads out-of-band via `state` (see
// manual.md's "Witness" section): a monotonic counter, part of the real
// state `state` returns, advanced by exactly 1 on every op that actually
// changes state. It never moves on a refusal or a same-value no-op.
export function create() {
  const stations = new Map([
    ["helm", { level: 40 }],
    ["comms", { level: 65 }],
    ["power", { level: 15 }],
  ]);
  const doors = new Map([
    ["north", { open: false }],
    ["east", { open: false }],
  ]);
  const links = [{ a: "helm", b: "comms" }];
  let rev = 0;

  function snapshotStations() {
    const out = {};
    for (const [id, s] of stations) out[id] = { level: s.level };
    return out;
  }
  function snapshotDoors() {
    const out = {};
    for (const [id, d] of doors) out[id] = { open: d.open };
    return out;
  }

  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "room",
        generated: true,
        source: "sources/room/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "setLevel": {
          const s = stations.get(args.station);
          if (!s) return { ok: false, error: "unknown station '" + args.station + "'" };
          const v = Number(args.value);
          if (!Number.isFinite(v)) return { ok: false, error: "value must be a number" };
          if (s.level !== v) { s.level = v; rev++; }   // state-faithful: a same-value dial is a real no-op, witness unchanged
          return { ok: true, station: args.station, level: s.level, rev };
        }
        case "open": {
          const d = doors.get(args.door);
          if (!d) return { ok: false, error: "unknown door '" + args.door + "'" };
          if (!d.open) { d.open = true; rev++; }   // state-faithful: already-open is a real no-op, witness unchanged
          return { ok: true, door: args.door, open: d.open, rev };
        }
        case "close": {
          const d = doors.get(args.door);
          if (!d) return { ok: false, error: "unknown door '" + args.door + "'" };
          if (d.open) { d.open = false; rev++; }   // state-faithful: already-closed is a real no-op, witness unchanged
          return { ok: true, door: args.door, open: d.open, rev };
        }
        case "connect": {
          const a = String(args.a ?? ""), b = String(args.b ?? "");
          if (!stations.has(a)) return { ok: false, error: "unknown station for 'a': " + a };
          if (!stations.has(b)) return { ok: false, error: "unknown station for 'b': " + b };
          if (links.some((l) => l.a === a && l.b === b)) {
            return { ok: false, error: "already linked: " + a + " -> " + b };
          }
          links.push({ a, b });
          rev++;
          return { ok: true, links: [...links], rev };
        }
        case "disconnect": {
          const a = String(args.a ?? ""), b = String(args.b ?? "");
          const i = links.findIndex((l) => l.a === a && l.b === b);
          if (i === -1) return { ok: false, error: "no such link: " + a + " -> " + b };
          links.splice(i, 1);
          rev++;
          return { ok: true, links: [...links], rev };
        }
        case "state":
          return { ok: true, rev, stations: snapshotStations(), doors: snapshotDoors(), links: [...links] };
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
