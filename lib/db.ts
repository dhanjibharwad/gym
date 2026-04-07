import { Pool } from 'pg';

const globalForPg = globalThis as unknown as {
  __gymportal_pg_pool?: Pool;
  __gymportal_pg_pool_instrumented?: boolean;
};

const pool =
  globalForPg.__gymportal_pg_pool ??
  new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gymportal',
    user: process.env.DB_USER || 'username',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    min: 5,
    idleTimeoutMillis: 120000,
    connectionTimeoutMillis: 3000,
    query_timeout: 8000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
    statement_timeout: 7000,
    allowExitOnIdle: false,
    maxUses: 10000,
  });

if (!globalForPg.__gymportal_pg_pool) {
  globalForPg.__gymportal_pg_pool = pool;
}

if (!globalForPg.__gymportal_pg_pool_instrumented) {
  globalForPg.__gymportal_pg_pool_instrumented = true;

  // Test connection on startup
  pool.on('error', (err: Error & { code?: string }) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected database error:', err.message);
    }
  });

  pool.on('connect', () => {});
  pool.on('remove', () => {});

  // Initial connection test
  pool.query('SELECT NOW()').catch((error: Error) => {
    console.error('❌ Database connection failed:', error.message);
  });
}

export default pool;