import type React from 'react';
import { type ResourceState } from '../state/exportconsumption/resourceslice';
export interface ExportDataProviderProps {
    resourceDetails: ResourceState;
    children?: React.ReactNode;
}
export declare const ExportDataProvider: ({ resourceDetails, children }: ExportDataProviderProps) => import("react/jsx-runtime").JSX.Element;
