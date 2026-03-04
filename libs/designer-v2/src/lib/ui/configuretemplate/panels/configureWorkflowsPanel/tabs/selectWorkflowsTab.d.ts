import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
export declare const selectWorkflowsTab: (intl: IntlShape, dispatch: AppDispatch, { isSaving, isPrimaryButtonDisabled, selectedWorkflowsList, onWorkflowsSelected, onNextButtonClick, onClose, }: ConfigureWorkflowsTabProps & {
    onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
    onNextButtonClick: () => Promise<void>;
}) => TemplateTabProps;
