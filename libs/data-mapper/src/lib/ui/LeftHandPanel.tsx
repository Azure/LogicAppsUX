/* eslint-disable @typescript-eslint/no-empty-function */
import { collapsePanel, expandPanel } from '../core/state/PanelSlice';
import type { RootState } from '../core/state/Store';
import { toolboxTab } from './tabs/ToolboxTab';
import type { ILayerProps } from '@fluentui/react';
import type { PageActionTelemetryData, PanelTab } from '@microsoft/designer-ui';
import { getTabs, PanelContainer, PanelHeader, PanelLocation, PanelScope, PanelSize, registerTabs } from '@microsoft/designer-ui';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface LeftHandPanelProps {
  selectedTabId?: string;
  layerProps?: ILayerProps;
}

export const LeftHandPanel = ({ selectedTabId, layerProps }: LeftHandPanelProps): JSX.Element => {
  const dispatch = useDispatch();

  const { collapsed } = useSelector((state: RootState) => {
    return state.panel;
  });

  const [selectedTab, setSelectedTab] = useState(selectedTabId);
  const [width, setWidth] = useState(PanelSize.Auto);
  const [registeredTabs, setRegisteredTabs] = useState<Record<string, PanelTab>>({});

  useEffect(() => {
    setRegisteredTabs((currentTabs) => registerTabs([toolboxTab], currentTabs));
  }, []);

  useEffect(() => {
    setSelectedTab(getTabs(true, registeredTabs)[0]?.name.toLowerCase());
  }, [registeredTabs]);

  useEffect(() => {
    collapsed ? setWidth(PanelSize.Auto) : setWidth(PanelSize.Small);
  }, [collapsed]);

  const collapse = useCallback(() => {
    dispatch(collapsePanel());
  }, [dispatch]);

  const expand = useCallback(() => {
    dispatch(expandPanel());
  }, [dispatch]);

  const togglePanel = useCallback((): void => {
    if (!collapsed) {
      collapse();
    } else {
      expand();
    }
  }, [collapsed, collapse, expand]);

  const renderHeader = useCallback((): JSX.Element => {
    return (
      <PanelHeader
        isCollapsed={collapsed}
        headerLocation={PanelLocation.Left}
        panelScope={PanelScope.AppLevel}
        panelHeaderMenu={[]}
        includeTitle={false}
        toggleCollapse={togglePanel}
        commentChange={() => {}}
      />
    );
  }, [collapsed, togglePanel]);

  return (
    <PanelContainer
      panelLocation={PanelLocation.Left}
      isCollapsed={collapsed}
      panelScope={PanelScope.AppLevel}
      selectedTab={selectedTab}
      tabs={registeredTabs}
      width={width}
      setSelectedTab={setSelectedTab}
      toggleCollapse={togglePanel}
      trackEvent={handleTrackEvent}
      noNodeSelected={false}
      panelHeaderMenu={[]}
      showCommentBox={false}
      renderHeader={renderHeader}
      layerProps={layerProps}
      onCommentChange={() => {}}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
const handleTrackEvent = (_data: PageActionTelemetryData): void => {
  console.log('Track Event');
};
