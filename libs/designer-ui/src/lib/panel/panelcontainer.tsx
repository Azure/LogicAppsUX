import { ActionButton, CommandBarButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import type { IContextualMenuProps } from '@fluentui/react/lib/ContextualMenu';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { IOverflowSetItemProps, IOverflowSetStyles, OverflowSet } from '@fluentui/react/lib/OverflowSet';
import { IPivotStyles, Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { FontSizes } from '@fluentui/react/lib/Styling';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { EmptyContent } from '../card/cardv2/emptycontent';
import { MenuItemOption } from '../card/menu';
import Constants from '../constants';
import { PageActionTelemetryData, UserAction } from '../../../src/lib/telemetry/models';
import { PanelLocation } from '../utils/panelregistrationutility';
// TODO: 12799013 Panel Root
// import { EXPANDED_SIDE_PANEL_DEFAULT_WIDTH, PanelHeaderControlType } from './panelroot';
// TODO: 13177538 Move ResizablePanel into Fluent UI panel
// import { ResizablePanel } from './resizablepanel';

export interface PanelDimensionChangeEvent {
  width?: number;
  isCollapsed?: boolean;
}

export interface PanelCardTitleChangeEvent {
  newTitle?: string;
}

export interface PanelCommentChangeEvent {
  newComment?: string;
}

interface PanelContainerProps {
  appLevelComponents: JSX.Element[];
  cardIcon?: string;
  cardTitle?: string;
  comment?: string;
  isCollapsed: boolean;
  isDismissButtonEnabled?: boolean;
  isEditingComment?: boolean;
  location: PanelLocation;
  nodeId: string;
  noNodeSelected?: boolean;
  notifyPanelDimensionChange(panelDimensionChangeEvent: PanelDimensionChangeEvent): void;
  // TODO: 12799013 Panel Root
  // panelHeaderControlType: PanelHeaderControlType;
  panelHeaderMenu: MenuItemOption[];
  readOnlyMode: boolean;
  renameTitleDisabled: boolean;
  selectedTab?: string;
  showCommentBox?: boolean;
  tabs: JSX.Element[];
  tabsOverflow: IOverflowSetItemProps[];
  trackEvent(data: PageActionTelemetryData): void;
  width: number | string;
  onCardTitleChange(panelCardTitleChangeEvent: PanelCardTitleChangeEvent): Promise<boolean>;
  onCommentChange(PanelCommentChangeEvent: PanelCommentChangeEvent): void;
  onDismissButtonClicked?(): void;
  onTabChange(tabName?: string): void;
  onRenderWarningMessage?(): JSX.Element;
}

interface TabItemDetails {
  mainTabItems?: IOverflowSetItemProps[];
  overflowItems: IOverflowSetItemProps[];
}

const commandBarButtonStyle: Partial<IButtonStyles> = {
  root: {
    fontSize: FontSizes.medium,
  },
  menuIcon: {
    fontSize: FontSizes.small,
  },
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

const pivotStyle: Partial<IPivotStyles> = {
  root: {
    display: 'none',
    height: '100%',
  },
};

const overflowStyle: IOverflowSetStyles = {
  root: {
    justifyContent: 'stretch',
  },
};

const tooltipHostStyles: ITooltipHostStyles = {
  root: {
    display: 'inline-block',
  },
};

const TAB_HEADER_BUTTON_SELECTED_STYLE: IButtonStyles = {
  flexContainer: {
    borderBottom: '2px solid rgb(0, 120, 212)',
  },
};

const tabHeaderSelectedButtonStyle = (isCollapsed: boolean): IButtonStyles => {
  return {
    ...TAB_HEADER_BUTTON_SELECTED_STYLE,
    ...(!isCollapsed ? { root: { marginRight: 15 } } : undefined),
    textContainer: {
      display: isCollapsed ? 'none' : 'block',
    },
  };
};

const tabHeaderButtonUnselectedStyle = (isCollapsed: boolean): IButtonStyles => {
  return {
    ...(!isCollapsed ? { root: { marginRight: 15 } } : undefined),
    textContainer: {
      display: isCollapsed ? 'none' : 'block',
    },
  };
};

export function PanelContainer({
  isCollapsed,
  selectedTab,
  width,
  tabsOverflow,
  tabs,
  onTabChange,
  trackEvent,
  notifyPanelDimensionChange,
  noNodeSelected,
}: PanelContainerProps) {
  const onTabSelected = (item?: PivotItem): void => {
    if (item) {
      const { itemKey } = item.props;

      trackEventHandler(isCollapsed, itemKey);

      onTabChange(itemKey);
    }
  };

  const onOverflowTabSelected = (itemKey: string): void => {
    trackEventHandler(isCollapsed, itemKey);

    onTabChange(itemKey);
    // TODO: 12799013 Panel Root
    notifyPanelDimensionChange({
      isCollapsed: false,
      // width: EXPANDED_SIDE_PANEL_DEFAULT_WIDTH,
    });
  };

  const trackEventHandler = (isCollapsed: boolean, itemKey?: string): void => {
    trackEvent({
      action: UserAction.click,
      actionContext: {
        isCollapsed,
        itemKey,
      },
      controlId: Constants.TELEMETRY_IDENTIFIERS.PANEL_CONTAINER_TAB,
    });
  };

  const onRenderItem = (item: IOverflowSetItemProps): JSX.Element => {
    const tabStyle = item.key === selectedTab ? tabHeaderSelectedButtonStyle(isCollapsed) : tabHeaderButtonUnselectedStyle(isCollapsed);
    const button = (
      <ActionButton
        ariaLabel={item['name']}
        className="msla-panel-tab-button"
        iconProps={{ iconName: item['icon'] }}
        styles={tabStyle}
        text={item['name']}
        onClick={handleClick(item)}
      />
    );

    if (isCollapsed) {
      return (
        <TooltipHost calloutProps={{ directionalHint: DirectionalHint.leftCenter }} content={item['name']} styles={tooltipHostStyles}>
          {button}
        </TooltipHost>
      );
    }

    return button;
  };

  const handleClick = (item: IOverflowSetItemProps) => {
    return (_: React.MouseEvent<HTMLElement, MouseEvent>): void => {
      onOverflowTabSelected(item.key);
    };
  };

  const onRenderOverflowButton = (overflowItems: any[] | undefined): JSX.Element => {
    const menuProps: IContextualMenuProps = {
      items: (overflowItems || []).map((overflowItem) => ({ ...overflowItem, onClick: handleClick(overflowItem) })),
    };

    return <CommandBarButton menuIconProps={menuIconProps} menuProps={menuProps} styles={commandBarButtonStyle} />;
  };

  const getTabItemDetails = (): TabItemDetails => {
    if (isCollapsed) {
      return { mainTabItems: tabsOverflow, overflowItems: [] };
    }

    // TODO(sopai): investigate using the Canvas2DRenderingContext.measureText API to determine the number of items to show
    const itemsInMainTab = typeof width === 'number' ? Math.floor((width - 50) / 120) : 0;
    const tabSelected: IOverflowSetItemProps = tabsOverflow.filter((tab) => tab.key === selectedTab)[0];
    const selectedTabIndex = tabsOverflow.indexOf(tabSelected);
    const mainTabItems: IOverflowSetItemProps[] =
      selectedTabIndex >= itemsInMainTab
        ? [...tabsOverflow.slice(0, itemsInMainTab - 1), tabSelected]
        : tabsOverflow.slice(0, itemsInMainTab);

    const overflowItems = tabsOverflow.filter((tab) => mainTabItems.indexOf(tab) < 0);
    return {
      mainTabItems,
      overflowItems,
    };
  };

  const getOverflowSet = (): JSX.Element | null => {
    if (noNodeSelected) {
      return null;
    }

    const { mainTabItems, overflowItems } = getTabItemDetails();
    return (
      <div className="msla-panel-menu">
        <OverflowSet
          items={mainTabItems}
          overflowItems={overflowItems}
          styles={overflowStyle}
          vertical={isCollapsed}
          onRenderItem={onRenderItem}
          onRenderOverflowButton={onRenderOverflowButton}
        />
      </div>
    );
  };

  return (
    <div className="msla-resizable-panel-container">
      <div> Panel </div>
      {!noNodeSelected ? (
        <Pivot className="msla-panel-select-card-container" selectedKey={selectedTab} styles={pivotStyle} onLinkClick={onTabSelected}>
          {tabs}
        </Pivot>
      ) : (
        <EmptyContent />
      )}
    </div>
  );
}
