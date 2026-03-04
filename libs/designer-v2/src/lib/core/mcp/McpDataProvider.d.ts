import type React from 'react';
import type { ResourceState } from '../state/mcp/resourceSlice';
import { type McpServiceOptions } from '../actions/bjsworkflow/mcp';
export interface McpDataProviderProps {
    resourceDetails: ResourceState;
    services: McpServiceOptions;
    onResourceChange?: () => void;
    children?: React.ReactNode;
}
export declare const McpDataProvider: ({ resourceDetails, services, onResourceChange, children }: McpDataProviderProps) => import("react/jsx-runtime").JSX.Element;
