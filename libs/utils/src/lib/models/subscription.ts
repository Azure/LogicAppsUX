import type { ArmResources } from './armresource';

export interface Subscription {
  displayName: string;
  id: string;
  subscriptionId: string;
  tenantId: string;
}

export type SubscriptionFilter = (subscription: Subscription) => boolean;

export type SubscriptionsResponse = ArmResources<Subscription>;
