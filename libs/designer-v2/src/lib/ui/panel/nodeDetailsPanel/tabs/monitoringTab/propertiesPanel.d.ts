/// <reference types="react" />
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
export interface PropertiesPanelProps {
    properties?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
    brandColor: string;
    nodeId: string;
}
export declare const PropertiesPanel: React.FC<PropertiesPanelProps>;
