import { collapsePanel, expandPanel } from '../../core/state/panelSlice';
import { RootState } from '../core/state/Store';
import { aboutTab } from './panelTabs/aboutTab';
import { codeViewTab } from './panelTabs/codeViewTab';
import { settingsTab } from './panelTabs/settingsTab';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { MenuItemOption, PageActionTelemetryData, PanelTab, registerTabs } from '@microsoft/designer-ui';
import {
  getTabs,
  MenuItemType,
  PanelContainer,
  PanelHeaderControlType,
  PanelLocation,
  PanelScope,
  PanelSize,
  registerTab,
} from '@microsoft/designer-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const LeftHandPanel = (): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const { collapsed } = useSelector((state: RootState) => {
    return state.panel;
  });

  const [width, setWidth] = useState(PanelSize.Auto);

  const [registeredTabs, setRegisteredTabs] = useState<Record<string, PanelTab>>({});

  useEffect(() => {
    setRegisteredTabs((currentTabs) => registerTabs([], currentTabs));
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

  const togglePanel = (): void => {
    if (!collapsed) {
      collapse();
    } else {
      expand();
    }
  };

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
    />
  );
};

// TODO: 12798935 Analytics (event logging)
const handleTrackEvent = (data: PageActionTelemetryData): void => {
  console.log('Track Event');
};
