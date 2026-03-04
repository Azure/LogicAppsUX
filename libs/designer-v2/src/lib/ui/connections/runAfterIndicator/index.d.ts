/// <reference types="react" />
export interface RunAfterIndicatorProps {
    statuses: string[];
    sourceNodeId: string;
}
export interface CollapsedRunAfterIndicatorProps {
    filteredRunAfters: Record<string, string[]>;
    runAfterCount: number;
}
export declare function RunAfterIndicator({ statuses, sourceNodeId }: RunAfterIndicatorProps): JSX.Element;
export declare function CollapsedRunAfterIndicator({ filteredRunAfters, runAfterCount }: CollapsedRunAfterIndicatorProps): JSX.Element;
