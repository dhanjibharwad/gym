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
    max: 4, // Reduced to 4 to prevent connection exhaustion
    min: 1, // Keep only 1 minimum connection alive
    idleTimeoutMillis: 5000, // Reduced to 5s for faster cleanup
    connectionTimeoutMillis: 2000, // Reduced to 2s for faster timeout
    query_timeout: 5000, // Reduced to 5s for faster query timeout
    keepAlive: true,
    // Enable statement timeout to prevent long-running queries
    statement_timeout: 4000,
    // Add connection reuse settings
    allowExitOnIdle: false,
    maxUses: 5000, // Reuse connections up to 5000 times
  });

if (!globalForPg.__gymportal_pg_pool) {
  globalForPg.__gymportal_pg_pool = pool;
}

if (!globalForPg.__gymportal_pg_pool_instrumented) {
  globalForPg.__gymportal_pg_pool_instrumented = true;

  // Test connection on startup
  pool.on('error', (err: Error & { code?: string }) => {
    console.error('Unexpected database error:', err);
    if (err.code === 'ECONNRESET') {
      console.warn('Database connection reset - attempting to reconnect...');
      // Pool will automatically create new connections
    }
  });

  // Log successful connections
  pool.on('connect', (client) => {
    console.log('✅ New database connection established');
  });

  // Log connection errors
  pool.on('remove', (client) => {
    console.log('🔄 Database connection removed, pool size:', pool.totalCount - pool.idleCount);
  });

  // Initial connection test with retry
  async function testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully:', result.rows[0].now);
      console.log(`📊 Connection pool stats - Max: ${(pool as any).max}, Min: ${(pool as any).min}, Current: ${pool.totalCount}`);
    } catch (error) {
      console.error('❌ Database connection failed:', error instanceof Error ? error.message : error);
      if (error instanceof Error && error.message.includes('ECONNRESET')) {
        console.warn('⚠️ PostgreSQL may be restarting. Waiting 5 seconds before retry...');
        setTimeout(() => testConnection(), 5000);
      }
    }
  }

  testConnection();
}

export default pool;