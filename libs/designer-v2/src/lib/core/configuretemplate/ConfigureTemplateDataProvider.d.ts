import type React from 'react';
import type { ResourceDetails } from '../state/templates/workflowSlice';
import { type ConfigureTemplateServiceOptions } from '../actions/bjsworkflow/configuretemplate';
export interface ConfigureTemplateDataProviderProps {
    templateId: string;
    resourceDetails: ResourceDetails;
    services: ConfigureTemplateServiceOptions;
    onResourceChange?: () => void;
    children?: React.ReactNode;
}
export declare const ConfigureTemplateDataProvider: (props: ConfigureTemplateDataProviderProps) => import("react/jsx-runtime").JSX.Element | null;
