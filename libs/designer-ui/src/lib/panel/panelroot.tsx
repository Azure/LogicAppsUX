import { PanelContainer } from './';
import { PageActionTelemetryData } from '../telemetry/models';
import { useState } from 'react';
import { workflowParametersTab } from './registeredtabs';
export interface PanelRootProps {
  selectedTabId?: string;
  width: string;
}

export const PanelRoot = ({ selectedTabId, width }: PanelRootProps): JSX.Element => {
  const [selectedTab, setSelectedTab] = useState('');
  return (
    <PanelContainer
      width={width}
      isRight
      isCollapsed={false}
      tabs={[workflowParametersTab]}
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
