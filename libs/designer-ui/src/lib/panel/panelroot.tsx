import { PanelContainer } from './';
import { PageActionTelemetryData } from '../telemetry/models';
import { useEffect, useState } from 'react';
import { workflowParametersTab, aboutTab, connectionTab } from './registeredtabs';
export interface PanelRootProps {
  selectedTabId?: string;
  isCollapsed: boolean;
}

export const PanelRoot = ({ selectedTabId, isCollapsed }: PanelRootProps): JSX.Element => {
  const [selectedTab, setSelectedTab] = useState(workflowParametersTab.name);
  const [width, setWidth] = useState('500px');
  useEffect(() => {
    isCollapsed ? setWidth('50px') : setWidth('500px');
  }, [isCollapsed]);
  return (
    <PanelContainer
      width={width}
      isRight
      isCollapsed={isCollapsed}
      tabs={[workflowParametersTab, aboutTab, connectionTab]}
      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}
      trackEvent={handleTrackEvent}
    />
  );
};

const handleTrackEvent = (data: PageActionTelemetryData): void => {
  // this._designerContext.Analytics.trackEvent(EventTypes.PAGEACTION_TELEMETRY, data);
  console.log('trackdata');
};
