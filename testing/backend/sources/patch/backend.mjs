// Reference backend GENERATED from ./manual.md — a small modular-synth-shaped
// scaffold, the safe-to-generate category (never an enforcement core).
// Honestly labelled: info().generated === true, naming its source. create()
// returns a fresh instance so each gate run starts from clean state.
//
// A fixed small rack (two oscillators, one filter) — there is no
// create/delete-module op in the manual's surface, so the modules are the
// instrument's own shape, not "seed data" layered on top the way notes/
// urlshortener seed their stores via a real add/shorten call. One connection
// exists from construction (osc1.out -> filter1.in), the instrument's factory
// patch — honestly part of initial state, not hidden as user history.
//
// `rev` is the witness the live gate reads out-of-band via `list` (see
// manual.md's "Witness" section): a monotonic counter, part of the real state
// `list` returns, advanced by exactly 1 on every op that actually changes a
// parameter or the connection set. It never moves on a refusal.
export function create() {
  const modules = new Map([
    ["osc1", { kind: "osc", freq: 440 }],
    ["osc2", { kind: "osc", freq: 220 }],
    ["filter1", { kind: "filter", cutoff: 1000 }],
  ]);
  const connections = [{ from: "osc1.out", to: "filter1.in" }];
  let rev = 0;

  function portModuleId(port) {
    return String(port ?? "").split(".")[0];
  }

  function snapshotParams() {
    const params = {};
    for (const [id, m] of modules) {
      params[id] = m.kind === "osc" ? { kind: "osc", freq: m.freq } : { kind: "filter", cutoff: m.cutoff };
    }
    return params;
  }

  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "patch",
        generated: true,
        source: "sources/patch/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "setFreq": {
          const m = modules.get(args.module);
          if (!m || m.kind !== "osc") return { ok: false, error: "unknown oscillator module '" + args.module + "'" };
          const hz = Number(args.hz);
          if (!Number.isFinite(hz)) return { ok: false, error: "hz must be a number" };
          if (m.freq !== hz) { m.freq = hz; rev++; }   // state-faithful: a same-value turn is a real no-op, witness unchanged
          return { ok: true, module: args.module, freq: m.freq, rev };
        }
        case "setCutoff": {
          const m = modules.get(args.module);
          if (!m || m.kind !== "filter") return { ok: false, error: "unknown filter module '" + args.module + "'" };
          const hz = Number(args.hz);
          if (!Number.isFinite(hz)) return { ok: false, error: "hz must be a number" };
          if (m.cutoff !== hz) { m.cutoff = hz; rev++; }   // state-faithful: a same-value turn is a real no-op, witness unchanged
          return { ok: true, module: args.module, cutoff: m.cutoff, rev };
        }
        case "connect": {
          const from = String(args.from ?? ""), to = String(args.to ?? "");
          if (!modules.has(portModuleId(from))) return { ok: false, error: "unknown module for 'from': " + from };
          if (!modules.has(portModuleId(to))) return { ok: false, error: "unknown module for 'to': " + to };
          if (connections.some((c) => c.from === from && c.to === to)) {
            return { ok: false, error: "already connected: " + from + " -> " + to };
          }
          connections.push({ from, to });
          rev++;
          return { ok: true, connections: [...connections], rev };
        }
        case "disconnect": {
          const from = String(args.from ?? ""), to = String(args.to ?? "");
          const i = connections.findIndex((c) => c.from === from && c.to === to);
          if (i === -1) return { ok: false, error: "no such connection: " + from + " -> " + to };
          connections.splice(i, 1);
          rev++;
          return { ok: true, connections: [...connections], rev };
        }
        case "list":
          return { ok: true, rev, connections: [...connections], params: snapshotParams() };
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
