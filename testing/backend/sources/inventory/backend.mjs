// Reference backend GENERATED from ./manual.md — an inventory scaffold. Unlike
// the notes scaffold it carries numeric state and a write (`take`) that refuses
// when stock is insufficient. Honestly labelled generated. create() returns a
// fresh instance per gate run.
export function create() {
  const levels = new Map(); // item -> qty
  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md); mirrored in
      // provenance.json beside this backend. enforcement_point is always false.
      return {
        name: "inventory",
        generated: true,
        source: "sources/inventory/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      const item = args.item;
      const qty = Number(args.qty ?? 0);
      switch (op) {
        case "stock": {
          const next = (levels.get(item) || 0) + qty;
          levels.set(item, next);
          return { ok: true, item, level: next };
        }
        case "take": {
          const have = levels.get(item) || 0;
          if (have < qty) return { ok: false, error: "insufficient stock", item, level: have };
          levels.set(item, have - qty);
          return { ok: true, item, level: have - qty };
        }
        case "level": {
          if (!levels.has(item)) return { ok: false, error: "unknown item" };
          return { ok: true, item, level: levels.get(item) };
        }
        case "items":
          return { ok: true, items: [...levels.entries()].map(([i, l]) => ({ item: i, level: l })) };
        case "discard": {
          return levels.delete(item) ? { ok: true } : { ok: false, error: "unknown item" };
        }
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
