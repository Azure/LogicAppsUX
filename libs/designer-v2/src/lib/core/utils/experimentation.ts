import { enableAPIMGatewayConnection } from '@microsoft/logic-apps-shared';
import { useEffect, useState } from 'react';

export function useShouldEnableAPIMGatewayConnection(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await enableAPIMGatewayConnection();
      setEnabled(result);
    };
    check();
  }, []);

  return enabled;
}
