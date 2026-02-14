import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  companyName?: string;
}

let userCache: User | null = null;
let userPromise: Promise<User | null> | null = null;

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(userCache);
  const [loading, setLoading] = useState(!userCache);

  useEffect(() => {
    if (userCache) {
      setUser(userCache);
      setLoading(false);
      return;
    }

    if (userPromise) {
      userPromise.then(userData => {
        setUser(userData);
        setLoading(false);
      });
      return;
    }

    userPromise = fetchUserData();
    userPromise.then(userData => {
      setUser(userData);
      setLoading(false);
    });
  }, []);

  const fetchUserData = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'force-cache'
      });
      const data = await response.json();
      
      if (data.success) {
        userCache = data.user;
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
    userCache = null;
    userPromise = null;
  };

  return { user, loading, clearUserCache };
}
