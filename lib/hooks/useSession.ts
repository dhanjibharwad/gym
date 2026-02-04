'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  companyId: number;
  email: string;
  name: string;
  phone?: string;
  role: string;
  isVerified: boolean;
}

interface Company {
  id: number;
  name: string;
  subdomain: string;
}

interface Session {
  user: User;
  company: Company;
  sessionId: number;
  expiresAt: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    session,
    user: session?.user || null,
    company: session?.company || null,
    loading,
    logout,
    refetch: fetchSession,
  };
}