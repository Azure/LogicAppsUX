import { type Template } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../../../core/state/templates/store';
import { type IntlShape } from 'react-intl';
import type { TemplateTabProps } from '@microsoft/designer-ui';
export declare const SummaryPanel: ({ workflowId }: {
    workflowId: string;
}) => import("react/jsx-runtime").JSX.Element | null;
export declare const summaryTab: (intl: IntlShape, dispatch: AppDispatch, workflowId: string, clearDetailsOnClose: boolean, { templateId, workflowAppName, isMultiWorkflow, showCreate, showCloseButton }: Template.TemplateContext, onClose?: () => void) => TemplateTabProps;
