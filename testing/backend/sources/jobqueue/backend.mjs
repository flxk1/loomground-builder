// Reference backend GENERATED from ./manual.md — a plain FIFO job-queue
// scaffold, the safe-to-generate category (never an enforcement core).
// Honestly labelled: info().generated === true, naming its source. create()
// returns a fresh instance so every gate run starts clean.
export function create() {
  const queue = []; // array of { id, payload }, in FIFO order — push to enqueue, shift to dequeue
  let seq = 0;
  return {
    info() {
      // Provenance stamp (specs/backend-from-model.md). A shipped generated
      // backend carries this at runtime; the same object ships as
      // provenance.json beside it. enforcement_point is always false — a
      // generated backend is never a trusted enforcement point.
      return {
        name: "jobqueue",
        generated: true,
        source: "sources/jobqueue/manual.md",
        generator: "tool-designer/backend-from-model",
        class: "scaffold",
        enforcement_point: false,
        notice: "Generated scaffold — not an enforcement point. Do not use to withhold, gate, or enforce.",
      };
    },
    call(op, args = {}) {
      switch (op) {
        case "enqueue": {
          const id = "j" + (++seq);
          queue.push({ id, payload: args.payload });
          return { ok: true, id };
        }
        case "dequeue": {
          if (queue.length === 0) return { ok: false, error: "queue is empty" };
          const job = queue.shift();
          return { ok: true, id: job.id, payload: job.payload };
        }
        case "peek": {
          if (queue.length === 0) return { ok: false };
          const job = queue[0];
          return { ok: true, id: job.id, payload: job.payload };
        }
        case "size":
          return { ok: true, count: queue.length };
        case "purge": {
          const cleared = queue.length;
          queue.length = 0;
          return { ok: true, cleared };
        }
        default:
          return { ok: false, error: "unknown op '" + op + "'" };
      }
    },
  };
}
