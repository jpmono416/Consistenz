import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook to protect routes that require authentication.
 * Redirects to login if user is not authenticated.
 */
export function useRequireAuth() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !user) {
      router.replace('/(auth)');
    }
  }, [user, authReady, router]);

  return { user, authReady };
}

