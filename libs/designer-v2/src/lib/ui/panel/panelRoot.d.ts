/// <reference types="react" />
import type { CustomPanelLocation } from '@microsoft/designer-ui';
import { PanelLocation } from '@microsoft/designer-ui';
export interface PanelRootProps {
    panelContainerRef: React.MutableRefObject<HTMLElement | null>;
    panelLocation: PanelLocation;
    customPanelLocations?: CustomPanelLocation[];
    isResizeable?: boolean;
}
export declare const PanelRoot: (props: PanelRootProps) => JSX.Element | null;
