import type { ErrorMessage } from '../../../../core/state/workflow/workflowInterfaces';
export declare const useAllInputErrors: () => Record<string, string[]>;
export declare const useAllSettingErrors: () => Record<string, string[]>;
export declare const useNumWorkflowParameterErrors: () => number;
export declare const useNumFlowErrors: () => number;
export declare const useHostCheckerErrors: () => Record<string, Record<string, ErrorMessage[]>>;
export declare const useNumOperationErrors: () => number;
export declare const useTotalNumErrors: () => number;
