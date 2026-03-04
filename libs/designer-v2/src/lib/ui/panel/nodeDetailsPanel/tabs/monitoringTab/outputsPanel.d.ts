/// <reference types="react" />
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
export interface OutputsPanelProps {
    runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
    brandColor: string;
    nodeId: string;
    isLoading: boolean;
    isError: boolean;
}
export declare const OutputsPanel: React.FC<OutputsPanelProps>;
