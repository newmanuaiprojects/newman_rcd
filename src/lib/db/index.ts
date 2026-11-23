import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless'
import * as schema from '@/lib/db/schema'

const pool = neon(process.env.DATABASE_URL!);

export const db = drizzle(pool, { schema });