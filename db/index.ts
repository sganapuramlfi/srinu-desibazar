import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function connect() {
  await client.connect();
}

connect();

export const db = drizzle(client, { schema });