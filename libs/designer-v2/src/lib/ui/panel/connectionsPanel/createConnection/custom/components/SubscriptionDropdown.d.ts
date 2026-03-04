import { type Subscription } from '@microsoft/logic-apps-shared';
interface SubscriptionDropdownProps {
    subscriptions?: Subscription[];
    isFetchingSubscriptions?: boolean;
    selectedSubscriptionId: string;
    setSelectedSubscriptionId: (subscriptionId: string) => void;
    title: string;
}
export declare const SubscriptionDropdown: ({ subscriptions, isFetchingSubscriptions, selectedSubscriptionId, setSelectedSubscriptionId, title, }: SubscriptionDropdownProps) => import("react/jsx-runtime").JSX.Element;
export {};
