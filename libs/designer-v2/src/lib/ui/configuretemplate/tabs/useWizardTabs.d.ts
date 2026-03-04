import type { Template } from '@microsoft/logic-apps-shared';
export declare const useConfigureTemplateWizardTabs: ({ onSaveWorkflows, onSaveTemplate, }: {
    onSaveWorkflows: (isMultiWorkflow: boolean) => void;
    onSaveTemplate: (prevStatus: Template.TemplateEnvironment, newStatus?: Template.TemplateEnvironment) => void;
}) => import("@microsoft/designer-ui").TemplateTabProps[];
