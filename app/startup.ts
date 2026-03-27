/**
 * Application Startup Script
 * 
 * Runs on server startup to:
 * 1. Warm up cache for all companies
 * 2. Verify database connection
 * 3. Log system status
 */

import { warmUpGlobalCache } from '@/lib/cacheWarmer';
import pool from '@/lib/db';

export async function startup() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    // Warm up cache (non-blocking, silent)
    warmUpGlobalCache().catch((err: Error) => {
      // Silent fail
    });
    
  } catch (error) {
    // Silent fail - don't crash on startup errors
  }
}

// Auto-run on import in development mode
if (process.env.NODE_ENV === 'development') {
  startup();
}
