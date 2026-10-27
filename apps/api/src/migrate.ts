import "./env";
import { Client } from "pg";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
// Apply Prisma SQL migrations with PostgreSQL's driver: transactional, serialized and checksum checked.
async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtext('gferraz_migrations'))",
    );
    await client.query(
      'CREATE TABLE IF NOT EXISTS "_gferraz_migrations" (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const base = path.resolve("prisma/migrations");
    for (const name of (await readdir(base, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()) {
      const sql = await readFile(
        path.join(base, name, "migration.sql"),
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query(
        'SELECT checksum FROM "_gferraz_migrations" WHERE name=$1',
        [name],
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error("Migration checksum differs: " + name);
        console.log("Already applied: " + name);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_gferraz_migrations" (name, checksum) VALUES ($1,$2)',
          [name, checksum],
        );
        await client.query("COMMIT");
        console.log("Applied: " + name);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtext('gferraz_migrations'))",
    );
    await client.end();
  }
}
migrate().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
