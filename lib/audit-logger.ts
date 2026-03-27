import pool from '@/lib/db';

interface AuditLogParams {
  companyId: number;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: number;
  details: string;
  userRole: string;
  userId?: number;
}

export async function createAuditLog({
  companyId,
  action,
  entityType,
  entityId,
  details,
  userRole,
  userId
}: AuditLogParams): Promise<void> {
  const client = await pool.connect();
  try {
    // Removed user_id from insert as it doesn't exist in the table
    await client.query(
      `INSERT INTO audit_logs (company_id, action, entity_type, entity_id, details, user_role) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, action, entityType, entityId, details, userRole]
    );
  } catch (error) {
    // Silent fail for non-critical audit logs
    if (process.env.NODE_ENV === 'development') {
      console.error('[Audit Logger] Failed to create audit log:', error instanceof Error ? error.message : error);
    }
  } finally {
    client.release();
  }
}
