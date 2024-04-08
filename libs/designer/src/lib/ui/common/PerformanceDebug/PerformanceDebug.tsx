import { Card, Divider, Text } from '@fluentui/react-components';
import { InitializationTimer } from './Tools/InitializationTimer';
import { useShowPerformanceDebug } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { ReduxActionCounts } from './Tools/ReduxActionCount';

export const PerformanceDebugTool = () => {
  const showTool = useShowPerformanceDebug();

  // Don't render in prod
  if (!showTool || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card style={{ position: 'absolute', top: '64px', left: '32px', minWidth: '200px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Text weight="bold">Performance Debug Tools</Text>
        <InitializationTimer />
        <Divider />
        <ReduxActionCounts />
      </div>
    </Card>
  );
};
