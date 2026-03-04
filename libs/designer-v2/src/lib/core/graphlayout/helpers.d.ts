import type { WorkflowNode } from '../parsers/models/workflowNode';
export declare const footerMarker = "#footer";
export interface LayoutRelevantData {
    id: string;
    height: number | undefined;
    width: number | undefined;
    type: string | undefined;
    edges: LayoutRelevantEdgeData[] | undefined;
    children: Array<LayoutRelevantData | undefined> | undefined;
    hasFooter: boolean;
    hasOnlyEdge: boolean | undefined;
}
interface LayoutRelevantEdgeData {
    id: string;
    source: string;
    target: string;
    type: string | undefined;
}
export declare const getLayoutRelevantData: (node: WorkflowNode | undefined) => LayoutRelevantData | undefined;
export {};
