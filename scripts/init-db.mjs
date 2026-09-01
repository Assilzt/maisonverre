import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);
await sql`
  CREATE TABLE IF NOT EXISTS atlasio_orders (
    id BIGSERIAL PRIMARY KEY,
    lead_id VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'abandoned',
    campaign VARCHAR(64) NOT NULL DEFAULT 'الرابط الأساسي',
    price INTEGER NOT NULL,
    phone VARCHAR(32) NOT NULL,
    full_name VARCHAR(160),
    wilaya VARCHAR(120),
    commune VARCHAR(160),
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log('atlasio_orders table is ready');
