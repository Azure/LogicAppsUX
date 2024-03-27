import { Spinner, Text } from '@fluentui/react-components';
import { useNodesAndDynamicDataInitialized } from '../../../core';

import { CheckmarkCircle24Filled } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';

export const InitializationSpinner = () => {
  const isInitialized = useNodesAndDynamicDataInitialized();

  // Start a timer on first render, and stop when the graph is initialized
  // This is useful for debugging performance issues

  const startTime = useMemo(() => new Date().getTime(), []);
  const [timeText, setTimeText] = useState('Initializing...');
  useEffect(() => {
    if (isInitialized) {
      const endTime = new Date().getTime();
      setTimeText(`${(endTime - startTime) / 1000}s`);
    }
  }, [isInitialized, startTime]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ position: 'absolute', top: '64px', left: '64px' }}>
      {!isInitialized ? (
        <Spinner label="Initializing..." size="extra-tiny" />
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CheckmarkCircle24Filled fontSize={'16px'} color="green" />
          <Text>{timeText}</Text>
        </div>
      )}
    </div>
  );
};
