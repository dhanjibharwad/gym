# Enterprise RBAC System Rebuild Plan

## Current System Analysis

### Problems Identified:
1. Hardcoded role checks (`role.toLowerCase() === 'admin'`) throughout codebase
2. API routes check roles instead of permissions
3. Admin doesn't have implicit full access
4. No centralized permission configuration
5. Sidebar uses hardcoded role-based filtering
6. Permission checks are inconsistent between UI and API

### Database Schema (Already Exists):
- `roles` table - company-specific roles
- `permissions` table - system permissions
- `role_permissions` table - role-permission mapping
- `users` table - has role_id foreign key

---

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1. Create Centralized Permissions Configuration
**File**: `lib/permissions.ts`

Define all permissions organized by modules:
- dashboard: view_dashboard
- members: view_members, add_members, edit_members, delete_members
- payments: view_payments, manage_payments, view_revenue
- staff: view_staff, add_staff, edit_staff, delete_staff
- roles: view_roles, manage_roles
- reports: view_reports, export_reports
- settings: manage_settings
- plans: view_plans, manage_plans
- audit: view_audit_logs

Each permission has: name, description, module, category (read/write/admin)

#### 2. Create RBAC Utility Library
**File**: `lib/rbac.ts`

Functions to implement:
- `hasPermission(userPermissions: string[], permission: string): boolean`
- `hasAnyPermission(userPermissions: string[], permissions: string[]): boolean`
- `hasAllPermissions(userPermissions: string[], permissions: string[]): boolean`
- `isAdmin(role: string): boolean` - Check if user is admin
- `getEffectivePermissions(role: string, userPermissions: string[]): string[]` - Returns all permissions for admin, user permissions for staff
- `checkPermissionMiddleware(request, requiredPermission)` - API route middleware

#### 3. Create React Components for Access Control
**Files**: 
- `components/rbac/PermissionGate.tsx` - Render children only if user has permission
- `components/rbac/RoleGate.tsx` - Render children only if user has role
- `components/rbac/Can.tsx` - Generic permission wrapper

Props:
- PermissionGate: `permission` or `permissions`, `requireAll` (boolean), `fallback` (ReactNode)
- RoleGate: `allowedRoles` array

---

### Phase 2: API Route Updates

#### 4. Update `/api/auth/me/route.ts`
- Query user's role from database
- If role is 'admin', return ALL permissions from MODULES
- If staff role, query role_permissions table and return assigned permissions
- Return: `{ user: { id, name, role, permissions: string[], isAdmin: boolean } }`

#### 5. Create Permission Middleware Helper
**File**: `lib/api-permissions.ts`

```typescript
export function requirePermission(permission: string) {
  return async (request: NextRequest) => {
    const session = await getSession();
    if (!session) return unauthorized();
    
    // Admin bypass
    if (isAdmin(session.user.role)) return { authorized: true, session };
    
    // Check user permission
    const userPerms = await getUserPermissions(session.user.id);
    if (!userPerms.includes(permission)) return forbidden();
    
    return { authorized: true, session };
  };
}
```

#### 6. Update All API Routes
Update these routes to use permission checks:
- `/api/admin/roles/*` - require `manage_roles`
- `/api/admin/staff/*` - require `add_staff`, `view_staff`, `delete_staff`
- `/api/admin/permissions/*` - require `manage_roles`
- `/api/members/*` - require `view_members`, `add_members`, `edit_members`
- `/api/payments/*` - require `view_payments`, `manage_payments`
- `/api/membership-plans/*` - require `view_plans`, `manage_plans`
- `/api/audit-logs/*` - require `view_audit_logs`
- `/api/settings/*` - require `manage_settings`

---

### Phase 3: UI Updates

#### 7. Update Sidebar Component
**File**: `components/layout/Sidebar.tsx`

Current navItems array has hardcoded roles/permissions. Update to:
- Use permissions from user context
- Filter items based on `hasAnyPermission(userPermissions, item.requiredPermissions)`
- Admin sees all items automatically

#### 8. Update Dashboard Page
**File**: `app/dashboard/page.tsx`

- Wrap quick actions with PermissionGate
- Show/hide revenue cards based on `view_revenue` permission
- Show/hide staff actions based on `view_staff` permission

#### 9. Update Roles Management Page
**File**: `app/dashboard/roles/page.tsx`

- Add `is_protected` flag handling for admin role
- Prevent deletion of admin role
- Show permission count for each role

#### 10. Update Permissions Management Page
**File**: `app/dashboard/permissions/page.tsx`

- Load permissions from `lib/permissions.ts` MODULES
- For admin role, show "Admin has full access to all modules" message
- For custom roles, allow permission assignment
- Group permissions by module with visual indicators

#### 11. Update Staff Management
**Files**:
- `app/dashboard/ourstaff/page.tsx` - Add role column display
- `app/dashboard/add-staff/page.tsx` - Add role selection dropdown
- `app/api/admin/add-staff/route.ts` - Accept role_id instead of hardcoded 'reception'

---

### Phase 4: Database & Seeding

#### 12. Create Permission Seeder
**File**: `lib/schemas/seed-permissions.sql`

Insert all MODULES permissions into `permissions` table:
```sql
INSERT INTO permissions (name, description, module) VALUES
('view_dashboard', 'View dashboard', 'dashboard'),
('view_members', 'View members list', 'members'),
...etc
```

#### 13. Update Default Admin Role
Ensure admin role gets all permissions assigned on company creation.

---

## File Changes Summary

### New Files:
1. `lib/permissions.ts` - Permission definitions
2. `lib/rbac.ts` - RBAC utility functions
3. `lib/api-permissions.ts` - API middleware helpers
4. `components/rbac/PermissionGate.tsx`
5. `components/rbac/Can.tsx`
6. `lib/schemas/seed-permissions.sql`

### Modified Files:
1. `app/api/auth/me/route.ts` - Return admin=all permissions
2. `app/api/admin/roles/route.ts` - Permission checks
3. `app/api/admin/permissions/route.ts` - Use lib/permissions.ts
4. `app/api/admin/staff/route.ts` - Permission checks
5. `app/api/members/route.ts` - Permission checks
6. `app/api/payments/route.ts` - Permission checks
7. `components/layout/Sidebar.tsx` - Permission-based nav
8. `app/dashboard/page.tsx` - Permission gates
9. `app/dashboard/roles/page.tsx` - Protected admin role
10. `app/dashboard/permissions/page.tsx` - Module-based UI
11. `app/dashboard/ourstaff/page.tsx` - Role display
12. `app/dashboard/add-staff/page.tsx` - Role selection

---

## Permission Module Structure

```
dashboard
  - view_dashboard

members
  - view_members
  - add_members
  - edit_members
  - delete_members

payments
  - view_payments
  - manage_payments
  - view_revenue

staff
  - view_staff
  - add_staff
  - edit_staff
  - delete_staff

roles
  - view_roles
  - manage_roles

reports
  - view_reports
  - export_reports

settings
  - manage_settings

plans
  - view_plans
  - manage_plans

audit
  - view_audit_logs
```

---

## Admin vs Staff Behavior

### Admin Role:
- Has implicit access to ALL permissions
- Cannot be deleted
- Cannot have permissions modified (always full access)
- Can create/edit/delete custom staff roles
- Can assign permissions to staff roles

### Staff Roles:
- Dynamically created by admin
- Custom name and description
- Specific permissions assigned from available pool
- Can be edited/deleted by admin
- Staff users assigned to these roles get only their assigned permissions

---

## Testing Checklist

1. Admin login - verify all sidebar items visible
2. Admin API access - verify all APIs accessible
3. Create custom role with limited permissions
4. Create staff user with custom role
5. Staff login - verify only allowed items visible
6. Staff API access - verify 403 on unauthorized endpoints
7. Edit role permissions - changes reflect immediately
8. Delete role - verify cleanup of user assignments