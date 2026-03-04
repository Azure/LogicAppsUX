import type { Template } from '@microsoft/logic-apps-shared';
export interface WorkflowConnectionsProps {
    connections: Record<string, Template.Connection>;
    viewMode?: 'compact' | 'full';
}
export declare const WorkflowConnections: ({ connections, viewMode }: WorkflowConnectionsProps) => import("react/jsx-runtime").JSX.Element;
