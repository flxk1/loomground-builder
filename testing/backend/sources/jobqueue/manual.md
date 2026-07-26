# job-queue — a small tool
A first-in-first-out job queue.

## Operations
| op | mutation class | params | returns |
|---|---|---|---|
| enqueue | write | payload | { ok, id } |
| dequeue | write | — | { ok, id, payload }, or { ok:false, error } when the queue is empty |
| peek | read | — | { ok, id, payload }, or { ok:false } when the queue is empty |
| size | read | — | { ok, count } |
| purge | write · destructive | — | { ok, cleared } |

## Stated behaviours
1. After enqueue("build"), size is 1 and peek returns payload "build".
2. FIFO order: enqueue("a") then enqueue("b"), then dequeue returns payload "a".
3. dequeue on an empty queue is refused (ok:false) and size stays 0.
4. After enqueue then purge, size is 0.
5. peek and size are reads (they do not change what size returns); enqueue, dequeue, and purge are writes (they do).
