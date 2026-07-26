// Reference backend GENERATED from ./manual.md — a url-shortener scaffold, the
// safe-to-generate category (never an enforcement core). Unlike the notes and
// inventory scaffolds, its read (`resolve`) hinges on a code minted by its own
// write, so the absent-key case (never shortened, or shortened then removed)
// is the natural refusal shape here. Honestly labelled: info().generated ===
// true, naming its source. create() returns a fresh instance so each gate run
// starts from clean state.
export function create() {
  const entries = new Map(); // code -> { code, url }
  let seq = 0;
  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "urlshortener",
        generated: true,
        source: "sources/urlshortener/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "shorten": {
          const code = "s" + (++seq);
          entries.set(code, { code, url: String(args.url ?? "") });
          return { ok: true, code, url: entries.get(code).url };
        }
        case "resolve": {
          const e = entries.get(args.code);
          return e ? { ok: true, url: e.url } : { ok: false, error: "not found" };
        }
        case "list":
          return { ok: true, entries: [...entries.values()] };
        case "remove": {
          return entries.delete(args.code) ? { ok: true } : { ok: false, error: "not found" };
        }
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
