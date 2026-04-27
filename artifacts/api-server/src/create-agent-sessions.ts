import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "agent_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "title" text DEFAULT 'New Session' NOT NULL,
      "messages" text DEFAULT '[]' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  console.log("Tabla agent_sessions inyectada exitosamente.");
  process.exit(0);
}
run();
