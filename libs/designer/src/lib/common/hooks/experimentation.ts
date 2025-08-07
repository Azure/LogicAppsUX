import { disableChannelsInAgentLoop, enableDynamicConnections } from '@microsoft/logic-apps-shared';
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

export function useChannelsTabForAgentLoop(): boolean {
  const [enabled, setEnabled] = useState<boolean>(false);
  useEffect(() => {
    const check = async () => {
      try {
        const result = await disableChannelsInAgentLoop();
        setEnabled(result);
      } catch (_e) {
        // If the check fails, it is not enabled
        setEnabled(false);
      }
    };
    check();
  }, []);
  return enabled;
}
