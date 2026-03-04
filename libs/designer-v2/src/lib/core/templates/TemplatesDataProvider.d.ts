import { type TemplateServiceOptions } from './TemplatesDesignerContext';
import type React from 'react';
import { type ResourceDetails } from '../state/templates/workflowSlice';
import type { ConnectionReferences } from '../../common/models/workflow';
import type { Template } from '@microsoft/logic-apps-shared';
export interface TemplatesDataProviderProps {
    isConsumption: boolean | undefined;
    isCreateView: boolean;
    resourceDetails: ResourceDetails;
    services: TemplateServiceOptions;
    connectionReferences: ConnectionReferences;
    viewTemplate?: Template.ViewTemplateDetails;
    children?: React.ReactNode;
    servicesToReload?: Partial<TemplateServiceOptions>;
    enableResourceSelection?: boolean;
    onResourceChange?: () => void;
}
export declare const TemplatesDataProvider: (props: TemplatesDataProviderProps) => import("react/jsx-runtime").JSX.Element | null;
