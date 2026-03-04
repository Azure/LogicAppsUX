import type { TemplateErrors, WorkflowErrors, WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
interface ErrorDetails {
    code: string;
    message: string;
    target: string;
    additionalInfo: {
        type: string;
        info: ErrorInfoWithTarget;
    }[];
}
interface ErrorInfoWithTarget {
    code: string;
    message: string;
    target: string;
}
export interface TemplateValidationError {
    code: string;
    message: string;
    details: ErrorDetails[];
    additionalInfo?: {
        type: string;
        info: ErrorInfoWithTarget;
    }[];
}
export interface ApiValidationError {
    template: TemplateErrors;
    workflows: Record<string, WorkflowErrors>;
    saveGeneral?: {
        template?: string;
        workflows?: string;
    };
}
export declare const parseValidationError: (error: TemplateValidationError) => ApiValidationError;
export declare const workflowsHaveErrors: (apiErrors: Record<string, WorkflowErrors>, workflowsData: Record<string, WorkflowTemplateData>) => boolean;
export {};
