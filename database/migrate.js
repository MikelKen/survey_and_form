import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { executeQuery } from "@tigo/postgres-connector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const rows = await executeQuery("SELECT filename FROM schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

export async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[Migrate] Skipping (already applied): ${file}`);
      continue;
    }
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`[Migrate] Applying: ${file}`);
    await executeQuery(sql);
    await executeQuery("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      file,
    ]);
    appliedCount++;
  }

  console.log(
    appliedCount > 0
      ? `[Migrate] Done. ${appliedCount} migration(s) applied.`
      : "[Migrate] Nothing new to apply.",
  );
}
