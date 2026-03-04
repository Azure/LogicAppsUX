/// <reference types="react" />
import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
export declare const ParametersPanel: React.FC;
export declare const parametersTab: (intl: IntlShape, dispatch: AppDispatch, { isCreating, disabled, shouldClearDetails, previousTabId, hasError, onClosePanel, showCloseButton }: CreateWorkflowTabProps) => TemplateTabProps;
