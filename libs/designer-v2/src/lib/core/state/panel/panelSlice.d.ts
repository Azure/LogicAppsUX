import { PanelLocation } from '@microsoft/designer-ui';
import type { LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ActionPanelFavoriteItem, McpToolWizardState, McpWizardStep, PanelMode, PanelState, RelationshipIds } from './panelTypes';
export declare const initialState: PanelState;
export declare const panelSlice: import("@reduxjs/toolkit").Slice<PanelState, {
    expandPanel: (state: import("immer/dist/internal").WritableDraft<PanelState>) => void;
    collapsePanel: (state: import("immer/dist/internal").WritableDraft<PanelState>) => void;
    clearPanel: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        clearPinnedState?: boolean;
    } | undefined>) => void;
    updatePanelLocation: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<PanelLocation | undefined>) => void;
    setAlternateSelectedNode: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        nodeId: string;
        updatePanelOpenState?: boolean;
        panelPersistence?: 'selected' | 'pinned';
    }>) => void;
    setSelectedNodeId: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    changePanelNode: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    expandDiscoveryPanel: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        addingTrigger?: boolean;
        focusReturnElementId?: string;
        isParallelBranch?: boolean;
        isAgentTool?: boolean;
        nodeId: string;
        relationshipIds: RelationshipIds;
    }>) => void;
    addAgentToolMetadata: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        newAdditiveSubgraphId: string;
        subGraphManifest: OperationManifest;
    }>) => void;
    selectOperationGroupId: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    selectOperationId: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    selectBrowseCategory: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        key: string;
        title: string;
    } | undefined>) => void;
    setDiscoverySelectionState: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<'SEARCH' | 'DETAILS' | 'AZURE_RESOURCE' | 'HTTP_SWAGGER' | undefined>) => void;
    setFavoriteOperations: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<ActionPanelFavoriteItem[]>) => void;
    openPanel: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        focusReturnElementId?: string;
        nodeId?: string;
        nodeIds?: string[];
        panelMode: PanelMode;
        referencePanelMode?: PanelMode;
    }>) => void;
    setPinnedPanelActiveTab: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string | undefined>) => void;
    setSelectedPanelActiveTab: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string | undefined>) => void;
    setIsPanelLoading: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<boolean>) => void;
    setIsCreatingConnection: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<boolean>) => void;
    setConnectionPanelExpandedConnectorIds: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string[]>) => void;
    selectErrorsPanelTab: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    initRunInPanel: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<LogicAppsV2.RunInstanceDefinition | null>) => void;
    setRunHistoryCollapsed: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<boolean>) => void;
    openMcpToolWizard: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<{
        operation: McpToolWizardState['operation'];
        connectionId?: string;
        forceCreateConnection?: boolean;
    }>) => void;
    setMcpWizardStep: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<McpWizardStep>) => void;
    setMcpWizardConnection: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string>) => void;
    setMcpWizardTools: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<string[]>) => void;
    setMcpWizardHeaders: (state: import("immer/dist/internal").WritableDraft<PanelState>, action: PayloadAction<Record<string, string>>) => void;
    closeMcpToolWizard: (state: import("immer/dist/internal").WritableDraft<PanelState>) => void;
}, "panel">;
export declare const changePanelNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/changePanelNode">, clearPanel: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    clearPinnedState?: boolean | undefined;
} | undefined, "panel/clearPanel">, collapsePanel: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"panel/collapsePanel">, expandDiscoveryPanel: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    addingTrigger?: boolean | undefined;
    focusReturnElementId?: string | undefined;
    isParallelBranch?: boolean | undefined;
    isAgentTool?: boolean | undefined;
    nodeId: string;
    relationshipIds: RelationshipIds;
}, "panel/expandDiscoveryPanel">, expandPanel: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"panel/expandPanel">, openPanel: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    focusReturnElementId?: string | undefined;
    nodeId?: string | undefined;
    nodeIds?: string[] | undefined;
    panelMode: PanelMode;
    referencePanelMode?: "Error" | "Connection" | "Discovery" | "Operation" | "NodeSearch" | "WorkflowParameters" | "Assertions" | undefined;
}, "panel/openPanel">, selectErrorsPanelTab: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/selectErrorsPanelTab">, selectOperationGroupId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/selectOperationGroupId">, selectOperationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/selectOperationId">, selectBrowseCategory: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    key: string;
    title: string;
} | undefined, "panel/selectBrowseCategory">, setDiscoverySelectionState: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<"SEARCH" | "DETAILS" | "AZURE_RESOURCE" | "HTTP_SWAGGER" | undefined, "panel/setDiscoverySelectionState">, setFavoriteOperations: import("@reduxjs/toolkit").ActionCreatorWithPayload<ActionPanelFavoriteItem[], "panel/setFavoriteOperations">, setPinnedPanelActiveTab: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "panel/setPinnedPanelActiveTab">, setSelectedPanelActiveTab: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "panel/setSelectedPanelActiveTab">, setIsCreatingConnection: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "panel/setIsCreatingConnection">, setConnectionPanelExpandedConnectorIds: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "panel/setConnectionPanelExpandedConnectorIds">, setIsPanelLoading: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "panel/setIsPanelLoading">, setAlternateSelectedNode: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    nodeId: string;
    updatePanelOpenState?: boolean | undefined;
    panelPersistence?: "selected" | "pinned" | undefined;
}, "panel/setAlternateSelectedNode">, setSelectedNodeId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/setSelectedNodeId">, updatePanelLocation: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<PanelLocation | undefined, "panel/updatePanelLocation">, initRunInPanel: import("@reduxjs/toolkit").ActionCreatorWithPayload<LogicAppsV2.RunInstanceDefinition | null, "panel/initRunInPanel">, addAgentToolMetadata: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    newAdditiveSubgraphId: string;
    subGraphManifest: OperationManifest;
}, "panel/addAgentToolMetadata">, setRunHistoryCollapsed: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "panel/setRunHistoryCollapsed">, openMcpToolWizard: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    operation: McpToolWizardState['operation'];
    connectionId?: string | undefined;
    forceCreateConnection?: boolean | undefined;
}, "panel/openMcpToolWizard">, setMcpWizardStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<McpWizardStep, "panel/setMcpWizardStep">, setMcpWizardConnection: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "panel/setMcpWizardConnection">, setMcpWizardTools: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "panel/setMcpWizardTools">, setMcpWizardHeaders: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, string>, "panel/setMcpWizardHeaders">, closeMcpToolWizard: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"panel/closeMcpToolWizard">;
declare const _default: import("@reduxjs/toolkit").Reducer<PanelState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
