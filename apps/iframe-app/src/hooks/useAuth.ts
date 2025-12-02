import { useState, useCallback } from 'react';
import { openLoginPopup, checkAuthStatus } from '../lib/authHandler';

export interface UseAuthOptions {
  baseUrl: string;
  /** If true, check auth status on mount */
  checkOnMount?: boolean;
}

export interface UseAuthResult {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication check/login is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Trigger the login popup */
  login: () => void;
  /** Re-check authentication status */
  checkAuth: () => Promise<boolean>;
}

/**
 * Hook to manage authentication state for the iframe app
 */
export function useAuth({ baseUrl, checkOnMount = false }: UseAuthOptions): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(checkOnMount);
  const [error, setError] = useState<Error | null>(null);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const authenticated = await checkAuthStatus(baseUrl);
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const login = useCallback(() => {
    setIsLoading(true);
    setError(null);

    openLoginPopup({
      baseUrl,
      postLoginRedirectUri: '/',
      onSuccess: () => {
        console.log('Login successful');
        setIsAuthenticated(true);
        setIsLoading(false);
      },
      onFailed: () => {
        console.log('Login failed or cancelled');
        setError(new Error('Login failed or was cancelled'));
        setIsAuthenticated(false);
        setIsLoading(false);
      },
    });
  }, [baseUrl]);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    checkAuth,
  };
}
