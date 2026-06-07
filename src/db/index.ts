import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, { max: 1 });
} else {
  const globalRef = globalThis as unknown as {
    postgresClient: postgres.Sql | undefined;
  };
  if (!globalRef.postgresClient) {
    globalRef.postgresClient = postgres(connectionString, { max: 1 });
  }
  client = globalRef.postgresClient;
}

export const db = drizzle(client, { schema });
