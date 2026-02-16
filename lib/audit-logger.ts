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
    await client.query(
      `INSERT INTO audit_logs (company_id, action, entity_type, entity_id, details, user_role, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [companyId, action, entityType, entityId, details, userRole, userId || null]
    );
  } catch (error) {
    console.error('Failed to create audit log:', error);
  } finally {
    client.release();
  }
}
