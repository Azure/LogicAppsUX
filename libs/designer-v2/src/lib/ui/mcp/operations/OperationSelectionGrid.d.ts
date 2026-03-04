import { type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
export interface OperationSelectionGridProps {
    isLoading: boolean;
    operationsData: DiscoveryOpArray;
    onSelectAll?: (isSelected: boolean) => void;
    showConnectorName?: boolean;
    hideNoResultsText?: boolean;
    allowSelectAll?: boolean;
}
export declare const OperationSelectionGrid: ({ operationsData, onSelectAll, isLoading, showConnectorName, hideNoResultsText, allowSelectAll, }: OperationSelectionGridProps) => import("react/jsx-runtime").JSX.Element;
