import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { TemplateWizardTabProps } from './model';
export declare const workflowsTab: (resources: Record<string, string>, dispatch: AppDispatch, onSaveWorkflows: (isMultiWorkflow: boolean) => void, { disabled, tabStatusIcon }: TemplateWizardTabProps) => TemplateTabProps;
