import { enableParseDocumentWithMetadata } from '@microsoft/logic-apps-shared';
import { useEffect, useState } from 'react';

export function useShouldEnableParseDocumentWithMetadata(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await enableParseDocumentWithMetadata();
      setEnabled(result);
    };
    check();
  }, []);

  return enabled;
}
