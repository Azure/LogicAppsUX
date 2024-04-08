import { Spinner, Text } from '@fluentui/react-components';
import { useNodesAndDynamicDataInitialized } from '../../../../core';

import { CheckmarkCircle24Filled } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';

export const InitializationTimer = () => {
  const isInitialized = useNodesAndDynamicDataInitialized();

  // Start a timer on first render, and stop when the graph is initialized
  // This is useful for debugging performance issues
  // Not extremely accurate, but good indicator of first render to initialization time

  const startTime = useMemo(() => new Date().getTime(), []);
  const [timeText, setTimeText] = useState('Initializing...');
  useEffect(() => {
    if (isInitialized) {
      const endTime = new Date().getTime();
      setTimeText(`Initialized in ${(endTime - startTime) / 1000}s`);
    }
  }, [isInitialized, startTime]);

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {!isInitialized ? (
        <Spinner size="extra-tiny" />
      ) : (
        <CheckmarkCircle24Filled className={'msla-connection-status-icon--success'} fontSize={'16px'} />
      )}
      <Text>{timeText}</Text>
    </div>
  );
};
