import { getIntl } from '@microsoft-logic-apps/intl';
import { format, getPropertyValue, ValidationErrorCode, ValidationException } from '@microsoft-logic-apps/utils';

export enum PanelLocation {
  Right = 'RIGHT',
}

export enum PanelTabScope {
  AppLevel = 'APP_LEVEL',
  CardLevel = 'CARD_LEVEL',
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

export function registerTab(tabInfo: PanelTab, registeredTabs: Record<string, PanelTab>): Record<string, PanelTab> {
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
  registeredTabs[tabInfo.name.toLowerCase()] = tabInfo;
  return registeredTabs;
}

export function unregisterTab(name: string, registeredTabs: Record<string, PanelTab>): void {
  if (Object.keys(registeredTabs).some((registeredTabName) => registeredTabName === name)) {
    delete registeredTabs[name];
  }
}

export function deleteAllTabs(registeredTabs: Record<string, PanelTab>): void {
  registeredTabs = {};
}

export function getTabs(sort: boolean, registeredTabs: Record<string, PanelTab>): PanelTab[] {
  if (sort) {
    const tabsSorted = Object.keys(registeredTabs).map((name) => registeredTabs[name]);
    tabsSorted.sort((a, b) => a.order - b.order);
    return tabsSorted;
  } else {
    return Object.keys(registeredTabs).map((name) => registeredTabs[name]);
  }
}

export function getTab(name: string, registeredTabs: Record<string, PanelTab>): PanelTab {
  return getPropertyValue(registeredTabs, name);
}
