import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import pool from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create session with company context
export async function createSession(userId: number, companyId: number, role: string) {
  const token = await new SignJWT({ userId, companyId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO sessions (user_id, company_id, session_token, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, companyId, token, expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

// Get current session with company context
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Handle SuperAdmin (no database session)
    if (payload.isSuperAdmin || payload.role === 'SuperAdmin') {
      return {
        user: {
          id: payload.userId as number,
          name: 'Super Administrator',
          role: 'SuperAdmin',
        },
      };
    }
    
    const result = await pool.query(
      `SELECT 
        s.id as session_id,
        s.expires_at,
        u.id as user_id,
        u.company_id,
        u.email,
        u.name,
        u.phone,
        u.is_verified,
        c.name as company_name,
        c.subdomain,
        r.name as role
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       JOIN companies c ON u.company_id = c.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE s.session_token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) return null;

    const data = result.rows[0];
    return {
      user: {
        id: data.user_id,
        companyId: data.company_id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        isVerified: data.is_verified,
      },
      company: {
        id: data.company_id,
        name: data.company_name,
        subdomain: data.subdomain,
      },
      sessionId: data.session_id,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

// Delete session (logout)
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (token) {
    try {
      await pool.query('DELETE FROM sessions WHERE session_token = $1', [token]);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  cookieStore.delete('session');
}

// Delete all sessions for a user
export async function deleteAllUserSessions(userId: number) {
  try {
    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error deleting user sessions:', error);
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create verification token
export async function createVerificationToken(
  userId: number,
  type: 'email_verification' | 'password_reset'
): Promise<string> {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing tokens of this type for this user
  await pool.query(
    'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
    [userId, type]
  );

  // Insert new token
  await pool.query(
    'INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)',
    [userId, otp, type, expiresAt]
  );

  return otp;
}

// Verify OTP token
export async function verifyToken(
  userId: number,
  token: string,
  type: 'email_verification' | 'password_reset'
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT * FROM verification_tokens 
       WHERE user_id = $1 AND token = $2 AND type = $3 AND expires_at > NOW()`,
      [userId, token, type]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}

// Delete verification token
export async function deleteVerificationToken(
  userId: number,
  type: 'email_verification' | 'password_reset'
) {
  try {
    await pool.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
      [userId, type]
    );
  } catch (error) {
    console.error('Error deleting verification token:', error);
  }
}

// Get user by email and company
export async function getUserByEmail(email: string, companyId?: number) {
  try {
    let query = 'SELECT u.*, c.name as company_name, c.subdomain FROM users u JOIN companies c ON u.company_id = c.id WHERE u.email = $1';
    const params: any[] = [email.toLowerCase().trim()];
    
    if (companyId) {
      query += ' AND u.company_id = $2';
      params.push(companyId);
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}



// Get company by subdomain
export async function getCompanyBySubdomain(subdomain: string) {
  try {
    const result = await pool.query(
      'SELECT * FROM companies WHERE subdomain = $1',
      [subdomain.toLowerCase().trim()]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error fetching company:', error);
    return null;
  }
}

// Create company
export async function createCompany(name: string, subdomain: string) {
  try {
    const result = await pool.query(
      'INSERT INTO companies (name, subdomain) VALUES ($1, $2) RETURNING *',
      [name, subdomain.toLowerCase().trim()]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}

// Update last login timestamp
export async function updateLastLogin(userId: number) {
  try {
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// Clean up expired sessions
export async function cleanupExpiredSessions() {
  try {
    await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}

// Clean up expired tokens
export async function cleanupExpiredTokens() {
  try {
    await pool.query('DELETE FROM verification_tokens WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}