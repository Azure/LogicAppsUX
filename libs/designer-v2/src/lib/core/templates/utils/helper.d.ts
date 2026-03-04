import { type Template } from '@microsoft/logic-apps-shared';
import type { AppDispatch, WorkflowTemplateData } from '../../../core';
import type { IntlShape } from 'react-intl';
import type { FilterObject } from '@microsoft/designer-ui';
import type { TemplateData } from '../../state/templates/manifestSlice';
export declare const getCurrentWorkflowNames: (workflows: {
    id: string;
    name: string;
}[], idToSkip: string) => string[];
export declare const getQuickViewTabs: (intl: IntlShape, dispatch: AppDispatch, workflowId: string, clearDetailsOnClose: boolean, { templateId, workflowAppName, isMultiWorkflow, showCreate, showCloseButton }: Template.TemplateContext, onCloseButtonClick?: () => void) => import("@microsoft/designer-ui").TemplateTabProps[];
export declare const getUniqueConnectors: (connections: Record<string, Template.Connection>, subscriptionId: string, location: string) => Template.FeaturedConnector[];
export declare const getUniqueConnectorsFromConnections: (originalAllConnectors: Template.FeaturedConnector[], subscriptionId: string, location: string, removeBuiltInConnectors?: boolean) => Template.FeaturedConnector[];
export declare const getFilteredTemplates: (templates: Record<string, TemplateData>, filters: {
    keyword?: string;
    sortKey: string;
    connectors?: FilterObject[];
    status?: FilterObject[];
    detailFilters: Record<Template.DetailsType, FilterObject[]>;
}, isConsumption: boolean) => string[];
export declare const validateParameterValue: (data: {
    type: string;
    value?: string;
}, required?: boolean) => string | undefined;
export declare const validateParameterDetail: (data: {
    type: string;
    displayName?: string;
    description?: string;
    default?: string;
}) => string | undefined;
export declare const validateConnectionsValue: (manifestConnections: Record<string, Template.Connection>, connectionsMapping: Record<string, string>) => string | undefined;
export declare const checkWorkflowNameWithRegex: (intl: IntlShape, workflowName: string) => string | undefined;
export declare const validateWorkflowData: (workflowData: Partial<WorkflowTemplateData>, isAccelerator: boolean) => Record<string, string | undefined>;
export declare const validateTemplateManifestValue: (manifest: Template.TemplateManifest) => Record<string, string | undefined>;
export declare const getTemplateTypeCategories: () => {
    value: string;
    displayName: string;
}[];
export declare const getTemplatePublishCategories: () => {
    value: string;
    displayName: string;
}[];
