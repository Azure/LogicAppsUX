import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import type { WorkflowTemplateData } from '../../../../../core';
export declare const customizeWorkflowsTab: (intl: IntlShape, resources: Record<string, string>, dispatch: AppDispatch, { isSaving, isPrimaryButtonDisabled, onTabClick, disabled, selectedWorkflowsList, updateWorkflowDataField, onSave, duplicateIds, onClose, }: ConfigureWorkflowsTabProps & {
    duplicateIds: string[];
    updateWorkflowDataField: (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => void;
}) => TemplateTabProps;
