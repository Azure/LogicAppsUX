import { enableDynamicConnections } from '@microsoft/logic-apps-shared';
import { useEffect, useState } from 'react';

export function useShouldEnableDynamicConnections(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        const result = await enableDynamicConnections();
        setEnabled(result);
      } catch (_e) {
        // If the check fails, we assume dynamic connections are not enabled
        setEnabled(false);
      }
    };
    check();
  }, []);
  return enabled;
}
