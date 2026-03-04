import { PanelLocation } from '@microsoft/designer-ui';
import type { CustomPanelLocation } from '@microsoft/designer-ui';
import type { BackgroundProps } from '@xyflow/react';
export interface DesignerProps {
    backgroundProps?: BackgroundProps;
    panelLocation?: PanelLocation;
    customPanelLocations?: CustomPanelLocation[];
    displayRuntimeInfo?: boolean;
}
export declare const SearchPreloader: () => null;
export declare const Designer: (props: DesignerProps) => import("react/jsx-runtime").JSX.Element;
