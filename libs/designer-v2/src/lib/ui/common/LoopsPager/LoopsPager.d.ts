export interface LoopsPagerProps {
    metadata: any;
    scopeId: string;
    collapsed: boolean;
    focusElement?: (index: number, nodeId: string) => void;
    useToolRun?: boolean;
}
export declare const LoopsPager: ({ metadata, scopeId, collapsed, focusElement, useToolRun }: LoopsPagerProps) => import("react/jsx-runtime").JSX.Element | null;
