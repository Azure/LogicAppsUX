import { useState, useCallback } from 'react';
import type { UnauthorizedHandler } from '@microsoft/logicAppsChat';

export const useSessionExpiredHandler = () => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const handleUnauthorized: UnauthorizedHandler = useCallback((event) => {
    console.log('Session expired or redirect detected:', event);

    // Show the session expired modal
    setIsSessionExpired(true);

    // You could also check specific conditions here
    // For example, only show modal for certain URLs or status texts
    if (event.statusText === 'Redirect') {
      console.log('Redirect detected - likely session timeout');
    }
  }, []);

  return {
    isSessionExpired,
    handleUnauthorized,
  };
};
