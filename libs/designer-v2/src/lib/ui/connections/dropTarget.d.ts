/// <reference types="react" />
interface DropTargetProps {
    graphId: string;
    parentId?: string;
    childId?: string;
    upstreamNodesOfChild: string[];
    preventDropItemInA2A: boolean;
    isWithinAgenticLoop: boolean;
}
export declare const DropTarget: React.FC<DropTargetProps>;
export {};
