import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { ElkNode } from 'elkjs/lib/elk.bundled';
import type { Edge, Node } from '@xyflow/react';
export declare const spacing: {
    default: string;
    readOnly: string;
    onlyEdge: string;
};
type LayoutContextType = [Node[], Edge[], number[]];
export declare const LayoutProvider: ({ children }: any) => import("react/jsx-runtime").JSX.Element;
export declare const exportForTesting: {
    convertElkGraphToReactFlow: (graph: ElkNode) => LayoutContextType;
    convertWorkflowGraphToElkGraph: (node: WorkflowNode) => ElkNode;
    elkLayout: (graph: ElkNode, readOnly?: boolean) => Promise<ElkNode>;
};
export declare const useLayout: () => LayoutContextType;
export {};
