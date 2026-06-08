import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

const connectionOptions: postgres.Options<Record<string, postgres.PostgresType>> = {
  max: 1,
  prepare: false, // Required for Supabase Transaction Pooler (Supavisor)
  idle_timeout: 20,
  connect_timeout: 10,
};

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, connectionOptions);
} else {
  const globalRef = globalThis as unknown as {
    postgresClient: postgres.Sql | undefined;
  };
  if (!globalRef.postgresClient) {
    globalRef.postgresClient = postgres(connectionString, connectionOptions);
  }
  client = globalRef.postgresClient;
}

export const db = drizzle(client, { schema });

