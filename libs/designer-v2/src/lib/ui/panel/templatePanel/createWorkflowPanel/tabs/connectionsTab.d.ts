/// <reference types="react" />
import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
export declare const ConnectionsPanel: React.FC;
export declare const connectionsTab: (intl: IntlShape, dispatch: AppDispatch, { disabled, shouldClearDetails, previousTabId, isCreating, nextTabId, hasError, showCloseButton, onClosePanel, }: CreateWorkflowTabProps) => TemplateTabProps;
