/**
 * Apply the SQL migrations in ./drizzle to the database. Safe to run repeatedly;
 * already-applied migrations are skipped. Works for local SQLite and hosted libSQL/Turso.
 *
 * When the schema in src/db/schema.ts changes, generate a new migration with
 *   npx drizzle-kit@latest generate --name <what-changed>
 * and commit the new files under ./drizzle.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";

loadEnv();

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/advance.db";
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
    fs.mkdirSync(process.env.UPLOAD_DIR ?? "./data/uploads", { recursive: true });
  }
  const { db } = await import("../src/db");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log(`Database is up to date (${url}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
