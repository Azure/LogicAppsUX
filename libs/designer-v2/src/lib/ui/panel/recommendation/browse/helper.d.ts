import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import React from 'react';
export type BrowseCategoryType = 'immediate' | 'browse';
export declare const BrowseCategoryType: {
    IMMEDIATE: BrowseCategoryType;
    BROWSE: BrowseCategoryType;
};
export interface ConnectorFilterTypes {
    name?: string[];
    connectorIds?: string[];
}
export interface BrowseCategoryConfig {
    key: string;
    visible?: boolean;
    text: string;
    description: string;
    icon: React.ReactNode;
    type: BrowseCategoryType;
    operation?: DiscoveryOperation<DiscoveryResultTypes>;
    connectorFilters?: ConnectorFilterTypes;
}
export declare const getTriggerCategories: () => BrowseCategoryConfig[];
export declare const getActionCategories: (allowAgents?: boolean, isAddingAgentTool?: boolean) => BrowseCategoryConfig[];
