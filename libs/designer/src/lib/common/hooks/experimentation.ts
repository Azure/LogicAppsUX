import { enableDynamicConnections } from '@microsoft/logic-apps-shared';
import { useEffect, useState } from 'react';

export function useShouldEnableDynamicConnections(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      const result = await enableDynamicConnections();
      setEnabled(result);
    };
    check();
  }, []);
  return enabled;
}
