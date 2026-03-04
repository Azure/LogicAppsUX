import { type ChatHistory, type LogicAppsV2, type Run } from '@microsoft/logic-apps-shared';
export declare const runsQueriesKeys: {
    runs: string;
    run: string;
    allRuns: string;
    useNodeRepetition: string;
    useNodeRepetitions: string;
    useScopeFailedRepetitions: string;
    useAgentRepetition: string;
    useAgentActionsRepetition: string;
    useActionsChatHistory: string;
    useRunChatHistory: string;
    useAgentChatInvokeUri: string;
    useRunInstance: string;
    useResubmitRun: string;
    useCancelRun: string;
};
export declare const useRunsInfiniteQuery: (enabled?: boolean) => import("@tanstack/react-query").UseInfiniteQueryResult<{
    runs: Run[];
    nextLink: string | undefined;
}, unknown>;
export declare const useAllRuns: () => Run[];
export declare const useRun: (runId: string | undefined, enabled?: boolean) => import("@tanstack/react-query").UseQueryResult<Run, unknown>;
export declare const getRun: (runId: string) => Promise<Run>;
export declare const useNodeRepetition: (isEnabled: boolean, nodeId: string, runId: string | undefined, repetitionName: string | undefined, parentStatus: string | undefined, parentRunIndex: number | undefined, isWithinAgenticLoop: boolean) => import("@tanstack/react-query").UseQueryResult<LogicAppsV2.RunRepetition | {
    properties: {
        status: string;
        inputsLink: null;
        outputsLink: null;
        startTime: null;
        endTime: null;
        trackingId: null;
        correlation: null;
    };
}, unknown>;
export declare const getRunRepetition: (nodeId: string, runId: string, repetitionName: string) => Promise<LogicAppsV2.RunRepetition>;
export declare const useNodeRepetitions: (isEnabled: boolean, nodeId: string, runId: string | undefined) => import("@tanstack/react-query").UseQueryResult<LogicAppsV2.RunRepetition[], unknown>;
export declare const getNodeRepetitions: (nodeId: string, runId: string, noCache?: boolean) => Promise<LogicAppsV2.RunRepetition[]>;
export declare const useScopeFailedRepetitions: (normalizedType: string, nodeId: string, runId: string | undefined) => import("@tanstack/react-query").UseQueryResult<number[], unknown>;
export declare const useAgentRepetition: (isEnabled: boolean, nodeId: string, runId: string | undefined, repetitionName: string, parentStatus: string | undefined, runIndex: number | undefined) => import("@tanstack/react-query").UseQueryResult<LogicAppsV2.RunRepetition, unknown>;
export declare const getAgentRepetition: (nodeId: string, runId: string, repetitionName: string) => Promise<LogicAppsV2.RunRepetition>;
export declare const useAgentRepetitions: (isEnabled: boolean, nodeId: string, runId: string | undefined) => import("@tanstack/react-query").UseQueryResult<LogicAppsV2.RunRepetition[], unknown>;
export declare const getAgentRepetitions: (nodeId: string, runId: string, noCache?: boolean) => Promise<LogicAppsV2.RunRepetition[]>;
export declare const useResubmitRun: (runId: string, triggerName: string) => import("@tanstack/react-query").UseMutationResult<void, unknown, void, unknown>;
export declare const useCancelRun: (runId: string) => import("@tanstack/react-query").UseMutationResult<any, unknown, void, unknown>;
export declare const useAgentActionsRepetition: (isEnabled: boolean, nodeId: string, runId: string | undefined, repetitionName: string, runIndex: number | undefined) => import("@tanstack/react-query").UseQueryResult<LogicAppsV2.RunRepetition[], unknown>;
export declare const getAgentActionsRepetition: (nodeId: string, runId: string | undefined, repetitionName: string, runIndex: number | undefined, noCache?: boolean) => Promise<LogicAppsV2.RunRepetition[]>;
export declare const useActionsChatHistory: (nodeIds: string[], runId: string | undefined, isEnabled: boolean) => import("@tanstack/react-query").UseQueryResult<ChatHistory[], unknown>;
export declare const useRunChatHistory: (runId: string | undefined, isEnabled: boolean) => import("@tanstack/react-query").UseQueryResult<{
    nodeId: string;
    messages: import("@microsoft/logic-apps-shared").MessageEntry[];
}[] | null, unknown>;
export declare const useChatHistory: (isMonitoringView: boolean, runId: string | undefined, nodeIds: string[] | undefined, isA2AWorkflow: boolean) => import("@tanstack/react-query").QueryObserverLoadingErrorResult<ChatHistory[], unknown> | import("@tanstack/react-query").QueryObserverLoadingResult<ChatHistory[], unknown> | import("@tanstack/react-query").QueryObserverRefetchErrorResult<{
    nodeId: string;
    messages: import("@microsoft/logic-apps-shared").MessageEntry[];
}[] | null, unknown> | import("@tanstack/react-query").QueryObserverSuccessResult<{
    nodeId: string;
    messages: import("@microsoft/logic-apps-shared").MessageEntry[];
}[] | null, unknown>;
export declare const useAgentChatInvokeUri: (isMonitoringView: boolean, isAgenticWorkflow: boolean, id: string | undefined) => import("@tanstack/react-query").UseQueryResult<any, unknown>;
export declare const parseFailedRepetitions: (failedRunRepetitions: LogicAppsV2.RunRepetition[], nodeId: string) => number[];
