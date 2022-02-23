import { PanelContainer } from './';
import { PageActionTelemetryData } from '../telemetry/models';
import { useEffect, useState } from 'react';
import { workflowParametersTab, aboutTab, connectionTab } from './registeredtabs';
export interface PanelRootProps {
  selectedTabId?: string;
}

export const PanelRoot = ({ selectedTabId }: PanelRootProps): JSX.Element => {
  const [selectedTab, setSelectedTab] = useState(workflowParametersTab.name);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState('auto');
  useEffect(() => {
    isCollapsed ? setWidth('auto') : setWidth('630px');
  }, [isCollapsed]);
  return (
    <PanelContainer
      width={width}
      isRight
      isCollapsed={isCollapsed}
      tabs={[workflowParametersTab, aboutTab, connectionTab]}
      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}
      setIsCollapsed={setIsCollapsed}
      trackEvent={handleTrackEvent}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
const handleTrackEvent = (data: PageActionTelemetryData): void => {
  console.log('Track Event');
};
