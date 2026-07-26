// Reference backend GENERATED from ./manual.md — a plain notes scaffold, the
// safe-to-generate category (never an enforcement core). Honestly labelled:
// info().generated === true, naming its source. create() returns a fresh
// instance so each gate run starts from clean state.
export function create() {
  const notes = new Map();
  let seq = 0;
  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "notes",
        generated: true,
        source: "sources/notes/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "add": {
          const id = "n" + (++seq);
          notes.set(id, { id, text: String(args.text ?? ""), done: false });
          return { ok: true, id };
        }
        case "list":
          return { ok: true, notes: [...notes.values()] };
        case "get": {
          const n = notes.get(args.id);
          return n ? { ok: true, note: n } : { ok: false, error: "not found" };
        }
        case "done": {
          const n = notes.get(args.id);
          if (!n) return { ok: false, error: "not found" };
          n.done = true;
          return { ok: true, id: n.id };
        }
        case "remove": {
          return notes.delete(args.id) ? { ok: true } : { ok: false, error: "not found" };
        }
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
