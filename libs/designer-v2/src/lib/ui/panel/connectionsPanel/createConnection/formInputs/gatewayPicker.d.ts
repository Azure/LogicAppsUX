export interface GatewayPickerProps {
    parameterKey: string;
    selectedSubscriptionId: string | undefined;
    selectSubscriptionCallback: ((subscriptionId: string) => void) | undefined;
    availableGateways: any;
    availableSubscriptions: any;
    isSubscriptionDropdownDisabled: boolean | undefined;
    isLoading: boolean | undefined;
    value: any;
    setValue: (value: any) => void;
}
export declare const GatewayPicker: (props: GatewayPickerProps) => import("react/jsx-runtime").JSX.Element;
export default GatewayPicker;
