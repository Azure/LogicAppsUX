import type { PanelLocation } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationManifest } from '@microsoft/logic-apps-shared';
export declare const MCP_WIZARD_STEP: {
    readonly CONNECTION: "CONNECTION";
    readonly CREATE_CONNECTION: "CREATE_CONNECTION";
    readonly PARAMETERS: "PARAMETERS";
};
export type McpWizardStep = (typeof MCP_WIZARD_STEP)[keyof typeof MCP_WIZARD_STEP];
export interface McpToolWizardState {
    operation: DiscoveryOperation<DiscoveryResultTypes>;
    currentStep: McpWizardStep;
    connectionId?: string;
    allowedTools?: string[];
    headers?: Record<string, string>;
    isConnectionLocked?: boolean;
}
export interface PanelState {
    connectionContent: ConnectionPanelContentState;
    currentPanelMode: PanelMode;
    discoveryContent: DiscoveryPanelContentState;
    errorContent: ErrorPanelContentState;
    focusReturnElementId?: string;
    isCollapsed: boolean;
    isLoading: boolean;
    location: PanelLocation;
    nodeSearchContent: NodeSearchPanelContentState;
    operationContent: OperationPanelContentState;
    previousPanelMode: PanelMode | undefined;
    workflowParametersContent: WorkflowParametersPanelContentState;
    runHistoryCollapsed: boolean;
}
export interface RelationshipIds {
    graphId: string;
    parentId?: string;
    childId?: string;
    subgraphId?: string;
}
export interface ConnectionPanelContentState {
    isCreatingConnection: boolean;
    panelMode: 'Connection';
    selectedNodeIds: string[];
    expandedConnectorIds: string[];
}
export type ActionPanelFavoriteItem = {
    connectorId: string;
    operationId?: string;
};
export declare const SELECTION_STATES: {
    readonly SEARCH: "SEARCH";
    readonly DETAILS: "DETAILS";
    readonly AZURE_RESOURCE: "AZURE_RESOURCE";
    readonly CUSTOM_SWAGGER: "HTTP_SWAGGER";
};
export type DiscoveryPanelSelectionState = (typeof SELECTION_STATES)[keyof typeof SELECTION_STATES];
export interface DiscoveryPanelContentState {
    favoriteOperations: ActionPanelFavoriteItem[];
    isAddingTrigger: boolean;
    isParallelBranch: boolean;
    isAddingAgentTool?: boolean;
    agentToolMetadata?: {
        newAdditiveSubgraphId: string;
        subGraphManifest: OperationManifest;
    };
    panelMode: 'Discovery';
    relationshipIds: RelationshipIds;
    selectedNodeIds: string[];
    selectedOperationGroupId: string;
    selectedOperationId: string;
    selectedBrowseCategory?: {
        key: string;
        title: string;
    };
    selectionState?: DiscoveryPanelSelectionState;
    mcpToolWizard?: McpToolWizardState;
}
export interface ErrorPanelContentState {
    panelMode: 'Error';
    selectedTabId?: string;
}
export interface OperationPanelContentState {
    panelMode: 'Operation';
    selectedNodeId?: string;
    selectedNodeActiveTabId?: string;
    alternateSelectedNode?: {
        nodeId?: string;
        activeTabId?: string;
        persistence?: 'selected' | 'pinned';
    };
}
export interface NodeSearchPanelContentState {
    panelMode: 'NodeSearch';
}
export interface WorkflowParametersPanelContentState {
    panelMode: 'WorkflowParameters';
}
export interface AssertionsPanelContentState {
    panelMode: 'Assertions';
}
export type PanelContentState = ConnectionPanelContentState | DiscoveryPanelContentState | ErrorPanelContentState | OperationPanelContentState | NodeSearchPanelContentState | WorkflowParametersPanelContentState | AssertionsPanelContentState;
export type PanelMode = PanelContentState['panelMode'];
export declare const PANEL_MODE: Record<PanelMode, PanelMode>;
