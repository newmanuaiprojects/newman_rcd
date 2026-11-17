import { Pool } from '@neondatabase/serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle, type NeonTransaction } from 'drizzle-orm/neon-serverless';
import * as schema from '@/lib/db/schema';

export type Transaction = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

export async function transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return await drizzle(pool, { schema }).transaction(run);
  } finally {
    await pool.end();
  }
}
