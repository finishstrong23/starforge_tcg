import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from '../config/database';

async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Get already applied migrations
  const applied = await pool.query('SELECT filename FROM _migrations ORDER BY id');
  const appliedSet = new Set(applied.rows.map(r => r.filename));

  // Get migration files
  const migrationsDir = join(__dirname);
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  Skipping ${file} (already applied)`);
      continue;
    }

    console.log(`  Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  Failed to apply ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('All migrations applied.');
  await closePool();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
