import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { type Template } from '@microsoft/logic-apps-shared';
export declare const WorkflowPanel: ({ workflowId }: {
    workflowId: string;
}) => import("react/jsx-runtime").JSX.Element | null;
export declare const workflowTab: (intl: IntlShape, dispatch: AppDispatch, workflowId: string, clearDetailsOnClose: boolean, onPrimaryButtonClick: (() => void) | undefined, { templateId, workflowAppName, isMultiWorkflow, showCreate, showCloseButton }: Template.TemplateContext, onClose?: () => void) => TemplateTabProps;
