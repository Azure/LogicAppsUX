import React from 'react';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { DirectionalHint, ICalloutProps } from '@fluentui/react/lib/Callout';
import { IButtonStyles, IconButton } from '@fluentui/react/lib/Button';
import { FontSizes } from '@fluentui/react/lib/Styling';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { PanelPivot } from './panelpivot';
import { PanelContent } from './panelcontent';
import { PageActionTelemetryData } from '../telemetry/models';
import { useIntl } from 'react-intl';
import { css } from '@fluentui/react/lib/Utilities';

const collapseIconStyle: IButtonStyles = {
  icon: {
    fontSize: FontSizes.small,
  },
};

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export interface PanelTab {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  order?: number;
  content: JSX.Element;
  visibilityPredicate?(): boolean;
}
export interface PanelContainerProps {
  isCollapsed: boolean;
  pivotDisabled?: boolean;
  isRight?: boolean;
  tabs: PanelTab[];
  selectedTab: string;
  width: string;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PanelContainer = ({
  isCollapsed,
  isRight,
  tabs,
  selectedTab,
  width,
  setSelectedTab,
  setIsCollapsed,
  trackEvent,
}: PanelContainerProps) => {
  const intl = useIntl();

  const onTabChange = (itemKey: string): void => {
    console.log(itemKey);
    setSelectedTab(itemKey);
  };

  const getIconClassName = (): string => {
    return css(isRight ? 'collapse-toggle-right' : 'collapse-toggle-left', isCollapsed && 'collapsed');
  };

  const getCollapseIconName = (): string => {
    return isRight && isCollapsed ? 'DoubleChevronLeft8' : 'DoubleChevronRight8';
  };

  const toggleCollapse = (): void => {
    // TODO: 12798935 Analytics (event logging)
    setIsCollapsed(!isCollapsed);
  };

  const RenderHeader = (): JSX.Element => {
    const panelCollapseTitle = intl.formatMessage({
      defaultMessage: 'Collapse/Expand',
      description: 'Text of Tooltip to collapse and expand',
    });
    return (
      <>
        <TooltipHost calloutProps={calloutProps} content={panelCollapseTitle}>
          <IconButton
            ariaLabel={panelCollapseTitle}
            className={getIconClassName()}
            disabled={false}
            iconProps={{ iconName: getCollapseIconName() }}
            styles={collapseIconStyle}
            onClick={toggleCollapse}
          />
        </TooltipHost>
        {!isCollapsed && <div>PANEL HEADER</div>}
      </>
    );
  };

  return (
    <div className="msla-resizable-panel-container">
      <Panel
        isOpen
        onRenderHeader={RenderHeader}
        isBlocking={false}
        hasCloseButton={false}
        type={isRight ? PanelType.custom : PanelType.customNear}
        customWidth={width}
        styles={{
          content: isCollapsed && { padding: 0 },
        }}
      >
        {!isCollapsed && (
          <>
            <PanelPivot isCollapsed={isCollapsed} tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} trackEvent={trackEvent} />
            <PanelContent tabs={tabs} selectedTab={selectedTab} />
          </>
        )}
      </Panel>
    </div>
  );
};
