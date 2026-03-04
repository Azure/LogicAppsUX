import type { MessageLevel, NodeMessage } from '@microsoft/designer-ui';
interface NodeErrorsProps {
    nodeId: string;
    level: MessageLevel;
    messagesBySubtitle?: Record<string, NodeMessage[]>;
}
export declare const NodeErrors: (props: NodeErrorsProps) => import("react/jsx-runtime").JSX.Element;
export {};
