# API Routes Company Filtering Status

## ✅ FIXED (Already filtering by company_id)
- `/api/members` - Fixed
- `/api/payments` - Fixed

## ⚠️ CRITICAL - NEEDS FIXING (Security Risk)

### High Priority (Data Leakage)
1. `/api/membership-plans/route.ts` - Returns all plans across companies
2. `/api/admin/roles/route.ts` - Returns all roles across companies  
3. `/api/admin/staff/route.ts` - Returns all staff across companies
4. `/api/audit-logs/route.ts` - Returns all audit logs across companies
5. `/api/settings/route.ts` - Returns all settings across companies
6. `/api/secure-members/route.ts` - Returns all members across companies

### Medium Priority (Functional Issues)
7. `/api/members/register/route.ts` - Should validate company_id
8. `/api/payments/add/route.ts` - Should validate company_id
9. `/api/admin/add-staff/route.ts` - Already has company check (OK)
10. `/api/admin/permissions/route.ts` - Already has company check (OK)

## 🔧 FIX PATTERN

All GET routes should:
```typescript
const companyId = request.headers.get('x-company-id');

if (!companyId) {
  return NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 }
  );
}

// Add WHERE company_id = $1 to query
const result = await pool.query('SELECT * FROM table WHERE company_id = $1', [companyId]);
```

All POST/PUT routes should:
```typescript
const companyId = request.headers.get('x-company-id');

if (!companyId) {
  return NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 }
  );
}

// Add company_id to INSERT/UPDATE
await pool.query('INSERT INTO table (company_id, ...) VALUES ($1, ...)', [companyId, ...]);
```

## 📝 Routes That DON'T Need Filtering
- `/api/auth/*` - Authentication routes (no company context yet)
- `/api/setup` - Company registration (creates company)
- `/api/superadmin/*` - SuperAdmin routes (cross-company access)

## 🎯 IMMEDIATE ACTION REQUIRED

Fix these 6 routes NOW:
1. membership-plans
2. admin/roles  
3. admin/staff
4. audit-logs
5. settings
6. secure-members

Each company is currently seeing ALL data from ALL companies!
