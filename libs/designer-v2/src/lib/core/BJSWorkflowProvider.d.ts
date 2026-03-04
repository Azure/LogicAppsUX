import type { Workflow } from '../common/models/workflow';
import type { LogicAppsV2, UnitTestDefinition } from '@microsoft/logic-apps-shared';
import type React from 'react';
export interface BJSWorkflowProviderProps {
    workflowId?: string;
    workflow: Workflow;
    customCode?: Record<string, string>;
    runInstance?: LogicAppsV2.RunInstanceDefinition | null;
    children?: React.ReactNode;
    appSettings?: Record<string, any>;
    unitTestDefinition?: UnitTestDefinition | null;
    isMultiVariableEnabled?: boolean;
}
export declare const BJSWorkflowProvider: React.FC<BJSWorkflowProviderProps>;
