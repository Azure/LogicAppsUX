import type { MouseEventHandler } from 'react';
import type { SubgraphType } from '@microsoft/logic-apps-shared';
interface SubgraphCardProps {
    id: string;
    parentId: string;
    title: string;
    subgraphType: SubgraphType;
    collapsed?: boolean;
    handleCollapse?: (includeNested?: boolean) => void;
    readOnly?: boolean;
    onClick?(id?: string): void;
    onContextMenu?: MouseEventHandler<HTMLElement>;
    onDeleteClick?(): void;
    showAddButton?: boolean;
    contextMenuItems?: JSX.Element[];
    errorMessages?: string[];
    nodeIndex?: number;
    setFocus?: boolean;
    isLoading?: boolean;
    isSelected?: boolean;
    active?: boolean;
}
export declare const SubgraphCard: React.FC<SubgraphCardProps>;
export {};
