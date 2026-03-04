import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
export declare const reviewCreateTab: (intl: IntlShape, dispatch: AppDispatch, onCreateClick: () => void, { shouldClearDetails, isCreating, isCreateView, errorMessage, isPrimaryButtonDisabled, previousTabId, onClosePanel, showCloseButton, disabled, }: {
    errorMessage: string | undefined;
    isPrimaryButtonDisabled: boolean;
    isCreateView: boolean;
} & CreateWorkflowTabProps) => TemplateTabProps;
