import "server-only";
import { getServerEnvironment } from "@nomera/config/server";
import postgres from "postgres";

type DatabaseClient = ReturnType<typeof postgres>;
type DatabaseGlobal = typeof globalThis & {
  __nomeraDatabase?: DatabaseClient;
};

// postgres.js pools are safe to share between requests; request authorization
// remains explicit in every repository query.
export function getDatabase(): DatabaseClient {
  const globalDatabase = globalThis as DatabaseGlobal;
  globalDatabase.__nomeraDatabase ??= postgres(
    getServerEnvironment().DATABASE_URL,
    {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    },
  );
  return globalDatabase.__nomeraDatabase;
}

export type { DatabaseClient };
