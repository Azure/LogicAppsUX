import { enableFoundryServiceConnection } from '@microsoft/logic-apps-shared';
import { useEffect, useState } from 'react';

export function useShouldEnableFoundryServiceConnection(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await enableFoundryServiceConnection();
      setEnabled(result);
    };
    check();
  }, []);

  return enabled;
}
