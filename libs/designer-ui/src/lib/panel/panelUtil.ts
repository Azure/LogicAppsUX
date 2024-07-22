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
  DualView: `${340 * 2}px`,
} as const;
export type PanelSize = (typeof PanelSize)[keyof typeof PanelSize];

export type PanelTabFn = (intl: IntlShape, nodeId: string) => PanelTab;

export interface PanelTabProps {
  nodeId: string;
}

export interface PanelTab {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  visible?: boolean;
  order: number;
  hasErrors?: boolean;
  content: React.ReactElement;
}

export interface CommonPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  width: string;
  layerProps?: any;
  panelLocation: PanelLocation;
  isResizeable?: boolean;
}
