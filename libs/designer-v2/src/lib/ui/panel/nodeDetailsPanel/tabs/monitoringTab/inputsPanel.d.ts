/// <reference types="react" />
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
export interface InputsPanelProps {
    runMetaData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
    brandColor: string;
    nodeId: string;
    isLoading: boolean;
    isError: boolean;
}
export declare const InputsPanel: React.FC<InputsPanelProps>;
