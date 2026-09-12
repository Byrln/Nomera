import "client-only";

let generation = 0;

// PostgreSQL changes are delivered through server-owned invalidation routes. This
// browser helper only prevents stale client state across identity changes.
export function resetRealtimeSession(): Promise<void> {
  generation += 1;
  return Promise.resolve();
}

export function currentRealtimeGeneration() {
  return generation;
}
