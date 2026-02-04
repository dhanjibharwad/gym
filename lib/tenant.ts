import { getSession } from './auth';
import pool from './db';

export interface TenantContext {
  userId: number;
  companyId: number;
  role: string;
}

// Get tenant context from session
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getSession();
  if (!session) return null;
  
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}

// Execute query with automatic company filtering
export async function tenantQuery(
  query: string, 
  params: any[] = [], 
  context?: TenantContext
) {
  const tenantContext = context || await getTenantContext();
  if (!tenantContext) throw new Error('No tenant context');

  // Add company_id filter to WHERE clause
  const tenantQuery = query.includes('WHERE') 
    ? query.replace('WHERE', `WHERE company_id = $${params.length + 1} AND`)
    : query + ` WHERE company_id = $${params.length + 1}`;
  
  return pool.query(tenantQuery, [...params, tenantContext.companyId]);
}

// Safe member operations
export const memberOps = {
  async getAll(context?: TenantContext) {
    return tenantQuery('SELECT * FROM members ORDER BY created_at DESC', [], context);
  },
  
  async getById(id: number, context?: TenantContext) {
    return tenantQuery('SELECT * FROM members WHERE id = $1', [id], context);
  },
  
  async create(data: any, context?: TenantContext) {
    const tenantContext = context || await getTenantContext();
    if (!tenantContext) throw new Error('No tenant context');
    
    const query = `INSERT INTO members (company_id, full_name, phone_number, email, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    
    return pool.query(query, [
      tenantContext.companyId,
      data.full_name,
      data.phone_number,
      data.email,
      data.gender,
      data.date_of_birth,
      data.address,
      data.emergency_contact_name,
      data.emergency_contact_phone
    ]);
  }
};

// Safe membership plan operations
export const planOps = {
  async getAll(context?: TenantContext) {
    return tenantQuery('SELECT * FROM membership_plans ORDER BY duration_months', [], context);
  },
  
  async create(data: any, context?: TenantContext) {
    const tenantContext = context || await getTenantContext();
    if (!tenantContext) throw new Error('No tenant context');
    
    const query = `INSERT INTO membership_plans (company_id, plan_name, duration_months, price) 
                   VALUES ($1, $2, $3, $4) RETURNING *`;
    
    return pool.query(query, [
      tenantContext.companyId,
      data.plan_name,
      data.duration_months,
      data.price
    ]);
  }
};