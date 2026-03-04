import { type LogicAppResource, type Template } from '@microsoft/logic-apps-shared';
export interface BaseResourcePickerProps {
    viewMode?: 'default' | 'alllogicapps';
    onSelectApp?: (value: LogicAppResource) => void;
    lockField?: Template.ResourceFieldId;
}
export interface ResourcePickerProps extends BaseResourcePickerProps {
    resourceState: {
        subscriptionId: string;
        resourceGroup: string;
        location: string;
        workflowAppName: string | undefined;
        logicAppName: string | undefined;
        isConsumption: boolean | undefined;
    };
    onSubscriptionSelect: (value: string) => void;
    onResourceGroupSelect: (value: string) => void;
    onLocationSelect: (value: string) => void;
    onLogicAppSelect: (value: {
        name: string;
        location: string;
    }) => void;
    onLogicAppInstanceSelect: (value: {
        name: string;
        location: string;
        plan: string;
    }) => void;
}
export declare const ResourcePicker: ({ viewMode, onSelectApp, lockField, resourceState, onSubscriptionSelect, onResourceGroupSelect, onLocationSelect, onLogicAppSelect, onLogicAppInstanceSelect, }: ResourcePickerProps) => import("react/jsx-runtime").JSX.Element;
