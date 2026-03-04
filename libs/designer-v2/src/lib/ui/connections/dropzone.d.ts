/// <reference types="react" />
export interface DropZoneProps {
    graphId: string;
    parentId?: string;
    childId?: string;
    isLeaf?: boolean;
    tabIndex?: number;
}
export declare const DropZone: React.FC<DropZoneProps>;
