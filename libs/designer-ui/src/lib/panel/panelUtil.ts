import type { IntlShape } from 'react-intl';

export const PanelLocation = {
  Left: 'LEFT',
  Right: 'RIGHT',
} as const;
export type PanelLocation = (typeof PanelLocation)[keyof typeof PanelLocation];

export interface CustomPanelLocation {
  panelLocation: PanelLocation;
  panelMode: string;
}

export const PanelScope = {
  AppLevel: 'APP_LEVEL',
  CardLevel: 'CARD_LEVEL',
} as const;
export type PanelScope = (typeof PanelScope)[keyof typeof PanelScope];

export const PanelSize = {
  Auto: 'auto',
  Small: '300px',
  Medium: '630px',
} as const;
export type PanelSize = (typeof PanelSize)[keyof typeof PanelSize];

export type PanelTabFn = (intl: IntlShape) => PanelTab;
export interface PanelTab {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  visible?: boolean;
  order: number;
  tabErrors?: Record<string, boolean>;
  content: React.ReactElement;
}

export interface CommonPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  width: string;
  layerProps?: any;
  panelLocation: PanelLocation;
}

// Tab logic has been moved to redux in designer, but data-mapper still uses these

export function registerTabs(tabsInfo: PanelTab[], registeredTabs: Record<string, PanelTab>): Record<string, PanelTab> {
  tabsInfo.forEach((tabInfo) => {
    // eslint-disable-next-line no-param-reassign
    registeredTabs[tabInfo.name.toLowerCase()] = tabInfo;
  });

  return { ...registeredTabs };
}

export function getTabs(sort: boolean, registeredTabs: Record<string, PanelTab>): PanelTab[] {
  // Get all tabs not specifically defined as not enabled
  const enabledTabs = Object.values(registeredTabs).filter((tab) => tab.visible !== false);
  return sort ? enabledTabs.sort((a, b) => a.order - b.order) : enabledTabs;
}
