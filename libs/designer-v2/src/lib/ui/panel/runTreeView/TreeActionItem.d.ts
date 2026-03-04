import { type LogicAppsV2 } from '@microsoft/logic-apps-shared';
export interface TreeActionItemProps {
    id: string;
    content?: string;
    repetitionName?: string;
    action?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
    icon?: string;
    onClick?: () => void;
    treeItemProps?: any;
    data?: any;
}
export declare const TreeActionItem: ({ id, content, icon, repetitionName, treeItemProps, data }: TreeActionItemProps) => import("react/jsx-runtime").JSX.Element;
