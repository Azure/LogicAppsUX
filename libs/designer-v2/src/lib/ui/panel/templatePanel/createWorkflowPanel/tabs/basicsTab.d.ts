import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import type { IntlShape } from 'react-intl';
export declare const WorkflowBasics: () => import("react/jsx-runtime").JSX.Element;
export declare const basicsTab: (intl: IntlShape, dispatch: AppDispatch, { disabled, shouldClearDetails, isCreating, nextTabId, hasError, onClosePanel, showCloseButton }: CreateWorkflowTabProps) => TemplateTabProps;
