/* eslint-disable no-param-reassign */
import { getPropertyValue } from '@microsoft-logic-apps/utils';

export enum PanelLocation {
  Left = 'LEFT',
  Right = 'RIGHT',
}

export enum PanelScope {
  AppLevel = 'APP_LEVEL',
  CardLevel = 'CARD_LEVEL',
}

export enum PanelSize {
  Auto = 'auto',
  Small = '300px',
  Medium = '630px',
}

export interface PanelTab {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  order: number;
  content: React.ReactElement;
  visibilityPredicate?(): boolean;
}

export interface CommonPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  width: string;
}

export function registerTabs(tabsInfo: PanelTab[], registeredTabs: Record<string, PanelTab>): Record<string, PanelTab> {
  tabsInfo.forEach((tabInfo) => {
    registerTab(tabInfo, registeredTabs);
  });

  return { ...registeredTabs };
}

export function registerTab(tabInfo: PanelTab, registeredTabs: Record<string, PanelTab>): Record<string, PanelTab> {
  // Commenting this out, if the tab is already registered, we might want to update it instead of error out
  // We could possibly have a separate update method, but I think this is the simplest way to do it - Riley
  /*
    const intl = getIntl();
    const tabAlreadyRegistered = intl.formatMessage(
      {
        defaultMessage: 'Tab with : {tabname} name is already registered',
        description: 'This is the  message shown in case of an error of a tab already existing with the name.',
      },
      { tabname: tabInfo.name }
    );
    if (getTab(tabInfo.name, registeredTabs)) {
      throw new ValidationException(ValidationErrorCode.UNSPECIFIED, format(tabAlreadyRegistered, tabInfo.name));
    }
  */
  registeredTabs[tabInfo.name.toLowerCase()] = tabInfo;
  return registeredTabs;
}

export function unregisterTab(name: string, registeredTabs: Record<string, PanelTab>): void {
  if (Object.keys(registeredTabs).some((registeredTabName) => registeredTabName === name)) {
    delete registeredTabs[name];
  }
}

export function getTabs(sort: boolean, registeredTabs: Record<string, PanelTab>): PanelTab[] {
  // Get all tabs not specifically defined as not enabled
  const enabledTabs = Object.values(registeredTabs).filter((tab) => tab.enabled !== false);
  return sort ? enabledTabs.sort((a, b) => a.order - b.order) : enabledTabs;
}

export function getTab(name: string, registeredTabs: Record<string, PanelTab>): PanelTab {
  return getPropertyValue(registeredTabs, name);
}
