import { Checkbox } from '@fluentui/react';
import { ProviderWrappedContext } from '@microsoft/logic-apps-designer';
import { useContext } from 'react';

const ContextSettings = () => {
  const { readOnly, toggleReadOnly, isMonitoringView, toggleMonitoringView } = useContext(ProviderWrappedContext) ?? {};

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Checkbox label="Read Only" disabled={isMonitoringView} checked={readOnly} onChange={toggleReadOnly} />
      <Checkbox label="Is Monitoring View" checked={isMonitoringView} onChange={toggleMonitoringView} />
    </div>
  );
};

export default ContextSettings;
