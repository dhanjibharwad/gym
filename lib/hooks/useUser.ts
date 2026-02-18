import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  companyName?: string;
  companyId?: number;
}

interface CacheEntry {
  user: User;
  timestamp: number;
}

let globalUserCache: CacheEntry | null = null;
let userPromise: Promise<User | null> | null = null;
const CACHE_DURATION = 15000; // 15 seconds

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      // Check global cache first
      if (globalUserCache) {
        const now = Date.now();
        if ((now - globalUserCache.timestamp) < CACHE_DURATION) {
          setUser(globalUserCache.user);
          setLoading(false);
          return;
        }
      }

      // If already fetching, reuse the promise
      if (userPromise) {
        const userData = await userPromise;
        setUser(userData);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      userPromise = fetchUserData();
      const userData = await userPromise;
      
      if (userData) {
        globalUserCache = { user: userData, timestamp: Date.now() };
      }
      
      setUser(userData);
      setLoading(false);
    };

    loadUser();
  }, []);

  const fetchUserData = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json();
      
      if (data.success) {
        return data.user;
      } else {
        router.push('/auth/login');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/auth/login');
      return null;
    } finally {
      userPromise = null;
    }
  };

  const clearUserCache = () => {
    globalUserCache = null;
    userPromise = null;
    setUser(null);
  };

  return { user, loading, clearUserCache };
}
