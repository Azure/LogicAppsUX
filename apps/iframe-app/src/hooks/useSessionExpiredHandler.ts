import { useState, useCallback } from 'react';
import type { UnauthorizedHandler } from '@microsoft/logic-apps-chat';

export const useSessionExpiredHandler = () => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const handleUnauthorized: UnauthorizedHandler = useCallback(() => {
    // Show the session expired modal
    setIsSessionExpired(true);
  }, []);

  return {
    isSessionExpired,
    handleUnauthorized,
  };
};
