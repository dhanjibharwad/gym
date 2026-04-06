import { NextRequest } from 'next/server';

/**
 * Get session from middleware-injected headers — zero DB cost.
 * Middleware already verified the JWT, so we just read the headers.
 */
export function getSessionFromRequest(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const companyId = request.headers.get('x-company-id');
  const role = request.headers.get('x-user-role');
  const name = request.headers.get('x-user-name') || '';

  if (!userId || !role) return null;

  return {
    user: {
      id: parseInt(userId),
      companyId: companyId ? parseInt(companyId) : null,
      role,
      name,
    },
  };
}
